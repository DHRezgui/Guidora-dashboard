'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, MessageSquare, RefreshCcw, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
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
	SdkLabSemanticInsightsSection,
	SdkLabSdkConsole,
	SdkLabSessionControls,
} from '../lab-ui';
import { SdkLabAbandonmentMonitor } from '../SdkLabAbandonmentMonitor';
import { useSdkLabPage } from '../use-sdk-lab-page';
import { usePhase1RunHistory } from '../use-phase1-run-history';

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
  const [playDraft, setPlayDraft] = useState<SuggestedTourDraft | null>(null);
  const [, setNotifications] = useState<Array<{ id: number; label: string }>>([
    { id: 1, label: 'Parcours généré' },
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
    () =>
      labContextualDefaults({
      publishScenario: 'dynamic' as const,
      persona: 'operator',
      includeFormDraft: true,
      includeNavigationDraft: true,
      includeSupportDraft: true,
      noiseSelectors: ['.modal', '.toast', '[role="status"]', '[role="alert"]'],
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
    }),
    [progress, stage, strategy],
  );

  const lab = useSdkLabPage(sdkOptions, { labKey: 'dynamic', publishScenario: 'dynamic' });

  const phase1 = usePhase1RunHistory({
    page: 'dynamic',
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
      title="Interface dynamique"
      description="Scénario riche avec chargements, modales, toasts et mutations rapides du DOM pour valider la robustesse du moteur."
      badges={['loaders', 'modals', 'toasts', 'DOM rapide', 'hybrid']}
    >
      <SdkLabTwoZoneLayout
        subject={
          <SdkLabSubjectZone
            title="Interface dynamique instable"
            description="Pipeline, mutations DOM, modals et toasts : surface analysée par le moteur."
          >
            <div className="space-y-6">

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
          </SdkLabSubjectZone>
        }
        sdk={
          <SdkLabSdkConsole
            run={runBindings}
            monitor={<SdkLabAbandonmentMonitor />}
            sessionControls={
              <SdkLabSessionControls
                idPrefix="dynamic"
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
                analyzeDataTourId="tour-dynamic-action-analyze"
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
      <SdkLabDraftPlayerModal draft={playDraft} onClose={() => setPlayDraft(null)} />
    </SdkLabShell>
  );
}