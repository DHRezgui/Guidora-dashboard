'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Plus, Settings2 } from 'lucide-react';
import { useContextualTourSuggestions } from '@sdk/hooks/useContextualTourSuggestions';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { SdkLabShell } from '../_components';

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
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const sdkOptions = useMemo(
    () => ({
      enabled: true,
      autoGenerate: false,
      autoPublish: true,
      publishScenario: 'simple' as const,
      autoActivatePublishedDrafts: true,
      publishConfig: {
        apiKey: process.env.NEXT_PUBLIC_SDK_API_KEY || 'trustdev-sdk-tests',
        apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1',
        getAccessToken: () => (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null),
      },
      persona: 'editor',
      useSemanticRanking: true,
      enableSequenceDetection: true,
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
        seenSelectors: ['#simple-secondary-link'],
        completedSelectors: progress >= 60 ? ['#simple-settings'] : [],
        preferredIntents: ['primary-action' as const],
      },
      flowVersioningEnabled: true,
      flowVersion: 'simple-lab-v1',
      baselineFlowVersion: 'simple-lab-v0',
      flowCompatibilityMode: 'lenient' as const,
    }),
    [progress, stage, strategy],
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

    console.info('[SDK Tests][Simple] Drafts generated:', nextDrafts);
    console.info('[SDK Tests][Simple] Debug report:', report);
    console.info('[SDK Tests][Simple] Flow registry:', getFlowRegistry());
  };

  return (
    <SdkLabShell
      title="Interface simple"
      description="Scénario épuré avec un CTA principal, un lien secondaire et quelques repères visuels pour valider la sélection métier."
      badges={["simple", "CTA", "sélecteurs stables"]}
    >
      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="border-border/60 shadow-card">
          <CardHeader>
            <Badge variant="outline" className="w-fit">Vue métier</Badge>
            <CardTitle className="text-2xl">Démarrer un parcours simple avec un point d’entrée clair</CardTitle>
            <CardDescription>
              Cette interface met en avant une action principale, un parcours de découverte et quelques éléments secondaires
              pour valider la hiérarchie de sélection du SDK.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button id="simple-primary-cta" data-testid="simple-primary-cta" data-tour-id="tour-simple-cta-primary" className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Créer un projet
              </Button>
              <Button id="simple-secondary-link" variant="outline" asChild data-tour-id="tour-simple-button-secondary" className="rounded-xl">
                <Link href="#guide">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Découvrir le guide
                </Link>
              </Button>
              <Button id="simple-settings" variant="ghost" data-tour-id="tour-simple-button-settings" className="rounded-xl">
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

        <div className="space-y-5">
          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Analyse du parcours</CardTitle>
              <CardDescription>
                Cette zone déclenche l’analyse du DOM et affiche les métriques utiles pour contrôler la qualité du parcours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="simple-strategy" className="text-sm font-medium">Stratégie de conflit</label>
                  <Select
                    value={strategy}
                    onValueChange={(value) => setStrategy(value as 'highest-confidence' | 'highest-score' | 'intent-priority' | 'hybrid')}
                  >
                    <SelectTrigger
                      id="simple-strategy"
                      className="h-10 w-full rounded-xl border-slate-300 bg-white/90 pl-3 pr-3 text-sm font-medium text-slate-700 transition-colors hover:border-orange-400/40 focus-visible:ring-orange-400/20 data-[popup-open]:border-orange-400/60 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100"
                    >
                      <SelectValue placeholder="Stratégie de conflit" />
                    </SelectTrigger>
                    <SelectContent
                      alignItemWithTrigger={false}
                      side="bottom"
                      sideOffset={8}
                      className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_12px_25px_rgba(2,6,23,0.16)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_12px_35px_rgba(2,6,23,0.55)]"
                    >
                      <SelectItem value="hybrid">hybrid</SelectItem>
                      <SelectItem value="highest-score">highest-score</SelectItem>
                      <SelectItem value="highest-confidence">highest-confidence</SelectItem>
                      <SelectItem value="intent-priority">intent-priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="simple-stage" className="text-sm font-medium">Stage session</label>
                  <Select
                    value={stage}
                    onValueChange={(value) => setStage(value as 'discovery' | 'activation' | 'adoption' | 'retention')}
                  >
                    <SelectTrigger
                      id="simple-stage"
                      className="h-10 w-full rounded-xl border-slate-300 bg-white/90 pl-3 pr-3 text-sm font-medium text-slate-700 transition-colors hover:border-orange-400/40 focus-visible:ring-orange-400/20 data-[popup-open]:border-orange-400/60 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100"
                    >
                      <SelectValue placeholder="Stage session" />
                    </SelectTrigger>
                    <SelectContent
                      alignItemWithTrigger={false}
                      side="bottom"
                      sideOffset={8}
                      className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_12px_25px_rgba(2,6,23,0.16)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_12px_35px_rgba(2,6,23,0.55)]"
                    >
                      <SelectItem value="discovery">discovery</SelectItem>
                      <SelectItem value="activation">activation</SelectItem>
                      <SelectItem value="adoption">adoption</SelectItem>
                      <SelectItem value="retention">retention</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="simple-progress" className="text-sm font-medium">Progression onboarding: {progress}%</label>
                <input
                  id="simple-progress"
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(event) => setProgress(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer accent-violet-600 dark:accent-violet-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={runAnalysis} data-tour-id="tour-simple-action-analyze" className="rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(255,107,0,0.35)] active:translate-y-0" disabled={isGenerating || isPublishing}>
                  {isGenerating ? 'Analyse en cours...' : 'Analyser cette page'}
                </Button>
                {isPublishing ? <Badge variant="outline">Publication en cours...</Badge> : null}
                {lastRunAt ? <Badge variant="outline">Dernier run: {lastRunAt}</Badge> : null}
              </div>

              {error ? <p className="text-sm font-medium text-destructive">Erreur SDK: {error}</p> : null}
              {publishError ? <p className="text-sm font-medium text-destructive">Erreur publication: {publishError}</p> : null}

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Drafts affiches</p>
                  <p className="mt-1 text-lg font-semibold">{drafts.length}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Candidats acceptés</p>
                  <p className="mt-1 text-lg font-semibold">{debugReport?.candidateMetrics.accepted ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Conflits</p>
                  <p className="mt-1 text-lg font-semibold">{debugReport?.conflicts.length ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Publies</p>
                  <p className="mt-1 text-lg font-semibold">{lastPublishReport?.created ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="guide" className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Repères métier</CardTitle>
              <CardDescription>Ce bloc montre comment le SDK privilégie l’action principale sans perdre le contexte secondaire.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. Le titre de page établit le contexte du parcours.</p>
              <p>2. Le CTA principal porte l’intention métier dominante.</p>
              <p>3. Les actions utilitaires restent au second plan.</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Navigation de test</CardTitle>
              <CardDescription>Raccourcis de navigation pour valider les sélecteurs, les intentions et les transitions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(255,107,0,0.35)] active:translate-y-0" asChild>
                <Link href="/dashboard/sdk-tests/medium">
                  Ouvrir l’interface moyenne
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full rounded-xl" asChild>
                <Link href="/dashboard/sdk-tests/dynamic">
                  Ouvrir le scénario dynamique
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Résultats de génération</CardTitle>
              <CardDescription>Parcours proposés avec scores et signaux pour comprendre la sélection du moteur.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {drafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun parcours pour le moment. Lance une analyse pour générer les résultats.</p>
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
              <CardDescription>Résumé technique du dernier run pour suivre les métriques de génération.</CardDescription>
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
              <p className="text-xs text-muted-foreground">Flow registry entries: {flowRegistry.length}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Rapport publication</CardTitle>
              <CardDescription>Détail de la dernière publication: créés, rejetés, ignorés et raisons associées.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {lastPublishReport ? (
                <pre className="max-h-72 overflow-auto rounded-2xl bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                  {JSON.stringify(lastPublishReport, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun rapport de publication disponible. Lance une analyse pour afficher le résultat.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SdkLabShell>
  );
}