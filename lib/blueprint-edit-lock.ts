import type { TourEditLockInfo } from '@/lib/types';

export type BlueprintEditLockInfo = TourEditLockInfo;

/** Intervalle de renouvellement du verrou (TTL serveur = 120 s). */
export const BLUEPRINT_EDIT_LOCK_HEARTBEAT_MS = 45_000;

export function blueprintRequiresEditLock(): boolean {
	return true;
}

export function getBlueprintEditLockBlockedMessage(editLock?: BlueprintEditLockInfo): string {
	if (!editLock?.required) {
		return 'Édition indisponible pour ce blueprint.';
	}
	const label = editLock.heldByDisplayName?.trim() || 'un autre administrateur';
	return `Ce blueprint est en cours d’édition par ${label}. Attendez la fin de sa session ou demandez-lui de quitter l’éditeur.`;
}

export function isBlueprintEditLockHeldByMe(editLock?: BlueprintEditLockInfo): boolean {
	if (!editLock?.required) {
		return true;
	}
	return Boolean(editLock.isHeldByMe);
}

export function hasActiveBlueprintEditLock(editLock?: BlueprintEditLockInfo): boolean {
	return Boolean(editLock?.required && editLock?.heldByUserId);
}
