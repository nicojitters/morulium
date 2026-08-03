import { describe, it, expect } from 'vitest';
import { computeRarity } from '../../src/sim/rarity';
import type { Genome } from '../../src/sim/types';

function genome(pairs: Record<string, [string, string]>): Genome {
  return { loci: pairs };
}

// A "min-qualitative" genome: every qualitative locus expresses its lowest-weight allele.
// Under the NEW allele table order, aberration is [ab_none, ab_voltaic, ab_corrosive],
// palette is [pal_ash, pal_rust, pal_moss, pal_bloom].
// Expressed weights: head_mandible=1, cara_chitin=1, loco_bulk=1 (recessive but homozygous),
// app_none=0 (recessive homozygous), ab_none=0 (dominant homozygous), pal_ash=0.
// Score = 1 + 1 + 1 + 0 + 0 + 0 = 3 → Variant.
const MIN_QUALITATIVE: Record<string, [string, string]> = {
  musculature:      ['mus_neutral', 'mus_neutral'],
  neural_tissue:    ['neu_neutral', 'neu_neutral'],
  predator_drive:   ['prd_neutral', 'prd_neutral'],
  carapace_density: ['car_neutral', 'car_neutral'],
  metabolism:       ['met_neutral', 'met_neutral'],
  sinew:            ['sin_neutral', 'sin_neutral'],
  vigor:            ['vig_neutral', 'vig_neutral'],
  acuity:           ['acu_neutral', 'acu_neutral'],
  head:             ['head_mandible', 'head_mandible'],
  carapace:         ['cara_chitin',   'cara_chitin'],
  locomotion:       ['loco_bulk',     'loco_bulk'],
  appendage:        ['app_none',      'app_none'],
  aberration:       ['ab_none',       'ab_none'],
  palette:          ['pal_ash',       'pal_ash'],
};

describe('computeRarity — expressed-only, qualitative-only', () => {
  it('returns { score, tier } for the min-qualitative genome (score 3 → Variant)', () => {
    const result = computeRarity(genome(MIN_QUALITATIVE));
    expect(result.score).toBe(3);
    expect(result.tier).toBe('Variant');
  });

  it('quantitative-only spike does not raise score', () => {
    // Adding heavy quantitative alleles must not change the score.
    const base = computeRarity(genome(MIN_QUALITATIVE)).score;
    const withSpike = computeRarity(genome({
      ...MIN_QUALITATIVE,
      musculature: ['mus_strong', 'mus_strong'],
      neural_tissue: ['neu_dense', 'neu_dense'],
    })).score;
    expect(withSpike).toBe(base);
  });

  it('recessive carrier scores 0 at that locus (expressed-only)', () => {
    // ab_none (dominant) + ab_voltaic (recessive) → expresses ab_none → weight 0
    const carrier = computeRarity(genome({
      ...MIN_QUALITATIVE,
      aberration: ['ab_none', 'ab_voltaic'],
    }));
    expect(carrier.score).toBe(3); // unchanged from baseline
  });

  it('homozygous ab_voltaic expresses and adds its full weight', () => {
    // ab_voltaic homozygous expresses ab_voltaic (weight 10) → total 3 + 10 = 13 → Adapted
    const wild = computeRarity(genome({
      ...MIN_QUALITATIVE,
      aberration: ['ab_voltaic', 'ab_voltaic'],
    }));
    expect(wild.score).toBe(13);
    expect(wild.tier).toBe('Adapted');
  });

  it('a genome loaded with expressed Adapted alleles hits Evolved or Apex', () => {
    // Expressed: head_maw(3), cara_bone(3), loco_sprint(3), app_stinger(3), ab_voltaic(10), pal_ash(0)
    // Score = 3+3+3+3+10+0 = 22 → Apex
    const loaded = computeRarity(genome({
      ...MIN_QUALITATIVE,
      head: ['head_maw', 'head_maw'],
      carapace: ['cara_bone', 'cara_bone'],
      locomotion: ['loco_sprint', 'loco_sprint'],
      appendage: ['app_stinger', 'app_stinger'],
      aberration: ['ab_voltaic', 'ab_voltaic'],
    }));
    expect(loaded.score).toBe(22);
    expect(loaded.tier).toBe('Apex');
  });
});
