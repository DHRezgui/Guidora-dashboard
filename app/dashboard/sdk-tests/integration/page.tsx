'use client';

import { useMemo, useState } from 'react';
import { Calendar, FileText, HeartPulse, Pill } from 'lucide-react';
import type { SuggestedTourDraft } from '@sdk/types/sdk';
import { healthtechBlueprints } from '@sdk/utils/blueprints/packs/healthtech';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { SdkLabShell } from '../_components';
import { labContextualDefaults } from '../lab-shared';
import { SdkLabTwoZoneLayout, SdkLabSubjectZone } from '../lab-layout';
import { SdkLabAnalyzeToolbar, SdkLabDraftPlayerModal, SdkLabSdkConsole } from '../lab-ui';
import { useSdkLabPage } from '../use-sdk-lab-page';

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
			description="Exemple d’intégration avec un pack de blueprints (healthtechBlueprints, remplaçable par fintech, SaaS, etc.), feedback backend et lecture runtime des drafts."
			badges={['blueprints (exemple)', 'feedback', 'runtime']}
		>
			<SdkLabTwoZoneLayout
				subject={
					<SdkLabSubjectZone
						title="Portail patient (mock)"
						description="Interface fictive alignée sur healthtechBlueprints — en production, branchez vos propres journeyBlueprints."
					>
						<Card className="border-border/60 shadow-sm">
							<CardHeader>
								<Badge variant="outline" className="w-fit">
									Application hôte
								</Badge>
								<CardTitle className="text-2xl">Espace santé — parcours blueprint</CardTitle>
								<CardDescription>
									Boutons métier que le moteur doit mapper aux blueprints du pack{' '}
									<code className="text-xs">healthtech</code>.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-wrap gap-3">
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
			<SdkLabDraftPlayerModal draft={playDraft} onClose={() => setPlayDraft(null)} />
		</SdkLabShell>
	);
}
