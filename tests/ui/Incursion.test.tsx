// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { Incursion } from '../../src/ui/screens/Incursion';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';
import { rollGenome } from '../../src/sim/genome';
import { createRng } from '../../src/sim/rng';
import type { Unit } from '../../src/state/types';

function unit(id: number, seed = id): Unit {
  return {
    id, seed, decantedAt: 100 * id,
    genome: rollGenome(createRng(seed * 101)),
    generation: 0, parentIds: null, wear: {},
    restCurrent: 100, injuredUntil: null,  // M6b — literal 100 avoids state-layer import
  };
}

function reset(units: Unit[] = [], fronts = FRESH_FRONTS) {
  useColonyStore.setState({
    units, nextId: units.length + 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(),
    droughtCount: 0,
    breedsToday: 0, breedDayKey: todayLocalKey(),
    fronts, activeIncursion: null,
    serum: SERUM_STARTING_BALANCE,
    stims: 0,
  });
}

describe('Incursion screen', () => {
  beforeEach(() => {
    reset();
    vi.useRealTimers();
  });
  afterEach(() => cleanup());

  it('shows empty state when Colony has < 4 units', () => {
    reset([unit(1), unit(2), unit(3)]);
    const { getByTestId, queryByTestId } = render(<Incursion />);
    expect(getByTestId('incursion-empty-state')).toBeDefined();
    expect(queryByTestId('incursion-picker-grid')).toBeNull();
  });

  it('renders front cards + team picker when Colony has >= 4 units', () => {
    reset([unit(1), unit(2), unit(3), unit(4)]);
    const { getByTestId } = render(<Incursion />);
    expect(getByTestId('front-card-infrastructure')).toBeDefined();
    expect(getByTestId('front-card-military')).toBeDefined();
    expect(getByTestId('front-card-guerrilla')).toBeDefined();
    expect(getByTestId('incursion-picker-grid')).toBeDefined();
  });

  it('Launch is disabled until a front + all 4 team slots are filled', () => {
    reset([unit(1), unit(2), unit(3), unit(4)]);
    const { getByTestId, getAllByTestId } = render(<Incursion />);

    // No front, no team → disabled
    expect(getByTestId('launch-incursion-button').getAttribute('data-disabled')).toBe('true');

    // Pick a front → still disabled
    fireEvent.click(getByTestId('front-card-infrastructure'));
    expect(getByTestId('launch-incursion-button').getAttribute('data-disabled')).toBe('true');

    // Fill all 4 slots
    const cards = getAllByTestId('specimen-card');
    fireEvent.click(cards[0]!);
    fireEvent.click(cards[1]!);
    fireEvent.click(cards[2]!);
    fireEvent.click(cards[3]!);
    expect(getByTestId('launch-incursion-button').getAttribute('data-disabled')).toBeNull();
  });

  it('clicking a card that is already in a slot clears that slot', () => {
    reset([unit(1), unit(2), unit(3), unit(4)]);
    const { getAllByTestId, getByTestId } = render(<Incursion />);
    const cards = getAllByTestId('specimen-card');
    fireEvent.click(cards[0]!);
    // Slot 0 filled
    expect(getByTestId('incursion-team-slot-0').textContent).not.toContain('Slot 1');
    // Click same card again → slot 0 clears
    fireEvent.click(cards[0]!);
    expect(getByTestId('incursion-team-slot-0').textContent).toContain('Slot 1');
  });

  it('Launch transitions to resolving; beats reveal on 1500ms interval', () => {
    vi.useFakeTimers();
    reset([unit(1), unit(2), unit(3), unit(4)]);
    const { getByTestId, getAllByTestId } = render(<Incursion />);
    fireEvent.click(getByTestId('front-card-infrastructure'));
    const cards = getAllByTestId('specimen-card');
    fireEvent.click(cards[0]!);
    fireEvent.click(cards[1]!);
    fireEvent.click(cards[2]!);
    fireEvent.click(cards[3]!);

    fireEvent.click(getByTestId('launch-incursion-button'));

    // Ticker visible, beat 0 hidden at first
    expect(getByTestId('incursion-ticker')).toBeDefined();
    // Advance 1500ms → beat 0 visible
    act(() => { vi.advanceTimersByTime(1500); });
    expect(getByTestId('incursion-beat-0').getAttribute('data-visible')).toBe('true');
    // Advance to reveal all 4 beats
    act(() => { vi.advanceTimersByTime(1500 * 4); });
    expect(getByTestId('incursion-beat-3').getAttribute('data-visible')).toBe('true');
    // After all beats visible, Continue button appears
    expect(getByTestId('incursion-continue-button')).toBeDefined();
  });

  it('Skip jumps directly to resolved phase', () => {
    vi.useFakeTimers();
    reset([unit(1), unit(2), unit(3), unit(4)]);
    const { getByTestId, getAllByTestId } = render(<Incursion />);
    fireEvent.click(getByTestId('front-card-infrastructure'));
    const cards = getAllByTestId('specimen-card');
    [0, 1, 2, 3].forEach((i) => fireEvent.click(cards[i]!));
    fireEvent.click(getByTestId('launch-incursion-button'));

    fireEvent.click(getByTestId('incursion-skip-button'));
    // Every beat visible, Continue button rendered
    expect(getByTestId('incursion-beat-0').getAttribute('data-visible')).toBe('true');
    expect(getByTestId('incursion-beat-3').getAttribute('data-visible')).toBe('true');
    expect(getByTestId('incursion-continue-button')).toBeDefined();
  });

  it('Continue calls dismissIncursion, commits front state, resets to idle', () => {
    vi.useFakeTimers();
    reset([unit(1), unit(2), unit(3), unit(4)]);
    const { getByTestId, getAllByTestId } = render(<Incursion />);
    fireEvent.click(getByTestId('front-card-infrastructure'));
    const cards = getAllByTestId('specimen-card');
    [0, 1, 2, 3].forEach((i) => fireEvent.click(cards[i]!));
    fireEvent.click(getByTestId('launch-incursion-button'));
    fireEvent.click(getByTestId('incursion-skip-button'));
    fireEvent.click(getByTestId('incursion-continue-button'));

    const s = useColonyStore.getState();
    expect(s.activeIncursion).toBeNull();
    // Front state committed (won → captured OR failed → cooldown)
    const infra = s.fronts.infrastructure;
    expect(infra.captured || infra.cooldownUntil !== null).toBe(true);
    // UI back to idle: picker visible, team slots empty
    expect(getByTestId('incursion-picker-grid')).toBeDefined();
    expect(getByTestId('incursion-team-slot-0').textContent).toContain('Slot 1');
  });

  it('renders "Region conquered ✓" state when all 3 fronts captured', () => {
    reset(
      [unit(1), unit(2), unit(3), unit(4)],
      {
        infrastructure: { captured: true, cooldownUntil: null },
        military:       { captured: true, cooldownUntil: null },
        guerrilla:      { captured: true, cooldownUntil: null },
      },
    );
    const { getByTestId, queryByTestId } = render(<Incursion />);
    expect(getByTestId('incursion-region-conquered')).toBeDefined();
    expect(queryByTestId('incursion-picker-grid')).toBeNull();
    expect(queryByTestId('launch-incursion-button')).toBeNull();
  });
});
