// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { Vat } from '../../src/ui/screens/Vat';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { REST_MAX } from '../../src/state/rest';
import type { Unit } from '../../src/state/types';
import type { FrontState } from '../../src/state/incursion';

// Genome that satisfies unitToRow/expressPhenotype without errors.
// Uses the neutral/baseline allele for every locus — matches the same
// pattern used in tests/ui/colony.test.tsx.
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

function baselineUnit(id: number): Unit {
  return {
    id, seed: id, decantedAt: id, genome: makeMinimalGenome(),
    generation: 0, parentIds: null, wear: {},
    restCurrent: REST_MAX, injuredUntil: null, culled: false,
  };
}

function resetStore(partial: Partial<Parameters<typeof useColonyStore.setState>[0]> = {}) {
  useColonyStore.setState({
    units: [],
    nextId: 1,
    lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(),
    droughtCount: 0, breedsToday: 0, breedDayKey: todayLocalKey(),
    fronts: FRESH_FRONTS,
    activeIncursion: null,
    serum: 200, stims: 0, lastGarrisonTickAt: Date.now(),
    buildings: { barracks: false, medbay: false },
    lastRestTickAt: Date.now(),
    ...partial,
  });
}

describe('Vat screen', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });
  afterEach(() => cleanup());

  it('renders empty state when Colony has no eligible units', () => {
    const { getByTestId } = render(<Vat />);
    expect(getByTestId('vat-empty-state')).not.toBeNull();
  });

  it('renders a tier group per non-empty tier with a count', () => {
    resetStore({
      units: Array.from({ length: 3 }, (_, i) => baselineUnit(i + 1)),
      nextId: 4,
    });
    const { getByTestId } = render(<Vat />);
    expect(getByTestId('vat-tier-group-baseline')).not.toBeNull();
    expect(getByTestId('vat-tier-count-baseline').textContent).toContain('3');
  });

  it('"Vat these 10" button is disabled when selection.size < 10', () => {
    resetStore({
      units: Array.from({ length: 12 }, (_, i) => baselineUnit(i + 1)),
      nextId: 13,
    });
    const { getByTestId } = render(<Vat />);
    const btn = getByTestId('vat-tier-run-button-baseline') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('clicking 10 cards enables the tier-run button; clicking again runs the Vat op', () => {
    resetStore({
      units: Array.from({ length: 10 }, (_, i) => baselineUnit(i + 1)),
      nextId: 11,
    });
    const { getByTestId, getAllByTestId } = render(<Vat />);
    const cards = getAllByTestId('specimen-card');

    // Click first 5 cards — button stays disabled, label shows partial count.
    for (const c of cards.slice(0, 5)) fireEvent.click(c);
    expect(getByTestId('vat-tier-run-button-baseline').textContent).toContain('(5/10)');

    // First card should now have the bio-pulse selection class (replaces hard outline).
    const firstWrapper = cards[0]?.parentElement;
    expect(firstWrapper?.className).toContain('a-bio-pulse');

    // Click remaining 5 — button should now be enabled.
    for (const c of cards.slice(5)) fireEvent.click(c);
    const btn = getByTestId('vat-tier-run-button-baseline') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toContain('(10/10)');

    fireEvent.click(btn);
    const s = useColonyStore.getState();
    // 10 donors gone → 1 output remains
    expect(s.units).toHaveLength(1);
    expect(s.nextId).toBe(12);
  });

  it('hides injured units and shows them in the ineligible footer', () => {
    const units: Unit[] = [];
    for (let i = 1; i <= 5; i++) {
      const injured = i === 3;
      units.push({
        ...baselineUnit(i),
        injuredUntil: injured ? Date.now() + 60_000 : null,
      });
    }
    resetStore({ units, nextId: 6 });
    const { queryByTestId, getByTestId } = render(<Vat />);
    // Injured unit id=3 has no card (specimen-card testids don't distinguish per id, but we
    // can assert group count = 4)
    expect(getByTestId('vat-tier-count-baseline').textContent).toContain('4');
    expect(getByTestId('vat-ineligible-count').textContent).toContain('1');
    expect(queryByTestId('vat-empty-state')).toBeNull();
  });

  it('hides garrisoned units and shows them in the ineligible footer', () => {
    const units = Array.from({ length: 3 }, (_, i) => baselineUnit(i + 1));
    const capturedFront: FrontState = {
      captured: true, cooldownUntil: null,
      garrison: [1], flareStartedAt: null, hardening: 0,
    };
    resetStore({
      units,
      nextId: 4,
      fronts: { ...FRESH_FRONTS, infrastructure: capturedFront },
    });
    const { getByTestId } = render(<Vat />);
    expect(getByTestId('vat-tier-count-baseline').textContent).toContain('2');
    expect(getByTestId('vat-ineligible-count').textContent).toContain('1');
  });

  it('Cull All button is disabled when no full tier-of-10 culled batch exists', () => {
    // 5 baselines, only 3 culled — not enough
    const units = Array.from({ length: 5 }, (_, i) => ({
      ...baselineUnit(i + 1),
      culled: i < 3,
    }));
    resetStore({ units, nextId: 6 });
    const { getByTestId } = render(<Vat />);
    const btn = getByTestId('vat-cull-all-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('Cull All button enabled + label shows op count when there is a culled batch', () => {
    // 12 baselines, 10 culled
    const units = Array.from({ length: 12 }, (_, i) => ({
      ...baselineUnit(i + 1),
      culled: i < 10,
    }));
    resetStore({ units, nextId: 13 });
    const { getByTestId } = render(<Vat />);
    const btn = getByTestId('vat-cull-all-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toContain('1');   // 1 op
    expect(btn.textContent).toContain('10');  // 10 units
  });

  it('Cull All click runs floor(N/10) ops', () => {
    // 25 culled baselines → 2 ops, 20 shredded, 2 outputs, 5 culled remain
    const units = Array.from({ length: 25 }, (_, i) => ({
      ...baselineUnit(i + 1),
      culled: true,
    }));
    resetStore({ units, nextId: 26 });
    const { getByTestId } = render(<Vat />);
    fireEvent.click(getByTestId('vat-cull-all-button'));
    const s = useColonyStore.getState();
    // 25 units → 20 shredded → 5 culled remain + 2 pristine outputs = 7 total
    expect(s.units).toHaveLength(7);
    expect(s.nextId).toBe(28);
  });

  it('Cull All caps at VAT_MAX_BATCH_SIZE ops (40 culled + Barracks = exactly 4 ops)', () => {
    // Cap 40 requires Barracks. 40 culled baselines → 4 ops (cap hit exactly)
    // → 40 shredded, 4 pristine outputs, 0 culled remain.
    const units = Array.from({ length: 40 }, (_, i) => ({
      ...baselineUnit(i + 1),
      culled: true,
    }));
    resetStore({
      units, nextId: 41,
      buildings: { barracks: true, medbay: false },
      serum: 500,
    });
    const { getByTestId } = render(<Vat />);
    fireEvent.click(getByTestId('vat-cull-all-button'));
    const s = useColonyStore.getState();
    // 40 - 40 shredded + 4 outputs = 4 total
    expect(s.units).toHaveLength(4);
    expect(s.nextId).toBe(45);
    // All 4 outputs are pristine (not culled)
    expect(s.units.every((u) => !u.culled)).toBe(true);
  });

  it('cards inside Vat groups show data-culled="true" for culled units', () => {
    const units = Array.from({ length: 3 }, (_, i) => ({
      ...baselineUnit(i + 1),
      culled: i === 0,
    }));
    resetStore({ units, nextId: 4 });
    const { getAllByTestId } = render(<Vat />);
    const cards = getAllByTestId('specimen-card');
    const culledCards = cards.filter((c) => c.getAttribute('data-culled') === 'true');
    expect(culledCards).toHaveLength(1);
  });
});

describe('Vat first-visit callout (P6 Task 6.5)', () => {
  afterEach(() => cleanup());

  it('mounts the first-visit callout when unseen', () => {
    useColonyStore.getState().resetGame();
    const { getByTestId } = render(<Vat />);
    expect(getByTestId('first-visit-vat')).toBeDefined();
  });

  it('hides the callout after markSeen', () => {
    useColonyStore.getState().resetGame();
    useColonyStore.getState().markSeen('vat');
    const { queryByTestId } = render(<Vat />);
    expect(queryByTestId('first-visit-vat')).toBeNull();
  });
});
