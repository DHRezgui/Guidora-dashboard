'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ContextualGenerationDebugReport } from '@sdk/types/sdk';

/**
 * Captures every analyse-run for the Phase 1 lab suite.
 *
 * Each entry records the semantic-enhancement payload that was attached
 * to a generation. We deliberately keep this in memory (no localStorage
 * persistence) so a fresh page load gives a clean baseline for each
 * lab session.
 */
export interface Phase1Run {
	runAt: string;
	page: string;
	draftCount: number;
	report: NonNullable<ContextualGenerationDebugReport['semanticEnhancement']>;
}

export interface Phase1Aggregates {
	totalRuns: number;
	stableRuns: number;
	bypassedRuns: number;
	bypassReasons: Array<{ reason: string; count: number }>;
	decisionSource: { local: number; backend: number; merged: number };
	confidenceBuckets: Array<{ label: string; count: number; min: number; max: number }>;
	suppressed: {
		total: number;
		reasons: Array<{ reason: string; count: number }>;
	};
	/**
	 * Steps the semantic engine had no opinion on (delta = 0, votes
	 * cancelled). Tracked separately from real suppressions because they
	 * don't represent a fallback — the heuristic just stays in charge.
	 */
	neutralSteps: number;
	backendStatusBreakdown: Array<{ status: string; count: number }>;
	orderChangedCount: number;
	copyRewriteCount: number;
}

const CONFIDENCE_BUCKETS: Array<{ label: string; min: number; max: number }> = [
	{ label: '< 30%', min: 0, max: 0.3 },
	{ label: '30 – 55%', min: 0.3, max: 0.55 },
	{ label: '55 – 70%', min: 0.55, max: 0.7 },
	{ label: '70 – 85%', min: 0.7, max: 0.85 },
	{ label: '≥ 85%', min: 0.85, max: 1.0001 },
];

function bumpCount(target: Record<string, number>, key: string) {
	target[key] = (target[key] || 0) + 1;
}

export function aggregatePhase1Runs(runs: Phase1Run[]): Phase1Aggregates {
	const decisionSource = { local: 0, backend: 0, merged: 0 };
	const bypassReasons: Record<string, number> = {};
	const suppressedReasons: Record<string, number> = {};
	const backendStatus: Record<string, number> = {};
	const buckets = CONFIDENCE_BUCKETS.map((bucket) => ({ ...bucket, count: 0 }));
	let stableRuns = 0;
	let bypassedRuns = 0;
	let suppressedTotal = 0;
	let neutralSteps = 0;
	let orderChanged = 0;
	let copyRewrite = 0;

	for (const run of runs) {
		const report = run.report;
		const stable = report.domStability?.stable !== false;
		if (stable) stableRuns += 1;
		else {
			bypassedRuns += 1;
			const reason = report.domStability?.bypassReason ?? 'dom_unsettled';
			bumpCount(bypassReasons, reason);
		}
		if (report.backendStatus) bumpCount(backendStatus, report.backendStatus);

		for (const draft of report.drafts ?? []) {
			orderChanged += draft.orderChanged ? 1 : 0;
			copyRewrite += draft.copyRewriteCount ?? 0;
			suppressedTotal += draft.suppressedLowConfidence ?? 0;
			for (const step of draft.steps ?? []) {
				const src = step.decisionSource;
				if (src === 'local' || src === 'backend' || src === 'merged') {
					decisionSource[src] += 1;
				}
				const reason = step.fusion?.suppressedReason;
				if (reason === 'neutral') {
					neutralSteps += 1;
				} else if (reason) {
					bumpCount(suppressedReasons, reason);
				}
				const confidence = step.roleConfidence ?? 0;
				for (const bucket of buckets) {
					if (confidence >= bucket.min && confidence < bucket.max) {
						bucket.count += 1;
						break;
					}
				}
			}
		}
	}

	const toEntries = (record: Record<string, number>) =>
		Object.entries(record)
			.map(([reason, count]) => ({ reason, count }))
			.sort((a, b) => b.count - a.count);

	return {
		totalRuns: runs.length,
		stableRuns,
		bypassedRuns,
		bypassReasons: toEntries(bypassReasons),
		decisionSource,
		confidenceBuckets: buckets,
		suppressed: { total: suppressedTotal, reasons: toEntries(suppressedReasons) },
		neutralSteps,
		backendStatusBreakdown: Object.entries(backendStatus)
			.map(([status, count]) => ({ status, count }))
			.sort((a, b) => b.count - a.count),
		orderChangedCount: orderChanged,
		copyRewriteCount: copyRewrite,
	};
}

export interface UsePhase1RunHistoryArgs {
	page: string;
	debugReport: ContextualGenerationDebugReport | null;
	draftCount: number;
	lastRunAt: string | null;
	enabled?: boolean;
}

/**
 * Records a new Phase 1 entry whenever `lastRunAt` changes and the
 * generator attached a `semanticEnhancement` block to the debug report.
 */
export function usePhase1RunHistory({
	page,
	debugReport,
	draftCount,
	lastRunAt,
	enabled = true,
}: UsePhase1RunHistoryArgs) {
	const [runs, setRuns] = useState<Phase1Run[]>([]);
	const lastCapturedRunAt = useRef<string | null>(null);

	useEffect(() => {
		if (!enabled) return;
		if (!lastRunAt) return;
		if (lastCapturedRunAt.current === lastRunAt) return;
		const semantic = debugReport?.semanticEnhancement;
		if (!semantic) return;
		lastCapturedRunAt.current = lastRunAt;
		setRuns((previous) => [
			...previous.slice(-19),
			{
				runAt: lastRunAt,
				page,
				draftCount,
				report: semantic,
			},
		]);
	}, [debugReport, draftCount, enabled, lastRunAt, page]);

	const reset = useCallback(() => {
		setRuns([]);
		lastCapturedRunAt.current = null;
	}, []);

	return { runs, aggregates: aggregatePhase1Runs(runs), reset };
}
