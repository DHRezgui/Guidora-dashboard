'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Plus, Settings2 } from 'lucide-react';
import { useContextualTourSuggestions } from '@sdk/hooks/useContextualTourSuggestions';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { SdkLabShell } from '../_components';

const highlights = [
  {
    title: 'Créer un projet',
    description: 'CTA principal de la page pour vérifier le repérage de l’action la plus importante.',
    selector: '#simple-primary-cta',
  },
  {
    title: 'Découvrir le guide',
    description: 'Lien secondaire pour tester la priorité et la hiérarchisation entre plusieurs boutons.',
    selector: '#simple-secondary-link',
  },
  {
    title: 'Réglages rapides',
    description: 'Petit bouton utilitaire pour valider les sélecteurs stables et le contexte navigation.',
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
      minConfidence: 60,
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

  const { drafts, isGenerating, error, refresh, getDebugReport, getFlowRegistry } = useContextualTourSuggestions(sdkOptions);
  const [lastValidDrafts, setLastValidDrafts] = useState<typeof drafts>([]);
  const [usedLastValidFallback, setUsedLastValidFallback] = useState(false);

  const debugReport = getDebugReport();
  const flowRegistry = getFlowRegistry();
  const displayedDrafts = drafts.length > 0 ? drafts : lastValidDrafts;
  const showingFallbackDrafts = drafts.length === 0 && lastValidDrafts.length > 0;

  const runAnalysis = () => {
    setUsedLastValidFallback(false);

    let nextDrafts = refresh();
    let report = getDebugReport();

    const shouldRetryBecauseConfidenceFiltered =
      nextDrafts.length === 0 &&
      (report?.candidateMetrics.accepted ?? 0) > 0 &&
      (report?.draftMetrics.afterConfidenceFilter ?? 0) === 0;

    if (shouldRetryBecauseConfidenceFiltered) {
      nextDrafts = refresh();
      report = getDebugReport();
      console.info('[SDK Tests][Simple] Empty draft after confidence filter, single auto-retry triggered.');
    }

    if (nextDrafts.length > 0) {
      setLastValidDrafts(nextDrafts);
    } else if (lastValidDrafts.length > 0) {
      setUsedLastValidFallback(true);
    }

    setLastRunAt(new Date().toLocaleTimeString());

    console.info('[SDK Tests][Simple] Drafts generated:', nextDrafts);
    console.info('[SDK Tests][Simple] Debug report:', report);
    console.info('[SDK Tests][Simple] Flow registry:', getFlowRegistry());
  };

  return (
    <SdkLabShell
      title="Interface simple"
      description="Scénario minimal avec quelques CTA et cartes. Idéal pour tester le repérage des actions principales et mesurer le bruit de détection sur une page peu chargée."
      badges={["simple", "CTA", "sélecteurs stables"]}
    >
      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="border-border/60 shadow-card">
          <CardHeader>
            <Badge variant="outline" className="w-fit">Vue d’ensemble</Badge>
            <CardTitle className="text-2xl">Lancer un onboarding simple en moins d’une minute</CardTitle>
            <CardDescription>
              Cette interface contient un titre clair, une action principale et quelques éléments secondaires pour
              vérifier que le SDK ne s’éparpille pas.
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
              <CardTitle>Analyse SDK (debug + explainability)</CardTitle>
              <CardDescription>
                Cette zone active les options de debug du SDK et lance une analyse du DOM de cette page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="simple-strategy" className="text-sm font-medium">Stratégie de conflit</label>
                  <select
                    id="simple-strategy"
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
                  <label htmlFor="simple-stage" className="text-sm font-medium">Stage session</label>
                  <select
                    id="simple-stage"
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
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={runAnalysis} data-tour-id="tour-simple-action-analyze" className="rounded-xl" disabled={isGenerating}>
                  {isGenerating ? 'Analyse en cours...' : 'Analyser cette page'}
                </Button>
                {lastRunAt ? <Badge variant="outline">Dernier run: {lastRunAt}</Badge> : null}
              </div>

              {error ? <p className="text-sm font-medium text-destructive">Erreur SDK: {error}</p> : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Drafts affiches</p>
                  <p className="mt-1 text-lg font-semibold">{displayedDrafts.length}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Candidats acceptés</p>
                  <p className="mt-1 text-lg font-semibold">{debugReport?.candidateMetrics.accepted ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Conflits</p>
                  <p className="mt-1 text-lg font-semibold">{debugReport?.conflicts.length ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="guide" className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Mini guide</CardTitle>
              <CardDescription>Regarde comment le SDK choisit l’action principale et ignore les éléments secondaires.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. Le titre de page est visible.</p>
              <p>2. Le bouton principal est unique et bien identifié.</p>
              <p>3. Les éléments utilitaires restent secondaires.</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
              <CardDescription>Petit set de boutons pour vérifier les sélecteurs et les intentions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full rounded-xl" asChild>
                <Link href="/dashboard/sdk-tests/medium">
                  Aller vers l’interface moyenne
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full rounded-xl" asChild>
                <Link href="/dashboard/sdk-tests/dynamic">
                  Tester le mode dynamique
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Résultats explainability</CardTitle>
              <CardDescription>Top drafts avec scores et signaux pour comprendre pourquoi ils sont proposés.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {showingFallbackDrafts ? (
                <Badge variant="outline" className="w-fit">Affichage du dernier draft valide (fallback anti-vide)</Badge>
              ) : null}
              {displayedDrafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun draft pour le moment. Clique sur Analyser cette page.</p>
              ) : (
                displayedDrafts.slice(0, 3).map((draft) => (
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
              {usedLastValidFallback ? (
                <p className="text-xs text-muted-foreground">Le dernier run n'a pas passe le filtre de confiance. Fallback utilisateur applique.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Rapport debug</CardTitle>
              <CardDescription>Résumé brut du dernier run pour comparer rapidement les itérations.</CardDescription>
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
        </div>
      </div>
    </SdkLabShell>
  );
}