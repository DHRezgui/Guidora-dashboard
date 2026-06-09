import type { GuidedTour, TourEditLockInfo } from '@/lib/types';

/** Intervalle de renouvellement du verrou (TTL serveur = 120 s). */
export const TOUR_EDIT_LOCK_HEARTBEAT_MS = 45_000;

export function tourRequiresEditLock(
	tour: Pick<GuidedTour, 'inCollaboration' | 'accessGrants' | 'sharingHasCollaborate'>,
): boolean {
	if (tour.inCollaboration) {
		return true;
	}
	if (tour.sharingHasCollaborate) {
		return true;
	}
	return Boolean(tour.accessGrants?.some((g) => g.accessMode === 'collaborate'));
}

export function getTourEditLockBlockedMessage(editLock?: TourEditLockInfo): string {
	if (!editLock?.required) {
		return 'Édition indisponible pour ce parcours.';
	}
	const label = editLock.heldByDisplayName?.trim() || 'un autre utilisateur';
	return `Ce parcours est en cours d’édition par ${label}. Attendez la fin de sa session ou demandez-lui de quitter l’éditeur.`;
}

export function isTourEditLockHeldByMe(editLock?: TourEditLockInfo): boolean {
	if (!editLock?.required) {
		return true;
	}
	return Boolean(editLock.isHeldByMe);
}
