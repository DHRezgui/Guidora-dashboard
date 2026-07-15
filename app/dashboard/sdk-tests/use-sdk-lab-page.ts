'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	useContextualTourSuggestions,
	type UseContextualTourSuggestionsOptions,
} from '@sdk/hooks/useContextualTourSuggestions';
import type { ContextualGenerationDebugReport, ContextualScenario } from '@sdk/types/sdk';
import {
	clearLastContextualGenerationDebugReport,
	invalidateContextualCandidateScanState,
	restoreLastContextualGenerationDebugReport,
} from '@sdk/utils/tour-suggestion-generator';
import { waitForLabSubjectReady } from './lab-shared';
import { reconcileAutoPublishedSessionWithTours } from '@/lib/auto-publish-session-dedupe';
import { tourService } from '@/lib/api';
import { readSessionUser } from '@/lib/session-user';
import {
	clearSdkLabRunSnapshot,
	extractLinkedTourIdsFromPublishReport,
	normalizeLabTargetPath,
	readSdkLabRunSnapshot,
	reconcileAllSdkLabRunSnapshots,
	shouldKeepSdkLabRunSnapshot,
	writeSdkLabRunSnapshot,
	type SdkLabRunSnapshot,
} from './lab-run-persist';

export interface UseSdkLabPageMeta {
	/** Clé de persistance (une par page de scénario). */
	labKey: string;
	publishScenario: ContextualScenario;
	/** Par défaut : pathname courant au moment de l’analyse. */
	targetUrl?: string;
}

/** Hook lab : une seule instance SDK + persistance du dernier run liée aux parcours en base. */
export function useSdkLabPage(
	options: UseContextualTourSuggestionsOptions,
	meta: UseSdkLabPageMeta,
) {
	const suggestions = useContextualTourSuggestions(options);
	const [restoredSnapshot, setRestoredSnapshot] = useState<SdkLabRunSnapshot | null>(null);
	const [lastRunAt, setLastRunAt] = useState<string | null>(null);
	const [hydrated, setHydrated] = useState(false);
	const pendingPersistRunAtRef = useRef<string | null>(null);
	const ownerUserId = readSessionUser()?.id;

	const clearLabRunState = useCallback(() => {
		clearSdkLabRunSnapshot(meta.labKey);
		setRestoredSnapshot(null);
		setLastRunAt(null);
		clearLastContextualGenerationDebugReport();
	}, [meta.labKey]);

	const syncTourCatalog = useCallback(async () => {
		try {
			const response = await tourService.getAll();
			const tours = response.tours ?? [];
			reconcileAutoPublishedSessionWithTours(tours, ownerUserId);
			reconcileAllSdkLabRunSnapshots(tours, ownerUserId);

			const snapshot = readSdkLabRunSnapshot(meta.labKey);
			if (snapshot && shouldKeepSdkLabRunSnapshot(tours, snapshot, ownerUserId)) {
				setRestoredSnapshot(snapshot);
				setLastRunAt(snapshot.lastRunAt);
				if (snapshot.debugReport) {
					restoreLastContextualGenerationDebugReport(snapshot.debugReport);
				}
			} else {
				if (snapshot) clearSdkLabRunSnapshot(meta.labKey);
				setRestoredSnapshot(null);
				setLastRunAt(null);
				clearLastContextualGenerationDebugReport();
			}
			return tours;
		} catch {
			return [];
		}
	}, [meta.labKey, ownerUserId]);

	useEffect(() => {
		let cancelled = false;
		void syncTourCatalog()
			.then(() => {
				if (!cancelled) setHydrated(true);
			})
			.catch(() => {
				if (!cancelled) setHydrated(true);
			});
		return () => {
			cancelled = true;
		};
	}, [syncTourCatalog]);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const refreshCatalog = () => {
			void syncTourCatalog().catch(() => undefined);
		};

		const intervalId = window.setInterval(refreshCatalog, 15000);
		window.addEventListener('focus', refreshCatalog);
		document.addEventListener('visibilitychange', refreshCatalog);

		return () => {
			window.clearInterval(intervalId);
			window.removeEventListener('focus', refreshCatalog);
			document.removeEventListener('visibilitychange', refreshCatalog);
		};
	}, [syncTourCatalog]);

	useEffect(() => {
		invalidateContextualCandidateScanState();
	}, [meta.labKey]);

	const persistLabRun = useCallback(
		(runAt: string) => {
			const liveDebug = suggestions.getDebugReport();
			const debugReport = liveDebug ?? restoredSnapshot?.debugReport ?? null;
			const emptyScan =
				debugReport?.candidateMetrics?.considered === 0 && suggestions.drafts.length === 0;
			if (!debugReport && suggestions.drafts.length === 0) return;
			if (emptyScan) return;

			const targetUrl =
				meta.targetUrl ??
				(typeof window !== 'undefined' ? window.location.pathname : restoredSnapshot?.targetUrl ?? '');

			const snapshot: SdkLabRunSnapshot = {
				labKey: meta.labKey,
				publishScenario: meta.publishScenario,
				targetUrl: normalizeLabTargetPath(targetUrl),
				savedAt: new Date().toISOString(),
				lastRunAt: runAt,
				debugReport,
				lastPublishReport: suggestions.lastPublishReport ?? restoredSnapshot?.lastPublishReport ?? null,
				drafts: suggestions.drafts.length > 0 ? suggestions.drafts : restoredSnapshot?.drafts ?? [],
				flowRegistry:
					suggestions.getFlowRegistry().length > 0
						? suggestions.getFlowRegistry()
						: restoredSnapshot?.flowRegistry ?? [],
				linkedTourIds: extractLinkedTourIdsFromPublishReport(suggestions.lastPublishReport),
			};

			writeSdkLabRunSnapshot(snapshot);
			setRestoredSnapshot(snapshot);
			setLastRunAt(runAt);
			if (debugReport) restoreLastContextualGenerationDebugReport(debugReport);
		},
		[meta.labKey, meta.publishScenario, meta.targetUrl, restoredSnapshot, suggestions],
	);

	useEffect(() => {
		if (!hydrated || !pendingPersistRunAtRef.current) return;
		if (suggestions.isGenerating || suggestions.isPublishing) return;

		const hasDebug = Boolean(suggestions.getDebugReport());
		if (!hasDebug && suggestions.drafts.length === 0) return;

		const autoPublish = options.autoPublish ?? false;
		if (autoPublish && suggestions.drafts.length > 0 && !suggestions.lastPublishReport) {
			return;
		}

		const runAt = pendingPersistRunAtRef.current;
		pendingPersistRunAtRef.current = null;
		persistLabRun(runAt);
	}, [
		hydrated,
		options.autoPublish,
		persistLabRun,
		suggestions.drafts,
		suggestions.isGenerating,
		suggestions.isPublishing,
		suggestions.lastPublishReport,
		suggestions.debugReportTick,
	]);

	const runAnalysis = useCallback(() => {
		void (async () => {
			await suggestions.refresh();
			const runAt = new Date().toLocaleTimeString();
			setLastRunAt(runAt);
			pendingPersistRunAtRef.current = runAt;
		})();
	}, [suggestions]);

	void suggestions.debugReportTick;
	const liveDebugReport = suggestions.getDebugReport();
	const debugReport: ContextualGenerationDebugReport | null =
		liveDebugReport ?? restoredSnapshot?.debugReport ?? null;

	const drafts =
		suggestions.drafts.length > 0 ? suggestions.drafts : restoredSnapshot?.drafts ?? [];

	const lastPublishReport =
		suggestions.lastPublishReport ?? restoredSnapshot?.lastPublishReport ?? null;

	const flowRegistry =
		suggestions.getFlowRegistry().length > 0
			? suggestions.getFlowRegistry()
			: restoredSnapshot?.flowRegistry ?? [];

	const suggestionsApi = useMemo(
		() => ({
			recordFeedback: suggestions.recordFeedback,
			getLocalFeedback: suggestions.getLocalFeedback,
			feedbackVersion: suggestions.feedbackVersion,
			lastPublishReport,
			resetFeedback: suggestions.resetFeedback,
		}),
		[
			suggestions.recordFeedback,
			suggestions.getLocalFeedback,
			suggestions.feedbackVersion,
			suggestions.resetFeedback,
			lastPublishReport,
		],
	);

	return {
		...suggestions,
		drafts,
		debugReport,
		lastPublishReport,
		flowRegistry,
		lastRunAt,
		runAnalysis,
		hydrated,
		clearLabRunState,
		getDebugReport: () => debugReport,
		suggestionsApi,
	};
}

