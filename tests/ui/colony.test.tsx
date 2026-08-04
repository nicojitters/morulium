// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, act, cleanup } from '@testing-library/react';
import { Colony } from '../../src/ui/screens/Colony';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';

describe('Colony screen', () => {
  beforeEach(() => {
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
    });
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders EmptyColony when there are no units', () => {
    const { getByTestId, queryAllByTestId } = render(<Colony />);
    expect(getByTestId('empty-colony')).toBeDefined();
    expect(queryAllByTestId('specimen-card')).toHaveLength(0);
  });

  it('renders SpecimenCards for each unit, newest first', () => {
    // Manually seed the store — three units with ascending decantedAt
    useColonyStore.setState({
      units: [
        { id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome(), generation: 0, parentIds: null, wear: {} },
        { id: 2, seed: 2, decantedAt: 200, genome: makeMinimalGenome(), generation: 0, parentIds: null, wear: {} },
        { id: 3, seed: 3, decantedAt: 300, genome: makeMinimalGenome(), generation: 0, parentIds: null, wear: {} },
      ],
      nextId: 4,
      lastDecantedId: null,
    });
    const { getAllByTestId } = render(<Colony />);
    const cards = getAllByTestId('specimen-card');
    expect(cards).toHaveLength(3);
    // Newest first: id 3 → 2 → 1
    expect(cards[0]!.getAttribute('data-unit-id')).toBe('3');
    expect(cards[1]!.getAttribute('data-unit-id')).toBe('2');
    expect(cards[2]!.getAttribute('data-unit-id')).toBe('1');
  });

  it('shows the specimen count in the subtitle', () => {
    useColonyStore.setState({
      units: [
        { id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome(), generation: 0, parentIds: null, wear: {} },
        { id: 2, seed: 2, decantedAt: 200, genome: makeMinimalGenome(), generation: 0, parentIds: null, wear: {} },
      ],
      nextId: 3,
      lastDecantedId: null,
    });
    const { getByText } = render(<Colony />);
    expect(getByText(/2 specimens/i)).toBeDefined();
  });

  it('clicking the header DecantButton adds a unit and highlights it', () => {
    // Seed with one unit so the header (not empty state) shows
    useColonyStore.setState({
      units: [{ id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome(), generation: 0, parentIds: null, wear: {} }],
      nextId: 2,
      lastDecantedId: null,
    });
    const { getByTestId, getAllByTestId } = render(<Colony />);
    fireEvent.click(getByTestId('decant-button'));
    const cards = getAllByTestId('specimen-card');
    expect(cards).toHaveLength(2);
    // Newest first — id 2 should be highlighted
    expect(cards[0]!.getAttribute('data-highlighted')).toBe('true');
    expect(cards[1]!.getAttribute('data-highlighted')).toBeNull();
  });

  it('highlight auto-clears after 2000ms', async () => {
    vi.useFakeTimers();
    useColonyStore.setState({
      units: [{ id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome(), generation: 0, parentIds: null, wear: {} }],
      nextId: 2,
      lastDecantedId: 1,
    });
    const { getAllByTestId } = render(<Colony />);
    expect(getAllByTestId('specimen-card')[0]!.getAttribute('data-highlighted')).toBe('true');

    // Advance time past the 2s highlight duration
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(useColonyStore.getState().lastDecantedId).toBeNull();
    vi.useRealTimers();
  });

  it('renders the FailsafeIndicator in the header when droughtCount >= 40', () => {
    useColonyStore.setState({
      units: [
        { id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome(), generation: 0, parentIds: null, wear: {} },
      ],
      nextId: 2,
      lastDecantedId: null,
      harvestsToday: 0,
      harvestDayKey: todayLocalKey(),
      droughtCount: 45,
    });
    const { getByTestId } = render(<Colony />);
    const pill = getByTestId('failsafe-indicator');
    expect(pill.textContent).toContain('Failsafe in 5');
  });

  it('does not render the FailsafeIndicator when droughtCount < 40', () => {
    useColonyStore.setState({
      units: [
        { id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome(), generation: 0, parentIds: null, wear: {} },
      ],
      nextId: 2,
      lastDecantedId: null,
      harvestsToday: 0,
      harvestDayKey: todayLocalKey(),
      droughtCount: 20,
    });
    const { queryByTestId } = render(<Colony />);
    expect(queryByTestId('failsafe-indicator')).toBeNull();
  });

  it('always renders the HarvestIndicator', () => {
    useColonyStore.setState({
      units: [
        { id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome(), generation: 0, parentIds: null, wear: {} },
      ],
      nextId: 2,
      lastDecantedId: null,
      harvestsToday: 0,
      harvestDayKey: todayLocalKey(),
      droughtCount: 0,
    });
    const { getByTestId } = render(<Colony />);
    expect(getByTestId('harvest-indicator').textContent).toBe('Harvest 3/3');
  });

  it('SpecimenCard shows "Gen 0 · Harvested" for pristine units', () => {
    useColonyStore.setState({
      units: [
        { id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome(),
          generation: 0, parentIds: null, wear: {} },
      ],
      nextId: 2, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    const { getByTestId } = render(<Colony />);
    const lineage = getByTestId('lineage-line');
    expect(lineage.textContent).toBe('Gen 0 · Harvested');
  });

  it('SpecimenCard shows "Gen N · from #A × #B" for bred units', () => {
    useColonyStore.setState({
      units: [
        { id: 3, seed: 3, decantedAt: 300, genome: makeMinimalGenome(),
          generation: 2, parentIds: [1, 2], wear: {} },
      ],
      nextId: 4, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    const { getByTestId } = render(<Colony />);
    const lineage = getByTestId('lineage-line');
    expect(lineage.textContent).toBe('Gen 2 · from #1 × #2');
  });
});

// Helper: a genome shape that resolves through the sim without errors. Uses the
// baseline allele for every locus, giving a deterministic score-0 "Baseline"
// specimen. Enough for Colony rendering assertions.
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
