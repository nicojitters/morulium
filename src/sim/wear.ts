import { LOCI } from './data/loci';

export const PER_GEN_WEAR = 0.02 as const;
export const WEAR_FLOOR = 0.60 as const;

/**
 * Linear wear multiplier for a single locus. Bred loci lose stat output
 * proportionally to their wear count, floored at WEAR_FLOOR (0.60).
 * Multiplier == 1.0 at wearCount == 0 (pristine).
 */
export function wearMultiplier(wearCount: number): number {
  return Math.max(WEAR_FLOOR, 1 - PER_GEN_WEAR * wearCount);
}

/**
 * Compute the child's wear map from the two parents' wear + the loci that
 * mutated during breeding.
 *
 * Rules:
 *   - For each locus in LOCI:
 *     - If mutatedLoci.has(locus) → omit (absent-key ≡ 0 per design spec)
 *     - Else → parentA.wear[locus] + parentB.wear[locus] + 1
 *   - Absent parent keys read as 0 (never throws)
 */
export function nextWear(
  parentA: { readonly wear: Readonly<Record<string, number>> },
  parentB: { readonly wear: Readonly<Record<string, number>> },
  mutatedLoci: ReadonlySet<string>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const locusId of Object.keys(LOCI)) {
    if (mutatedLoci.has(locusId)) continue;
    const wA = parentA.wear[locusId] ?? 0;
    const wB = parentB.wear[locusId] ?? 0;
    out[locusId] = wA + wB + 1;
  }
  return out;
}
