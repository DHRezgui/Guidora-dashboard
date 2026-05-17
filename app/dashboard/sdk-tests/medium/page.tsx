'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, LayoutPanelTop, Save, ShieldCheck } from 'lucide-react';
import type { SuggestedTourDraft } from '@sdk/types/sdk';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { SdkLabShell } from '../_components';
import { labContextualDefaults } from '../lab-shared';
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

const menuItems = [
  { label: 'Aperçu', href: '#overview' },
  { label: 'Formulaire', href: '#form-section' },
  { label: 'Validation', href: '#validation' },
  { label: 'Historique', href: '#history' },
];

export default function MediumTestPage() {
  const [plan, setPlan] = useState('Starter');
  const [notes, setNotes] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [strategy, setStrategy] = useState<'highest-confidence' | 'highest-score' | 'intent-priority' | 'hybrid'>('hybrid');
  const [stage, setStage] = useState<'discovery' | 'activation' | 'adoption' | 'retention'>('activation');
  const [progress, setProgress] = useState(45);
  const [playDraft, setPlayDraft] = useState<SuggestedTourDraft | null>(null);

  const completeness = useMemo(() => {
    const fields = [email, company, notes].filter(Boolean).length;
    return Math.round((fields / 3) * 100);
  }, [email, company, notes]);

  const sdkOptions = useMemo(
    () =>
      labContextualDefaults({
      publishScenario: 'medium' as const,
      persona: 'admin',
      maxDrafts: 2,
      includeFormDraft: false,
      includeNavigationDraft: false,
      includeSupportDraft: false,
      mutationBatchWindowMs: 120,
      maxDirtyNodesPerBatch: 280,
      conflictResolutionEnabled: true,
      conflictResolutionStrategy: strategy,
      explainabilityEnabled: true,
      analysisSeverity: 'balanced' as const,
      publishFallbackPolicy: {
        enabled: true,
        maxAttempts: 2,
        retryOnRejectedReasons: ['confidence_below_threshold', 'score_below_threshold'],
        relaxedMinConfidence: 24,
        relaxedMinScore: 16,
        includeSupportDraft: true,
        includeNavigationDraft: true,
        includeFormDraft: true,
      },
      minConfidence: 60,
      semanticHints: ['formulaire', 'validation', 'enregistrer', 'navigation', 'menu', 'sidebar', 'aperçu'],
      customKeywords: {
        'primary-action': ['Enregistrer', 'Valider', 'Publier', 'Soumettre'],
        'form-flow': ['Email de contact', 'Nom de organisation', "Notes d'onboarding"],
        'support-navigation': ['Aperçu', 'Formulaire', 'Validation', 'Historique', 'navigation'],
      },
      businessObjectives: ['completion du formulaire', 'action principale', 'validation', 'navigation'],
      sessionContext: {
        sessionId: 'sdk-tests-medium-session',
        isNewUser: progress < 40,
        onboardingProgress: progress / 100,
        currentStage: stage,
        seenSelectors: ['#overview', '#medium-email'],
        completedSelectors: completeness >= 66 ? ['#medium-email', '#medium-company'] : [],
        preferredIntents: ['primary-action' as const, 'form-flow' as const],
      },
      flowVersioningEnabled: true,
      flowVersion: 'medium-lab-v1',
      baselineFlowVersion: 'medium-lab-v0',
    }),
    [completeness, progress, stage, strategy],
  );

  const lab = useSdkLabPage(sdkOptions, { labKey: 'medium', publishScenario: 'medium' });

  const phase1 = usePhase1RunHistory({
    page: 'medium',
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
      title="Interface moyenne"
      description="Scénario plus riche avec navigation, formulaire, validation et zones structurées. Parfait pour tester les séquences d’actions et le ranking contextuel."
      badges={['navigation', 'formulaire', 'validation', 'hybrid']}
    >
      <SdkLabTwoZoneLayout
        subject={
          <SdkLabSubjectZone
            title="Application métier (navigation + formulaire)"
            description="Sidebar, formulaire et validation : le SDK doit proposer des parcours form-flow et primary-action cohérents."
          >
            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
        <aside className="shrink-0 space-y-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Navigation</p>
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                data-tour-id={`tour-medium-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span>{item.label}</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            ))}
          </nav>
          <div className="rounded-2xl bg-muted/40 p-3 text-sm">
            <p className="font-semibold">Plan courant</p>
            <p className="mt-1 text-muted-foreground">{plan}</p>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <div id="overview" className="grid min-w-0 gap-4 md:grid-cols-3">
            <Card className="border-border/60 shadow-card">
              <CardHeader>
                <CardTitle>Comptes actifs</CardTitle>
                <CardDescription>Zone de lecture pour tester les parcours de découverte.</CardDescription>
              </CardHeader>
              <CardContent className="text-3xl font-bold">128</CardContent>
            </Card>
            <Card className="border-border/60 shadow-card">
              <CardHeader>
                <CardTitle>Complétude</CardTitle>
                <CardDescription>Progression du formulaire en cours.</CardDescription>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{completeness}%</CardContent>
            </Card>
            <Card className="border-border/60 shadow-card">
              <CardHeader>
                <CardTitle>Plan</CardTitle>
                <CardDescription>Choix du niveau de service.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Badge>{plan}</Badge>
                <LayoutPanelTop className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>

          <Card id="form-section" className="min-w-0 overflow-hidden border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Formulaire de configuration</CardTitle>
              <CardDescription>Le SDK doit repérer les champs, le bouton principal et la hiérarchie logique du flux.</CardDescription>
            </CardHeader>
            <CardContent className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
              <div className="min-w-0 space-y-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="medium-email">Email de contact</label>
                  <Input
                    id="medium-email"
                    data-testid="medium-email"
                    data-tour-id="tour-medium-form-email"
                    placeholder="contact@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="medium-company">Nom de l&aposorganisation</label>
                  <Input
                    id="medium-company"
                    data-testid="medium-company"
                    data-tour-id="tour-medium-form-company"
                    placeholder="TrustDev"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="medium-notes">Notes d&aposonboarding</label>
                  <Textarea
                    id="medium-notes"
                    data-testid="medium-notes"
                    data-tour-id="tour-medium-form-notes"
                    placeholder="Décris le besoin métier, les rôles utilisateurs et les objectifs principaux."
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>
              </div>

              <div className="min-w-0 w-full max-w-full space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="grid min-w-0 gap-2">
                  <label className="text-sm font-medium" htmlFor="medium-plan">Plan</label>
                  <Select value={plan} onValueChange={setPlan}>
                    <SelectTrigger
                      id="medium-plan"
                      data-testid="medium-plan"
                      data-tour-id="tour-medium-form-plan"
                      className="h-10 w-full max-w-full rounded-xl border-slate-300 bg-white/90 pl-3 pr-3 text-sm font-medium text-slate-700 transition-colors hover:border-orange-400/40 focus-visible:ring-orange-400/20 data-[popup-open]:border-orange-400/60 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100"
                    >
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_12px_25px_rgba(2,6,23,0.16)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_12px_35px_rgba(2,6,23,0.55)]"
                    >
                      <SelectItem value="Starter">Starter</SelectItem>
                      <SelectItem value="Growth">Growth</SelectItem>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div id="validation" className="min-w-0 rounded-2xl bg-background p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                    Vérification avant publication
                  </div>
                  <p className="mt-2 break-words text-sm text-muted-foreground">
                    Le flux doit guider l&apos;utilisateur de la navigation vers le formulaire puis vers la validation finale.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      id="medium-validation-save"
                      data-testid="medium-validation-save"
                      data-tour-id="tour-medium-validation-save"
                      className="shrink-0 rounded-xl"
                      disabled={!email || !company}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer
                    </Button>
                    <Button
                      id="medium-validation-preview"
                      data-testid="medium-validation-preview"
                      data-tour-id="tour-medium-validation-preview"
                      variant="outline"
                      className="shrink-0 rounded-xl"
                    >
                      Prévisualiser
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="history" className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Historique et suivi</CardTitle>
              <CardDescription>Éléments supplémentaires pour tester les parcours multi-étapes et l&aposanalyse de séquence.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {[
                { label: 'Dernier accès', value: 'Aujourd’hui 09:42' },
                { label: 'Étapes complétées', value: '4 / 7' },
                { label: 'Actions à revoir', value: '2' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
            </div>
            </div>
        </SdkLabSubjectZone>
        }
        sdk={
          <SdkLabSdkConsole
            run={runBindings}
            sessionControls={
              <SdkLabSessionControls
                idPrefix="medium"
                strategy={strategy}
                onStrategyChange={setStrategy}
                stage={stage}
                onStageChange={setStage}
                progress={progress}
                onProgressChange={setProgress}
                columns={3}
              />
            }
            toolbar={
              <SdkLabAnalyzeToolbar
                onAnalyze={lab.runAnalysis}
                isGenerating={lab.isGenerating}
                isPublishing={lab.isPublishing}
                lastRunAt={lab.lastRunAt}
                analyzeDataTourId="tour-medium-action-analyze"
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