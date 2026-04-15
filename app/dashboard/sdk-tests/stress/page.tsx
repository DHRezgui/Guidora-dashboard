'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CircleDashed,
  LayoutGrid,
  RefreshCcw,
  ShieldCheck,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useContextualTourSuggestions } from '@trustdev/onboarding-sdk-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { SdkLabShell } from '../_components';

type ChaosJob = {
  id: string;
  label: string;
  urgency: 'low' | 'medium' | 'high';
  owner: 'ops' | 'risk' | 'growth' | 'support';
  score: number;
};

type FeedEvent = {
  id: string;
  text: string;
  transient?: boolean;
};

const owners: ChaosJob['owner'][] = ['ops', 'risk', 'growth', 'support'];
const urgencies: ChaosJob['urgency'][] = ['low', 'medium', 'high'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(values: T[]): T {
  return values[randomInt(0, values.length - 1)];
}

function createJob(index: number): ChaosJob {
  return {
    id: `job-${Date.now()}-${index}-${randomInt(100, 999)}`,
    label: `Flux ${String.fromCharCode(65 + (index % 26))} - lot ${randomInt(10, 99)}`,
    urgency: pickOne(urgencies),
    owner: pickOne(owners),
    score: randomInt(35, 97),
  };
}

function createFeedEvent(): FeedEvent {
  const events = [
    'Recalcul des priorités terminé',
    'Signal d’anomalie faible détecté',
    'Synchronisation inter-service relancée',
    'Règle de conformité partiellement appliquée',
    'Nettoyage de cache métier en cours',
    'Alerte informative non bloquante',
  ];
  return {
    id: `evt-${Date.now()}-${randomInt(100, 999)}`,
    text: pickOne(events),
    transient: Math.random() > 0.6,
  };
}

export default function StressTestPage() {
  const [strategy, setStrategy] = useState<'highest-confidence' | 'highest-score' | 'intent-priority' | 'hybrid'>('hybrid');
  const [stage, setStage] = useState<'discovery' | 'activation' | 'adoption' | 'retention'>('activation');
  const [progress, setProgress] = useState(52);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const [jobs, setJobs] = useState<ChaosJob[]>(() => Array.from({ length: 6 }).map((_, i) => createJob(i)));
  const [feed, setFeed] = useState<FeedEvent[]>(() => [createFeedEvent(), createFeedEvent(), createFeedEvent()]);
  const [isBursting, setIsBursting] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((current) => current + 1);
      setJobs((current) => {
        const next = current.slice();
        const idx = randomInt(0, Math.max(0, next.length - 1));
        if (next[idx]) {
          next[idx] = {
            ...next[idx],
            score: Math.max(10, Math.min(99, next[idx].score + randomInt(-15, 14))),
            urgency: pickOne(urgencies),
          };
        }
        if (Math.random() > 0.7) {
          next.push(createJob(next.length + 1));
        }
        return next.slice(-8);
      });

      setFeed((current) => [createFeedEvent(), ...current].slice(0, 6));
    }, 1400);

    return () => clearInterval(interval);
  }, []);

  const severeScore = useMemo(() => {
    if (jobs.length === 0) return 0;
    const avg = jobs.reduce((sum, item) => sum + item.score, 0) / jobs.length;
    return Math.round(avg);
  }, [jobs]);

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
      persona: 'operator',
      useSemanticRanking: true,
      enableSequenceDetection: false,
      includeFormDraft: false,
      includeNavigationDraft: true,
      includeSupportDraft: true,
      noiseFilteringEnabled: true,
      ignoreTransientUi: true,
      noiseSelectors: [
        '.stress-transient',
        '[role="status"]',
        '[role="alert"]',
        '[data-testid*="noise"]',
        '[data-tour-id="tour-stress-action-analyze"]',
        '[data-tour-id="tour-stress-action-burst"]',
        '[data-tour-id="tour-stress-action-randomize"]',
        '[data-tour-id="tour-stress-secondary-guide"]',
        '[data-tour-id^="tour-sdk-lab-nav-"]',
        '[data-tour-id="tour-sdk-lab-action-back-dashboard"]',
        'nav a[href^="/dashboard"]',
        'aside a[href^="/dashboard"]',
      ],
      mutationBatchWindowMs: 90,
      maxDirtyNodesPerBatch: 420,
      conflictResolutionEnabled: true,
      conflictResolutionStrategy: strategy,
      explainabilityEnabled: true,
      analysisSeverity: 'strict' as const,
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
      minConfidence: 45,
      minScore: 25,
      semanticHints: ['valider la simulation métier principale', 'confirmer la décision', 'action principale', 'priorité métier', 'analyse opérationnelle'],
      businessObjectives: ['identifier la meilleure action métier', 'résister aux faux signaux', 'maintenir un parcours publiable'],
      customKeywords: {
        'primary-action': ['Valider la simulation métier principale', 'Valider la simulation', 'Confirmer la décision', 'Appliquer', 'Lancer', 'Confirmer'],
        'support-navigation': ['Matrice', 'Historique', 'Journal', 'Bloc secondaire'],
        'form-flow': ['Paramètres', 'Réglage', 'Configuration', 'Formulaire'],
      },
      sessionContext: {
        sessionId: `sdk-tests-stress-${tick % 3}`,
        isNewUser: progress < 40,
        onboardingProgress: progress / 100,
        currentStage: stage,
        seenSelectors: ['[data-tour-id="tour-stress-open-panel"]'],
        completedSelectors: [],
        preferredIntents: ['primary-action' as const, 'form-flow' as const],
      },
      flowVersioningEnabled: true,
      flowVersion: 'stress-lab-v1',
      baselineFlowVersion: 'stress-lab-v0',
      flowCompatibilityMode: 'lenient' as const,
    }),
    [progress, severeScore, stage, strategy, tick],
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
    const next = refresh();
    setLastRunAt(new Date().toLocaleTimeString());
    console.info('[SDK Tests][Stress] Drafts generated:', next);
    console.info('[SDK Tests][Stress] Debug report:', getDebugReport());
  };

  const triggerBurst = () => {
    setIsBursting(true);
    toast.message('Burst DOM lancé');

    const start = Date.now();
    const burst = setInterval(() => {
      setFeed((current) => [createFeedEvent(), ...current].slice(0, 8));
      setJobs((current) => {
        const next = current.map((job) => ({
          ...job,
          score: Math.max(10, Math.min(99, job.score + randomInt(-8, 10))),
        }));
        if (Math.random() > 0.55) {
          next.push(createJob(next.length + 1));
        }
        return next.slice(-10);
      });

      if (Date.now() - start > 3500) {
        clearInterval(burst);
        setIsBursting(false);
      }
    }, 180);
  };

  return (
    <SdkLabShell
      title="Stress test arbitraire"
      description="Scénario non calibré avec bruit, faux signaux, mutations rapides et blocs contradictoires pour tester la robustesse réelle du SDK."
      badges={["stress", "anti-biais", "chaos DOM", "validation finale"]}
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Orchestrateur de stress</CardTitle>
              <CardDescription>Contrôles et actions pour générer des conditions imprévisibles au moment de l’analyse.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <label htmlFor="stress-strategy" className="text-sm font-medium">Stratégie de conflit</label>
                  <select
                    id="stress-strategy"
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
                  <label htmlFor="stress-stage" className="text-sm font-medium">Étape session</label>
                  <select
                    id="stress-stage"
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
                  <label htmlFor="stress-progress" className="text-sm font-medium">Progression: {progress}%</label>
                  <input
                    id="stress-progress"
                    type="range"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(event) => setProgress(Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={runAnalysis} data-tour-id="tour-stress-action-analyze" className="rounded-xl" disabled={isGenerating || isPublishing}>
                  {isGenerating ? 'Analyse en cours...' : 'Analyser ce chaos'}
                </Button>
                <Button
                  variant="outline"
                  onClick={triggerBurst}
                  data-tour-id="tour-stress-action-burst"
                  data-testid="noise-burst-action"
                  className="rounded-xl"
                  disabled={isBursting}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {isBursting ? 'Burst en cours...' : 'Lancer burst DOM'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setJobs(Array.from({ length: 6 }).map((_, i) => createJob(i)));
                    setFeed([createFeedEvent(), createFeedEvent(), createFeedEvent()]);
                    toast.success('Etat arbitraire régénéré');
                  }}
                  data-tour-id="tour-stress-action-randomize"
                  data-testid="noise-randomize-action"
                  className="rounded-xl"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Rejouer un état arbitraire
                </Button>
                {lastRunAt ? <Badge variant="outline">Dernier run: {lastRunAt}</Badge> : null}
              </div>

              {error ? <p className="text-sm font-medium text-destructive">Erreur SDK: {error}</p> : null}
              {publishError ? <p className="text-sm font-medium text-destructive">Erreur publication: {publishError}</p> : null}

              <div className="grid gap-3 sm:grid-cols-5">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Drafts</p>
                  <p className="mt-1 text-lg font-semibold">{drafts.length}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Acceptés</p>
                  <p className="mt-1 text-lg font-semibold">{debugReport?.candidateMetrics.accepted ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Rejet bruit</p>
                  <p className="mt-1 text-lg font-semibold">{debugReport?.candidateMetrics.rejectedNoise ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Score chaos</p>
                  <p className="mt-1 text-lg font-semibold">{severeScore}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Publiés</p>
                  <p className="mt-1 text-lg font-semibold">{lastPublishReport?.created ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Bloc métier principal</CardTitle>
              <CardDescription>Le SDK doit idéalement préférer cette zone malgré les distractions autour.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <p className="text-sm font-semibold">Matrice de priorisation opérationnelle</p>
                <p className="mt-1 text-sm text-muted-foreground">Le but métier est de valider une simulation avant envoi.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button data-tour-id="tour-stress-action-validate" data-testid="stress-primary-validate" data-tour-label="Valider la simulation métier principale" className="rounded-xl">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Valider la simulation
                </Button>
                <Button data-tour-id="tour-stress-action-confirm" data-testid="stress-secondary-confirm" data-tour-label="Confirmer la décision opérationnelle" variant="secondary" className="rounded-xl">
                  Confirmer la décision
                </Button>
                <Button data-tour-id="tour-stress-open-panel" data-testid="stress-secondary-panel" data-tour-label="Ouvrir le panneau opérationnel" variant="outline" className="rounded-xl">
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Ouvrir panneau d'analyse
                </Button>
                <Button data-tour-id="tour-stress-secondary-guide" data-testid="stress-secondary-help" data-tour-label="Contenu d'aide secondaire" variant="ghost" className="rounded-xl">
                  <WandSparkles className="mr-2 h-4 w-4" />
                  Découvrir la doc rapide
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Flux mouvant</CardTitle>
              <CardDescription>Liste volontairement instable pour pousser le moteur en condition de bruit fort.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-border/60 bg-muted/20 p-4" data-testid="stress-job-card">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{job.label}</p>
                    <Badge variant={job.urgency === 'high' ? 'destructive' : job.urgency === 'medium' ? 'secondary' : 'outline'}>
                      {job.urgency}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Owner: {job.owner}</p>
                  <p className="text-sm text-muted-foreground">Score: {job.score}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Bruit transitoire</CardTitle>
              <CardDescription>Ces éléments ne doivent pas dominer la sélection du parcours final.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {feed.map((evt) => (
                <div
                  key={evt.id}
                  className={`stress-transient flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3 text-sm ${evt.transient ? 'bg-amber-500/10' : 'bg-muted/20'}`}
                  role={evt.transient ? 'status' : undefined}
                  aria-live={evt.transient ? 'polite' : undefined}
                >
                  <span>{evt.text}</span>
                  <span className="text-xs text-muted-foreground">event</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Résultats explainability</CardTitle>
              <CardDescription>Lecture rapide des drafts détectés dans ce scénario arbitraire.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {drafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun parcours pour le moment. Lance une analyse.</p>
              ) : (
                drafts.slice(0, 3).map((draft) => (
                  <div key={`${draft.name}-${draft.intent}`} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-sm font-semibold">{draft.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      intent: {draft.intent} | confidence: {draft.confidence} | score: {Math.round(draft.score)}
                    </p>
                    {draft.explainability ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        signals: semantic={Math.round(draft.explainability.signalScores.semantic)}, sequence={Math.round(draft.explainability.signalScores.sequence)}, confidence={Math.round(draft.explainability.signalScores.confidence)}
                      </p>
                    ) : null}
                    {draft.detectedSelectors[0] ? <p className="mt-2 text-xs text-primary">selector: {draft.detectedSelectors[0]}</p> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Rapport debug</CardTitle>
              <CardDescription>Résumé technique pour analyser les décisions du moteur en mode sévère.</CardDescription>
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
              <CardDescription>Résultat de publication backend pour ce scénario arbitraire.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {lastPublishReport ? (
                <pre className="max-h-72 overflow-auto rounded-2xl bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                  {JSON.stringify(lastPublishReport, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun rapport de publication disponible. Lance une analyse.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle>Indicateurs de bruit</CardTitle>
              <CardDescription>Repères visuels pour confirmer que le SDK ne sur-réagit pas aux artefacts transitoires.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CircleDashed className="h-4 w-4" />
                <span>Le flux est volontairement instable et partiellement aléatoire.</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span>Les événements live doivent être majoritairement filtrés comme bruit.</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Le moteur doit conserver une action principale claire malgré les faux signaux.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SdkLabShell>
  );
}
