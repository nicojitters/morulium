import type { FrontId } from '../sim/data/fronts';
import type { FrontState } from './incursion';

export const GARRISON_TARGET = 2 as const;
export const GARRISON_MIN = 1 as const;
export const GARRISON_INCOME_PER_UNIT_PER_HOUR = 5 as const;
export const GARRISON_GRACE_MS = 30 * 60 * 1000;
export const FLARE_COOLDOWN_MS = 30 * 60 * 1000;
export const RADICALIZATION_BONUS = 4 as const;

/**
 * Passive Serum income earned by garrisoned units since lastTickAt.
 * Floored at 0 (defensive against clock drift), integer via Math.floor.
 * Caller advances lastTickAt by exactly the whole-hour-worth credited
 * so fractional SR isn't lost across many small store actions.
 */
export function computeGarrisonIncome(
  garrisonedCount: number,
  lastTickAt: number,
  now: number,
): number {
  const msElapsed = Math.max(0, now - lastTickAt);
  const hoursElapsed = msElapsed / (60 * 60 * 1000);
  return Math.floor(garrisonedCount * GARRISON_INCOME_PER_UNIT_PER_HOUR * hoursElapsed);
}

/**
 * Sum of RADICALIZATION_BONUS for every OTHER front that is currently captured.
 * Self is excluded (a captured front doesn't harden itself).
 * Returns 0 if no other fronts are captured.
 */
export function computeHardeningFor(
  frontId: FrontId,
  fronts: Readonly<Record<FrontId, FrontState>>,
): number {
  let bonus = 0;
  for (const otherId of Object.keys(fronts) as FrontId[]) {
    if (otherId === frontId) continue;
    if (fronts[otherId].captured) bonus += RADICALIZATION_BONUS;
  }
  return bonus;
}
