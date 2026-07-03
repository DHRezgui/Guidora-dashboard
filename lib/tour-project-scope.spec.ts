import { describe, expect, it } from 'vitest';
import { applyTourProjectScope, ensureTourSaveProjectScope, readTourFlowVersion } from './tour-project-scope';

describe('ensureTourSaveProjectScope', () => {
  it('attaches flowVersion when creating from a project hub scope', () => {
    const scoped = ensureTourSaveProjectScope(
      { name: 'Nouveau parcours', triggerConditions: undefined },
      'test-10-v1',
    );

    expect(readTourFlowVersion(scoped.triggerConditions)).toBe('test-10-v1');
  });

  it('does not strip an existing scope on save', () => {
    const existing = applyTourProjectScope({}, 'test-10-v1');
    const scoped = ensureTourSaveProjectScope({ triggerConditions: existing }, 'test-10-v1');

    expect(readTourFlowVersion(scoped.triggerConditions)).toBe('test-10-v1');
  });

  it('leaves generic tours unchanged', () => {
    const scoped = ensureTourSaveProjectScope({ triggerConditions: { foo: 'bar' } }, 'default');
    expect(scoped.triggerConditions).toEqual({ foo: 'bar' });
  });
});
