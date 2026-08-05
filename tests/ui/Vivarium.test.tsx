// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { Vivarium } from '../../src/ui/screens/Vivarium';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import {
  BARRACKS_COST_SERUM,
  MEDBAY_COST_SERUM,
} from '../../src/state/vivarium';

function resetStore(partial: Partial<Parameters<typeof useColonyStore.setState>[0]> = {}) {
  useColonyStore.setState({
    units: [],
    nextId: 1,
    lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(),
    droughtCount: 0, breedsToday: 0, breedDayKey: todayLocalKey(),
    fronts: FRESH_FRONTS, activeIncursion: null,
    serum: 200, stims: 0, lastGarrisonTickAt: Date.now(),
    buildings: { barracks: false, medbay: false },
    lastRestTickAt: Date.now(),
    ...partial,
  });
}

describe('Vivarium screen', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });
  afterEach(() => cleanup());

  it('renders both barracks and medbay panels', () => {
    const { getByTestId } = render(<Vivarium />);
    expect(getByTestId('barracks-panel')).not.toBeNull();
    expect(getByTestId('medbay-panel')).not.toBeNull();
  });

  it('Barracks build button disabled when insufficient Serum', () => {
    resetStore({ serum: BARRACKS_COST_SERUM - 1 });
    const { getByTestId } = render(<Vivarium />);
    const btn = getByTestId('barracks-build-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('need more SR');
  });

  it('Barracks build button enabled at sufficient Serum', () => {
    resetStore({ serum: BARRACKS_COST_SERUM });
    const { getByTestId } = render(<Vivarium />);
    const btn = getByTestId('barracks-build-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toContain(`Build (${BARRACKS_COST_SERUM} SR)`);
  });

  it('clicking Barracks Build with enough SR: deducts SR, flips flag, panel shows "Built ✓"', () => {
    resetStore({ serum: 600 });
    const { getByTestId, rerender, queryByTestId } = render(<Vivarium />);
    fireEvent.click(getByTestId('barracks-build-button'));
    rerender(<Vivarium />);
    const s = useColonyStore.getState();
    expect(s.serum).toBe(600 - BARRACKS_COST_SERUM);
    expect(s.buildings.barracks).toBe(true);
    // Build button gone; status shows Built ✓
    expect(queryByTestId('barracks-build-button')).toBeNull();
    expect(getByTestId('barracks-status').textContent).toContain('Built');
    expect(getByTestId('barracks-status').textContent).toContain('✓');
  });

  it('Medbay panel behaves the same way with its own cost', () => {
    resetStore({ serum: 400 });
    const { getByTestId, rerender, queryByTestId } = render(<Vivarium />);
    fireEvent.click(getByTestId('medbay-build-button'));
    rerender(<Vivarium />);
    const s = useColonyStore.getState();
    expect(s.serum).toBe(400 - MEDBAY_COST_SERUM);
    expect(s.buildings.medbay).toBe(true);
    expect(queryByTestId('medbay-build-button')).toBeNull();
    expect(getByTestId('medbay-status').textContent).toContain('Built');
  });

  it('vivarium cap counter reflects units.length / capOf', () => {
    resetStore({ serum: 1000 });
    const { getByTestId, rerender } = render(<Vivarium />);
    // Initially 0 units, cap = 20
    expect(getByTestId('vivarium-cap-counter').textContent).toBe('0/20');
    // Buy Barracks → cap = 40
    fireEvent.click(getByTestId('barracks-build-button'));
    rerender(<Vivarium />);
    expect(getByTestId('vivarium-cap-counter').textContent).toBe('0/40');
  });
});
