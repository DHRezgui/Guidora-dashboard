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

  return {
    name: buildUniqueConcatName(tours, options.existingNames),
    description: `Parcours concaténé (${tours.length} source${tours.length > 1 ? 's' : ''})`,
    targetUrl: tours[0]?.targetUrl || options.fallbackTargetUrl || '/',
    isActive: true,
    priority: Math.max(...tours.map((tour) => Number(tour.priority || 0)), 0),
    replayPolicy: 'never',
    replayAfterDays: 0,
    triggerConditions: {},
    steps: reindexedSteps,
  };
}
