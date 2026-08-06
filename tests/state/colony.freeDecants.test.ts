// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';
import { STARTER_FREE_DECANTS } from '../../src/state/bootstrap';

describe('decant — free-Decant path', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });

  it('first 3 Decants consume freeDecantsRemaining and do not tick harvestsToday', () => {
    expect(useColonyStore.getState().freeDecantsRemaining).toBe(STARTER_FREE_DECANTS);
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    const s = useColonyStore.getState();
    expect(s.freeDecantsRemaining).toBe(0);
    expect(s.units).toHaveLength(3);
    expect(s.harvestsToday).toBe(0);
  });

  it('4th Decant enters the paid path and ticks harvestsToday', () => {
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    const s = useColonyStore.getState();
    expect(s.freeDecantsRemaining).toBe(0);
    expect(s.harvestsToday).toBe(1);
    expect(s.units).toHaveLength(4);
  });

  it('free Decants still respect the Colony cap', () => {
    // Fill to cap (20 for no Barracks). Skip the free path to test cap check.
    useColonyStore.setState({ freeDecantsRemaining: 30 });
    let ok = true;
    try {
      for (let i = 0; i < 30; i++) useColonyStore.getState().decant();
    } catch {
      ok = false;
    }
    expect(ok).toBe(false);
    expect(useColonyStore.getState().units.length).toBeLessThanOrEqual(20);
  });
});
