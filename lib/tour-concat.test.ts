import { describe, expect, it } from 'vitest';
import {
  concatenateToursFifo,
  mergeTriggerConditionsForConcat,
  normalizeConcatStepsForRuntime,
} from './tour-concat';
import type { GuidedTour, Step } from './types';

function makeTour(partial: Partial<GuidedTour> & { name: string }): GuidedTour {
  return {
    targetUrl: 'http://localhost:3003/',
    isActive: true,
    priority: 5,
    steps: [],
    ...partial,
  };
}

describe('mergeTriggerConditionsForConcat', () => {
  it('inherits flowVersion from SDK-published source tours', () => {
    const tours = [
      makeTour({
        name: 'Banking',
        triggerConditions: {
          contextualEngine: {
            flowVersion: 'test-3-v1',
            blueprintId: 'fintech.banking-overview',
            intent: 'primary-action',
          },
        },
      }),
      makeTour({
        name: 'Expense',
        triggerConditions: {
          contextualEngine: {
            flowVersion: 'test-3-v1',
            blueprintId: 'fintech.expense-management',
          },
        },
      }),
    ];

    const merged = mergeTriggerConditionsForConcat(tours);
    const engine = merged.contextualEngine as Record<string, unknown>;

    expect(engine.flowVersion).toBe('test-3-v1');
    expect(engine.source).toBe('dashboard-concat');
    expect(engine.concatSourceCount).toBe(2);
    expect(engine.blueprintId).toBe('fintech.banking-overview');
  });
});

describe('normalizeConcatStepsForRuntime', () => {
  it('clears stepTargetUrl when it matches the tour target (single-page)', () => {
    const steps: Step[] = [
      {
        title: 'A',
        content: 'a',
        targetSelector: '#a',
        stepTargetUrl: 'http://localhost:3003/',
        orderIndex: 1,
      },
    ];

    const normalized = normalizeConcatStepsForRuntime(steps, 'http://localhost:3003/');
    expect(normalized[0].stepTargetUrl).toBeUndefined();
  });

  it('keeps stepTargetUrl when it differs from tour target (multi-page)', () => {
    const steps: Step[] = [
      {
        title: 'B',
        content: 'b',
        targetSelector: '#b',
        stepTargetUrl: '/expenses',
        orderIndex: 1,
      },
    ];

    const normalized = normalizeConcatStepsForRuntime(steps, 'http://localhost:3003/');
    expect(normalized[0].stepTargetUrl).toBe('/expenses');
  });
});

describe('concatenateToursFifo', () => {
  it('produces merged triggerConditions and normalized steps', () => {
    const tours = [
      makeTour({
        name: 'A',
        steps: [
          {
            title: 'S1',
            content: 's1',
            targetSelector: '[data-tour-id="a"]',
            stepTargetUrl: 'http://localhost:3003/',
            orderIndex: 1,
          },
        ],
        triggerConditions: {
          contextualEngine: { flowVersion: 'test-3-v1' },
        },
      }),
      makeTour({
        name: 'B',
        steps: [
          {
            title: 'S2',
            content: 's2',
            targetSelector: '[data-tour-id="b"]',
            stepTargetUrl: 'http://localhost:3003/',
            orderIndex: 1,
          },
        ],
        triggerConditions: {
          contextualEngine: { flowVersion: 'test-3-v1' },
        },
      }),
    ];

    const result = concatenateToursFifo(tours, {
      existingNames: [],
      fallbackTargetUrl: '/',
    });

    expect((result.triggerConditions as { contextualEngine: { flowVersion: string } }).contextualEngine
      .flowVersion).toBe('test-3-v1');
    expect(result.steps).toHaveLength(2);
    expect(result.steps?.[0].stepTargetUrl).toBeUndefined();
    expect(result.steps?.[1].stepTargetUrl).toBeUndefined();
  });
});
