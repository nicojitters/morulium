import type { Stat } from './types';
import type { Unit } from '../state/types';
import type { FrontProfile, FrontId } from './data/fronts';
import type { CoverageBand } from './coverage-bands';
import { bandForCoverage, BAND_PHRASES } from './coverage-bands';
import { computeCurrentStats } from './stats';

export const TEAM_SIZE = 4 as const;
export const COVERAGE_CLIP = 1.2 as const;
export const SUCCESS_CUTOFF = 0.85 as const;
export const INCURSION_LEVEL = 20 as const;
export const INCURSION_SUBSTREAM_PRIME = 1_000_099 as const; // reserved for M6+; unused in M5

export interface IncursionBeat {
  readonly kind: 'launch' | 'stat' | 'verdict';
  readonly stat?: Stat;
  readonly band?: CoverageBand;
  readonly text: string;
}

export interface BestContributor {
  readonly unitId: number;
  readonly value: number;
}

export interface IncursionResolution {
  readonly frontId: FrontId;
  readonly teamIds: readonly [number, number, number, number];
  readonly coverage: Readonly<Partial<Record<Stat, number>>>;
  readonly bestContributors: Readonly<Partial<Record<Stat, number>>>; // unitId per stat
  readonly successP: number;
  readonly outcome: 'won' | 'failed';
  readonly beats: readonly IncursionBeat[];
}

/**
 * For each requested stat, find the team member with the highest computed
 * stat value at INCURSION_LEVEL, wear applied. Ties break toward the earlier
 * team-list index (first-seen wins).
 */
export function bestContributorPerStat(
  team: readonly Unit[],
  requiredStats: readonly Stat[],
  restPenalties: Readonly<Record<number, number>> = {},
): Readonly<Partial<Record<Stat, BestContributor>>> {
  const out: Partial<Record<Stat, BestContributor>> = {};
  // Precompute per-unit stats once
  const perUnitStats: { unit: Unit; stats: Record<Stat, number> }[] = team.map((u) => ({
    unit: u,
    stats: computeCurrentStats(u.genome, INCURSION_LEVEL, u.wear, restPenalties[u.id] ?? 1.0),
  }));
  for (const s of requiredStats) {
    let best: BestContributor | undefined;
    for (const entry of perUnitStats) {
      const v = entry.stats[s];
      if (best === undefined || v > best.value) {
        best = { unitId: entry.unit.id, value: v };
      }
    }
    if (best !== undefined) out[s] = best;
  }
  return out;
}

/**
 * Deterministic Incursion resolution. Same team + front → identical output.
 * No RNG in M5.
 */
export function resolveIncursion(
  team: readonly Unit[],
  front: FrontProfile,
  restPenalties: Readonly<Record<number, number>> = {},
): IncursionResolution {
  if (team.length !== TEAM_SIZE) {
    throw new Error(`resolveIncursion: team size ${team.length} !== TEAM_SIZE ${TEAM_SIZE}`);
  }

  // Extract required stats (keys of front.requirements where value !== undefined),
  // preserving Object.keys order — this becomes the beat order.
  const requiredStatsOrdered: Stat[] = [];
  for (const s of Object.keys(front.requirements) as Stat[]) {
    if (front.requirements[s] !== undefined) requiredStatsOrdered.push(s);
  }

  const bests = bestContributorPerStat(team, requiredStatsOrdered, restPenalties);

  const coverage: Partial<Record<Stat, number>> = {};
  const bestContributors: Partial<Record<Stat, number>> = {};
  for (const s of requiredStatsOrdered) {
    const req = front.requirements[s]!;
    const best = bests[s]!;
    if (req.threshold === 0) {
      // Defensive: threshold 0 means "any positive value clears it".
      coverage[s] = best.value > 0 ? COVERAGE_CLIP : 0;
    } else {
      coverage[s] = Math.min(COVERAGE_CLIP, best.value / req.threshold);
    }
    bestContributors[s] = best.unitId;
  }

  let successP = 1;
  for (const s of requiredStatsOrdered) {
    const c = coverage[s]!;
    const w = front.requirements[s]!.weight;
    successP *= c ** w;
  }

  const outcome: 'won' | 'failed' = successP >= SUCCESS_CUTOFF ? 'won' : 'failed';

  const beats: IncursionBeat[] = [];
  beats.push({ kind: 'launch', text: front.flavor.launchBlurb });
  for (const s of requiredStatsOrdered) {
    const c = coverage[s]!;
    const band = bandForCoverage(c);
    beats.push({ kind: 'stat', stat: s, band, text: BAND_PHRASES[s][band] });
  }
  beats.push({
    kind: 'verdict',
    text: outcome === 'won' ? front.flavor.winBlurb : front.flavor.failBlurb,
  });

  return {
    frontId: front.id,
    teamIds: [team[0]!.id, team[1]!.id, team[2]!.id, team[3]!.id] as const,
    coverage,
    bestContributors,
    successP,
    outcome,
    beats,
  };
}
