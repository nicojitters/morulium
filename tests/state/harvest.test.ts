import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  DAILY_HARVEST_LIMIT,
  todayLocalKey,
  millisUntilLocalMidnight,
  harvestsRemaining,
} from '../../src/state/harvest';

describe('harvest helpers', () => {
  afterEach(() => vi.useRealTimers());

  it('DAILY_HARVEST_LIMIT is 3', () => {
    expect(DAILY_HARVEST_LIMIT).toBe(3);
  });

  it('todayLocalKey returns YYYY-MM-DD in local time', () => {
    // Use a specific local timestamp — 2026-08-04 12:00:00 local time
    const noon = new Date(2026, 7, 4, 12, 0, 0).getTime(); // month is 0-indexed: 7 = August
    expect(todayLocalKey(noon)).toBe('2026-08-04');
  });

  it('todayLocalKey handles single-digit months and days with zero-padding', () => {
    const feb3 = new Date(2026, 1, 3, 9, 30, 0).getTime();
    expect(todayLocalKey(feb3)).toBe('2026-02-03');
  });

  it('millisUntilLocalMidnight is 86_400_000 at exactly midnight', () => {
    const midnight = new Date(2026, 7, 4, 0, 0, 0).getTime();
    expect(millisUntilLocalMidnight(midnight)).toBe(86_400_000);
  });

  it('millisUntilLocalMidnight returns positive < 86_400_000 at noon', () => {
    const noon = new Date(2026, 7, 4, 12, 0, 0).getTime();
    const ms = millisUntilLocalMidnight(noon);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThan(86_400_000);
    // noon → midnight = 12h = 43_200_000 ms
    expect(ms).toBe(43_200_000);
  });

  it('harvestsRemaining returns full limit when day has rolled over', () => {
    const today = new Date(2026, 7, 4, 12, 0, 0).getTime();
    expect(
      harvestsRemaining({ harvestsToday: 3, harvestDayKey: '2026-08-03' }, today),
    ).toBe(DAILY_HARVEST_LIMIT);
  });

  it('harvestsRemaining subtracts harvestsToday when day matches', () => {
    const today = new Date(2026, 7, 4, 12, 0, 0).getTime();
    expect(
      harvestsRemaining({ harvestsToday: 2, harvestDayKey: '2026-08-04' }, today),
    ).toBe(1);
  });

  it('harvestsRemaining floors at 0 (defensive)', () => {
    const today = new Date(2026, 7, 4, 12, 0, 0).getTime();
    expect(
      harvestsRemaining({ harvestsToday: 99, harvestDayKey: '2026-08-04' }, today),
    ).toBe(0);
  });
});
