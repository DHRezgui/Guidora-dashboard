'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Plus, Settings2 } from 'lucide-react';
import type { SuggestedTourDraft } from '@sdk/types/sdk';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { SdkLabShell } from '../_components';
import { labContextualDefaults } from '../lab-shared';
import { SdkLabTwoZoneLayout, SdkLabSubjectZone } from '../lab-layout';
import {
	SdkLabAnalyzeToolbar,
	SdkLabDraftPlayerModal,
	SdkLabPhase1Banner,
	SdkLabPhase1MetricsCard,
	SdkLabSdkConsole,
	SdkLabSessionControls,
} from '../lab-ui';
import { useSdkLabPage } from '../use-sdk-lab-page';
import { usePhase1RunHistory } from '../use-phase1-run-history';

const highlights = [
	{
		title: 'Créer un projet',
		description: 'Action principale de la page, utilisée pour valider la priorité métier du parcours.',
		selector: '#simple-primary-cta',
	},
	{
		title: 'Découvrir le guide',
		description: 'Lien de découverte secondaire, utile pour tester la hiérarchisation des intentions.',
		selector: '#simple-secondary-link',
	},
	{
		title: 'Réglages rapides',
		description: 'Contrôle utilitaire pour vérifier la stabilité des sélecteurs et la lecture du contexte.',
		selector: '#simple-settings',
	},
];

export default function SimpleTestPage() {
	const [strategy, setStrategy] = useState<'highest-confidence' | 'highest-score' | 'intent-priority' | 'hybrid'>('intent-priority');
	const [stage, setStage] = useState<'discovery' | 'activation' | 'adoption' | 'retention'>('adoption');
	const [progress, setProgress] = useState(75);
	const [playDraft, setPlayDraft] = useState<SuggestedTourDraft | null>(null);

	const sdkOptions = useMemo(
		() =>
			labContextualDefaults({
				publishScenario: 'simple' as const,
				persona: 'editor',
				mutationBatchWindowMs: 120,
				maxDirtyNodesPerBatch: 280,
				conflictResolutionEnabled: true,
				conflictResolutionStrategy: strategy,
				explainabilityEnabled: true,
				analysisSeverity: 'balanced' as const,
				maxDrafts: 2,
				includeSupportDraft: false,
				includeNavigationDraft: false,
				publishFallbackPolicy: {
					enabled: true,
					maxAttempts: 2,
					retryOnRejectedReasons: ['confidence_below_threshold'],
					relaxedMinConfidence: 24,
					relaxedMinScore: 16,
					includeSupportDraft: false,
					includeNavigationDraft: false,
					includeFormDraft: false,
				},
				minConfidence: 40,
				semanticHints: ['Créer un projet', 'CTA principal', 'action principale'],
				businessObjectives: ['primary-action', 'cta principal'],
				customKeywords: {
					'primary-action': ['Créer un projet', 'Créer', 'Lancer', 'Démarrer'],
				},
				sessionContext: {
					sessionId: 'sdk-tests-simple-session',
					isNewUser: progress < 40,
					onboardingProgress: progress / 100,
					currentStage: stage,
					seenSelectors: ['[data-tour-id="tour-simple-button-secondary"]'],
					completedSelectors:
						progress >= 90
							? ['button[data-tour-id="tour-simple-button-settings"]']
							: [],
					preferredIntents: ['primary-action' as const],
				},
				flowVersioningEnabled: true,
				flowVersion: 'simple-lab-v1',
				baselineFlowVersion: 'simple-lab-v0',
			}),
		[progress, stage, strategy],
	);

	const lab = useSdkLabPage(sdkOptions, { labKey: 'simple', publishScenario: 'simple' });

	const phase1 = usePhase1RunHistory({
		page: 'simple',
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
			title="Interface simple"
			description="Scénario épuré avec un CTA principal, un lien secondaire et quelques repères visuels pour valider la sélection métier."
			badges={['simple', 'CTA', 'sélecteurs stables', 'Phase 1']}
		>
			<SdkLabPhase1Banner
				validationPhase={phase1.runs.at(-1)?.report?.validationPhase}
				backendImplementation={phase1.runs.at(-1)?.report?.backendImplementation}
			/>
			<SdkLabTwoZoneLayout
				subject={
					<SdkLabSubjectZone
						title="Interface métier fictive"
						description="C’est cette surface que le SDK analyse. Les boutons et cartes ci-dessous simulent une application hôte."
					>
						<Card className="border-border/60 shadow-sm">
							<CardHeader>
								<Badge variant="outline" className="w-fit">
									Vue métier
								</Badge>
								<CardTitle className="text-2xl">Démarrer un parcours simple avec un point d’entrée clair</CardTitle>
								<CardDescription>
									Action principale, découverte secondaire et réglages utilitaires pour valider la hiérarchie des
									intentions.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="flex flex-wrap gap-3">
									<Button
										id="simple-primary-cta"
										data-testid="simple-primary-cta"
										data-tour-id="tour-simple-cta-primary"
										className="rounded-xl"
									>
										<Plus className="mr-2 h-4 w-4" />
										Créer un projet
									</Button>
									<Button
										id="simple-secondary-link"
										variant="outline"
										asChild
										data-tour-id="tour-simple-button-secondary"
										className="rounded-xl"
									>
										<Link href="#guide">
											<BookOpen className="mr-2 h-4 w-4" />
											Découvrir le guide
										</Link>
									</Button>
									<Button
										id="simple-settings"
										variant="ghost"
										data-tour-id="tour-simple-button-settings"
										className="rounded-xl"
									>
										<Settings2 className="mr-2 h-4 w-4" />
										Réglages rapides
									</Button>
								</div>
								<div className="grid gap-4 md:grid-cols-3">
									{highlights.map((item) => (
										<div key={item.title} className="rounded-2xl border border-border/60 bg-muted/30 p-4">
											<p className="text-sm font-semibold">{item.title}</p>
											<p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
											<p className="mt-3 text-xs text-primary">{item.selector}</p>
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						<Card id="guide" className="border-border/60 shadow-sm">
							<CardHeader>
								<CardTitle>Repères métier</CardTitle>
								<CardDescription>
									Comment le SDK doit prioriser l’action principale sans perdre le contexte secondaire.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3 text-sm text-muted-foreground">
								<p>1. Le titre de page établit le contexte du parcours.</p>
								<p>2. Le CTA principal porte l’intention métier dominante.</p>
								<p>3. Les actions utilitaires restent au second plan.</p>
							</CardContent>
						</Card>

						<Card className="border-border/60 shadow-sm">
							<CardHeader>
								<CardTitle>Navigation entre scénarios</CardTitle>
								<CardDescription>Raccourcis vers les autres sujets de test du lab.</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<Button className="w-full rounded-xl" asChild>
									<Link href="/dashboard/sdk-tests/medium">
										Ouvrir l’interface moyenne
										<ArrowRight className="ml-2 h-4 w-4" />
									</Link>
								</Button>
								<Button variant="outline" className="w-full rounded-xl" asChild>
									<Link href="/dashboard/sdk-tests/dynamic">Ouvrir le scénario dynamique</Link>
								</Button>
							</CardContent>
						</Card>
					</SdkLabSubjectZone>
				}
				sdk={
					<SdkLabSdkConsole
						run={runBindings}
						sessionControls={
							<SdkLabSessionControls
								idPrefix="simple"
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
								analyzeDataTourId="tour-simple-action-analyze"
							/>
						}
					/>
				}
			/>
			<SdkLabPhase1MetricsCard
				runs={phase1.runs}
				aggregates={phase1.aggregates}
				onReset={phase1.reset}
			/>
			<SdkLabDraftPlayerModal draft={playDraft} onClose={() => setPlayDraft(null)} />
		</SdkLabShell>
	);
}
