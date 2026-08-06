// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';

describe('unlockSurface', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });

  it('resetGame starts with Vat and Sequencer locked', () => {
    const s = useColonyStore.getState();
    expect(s.unlocks.vat.status).toBe('locked');
    expect(s.unlocks.sequencer.status).toBe('locked');
  });

  it('unlockSurface flips status and sets recentUnlock', () => {
    useColonyStore.getState().unlockSurface('vat');
    const s = useColonyStore.getState();
    expect(s.unlocks.vat.status).toBe('unlocked');
    expect(s.recentUnlock?.id).toBe('vat');
    expect(s.recentUnlock?.reason).toBeTruthy();
  });

  it('unlockSurface on an already-unlocked surface is a no-op', () => {
    useColonyStore.getState().unlockSurface('colony');
    expect(useColonyStore.getState().recentUnlock).toBeNull();
  });

  it('clearRecentUnlock nulls the transient field', () => {
    useColonyStore.getState().unlockSurface('vat');
    useColonyStore.getState().clearRecentUnlock();
    expect(useColonyStore.getState().recentUnlock).toBeNull();
  });

  it('completing collect-first-reward unlocks the Vat', async () => {
    useColonyStore.setState({
      activeDirectiveId: 'collect-first-reward',
      completedDirectiveIds: ['decant-first','inspect-first','decant-second','launch-first-incursion'],
    });
    useColonyStore.getState().emitDirectiveAction({
      kind: 'incursion-resolved', outcome: 'won', rewardCollected: true,
    });
    // queueMicrotask flush
    await Promise.resolve();
    expect(useColonyStore.getState().unlocks.vat.status).toBe('unlocked');
    expect(useColonyStore.getState().recentUnlock?.id).toBe('vat');
  });
});
