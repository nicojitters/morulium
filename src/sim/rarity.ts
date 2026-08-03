import type { Genome, Tier } from './types';
import { ALLELES } from './data/loci';

/**
 * Sum rarityWeight over both alleles at every locus. Returning only a tier
 * (never the score) keeps the number hidden from any caller — principle 5.
 */
export function computeRarity(genome: Genome): Tier {
  let score = 0;
  for (const pair of Object.values(genome.loci)) {
    for (const alleleId of pair) {
      const allele = ALLELES[alleleId];
      if (!allele) throw new Error(`unknown allele in genome: ${alleleId}`);
      score += allele.rarityWeight;
    }
  }
  return tierForScore(score);
}

function tierForScore(score: number): Tier {
  if (score <= 2) return 'Basic';
  if (score <= 10) return 'Variant';
  if (score <= 14) return 'Adapted';
  if (score <= 19) return 'Evolved';
  return 'Apex';
}
