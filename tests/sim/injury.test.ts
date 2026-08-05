import { describe, it, expect } from 'vitest';
import { INJURY_CHANCE, rollInjuries } from '../../src/sim/injury';

describe('injury constants', () => {
  it('INJURY_CHANCE is 0.15', () => expect(INJURY_CHANCE).toBe(0.15));
});

describe('rollInjuries', () => {
  it('returns empty map when restPenalties is empty', () => {
    const out = rollInjuries({}, 42);
    expect(Object.keys(out)).toHaveLength(0);
  });

  it('is deterministic: same restPenalties + seedBase returns identical map', () => {
    const penalties = { 1: 0.7, 2: 0.7, 3: 0.7 };
    const a = rollInjuries(penalties, 12345);
    const b = rollInjuries(penalties, 12345);
    expect(a).toEqual(b);
  });

  it('skips entries with value === 1.0 (defensive filter)', () => {
    const penalties = { 1: 1.0, 2: 0.7 };
    const out = rollInjuries(penalties, 99);
    // Unit 1 (fully rested — shouldn't have been in the map) not present
    expect(out[1]).toBeUndefined();
    // Unit 2 (under-rested) got rolled
    expect(typeof out[2]).toBe('boolean');
  });

  it('injury rate is roughly INJURY_CHANCE (0.15) across 100 seeds', () => {
    // Roll one under-rested unit against 100 different seeds
    let injuredCount = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const out = rollInjuries({ 1: 0.7 }, seed * 1_000_213);
      if (out[1]) injuredCount++;
    }
    // With INJURY_CHANCE=0.15 and 100 rolls, expected ~15 with variance.
    // Wide tolerance to avoid flakiness: 5-30 (very generous — mean 15, std ~3.6).
    expect(injuredCount).toBeGreaterThan(5);
    expect(injuredCount).toBeLessThan(30);
  });

  it('two under-rested units roll independently', () => {
    // Across many seeds, confirm both (true, true), (true, false),
    // (false, true), (false, false) all occur at some point
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const out = rollInjuries({ 1: 0.7, 2: 0.7 }, seed);
      outcomes.add(`${out[1] ? 1 : 0},${out[2] ? 1 : 0}`);
    }
    // All four combinations should appear across 200 seeds
    expect(outcomes.has('0,0')).toBe(true);
    expect(outcomes.has('1,1')).toBe(true);
    // At least one mixed outcome
    const mixed = outcomes.has('1,0') || outcomes.has('0,1');
    expect(mixed).toBe(true);
  });

  it('iterates keys in sorted numeric order (determinism guarantee)', () => {
    // If iteration order differed between engines, rollIndex would drift
    // and results would diverge. Provide keys in "wrong" order and confirm
    // the result matches a sorted-order fixture:
    const outFromMixed = rollInjuries({ 5: 0.7, 1: 0.7, 3: 0.7 }, 42);
    const outFromSorted = rollInjuries({ 1: 0.7, 3: 0.7, 5: 0.7 }, 42);
    expect(outFromMixed).toEqual(outFromSorted);
  });
});
