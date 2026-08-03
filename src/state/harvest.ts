export const DAILY_HARVEST_LIMIT = 3 as const;

/**
 * Returns YYYY-MM-DD in the user's local timezone. Optional `now` param for tests.
 */
export function todayLocalKey(now: number = Date.now()): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Milliseconds from `now` until the next local-midnight (00:00:00 of the next day).
 * At exactly midnight, returns a full day (86_400_000) rather than 0 so the
 * countdown UI never displays "0 seconds until reset."
 */
export function millisUntilLocalMidnight(now: number = Date.now()): number {
  const d = new Date(now);
  const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  const delta = nextMidnight.getTime() - now;
  return delta === 0 ? 86_400_000 : delta;
}

/**
 * How many Decants remain today given the store's harvest counters.
 * If the stored day key is behind the current local day, returns the full limit.
 */
export function harvestsRemaining(
  state: { readonly harvestsToday: number; readonly harvestDayKey: string },
  now: number = Date.now(),
): number {
  if (state.harvestDayKey !== todayLocalKey(now)) return DAILY_HARVEST_LIMIT;
  return Math.max(0, DAILY_HARVEST_LIMIT - state.harvestsToday);
}
