import type { Genome, Stat } from './types';
import { STATS } from './types';
import { ALLELES } from './data/loci';
import { expressPhenotype } from './genome';

export const BASE_STATS: Readonly<Record<Stat, number>> = Object.freeze({
  PWR: 10,
  VIT: 10,
  SPD: 10,
  INT: 10,
  GUI: 10,
});

/**
 * Base stats = BASE + Σ statDeltas over every contributing allele.
 *
 * For quantitative loci: BOTH alleles contribute (no dominance — that's the
 * "smooth intermediate offspring" property from game-spec §2).
 * For qualitative loci: ONLY the expressed allele contributes (dominance
 * resolved by expressPhenotype).
 * Floored at 0.
 */
export function computeBaseStats(genome: Genome): Record<Stat, number> {
  const result: Record<Stat, number> = { ...BASE_STATS };
  const phen = expressPhenotype(genome);

  for (const [locusId, pair] of Object.entries(genome.loci)) {
    const first = alleleOrThrow(pair[0]);
    const isQuantitative = first.dominance === undefined && locusId !== 'palette';
    if (isQuantitative) {
      for (const alleleId of pair) addDeltas(result, alleleOrThrow(alleleId));
    } else {
      const expressedId = phen.expressed[locusId];
      if (expressedId) addDeltas(result, alleleOrThrow(expressedId));
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

function addDeltas(target: Record<Stat, number>, allele: { statDeltas: Partial<Record<Stat, number>> }): void {
  for (const s of STATS) {
    const d = allele.statDeltas[s];
    if (d !== undefined) target[s] += d;
  }
}

/**
 * Growth affinity per stat: base[stat] / maxBase, floored at 0.1.
 * Strongest stat = 1.0. Weakest stat still grows (0.1) so no stat is dead.
 */
export function computeGrowthAffinity(genome: Genome): Record<Stat, number> {
  const base = computeBaseStats(genome);
  const maxBase = Math.max(...STATS.map((s) => base[s]));
  const out = {} as Record<Stat, number>;
  for (const s of STATS) {
    const raw = maxBase > 0 ? base[s] / maxBase : 0;
    out[s] = Math.max(0.1, raw);
  }
  return out;
}

/**
 * Current stats = base * (1 + 0.02 * level * affinity).
 * At level 20 with affinity=1.0 → base * 1.4 (the +40% cap from game-spec §5).
 * Caller enforces the level cap.
 */
export function computeCurrentStats(genome: Genome, level: number): Record<Stat, number> {
  const base = computeBaseStats(genome);
  const affinity = computeGrowthAffinity(genome);
  const out = {} as Record<Stat, number>;
  for (const s of STATS) {
    out[s] = base[s] * (1 + 0.02 * level * affinity[s]);
  }
  return out;
}
