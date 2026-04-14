'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, LayoutPanelTop, Save, ShieldCheck, UserPlus } from 'lucide-react';
import { useContextualTourSuggestions } from '@sdk/hooks/useContextualTourSuggestions';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { SdkLabShell } from '../_components';

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
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const completeness = useMemo(() => {
    const fields = [email, company, notes].filter(Boolean).length;
    return Math.round((fields / 3) * 100);
  }, [email, company, notes]);

  const sdkOptions = useMemo(
    () => ({
      enabled: true,
      autoGenerate: false,
      autoPublish: true,
      publishScenario: 'medium' as const,
      autoActivatePublishedDrafts: true,
      publishConfig: {
        apiKey: process.env.NEXT_PUBLIC_SDK_API_KEY || 'trustdev-sdk-tests',
        apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1',
        getAccessToken: () => (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null),
      },
      persona: 'admin',
      useSemanticRanking: true,
      enableSequenceDetection: true,
      includeFormDraft: true,
      includeNavigationDraft: true,
      includeSupportDraft: true,
      noiseFilteringEnabled: true,
      ignoreTransientUi: true,
      noiseSelectors: [
        '[data-tour-id^="tour-sdk-lab-nav-"]',
        '[data-tour-id="tour-sdk-lab-action-back-dashboard"]',
        'nav a[href^="/dashboard"]',
        'aside a[href^="/dashboard"]',
      ],
      mutationBatchWindowMs: 120,
      maxDirtyNodesPerBatch: 280,
      conflictResolutionEnabled: true,
      conflictResolutionStrategy: strategy,
      explainabilityEnabled: true,
      analysisSeverity: 'balanced' as const,
      publishFallbackPolicy: {
        enabled: true,
        maxAttempts: 2,
        retryOnRejectedReasons: ['confidence_below_threshold'],
        relaxedMinConfidence: 24,
        relaxedMinScore: 16,
        includeSupportDraft: true,
        includeNavigationDraft: true,
        includeFormDraft: true,
      },
      minConfidence: 60,
      semanticHints: ['formulaire', 'validation', 'enregistrer', 'navigation'],
      businessObjectives: ['completion du formulaire', 'action principale', 'validation'],
      customKeywords: {
        'primary-action': ['Enregistrer', 'Valider', 'Publier', 'Soumettre'],
        'form-flow': ['Email de contact', 'Nom de organisation', "Notes d'onboarding"],
      },
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
      flowCompatibilityMode: 'lenient' as const,
    }),
    [completeness, progress, stage, strategy],
  );

  const {
    drafts,
    isGenerating,
    isPublishing,
    error,
    publishError,
    lastPublishReport,
    refresh,
    getDebugReport,
    getFlowRegistry,
  } = useContextualTourSuggestions(sdkOptions);
  const debugReport = getDebugReport();
  const flowRegistry = getFlowRegistry();

  const runAnalysis = () => {
    const nextDrafts = refresh();
    const report = getDebugReport();
    setLastRunAt(new Date().toLocaleTimeString());

    console.info('[SDK Tests][Medium] Drafts generated:', nextDrafts);
    console.info('[SDK Tests][Medium] Debug report:', report);
    console.info('[SDK Tests][Medium] Flow registry:', getFlowRegistry());
  };

  return (
    <SdkLabShell
      title="Interface moyenne"
      description="Scénario plus riche avec navigation, formulaire, validation et zones structurées. Parfait pour tester les séquences d’actions et le ranking contextuel."
      badges={["navigation", "formulaire", "validation"]}
    >
      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-3xl border border-border/60 bg-card p-4 shadow-card">
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

        <div className="space-y-6">
          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Analyse SDK (debug + explainability)</CardTitle>
              <CardDescription>
                Lance l'analyse sur un scenario medium avec navigation, formulaire et validation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <label htmlFor="medium-strategy" className="text-sm font-medium">Strategie de conflit</label>
                  <select
                    id="medium-strategy"
                    value={strategy}
                    onChange={(event) => setStrategy(event.target.value as 'highest-confidence' | 'highest-score' | 'intent-priority' | 'hybrid')}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="hybrid">hybrid</option>
                    <option value="highest-score">highest-score</option>
                    <option value="highest-confidence">highest-confidence</option>
                    <option value="intent-priority">intent-priority</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="medium-stage" className="text-sm font-medium">Stage session</label>
                  <select
                    id="medium-stage"
                    value={stage}
                    onChange={(event) => setStage(event.target.value as 'discovery' | 'activation' | 'adoption' | 'retention')}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="discovery">discovery</option>
                    <option value="activation">activation</option>
                    <option value="adoption">adoption</option>
                    <option value="retention">retention</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="medium-progress" className="text-sm font-medium">Progression: {progress}%</label>
                  <input
                    id="medium-progress"
                    type="range"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(event) => setProgress(Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={runAnalysis} data-tour-id="tour-medium-action-analyze" className="rounded-xl" disabled={isGenerating || isPublishing}>
                  {isGenerating ? 'Analyse en cours...' : 'Analyser cette page'}
                </Button>
                {isPublishing ? <Badge variant="outline">Publication en cours...</Badge> : null}
                {lastRunAt ? <Badge variant="outline">Dernier run: {lastRunAt}</Badge> : null}
              </div>

              {error ? <p className="text-sm font-medium text-destructive">Erreur SDK: {error}</p> : null}
              {publishError ? <p className="text-sm font-medium text-destructive">Erreur publication: {publishError}</p> : null}

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Drafts</p>
                  <p className="mt-1 text-lg font-semibold">{drafts.length}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Candidats acceptes</p>
                  <p className="mt-1 text-lg font-semibold">{debugReport?.candidateMetrics.accepted ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Conflits</p>
                  <p className="mt-1 text-lg font-semibold">{debugReport?.conflicts.length ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Flow entries</p>
                  <p className="mt-1 text-lg font-semibold">{flowRegistry.length}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Publies</p>
                  <p className="mt-1 text-lg font-semibold">{lastPublishReport?.created ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div id="overview" className="grid gap-4 md:grid-cols-3">
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

          <Card id="form-section" className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Formulaire de configuration</CardTitle>
              <CardDescription>Le SDK doit repérer les champs, le bouton principal et la hiérarchie logique du flux.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
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
                  <label className="text-sm font-medium" htmlFor="medium-company">Nom de l'organisation</label>
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
                  <label className="text-sm font-medium" htmlFor="medium-notes">Notes d'onboarding</label>
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

              <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="medium-plan">Plan</label>
                  <select
                    id="medium-plan"
                    data-testid="medium-plan"
                    data-tour-id="tour-medium-form-plan"
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                    value={plan}
                    onChange={(event) => setPlan(event.target.value)}
                  >
                    <option value="Starter">Starter</option>
                    <option value="Growth">Growth</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>

                <div id="validation" className="rounded-2xl bg-background p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Vérification avant publication
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Le flux doit guider l'utilisateur de la navigation vers le formulaire puis vers la validation finale.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      id="medium-validation-save"
                      data-testid="medium-validation-save"
                      data-tour-id="tour-medium-validation-save"
                      className="rounded-xl"
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
                      className="rounded-xl"
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
              <CardDescription>Éléments supplémentaires pour tester les parcours multi-étapes et l'analyse de séquence.</CardDescription>
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

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Resultats explainability</CardTitle>
              <CardDescription>Top drafts medium avec intent, score, confidence et selector principal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {drafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun draft pour le moment. Clique sur Analyser cette page.</p>
              ) : (
                drafts.slice(0, 3).map((draft) => (
                  <div key={`${draft.name}-${draft.intent}`} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-sm font-semibold">{draft.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">intent: {draft.intent} | confidence: {draft.confidence} | score: {Math.round(draft.score)}</p>
                    {draft.explainability ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        signals: semantic={Math.round(draft.explainability.signalScores.semantic)}, sequence={Math.round(draft.explainability.signalScores.sequence)}, confidence={Math.round(draft.explainability.signalScores.confidence)}
                      </p>
                    ) : null}
                    {draft.detectedSelectors[0] ? (
                      <p className="mt-2 text-xs text-primary">selector: {draft.detectedSelectors[0]}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Rapport debug</CardTitle>
              <CardDescription>Resume brut du dernier run pour comparer les iterations medium.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {debugReport ? (
                <pre className="max-h-72 overflow-auto rounded-2xl bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                  {JSON.stringify(
                    {
                      generatedAt: debugReport.generatedAt,
                      elapsedMs: debugReport.elapsedMs,
                      optionsSnapshot: debugReport.optionsSnapshot,
                      candidateMetrics: debugReport.candidateMetrics,
                      draftMetrics: debugReport.draftMetrics,
                      conflicts: debugReport.conflicts,
                    },
                    null,
                    2,
                  )}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun rapport debug disponible. Lance une analyse.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SdkLabShell>
  );
}