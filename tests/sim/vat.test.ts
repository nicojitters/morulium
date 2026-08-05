import { describe, it, expect } from 'vitest';
import { resolveVatOperation } from '../../src/sim/vat';
import { computeRarity } from '../../src/sim/rarity';
import type { Tier } from '../../src/sim/types';

const TEN_DONORS: readonly [number, number, number, number, number, number, number, number, number, number] =
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const ALL_TIERS: readonly Tier[] = ['baseline', 'strain', 'mutant', 'chimera', 'progenitor'];

describe('resolveVatOperation', () => {
  it('is deterministic given (donorIds, outputId, inputTier)', () => {
    const a = resolveVatOperation(TEN_DONORS, 42, 'baseline');
    const b = resolveVatOperation(TEN_DONORS, 42, 'baseline');
    expect(a).toEqual(b);
  });

  it('preserves donorIds verbatim', () => {
    const r = resolveVatOperation(TEN_DONORS, 42, 'strain');
    expect(r.donorIds).toEqual(TEN_DONORS);
  });

  it('preserves outputId', () => {
    const r = resolveVatOperation(TEN_DONORS, 99, 'baseline');
    expect(r.outputId).toBe(99);
  });

  it('preserves inputTier', () => {
    const r = resolveVatOperation(TEN_DONORS, 42, 'mutant');
    expect(r.inputTier).toBe('mutant');
  });

  it('output genome tier matches VatResolution.outputTier', () => {
    for (const t of ALL_TIERS) {
      const r = resolveVatOperation(TEN_DONORS, 42, t);
      expect(computeRarity(r.outputGenome).tier).toBe(r.outputTier);
    }
  });

  it('progenitor input always stays progenitor (100% bump0)', () => {
    for (let id = 1; id <= 50; id++) {
      const r = resolveVatOperation(TEN_DONORS, id, 'progenitor');
      expect(r.bumpAmount).toBe(0);
      expect(r.outputTier).toBe('progenitor');
    }
  });

  it('bumpAmount is 0 or 1 across many seeds (never 2 in M7a)', () => {
    const bumps = new Set<number>();
    for (let id = 1; id <= 200; id++) {
      const r = resolveVatOperation(TEN_DONORS, id, 'baseline');
      bumps.add(r.bumpAmount);
    }
    expect(bumps.has(2)).toBe(false);
    expect(bumps.has(0) || bumps.has(1)).toBe(true);
  });

  it('bump-1 distribution: baseline input mostly promotes to strain (75-100 of 100)', () => {
    let bump1Count = 0;
    for (let id = 1; id <= 100; id++) {
      const r = resolveVatOperation(TEN_DONORS, id, 'baseline');
      if (r.bumpAmount === 1) bump1Count++;
    }
    expect(bump1Count).toBeGreaterThanOrEqual(75);
    expect(bump1Count).toBeLessThanOrEqual(100);
  });

  it('when bumpAmount = 1, outputTier is one step above inputTier', () => {
    const LADDER: readonly Tier[] = ['baseline', 'strain', 'mutant', 'chimera', 'progenitor'];
    for (let id = 1; id <= 100; id++) {
      const r = resolveVatOperation(TEN_DONORS, id, 'mutant');
      if (r.bumpAmount === 1) {
        const idx = LADDER.indexOf(r.inputTier);
        expect(r.outputTier).toBe(LADDER[idx + 1]);
      } else if (r.bumpAmount === 0) {
        expect(r.outputTier).toBe(r.inputTier);
      }
    }
  });

  it('all 5 target tiers are reachable via rollGenomeOfExactTier', () => {
    for (const t of ALL_TIERS) {
      let found = false;
      for (let id = 1; id <= 200 && !found; id++) {
        const r = resolveVatOperation(TEN_DONORS, id, t);
        if (r.bumpAmount === 0 && r.outputTier === t) {
          expect(computeRarity(r.outputGenome).tier).toBe(t);
          found = true;
        }
      }
      expect(found).toBe(true);
    }
  });
});
