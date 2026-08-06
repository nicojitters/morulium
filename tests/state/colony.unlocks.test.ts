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
});
