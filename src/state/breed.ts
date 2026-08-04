import { todayLocalKey } from './harvest';

export const DAILY_BREED_LIMIT = 3 as const;
export const BREED_SUBSTREAM_PRIME = 1_000_033 as const;
// M6: replace or augment the Breed cap with Serum cost

/**
 * How many Breeds remain today given the store's breed counters.
 * If the stored day key is behind the current local day, returns the full limit.
 */
export function breedsRemaining(
  state: { readonly breedsToday: number; readonly breedDayKey: string },
  now: number = Date.now(),
): number {
  if (state.breedDayKey !== todayLocalKey(now)) return DAILY_BREED_LIMIT;
  return Math.max(0, DAILY_BREED_LIMIT - state.breedsToday);
}
