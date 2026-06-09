import type { GuidedTour } from '@/lib/types';
import {
	removeAutoPublishedSignaturesForTour as sdkRemoveAutoPublishedSignaturesForTour,
	reconcileAutoPublishedSessionWithTours as sdkReconcileAutoPublishedSessionWithTours,
} from '@sdk/utils/auto-publish-session-dedupe';

type AutoPublishTourShape = Pick<GuidedTour, 'id' | 'targetUrl' | 'steps' | 'triggerConditions' | 'createdBy'>;

function filterToursForOwner(tours: AutoPublishTourShape[], ownerUserId?: string): AutoPublishTourShape[] {
	if (!ownerUserId) {
		return tours;
	}
	return tours.filter((tour) => !tour.createdBy || tour.createdBy === ownerUserId);
}

/** À appeler quand un parcours est supprimé du dashboard. */
export function removeAutoPublishedSignaturesForTour(tour: AutoPublishTourShape): void {
	sdkRemoveAutoPublishedSignaturesForTour(tour);
}

/** Nettoie les signatures orphelines en les comparant aux parcours encore présents. */
export function reconcileAutoPublishedSessionWithTours(
	tours: AutoPublishTourShape[],
	ownerUserId?: string,
): void {
	sdkReconcileAutoPublishedSessionWithTours(filterToursForOwner(tours, ownerUserId));
}
