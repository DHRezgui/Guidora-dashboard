'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage, tourService } from '@/lib/api';
import type { GuidedTour, TourEditLockInfo } from '@/lib/types';
import {
	TOUR_EDIT_LOCK_HEARTBEAT_MS,
	getTourEditLockBlockedMessage,
	isTourEditLockHeldByMe,
	tourRequiresEditLock,
} from '@/lib/tour-edit-lock';

type UseTourEditLockOptions = {
	tourId: string | null;
	tour: GuidedTour | null;
	enabled: boolean;
};

type UseTourEditLockResult = {
	editLock: TourEditLockInfo | null;
	lockBlocked: boolean;
	lockMessage: string | null;
	isAcquiring: boolean;
	retryAcquire: () => Promise<void>;
};

export function useTourEditLock({
	tourId,
	tour,
	enabled,
}: UseTourEditLockOptions): UseTourEditLockResult {
	const [editLock, setEditLock] = useState<TourEditLockInfo | null>(null);
	const [lockBlocked, setLockBlocked] = useState(false);
	const [lockMessage, setLockMessage] = useState<string | null>(null);
	const [isAcquiring, setIsAcquiring] = useState(false);
	const holdsLockRef = useRef(false);
	const tourIdRef = useRef(tourId);

	tourIdRef.current = tourId;

	const releaseIfHeld = useCallback(async (id: string) => {
		if (!holdsLockRef.current) {
			return;
		}
		holdsLockRef.current = false;
		try {
			await tourService.releaseEditLock(id);
		} catch {
			// Best-effort on tab close / navigation
		}
	}, []);

	const acquire = useCallback(async () => {
		if (!tourId || !tour || !enabled) {
			return;
		}
		if (!tourRequiresEditLock(tour)) {
			setEditLock(tour.editLock ?? { required: false, isHeldByMe: true });
			setLockBlocked(false);
			setLockMessage(null);
			holdsLockRef.current = false;
			return;
		}

		setIsAcquiring(true);
		try {
			const res = await tourService.acquireEditLock(tourId);
			const lock = res.editLock ?? res.tour?.editLock ?? null;
			setEditLock(lock);
			setLockBlocked(false);
			setLockMessage(null);
			holdsLockRef.current = isTourEditLockHeldByMe(lock ?? undefined);
		} catch (error) {
			const axiosData = (error as { response?: { data?: { editLock?: TourEditLockInfo } } })
				?.response?.data;
			const lock = axiosData?.editLock ?? tour.editLock ?? null;
			setEditLock(lock);
			setLockBlocked(true);
			setLockMessage(
				getErrorMessage(error, getTourEditLockBlockedMessage(lock ?? undefined)),
			);
			holdsLockRef.current = false;
		} finally {
			setIsAcquiring(false);
		}
	}, [enabled, tour, tourId]);

	useEffect(() => {
		if (!enabled || !tourId || !tour) {
			return;
		}
		void acquire();
	}, [acquire, enabled, tourId, tour?.id, tour?.inCollaboration, tour?.accessGrants?.length]);

	useEffect(() => {
		if (!enabled || !tourId || lockBlocked || !holdsLockRef.current) {
			return;
		}

		const intervalId = window.setInterval(async () => {
			try {
				const res = await tourService.renewEditLock(tourId);
				const lock = res.editLock ?? res.tour?.editLock ?? null;
				setEditLock(lock);
				if (!isTourEditLockHeldByMe(lock ?? undefined)) {
					setLockBlocked(true);
					setLockMessage(getTourEditLockBlockedMessage(lock ?? undefined));
					holdsLockRef.current = false;
				}
			} catch (error) {
				const axiosData = (error as { response?: { data?: { editLock?: TourEditLockInfo } } })
					?.response?.data;
				const lock = axiosData?.editLock ?? null;
				setEditLock(lock);
				setLockBlocked(true);
				setLockMessage(
					getErrorMessage(error, getTourEditLockBlockedMessage(lock ?? undefined)),
				);
				holdsLockRef.current = false;
			}
		}, TOUR_EDIT_LOCK_HEARTBEAT_MS);

		return () => window.clearInterval(intervalId);
	}, [enabled, lockBlocked, tourId]);

	useEffect(() => {
		if (!tourId) {
			return;
		}
		const id = tourId;

		const releaseOnLeave = () => {
			if (!holdsLockRef.current) {
				return;
			}
			holdsLockRef.current = false;
			const token =
				typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
			const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';
			if (token) {
				fetch(`${base}/tours/${id}/edit-lock`, {
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
					keepalive: true,
				}).catch(() => {});
			}
		};

		const onPageHide = () => releaseOnLeave();
		const onBeforeUnload = () => releaseOnLeave();

		window.addEventListener('pagehide', onPageHide);
		window.addEventListener('beforeunload', onBeforeUnload);
		return () => {
			window.removeEventListener('pagehide', onPageHide);
			window.removeEventListener('beforeunload', onBeforeUnload);
			void releaseIfHeld(id);
		};
	}, [releaseIfHeld, tourId]);

	return {
		editLock,
		lockBlocked,
		lockMessage,
		isAcquiring,
		retryAcquire: acquire,
	};
}
