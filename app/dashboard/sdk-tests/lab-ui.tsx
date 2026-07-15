'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Play, RotateCcw, X } from 'lucide-react';
import { ContextualSuggestionsPublisher } from '@sdk/components/ContextualSuggestionsPublisher';
import type { UseContextualTourSuggestionsOptions } from '@sdk/hooks/useContextualTourSuggestions';
import type { UseContextualTourSuggestionsResult } from '@sdk/hooks/useContextualTourSuggestions';
import type {
	ContextualGenerationDebugReport,
	PublishContextualDraftsResponse,
	SuggestedTourDraft,
} from '@sdk/types/sdk';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import TourSimulator from '@/components/editor/TourSimulator';
import type { GuidedTour } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SdkLabInsightsZone, SdkLabSdkZone } from './lab-layout';
import {
	LAB_ORANGE_CALLOUT_CLASS,
	LAB_ORANGE_CALLOUT_LABEL_CLASS,
	LAB_PROGRESS_RANGE_CLASS,
	LAB_RUNTIME_CAPABILITIES_NOTE,
	LAB_SELECT_CONTENT_CLASS,
	LAB_SELECT_TRIGGER_CLASS,
	type LabConflictStrategy,
	type LabSessionStage,
} from './lab-shared';

function draftToGuidedTour(draft: SuggestedTourDraft): GuidedTour {
	return {
		id: `lab-preview-${draft.intent}-${draft.name}`,
		name: draft.name,
		description: draft.description,
		targetUrl: draft.targetUrl,
		isActive: true,
		steps: (draft.steps || []).map((step, index) => ({
			...step,
			id: step.id ?? `lab-step-${index}`,
			orderIndex: step.orderIndex ?? index,
		})),
	};
}

type FeedbackEvent = 'shown' | 'clicked' | 'completed' | 'skipped';

export function SdkLabPublisherOverlay({
	title,
	options,
}: {
	title: string;
	options: UseContextualTourSuggestionsOptions;
}) {
	return (
		<ContextualSuggestionsPublisher
			{...options}
			developerMode
			uiMode="debug"
			stableOnly
			title={title}
			className="trustdev-contextual-debug-panel"
		/>
	);
}

/** Rappel visible : génération lab ≠ runtime TourViewer (preview TourSimulator). */
export function SdkLabRuntimeCapabilitiesNote({ className }: { className?: string }) {
	return (
		<p className={cn(LAB_ORANGE_CALLOUT_CLASS, 'p-3', className)} role="note">
			<strong className={LAB_ORANGE_CALLOUT_LABEL_CLASS}>Runtime :</strong>{' '}
			{LAB_RUNTIME_CAPABILITIES_NOTE}
		</p>
	);
}

/** Chaîne singlePageTour 7 slots (rempli / skipped par slot). */
export function SdkLabSinglePageChainCard({
	debugReport,
}: {
	debugReport: ContextualGenerationDebugReport | null;
}) {
	const slots = debugReport?.singlePageChainSlots;

	return (
		<Card className="border-border/60 shadow-card">
			<CardHeader>
				<CardTitle>Single-page chain (7 slots)</CardTitle>
				<CardDescription>
					Décisions slot par slot du profil <code className="text-xs">singlePageTour</code> (primary, search, secondary, navigation, analytics, utility, settings).
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-1">
				{slots?.length ? (
					slots.map((row) => (
						<p
							key={`${row.slot}-${row.slotId}`}
							className={`font-mono text-xs leading-5 ${
								row.status === 'filled' ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'
							}`}
						>
							{row.line}
						</p>
					))
				) : (
					<p className="text-sm text-muted-foreground">
						Non disponible — activez <code className="text-xs">singlePageTour: true</code> et relancez l’analyse.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

/** Top 5 candidats / intent (même données que le panneau SDK ContextualSuggestionsPublisher). */
export function SdkLabCandidateRankingsCard({
	debugReport,
}: {
	debugReport: ContextualGenerationDebugReport | null;
}) {
	const groups = debugReport?.candidateRankings;

	return (
		<Card className="border-border/60 shadow-card">
			<CardHeader>
				<CardTitle>Candidate rankings (top 5 / intent)</CardTitle>
				<CardDescription>
					Scores et raisons de rejet par intention — alimenté par le générateur SDK après « Analyser ».
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{groups?.length ? (
					groups.map((group) => (
						<div key={group.intent} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.intent}</p>
							<ul className="mt-2 space-y-1 text-xs leading-5 text-foreground">
								{group.lines.map((line, idx) => (
									<li key={`${group.intent}-${idx}`} className="font-mono">
										{line}
									</li>
								))}
							</ul>
						</div>
					))
				) : (
					<p className="text-sm text-muted-foreground">
						Aucun classement disponible. Lancez une analyse — les rankings sont inclus dans le rapport debug SDK.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

export function SdkLabDraftPlayerModal({
	draft,
	onClose,
}: {
	draft: SuggestedTourDraft | null;
	onClose: () => void;
}) {
	const tour = useMemo(() => (draft ? draftToGuidedTour(draft) : null), [draft]);

	if (!draft || !tour) return null;

	return (
		<div className="fixed inset-0 z-[130] bg-black/70 p-3 md:p-8">
			<div className="mx-auto flex h-full w-full max-w-6xl flex-col rounded-xl border border-slate-200 bg-white/95 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 md:p-4">
				<div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
					<div>
						<h2 className="text-lg font-semibold text-slate-900 dark:text-white">Lecture runtime — {draft.name}</h2>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							{draft.steps?.length || 0} étape(s) · intent {draft.intent}
							{draft.origin?.kind === 'blueprint' ? ` · blueprint ${draft.origin.blueprintId}` : ''}
						</p>
						<SdkLabRuntimeCapabilitiesNote className="mt-2 max-w-2xl" />
					</div>
					<Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer la lecture">
						<X className="h-4 w-4" />
					</Button>
				</div>
				<div className="min-h-0 flex-1">
					<TourSimulator
						key={`${draft.name}-${draft.generatedAt}`}
						steps={tour.steps || []}
						simulationContext={draft.metadata?.previewContext as GuidedTour['simulationContext']}
						tourName={tour.name}
						targetUrl={tour.targetUrl}
						initialIsPlaying
						onExitPreview={onClose}
					/>
				</div>
			</div>
		</div>
	);
}

export function SdkLabFeedbackPanel({
	suggestions,
}: {
	suggestions: Pick<
		UseContextualTourSuggestionsResult,
		'resetFeedback' | 'feedbackVersion'
	>;
}) {
	void suggestions.feedbackVersion;

	return (
		<Card className="border-border/60 shadow-card">
			<CardHeader>
				<CardTitle>Boucle feedback (réel)</CardTitle>
				<CardDescription>
					Événements synchronisés avec le backend lorsque <code className="text-xs">feedbackEnabled</code> est actif.
					Utilisez les boutons sur chaque draft ou le panneau flottant SDK.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button
					type="button"
					variant="outline"
					className="rounded-xl"
					onClick={() => suggestions.resetFeedback()}
				>
					<RotateCcw className="mr-2 h-4 w-4" />
					Réinitialiser le feedback (local + cache distant)
				</Button>
			</CardContent>
		</Card>
	);
}

export function SdkLabDraftResultsCard({
	drafts,
	suggestions,
	onPlayDraft,
}: {
	drafts: SuggestedTourDraft[];
	suggestions: Pick<
		UseContextualTourSuggestionsResult,
		'recordFeedback' | 'getLocalFeedback' | 'feedbackVersion' | 'lastPublishReport'
	>;
	onPlayDraft: (draft: SuggestedTourDraft) => void;
}) {
	const [message, setMessage] = useState<string | null>(null);
	void suggestions.feedbackVersion;

	const record = (draft: SuggestedTourDraft, event: FeedbackEvent) => {
		const selector = draft.steps[0]?.targetSelector;
		const blueprintId = draft.origin?.kind === 'blueprint' ? draft.origin.blueprintId : undefined;
		suggestions.recordFeedback({ intent: draft.intent, selector, event, blueprintId });
		setMessage(`Feedback « ${event} » enregistré pour ${draft.name}`);
	};

	return (
		<Card className="border-border/60 shadow-card">
			<CardHeader>
				<CardTitle>Résultats de génération</CardTitle>
				<CardDescription>
					Drafts du moteur réel. Simulez le cycle feedback puis lancez la lecture runtime (iframe same-origin).
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{message ? <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p> : null}
				{drafts.length === 0 ? (
					<p className="text-sm text-muted-foreground">Aucun parcours. Lancez une analyse.</p>
				) : (
					drafts.slice(0, 5).map((draft, draftIdx) => {
						const selector = draft.steps[0]?.targetSelector;
						const local = suggestions.getLocalFeedback(selector);
						return (
							<div
								key={`draft-result-${draftIdx}-${draft.name}-${draft.intent}-${draft.generatedAt ?? ''}`}
								className="rounded-2xl border border-border/60 bg-muted/20 p-3"
							>
								<div className="flex flex-wrap items-start justify-between gap-2">
									<div>
										<p className="text-sm font-semibold">{draft.name}</p>
										<p className="mt-1 text-xs text-muted-foreground">
											intent: {draft.intent} | confidence: {draft.confidence} | score:{' '}
											{Math.round(draft.score)}
											{draft.origin?.kind === 'blueprint'
												? ` | blueprint: ${draft.origin.blueprintId}`
												: ' | heuristic'}
										</p>
									</div>
									<Button
										type="button"
										size="sm"
										variant="secondary"
										className="rounded-lg"
										onClick={() => onPlayDraft(draft)}
									>
										<Play className="mr-1 h-3.5 w-3.5" />
										Jouer
									</Button>
								</div>
								{draft.explainability ? (
									<p className="mt-2 text-xs text-muted-foreground">
										signals: semantic={Math.round(draft.explainability.signalScores.semantic)}, sequence=
										{Math.round(draft.explainability.signalScores.sequence)}
									</p>
								) : null}
								{selector ? <p className="mt-1 text-xs text-primary">selector: {selector}</p> : null}
								{local ? (
									<p className="mt-2 text-xs text-muted-foreground">
										feedback local — shown:{local.shown} clicked:{local.clicked} completed:{local.completed}{' '}
										skipped:{local.skipped}
									</p>
								) : null}
								<div className="mt-3 flex flex-wrap gap-1.5">
									{(['shown', 'clicked', 'completed', 'skipped'] as const).map((event) => (
										<Button
											key={event}
											type="button"
											size="sm"
											variant="outline"
											className="h-7 rounded-lg px-2 text-xs"
											onClick={() => record(draft, event)}
										>
											{event}
										</Button>
									))}
								</div>
							</div>
						);
					})
				)}
				{suggestions.lastPublishReport && (suggestions.lastPublishReport.created ?? 0) > 0 ? (
					<Button variant="outline" className="w-full rounded-xl" asChild>
						<Link href="/dashboard/tours">Voir les parcours publiés sur le dashboard</Link>
					</Button>
				) : null}
			</CardContent>
		</Card>
	);
}

function SdkLabMetricTile({ label, value }: { label: string; value: number | string }) {
	return (
		<div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
			<p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
			<p className="mt-1 text-lg font-semibold">{value}</p>
		</div>
	);
}

export type SdkLabExtraMetric = { label: string; value: number | string };

/** Grille de métriques de génération — identique sur tous les scénarios lab. */
export function SdkLabGenerationMetrics({
	drafts,
	debugReport,
	flowRegistry,
	extraMetrics = [],
}: {
	drafts: SuggestedTourDraft[];
	debugReport: ContextualGenerationDebugReport | null;
	flowRegistry: Array<{ version: string; signature: string; generatedAt: string; targetUrl: string }>;
	extraMetrics?: SdkLabExtraMetric[];
}) {
	const candidateMetrics = debugReport?.candidateMetrics;

	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			<SdkLabMetricTile label="Drafts affichés" value={drafts.length} />
			<SdkLabMetricTile label="Candidats acceptés" value={candidateMetrics?.accepted ?? 0} />
			<SdkLabMetricTile label="Conflits" value={debugReport?.conflicts.length ?? 0} />
			<SdkLabMetricTile label="Flow registry" value={flowRegistry.length} />
			<SdkLabMetricTile label="Rejetés (bruit)" value={candidateMetrics?.rejectedNoise ?? 0} />
			<SdkLabMetricTile label="Cache hits" value={candidateMetrics?.cacheHits ?? 0} />
			{extraMetrics.map((metric) => (
				<SdkLabMetricTile key={metric.label} label={metric.label} value={metric.value} />
			))}
		</div>
	);
}

export function SdkLabRunErrors({
	error,
	publishError,
}: {
	error: string | null;
	publishError: string | null;
}) {
	if (!error && !publishError) return null;
	return (
		<div className="space-y-1">
			{error ? <p className="text-sm font-medium text-destructive">Erreur SDK : {error}</p> : null}
			{publishError ? (
				<p className="text-sm font-medium text-destructive">Erreur publication : {publishError}</p>
			) : null}
		</div>
	);
}

/** Métriques génération + publication (bloc sous le bouton Analyser). */
export function SdkLabAnalysisMetricsBlock({
	drafts,
	debugReport,
	flowRegistry,
	extraMetrics,
	lastPublishReport,
	publishError,
	isPublishing,
}: {
	drafts: SuggestedTourDraft[];
	debugReport: ContextualGenerationDebugReport | null;
	flowRegistry: Array<{ version: string; signature: string; generatedAt: string; targetUrl: string }>;
	extraMetrics?: SdkLabExtraMetric[];
	lastPublishReport: PublishContextualDraftsResponse['report'] | null;
	publishError: string | null;
	isPublishing: boolean;
}) {
	return (
		<div className="space-y-3">
			<SdkLabGenerationMetrics
				drafts={drafts}
				debugReport={debugReport}
				flowRegistry={flowRegistry}
				extraMetrics={extraMetrics}
			/>
			<SdkLabPublishMetrics
				lastPublishReport={lastPublishReport}
				publishError={publishError}
				isPublishing={isPublishing}
			/>
		</div>
	);
}

const DEBUG_REPORT_PREVIEW_KEYS = [
	'generatedAt',
	'elapsedMs',
	'optionsSnapshot',
	'candidateMetrics',
	'candidateRankings',
	'singlePageChainSlots',
	'draftMetrics',
	'conflicts',
	'semanticEnhancement',
] as const;

export function SdkLabDebugReportCard({
	debugReport,
	flowRegistry,
}: {
	debugReport: ContextualGenerationDebugReport | null;
	flowRegistry: Array<{ version: string; signature: string; generatedAt: string; targetUrl: string }>;
}) {
	return (
		<Card className="border-border/60 shadow-card">
			<CardHeader>
				<CardTitle>Rapport debug</CardTitle>
				<CardDescription>
					Résumé technique du dernier run pour suivre les métriques de génération.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{debugReport ? (
					<pre className="max-h-72 overflow-auto rounded-2xl bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
						{JSON.stringify(
							Object.fromEntries(
								DEBUG_REPORT_PREVIEW_KEYS.map((key) => [key, debugReport[key]]),
							),
							null,
							2,
						)}
					</pre>
				) : (
					<p className="text-sm text-muted-foreground">
						Aucun rapport debug disponible. Lancez une analyse.
					</p>
				)}
				<p className="text-xs text-muted-foreground">Flow registry entries : {flowRegistry.length}</p>
			</CardContent>
		</Card>
	);
}

/**
 * Persistent banner that reflects the **last observed** run: local rules + fusion
 * vs. sentence-transformers embeddings. Defaults to local rules until a run is observed.
 */
export interface SdkLabPhase1BannerProps {
	/** Validation phase reported by the most recent semantic debug report. */
	validationPhase?: 'phase-1-local' | 'phase-2-embeddings';
	/** Backend implementation reported by the most recent run, if any. */
	backendImplementation?: {
		kind: 'rule-based-mirror' | 'sentence-transformers' | 'unknown';
		model?: string;
		fallbackReason?:
			| 'embeddings_disabled'
			| 'embeddings_timeout'
			| 'embeddings_error'
			| 'embeddings_worker_unavailable'
			| 'sdk_http_timeout'
			| 'sdk_http_error';
	};
}

export function SdkLabPhase1Banner({ validationPhase, backendImplementation }: SdkLabPhase1BannerProps = {}) {
	const isPhase2 = validationPhase === 'phase-2-embeddings';
	const fallback = backendImplementation?.fallbackReason;

	if (isPhase2) {
		return (
			<div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.12] via-card to-card px-4 py-3 text-sm text-emerald-950 shadow-card dark:border-emerald-500/35 dark:from-emerald-500/[0.14] dark:via-card dark:to-card dark:text-emerald-50">
				<p className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text font-semibold uppercase tracking-wide text-transparent dark:from-emerald-200 dark:to-teal-200">
					Embeddings sentence-transformers
				</p>
				<p className="mt-1 text-xs leading-5">
					Backend en mode <strong>embeddings</strong>
					{backendImplementation?.model ? (
						<>
							{' '}(<span className="font-mono">{backendImplementation.model}</span>)
						</>
					) : null}
					, confiance recalibrée par marge top-1/top-2. Les métriques ci-dessous valident à la fois la
					mécanique de fusion <em>et</em> la qualité sémantique apprise sur des prototypes de rôles
					multilingues. Retour automatique vers le moteur local (règles miroir) en cas de timeout ou d&apos;erreur.
				</p>
			</div>
		);
	}

	return (
		<div className={cn(LAB_ORANGE_CALLOUT_CLASS, 'px-4 py-3 text-sm')}>
			<p className="bg-gradient-to-r from-orange-700 to-pink-600 bg-clip-text font-semibold uppercase tracking-wide text-transparent dark:from-orange-200 dark:to-pink-300">
				Moteur local &amp; fusion (règles)
			</p>
			<p className="mt-1 text-xs leading-5">
				Moteur local rule-vote{' '}
				{fallback ? (
					<>
						(<strong>fallback embeddings → moteur local</strong>, raison: <code className="font-mono">{fallback}</code>)
					</>
				) : (
					<>(backend en mode règles miroir ou inactif)</>
				)}
				. Les métriques valident la <em>mécanique</em> de fusion (decisionSource, confiance,
				suppressions, fallbacks), pas la qualité d&apos;un modèle appris.
			</p>
		</div>
	);
}

/** Inline visual bar (used by Phase 1 metrics card). */
function Phase1Bar({ value, total, tone }: { value: number; total: number; tone: 'primary' | 'success' | 'danger' | 'muted' }) {
	const pct = total > 0 ? Math.round((value / total) * 100) : 0;
	const toneClass =
		tone === 'success'
			? 'bg-emerald-500'
			: tone === 'danger'
				? 'bg-destructive'
				: tone === 'primary'
					? 'bg-orange-500'
					: 'bg-slate-400/70';
	return (
		<div className="flex items-center gap-2">
			<div className="h-1.5 w-24 rounded-full bg-muted">
				<div
					className={cn('h-1.5 rounded-full', toneClass)}
					style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
				/>
			</div>
			<span className="font-mono text-[10px] text-muted-foreground">
				{value} ({pct}%)
			</span>
		</div>
	);
}

export interface Phase1MetricsCardProps {
	runs: Array<{ runAt: string; page: string; draftCount: number }>;
	aggregates: {
		totalRuns: number;
		stableRuns: number;
		bypassedRuns: number;
		bypassReasons: Array<{ reason: string; count: number }>;
		decisionSource: { local: number; backend: number; merged: number };
		confidenceBuckets: Array<{ label: string; count: number; min: number; max: number }>;
		suppressed: { total: number; reasons: Array<{ reason: string; count: number }> };
		neutralSteps: number;
		backendStatusBreakdown: Array<{ status: string; count: number }>;
		orderChangedCount: number;
		copyRewriteCount: number;
	};
	onReset?: () => void;
}

export function SdkLabPhase1MetricsCard({ runs, aggregates, onReset }: Phase1MetricsCardProps) {
	const decisionTotal =
		aggregates.decisionSource.local +
		aggregates.decisionSource.backend +
		aggregates.decisionSource.merged;
	const confidenceTotal = aggregates.confidenceBuckets.reduce((sum, bucket) => sum + bucket.count, 0);

	return (
		<Card className="border-violet-400/25 bg-card/80 shadow-card">
			<CardHeader>
				<CardTitle className="text-base">Distributions de fusion — session lab</CardTitle>
				<CardDescription>
					Agrégation cumulative des <strong>{aggregates.totalRuns}</strong> run(s) de cette session de
					lab. Réinitialisez pour redémarrer un baseline propre.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{aggregates.totalRuns === 0 ? (
					<p className="text-sm text-muted-foreground">
						Aucun run capturé pour le moment. Cliquez sur <strong>Analyser</strong> dans la console
						SDK pour démarrer la collecte.
					</p>
				) : (
					<>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
							<SdkLabMetricTile label="Runs total" value={aggregates.totalRuns} />
							<SdkLabMetricTile
								label="DOM stable"
								value={`${aggregates.stableRuns}/${aggregates.totalRuns}`}
							/>
							<SdkLabMetricTile
								label="Bypass (DOM/observer)"
								value={aggregates.bypassedRuns}
							/>
							<SdkLabMetricTile
								label="Suppressions étapes"
								value={aggregates.suppressed.total}
							/>
							<SdkLabMetricTile
								label="Étapes sans avis"
								value={aggregates.neutralSteps}
							/>
						</div>

						<div className="rounded-2xl border border-border/40 bg-muted/20 p-3 text-xs">
							<p className="mb-2 font-medium text-foreground">
								decisionSource (qui a décidé chaque rôle ?)
							</p>
							<div className="grid gap-1">
								<div className="flex items-center justify-between gap-3">
									<Badge variant="outline" className="text-[10px]">
										règles locales
									</Badge>
									<Phase1Bar
										value={aggregates.decisionSource.local}
										total={decisionTotal}
										tone="primary"
									/>
								</div>
								<div className="flex items-center justify-between gap-3">
									<Badge variant="outline" className="text-[10px]">
										backend
									</Badge>
									<Phase1Bar
										value={aggregates.decisionSource.backend}
										total={decisionTotal}
										tone="success"
									/>
								</div>
								<div className="flex items-center justify-between gap-3">
									<Badge variant="outline" className="text-[10px]">
										merged
									</Badge>
									<Phase1Bar
										value={aggregates.decisionSource.merged}
										total={decisionTotal}
										tone="muted"
									/>
								</div>
							</div>
						</div>

						<div className="rounded-2xl border border-border/40 bg-muted/20 p-3 text-xs">
							<p className="mb-2 font-medium text-foreground">Distribution des confiances</p>
							<div className="grid gap-1">
								{aggregates.confidenceBuckets.map((bucket) => {
									const tone: 'danger' | 'muted' | 'primary' | 'success' =
										bucket.min < 0.3
											? 'danger'
											: bucket.min < 0.55
												? 'muted'
												: bucket.min < 0.7
													? 'primary'
													: 'success';
									return (
										<div
											key={bucket.label}
											className="flex items-center justify-between gap-3"
										>
											<Badge variant="outline" className="text-[10px]">
												{bucket.label}
											</Badge>
											<Phase1Bar value={bucket.count} total={confidenceTotal} tone={tone} />
										</div>
									);
								})}
							</div>
						</div>

						<div className="grid gap-3 md:grid-cols-2">
							<div className="rounded-2xl border border-border/40 bg-muted/20 p-3 text-xs">
								<p className="mb-2 font-medium text-foreground">Suppressions (raisons)</p>
								{aggregates.suppressed.reasons.length === 0 ? (
									<p className="text-muted-foreground">Aucune suppression pour le moment.</p>
								) : (
									<ul className="space-y-1">
										{aggregates.suppressed.reasons.map((entry) => (
											<li key={entry.reason} className="flex items-center justify-between gap-2">
												<Badge variant="outline" className="font-mono text-[10px]">
													{entry.reason}
												</Badge>
												<span className="font-mono text-[10px] text-muted-foreground">
													{entry.count}
												</span>
											</li>
										))}
									</ul>
								)}
							</div>
							<div className="rounded-2xl border border-border/40 bg-muted/20 p-3 text-xs">
								<p className="mb-2 font-medium text-foreground">
									Fallbacks &amp; statuts backend
								</p>
								{aggregates.bypassReasons.length === 0 &&
								aggregates.backendStatusBreakdown.length === 0 ? (
									<p className="text-muted-foreground">
										Aucun fallback observé — couche sémantique exécutée à chaque run.
									</p>
								) : (
									<ul className="space-y-1">
										{aggregates.bypassReasons.map((entry) => (
											<li
												key={`bypass-${entry.reason}`}
												className="flex items-center justify-between gap-2"
											>
												<Badge variant="destructive" className="font-mono text-[10px]">
													bypass {entry.reason}
												</Badge>
												<span className="font-mono text-[10px] text-muted-foreground">
													{entry.count}
												</span>
											</li>
										))}
										{aggregates.backendStatusBreakdown.map((entry) => (
											<li
												key={`status-${entry.status}`}
												className="flex items-center justify-between gap-2"
											>
												<Badge variant="outline" className="font-mono text-[10px]">
													backend {entry.status}
												</Badge>
												<span className="font-mono text-[10px] text-muted-foreground">
													{entry.count}
												</span>
											</li>
										))}
									</ul>
								)}
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<SdkLabMetricTile
								label="Drafts dont ordre re-rangé"
								value={aggregates.orderChangedCount}
							/>
							<SdkLabMetricTile
								label="Libellés réécrits"
								value={aggregates.copyRewriteCount}
							/>
						</div>

						<div className="rounded-2xl border border-border/40 bg-muted/20 p-3 text-xs">
							<p className="mb-2 font-medium text-foreground">Derniers runs</p>
							<ul className="space-y-1 font-mono text-[10px] text-muted-foreground">
								{runs.slice(-6).reverse().map((run) => (
									<li key={`${run.page}-${run.runAt}`} className="flex items-center gap-2">
										<Badge variant="outline" className="text-[10px]">
											{run.page}
										</Badge>
										<span>{run.runAt}</span>
										<span>drafts: {run.draftCount}</span>
									</li>
								))}
							</ul>
						</div>
					</>
				)}
				{onReset ? (
					<Button
						variant="outline"
						size="sm"
						className="rounded-xl"
						onClick={onReset}
						disabled={aggregates.totalRuns === 0}
					>
						Réinitialiser le baseline
					</Button>
				) : null}
			</CardContent>
		</Card>
	);
}

/** Zone 3 : bannière de phase + métriques cumulées (pleine largeur, sous sujet + console). */
export function SdkLabSemanticInsightsSection({
	validationPhase,
	backendImplementation,
	runs,
	aggregates,
	onReset,
}: SdkLabPhase1BannerProps & Phase1MetricsCardProps) {
	return (
		<SdkLabInsightsZone>
			<SdkLabPhase1Banner
				validationPhase={validationPhase}
				backendImplementation={backendImplementation}
			/>
			<SdkLabPhase1MetricsCard runs={runs} aggregates={aggregates} onReset={onReset} />
		</SdkLabInsightsZone>
	);
}

export function SdkLabSemanticEnhancementCard({
	debugReport,
}: {
	debugReport: ContextualGenerationDebugReport | null;
}) {
	const semantic = debugReport?.semanticEnhancement;
	if (!semantic) {
		return (
			<Card className="border-border/60 shadow-card">
				<CardHeader>
					<CardTitle>Couche sémantique (off)</CardTitle>
					<CardDescription>
						La couche IA sémantique n&apos;est pas activée pour ce run. Activez-la dans la
						configuration du scénario pour observer la classification et la fusion.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const backendBadge: { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string } = (() => {
		switch (semantic.backendStatus) {
			case 'ok':
				return { variant: 'default', label: `backend ${semantic.engineMode}: ok` };
			case 'timeout':
				return { variant: 'destructive', label: `backend ${semantic.engineMode}: timeout` };
			case 'error':
				return { variant: 'destructive', label: `backend ${semantic.engineMode}: error` };
			case 'disabled':
				return { variant: 'secondary', label: `engine: local-only` };
			case 'unconfigured':
				return { variant: 'outline', label: `engine: ${semantic.engineMode} (no URL)` };
			default:
				return { variant: 'outline', label: `engine: ${semantic.engineMode}` };
		}
	})();

	const minConfidencePct = Math.round((semantic.minRoleConfidence ?? 0.55) * 100);
	const stability = semantic.domStability;
	const stabilityBadge: { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string } = (() => {
		if (!stability) return { variant: 'outline', label: 'DOM: n/a' };
		if (stability.stable) {
			const age = stability.domAgeMs < 0 ? '∞' : `${stability.domAgeMs}ms`;
			return { variant: 'secondary', label: `DOM stable (${age} ≥ ${stability.requiredAgeMs}ms)` };
		}
		const reason =
			stability.bypassReason === 'observer_unavailable'
				? 'observer indisponible'
				: `${stability.domAgeMs}ms < ${stability.requiredAgeMs}ms`;
		return { variant: 'destructive', label: `DOM instable (${reason})` };
	})();
	const phaseLabel =
		semantic.validationPhase === 'phase-2-embeddings'
			? 'phase-2-embeddings'
			: 'phase-1-local';
	const phaseBadgeVariant: 'default' | 'secondary' =
		semantic.validationPhase === 'phase-2-embeddings' ? 'default' : 'secondary';
	const backendImpl = semantic.backendImplementation;
	const backendImplLabel = backendImpl
		? backendImpl.kind === 'sentence-transformers'
			? 'backend: sentence-transformers'
			: backendImpl.kind === 'rule-based-mirror'
				? 'backend: règles miroir'
				: 'backend: inconnu'
		: 'backend: n/a';
	return (
		<Card className="border-border/60 shadow-card">
			<CardHeader>
				<CardTitle>Couche sémantique (fusion bornée)</CardTitle>
				<CardDescription>
					Le moteur <strong>local</strong> est un classifieur déterministe par règles +
					mots-clés + signaux structurels (DOM/ARIA). Ce <em>n&apos;est pas</em> un modèle
					appris : utilisez les badges <code>decisionSource</code> et <code>lowConfidence</code>
					pour distinguer les décisions règles du backend.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={phaseBadgeVariant} className="font-mono text-[10px] uppercase tracking-wide">
						{phaseLabel}
					</Badge>
					<Badge variant="outline">{backendImplLabel}</Badge>
					<Badge variant={backendBadge.variant}>{backendBadge.label}</Badge>
					<Badge variant={stabilityBadge.variant}>{stabilityBadge.label}</Badge>
					<Badge variant="outline">Seuil confiance: {minConfidencePct}%</Badge>
					<Badge variant="outline">
						Form: {semantic.pageSummary.formFieldCount}
					</Badge>
					<Badge variant="outline">
						Nav: {semantic.pageSummary.navigationLinkCount}
					</Badge>
					<Badge variant="outline">CTA: {semantic.pageSummary.ctaCount}</Badge>
				</div>
				{semantic.validationPhase === 'phase-1-local' ? (
					<p className="rounded-xl border border-orange-400/50 bg-orange-50/60 p-2 text-xs text-orange-900 dark:bg-orange-950/40 dark:text-orange-100">
						<strong>Périmètre de ce run :</strong> moteur local (règles) et mécanique de fusion uniquement — pas
						d&apos;embeddings. Le backend renvoie ici un miroir des règles locales ; ne pas présenter ces
						résultats comme une validation sémantique apprise.
					</p>
				) : null}
				{backendImpl?.disclaimer ? (
					<p className={cn(LAB_ORANGE_CALLOUT_CLASS, 'p-3')}>
						<strong className={LAB_ORANGE_CALLOUT_LABEL_CLASS}>Backend :</strong>{' '}
						{backendImpl.disclaimer}
					</p>
				) : null}
				{stability && !stability.stable ? (
					<p className="rounded-xl border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive-foreground">
						Couche sémantique <strong>bypassée</strong> pour ce run — les drafts ci-dessous sont issus
						uniquement des heuristiques. Re-lancez l&apos;analyse quand la page est stabilisée.
					</p>
				) : null}
				{semantic.calibrationNote ? (
					<p className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.12] via-card to-card p-3 text-xs leading-relaxed text-emerald-950 shadow-card dark:border-emerald-500/35 dark:from-emerald-500/[0.14] dark:via-card dark:to-card dark:text-emerald-50">
						<strong className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text font-semibold text-transparent dark:from-emerald-200 dark:to-teal-200">
							Note de calibration :
						</strong>{' '}
						{semantic.calibrationNote}
					</p>
				) : null}
				{semantic.drafts.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Aucun draft analysé. La couche s&apos;active dès qu&apos;un draft est généré.
					</p>
				) : (
					<div className="space-y-3">
						{semantic.drafts.map((draftReport, draftIdx) => (
							<div
								key={`semantic-draft-${draftIdx}-${draftReport.draftName}-${draftReport.intent}`}
								className="rounded-2xl border border-border/40 bg-muted/30 p-3 text-xs"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<span className="font-medium text-foreground">{draftReport.draftName}</span>
									<div className="flex items-center gap-1">
										<Badge variant="secondary">intent: {draftReport.intent}</Badge>
										{draftReport.orderChanged ? (
											<Badge variant="outline">ordre re-rangé</Badge>
										) : null}
										{draftReport.copyRewriteCount > 0 ? (
											<Badge variant="outline">
												{draftReport.copyRewriteCount} libellé(s) réécrit(s)
											</Badge>
										) : null}
										{draftReport.suppressedLowConfidence > 0 ? (
											<Badge variant="destructive">
												{draftReport.suppressedLowConfidence} étape(s) confiance &lt; {minConfidencePct}%
											</Badge>
										) : null}
									</div>
								</div>
								<ul className="mt-2 space-y-1 text-muted-foreground">
									{draftReport.steps.map((stepReport, stepIdx) => {
										const decisionVariant: 'default' | 'secondary' | 'outline' =
											stepReport.decisionSource === 'backend'
												? 'default'
												: stepReport.decisionSource === 'merged'
													? 'secondary'
													: 'outline';
										const decisionLabel =
											stepReport.decisionSource === 'backend'
												? 'backend'
												: stepReport.decisionSource === 'merged'
													? 'merged'
													: 'règles locales';
										return (
											<li
												key={`semantic-step-${draftIdx}-${stepIdx}-${stepReport.selector}`}
												className="flex flex-wrap items-center gap-2"
											>
												<Badge variant="outline" className="font-mono text-[10px]">
													{stepReport.semanticRole}
												</Badge>
												<Badge variant={decisionVariant} className="text-[10px]">
													src: {decisionLabel}
												</Badge>
												{stepReport.lowConfidence ? (
													<Badge variant="destructive" className="text-[10px]">
														low-conf
													</Badge>
												) : null}
												<span className="text-foreground">
													{(stepReport.roleConfidence * 100).toFixed(0)}%
												</span>
												<span>
													Δ {stepReport.fusion.appliedDelta > 0 ? '+' : ''}
													{stepReport.fusion.appliedDelta.toFixed(1)}
													{stepReport.fusion.suppressedReason ? ` (${stepReport.fusion.suppressedReason})` : ''}
												</span>
												<span className="truncate font-mono text-[10px]">
													{stepReport.selector}
												</span>
											</li>
										);
									})}
								</ul>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export function SdkLabPublishReportCard({
	lastPublishReport,
}: {
	lastPublishReport: PublishContextualDraftsResponse['report'] | null;
}) {
	return (
		<Card className="border-border/60 shadow-card">
			<CardHeader>
				<CardTitle>Rapport publication</CardTitle>
				<CardDescription>
					Détail de la dernière publication : créés, rejetés, ignorés et raisons associées.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{lastPublishReport ? (
					<pre className="max-h-72 overflow-auto rounded-2xl bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
						{JSON.stringify(lastPublishReport, null, 2)}
					</pre>
				) : (
					<p className="text-sm text-muted-foreground">
						Aucun rapport de publication disponible. Lancez une analyse pour afficher le résultat.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

/** Colonne latérale standard : drafts, feedback, rapports debug et publication. */
export function SdkLabResultsColumn({
	drafts,
	debugReport,
	flowRegistry,
	lastPublishReport,
	suggestionsApi,
	onPlayDraft,
	resetFeedback,
	feedbackVersion,
}: {
	drafts: SuggestedTourDraft[];
	debugReport: ContextualGenerationDebugReport | null;
	flowRegistry: Array<{ version: string; signature: string; generatedAt: string; targetUrl: string }>;
	lastPublishReport: PublishContextualDraftsResponse['report'] | null;
	suggestionsApi: Pick<
		UseContextualTourSuggestionsResult,
		'recordFeedback' | 'getLocalFeedback' | 'feedbackVersion' | 'lastPublishReport'
	>;
	onPlayDraft: (draft: SuggestedTourDraft) => void;
	resetFeedback: UseContextualTourSuggestionsResult['resetFeedback'];
	feedbackVersion: number;
}) {
	return (
		<div className="space-y-5">
			<SdkLabDraftResultsCard drafts={drafts} suggestions={suggestionsApi} onPlayDraft={onPlayDraft} />
			<SdkLabFeedbackPanel suggestions={{ resetFeedback, feedbackVersion }} />
			<SdkLabSemanticEnhancementCard debugReport={debugReport} />
			<SdkLabSinglePageChainCard debugReport={debugReport} />
			<SdkLabCandidateRankingsCard debugReport={debugReport} />
			<SdkLabDebugReportCard debugReport={debugReport} flowRegistry={flowRegistry} />
			<SdkLabPublishReportCard lastPublishReport={lastPublishReport} />
		</div>
	);
}

export function SdkLabPublishMetrics({
	lastPublishReport,
	publishError,
	isPublishing,
}: {
	lastPublishReport: PublishContextualDraftsResponse['report'] | null;
	publishError: string | null;
	isPublishing: boolean;
}) {
	const created = lastPublishReport?.created ?? 0;
	const rejected = lastPublishReport?.rejected ?? 0;
	const skipped = lastPublishReport?.skipped ?? 0;
	const sessionDedupSkip = lastPublishReport?.details?.some((d) =>
		d.reasons.includes('auto_publish_session_dedup_or_cap'),
	);

	let hint: string | null = null;
	if (isPublishing) {
		hint = 'Publication automatique en cours vers le backend…';
	} else if (!lastPublishReport) {
		hint = 'Aucun rapport de publication pour ce run (attendez la fin de l’analyse).';
	} else if (sessionDedupSkip) {
		hint =
			'Publication ignorée : ces drafts ont déjà été publiés dans cette session navigateur. Supprimez le parcours correspondant dans Parcours pour pouvoir republier.';
	} else if (created === 0 && rejected > 0) {
		hint = 'Aucun parcours créé : le backend a rejeté les drafts (voir Rapport publication).';
	} else if (created === 0 && skipped > 0) {
		hint = 'Aucun nouveau parcours : doublon déjà présent en base (même URL + intent + signature).';
	} else if (created > 0) {
		hint = 'Parcours lab créés (privés, inactifs par défaut — supprimez ou exportez depuis Parcours).';
	}

	return (
		<div className="space-y-3 border-t border-border/60 pt-3">
			<div className="grid gap-3 sm:grid-cols-3">
				<div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
					<p className="text-xs uppercase tracking-wide text-muted-foreground">Créés</p>
					<p className="mt-1 text-lg font-semibold">{created}</p>
				</div>
				<div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
					<p className="text-xs uppercase tracking-wide text-muted-foreground">Rejetés</p>
					<p className="mt-1 text-lg font-semibold">{rejected}</p>
				</div>
				<div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
					<p className="text-xs uppercase tracking-wide text-muted-foreground">Ignorés</p>
					<p className="mt-1 text-lg font-semibold">{skipped}</p>
				</div>
			</div>
			{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
			{publishError ? <p className="text-xs font-medium text-destructive">{publishError}</p> : null}
		</div>
	);
}

export type SdkLabRunBindings = {
	drafts: SuggestedTourDraft[];
	debugReport: ContextualGenerationDebugReport | null;
	flowRegistry: Array<{ version: string; signature: string; generatedAt: string; targetUrl: string }>;
	lastPublishReport: PublishContextualDraftsResponse['report'] | null;
	publishError: string | null;
	error: string | null;
	isGenerating: boolean;
	isPublishing: boolean;
	suggestionsApi: Pick<
		UseContextualTourSuggestionsResult,
		'recordFeedback' | 'getLocalFeedback' | 'feedbackVersion' | 'lastPublishReport'
	>;
	resetFeedback: UseContextualTourSuggestionsResult['resetFeedback'];
	feedbackVersion: number;
	onPlayDraft: (draft: SuggestedTourDraft) => void;
};

/** Paramètres de session injectés dans le moteur (zone SDK). */
export function SdkLabSessionControls({
	idPrefix,
	strategy,
	onStrategyChange,
	stage,
	onStageChange,
	progress,
	onProgressChange,
	columns = 2,
}: {
	idPrefix: string;
	strategy: LabConflictStrategy;
	onStrategyChange: (value: LabConflictStrategy) => void;
	stage: LabSessionStage;
	onStageChange: (value: LabSessionStage) => void;
	progress: number;
	onProgressChange: (value: number) => void;
	columns?: 2 | 3;
}) {
	const gridClass = columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';

	return (
		<div className={cn('grid items-end gap-3', gridClass)}>
			<div className="grid gap-2">
				<label htmlFor={`${idPrefix}-strategy`} className="text-sm font-medium leading-snug">
					Stratégie de conflit
				</label>
				<Select value={strategy} onValueChange={(v) => onStrategyChange(v as LabConflictStrategy)}>
					<SelectTrigger id={`${idPrefix}-strategy`} className={LAB_SELECT_TRIGGER_CLASS}>
						<SelectValue placeholder="Stratégie de conflit" />
					</SelectTrigger>
					<SelectContent alignItemWithTrigger={false} side="bottom" sideOffset={8} className={LAB_SELECT_CONTENT_CLASS}>
						<SelectItem value="hybrid">hybrid</SelectItem>
						<SelectItem value="highest-score">highest-score</SelectItem>
						<SelectItem value="highest-confidence">highest-confidence</SelectItem>
						<SelectItem value="intent-priority">intent-priority</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="grid gap-2">
				<label htmlFor={`${idPrefix}-stage`} className="text-sm font-medium leading-snug">
					Stage session
				</label>
				<Select value={stage} onValueChange={(v) => onStageChange(v as LabSessionStage)}>
					<SelectTrigger id={`${idPrefix}-stage`} className={LAB_SELECT_TRIGGER_CLASS}>
						<SelectValue placeholder="Stage session" />
					</SelectTrigger>
					<SelectContent alignItemWithTrigger={false} side="bottom" sideOffset={8} className={LAB_SELECT_CONTENT_CLASS}>
						<SelectItem value="discovery">discovery</SelectItem>
						<SelectItem value="activation">activation</SelectItem>
						<SelectItem value="adoption">adoption</SelectItem>
						<SelectItem value="retention">retention</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className={cn('grid gap-2', columns === 2 ? 'sm:col-span-2' : '')}>
				<label htmlFor={`${idPrefix}-progress`} className="text-sm font-medium">
					Progression onboarding : {progress}%
				</label>
				<input
					id={`${idPrefix}-progress`}
					type="range"
					min={0}
					max={100}
					value={progress}
					onChange={(e) => onProgressChange(Number(e.target.value))}
					className={LAB_PROGRESS_RANGE_CLASS}
					style={{ '--phoenix-range-fill': `${progress}%` } as React.CSSProperties}
				/>
			</div>
		</div>
	);
}

/** Bouton d’analyse + badges + actions optionnelles (burst, etc.). */
export function SdkLabAnalyzeToolbar({
	onAnalyze,
	isGenerating,
	isPublishing,
	lastRunAt,
	analyzeLabel = 'Analyser cette page',
	analyzeDataTourId,
	disabled,
	children,
}: {
	onAnalyze: () => void;
	isGenerating: boolean;
	isPublishing: boolean;
	lastRunAt: string | null;
	analyzeLabel?: string;
	analyzeDataTourId?: string;
	disabled?: boolean;
	children?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Button
				type="button"
				onClick={onAnalyze}
				data-tour-id={analyzeDataTourId}
				className="rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(255,107,0,0.35)] active:translate-y-0"
				disabled={disabled ?? (isGenerating || isPublishing)}
			>
				{isGenerating ? 'Analyse en cours…' : analyzeLabel}
			</Button>
			{children}
			{isPublishing ? <Badge variant="outline">Publication en cours…</Badge> : null}
			{lastRunAt ? <Badge variant="outline">Dernier run : {lastRunAt}</Badge> : null}
		</div>
	);
}

/** Console SDK complète (analyse + résultats) pour la zone droite. */
export function SdkLabSdkConsole({
	run,
	sessionControls,
	toolbar,
	extraMetrics,
	monitor,
}: {
	run: SdkLabRunBindings;
	sessionControls?: ReactNode | null;
	toolbar: ReactNode;
	extraMetrics?: SdkLabExtraMetric[];
	monitor?: ReactNode;
}) {
	return (
		<SdkLabSdkZone>
			{monitor ? <div className="mb-4">{monitor}</div> : null}
			<Card className="border-orange-400/20 bg-card/80 shadow-card">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Analyse & publication</CardTitle>
					<CardDescription>
						Paramètres de session simulée, lancement du moteur et métriques du dernier run.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<SdkLabRuntimeCapabilitiesNote />
					{sessionControls ? sessionControls : null}
					{toolbar}
					<SdkLabRunErrors error={run.error} publishError={run.publishError} />
					<SdkLabAnalysisMetricsBlock
						drafts={run.drafts}
						debugReport={run.debugReport}
						flowRegistry={run.flowRegistry}
						lastPublishReport={run.lastPublishReport}
						publishError={run.publishError}
						isPublishing={run.isPublishing}
						extraMetrics={extraMetrics}
					/>
				</CardContent>
			</Card>
			<SdkLabResultsColumn
				drafts={run.drafts}
				debugReport={run.debugReport}
				flowRegistry={run.flowRegistry}
				lastPublishReport={run.lastPublishReport}
				suggestionsApi={run.suggestionsApi}
				onPlayDraft={run.onPlayDraft}
				resetFeedback={run.resetFeedback}
				feedbackVersion={run.feedbackVersion}
			/>
		</SdkLabSdkZone>
	);
}
