// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { Breed } from '../../src/ui/screens/Breed';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE, BREED_COST_SERUM } from '../../src/state/serum';

function resetStore(): void {
  useColonyStore.setState({
    units: [],
    nextId: 1,
    lastDecantedId: null,
    harvestsToday: 0,
    harvestDayKey: todayLocalKey(),
    droughtCount: 0,
    breedsToday: 0,
    breedDayKey: todayLocalKey(),
    fronts: FRESH_FRONTS,
    activeIncursion: null,
    serum: SERUM_STARTING_BALANCE,
    stims: 0,
    lastGarrisonTickAt: Date.now(),   // NEW
  });
}

function makeMinimalGenome() {
  return {
    loci: {
      musculature:      ['mus_neutral', 'mus_neutral'],
      neural_tissue:    ['neu_neutral', 'neu_neutral'],
      predator_drive:   ['prd_neutral', 'prd_neutral'],
      carapace_density: ['car_neutral', 'car_neutral'],
      metabolism:       ['met_neutral', 'met_neutral'],
      sinew:            ['sin_neutral', 'sin_neutral'],
      vigor:            ['vig_neutral', 'vig_neutral'],
      acuity:           ['acu_neutral', 'acu_neutral'],
      head:             ['head_plain', 'head_plain'],
      carapace:         ['cara_bare', 'cara_bare'],
      locomotion:       ['loco_plain', 'loco_plain'],
      appendage:        ['app_none', 'app_none'],
      eyes:             ['eyes_plain', 'eyes_plain'],
      hide_pattern:     ['hide_plain', 'hide_plain'],
      aberration:       ['ab_none', 'ab_none'],
      palette:          ['pal_ash', 'pal_ash'],
    } as const,
  };
}

describe('Breed screen', () => {
  beforeEach(() => {
    resetStore();
    vi.useRealTimers();
  });
  afterEach(() => cleanup());

  it('shows empty state when Colony has < 2 units', () => {
    // 0 units
    const { getByTestId, queryByTestId } = render(<Breed />);
    expect(getByTestId('breed-empty-state')).toBeDefined();
    expect(queryByTestId('breed-picker-grid')).toBeNull();
  });

  it('empty state persists with exactly 1 unit', () => {
    useColonyStore.getState().decant();
    const { getByTestId, queryByTestId } = render(<Breed />);
    expect(getByTestId('breed-empty-state')).toBeDefined();
    expect(queryByTestId('breed-picker-grid')).toBeNull();
  });

  it('renders the picker grid + two empty parent slots when >= 2 units', () => {
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    const { getByTestId } = render(<Breed />);
    expect(getByTestId('breed-picker-grid')).toBeDefined();
    expect(getByTestId('parent-slot-a').textContent).toContain('Parent A');
    expect(getByTestId('parent-slot-b').textContent).toContain('Parent B');
  });

  it('clicking a card fills first empty parent slot (A, then B)', () => {
    useColonyStore.getState().decant();
    const u2 = useColonyStore.getState().decant();
    const { getByTestId, getAllByTestId } = render(<Breed />);
    const cards = getAllByTestId('specimen-card');
    fireEvent.click(cards[0]!);
    // Newest-first sort: cards[0] is u2 (later decant)
    const padded2 = `M-${String(u2.id).padStart(5, '0')}`;
    expect(getByTestId('parent-slot-a').textContent).toContain(padded2);
    // Slot B still empty
    expect(getByTestId('parent-slot-b').textContent).toContain('Parent B');
  });

  it('Confirm is disabled until both slots are filled with distinct units', () => {
    const u1 = useColonyStore.getState().decant();
    const u2 = useColonyStore.getState().decant();
    const { getByTestId, getAllByTestId } = render(<Breed />);
    const cards = getAllByTestId('specimen-card');

    // No slots picked → disabled
    expect(getByTestId('breed-button').getAttribute('data-disabled')).toBe('true');

    // One picked → still disabled
    fireEvent.click(cards[0]!);
    expect(getByTestId('breed-button').getAttribute('data-disabled')).toBe('true');

    // Both picked, distinct → enabled
    fireEvent.click(cards[1]!);
    expect(getByTestId('breed-button').getAttribute('data-disabled')).toBeNull();
    void u1; void u2;
  });

  it('clicking a card that is already in a slot clears that slot', () => {
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    const { getByTestId, getAllByTestId } = render(<Breed />);
    const cards = getAllByTestId('specimen-card');
    fireEvent.click(cards[0]!); // fills slot A
    expect(getByTestId('parent-slot-a').textContent).not.toContain('Parent A');

    // Click same card again → slot A clears
    fireEvent.click(cards[0]!);
    expect(getByTestId('parent-slot-a').textContent).toContain('Parent A');
  });

  it('clicking the × on a filled slot clears it', () => {
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    const { getByTestId, getAllByTestId } = render(<Breed />);
    const cards = getAllByTestId('specimen-card');
    fireEvent.click(cards[0]!);
    fireEvent.click(getByTestId('parent-slot-clear-a'));
    expect(getByTestId('parent-slot-a').textContent).toContain('Parent A');
  });

  it('Confirm click calls breed(), appends a bred unit, and clears both slots', () => {
    const u1 = useColonyStore.getState().decant();
    const u2 = useColonyStore.getState().decant();
    const { getByTestId, getAllByTestId } = render(<Breed />);
    const cards = getAllByTestId('specimen-card');
    fireEvent.click(cards[0]!);
    fireEvent.click(cards[1]!);
    fireEvent.click(getByTestId('breed-button'));

    const s = useColonyStore.getState();
    expect(s.units).toHaveLength(3);
    const child = s.units[2]!;
    expect(child.parentIds).toEqual([u2.id, u1.id]);
    expect(child.generation).toBe(1);
    expect(s.breedsToday).toBe(1);
    // Slots cleared post-confirm
    expect(getByTestId('parent-slot-a').textContent).toContain('Parent A');
    expect(getByTestId('parent-slot-b').textContent).toContain('Parent B');
  });

  it('Confirm is disabled + shows countdown when breeds limit is hit', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4, 16, 37, 0)); // 7h 23m to midnight
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    useColonyStore.setState({ breedsToday: 3, breedDayKey: '2026-08-04' });

    const { getByTestId, getAllByTestId } = render(<Breed />);
    const cards = getAllByTestId('specimen-card');
    fireEvent.click(cards[0]!);
    fireEvent.click(cards[1]!);
    const btn = getByTestId('breed-button');
    expect(btn.getAttribute('data-disabled')).toBe('true');
    expect(btn.textContent).toBe('Next Breed in 7h 23m');
  });

  it('shows the insufficient-Serum hint when serum < BREED_COST_SERUM (both parents distinct)', () => {
    const u1 = useColonyStore.getState().decant();
    const u2 = useColonyStore.getState().decant();
    useColonyStore.setState({ serum: 25 });
    const { getByText, getAllByTestId } = render(<Breed />);
    const cards = getAllByTestId('specimen-card');
    fireEvent.click(cards[0]!);
    fireEvent.click(cards[1]!);
    expect(getByText(/Not enough Serum — need 50 SR \(have 25\)/)).toBeDefined();
    void u1; void u2;
  });

  it('does NOT show the insufficient-Serum hint when serum >= BREED_COST_SERUM', () => {
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    useColonyStore.setState({ serum: BREED_COST_SERUM });
    const { queryByText, getAllByTestId } = render(<Breed />);
    const cards = getAllByTestId('specimen-card');
    fireEvent.click(cards[0]!);
    fireEvent.click(cards[1]!);
    expect(queryByText(/Not enough Serum/)).toBeNull();
  });

  it('renders rest line on every card in Breed picker (breeding orthogonal to rest)', () => {
    useColonyStore.setState({
      units: [1, 2].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: makeMinimalGenome(),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 25, injuredUntil: null,
      })),
      nextId: 3,
      serum: 200,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    const { getAllByTestId } = render(<Breed />);
    const restLines = getAllByTestId(/^rest-line-/);
    expect(restLines).toHaveLength(2);
  });

  it('injured units are still pickable in Breed picker (breeding ignores injury)', () => {
    const injuredUntil = Date.now() + 30 * 60 * 1000;
    useColonyStore.setState({
      units: [1, 2].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: makeMinimalGenome(),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil,
      })),
      nextId: 3,
      serum: 200,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    const { getAllByTestId, getByTestId } = render(<Breed />);
    const cards = getAllByTestId('specimen-card');
    fireEvent.click(cards[0]!);
    // Slot A filled — click was accepted despite injury
    expect(getByTestId('parent-slot-a').textContent).not.toContain('Parent A');
  });
});
