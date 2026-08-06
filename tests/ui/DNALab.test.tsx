// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { DNALab } from '../../src/ui/screens/DNALab';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { DEFAULT_UNLOCKS } from '../../src/state/unlocks';
import { REST_MAX } from '../../src/state/rest';
import type { Unit } from '../../src/state/types';

function seed(units: Unit[] = []) {
  useColonyStore.setState({
    units, nextId: (units?.length ?? 0) + 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0,
    breedsToday: 0, breedDayKey: todayLocalKey(),
    fronts: FRESH_FRONTS, activeIncursion: null,
    serum: 0, stims: 0, lastGarrisonTickAt: Date.now(),
    buildings: { barracks: false, medbay: false },
    lastRestTickAt: Date.now(),
    unlocks: DEFAULT_UNLOCKS,
  });
}

describe('DNA Lab', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => cleanup());

  it('shows empty state when there are no units', () => {
    seed([]);
    const { getByTestId, queryByTestId } = render(<DNALab />);
    expect(getByTestId('dna-lab-screen')).toBeDefined();
    expect(getByTestId('dna-lab-empty')).toBeDefined();
    expect(queryByTestId('dna-lab-picker')).toBeNull();
  });

  it('lists units in the picker and shows detail when a row is clicked', () => {
    useColonyStore.setState({
      units: [{
        id: 7, seed: 7, decantedAt: 100, genome: { loci: {} },
        generation: 0, parentIds: null, wear: {},
        restCurrent: REST_MAX, injuredUntil: null, culled: false,
      }],
      nextId: 8, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS, activeIncursion: null,
      serum: 0, stims: 0, lastGarrisonTickAt: Date.now(),
      buildings: { barracks: false, medbay: false },
      lastRestTickAt: Date.now(),
      unlocks: DEFAULT_UNLOCKS,
    });
    const { getByTestId } = render(<DNALab />);
    expect(getByTestId('dna-lab-picker')).toBeDefined();
    fireEvent.click(getByTestId('dna-lab-row-7'));
    const detail = getByTestId('dna-lab-detail');
    expect(detail.textContent).toContain('7');           // id
    expect(detail.textContent?.toLowerCase()).toContain('pristine');
    expect(detail.textContent?.toLowerCase()).toContain('generation');
  });

  it('clicking a row emits view-dna-lab-detail', () => {
    useColonyStore.setState({
      units: [{
        id: 3, seed: 3, decantedAt: 100, genome: { loci: {} },
        generation: 0, parentIds: null, wear: {},
        restCurrent: REST_MAX, injuredUntil: null, culled: false,
      }],
      nextId: 4, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS, activeIncursion: null,
      serum: 0, stims: 0, lastGarrisonTickAt: Date.now(),
      buildings: { barracks: false, medbay: false },
      lastRestTickAt: Date.now(),
      unlocks: DEFAULT_UNLOCKS,
      activeDirectiveId: 'inspect-first',
    });
    const { getByTestId } = render(<DNALab />);
    fireEvent.click(getByTestId('dna-lab-row-3'));
    expect(useColonyStore.getState().activeDirectiveId).toBe('decant-second');
  });

  it('does not expose numeric rarity score or stat numbers', () => {
    useColonyStore.setState({
      units: [{
        id: 1, seed: 1, decantedAt: 1, genome: { loci: {} },
        generation: 0, parentIds: null, wear: {},
        restCurrent: REST_MAX, injuredUntil: null, culled: false,
      }],
      nextId: 2, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS, activeIncursion: null,
      serum: 0, stims: 0, lastGarrisonTickAt: Date.now(),
      buildings: { barracks: false, medbay: false },
      lastRestTickAt: Date.now(),
      unlocks: DEFAULT_UNLOCKS,
    });
    const { getByTestId } = render(<DNALab />);
    fireEvent.click(getByTestId('dna-lab-row-1'));
    const text = getByTestId('dna-lab-detail').textContent ?? '';
    expect(text).not.toMatch(/score[:\s]+\d/i);
    expect(text).not.toMatch(/\bPWR[:\s]+\d/);
    expect(text).not.toMatch(/\bINT[:\s]+\d/);
  });
});
