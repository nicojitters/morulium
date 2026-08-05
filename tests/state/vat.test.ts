import { describe, it, expect } from 'vitest';
import {
  VAT_INPUT_SIZE,
  VAT_MAX_BATCH_SIZE,
  VAT_SUBSTREAM_PRIME,
  VAT_TIER_BUMP_TABLE,
} from '../../src/state/vat';
import type { Tier } from '../../src/sim/types';

const ALL_TIERS: readonly Tier[] = ['baseline', 'strain', 'mutant', 'chimera', 'progenitor'];

describe('Vat constants', () => {
  it('VAT_INPUT_SIZE = 10', () => {
    expect(VAT_INPUT_SIZE).toBe(10);
  });

  it('VAT_MAX_BATCH_SIZE = 10', () => {
    expect(VAT_MAX_BATCH_SIZE).toBe(10);
  });

  it('VAT_SUBSTREAM_PRIME = 1_000_331 (distinct from other primes)', () => {
    expect(VAT_SUBSTREAM_PRIME).toBe(1_000_331);
    expect(VAT_SUBSTREAM_PRIME).not.toBe(1_000_003);   // FAILSAFE
    expect(VAT_SUBSTREAM_PRIME).not.toBe(1_000_033);   // BREED
    expect(VAT_SUBSTREAM_PRIME).not.toBe(1_000_099);   // INCURSION
    expect(VAT_SUBSTREAM_PRIME).not.toBe(1_000_213);   // INJURY
  });
});

describe('VAT_TIER_BUMP_TABLE', () => {
  it('has entries for all 5 tiers', () => {
    for (const t of ALL_TIERS) {
      expect(VAT_TIER_BUMP_TABLE[t]).toBeDefined();
    }
  });

  it('each row sums to exactly 1.0', () => {
    for (const t of ALL_TIERS) {
      const row = VAT_TIER_BUMP_TABLE[t];
      expect(row.bump0 + row.bump1 + row.bump2).toBeCloseTo(1.0, 10);
    }
  });

  it('baseline/strain/mutant/chimera bump-1 = 0.90', () => {
    expect(VAT_TIER_BUMP_TABLE.baseline.bump1).toBe(0.90);
    expect(VAT_TIER_BUMP_TABLE.strain.bump1).toBe(0.90);
    expect(VAT_TIER_BUMP_TABLE.mutant.bump1).toBe(0.90);
    expect(VAT_TIER_BUMP_TABLE.chimera.bump1).toBe(0.90);
  });

  it('progenitor always stays (bump0 = 1.0)', () => {
    expect(VAT_TIER_BUMP_TABLE.progenitor.bump0).toBe(1.0);
    expect(VAT_TIER_BUMP_TABLE.progenitor.bump1).toBe(0);
    expect(VAT_TIER_BUMP_TABLE.progenitor.bump2).toBe(0);
  });

  it('no tier bumps by 2 in M7a', () => {
    for (const t of ALL_TIERS) {
      expect(VAT_TIER_BUMP_TABLE[t].bump2).toBe(0);
    }
  });
});
