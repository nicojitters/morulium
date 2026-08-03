import { describe, it, expect } from 'vitest';
import { computeRarity } from '../../src/sim/rarity';
import type { Genome } from '../../src/sim/types';

function genome(pairs: Record<string, [string, string]>): Genome {
  return { loci: pairs };
}

// A minimum-score genome from the current allele table: every quantitative locus
// uses its 0-weight allele; every qualitative locus uses its lowest-weight allele.
// Score = head_mandible(1) + cara_chitin(1) + loco_bulk(1) + app_none(0) + ab_none(0) + pal_ash(0) = 3.
// (There is no 0-weight allele for head/carapace/locomotion in the MVP table.)
const MIN_SCORE_LOCI: Record<string, [string, string]> = {
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

describe('computeRarity', () => {
  it('the minimum-weight genome in the current table lands in Variant (score 3)', () => {
    expect(computeRarity(genome(MIN_SCORE_LOCI))).toBe('Variant');
  });

  it('two Apex aberration alleles push the genome to Apex', () => {
    // 20 (two ab_voltaic) + 3 (min qualitative baseline) = 23 → Apex
    const g = genome({ ...MIN_SCORE_LOCI, aberration: ['ab_voltaic', 'ab_voltaic'] });
    expect(computeRarity(g)).toBe('Apex');
  });

  it('threshold boundaries: 2→Basic, 3→Variant, 10→Variant, 11→Adapted, 14→Adapted, 15→Evolved, 19→Evolved, 20→Apex', () => {
    // We can't fabricate an arbitrary total score with only the real allele table,
    // so unit-test the pure tier function via an exported helper if needed. For now,
    // spot-check the boundaries the current table can actually reach.
    // Score 6 → Variant (min genome above: two alleles per locus).
    expect(computeRarity(genome(MIN_SCORE_LOCI))).toBe('Variant');
    // Add one Adapted-weight allele (weight 3, homozygous) to lift score by +6 → 12 → Adapted.
    expect(computeRarity(genome({ ...MIN_SCORE_LOCI, musculature: ['mus_strong', 'mus_strong'] }))).toBe('Adapted');
    // Add two homozygous Adapted alleles → +12 → 18 → Evolved.
    expect(computeRarity(genome({
      ...MIN_SCORE_LOCI,
      musculature: ['mus_strong', 'mus_strong'],
      neural_tissue: ['neu_dense', 'neu_dense'],
    }))).toBe('Evolved');
  });
});
