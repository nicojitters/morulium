import { describe, it, expect } from 'vitest';
import { rollGenome, expressPhenotype } from '../../src/sim/genome';
import { createRng } from '../../src/sim/rng';
import { LOCI, ALLELES } from '../../src/sim/data/loci';
import type { Genome } from '../../src/sim/types';

describe('rollGenome', () => {
  it('produces exactly two alleles for every registered locus', () => {
    const g = rollGenome(createRng(1));
    for (const locusId of Object.keys(LOCI)) {
      const pair = g.loci[locusId];
      expect(pair, `missing locus ${locusId}`).toBeDefined();
      expect(pair!.length).toBe(2);
    }
    expect(Object.keys(g.loci).sort()).toEqual(Object.keys(LOCI).sort());
  });

  it('every rolled allele is valid at its locus', () => {
    const g = rollGenome(createRng(2));
    for (const [locusId, pair] of Object.entries(g.loci)) {
      const locus = LOCI[locusId]!;
      for (const alleleId of pair) {
        expect(locus.alleles).toContain(alleleId);
      }
    }
  });

  it('is deterministic for a given seed', () => {
    const a = rollGenome(createRng(1234));
    const b = rollGenome(createRng(1234));
    expect(a).toEqual(b);
  });

  it('different seeds yield different genomes on average', () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const unique = new Set(seeds.map((s) => JSON.stringify(rollGenome(createRng(s)))));
    expect(unique.size).toBeGreaterThan(5);
  });
});

describe('expressPhenotype', () => {
  const g = (pairs: Record<string, [string, string]>): Genome => ({ loci: pairs });

  it('homozygous locus expresses that allele', () => {
    const p = expressPhenotype(g({
      musculature:      ['mus_strong', 'mus_strong'],
      neural_tissue:    ['neu_neutral', 'neu_neutral'],
      predator_drive:   ['prd_neutral', 'prd_neutral'],
      carapace_density: ['car_neutral', 'car_neutral'],
      metabolism:       ['met_neutral', 'met_neutral'],
      sinew:            ['sin_neutral', 'sin_neutral'],
      vigor:            ['vig_neutral', 'vig_neutral'],
      acuity:           ['acu_neutral', 'acu_neutral'],
      head:             ['head_maw',       'head_maw'],
      carapace:         ['cara_chitin',    'cara_chitin'],
      locomotion:       ['loco_sprint',    'loco_sprint'],
      appendage:        ['app_stinger',    'app_stinger'],
      aberration:       ['ab_voltaic',     'ab_voltaic'],
      palette:          ['pal_ash',        'pal_ash'],
    }));
    expect(p.expressed.head).toBe('head_maw');
    expect(p.expressed.aberration).toBe('ab_voltaic');
    expect(p.palette).toBe('pal_ash');
  });

  it('heterozygous dominant + recessive expresses the dominant', () => {
    const p = expressPhenotype(g({
      musculature: ['mus_neutral', 'mus_neutral'], neural_tissue: ['neu_neutral', 'neu_neutral'],
      predator_drive: ['prd_neutral', 'prd_neutral'], carapace_density: ['car_neutral', 'car_neutral'],
      metabolism: ['met_neutral', 'met_neutral'], sinew: ['sin_neutral', 'sin_neutral'],
      vigor: ['vig_neutral', 'vig_neutral'], acuity: ['acu_neutral', 'acu_neutral'],
      head: ['head_maw', 'head_mandible'], // both dominant — separate test
      carapace: ['cara_chitin', 'cara_hide'], // dominant vs. recessive
      locomotion: ['loco_sprint', 'loco_bulk'], // dominant vs. recessive
      appendage: ['app_stinger', 'app_none'], // dominant vs. recessive
      aberration: ['ab_none', 'ab_voltaic'], // dominant (none) vs. recessive (voltaic)
      palette: ['pal_ash', 'pal_ash'],
    }));
    expect(p.expressed.carapace).toBe('cara_chitin');
    expect(p.expressed.locomotion).toBe('loco_sprint');
    expect(p.expressed.appendage).toBe('app_stinger');
    expect(p.expressed.aberration).toBe('ab_none'); // recessive aberration hidden as carrier
  });

  it('heterozygous two-dominants — higher rarityWeight wins', () => {
    const p = expressPhenotype(g({
      musculature: ['mus_neutral', 'mus_neutral'], neural_tissue: ['neu_neutral', 'neu_neutral'],
      predator_drive: ['prd_neutral', 'prd_neutral'], carapace_density: ['car_neutral', 'car_neutral'],
      metabolism: ['met_neutral', 'met_neutral'], sinew: ['sin_neutral', 'sin_neutral'],
      vigor: ['vig_neutral', 'vig_neutral'], acuity: ['acu_neutral', 'acu_neutral'],
      head: ['head_maw', 'head_mandible'], // weights 3 vs 1
      carapace: ['cara_chitin', 'cara_chitin'],
      locomotion: ['loco_sprint', 'loco_sprint'],
      appendage: ['app_stinger', 'app_stinger'],
      aberration: ['ab_none', 'ab_none'],
      palette: ['pal_ash', 'pal_ash'],
    }));
    expect(p.expressed.head).toBe('head_maw');
    // Verify ALLELES data assumption for this test:
    expect(ALLELES['head_maw']!.rarityWeight).toBeGreaterThan(ALLELES['head_mandible']!.rarityWeight);
  });

  it('tied rarityWeight — lexicographically smaller id wins', () => {
    // head_maw (weight 3) vs head_sensor (weight 3): 'head_maw' < 'head_sensor'
    const p = expressPhenotype(g({
      musculature: ['mus_neutral', 'mus_neutral'], neural_tissue: ['neu_neutral', 'neu_neutral'],
      predator_drive: ['prd_neutral', 'prd_neutral'], carapace_density: ['car_neutral', 'car_neutral'],
      metabolism: ['met_neutral', 'met_neutral'], sinew: ['sin_neutral', 'sin_neutral'],
      vigor: ['vig_neutral', 'vig_neutral'], acuity: ['acu_neutral', 'acu_neutral'],
      head: ['head_sensor', 'head_maw'],
      carapace: ['cara_chitin', 'cara_chitin'],
      locomotion: ['loco_sprint', 'loco_sprint'],
      appendage: ['app_stinger', 'app_stinger'],
      aberration: ['ab_none', 'ab_none'],
      palette: ['pal_ash', 'pal_ash'],
    }));
    expect(p.expressed.head).toBe('head_maw');
  });

  it('palette is passed through as-is (uses expressed rule too)', () => {
    const p = expressPhenotype(g({
      musculature: ['mus_neutral', 'mus_neutral'], neural_tissue: ['neu_neutral', 'neu_neutral'],
      predator_drive: ['prd_neutral', 'prd_neutral'], carapace_density: ['car_neutral', 'car_neutral'],
      metabolism: ['met_neutral', 'met_neutral'], sinew: ['sin_neutral', 'sin_neutral'],
      vigor: ['vig_neutral', 'vig_neutral'], acuity: ['acu_neutral', 'acu_neutral'],
      head: ['head_mandible', 'head_mandible'], carapace: ['cara_chitin', 'cara_chitin'],
      locomotion: ['loco_bulk', 'loco_bulk'], appendage: ['app_none', 'app_none'],
      aberration: ['ab_none', 'ab_none'],
      palette: ['pal_rust', 'pal_ash'], // both dominant; pal_ash (weight 0) vs pal_rust (weight 1) → pal_rust wins
    }));
    expect(p.palette).toBe('pal_rust');
  });
});
