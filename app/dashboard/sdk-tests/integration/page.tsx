'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Building2, Calendar, FileText, HeartPulse, Pill, Users, Warehouse } from 'lucide-react';
import type { SuggestedTourDraft } from '@sdk/types/sdk';
import { healthtechBlueprints } from '@sdk/utils/blueprints/packs/healthtech';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { SdkLabShell } from '../_components';
import { labContextualDefaults } from '../lab-shared';
import { SdkLabTwoZoneLayout, SdkLabSubjectZone } from '../lab-layout';
import {
	SdkLabAnalyzeToolbar,
	SdkLabDraftPlayerModal,
	SdkLabSemanticInsightsSection,
	SdkLabSdkConsole,
} from '../lab-ui';
import { useSdkLabPage } from '../use-sdk-lab-page';
import { usePhase1RunHistory } from '../use-phase1-run-history';

export default function IntegrationTestPage() {
	const [playDraft, setPlayDraft] = useState<SuggestedTourDraft | null>(null);

	const sdkOptions = useMemo(
		() =>
			labContextualDefaults({
				publishScenario: 'medium' as const,
				journeyVerticals: ['healthtech'],
				journeyBlueprints: healthtechBlueprints,
				blueprintsExclusive: false,
				persona: 'patient',
				minConfidence: 35,
				semanticHints: ['dossier patient', 'rendez-vous', 'historique médical', 'ordonnance'],
				businessObjectives: ['support-navigation', 'primary-action'],
				sessionContext: {
					sessionId: 'sdk-tests-integration-health',
					isNewUser: true,
					onboardingProgress: 0.2,
					currentStage: 'discovery',
					seenSelectors: [],
					completedSelectors: [],
					preferredIntents: ['support-navigation' as const],
				},
				flowVersion: 'integration-health-v1',
				baselineFlowVersion: 'integration-health-v0',
			}),
		[],
	);

	const lab = useSdkLabPage(sdkOptions, {
		labKey: 'integration',
		publishScenario: 'medium',
		targetUrl: '/dashboard/sdk-tests/integration',
	});

	const phase1 = usePhase1RunHistory({
		page: 'integration',
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
			title="Intégration réelle (blueprints)"
			description="Pack healthtechBlueprints (remplaçable), feedback runtime, et moniteur Abandon comme sur une app cliente."
			badges={['blueprints (exemple)', 'runtime', 'abandon', 'hybrid']}
		>
			<SdkLabTwoZoneLayout
				subject={
					<SdkLabSubjectZone
						title="Portail patient (mock)"
						description="Interface fictive alignée sur healthtechBlueprints — en production, branchez vos propres journeyBlueprints."
					>
						{/*
							Ancres pilotage (healthtech.management-dashboard) : sans ces data-tour-id,
							les selectorHints génériques (main h1, a[href*="/analytics"], etc.) se résolvent
							sur le chrome du lab au lieu du sujet de test.
						*/}
						<Card className="border-border/60 shadow-sm" data-tour-id="management-dashboard">
							<CardHeader>
								<Badge variant="outline" className="w-fit">
									Application hôte
								</Badge>
								<CardTitle className="text-2xl">Espace santé — parcours blueprint</CardTitle>
								<CardDescription>
									Boutons métier que le moteur doit mapper aux blueprints du pack{' '}
									<code className="text-xs">healthtech</code>. La rangée « Pilotage » fournit
									les cibles stables du blueprint{' '}
									<code className="text-xs">healthtech.management-dashboard</code>.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="flex flex-wrap gap-3">
									<Button data-tour-id="patient-record" className="rounded-xl">
										<FileText className="mr-2 h-4 w-4" />
										Mon dossier
									</Button>
									<Button data-tour-id="book-appointment" variant="secondary" className="rounded-xl">
										<Calendar className="mr-2 h-4 w-4" />
										Prendre rendez-vous
									</Button>
									<Button data-tour-id="medical-history" variant="outline" className="rounded-xl">
										<HeartPulse className="mr-2 h-4 w-4" />
										Historique médical
									</Button>
									<Button data-tour-id="renew-prescription" variant="ghost" className="rounded-xl">
										<Pill className="mr-2 h-4 w-4" />
										Renouveler ordonnance
									</Button>
								</div>
								<div className="space-y-2 border-t border-border/50 pt-4">
									<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
										Pilotage opérationnel (mock)
									</p>
									<div className="flex flex-wrap gap-2">
										<Button data-tour-id="patients" size="sm" variant="outline" className="rounded-lg">
											<Users className="mr-2 h-4 w-4" />
											Patients / volumes
										</Button>
										<Button data-tour-id="pharmacy" size="sm" variant="outline" className="rounded-lg">
											<Warehouse className="mr-2 h-4 w-4" />
											Pharmacie
										</Button>
										<Button data-tour-id="facilities" size="sm" variant="outline" className="rounded-lg">
											<Building2 className="mr-2 h-4 w-4" />
											Établissements
										</Button>
										<Button data-tour-id="reports" size="sm" variant="outline" className="rounded-lg">
											<BarChart3 className="mr-2 h-4 w-4" />
											Rapports
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					</SdkLabSubjectZone>
				}
				sdk={
					<SdkLabSdkConsole
						run={runBindings}
						sessionControls={null}
						toolbar={
							<SdkLabAnalyzeToolbar
								onAnalyze={lab.runAnalysis}
								isGenerating={lab.isGenerating}
								isPublishing={lab.isPublishing}
								lastRunAt={lab.lastRunAt}
								analyzeLabel="Analyser (pack blueprints exemple)"
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
