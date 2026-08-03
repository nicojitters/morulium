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

  it('every allele has a positive drawWeight', () => {
    for (const allele of Object.values(ALLELES)) {
      expect(allele.drawWeight).toBeGreaterThan(0);
    }
  });

  it('aberration draw distribution: ab_none dominant, ab_voltaic and ab_corrosive very rare', () => {
    expect(ALLELES['ab_none']!.drawWeight).toBe(200);
    expect(ALLELES['ab_voltaic']!.drawWeight).toBe(1);
    expect(ALLELES['ab_corrosive']!.drawWeight).toBe(1);
  });

  it('default drawWeight follows the rarityWeight tier: 0→100, 1→40, 3→12, 6→4, 10→1', () => {
    // Sample non-aberration alleles at each rarity tier
    expect(ALLELES['mus_neutral']!.drawWeight).toBe(100); // weight 0
    expect(ALLELES['mus_lean']!.drawWeight).toBe(40);    // weight 1
    expect(ALLELES['mus_strong']!.drawWeight).toBe(12);  // weight 3
  });

  it('has weight-0 baseline alleles head_plain, cara_bare, loco_plain with drawWeight 180', () => {
    for (const id of ['head_plain', 'cara_bare', 'loco_plain']) {
      const a = ALLELES[id];
      expect(a, `missing baseline allele ${id}`).toBeDefined();
      expect(a!.rarityWeight).toBe(0);
      expect(a!.drawWeight).toBe(180);
      expect(a!.dominance).toBe('dominant');
    }
  });

  it('baseline alleles are listed FIRST in their locus alleles array', () => {
    expect(LOCI['head']!.alleles[0]).toBe('head_plain');
    expect(LOCI['carapace']!.alleles[0]).toBe('cara_bare');
    expect(LOCI['locomotion']!.alleles[0]).toBe('loco_plain');
  });
});
