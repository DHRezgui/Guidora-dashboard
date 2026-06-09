'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage, journeyBlueprintService } from '@/lib/api';
import type { OrganizationJourneyBlueprintRow } from '@/lib/api';
import {
	BLUEPRINT_EDIT_LOCK_HEARTBEAT_MS,
	getBlueprintEditLockBlockedMessage,
	isBlueprintEditLockHeldByMe,
} from '@/lib/blueprint-edit-lock';
import type { BlueprintEditLockInfo } from '@/lib/blueprint-edit-lock';

type UseBlueprintEditLockOptions = {
	rowId: string | null;
	row: OrganizationJourneyBlueprintRow | null;
	enabled: boolean;
};

type UseBlueprintEditLockResult = {
	editLock: BlueprintEditLockInfo | null;
	lockBlocked: boolean;
	lockMessage: string | null;
	isAcquiring: boolean;
	retryAcquire: () => Promise<void>;
};

export function useBlueprintEditLock({
	rowId,
	row,
	enabled,
}: UseBlueprintEditLockOptions): UseBlueprintEditLockResult {
	const [editLock, setEditLock] = useState<BlueprintEditLockInfo | null>(null);
	const [lockBlocked, setLockBlocked] = useState(false);
	const [lockMessage, setLockMessage] = useState<string | null>(null);
	const [isAcquiring, setIsAcquiring] = useState(false);
	const holdsLockRef = useRef(false);
	const rowIdRef = useRef(rowId);

	rowIdRef.current = rowId;

	const releaseIfHeld = useCallback(async (id: string) => {
		if (!holdsLockRef.current) {
			return;
		}
		holdsLockRef.current = false;
		try {
			await journeyBlueprintService.releaseEditLock(id);
		} catch {
			// Best-effort on tab close / navigation
		}
	}, []);

	const acquire = useCallback(async () => {
		if (!rowId || !row || !enabled) {
			return;
		}

		setIsAcquiring(true);
		try {
			const res = await journeyBlueprintService.acquireEditLock(rowId);
			const lock = res.editLock ?? res.blueprint?.editLock ?? null;
			setEditLock(lock);
			setLockBlocked(false);
			setLockMessage(null);
			holdsLockRef.current = isBlueprintEditLockHeldByMe(lock ?? undefined);
		} catch (error) {
			const axiosData = (error as { response?: { data?: { editLock?: BlueprintEditLockInfo } } })
				?.response?.data;
			const lock = axiosData?.editLock ?? row.editLock ?? null;
			setEditLock(lock);
			setLockBlocked(true);
			setLockMessage(
				getErrorMessage(error, getBlueprintEditLockBlockedMessage(lock ?? undefined)),
			);
			holdsLockRef.current = false;
		} finally {
			setIsAcquiring(false);
		}
	}, [enabled, row, rowId]);

	useEffect(() => {
		if (!enabled || !rowId || !row) {
			return;
		}
		void acquire();
	}, [acquire, enabled, rowId, row?.id]);

	useEffect(() => {
		if (!enabled || !rowId || lockBlocked || !holdsLockRef.current) {
			return;
		}

		const intervalId = window.setInterval(async () => {
			try {
				const res = await journeyBlueprintService.renewEditLock(rowId);
				const lock = res.editLock ?? res.blueprint?.editLock ?? null;
				setEditLock(lock);
				if (!isBlueprintEditLockHeldByMe(lock ?? undefined)) {
					setLockBlocked(true);
					setLockMessage(getBlueprintEditLockBlockedMessage(lock ?? undefined));
					holdsLockRef.current = false;
				}
			} catch (error) {
				const axiosData = (error as { response?: { data?: { editLock?: BlueprintEditLockInfo } } })
					?.response?.data;
				const lock = axiosData?.editLock ?? null;
				setEditLock(lock);
				setLockBlocked(true);
				setLockMessage(
					getErrorMessage(error, getBlueprintEditLockBlockedMessage(lock ?? undefined)),
				);
				holdsLockRef.current = false;
			}
		}, BLUEPRINT_EDIT_LOCK_HEARTBEAT_MS);

		return () => window.clearInterval(intervalId);
	}, [enabled, lockBlocked, rowId]);

	useEffect(() => {
		if (!rowId) {
			return;
		}
		const id = rowId;

		const releaseOnLeave = () => {
			if (!holdsLockRef.current) {
				return;
			}
			holdsLockRef.current = false;
			const token =
				typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
			const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';
			if (token) {
				fetch(`${base}/tours/contextual/blueprints/${id}/edit-lock`, {
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
	}, [releaseIfHeld, rowId]);

	return {
		editLock,
		lockBlocked,
		lockMessage,
		isAcquiring,
		retryAcquire: acquire,
	};
}
