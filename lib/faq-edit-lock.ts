import type { TourEditLockInfo } from '@/lib/types';

export type FaqEditLockInfo = TourEditLockInfo;

export const FAQ_EDIT_LOCK_HEARTBEAT_MS = 45_000;

export function faqRequiresEditLock(): boolean {
	return true;
}

export function getFaqEditLockBlockedMessage(editLock?: FaqEditLockInfo): string {
	if (!editLock?.required) {
		return 'Édition indisponible pour cette entrée FAQ.';
	}
	const label = editLock.heldByDisplayName?.trim() || 'un autre administrateur';
	return `Cette entrée FAQ est en cours d’édition par ${label}. Attendez la fin de sa session ou demandez-lui de quitter l’éditeur.`;
}

export function isFaqEditLockHeldByMe(editLock?: FaqEditLockInfo): boolean {
	if (!editLock?.required) {
		return true;
	}
	return Boolean(editLock.isHeldByMe);
}

export function hasActiveFaqEditLock(editLock?: FaqEditLockInfo): boolean {
	return Boolean(editLock?.required && editLock?.heldByUserId);
}

export function isFaqLockedByOther(editLock?: FaqEditLockInfo): boolean {
	return hasActiveFaqEditLock(editLock) && !isFaqEditLockHeldByMe(editLock);
}

export function isFaqListActionBlocked(editLock?: FaqEditLockInfo): boolean {
	return hasActiveFaqEditLock(editLock);
}
