import { describe, it, expect } from 'vitest';
import {
  PER_GEN_WEAR,
  WEAR_FLOOR,
  wearMultiplier,
  nextWear,
} from '../../src/sim/wear';
import { LOCI } from '../../src/sim/data/loci';

describe('wear constants', () => {
  it('PER_GEN_WEAR is 0.02', () => expect(PER_GEN_WEAR).toBe(0.02));
  it('WEAR_FLOOR is 0.60', () => expect(WEAR_FLOOR).toBe(0.60));
});

describe('wearMultiplier', () => {
  it('returns 1.0 at wearCount=0', () => expect(wearMultiplier(0)).toBe(1.0));

  it('shaves linearly: 1 - 0.02 * w', () => {
    expect(wearMultiplier(5)).toBeCloseTo(0.9, 10);
    expect(wearMultiplier(10)).toBeCloseTo(0.8, 10);
  });

  it('hits WEAR_FLOOR exactly at wearCount=20', () => {
    expect(wearMultiplier(20)).toBe(0.60);
  });

  it('floors at WEAR_FLOOR past wearCount=20', () => {
    expect(wearMultiplier(21)).toBe(0.60);
    expect(wearMultiplier(100)).toBe(0.60);
    expect(wearMultiplier(1_000_000)).toBe(0.60);
  });
});

describe('nextWear', () => {
  const pristineA = { wear: {} };
  const pristineB = { wear: {} };
  const noMutations = new Set<string>();

  it('two pristine parents + no mutations → every locus has wear=1', () => {
    const w = nextWear(pristineA, pristineB, noMutations);
    for (const locusId of Object.keys(LOCI)) {
      expect(w[locusId]).toBe(1);
    }
  });

  it('sums parent wear per locus + 1', () => {
    const parentA = { wear: { musculature: 3, carapace: 5 } };
    const parentB = { wear: { musculature: 7, sinew: 2 } };
    const w = nextWear(parentA, parentB, noMutations);
    expect(w['musculature']).toBe(3 + 7 + 1);
    expect(w['carapace']).toBe(5 + 0 + 1);
    expect(w['sinew']).toBe(0 + 2 + 1);
    // Every LOCI key present; loci both parents pristine at → 1
    expect(w['palette']).toBe(1);
  });

  it('mutated loci are omitted from the returned map (absent-key ≡ 0)', () => {
    const parentA = { wear: { musculature: 5 } };
    const parentB = { wear: { musculature: 5 } };
    const mutated = new Set(['musculature']);
    const w = nextWear(parentA, parentB, mutated);
    expect(w['musculature']).toBeUndefined();
    // Other loci still populated
    expect(w['sinew']).toBe(1);
  });

  it('all-mutated → map has no entries', () => {
    const w = nextWear(pristineA, pristineB, new Set(Object.keys(LOCI)));
    expect(Object.keys(w)).toHaveLength(0);
  });
});
