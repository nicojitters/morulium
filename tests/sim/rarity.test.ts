import { describe, it, expect } from 'vitest';
import { computeRarity, tierForScore } from '../../src/sim/rarity';
import type { Genome, Tier } from '../../src/sim/types';

function genome(pairs: Record<string, [string, string]>): Genome {
  return { loci: pairs };
}

// A "min-qualitative" genome using the weight-0 baselines wherever available.
// Expressed weights: head_plain=0, cara_bare=0, loco_plain=0, app_none=0,
// eyes_plain=0, hide_plain=0, ab_none=0, pal_ash=0. Score = 0 → Baseline.
const MIN_QUALITATIVE: Record<string, [string, string]> = {
  musculature:      ['mus_neutral', 'mus_neutral'],
  neural_tissue:    ['neu_neutral', 'neu_neutral'],
  predator_drive:   ['prd_neutral', 'prd_neutral'],
  carapace_density: ['car_neutral', 'car_neutral'],
  metabolism:       ['met_neutral', 'met_neutral'],
  sinew:            ['sin_neutral', 'sin_neutral'],
  vigor:            ['vig_neutral', 'vig_neutral'],
  acuity:           ['acu_neutral', 'acu_neutral'],
  head:             ['head_plain',  'head_plain'],
  carapace:         ['cara_bare',   'cara_bare'],
  locomotion:       ['loco_plain',  'loco_plain'],
  appendage:        ['app_none',    'app_none'],
  eyes:             ['eyes_plain',  'eyes_plain'],
  hide_pattern:     ['hide_plain',  'hide_plain'],
  aberration:       ['ab_none',     'ab_none'],
  palette:          ['pal_ash',     'pal_ash'],
};

describe('computeRarity — expressed-only, qualitative-only', () => {
  it('returns { score, tier } for the all-baseline genome (score 0 → Baseline)', () => {
    const result = computeRarity(genome(MIN_QUALITATIVE));
    expect(result.score).toBe(0);
    expect(result.tier).toBe('baseline');
  });

  it('quantitative-only spike does not raise score', () => {
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
    expect(carrier.score).toBe(0); // unchanged from baseline
  });

  it('homozygous ab_voltaic expresses and adds its full weight', () => {
    // ab_voltaic homozygous → weight 10. Total 0 + 10 = 10 → Chimera (thresholds: Baseline≤2, Strain≤4, Mutant≤5, Chimera≤11)
    const wild = computeRarity(genome({
      ...MIN_QUALITATIVE,
      aberration: ['ab_voltaic', 'ab_voltaic'],
    }));
    expect(wild.score).toBe(10);
    expect(wild.tier).toBe('chimera');
  });

  it('a genome loaded with expressed Mutant alleles hits Progenitor', () => {
    // Expressed: head_maw(3), cara_bone(3), loco_sprint(3), app_stinger(3), ab_voltaic(10), pal_ash(0)
    // Score = 3+3+3+3+10+0 = 22 → Progenitor
    const loaded = computeRarity(genome({
      ...MIN_QUALITATIVE,
      head: ['head_maw', 'head_maw'],
      carapace: ['cara_bone', 'cara_bone'],
      locomotion: ['loco_sprint', 'loco_sprint'],
      appendage: ['app_stinger', 'app_stinger'],
      aberration: ['ab_voltaic', 'ab_voltaic'],
    }));
    expect(loaded.score).toBe(22);
    expect(loaded.tier).toBe('progenitor');
  });
});

describe('tierForScore — boundary snapshot (M7c thresholds)', () => {
  it('score 2 → baseline (upper bound of baseline)', () => {
    expect(tierForScore(2)).toBe('baseline');
  });
  it('score 3 → strain (lower bound of strain)', () => {
    expect(tierForScore(3)).toBe('strain');
  });
  it('score 4 → strain (upper bound of strain)', () => {
    expect(tierForScore(4)).toBe('strain');
  });
  it('score 5 → mutant (lower bound of mutant)', () => {
    expect(tierForScore(5)).toBe('mutant');
  });
  it('score 6 → mutant (NEW: was chimera under old thresholds)', () => {
    expect(tierForScore(6)).toBe('mutant');
  });
  it('score 7 → chimera (NEW lower bound of chimera)', () => {
    expect(tierForScore(7)).toBe('chimera');
  });
  it('score 11 → chimera (upper bound of chimera)', () => {
    expect(tierForScore(11)).toBe('chimera');
  });
  it('score 12 → progenitor (lower bound of progenitor)', () => {
    expect(tierForScore(12)).toBe('progenitor');
  });
  it('boundary snapshot: full ladder maps as documented', () => {
    const snapshot: Record<number, Tier> = {};
    for (let s = 0; s <= 15; s++) snapshot[s] = tierForScore(s);
    expect(snapshot).toEqual({
      0: 'baseline', 1: 'baseline', 2: 'baseline',
      3: 'strain', 4: 'strain',
      5: 'mutant', 6: 'mutant',
      7: 'chimera', 8: 'chimera', 9: 'chimera', 10: 'chimera', 11: 'chimera',
      12: 'progenitor', 13: 'progenitor', 14: 'progenitor', 15: 'progenitor',
    });
  });
});
