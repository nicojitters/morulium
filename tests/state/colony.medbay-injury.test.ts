/**
 * Deterministic Medbay injury-duration tests.
 *
 * vi.mock is hoisted to module level by Vitest, so it would contaminate ALL
 * tests in a shared file. This dedicated file scopes the mock to only these
 * two tests and keeps colony.test.ts unaffected.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { rollGenome } from '../../src/sim/genome';
import { createRng } from '../../src/sim/rng';
import { INJURY_DURATION_MS } from '../../src/state/rest';
import { INJURY_DURATION_MEDBAY_MS } from '../../src/state/vivarium';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';
import type { Unit } from '../../src/state/types';

// Force rollInjuries to always injure every at-risk unit.
// This makes every test in this file deterministic — no flake risk.
vi.mock('../../src/sim/injury', () => ({
  rollInjuries: (
    restPenalties: Record<number, number>,
    _seed: number,
  ): Record<number, boolean> => {
    const out: Record<number, boolean> = {};
    for (const id of Object.keys(restPenalties)) {
      out[Number(id)] = true;
    }
    return out;
  },
}));

describe('launchIncursion injury duration — deterministic (vi.mock rollInjuries)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    useColonyStore.setState({
      units: [],
      nextId: 1,
      lastDecantedId: null,
      harvestsToday: 0,
      harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0,
      breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS,
      activeIncursion: null,
      serum: SERUM_STARTING_BALANCE,
      stims: 0,
      lastGarrisonTickAt: Date.now(),
      buildings: { barracks: false, medbay: false },
      lastRestTickAt: Date.now(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Build 4 under-rested units (restCurrent = 1) with the given state overrides. */
  function seedUnderRestedUnits(): Unit[] {
    const units: Unit[] = [];
    for (let i = 1; i <= 4; i++) {
      units.push({
        id: i,
        seed: i,
        decantedAt: i,
        genome: rollGenome(createRng(i)),
        generation: 0,
        parentIds: null,
        wear: {},
        restCurrent: 1, // guaranteed under-rested (threshold = 40)
        injuredUntil: null,
        culled: false,
      });
    }
    return units;
  }

  it('sets injuredUntil = now + INJURY_DURATION_MEDBAY_MS when Medbay built', () => {
    const now = new Date(2026, 7, 4, 12, 0, 0).getTime();
    vi.setSystemTime(new Date(now));

    const units = seedUnderRestedUnits();
    useColonyStore.setState({
      units,
      nextId: 5,
      buildings: { barracks: false, medbay: true },
      serum: 200,
      stims: 0,
    });

    useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);

    // With the mock, ALL 4 under-rested units are guaranteed injured.
    const afterUnits = useColonyStore.getState().units;
    for (const u of afterUnits) {
      expect(u.injuredUntil).not.toBeNull();
      const duration = u.injuredUntil! - now;
      expect(duration).toBe(INJURY_DURATION_MEDBAY_MS); // 30 min
    }
  });

  it('sets injuredUntil = now + INJURY_DURATION_MS when Medbay NOT built', () => {
    const now = new Date(2026, 7, 4, 12, 0, 0).getTime();
    vi.setSystemTime(new Date(now));

    const units = seedUnderRestedUnits();
    useColonyStore.setState({
      units,
      nextId: 5,
      buildings: { barracks: false, medbay: false },
      serum: 200,
      stims: 0,
    });

    useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);

    // With the mock, ALL 4 under-rested units are guaranteed injured.
    const afterUnits = useColonyStore.getState().units;
    for (const u of afterUnits) {
      expect(u.injuredUntil).not.toBeNull();
      const duration = u.injuredUntil! - now;
      expect(duration).toBe(INJURY_DURATION_MS); // 60 min
    }
  });
});
