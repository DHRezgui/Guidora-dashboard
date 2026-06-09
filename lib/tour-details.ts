import { tourService } from '@/lib/api';
import type { GuidedTour, GuidedTourSavePayload, StepSavePayload } from '@/lib/types';

/** Champs renvoyés par l'API mais absents de CreateGuidedTourDto / UpdateGuidedTourDto. */
export function stripReadOnlyTourFields(
	tour: GuidedTour,
): Omit<GuidedTour, 'id' | 'createdAt' | 'updatedAt' | 'steps' | 'stepCount'> {
	const {
		id: _id,
		organizationId: _organizationId,
		organization: _organization,
		createdBy: _createdBy,
		currentResetVersion: _currentResetVersion,
		createdAt: _createdAt,
		updatedAt: _updatedAt,
		stepCount: _stepCount,
		sandboxStatus: _sandboxStatus,
		sandboxRejectionReason: _sandboxRejectionReason,
		sandboxRejectedAt: _sandboxRejectedAt,
		sandboxRejectedBy: _sandboxRejectedBy,
		developerSubmissionMessage: _developerSubmissionMessage,
		developerViewShareMessage: _developerViewShareMessage,
		developerViewShareMessageAt: _developerViewShareMessageAt,
		developerCollaborateShareMessage: _developerCollaborateShareMessage,
		developerCollaborateShareMessageAt: _developerCollaborateShareMessageAt,
		isSandboxTestActive: _isSandboxTestActive,
		sandboxTestStartedBy: _sandboxTestStartedBy,
		environment: _environment,
		developerPrivate: _developerPrivate,
		assignedAdminIds: _assignedAdminIds,
		assignedToAdminsAt: _assignedToAdminsAt,
		inCollaboration: _inCollaboration,
		accessGrants: _accessGrants,
		sharingHasView: _sharingHasView,
		sharingHasCollaborate: _sharingHasCollaborate,
		editLockedBy: _editLockedBy,
		editLockedAt: _editLockedAt,
		editLockExpiresAt: _editLockExpiresAt,
		editLock: _editLock,
		productionManagedByAdminId: _productionManagedByAdminId,
		steps: _steps,
		...saveFields
	} = tour as GuidedTour & { organization?: unknown; organizationId?: unknown };

	return saveFields;
}

export function mapStepsToSavePayload(steps: GuidedTour['steps']): StepSavePayload[] {
	return (steps || []).map((step) => {
		const {
			id: _id,
			orderIndex: _orderIndex,
			tourId: _tourId,
			createdAt: _createdAt,
			updatedAt: _updatedAt,
			concatSourceMeta: _concatSourceMeta,
			...safeStep
		} = step as NonNullable<GuidedTour['steps']>[number] & {
			concatSourceMeta?: unknown;
			tourId?: string;
		};

		return safeStep;
	});
}

export type BuildTourSavePayloadOptions = {
	/** Admin : persiste environment (création directe sandbox ou production). */
	includeEnvironment?: boolean;
	forkedFromTourIds?: string[];
};

export function buildTourSavePayload(
	tour: GuidedTour,
	options?: BuildTourSavePayloadOptions,
): GuidedTourSavePayload {
	const payload: GuidedTourSavePayload = {
		...stripReadOnlyTourFields(tour),
		steps: mapStepsToSavePayload(tour.steps),
	};

	if (
		options?.includeEnvironment &&
		(tour.environment === 'sandbox' || tour.environment === 'production')
	) {
		payload.environment = tour.environment;
	}

	if (options?.forkedFromTourIds?.length) {
		payload.forkedFromTourIds = [...new Set(options.forkedFromTourIds)];
	}

	return payload;
}

export type PrepareTourCloneOptions = {
	name?: string;
	createStepId?: (index: number) => string;
	/** Les clones admin (duplication / concat) passent toujours en production. */
	forceProduction?: boolean;
};

/** Prépare un brouillon local à partir d'un parcours source (duplication, concat). */
export function prepareTourCloneFromSource(
	sourceTour: GuidedTour,
	options: PrepareTourCloneOptions = {},
): GuidedTour {
	const { name, createStepId, forceProduction = false } = options;

	const {
		id: _id,
		organizationId: _organizationId,
		createdBy: _createdBy,
		createdAt: _createdAt,
		updatedAt: _updatedAt,
		stepCount: _stepCount,
		sandboxStatus: _sandboxStatus,
		sandboxRejectionReason: _sandboxRejectionReason,
		sandboxRejectedAt: _sandboxRejectedAt,
		sandboxRejectedBy: _sandboxRejectedBy,
		developerSubmissionMessage: _developerSubmissionMessage,
		developerViewShareMessage: _developerViewShareMessage,
		developerViewShareMessageAt: _developerViewShareMessageAt,
		developerCollaborateShareMessage: _developerCollaborateShareMessage,
		developerCollaborateShareMessageAt: _developerCollaborateShareMessageAt,
		sandboxTestStartedBy: _sandboxTestStartedBy,
		environment: _environment,
		developerPrivate: _developerPrivate,
		assignedAdminIds: _assignedAdminIds,
		assignedToAdminsAt: _assignedToAdminsAt,
		productionManagedByAdminId: _productionManagedByAdminId,
		steps: sourceSteps,
		...rest
	} = sourceTour;

	return {
		...rest,
		name: name ?? rest.name ?? 'Parcours',
		id: undefined,
		createdAt: undefined,
		updatedAt: undefined,
		environment: forceProduction ? 'production' : rest.environment,
		steps: [...(sourceSteps || [])]
			.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
			.map((step, index) => {
				const {
					id: _stepId,
					orderIndex: _orderIndex,
					tourId: _tourId,
					createdAt: _stepCreatedAt,
					updatedAt: _stepUpdatedAt,
					concatSourceMeta: _concatSourceMeta,
					...stepRest
				} = step as NonNullable<GuidedTour['steps']>[number] & {
					concatSourceMeta?: unknown;
					tourId?: string;
				};

				return {
					...stepRest,
					id: createStepId ? createStepId(index) : undefined,
				};
			}),
	};
}

export function getTourStepCount(tour: Pick<GuidedTour, 'steps' | 'stepCount'>): number {
	if (typeof tour.stepCount === 'number') {
		return tour.stepCount;
	}
	return tour.steps?.length ?? 0;
}

export function tourHasLoadedSteps(tour: Pick<GuidedTour, 'steps' | 'stepCount'>): boolean {
	if (Array.isArray(tour.steps) && tour.steps.length > 0) {
		return true;
	}
	return typeof tour.stepCount === 'number' && tour.stepCount === 0;
}

export async function ensureTourWithSteps(tour: GuidedTour): Promise<GuidedTour> {
	if (tourHasLoadedSteps(tour) || !tour.id) {
		return tour;
	}

	const response = await tourService.getById(tour.id);
	if (!response.tour) {
		return tour;
	}

	return response.tour;
}
