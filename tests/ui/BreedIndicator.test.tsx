// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { BreedIndicator } from '../../src/ui/components/BreedIndicator';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';

describe('BreedIndicator', () => {
  beforeEach(() => {
    useColonyStore.setState({
      units: [], nextId: 1, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS,
      activeIncursion: null,
      serum: SERUM_STARTING_BALANCE,
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders "Breed 3/3" on a fresh day', () => {
    const { getByTestId } = render(<BreedIndicator />);
    expect(getByTestId('breed-indicator').textContent).toBe('Breed 3/3');
  });

  it('renders "Breed 1/3" when 2 have been used', () => {
    useColonyStore.setState({ breedsToday: 2, breedDayKey: todayLocalKey() });
    const { getByTestId } = render(<BreedIndicator />);
    expect(getByTestId('breed-indicator').textContent).toBe('Breed 1/3');
  });

  it('renders "Next Breed in Xh Ym" when limit is hit', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4, 16, 37, 0)); // 7h 23m to midnight
    useColonyStore.setState({ breedsToday: 3, breedDayKey: '2026-08-04' });
    const { getByTestId } = render(<BreedIndicator />);
    expect(getByTestId('breed-indicator').textContent).toBe('Next Breed in 7h 23m');
  });

  it('countdown updates when 61+ seconds pass', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4, 16, 37, 0));
    useColonyStore.setState({ breedsToday: 3, breedDayKey: '2026-08-04' });
    const { getByTestId } = render(<BreedIndicator />);
    expect(getByTestId('breed-indicator').textContent).toBe('Next Breed in 7h 23m');

    // Trigger the 60s interval tick
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    // Then set system time forward 1 minute
    act(() => {
      vi.setSystemTime(new Date(2026, 7, 4, 16, 38, 0));
    });
    expect(getByTestId('breed-indicator').textContent).toBe('Next Breed in 7h 22m');
  });
});
