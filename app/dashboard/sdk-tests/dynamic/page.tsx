'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, LoaderCircle, MessageSquare, RefreshCcw, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { useContextualTourSuggestions } from '@sdk/hooks/useContextualTourSuggestions';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { SdkLabShell } from '../_components';

const stages = [
  'Préparation du contexte',
  'Analyse du DOM visible',
  'Génération du parcours',
  'Validation des conflits',
  'Publication du draft',
];

export default function DynamicTestPage() {
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const [strategy, setStrategy] = useState<'highest-confidence' | 'highest-score' | 'intent-priority' | 'hybrid'>('hybrid');
  const [stage, setStage] = useState<'discovery' | 'activation' | 'adoption' | 'retention'>('activation');
  const [progress, setProgress] = useState(50);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: number; label: string }>>([
    { id: 1, label: 'Nouveau draft généré' },
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((current) => (current + 1) % stages.length);
      setTick((value) => value + 1);
      setNotifications((current) => [
        { id: Date.now(), label: `Mutation DOM #${tick + 1}` },
        ...current.slice(0, 3),
      ]);
    }, 1300);

    return () => clearInterval(interval);
  }, [tick]);

  const metrics = useMemo(
    () => [
      { label: 'Visites actives', value: 18 + tick },
      { label: 'Alerts ignorées', value: 4 + Math.floor(tick / 2) },
      { label: 'Conflits résolus', value: 2 + Math.floor(tick / 3) },
    ],
    [tick]
  );

  const sdkOptions = useMemo(
    () => ({
      enabled: true,
      autoGenerate: false,
      persona: 'operator',
      useSemanticRanking: true,
      enableSequenceDetection: true,
      includeFormDraft: true,
      includeNavigationDraft: true,
      includeSupportDraft: true,
      noiseFilteringEnabled: true,
      ignoreTransientUi: true,
      noiseSelectors: [
        '.modal',
        '.toast',
        '[role="status"]',
        '[role="alert"]',
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
      semanticHints: ['chargement', 'notification', 'modal', 'validation', 'action principale'],
      businessObjectives: ['stabilite sous mutation DOM', 'filtrage du bruit', 'action utile'],
      customKeywords: {
        'primary-action': ['Valider', 'Relancer', 'Ouvrir', 'Generer'],
        'support-navigation': ['Timeline', 'Notifications', 'Traitement'],
      },
      sessionContext: {
        sessionId: 'sdk-tests-dynamic-session',
        isNewUser: progress < 40,
        onboardingProgress: progress / 100,
        currentStage: stage,
        seenSelectors: ['button:has(svg)', '.toast'],
        preferredIntents: ['primary-action' as const, 'support-navigation' as const],
      },
      flowVersioningEnabled: true,
      flowVersion: 'dynamic-lab-v1',
      baselineFlowVersion: 'dynamic-lab-v0',
      flowCompatibilityMode: 'lenient' as const,
    }),
    [progress, stage, strategy],
  );

  const { drafts, isGenerating, error, refresh, getDebugReport, getFlowRegistry } = useContextualTourSuggestions(sdkOptions);
  const debugReport = getDebugReport();
  const flowRegistry = getFlowRegistry();

  const runAnalysis = () => {
    const nextDrafts = refresh();
    const report = getDebugReport();
    setLastRunAt(new Date().toLocaleTimeString());

    console.info('[SDK Tests][Dynamic] Drafts generated:', nextDrafts);
    console.info('[SDK Tests][Dynamic] Debug report:', report);
    console.info('[SDK Tests][Dynamic] Flow registry:', getFlowRegistry());
  };

  return (
    <SdkLabShell
      title="Interface dynamique"
      description="Scénario riche avec loaders, modals, toasts et changements rapides du DOM pour vérifier le batching, l’anti-bruit et la robustesse globale du SDK."
      badges={["loaders", "modals", "toasts", "DOM rapide"]}
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Analyse SDK (debug + explainability)</CardTitle>
              <CardDescription>
                Analyse en mode dynamique pour valider batching, anti-bruit et stabilite des drafts sous mutations rapides.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <label htmlFor="dynamic-strategy" className="text-sm font-medium">Strategie de conflit</label>
                  <select
                    id="dynamic-strategy"
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
                  <label htmlFor="dynamic-stage" className="text-sm font-medium">Stage session</label>
                  <select
                    id="dynamic-stage"
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
                  <label htmlFor="dynamic-progress" className="text-sm font-medium">Progression: {progress}%</label>
                  <input
                    id="dynamic-progress"
                    type="range"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(event) => setProgress(Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={runAnalysis} data-tour-id="tour-dynamic-action-analyze" className="rounded-xl" disabled={isGenerating}>
                  {isGenerating ? 'Analyse en cours...' : 'Analyser cette page'}
                </Button>
                {lastRunAt ? <Badge variant="outline">Dernier run: {lastRunAt}</Badge> : null}
              </div>

              {error ? <p className="text-sm font-medium text-destructive">Erreur SDK: {error}</p> : null}

              <div className="grid gap-3 sm:grid-cols-5">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Drafts</p>
                  <p className="mt-1 text-lg font-semibold">{drafts.length}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Acceptes</p>
                  <p className="mt-1 text-lg font-semibold">{debugReport?.candidateMetrics.accepted ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Rejet bruit</p>
                  <p className="mt-1 text-lg font-semibold">{debugReport?.candidateMetrics.rejectedNoise ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cache hits</p>
                  <p className="mt-1 text-lg font-semibold">{debugReport?.candidateMetrics.cacheHits ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Flow entries</p>
                  <p className="mt-1 text-lg font-semibold">{flowRegistry.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Pipeline en temps réel</CardTitle>
                  <CardDescription>Le contenu change régulièrement pour simuler une interface riche et instable.</CardDescription>
                </div>
                <Badge variant="outline">Étape {stepIndex + 1} / {stages.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                  <div className="h-28 animate-pulse rounded-2xl bg-muted/60" />
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="h-20 animate-pulse rounded-2xl bg-muted/50" />
                    <div className="h-20 animate-pulse rounded-2xl bg-muted/50" />
                    <div className="h-20 animate-pulse rounded-2xl bg-muted/50" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/60 bg-linear-to-r from-primary/10 via-background to-emerald-500/10 p-4">
                    <p className="text-sm font-semibold text-primary">{stages[stepIndex]}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Cet écran alterne les blocs, les états de chargement et les notifications pour éprouver la couche de filtrage.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {metrics.map((metric) => (
                      <div key={metric.label} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                        <p className="mt-2 text-2xl font-bold">{metric.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => { setLoading(true); toast.message('Simulation de chargement lancée'); setTimeout(() => setLoading(false), 900); }} data-tour-id="tour-dynamic-action-refresh" className="rounded-xl">
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Relancer le chargement
                    </Button>
                    <Button variant="outline" onClick={() => { setModalOpen(true); toast.success('Modal ouverte'); }} data-tour-id="tour-dynamic-action-modal" className="rounded-xl">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Ouvrir la modal
                    </Button>
                    <Button variant="ghost" onClick={() => toast('Notification de test', { icon: <Bell className="h-4 w-4" /> })} data-tour-id="tour-dynamic-action-toast" className="rounded-xl">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Générer un toast
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Changements rapides du DOM</CardTitle>
              <CardDescription>Une petite liste qui se met à jour régulièrement pour vérifier le batching et la stabilité du moteur.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`${tick}-${index}`} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">Item #{index + 1}</p>
                    <Badge variant={index % 2 === 0 ? 'default' : 'secondary'}>tick {tick + index}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {index % 2 === 0 ? 'État chargé' : 'État en attente'} - la structure bouge sans cesse.
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Resultats explainability</CardTitle>
              <CardDescription>Top drafts dynamiques avec signaux pour verifier robustesse sous mutations DOM.</CardDescription>
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
              <CardTitle>Timeline de traitement</CardTitle>
              <CardDescription>Le SDK devrait ignorer les toasts, modals temporaires et loaders, tout en suivant le flux principal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stages.map((stage, index) => (
                <div key={stage} className={`rounded-2xl border p-4 ${index === stepIndex ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-background'}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">{index + 1}</span>
                    {stage}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Notifications récentes</CardTitle>
              <CardDescription>Le SDK doit pouvoir filtrer ces éléments comme bruit secondaire.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                  <span>{notification.label}</span>
                  <span className="text-xs text-muted-foreground">toast</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Rapport debug</CardTitle>
              <CardDescription>Resume brut du dernier run dynamique pour comparer les iterations.</CardDescription>
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label="Modal de test dynamique">
          <div className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-elevated">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fenêtre temporaire</p>
                <h3 className="mt-2 text-xl font-bold">Modal dynamique de validation</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Cette boîte de dialogue est volontairement instable pour tester la détection et le filtrage du SDK.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)} className="rounded-xl">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <p className="text-sm font-medium">Statut</p>
                <p className="mt-1 text-sm text-muted-foreground">Cette modal doit être considérée comme transitoire.</p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">
                  Fermer
                </Button>
                <Button onClick={() => { toast.success('Action de validation simulée'); setModalOpen(false); }} className="rounded-xl">
                  Valider
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SdkLabShell>
  );
}