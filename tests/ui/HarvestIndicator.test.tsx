// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { HarvestIndicator } from '../../src/ui/components/HarvestIndicator';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';

describe('HarvestIndicator', () => {
  beforeEach(() => {
    useColonyStore.setState({
      units: [], nextId: 1, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS,
      activeIncursion: null,
      serum: SERUM_STARTING_BALANCE,
      stims: 0,
      lastGarrisonTickAt: Date.now(),   // NEW
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders "Harvest 3/3" on a fresh day', () => {
    const { getByTestId } = render(<HarvestIndicator />);
    expect(getByTestId('harvest-indicator').textContent).toBe('Harvest 3/3');
  });

  it('renders "Harvest 1/3" when 2 have been used today', () => {
    useColonyStore.setState({
      units: [], nextId: 3, lastDecantedId: null,
      harvestsToday: 2, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    const { getByTestId } = render(<HarvestIndicator />);
    expect(getByTestId('harvest-indicator').textContent).toBe('Harvest 1/3');
  });

  it('renders "Next Harvest in Xh Ym" when limit is hit', () => {
    // Set time to 4:37 PM local — 7 hours 23 minutes until midnight
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4, 16, 37, 0));
    useColonyStore.setState({
      units: [], nextId: 4, lastDecantedId: null,
      harvestsToday: 3, harvestDayKey: '2026-08-04',
      droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    const { getByTestId } = render(<HarvestIndicator />);
    expect(getByTestId('harvest-indicator').textContent).toBe('Next Harvest in 7h 23m');
  });

  it('countdown updates when 61+ seconds pass', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4, 16, 37, 0));
    useColonyStore.setState({
      units: [], nextId: 4, lastDecantedId: null,
      harvestsToday: 3, harvestDayKey: '2026-08-04',
      droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    const { getByTestId } = render(<HarvestIndicator />);
    expect(getByTestId('harvest-indicator').textContent).toBe('Next Harvest in 7h 23m');

    // Trigger the 60s interval tick
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    // Then set system time forward 1 minute
    act(() => {
      vi.setSystemTime(new Date(2026, 7, 4, 16, 38, 0));
    });
    expect(getByTestId('harvest-indicator').textContent).toBe('Next Harvest in 7h 22m');
  });
});
