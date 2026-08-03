import type { Genome, Tier } from './types';
import { LOCI } from './data/loci';
import { resolveExpressed } from './genome';

/**
 * Rarity sums the expressed allele's rarityWeight over every QUALITATIVE locus.
 * Quantitative loci contribute 0 — rarity and combat power are independent axes.
 * A recessive carrier scores 0 at that locus because the recessive isn't expressed.
 * Returns both the raw score (needed for tuning / verify harness) and the tier.
 */
export function computeRarity(genome: Genome): { score: number; tier: Tier } {
  let score = 0;
  for (const [locusId, pair] of Object.entries(genome.loci)) {
    const locus = LOCI[locusId];
    if (!locus) throw new Error(`unknown locus in genome: ${locusId}`);
    if (locus.type !== 'qualitative') continue;
    score += resolveExpressed(locus, pair).rarityWeight;
  }
  return { score, tier: tierForScore(score) };
}

function tierForScore(score: number): Tier {
  if (score <= 2) return 'Basic';
  if (score <= 10) return 'Variant';
  if (score <= 14) return 'Adapted';
  if (score <= 19) return 'Evolved';
  return 'Apex';
}
