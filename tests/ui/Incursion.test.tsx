// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { Incursion } from '../../src/ui/screens/Incursion';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { STIM_COST_SERUM } from '../../src/state/rest';
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
    lastGarrisonTickAt: Date.now(),   // NEW
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
        infrastructure: { captured: true, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
        military:       { captured: true, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
        guerrilla:      { captured: true, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
      },
    );
    const { getByTestId, queryByTestId } = render(<Incursion />);
    expect(getByTestId('incursion-region-conquered')).toBeDefined();
    expect(queryByTestId('incursion-picker-grid')).toBeNull();
    expect(queryByTestId('launch-incursion-button')).toBeNull();
  });

  it('injured picker cards get data-injured="true" and are unpickable', () => {
    const injuryTime = Date.now() + 30 * 60 * 1000;
    useColonyStore.setState({
      units: [
        { id: 1, seed: 1, decantedAt: 100,
          genome: rollGenome(createRng(101)),
          generation: 0, parentIds: null, wear: {},
          restCurrent: 100, injuredUntil: injuryTime },   // injured
        { id: 2, seed: 2, decantedAt: 200,
          genome: rollGenome(createRng(202)),
          generation: 0, parentIds: null, wear: {},
          restCurrent: 100, injuredUntil: null },
        { id: 3, seed: 3, decantedAt: 300,
          genome: rollGenome(createRng(303)),
          generation: 0, parentIds: null, wear: {},
          restCurrent: 100, injuredUntil: null },
        { id: 4, seed: 4, decantedAt: 400,
          genome: rollGenome(createRng(404)),
          generation: 0, parentIds: null, wear: {},
          restCurrent: 100, injuredUntil: null },
      ],
      nextId: 5,
    });
    const { getAllByTestId, getByTestId } = render(<Incursion />);
    const cards = getAllByTestId('specimen-card');
    // Newest-first sort → id 4 first
    const injuredCard = cards.find((c) => c.getAttribute('data-injured') === 'true');
    expect(injuredCard).toBeDefined();
    // Clicking the injured card is a no-op
    fireEvent.click(injuredCard!);
    expect(getByTestId('incursion-team-slot-0').textContent).toContain('Slot 1');   // still empty
  });

  it('under-rested slots show Stim toggle; fully-rested slots do not', () => {
    useColonyStore.setState({
      units: [
        { id: 1, seed: 1, decantedAt: 100,
          genome: rollGenome(createRng(101)),
          generation: 0, parentIds: null, wear: {},
          restCurrent: 20, injuredUntil: null },    // under-rested
        { id: 2, seed: 2, decantedAt: 200,
          genome: rollGenome(createRng(202)),
          generation: 0, parentIds: null, wear: {},
          restCurrent: 100, injuredUntil: null },
        { id: 3, seed: 3, decantedAt: 300,
          genome: rollGenome(createRng(303)),
          generation: 0, parentIds: null, wear: {},
          restCurrent: 100, injuredUntil: null },
        { id: 4, seed: 4, decantedAt: 400,
          genome: rollGenome(createRng(404)),
          generation: 0, parentIds: null, wear: {},
          restCurrent: 100, injuredUntil: null },
      ],
      nextId: 5,
      stims: 3,
    });
    const { getAllByTestId, queryByTestId } = render(<Incursion />);
    const cards = getAllByTestId('specimen-card');
    // Click a card to fill slot A. Newest-first: id 4, 3, 2, 1 in that order.
    // The one with restCurrent=20 is id 1. Click it first — Stim toggle should appear.
    // Find the card by data-unit-id=1
    const unit1Card = cards.find((c) => c.getAttribute('data-unit-id') === '1');
    fireEvent.click(unit1Card!);
    // slot A now holds the under-rested unit → toggle should be visible
    expect(queryByTestId('stim-toggle-0')).not.toBeNull();
    // Now click a rested card into slot B (unit id 2)
    const unit2Card = cards.find((c) => c.getAttribute('data-unit-id') === '2');
    fireEvent.click(unit2Card!);
    // slot B has a fully-rested unit — no toggle for it
    expect(queryByTestId('stim-toggle-1')).toBeNull();
  });

  it('Buy Stim button calls buyStim; disables when serum < STIM_COST_SERUM', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 5,
      serum: 200,
      stims: 0,
    });
    const { getByTestId } = render(<Incursion />);
    const buyBtn = getByTestId('buy-stim-button');
    expect(buyBtn.getAttribute('data-disabled')).toBeNull();
    fireEvent.click(buyBtn);
    expect(useColonyStore.getState().serum).toBe(200 - STIM_COST_SERUM);
    expect(useColonyStore.getState().stims).toBe(1);
  });

  it('Buy Stim button disables when serum insufficient', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 5,
      serum: STIM_COST_SERUM - 1,
      stims: 0,
    });
    const onClick = vi.fn();
    const { getByTestId } = render(<Incursion />);
    const buyBtn = getByTestId('buy-stim-button');
    expect(buyBtn.getAttribute('data-disabled')).toBe('true');
    fireEvent.click(buyBtn);
    // Serum unchanged
    expect(useColonyStore.getState().serum).toBe(STIM_COST_SERUM - 1);
    expect(useColonyStore.getState().stims).toBe(0);
    void onClick;
  });

  it('Launch confirm passes stimAppliedIds as 3rd arg to launchIncursion', () => {
    useColonyStore.setState({
      units: [
        { id: 1, seed: 1, decantedAt: 100,
          genome: rollGenome(createRng(101)),
          generation: 0, parentIds: null, wear: {},
          restCurrent: 20, injuredUntil: null },    // under-rested
        { id: 2, seed: 2, decantedAt: 200,
          genome: rollGenome(createRng(202)),
          generation: 0, parentIds: null, wear: {},
          restCurrent: 100, injuredUntil: null },
        { id: 3, seed: 3, decantedAt: 300,
          genome: rollGenome(createRng(303)),
          generation: 0, parentIds: null, wear: {},
          restCurrent: 100, injuredUntil: null },
        { id: 4, seed: 4, decantedAt: 400,
          genome: rollGenome(createRng(404)),
          generation: 0, parentIds: null, wear: {},
          restCurrent: 100, injuredUntil: null },
      ],
      nextId: 5,
      stims: 1,
    });
    const { getByTestId, getAllByTestId } = render(<Incursion />);
    fireEvent.click(getByTestId('front-card-infrastructure'));
    const cards = getAllByTestId('specimen-card');
    // Click all 4 in newest-first order (4, 3, 2, 1) → slot A=4, B=3, C=2, D=1
    const sortedById = [...cards].sort((a, b) =>
      Number(b.getAttribute('data-unit-id')) - Number(a.getAttribute('data-unit-id')),
    );
    fireEvent.click(sortedById[0]!);   // id 4 → slot A
    fireEvent.click(sortedById[1]!);   // id 3 → slot B
    fireEvent.click(sortedById[2]!);   // id 2 → slot C
    fireEvent.click(sortedById[3]!);   // id 1 → slot D (under-rested)
    // slot D (index 3) holds under-rested unit — toggle its Stim
    fireEvent.click(getByTestId('stim-toggle-3'));
    // Launch
    fireEvent.click(getByTestId('launch-incursion-button'));

    const s = useColonyStore.getState();
    expect(s.activeIncursion).not.toBeNull();
    // Unit 1 was Stimmed — one stim consumed
    expect(s.stims).toBe(0);
    // Unit 1's rest deducted, but no injury (Stim covered it)
    expect(s.units.find((u) => u.id === 1)!.injuredUntil).toBeNull();
  });

  it('under-rested hint appears when picks are under-rested + insufficient Stims applied', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 20, injuredUntil: null,   // all under-rested
      })),
      nextId: 5,
      stims: 0,
    });
    const { getByTestId, getAllByTestId, queryByText } = render(<Incursion />);
    fireEvent.click(getByTestId('front-card-infrastructure'));
    const cards = getAllByTestId('specimen-card');
    cards.forEach((c) => fireEvent.click(c));
    // 4 slots filled, 0 stims applied, 4 under-rested → hint should appear
    expect(queryByText(/still under-rested/i)).not.toBeNull();
  });

  it('stim inventory label reflects current stims count', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 5,
      stims: 7,
    });
    const { getByTestId } = render(<Incursion />);
    expect(getByTestId('stim-inventory-label').textContent).toBe('Stims: 7');
  });
});
