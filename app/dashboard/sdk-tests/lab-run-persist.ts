import type {
	ContextualGenerationDebugReport,
	ContextualScenario,
	PublishContextualDraftsResponse,
	SuggestedTourDraft,
} from '@sdk/types/sdk';
import type { GuidedTour } from '@/lib/types';

const STORAGE_PREFIX = '__trustdev_sdk_lab_run_v1:';

export interface SdkLabRunSnapshot {
	labKey: string;
	publishScenario: ContextualScenario;
	targetUrl: string;
	savedAt: string;
	lastRunAt: string | null;
	debugReport: ContextualGenerationDebugReport | null;
	lastPublishReport: PublishContextualDraftsResponse['report'] | null;
	drafts: SuggestedTourDraft[];
	flowRegistry: Array<{ version: string; signature: string; generatedAt: string; targetUrl: string }>;
	linkedTourIds: string[];
}

function storageKey(labKey: string): string {
	return `${STORAGE_PREFIX}${labKey}`;
}

export function normalizeLabTargetPath(url: string): string {
	if (!url) return '';
	try {
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return new URL(url).pathname;
		}
	} catch {
		// ignore
	}
	return url.split('?')[0] || url;
}

export function readSdkLabRunSnapshot(labKey: string): SdkLabRunSnapshot | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = window.sessionStorage.getItem(storageKey(labKey));
		if (!raw) return null;
		return JSON.parse(raw) as SdkLabRunSnapshot;
	} catch {
		return null;
	}
}

export function writeSdkLabRunSnapshot(snapshot: SdkLabRunSnapshot): void {
	if (typeof window === 'undefined') return;
	try {
		window.sessionStorage.setItem(storageKey(snapshot.labKey), JSON.stringify(snapshot));
	} catch {
		// ignore
	}
}

export function clearSdkLabRunSnapshot(labKey: string): void {
	if (typeof window === 'undefined') return;
	try {
		window.sessionStorage.removeItem(storageKey(labKey));
	} catch {
		// ignore
	}
}

function tourMatchesLabRun(tour: GuidedTour, snapshot: SdkLabRunSnapshot): boolean {
	const engine = tour.triggerConditions?.contextualEngine;
	if (!engine?.flowSignature) return false;
	if (engine.scenario !== snapshot.publishScenario) return false;
	return normalizeLabTargetPath(tour.targetUrl ?? '') === normalizeLabTargetPath(snapshot.targetUrl);
}

/** Garde le snapshot tant qu’au moins un parcours lié au run existe encore en base. */
export function shouldKeepSdkLabRunSnapshot(tours: GuidedTour[], snapshot: SdkLabRunSnapshot): boolean {
	const idSet = new Set(tours.map((tour) => tour.id).filter((id): id is string => Boolean(id)));

	if (snapshot.linkedTourIds.length > 0) {
		return snapshot.linkedTourIds.some((id) => idSet.has(id));
	}

	return tours.some((tour) => tourMatchesLabRun(tour, snapshot));
}

export function reconcileAllSdkLabRunSnapshots(tours: GuidedTour[]): void {
	if (typeof window === 'undefined') return;

	for (let index = 0; index < window.sessionStorage.length; index += 1) {
		const key = window.sessionStorage.key(index);
		if (!key?.startsWith(STORAGE_PREFIX)) continue;

		const labKey = key.slice(STORAGE_PREFIX.length);
		const snapshot = readSdkLabRunSnapshot(labKey);
		if (!snapshot) continue;

		if (!shouldKeepSdkLabRunSnapshot(tours, snapshot)) {
			clearSdkLabRunSnapshot(labKey);
		}
	}
}

export function extractLinkedTourIdsFromPublishReport(
	report: PublishContextualDraftsResponse['report'] | null,
): string[] {
	if (!report?.details?.length) return [];
	return report.details
		.filter(
			(detail) =>
				detail.tourId &&
				(detail.outcome === 'created' || detail.outcome === 'activated'),
		)
		.map((detail) => detail.tourId as string);
}
