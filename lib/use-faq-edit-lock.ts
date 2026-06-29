'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { faqService, getErrorMessage } from '@/lib/api';
import type { FaqEntryRow } from '@/lib/api';
import {
	FAQ_EDIT_LOCK_HEARTBEAT_MS,
	getFaqEditLockBlockedMessage,
	isFaqEditLockHeldByMe,
	type FaqEditLockInfo,
} from '@/lib/faq-edit-lock';

type UseFaqEditLockOptions = {
	entryId: string | null;
	entry: FaqEntryRow | null;
	enabled: boolean;
};

type UseFaqEditLockResult = {
	editLock: FaqEditLockInfo | null;
	lockBlocked: boolean;
	lockMessage: string | null;
	isAcquiring: boolean;
	retryAcquire: () => Promise<void>;
	releaseIfHeld: () => Promise<void>;
};

export function useFaqEditLock({
	entryId,
	entry,
	enabled,
}: UseFaqEditLockOptions): UseFaqEditLockResult {
	const [editLock, setEditLock] = useState<FaqEditLockInfo | null>(null);
	const [lockBlocked, setLockBlocked] = useState(false);
	const [lockMessage, setLockMessage] = useState<string | null>(null);
	const [isAcquiring, setIsAcquiring] = useState(false);
	const holdsLockRef = useRef(false);
	const entryIdRef = useRef(entryId);

	entryIdRef.current = entryId;

	const releaseIfHeld = useCallback(async (id?: string) => {
		const targetId = id ?? entryIdRef.current;
		if (!targetId || !holdsLockRef.current) {
			return;
		}
		holdsLockRef.current = false;
		try {
			await faqService.releaseEditLock(targetId);
		} catch {
			// Best-effort on tab close / navigation
		}
	}, []);

	const acquire = useCallback(async () => {
		if (!entryId || !entry || !enabled) {
			return;
		}

		setIsAcquiring(true);
		try {
			const res = await faqService.acquireEditLock(entryId);
			const lock = res.editLock ?? res.item?.editLock ?? null;
			setEditLock(lock);
			setLockBlocked(false);
			setLockMessage(null);
			holdsLockRef.current = isFaqEditLockHeldByMe(lock ?? undefined);
		} catch (error) {
			const axiosData = (error as { response?: { data?: { editLock?: FaqEditLockInfo } } })?.response
				?.data;
			const lock = axiosData?.editLock ?? entry.editLock ?? null;
			setEditLock(lock);
			setLockBlocked(true);
			setLockMessage(getErrorMessage(error, getFaqEditLockBlockedMessage(lock ?? undefined)));
			holdsLockRef.current = false;
		} finally {
			setIsAcquiring(false);
		}
	}, [enabled, entry, entryId]);

	useEffect(() => {
		if (!enabled || !entryId || !entry) {
			setEditLock(null);
			setLockBlocked(false);
			setLockMessage(null);
			return;
		}
		void acquire();
	}, [acquire, enabled, entryId, entry?.id]);

	useEffect(() => {
		if (!enabled || !entryId || lockBlocked || !holdsLockRef.current) {
			return;
		}

		const intervalId = window.setInterval(async () => {
			try {
				const res = await faqService.renewEditLock(entryId);
				const lock = res.editLock ?? res.item?.editLock ?? null;
				setEditLock(lock);
				if (!isFaqEditLockHeldByMe(lock ?? undefined)) {
					setLockBlocked(true);
					setLockMessage(getFaqEditLockBlockedMessage(lock ?? undefined));
					holdsLockRef.current = false;
				}
			} catch (error) {
				const axiosData = (error as { response?: { data?: { editLock?: FaqEditLockInfo } } })?.response
					?.data;
				const lock = axiosData?.editLock ?? null;
				setEditLock(lock);
				setLockBlocked(true);
				setLockMessage(getErrorMessage(error, getFaqEditLockBlockedMessage(lock ?? undefined)));
				holdsLockRef.current = false;
			}
		}, FAQ_EDIT_LOCK_HEARTBEAT_MS);

		return () => window.clearInterval(intervalId);
	}, [enabled, lockBlocked, entryId]);

	useEffect(() => {
		if (!entryId) {
			return;
		}
		const id = entryId;

		const releaseOnLeave = () => {
			if (!holdsLockRef.current) {
				return;
			}
			holdsLockRef.current = false;
			const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
			const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';
			if (token) {
				fetch(`${base}/faq/entries/${id}/edit-lock`, {
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
	}, [releaseIfHeld, entryId]);

	return {
		editLock,
		lockBlocked,
		lockMessage,
		isAcquiring,
		retryAcquire: acquire,
		releaseIfHeld,
	};
}
