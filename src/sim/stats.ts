import type { Genome, Stat } from './types';
import { STATS } from './types';
import { ALLELES, LOCI } from './data/loci';
import { resolveExpressed } from './genome';
import { wearMultiplier } from './wear';

export const BASE_STATS: Readonly<Record<Stat, number>> = Object.freeze({
  PWR: 10,
  VIT: 10,
  SPD: 10,
  INT: 10,
  GUI: 10,
});

type Wear = Readonly<Record<string, number>>;
const NO_WEAR: Wear = {};

/**
 * Base stats = BASE + Σ (statDelta * wearMultiplier(wear[locusId] ?? 0))
 * over every contributing allele.
 *
 * For quantitative loci: BOTH alleles contribute (no dominance).
 * For qualitative loci: ONLY the expressed allele contributes.
 * Every locus's contribution is scaled by wearMultiplier at that locus.
 * Legacy callers pass no `wear` — default is {} → multiplier 1.0 everywhere.
 * Floored at 0.
 */
export function computeBaseStats(genome: Genome, wear: Wear = NO_WEAR): Record<Stat, number> {
  const result: Record<Stat, number> = { ...BASE_STATS };

  for (const [locusId, pair] of Object.entries(genome.loci)) {
    const locus = LOCI[locusId];
    if (!locus) throw new Error(`unknown locus in genome: ${locusId}`);

    const mult = wearMultiplier(wear[locusId] ?? 0);

    if (locus.type === 'quantitative') {
      for (const alleleId of pair) addDeltas(result, alleleOrThrow(alleleId), mult);
    } else {
      addDeltas(result, resolveExpressed(locus, pair), mult);
    }
  }

  for (const s of STATS) {
    if (result[s] < 0) result[s] = 0;
  }
  return result;
}

function alleleOrThrow(id: string) {
  const a = ALLELES[id];
  if (!a) throw new Error(`unknown allele: ${id}`);
  return a;
}

function addDeltas(
  target: Record<Stat, number>,
  allele: { statDeltas: Partial<Record<Stat, number>> },
  mult: number,
): void {
  for (const s of STATS) {
    const d = allele.statDeltas[s];
    if (d !== undefined) target[s] += d * mult;
  }
}

/**
 * Growth affinity per stat: base[stat] / maxBase, floored at 0.1.
 * Derived from the (wear-shaved) base stats — a heavily-degraded unit's
 * growth ratios reflect its degraded output.
 */
export function computeGrowthAffinity(genome: Genome, wear: Wear = NO_WEAR): Record<Stat, number> {
  const base = computeBaseStats(genome, wear);
  const maxBase = Math.max(...STATS.map((s) => base[s]));
  const out = {} as Record<Stat, number>;
  for (const s of STATS) {
    const raw = maxBase > 0 ? base[s] / maxBase : 0;
    out[s] = Math.max(0.1, raw);
  }
  return out;
}

/**
 * Current stats = base * (1 + 0.02 * level * affinity) * restPenalty.
 * At level 20 with affinity=1.0 and restPenalty=1.0 → base * 1.4 (+40% cap).
 * restPenalty defaults to 1.0 — under-rested units pass 0.7 (M6b).
 * Caller enforces the level cap.
 */
export function computeCurrentStats(
  genome: Genome,
  level: number,
  wear: Wear = NO_WEAR,
  restPenalty: number = 1.0,
): Record<Stat, number> {
  const base = computeBaseStats(genome, wear);
  const affinity = computeGrowthAffinity(genome, wear);
  const out = {} as Record<Stat, number>;
  for (const s of STATS) {
    out[s] = base[s] * (1 + 0.02 * level * affinity[s]) * restPenalty;
  }
  return out;
}
