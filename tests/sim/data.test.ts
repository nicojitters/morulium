import { describe, it, expect } from 'vitest';
import { ALLELES, LOCI, PALETTES } from '../../src/sim/data/loci';
import { STATS, type Allele } from '../../src/sim/types';

describe('data integrity', () => {
  it('every locus has at least one allele registered', () => {
    for (const locus of Object.values(LOCI)) {
      expect(locus.alleles.length).toBeGreaterThan(0);
    }
  });

  it('every allele in a locus.alleles list exists in ALLELES and back-references the locus', () => {
    for (const locus of Object.values(LOCI)) {
      for (const alleleId of locus.alleles) {
        const allele = ALLELES[alleleId];
        expect(allele, `missing allele ${alleleId}`).toBeDefined();
        expect(allele!.locus).toBe(locus.id);
      }
    }
  });

  it('every allele in ALLELES belongs to a registered locus', () => {
    for (const allele of Object.values(ALLELES)) {
      const locus = LOCI[allele.locus];
      expect(locus, `orphan allele ${allele.id}`).toBeDefined();
      expect(locus!.alleles).toContain(allele.id);
    }
  });

  it('rarity weights are one of the canonical values', () => {
    const valid = new Set([0, 1, 3, 6, 10]);
    for (const allele of Object.values(ALLELES)) {
      expect(valid.has(allele.rarityWeight)).toBe(true);
    }
  });

  it('quantitative alleles only touch declared Stat keys', () => {
    const statSet = new Set<string>(STATS);
    for (const allele of Object.values(ALLELES)) {
      for (const key of Object.keys(allele.statDeltas)) {
        expect(statSet.has(key)).toBe(true);
      }
    }
  });

  it('qualitative loci carry alleles with a dominance value', () => {
    for (const locus of Object.values(LOCI)) {
      if (locus.type !== 'qualitative') continue;
      for (const alleleId of locus.alleles) {
        const allele = ALLELES[alleleId] as Allele;
        expect(allele.dominance).toBeDefined();
      }
    }
  });

  it('quantitative loci carry alleles WITHOUT a dominance value', () => {
    for (const locus of Object.values(LOCI)) {
      if (locus.type !== 'quantitative') continue;
      for (const alleleId of locus.alleles) {
        const allele = ALLELES[alleleId] as Allele;
        expect(allele.dominance).toBeUndefined();
      }
    }
  });

  it('has at least one palette registered', () => {
    expect(Object.values(PALETTES).length).toBeGreaterThan(0);
  });
});
