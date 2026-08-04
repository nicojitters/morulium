import type { Genome, Allele } from './types';
import { LOCI, ALLELES } from './data/loci';
import type { SeededRng } from './rng';
import { weightedPick } from './pick';

export const MUTATION_RATE = 0.015 as const;

export interface BreedResult {
  readonly genome: Genome;
  readonly mutatedLoci: ReadonlySet<string>;
}

/**
 * Mendelian breed with per-allele mutation.
 *
 * For each locus:
 *   1) inherit one allele from parentA (50/50 which of pA's two)
 *   2) inherit one allele from parentB (50/50 which of pB's two)
 *   3) per-allele mutation gate: re-roll via weightedPick over drawWeight
 *
 * RNG-call order is fixed and must not change without a versioning story:
 *   parent-A side pick, parent-B side pick, mutation gate A, [reroll A],
 *   mutation gate B, [reroll B].
 *
 * If either allele mutates at a locus, that locus is added to mutatedLoci —
 * the caller uses this to clear that locus's wear (see sim/wear.ts).
 */
export function breedGenome(
  parentA: Genome,
  parentB: Genome,
  rng: SeededRng,
  mutationRate: number = MUTATION_RATE,
): BreedResult {
  const loci: Record<string, readonly [string, string]> = {};
  const mutatedLoci = new Set<string>();

  for (const locus of Object.values(LOCI)) {
    const pairA = parentA.loci[locus.id];
    const pairB = parentB.loci[locus.id];
    if (!pairA) throw new Error(`breedGenome: parentA missing locus ${locus.id}`);
    if (!pairB) throw new Error(`breedGenome: parentB missing locus ${locus.id}`);

    // 1) inherit from parent A
    let inheritedA = rng.next() < 0.5 ? pairA[0] : pairA[1];
    // 2) inherit from parent B
    let inheritedB = rng.next() < 0.5 ? pairB[0] : pairB[1];

    // Pool for re-roll (weighted by drawWeight, same as Harvest)
    const pool: Allele[] = locus.alleles.map((id) => {
      const a = ALLELES[id];
      if (!a) throw new Error(`breedGenome: unknown allele in locus ${locus.id}: ${id}`);
      return a;
    });

    // 3) per-allele mutation gate
    if (rng.next() < mutationRate) {
      inheritedA = weightedPick(pool, rng).id;
      mutatedLoci.add(locus.id);
    }
    if (rng.next() < mutationRate) {
      inheritedB = weightedPick(pool, rng).id;
      mutatedLoci.add(locus.id);
    }

    loci[locus.id] = [inheritedA, inheritedB] as const;
  }

  return { genome: { loci }, mutatedLoci };
}
