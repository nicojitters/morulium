// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';

describe('directives — integration with real store actions', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });

  it('calling decant() advances the chain from decant-first', () => {
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().activeDirectiveId).toBe('inspect-first');
  });

  it('a second decant() advances from decant-second (after DNA Lab view)', () => {
    useColonyStore.getState().decant();
    useColonyStore.getState().emitDirectiveAction({ kind: 'view-dna-lab-detail', unitId: 1 });
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().activeDirectiveId).toBe('launch-first-incursion');
  });
});
