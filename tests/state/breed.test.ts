import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  DAILY_BREED_LIMIT,
  BREED_SUBSTREAM_PRIME,
  breedsRemaining,
} from '../../src/state/breed';

describe('breed constants', () => {
  it('DAILY_BREED_LIMIT is 3', () => expect(DAILY_BREED_LIMIT).toBe(3));
  it('BREED_SUBSTREAM_PRIME is 1_000_033', () => expect(BREED_SUBSTREAM_PRIME).toBe(1_000_033));
});

describe('breedsRemaining', () => {
  afterEach(() => vi.useRealTimers());

  it('returns full limit when day key is stale', () => {
    const today = new Date(2026, 7, 4, 12, 0, 0).getTime();
    expect(
      breedsRemaining({ breedsToday: 3, breedDayKey: '2026-08-03' }, today),
    ).toBe(DAILY_BREED_LIMIT);
  });

  it('subtracts breedsToday when day matches', () => {
    const today = new Date(2026, 7, 4, 12, 0, 0).getTime();
    expect(
      breedsRemaining({ breedsToday: 2, breedDayKey: '2026-08-04' }, today),
    ).toBe(1);
  });

  it('floors at 0 (defensive)', () => {
    const today = new Date(2026, 7, 4, 12, 0, 0).getTime();
    expect(
      breedsRemaining({ breedsToday: 99, breedDayKey: '2026-08-04' }, today),
    ).toBe(0);
  });
});
