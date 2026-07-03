import { DEFAULT_FAQ_PROJECT_KEY } from './faq-project';

export function isGenericProjectFlowVersion(flowVersion?: string | null): boolean {
  const trimmed = flowVersion?.trim();
  return !trimmed || trimmed === DEFAULT_FAQ_PROJECT_KEY;
}

/** Attach SDK project scope to a manual tour (empty = generic / unscoped). */
export function applyTourProjectScope(
  tour: { triggerConditions?: Record<string, unknown> },
  flowVersion?: string | null,
): Record<string, unknown> {
  if (isGenericProjectFlowVersion(flowVersion)) {
    const existing = { ...(tour.triggerConditions ?? {}) };
    const engine = { ...((existing.contextualEngine as Record<string, unknown>) ?? {}) };
    delete engine.flowVersion;
    if (Object.keys(engine).length === 0) {
      delete existing.contextualEngine;
    } else {
      existing.contextualEngine = engine;
    }
    return existing;
  }

  const scopedKey = flowVersion!.trim();
  const existing = { ...(tour.triggerConditions ?? {}) };
  const engine = { ...((existing.contextualEngine as Record<string, unknown>) ?? {}) };
  return {
    ...existing,
    contextualEngine: {
      ...engine,
      flowVersion: scopedKey,
    },
  };
}

export function readTourFlowVersion(
  triggerConditions?: Record<string, unknown>,
): string | undefined {
  const engine = triggerConditions?.contextualEngine;
  if (!engine || typeof engine !== 'object') return undefined;
  const flowVersion = (engine as { flowVersion?: unknown }).flowVersion;
  return typeof flowVersion === 'string' && flowVersion.trim() ? flowVersion.trim() : undefined;
}

export function collectTourProjectScopeKeys(
  tours: Array<{ triggerConditions?: Record<string, unknown> }>,
): string[] {
  const keys = new Set<string>();
  for (const tour of tours) {
    const flowVersion = readTourFlowVersion(tour.triggerConditions);
    keys.add(flowVersion ?? DEFAULT_FAQ_PROJECT_KEY);
  }
  return [...keys];
}

export function hasMixedTourProjectScopes(
  tours: Array<{ triggerConditions?: Record<string, unknown> }>,
): boolean {
  return collectTourProjectScopeKeys(tours).length > 1;
}

/** Garantit le scope projet sur le payload de sauvegarde (création depuis le hub / ?flowVersion=). */
export function ensureTourSaveProjectScope<T extends { triggerConditions?: Record<string, unknown> }>(
  tour: T,
  flowVersion?: string | null,
): T {
  if (isGenericProjectFlowVersion(flowVersion)) {
    return tour;
  }
  return {
    ...tour,
    triggerConditions: applyTourProjectScope(tour, flowVersion),
  };
}
