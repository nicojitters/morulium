import { createRng } from './rng';

export const INJURY_CHANCE = 0.15 as const;

/**
 * Roll injuries for each under-rested unit in restPenalties.
 * Iterates keys in sorted numeric order so results are deterministic
 * regardless of insertion order.
 *
 * Rules:
 * - Empty restPenalties → empty result.
 * - value === 1.0 entries are skipped (defensive — only sub-1.0 =
 *   under-rested = at risk).
 * - For each remaining entry, roll createRng(seedBase + rollIndex).next()
 *   < INJURY_CHANCE. rollIndex increments per entry in sorted order.
 */
export function rollInjuries(
  restPenalties: Readonly<Record<number, number>>,
  seedBase: number,
): Readonly<Record<number, boolean>> {
  const out: Record<number, boolean> = {};
  const ids = Object.keys(restPenalties)
    .map((k) => Number(k))
    .filter((id) => (restPenalties[id] ?? 1.0) < 1.0)
    .sort((a, b) => a - b);
  ids.forEach((id, rollIndex) => {
    const rng = createRng(seedBase + rollIndex);
    out[id] = rng.next() < INJURY_CHANCE;
  });
  return out;
}
