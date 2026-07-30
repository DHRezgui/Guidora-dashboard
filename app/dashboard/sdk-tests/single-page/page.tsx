'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart3, LayoutDashboard, Plus, Search, Settings2, Users } from 'lucide-react';
import type { SuggestedTourDraft } from '@sdk/types/sdk';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { SdkLabShell } from '../_components';
import { labSinglePageTourDefaults } from '../lab-shared';
import { SdkLabTwoZoneLayout, SdkLabSubjectZone } from '../lab-layout';
import {
	SdkLabAnalyzeToolbar,
	SdkLabDraftPlayerModal,
	SdkLabSemanticInsightsSection,
	SdkLabSdkConsole,
	SdkLabSessionControls,
} from '../lab-ui';
import { useSdkLabPage } from '../use-sdk-lab-page';
import { usePhase1RunHistory } from '../use-phase1-run-history';

const menuNav = [
	{ label: 'Dashboard', href: '#sp-dashboard', tourId: 'tour-sp-nav-dashboard', icon: LayoutDashboard },
	{ label: 'Tasks', href: '#sp-tasks', tourId: 'tour-sp-nav-tasks', icon: Users },
	{ label: 'Analytics', href: '#sp-analytics', tourId: 'tour-sp-nav-analytics', icon: BarChart3 },
] as const;

const generalNav = [
	{ label: 'Settings', href: '#sp-settings', tourId: 'tour-sp-nav-settings' },
	{ label: 'Help', href: '#sp-help', tourId: 'tour-sp-nav-help' },
] as const;

export default function SinglePageTourLabPage() {
	const [strategy, setStrategy] = useState<'highest-confidence' | 'highest-score' | 'intent-priority' | 'hybrid'>(
		'hybrid',
	);
	const [stage, setStage] = useState<'discovery' | 'activation' | 'adoption' | 'retention'>('activation');
	const [progress, setProgress] = useState(55);
	const [playDraft, setPlayDraft] = useState<SuggestedTourDraft | null>(null);

	const sdkOptions = useMemo(
		() =>
			labSinglePageTourDefaults({
				publishScenario: 'simple' as const,
				conflictResolutionEnabled: true,
				conflictResolutionStrategy: strategy,
				explainabilityEnabled: true,
				mutationBatchWindowMs: 120,
				publishFallbackPolicy: {
					enabled: true,
					maxAttempts: 2,
					retryOnRejectedReasons: ['confidence_below_threshold', 'primary_selector_fragile_only'],
					relaxedMinConfidence: 24,
					relaxedMinScore: 16,
					includeSupportDraft: false,
					includeNavigationDraft: false,
					includeFormDraft: false,
				},
				projectDomain: 'sdk-lab single-page dashboard',
				sessionContext: {
					sessionId: 'sdk-tests-single-page-session',
					isNewUser: progress < 40,
					onboardingProgress: progress / 100,
					currentStage: stage,
					preferredIntents: ['primary-action' as const],
				},
				flowVersioningEnabled: true,
				flowVersion: 'single-page-lab-v1',
				baselineFlowVersion: 'single-page-lab-v0',
			}),
		[progress, stage, strategy],
	);

	const lab = useSdkLabPage(sdkOptions, { labKey: 'single-page', publishScenario: 'simple' });

	const phase1 = usePhase1RunHistory({
		page: 'single-page',
		debugReport: lab.debugReport,
		draftCount: lab.drafts.length,
		lastRunAt: lab.lastRunAt,
	});

	const runBindings = {
		drafts: lab.drafts,
		debugReport: lab.debugReport,
		flowRegistry: lab.flowRegistry,
		lastPublishReport: lab.lastPublishReport,
		publishError: lab.publishError,
		error: lab.error,
		isGenerating: lab.isGenerating,
		isPublishing: lab.isPublishing,
		suggestionsApi: lab.suggestionsApi,
		resetFeedback: lab.resetFeedback,
		feedbackVersion: lab.feedbackVersion,
		onPlayDraft: setPlayDraft,
	};

	return (
		<SdkLabShell
			title="Single-page — chaîne 7 slots"
			description="Mock dashboard SaaS avec singlePageTour (1 draft, jusqu’à 7 étapes) et moniteur Abandon en parallèle."
			badges={['singlePageTour', '7 slots', 'abandon', 'domain-agnostic']}
		>
			<SdkLabTwoZoneLayout
				subject={
					<SdkLabSubjectZone
						title="Dashboard produit (mock)"
						description="Surface analysée : toolbar header, navigation latérale et carte analytics pour remplir les slots 1–7."
					>
						<div className="flex min-h-[420px] flex-col gap-4 overflow-hidden rounded-2xl border border-border/60 bg-muted/10 md:flex-row">
							<aside className="w-full shrink-0 border-b border-border/60 bg-card/80 p-3 md:w-52 md:border-b-0 md:border-r">
								<p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
									Menu
								</p>
								<nav className="space-y-0.5">
									{menuNav.map((item) => (
										<Link
											key={item.label}
											href={item.href}
											data-tour-id={item.tourId}
											className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
										>
											<item.icon className="h-4 w-4" />
											{item.label}
										</Link>
									))}
								</nav>
								<p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
									General
								</p>
								<nav className="space-y-0.5">
									{generalNav.map((item) => (
										<Link
											key={item.label}
											href={item.href}
											data-tour-id={item.tourId}
											className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
										>
											{item.label === 'Settings' ? (
												<Settings2 className="h-4 w-4" />
											) : null}
											{item.label}
										</Link>
									))}
								</nav>
							</aside>

							<div className="min-w-0 flex-1 p-4">
								<header className="mb-4 space-y-3">
									<div>
										<h3 className="text-lg font-semibold">Dashboard</h3>
										<p className="text-sm text-muted-foreground">
											Plan, prioritize, and accomplish your tasks with ease.
										</p>
									</div>
									<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
										<div className="relative max-w-md flex-1">
											<Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
											<Input
												data-tour-id="tour-sp-search-task"
												placeholder="Search task"
												className="h-9 pl-9"
											/>
										</div>
										<div className="flex flex-wrap gap-2">
											<Button data-tour-id="tour-sp-add-project" className="h-9 rounded-xl">
												<Plus className="mr-2 h-4 w-4" />
												+ Add Project
											</Button>
											<Button
												variant="outline"
												data-tour-id="tour-sp-import-data"
												className="h-9 rounded-xl"
											>
												Import Data
											</Button>
										</div>
									</div>
								</header>

								<div className="grid gap-3 sm:grid-cols-2">
									<Card data-tour-id="tour-sp-kpi-total" className="border-border/60">
										<CardHeader className="pb-2">
											<CardDescription>Total Projects</CardDescription>
											<CardTitle className="text-2xl">24</CardTitle>
										</CardHeader>
									</Card>
									<Card
										data-tour-id="tour-sp-analytics-card"
										className="border-border/60 sm:col-span-1"
									>
										<CardHeader className="pb-2">
											<CardDescription>Project Analytics</CardDescription>
											<CardTitle className="text-base font-medium">Weekly activity</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="flex h-16 items-end gap-1">
												{[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
													<div
														key={i}
														className="flex-1 rounded-t bg-primary/70"
														style={{ height: `${h}%` }}
													/>
												))}
											</div>
										</CardContent>
									</Card>
								</div>
							</div>
						</div>
					</SdkLabSubjectZone>
				}
				sdk={
					<SdkLabSdkConsole
						run={runBindings}
						sessionControls={
							<SdkLabSessionControls
								idPrefix="single-page"
								strategy={strategy}
								onStrategyChange={setStrategy}
								stage={stage}
								onStageChange={setStage}
								progress={progress}
								onProgressChange={setProgress}
							/>
						}
						toolbar={
							<SdkLabAnalyzeToolbar
								onAnalyze={lab.runAnalysis}
								isGenerating={lab.isGenerating}
								isPublishing={lab.isPublishing}
								lastRunAt={lab.lastRunAt}
								analyzeDataTourId="tour-sp-action-analyze"
							/>
						}
					/>
				}
			/>
			<SdkLabSemanticInsightsSection
				validationPhase={phase1.runs.at(-1)?.report?.validationPhase}
				backendImplementation={phase1.runs.at(-1)?.report?.backendImplementation}
				runs={phase1.runs}
				aggregates={phase1.aggregates}
				onReset={phase1.reset}
			/>
			<SdkLabDraftPlayerModal draft={playDraft} onClose={() => setPlayDraft(null)} />
		</SdkLabShell>
	);
}
