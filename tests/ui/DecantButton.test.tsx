// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { DecantButton } from '../../src/ui/components/DecantButton';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey, DAILY_HARVEST_LIMIT } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';
import { REST_MAX } from '../../src/state/rest';
import type { Unit } from '../../src/state/types';

describe('DecantButton', () => {
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
      freeDecantsRemaining: 0,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders with default header label including N/3', () => {
    const { getByTestId } = render(<DecantButton />);
    expect(getByTestId('decant-button').textContent).toBe('Decant a Morula (3/3)');
  });

  it('renders with a custom label (bypasses N/3 suffix) when label prop is set', () => {
    const { getByTestId } = render(<DecantButton label="Decant your first Morula" />);
    expect(getByTestId('decant-button').textContent).toBe('Decant your first Morula');
  });

  it('calls decant() on click and adds a unit to the store', () => {
    const { getByTestId } = render(<DecantButton />);
    expect(useColonyStore.getState().units).toHaveLength(0);
    fireEvent.click(getByTestId('decant-button'));
    expect(useColonyStore.getState().units).toHaveLength(1);
    expect(useColonyStore.getState().lastDecantedId).toBe(1);
  });

  it('label reflects harvests remaining', () => {
    useColonyStore.setState({
      units: [], nextId: 2, lastDecantedId: null,
      harvestsToday: 2, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    const { getByTestId } = render(<DecantButton />);
    expect(getByTestId('decant-button').textContent).toBe('Decant a Morula (1/3)');
  });

  it('renders disabled with countdown label when limit hit', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4, 16, 37, 0)); // 7h 23m to midnight
    useColonyStore.setState({
      units: [], nextId: 4, lastDecantedId: null,
      harvestsToday: 3, harvestDayKey: '2026-08-04',
      droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    const { getByTestId } = render(<DecantButton />);
    const btn = getByTestId('decant-button');
    expect(btn.textContent).toBe('Next Harvest in 7h 23m');
    expect(btn.getAttribute('disabled')).not.toBeNull();
    expect(btn.getAttribute('data-disabled')).toBe('true');
  });

  it('shows free count in label when freeDecantsRemaining > 0', () => {
    useColonyStore.setState({ freeDecantsRemaining: 3 });
    const { getByTestId } = render(<DecantButton />);
    expect(getByTestId('decant-button').textContent).toContain('free ×3');
  });

  it('click is a no-op when disabled — store state unchanged', () => {
    useColonyStore.setState({
      units: [], nextId: 4, lastDecantedId: null,
      harvestsToday: 3, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    const { getByTestId } = render(<DecantButton />);
    fireEvent.click(getByTestId('decant-button'));
    expect(useColonyStore.getState().units).toHaveLength(0);
    expect(useColonyStore.getState().harvestsToday).toBe(3);
  });
});

describe('DecantButton cap-aware state (M7b)', () => {
  beforeEach(() => {
    localStorage.clear();
    // Seed a full Colony (20 units) with Barracks not built
    const units: Unit[] = [];
    for (let i = 1; i <= 20; i++) {
      units.push({
        id: i, seed: i, decantedAt: i, genome: { loci: {} },
        generation: 0, parentIds: null, wear: {},
        restCurrent: REST_MAX, injuredUntil: null, culled: false,
      });
    }
    useColonyStore.setState({
      units, nextId: 21,
      lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(),
      droughtCount: 0, breedsToday: 0, breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS, activeIncursion: null,
      serum: 200, stims: 0, lastGarrisonTickAt: Date.now(),
      buildings: { barracks: false, medbay: false },
      lastRestTickAt: Date.now(),
    });
  });
  afterEach(() => cleanup());

  it('disabled with data-disabled-reason="cap" at cap 20', () => {
    const { getByTestId } = render(<DecantButton />);
    const btn = getByTestId('decant-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('data-disabled-reason')).toBe('cap');
    expect(btn.textContent).toContain('Colony full');
  });

  it('harvest-limit label wins over cap label when both apply', () => {
    // Set harvestsToday = DAILY_HARVEST_LIMIT to hit that limit too
    useColonyStore.setState({ harvestsToday: DAILY_HARVEST_LIMIT });
    const { getByTestId } = render(<DecantButton />);
    const btn = getByTestId('decant-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    // Label should reflect harvest-limit (existing precedence)
    expect(btn.textContent).toContain('Next Harvest in');
  });
});
