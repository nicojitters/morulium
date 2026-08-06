// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';
import { STORAGE_KEY } from '../../src/state/persist';
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';
import { LOCKED_STARTING } from '../../src/state/unlocks';

describe('resetGame', () => {
  beforeEach(() => { localStorage.clear(); });

  it('clears units, restores starting Serum, and empties localStorage snapshot', () => {
    useColonyStore.getState().decant();
    useColonyStore.setState({ serum: 999 });
    expect(useColonyStore.getState().units).toHaveLength(1);

    useColonyStore.getState().resetGame();

    const s = useColonyStore.getState();
    expect(s.units).toEqual([]);
    expect(s.nextId).toBe(1);
    expect(s.serum).toBe(SERUM_STARTING_BALANCE);
    expect(s.unlocks).toEqual(LOCKED_STARTING);
    // localStorage was refreshed to a new starting shape (not stale from before reset)
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed.state.units).toEqual([]);
  });

  it('clears pendingAwaySummary via clearAwaySummary', () => {
    useColonyStore.setState({
      pendingAwaySummary: { elapsedMs: 1, serumEarned: 5, restGainedTotal: 0, injuriesHealed: 0 },
    });
    useColonyStore.getState().clearAwaySummary();
    expect(useColonyStore.getState().pendingAwaySummary).toBeNull();
  });
});
