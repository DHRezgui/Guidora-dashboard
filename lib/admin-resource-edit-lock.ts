import type { TourEditLockInfo } from '@/lib/types';

export type AdminResourceEditLockInfo = TourEditLockInfo;

export const ADMIN_RESOURCE_EDIT_LOCK_HEARTBEAT_MS = 45_000;

export function getUserEditLockBlockedMessage(editLock?: AdminResourceEditLockInfo): string {
	if (!editLock?.required) {
		return 'Modification indisponible pour cet utilisateur.';
	}
	const label = editLock.heldByDisplayName?.trim() || 'un autre administrateur';
	return `Cet utilisateur est en cours de modification par ${label}. Attendez la fin de sa session ou demandez-lui de quitter la page.`;
}

export function getOrganizationEditLockBlockedMessage(editLock?: AdminResourceEditLockInfo): string {
	if (!editLock?.required) {
		return 'Modification indisponible pour cette organisation.';
	}
	const label = editLock.heldByDisplayName?.trim() || 'un autre administrateur';
	return `Cette organisation est en cours de modification par ${label}. Attendez la fin de sa session ou demandez-lui de quitter la page.`;
}

export function isAdminResourceEditLockHeldByMe(editLock?: AdminResourceEditLockInfo): boolean {
	if (!editLock?.required) {
		return true;
	}
	return Boolean(editLock.isHeldByMe);
}

export function hasActiveAdminResourceEditLock(editLock?: AdminResourceEditLockInfo): boolean {
	return Boolean(editLock?.required && editLock?.heldByUserId && !editLock.isHeldByMe);
}

export function isAdminResourceBeingEdited(editLock?: AdminResourceEditLockInfo): boolean {
	return Boolean(editLock?.required && editLock?.heldByUserId);
}
