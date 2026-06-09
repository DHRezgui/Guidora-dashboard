'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@/lib/api';
import {
	ADMIN_RESOURCE_EDIT_LOCK_HEARTBEAT_MS,
	isAdminResourceEditLockHeldByMe,
	type AdminResourceEditLockInfo,
} from '@/lib/admin-resource-edit-lock';

type LockableResource = {
	id?: string;
	editLock?: AdminResourceEditLockInfo | null;
};

type AdminResourceEditLockApi = {
	acquireEditLock: (id: string) => Promise<{
		editLock?: AdminResourceEditLockInfo | null;
		user?: LockableResource;
		organization?: LockableResource;
	}>;
	renewEditLock: (id: string) => Promise<{
		editLock?: AdminResourceEditLockInfo | null;
		user?: LockableResource;
		organization?: LockableResource;
	}>;
	releaseEditLock: (id: string) => Promise<unknown>;
};

type UseAdminResourceEditLockOptions = {
	resourceId: string | null;
	resource: LockableResource | null;
	enabled: boolean;
	api: AdminResourceEditLockApi;
	releasePath: (id: string) => string;
	getBlockedMessage: (editLock?: AdminResourceEditLockInfo) => string;
	resourceKey: 'user' | 'organization';
};

export function useAdminResourceEditLock({
	resourceId,
	resource,
	enabled,
	api,
	releasePath,
	getBlockedMessage,
	resourceKey,
}: UseAdminResourceEditLockOptions) {
	const [editLock, setEditLock] = useState<AdminResourceEditLockInfo | null>(null);
	const [lockBlocked, setLockBlocked] = useState(false);
	const [lockMessage, setLockMessage] = useState<string | null>(null);
	const [isAcquiring, setIsAcquiring] = useState(false);
	const holdsLockRef = useRef(false);
	const pendingReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const resourceRef = useRef(resource);
	resourceRef.current = resource;

	const cancelPendingRelease = useCallback(() => {
		if (pendingReleaseTimerRef.current) {
			clearTimeout(pendingReleaseTimerRef.current);
			pendingReleaseTimerRef.current = null;
		}
	}, []);

	const releaseHeldLock = useCallback(
		async (id: string) => {
			if (!holdsLockRef.current) {
				return;
			}
			holdsLockRef.current = false;
			try {
				await api.releaseEditLock(id);
			} catch {
				// Best-effort on tab close / navigation
			}
		},
		[api],
	);

	const extractLock = useCallback(
		(
			res: {
				editLock?: AdminResourceEditLockInfo | null;
				user?: LockableResource;
				organization?: LockableResource;
			},
			fallback?: LockableResource | null,
		) => {
			return (
				res.editLock ??
				(resourceKey === 'user' ? res.user?.editLock : res.organization?.editLock) ??
				fallback?.editLock ??
				null
			);
		},
		[resourceKey],
	);

	const applyLockState = useCallback(
		(lock: AdminResourceEditLockInfo | null) => {
			const heldByMe = isAdminResourceEditLockHeldByMe(lock ?? undefined);
			setEditLock(lock);
			holdsLockRef.current = heldByMe;
			if (lock?.required && !heldByMe) {
				setLockBlocked(true);
				setLockMessage(getBlockedMessage(lock ?? undefined));
				return;
			}
			setLockBlocked(false);
			setLockMessage(null);
		},
		[getBlockedMessage],
	);

	const acquire = useCallback(async () => {
		if (!resourceId || !resourceRef.current || !enabled) {
			return;
		}

		setIsAcquiring(true);
		try {
			const res = await api.acquireEditLock(resourceId);
			const lock = extractLock(res, resourceRef.current);
			applyLockState(lock);
		} catch (error) {
			const axiosData = (error as { response?: { data?: { editLock?: AdminResourceEditLockInfo } } })
				?.response?.data;
			const lock = axiosData?.editLock ?? resourceRef.current.editLock ?? null;
			setEditLock(lock);
			setLockBlocked(true);
			setLockMessage(getErrorMessage(error, getBlockedMessage(lock ?? undefined)));
			holdsLockRef.current = false;
		} finally {
			setIsAcquiring(false);
		}
	}, [api, applyLockState, enabled, extractLock, getBlockedMessage, resourceId]);

	useEffect(() => {
		cancelPendingRelease();
	}, [cancelPendingRelease, enabled, resource?.id, resourceId]);

	useEffect(() => {
		if (!enabled || !resourceId || !resource?.id) {
			return;
		}
		void acquire();
	}, [acquire, enabled, resource?.id, resourceId]);

	useEffect(() => {
		if (!enabled || !resourceId || lockBlocked || !holdsLockRef.current) {
			return;
		}

		const renew = async () => {
			try {
				const res = await api.renewEditLock(resourceId);
				const lock = extractLock(res, resourceRef.current);
				setEditLock(lock);
				if (!isAdminResourceEditLockHeldByMe(lock ?? undefined)) {
					setLockBlocked(true);
					setLockMessage(getBlockedMessage(lock ?? undefined));
					holdsLockRef.current = false;
				}
			} catch (error) {
				const axiosData = (error as { response?: { data?: { editLock?: AdminResourceEditLockInfo } } })
					?.response?.data;
				const lock = axiosData?.editLock ?? null;
				setEditLock(lock);
				setLockBlocked(true);
				setLockMessage(getErrorMessage(error, getBlockedMessage(lock ?? undefined)));
				holdsLockRef.current = false;
			}
		};

		void renew();
		const intervalId = window.setInterval(() => {
			void renew();
		}, ADMIN_RESOURCE_EDIT_LOCK_HEARTBEAT_MS);

		return () => window.clearInterval(intervalId);
	}, [api, enabled, extractLock, getBlockedMessage, lockBlocked, resourceId]);

	useEffect(() => {
		if (!resourceId) {
			return;
		}
		const id = resourceId;

		const releaseOnLeave = () => {
			if (!holdsLockRef.current) {
				return;
			}
			holdsLockRef.current = false;
			const token =
				typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
			const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';
			if (token) {
				fetch(`${base}${releasePath(id)}`, {
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
					keepalive: true,
				}).catch(() => {});
			}
		};

		window.addEventListener('pagehide', releaseOnLeave);
		window.addEventListener('beforeunload', releaseOnLeave);
		return () => {
			window.removeEventListener('pagehide', releaseOnLeave);
			window.removeEventListener('beforeunload', releaseOnLeave);
		};
	}, [releasePath, resourceId]);

	useEffect(() => {
		if (!enabled || !resourceId) {
			return;
		}
		const id = resourceId;

		return () => {
			cancelPendingRelease();
			pendingReleaseTimerRef.current = setTimeout(() => {
				pendingReleaseTimerRef.current = null;
				void releaseHeldLock(id);
			}, 150);
		};
	}, [cancelPendingRelease, enabled, releaseHeldLock, resourceId]);

	const ensureLockHeld = useCallback(async (): Promise<boolean> => {
		if (!enabled || !resourceId) {
			return true;
		}
		if (!holdsLockRef.current) {
			return false;
		}
		try {
			const res = await api.renewEditLock(resourceId);
			const lock = extractLock(res, resourceRef.current);
			const heldByMe = isAdminResourceEditLockHeldByMe(lock ?? undefined);
			holdsLockRef.current = heldByMe;
			setEditLock(lock);
			if (!heldByMe) {
				setLockBlocked(true);
				setLockMessage(getBlockedMessage(lock ?? undefined));
			}
			return heldByMe;
		} catch (error) {
			const axiosData = (error as { response?: { data?: { editLock?: AdminResourceEditLockInfo } } })
				?.response?.data;
			const lock = axiosData?.editLock ?? null;
			setEditLock(lock);
			setLockBlocked(true);
			setLockMessage(getErrorMessage(error, getBlockedMessage(lock ?? undefined)));
			holdsLockRef.current = false;
			return false;
		}
	}, [api, enabled, extractLock, getBlockedMessage, resourceId]);

	return {
		editLock,
		lockBlocked,
		lockMessage,
		isAcquiring,
		retryAcquire: acquire,
		ensureLockHeld,
	};
}
