import { describe, it, expect } from 'vitest';
import {
  GARRISON_TARGET,
  GARRISON_MIN,
  GARRISON_INCOME_PER_UNIT_PER_HOUR,
  GARRISON_GRACE_MS,
  FLARE_COOLDOWN_MS,
  RADICALIZATION_BONUS,
  computeGarrisonIncome,
  computeHardeningFor,
} from '../../src/state/occupation';
import type { FrontState } from '../../src/state/incursion';
import type { FrontId } from '../../src/sim/data/fronts';

describe('occupation constants', () => {
  it('GARRISON_TARGET is 2', () => expect(GARRISON_TARGET).toBe(2));
  it('GARRISON_MIN is 1', () => expect(GARRISON_MIN).toBe(1));
  it('GARRISON_INCOME_PER_UNIT_PER_HOUR is 5', () => expect(GARRISON_INCOME_PER_UNIT_PER_HOUR).toBe(5));
  it('GARRISON_GRACE_MS is 1_800_000 (30 min)', () => expect(GARRISON_GRACE_MS).toBe(30 * 60 * 1000));
  it('FLARE_COOLDOWN_MS is 1_800_000 (30 min)', () => expect(FLARE_COOLDOWN_MS).toBe(30 * 60 * 1000));
  it('RADICALIZATION_BONUS is 4', () => expect(RADICALIZATION_BONUS).toBe(4));
});

describe('computeGarrisonIncome', () => {
  it('returns 0 when garrisonedCount is 0', () => {
    expect(computeGarrisonIncome(0, 1_000_000_000, 1_000_000_000 + 60 * 60 * 1000)).toBe(0);
  });

  it('returns 10 for 2 units × 1 hour', () => {
    const now = 1_000_000_000;
    const lastTickAt = now - 60 * 60 * 1000;
    expect(computeGarrisonIncome(2, lastTickAt, now)).toBe(10);
  });

  it('returns 15 for 2 units × 90 minutes (2 × 5 × 1.5 = 15)', () => {
    const now = 1_000_000_000;
    const lastTickAt = now - 90 * 60 * 1000;
    expect(computeGarrisonIncome(2, lastTickAt, now)).toBe(15);
  });

  it('returns 3 for 2 units × 20 minutes (Math.floor(2 × 5 × 0.333) = 3)', () => {
    const now = 1_000_000_000;
    const lastTickAt = now - 20 * 60 * 1000;
    expect(computeGarrisonIncome(2, lastTickAt, now)).toBe(3);
  });

  it('returns 0 when now < lastTickAt (defensive against clock drift)', () => {
    const now = 1_000_000_000;
    const lastTickAt = now + 1000;   // 1 second ahead
    expect(computeGarrisonIncome(2, lastTickAt, now)).toBe(0);
  });

  it('returns 0 for a fractional-hour interval that doesn\'t reach 1 SR', () => {
    // 2 units × 5 SR/hr × 5 sec = ~0.014 SR → floor to 0
    const now = 1_000_000_000;
    const lastTickAt = now - 5000;
    expect(computeGarrisonIncome(2, lastTickAt, now)).toBe(0);
  });
});

describe('computeHardeningFor', () => {
  const uncapturedFront: FrontState = {
    captured: false, cooldownUntil: null,
  };
  const capturedFront: FrontState = {
    captured: true, cooldownUntil: null,
  };

  it('returns 0 when no other fronts are captured', () => {
    const fronts: Record<FrontId, FrontState> = {
      infrastructure: uncapturedFront,
      military: uncapturedFront,
      guerrilla: uncapturedFront,
    };
    expect(computeHardeningFor('infrastructure', fronts)).toBe(0);
  });

  it('excludes self even when target front is captured', () => {
    const fronts: Record<FrontId, FrontState> = {
      infrastructure: capturedFront,
      military: uncapturedFront,
      guerrilla: uncapturedFront,
    };
    // Self is captured, but no OTHERS → 0
    expect(computeHardeningFor('infrastructure', fronts)).toBe(0);
  });

  it('adds RADICALIZATION_BONUS per other captured front', () => {
    const fronts: Record<FrontId, FrontState> = {
      infrastructure: uncapturedFront,
      military: capturedFront,
      guerrilla: uncapturedFront,
    };
    expect(computeHardeningFor('infrastructure', fronts)).toBe(RADICALIZATION_BONUS);
  });

  it('sums for 2 other captured fronts', () => {
    const fronts: Record<FrontId, FrontState> = {
      infrastructure: uncapturedFront,
      military: capturedFront,
      guerrilla: capturedFront,
    };
    expect(computeHardeningFor('infrastructure', fronts)).toBe(2 * RADICALIZATION_BONUS);
  });

  it('still counts other captured fronts when self is captured', () => {
    const fronts: Record<FrontId, FrontState> = {
      infrastructure: capturedFront,
      military: capturedFront,
      guerrilla: uncapturedFront,
    };
    expect(computeHardeningFor('infrastructure', fronts)).toBe(RADICALIZATION_BONUS);
  });
});
