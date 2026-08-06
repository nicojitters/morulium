// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';

describe('emitDirectiveAction', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });

  it('completes decant-first on a decant action and advances to inspect-first', () => {
    expect(useColonyStore.getState().activeDirectiveId).toBe('decant-first');
    useColonyStore.getState().emitDirectiveAction({ kind: 'decant' });
    const s = useColonyStore.getState();
    expect(s.completedDirectiveIds).toContain('decant-first');
    expect(s.activeDirectiveId).toBe('inspect-first');
    expect(s.recentReward?.directiveId).toBe('decant-first');
    expect(s.recentReward?.serum).toBe(10);
    expect(s.serum).toBe(200 + 10);
  });

  it('does nothing when the action does not match the active directive', () => {
    useColonyStore.getState().emitDirectiveAction({ kind: 'breed' });
    expect(useColonyStore.getState().activeDirectiveId).toBe('decant-first');
    expect(useColonyStore.getState().recentReward).toBeNull();
  });

  it('after the chain ends, activates a STANDING directive', () => {
    // Fast-forward the chain by seeding completed state.
    useColonyStore.setState({
      activeDirectiveId: 'try-a-breed',
      completedDirectiveIds: [
        'decant-first','inspect-first','decant-second',
        'launch-first-incursion','collect-first-reward','station-on-occupation',
      ],
    });
    useColonyStore.getState().emitDirectiveAction({ kind: 'breed' });
    const nextId = useColonyStore.getState().activeDirectiveId;
    expect(['take-a-front','reach-strain','grow-colony-to-five']).toContain(nextId);
  });

  it('clearRecentReward nulls the transient reward field', () => {
    useColonyStore.getState().emitDirectiveAction({ kind: 'decant' });
    useColonyStore.getState().clearRecentReward();
    expect(useColonyStore.getState().recentReward).toBeNull();
  });
});
