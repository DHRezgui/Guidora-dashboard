import { GuidedTour, Step } from './types';

function normalizeName(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function createLocalStepId(index: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `concat-step-${crypto.randomUUID()}`;
  }
  return `concat-step-${Date.now()}-${index + 1}`;
}

/** Normalize URL/path for comparison (runtime SDK uses pathname-only matching). */
function normalizeRouteKey(value?: string): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw, 'http://localhost');
    return parsed.pathname || '/';
  } catch {
    return raw.startsWith('/') ? raw : `/${raw}`;
  }
}

function readContextualEngine(
  triggerConditions?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const raw = triggerConditions?.contextualEngine;
  if (!raw || typeof raw !== 'object') return undefined;
  return { ...(raw as Record<string, unknown>) };
}

/**
 * Inherit trigger metadata from source tours so concatenated tours work with
 * TourViewer `activeFlowVersion` filtering (e.g. test-3-v1).
 */
export function mergeTriggerConditionsForConcat(tours: GuidedTour[]): Record<string, unknown> {
  const sourcesWithEngine = tours
    .map((tour) => ({
      tour,
      engine: readContextualEngine(tour.triggerConditions as Record<string, unknown> | undefined),
    }))
    .filter((entry) => entry.engine && Object.keys(entry.engine).length > 0);

  const primaryTour = sourcesWithEngine[0]?.tour ?? tours[0];
  const primaryConditions = {
    ...((primaryTour?.triggerConditions as Record<string, unknown>) || {}),
  };
  const primaryEngine = readContextualEngine(primaryConditions) || {};

  const contextualEngine: Record<string, unknown> = {
    ...primaryEngine,
    source: 'dashboard-concat',
    concatSourceCount: tours.length,
    concatSourceTourIds: tours.map((tour) => tour.id).filter(Boolean),
    concatSourceTourNames: tours.map((tour) => tour.name).filter(Boolean),
  };

  for (const { engine } of sourcesWithEngine) {
    if (!engine) continue;
    if (!contextualEngine.flowVersion && engine.flowVersion) {
      contextualEngine.flowVersion = engine.flowVersion;
    }
    if (!contextualEngine.blueprintId && engine.blueprintId) {
      contextualEngine.blueprintId = engine.blueprintId;
    }
    if (!contextualEngine.intent && engine.intent) {
      contextualEngine.intent = engine.intent;
    }
    if (!contextualEngine.flowSignature && engine.flowSignature) {
      contextualEngine.flowSignature = engine.flowSignature;
    }
  }

  return {
    ...primaryConditions,
    contextualEngine,
  };
}

/**
 * Drop redundant per-step routes when they match the tour target (single-page apps).
 * Prevents TourViewer routeMismatch hiding the UI after reordering concat steps.
 */
export function normalizeConcatStepsForRuntime(steps: Step[], tourTargetUrl: string): Step[] {
  const tourRoute = normalizeRouteKey(tourTargetUrl);
  if (!tourRoute) return steps;

  return steps.map((step) => {
    const stepRoute = normalizeRouteKey(step.stepTargetUrl);
    if (!stepRoute || stepRoute === tourRoute) {
      const { stepTargetUrl: _removed, ...rest } = step;
      return rest as Step;
    }
    return step;
  });
}

export function buildUniqueConcatName(tours: GuidedTour[], existingNames: string[]): string {
  const rawBase = tours
    .map((tour) => tour.name?.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' + ');

  const base = rawBase ? `Concat - ${rawBase}` : 'Concat - Nouveau parcours';
  const existing = new Set(existingNames.map((name) => normalizeName(name)));
  if (!existing.has(normalizeName(base))) return base;

  let index = 2;
  while (existing.has(normalizeName(`${base} (${index})`))) {
    index += 1;
  }
  return `${base} (${index})`;
}

function sortSteps(steps: Step[]): Step[] {
  return [...steps].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
}

export function concatenateToursFifo(
  tours: GuidedTour[],
  options: {
    existingNames: string[];
    fallbackTargetUrl?: string;
    dedupeSteps?: boolean;
  },
): GuidedTour {
  const concatenatedSteps: Step[] = tours.flatMap((tour, tourIndex) =>
    sortSteps(tour.steps || []).map((step, stepIndex) => ({
      ...step,
      // Local-only traceability metadata for debugging/edit review.
      concatSourceMeta: {
        sourceTourId: tour.id,
        sourceTourName: tour.name,
        sourceTourIndex: tourIndex,
        sourceStepIndex: stepIndex,
      },
    })),
  );

  const shouldDedupe = options.dedupeSteps !== false;
  const dedupedSteps = shouldDedupe
    ? concatenatedSteps.filter((step, index, arr) => {
        const key = `${(step.stepTargetUrl || '').trim()}::${(step.targetSelector || '').trim()}`;
        return (
          arr.findIndex((candidate) => {
            const candidateKey = `${(candidate.stepTargetUrl || '').trim()}::${(candidate.targetSelector || '').trim()}`;
            return candidateKey === key;
          }) === index
        );
      })
    : concatenatedSteps;

  const reindexedSteps = dedupedSteps.map((step, index) => ({
    ...step,
    id: createLocalStepId(index),
    orderIndex: index + 1,
  }));

  const targetUrl = tours[0]?.targetUrl || options.fallbackTargetUrl || '/';
  const steps = normalizeConcatStepsForRuntime(reindexedSteps, targetUrl);

  return {
    name: buildUniqueConcatName(tours, options.existingNames),
    description: `Parcours concaténé (${tours.length} source${tours.length > 1 ? 's' : ''})`,
    targetUrl,
    isActive: true,
    priority: Math.max(...tours.map((tour) => Number(tour.priority || 0)), 0),
    replayPolicy: 'never',
    replayAfterDays: 0,
    triggerConditions: mergeTriggerConditionsForConcat(tours),
    steps,
  };
}
