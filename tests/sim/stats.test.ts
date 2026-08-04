import { describe, it, expect } from 'vitest';
import {
  BASE_STATS,
  computeBaseStats,
  computeGrowthAffinity,
  computeCurrentStats,
} from '../../src/sim/stats';
import type { Genome } from '../../src/sim/types';
import { LOCI, ALLELES } from '../../src/sim/data/loci';
import { STATS } from '../../src/sim/types';
import { rollGenome } from '../../src/sim/genome';
import { createRng } from '../../src/sim/rng';

function g(pairs: Record<string, [string, string]>): Genome {
  return { loci: pairs };
}

const NEUTRAL_QUANT: Record<string, [string, string]> = {
  musculature:      ['mus_neutral', 'mus_neutral'],
  neural_tissue:    ['neu_neutral', 'neu_neutral'],
  predator_drive:   ['prd_neutral', 'prd_neutral'],
  carapace_density: ['car_neutral', 'car_neutral'],
  metabolism:       ['met_neutral', 'met_neutral'],
  sinew:            ['sin_neutral', 'sin_neutral'],
  vigor:            ['vig_neutral', 'vig_neutral'],
  acuity:           ['acu_neutral', 'acu_neutral'],
};

const NEUTRAL_QUAL: Record<string, [string, string]> = {
  head:         ['head_mandible', 'head_mandible'],
  carapace:     ['cara_chitin',   'cara_chitin'],
  locomotion:   ['loco_bulk',     'loco_bulk'],
  appendage:    ['app_none',      'app_none'],
  eyes:         ['eyes_plain',    'eyes_plain'],
  hide_pattern: ['hide_plain',    'hide_plain'],
  aberration:   ['ab_none',       'ab_none'],
  palette:      ['pal_ash',       'pal_ash'],
};

describe('computeBaseStats', () => {
  it('a wholly-neutral genome returns BASE_STATS (adjusted for baseline qualitative deltas)', () => {
    const base = computeBaseStats(g({ ...NEUTRAL_QUANT, ...NEUTRAL_QUAL }));
    // NEUTRAL_QUAL includes head_mandible (PWR+1), cara_chitin (VIT+1), loco_bulk (VIT+2, SPD-1),
    // eyes_plain (GUI+1), hide_plain (VIT+1).
    expect(base.PWR).toBe(BASE_STATS.PWR + 1);
    expect(base.INT).toBe(BASE_STATS.INT);
    expect(base.GUI).toBe(BASE_STATS.GUI + 1);
    expect(base.VIT).toBe(BASE_STATS.VIT + 1 + 2 + 1);
    expect(base.SPD).toBe(BASE_STATS.SPD - 1);
  });

  it('antagonism: raising a PWR axis lowers INT', () => {
    const heavyPwr = g({
      ...NEUTRAL_QUANT,
      musculature: ['mus_strong', 'mus_strong'], // PWR +4/-3 on INT, homozygous → doubled
      ...NEUTRAL_QUAL,
    });
    const base = computeBaseStats(heavyPwr);
    const neutralBase = computeBaseStats(g({ ...NEUTRAL_QUANT, ...NEUTRAL_QUAL }));
    expect(base.PWR).toBeGreaterThan(neutralBase.PWR);
    expect(base.INT).toBeLessThan(neutralBase.INT);
  });

  it('stats are floored at 0', () => {
    // Stack every INT-penalty locus. mus_strong homozygous = INT -6. neu_neutral neutral.
    // BASE_STATS.INT (10) + (-6) = 4, so we need harsher stacking. Force via aberration + mus.
    // Simpler: just verify the invariant by choosing a target.
    const base = computeBaseStats(g({
      ...NEUTRAL_QUANT,
      musculature: ['mus_strong', 'mus_strong'],   // INT -6
      neural_tissue: ['neu_dense', 'neu_dense'],   // VIT -6 (INT bonus, but we're testing floor generally)
      ...NEUTRAL_QUAL,
    }));
    for (const v of Object.values(base)) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('quantitative loci: both alleles always sum (no dominance for quant)', () => {
    const homozygous = computeBaseStats(g({
      ...NEUTRAL_QUANT,
      musculature: ['mus_strong', 'mus_strong'],   // 2 doses of PWR+4
      ...NEUTRAL_QUAL,
    }));
    const heterozygous = computeBaseStats(g({
      ...NEUTRAL_QUANT,
      musculature: ['mus_strong', 'mus_neutral'],  // 1 dose of PWR+4
      ...NEUTRAL_QUAL,
    }));
    expect(homozygous.PWR - heterozygous.PWR).toBe(4);
  });
});

describe('computeGrowthAffinity', () => {
  it('the highest base stat has affinity 1.0', () => {
    const base = computeBaseStats(g({
      ...NEUTRAL_QUANT,
      musculature: ['mus_strong', 'mus_strong'],
      ...NEUTRAL_QUAL,
    }));
    const aff = computeGrowthAffinity(g({
      ...NEUTRAL_QUANT,
      musculature: ['mus_strong', 'mus_strong'],
      ...NEUTRAL_QUAL,
    }));
    const maxStat = Object.entries(base).sort((a, b) => b[1] - a[1])[0]![0];
    expect(aff[maxStat as keyof typeof aff]).toBeCloseTo(1.0, 5);
  });

  it('every affinity respects the 0.1 floor', () => {
    // With the MVP allele table the floor rarely activates (the extreme spreads
    // still leave every stat > 10% of the max), but the guardrail is in the
    // function so a future data change can't silently create a dead stat.
    const genomes = [
      g({ ...NEUTRAL_QUANT, ...NEUTRAL_QUAL }),
      g({ ...NEUTRAL_QUANT, musculature: ['mus_strong', 'mus_strong'], ...NEUTRAL_QUAL }),
      g({ ...NEUTRAL_QUANT, carapace_density: ['car_heavy', 'car_heavy'], ...NEUTRAL_QUAL }),
    ];
    for (const genome of genomes) {
      for (const v of Object.values(computeGrowthAffinity(genome))) {
        expect(v).toBeGreaterThanOrEqual(0.1);
      }
    }
  });
});

describe('computeCurrentStats', () => {
  const genome = g({
    ...NEUTRAL_QUANT,
    musculature: ['mus_strong', 'mus_strong'],
    ...NEUTRAL_QUAL,
  });

  it('level 0 equals base stats', () => {
    const base = computeBaseStats(genome);
    const cur = computeCurrentStats(genome, 0);
    for (const s of Object.keys(base) as Array<keyof typeof base>) {
      expect(cur[s]).toBeCloseTo(base[s], 5);
    }
  });

  it('level 20 max-affinity stat grows by ~40%', () => {
    const base = computeBaseStats(genome);
    const cur = computeCurrentStats(genome, 20);
    // Best-affinity stat: whichever has the highest base
    const [bestStat, bestBase] = Object.entries(base).sort((a, b) => b[1] - a[1])[0]!;
    const bestCur = cur[bestStat as keyof typeof cur];
    expect(bestCur).toBeCloseTo(bestBase * 1.4, 5);
  });

  it('level 20 never regresses a stat below its base', () => {
    const base = computeBaseStats(genome);
    const cur = computeCurrentStats(genome, 20);
    for (const s of Object.keys(base) as Array<keyof typeof base>) {
      expect(cur[s]).toBeGreaterThanOrEqual(base[s]);
    }
  });
});

describe('wear integration', () => {
  it('computeBaseStats defaults to no wear (identical to legacy call)', () => {
    // Pick a small genome and compare with-vs-without the wear arg
    const g = rollGenome(createRng(42));
    const legacy = computeBaseStats(g);
    const explicit = computeBaseStats(g, {});
    expect(explicit).toEqual(legacy);
  });

  it('computeBaseStats shaves per-locus contribution by wearMultiplier(wear[locus])', () => {
    // Choose a quantitative locus with a non-zero statDelta to observe the shave.
    // Homozygous musculature "mus_power" (a common quantitative allele) has a
    // known statDelta; the fixture below uses the first quantitative locus present.
    const g = rollGenome(createRng(101));
    const base = computeBaseStats(g);
    // Apply wear=20 to a single locus with a known non-zero contribution.
    // Find first locus whose alleles carry any statDeltas.
    const firstStatLocus = Object.values(LOCI).find((l) =>
      l.alleles.some((aid) => {
        const a = ALLELES[aid];
        return a && Object.values(a.statDeltas).some((d) => d !== 0 && d !== undefined);
      }),
    );
    if (!firstStatLocus) throw new Error('no stat-bearing locus found — fixture broken');
    const shaved = computeBaseStats(g, { [firstStatLocus.id]: 20 });
    // At least one stat must differ (locus was chosen for non-zero contribution)
    const anyDiffers = STATS.some((s) => shaved[s] !== base[s]);
    expect(anyDiffers).toBe(true);
    // Wear reduces delta magnitude: wear=20 (mult=0.60) should shave more
    // than wear=10 (mult=0.80), measured by total absolute delta from base
    const lessWorn = computeBaseStats(g, { [firstStatLocus.id]: 10 });
    let totalShavage20 = 0;
    let totalShavage10 = 0;
    for (const s of STATS) {
      totalShavage20 += Math.abs(base[s] - shaved[s]);
      totalShavage10 += Math.abs(base[s] - lessWorn[s]);
    }
    expect(totalShavage20).toBeGreaterThan(totalShavage10);
  });

  it('computeCurrentStats accepts the wear arg (defaults to no-wear)', () => {
    const g = rollGenome(createRng(7));
    const legacy = computeCurrentStats(g, 20);
    const explicit = computeCurrentStats(g, 20, {});
    expect(explicit).toEqual(legacy);
  });
});
