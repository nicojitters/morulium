import type { Genome, Tier } from '../sim/types';
import { rollGenome } from '../sim/genome';
import { createRng } from '../sim/rng';
import { computeRarity } from '../sim/rarity';

export const DROUGHT_THRESHOLD = 30 as const;
export const FAILSAFE_INDICATOR_APPEARS_AT = 20 as const;
export const FAILSAFE_MIN_TIER: Tier = 'chimera';
export const FAILSAFE_SUBSTREAM_PRIME = 1_000_003 as const;
const MAX_ATTEMPTS = 1000;

const TIER_RANK: Record<Tier, number> = {
  baseline: 0,
  strain: 1,
  mutant: 2,
  chimera: 3,
  progenitor: 4,
};

/**
 * True iff `actual` is at least as rare as `minimum` in the tier ladder.
 * baseline < strain < mutant < chimera < progenitor.
 */
export function tierAtLeast(actual: Tier, minimum: Tier): boolean {
  return TIER_RANK[actual] >= TIER_RANK[minimum];
}

/**
 * Rejection-sampling roll: keep rolling from the substream until a genome
 * satisfies the minimum tier. Deterministic given (subseed, minTier).
 *
 * Called by the Colony store's decant() when droughtCount >= DROUGHT_THRESHOLD.
 * The substream seed is `nextId * FAILSAFE_SUBSTREAM_PRIME` so guaranteed rolls
 * are drawn from a completely separate deterministic sequence than the main
 * `createRng(nextId)` used by normal Decants.
 */
export function rollGenomeAtLeast(subseed: number, minTier: Tier): Genome {
  for (let offset = 0; offset < MAX_ATTEMPTS; offset++) {
    const g = rollGenome(createRng(subseed + offset));
    if (tierAtLeast(computeRarity(g).tier, minTier)) return g;
  }
  throw new Error(`rollGenomeAtLeast: exceeded ${MAX_ATTEMPTS} attempts for tier ${minTier}`);
}
