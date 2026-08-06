// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { EmptyColony } from '../../src/ui/components/EmptyColony';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';

describe('EmptyColony', () => {
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
      serum: SERUM_STARTING_BALANCE,
      stims: 0,
      lastGarrisonTickAt: Date.now(),   // NEW
      freeDecantsRemaining: 3,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the empty-state title and CTA', () => {
    const { getByTestId, getByText } = render(<EmptyColony />);
    expect(getByTestId('empty-colony')).toBeDefined();
    expect(getByText(/your colony is empty/i)).toBeDefined();
    expect(getByTestId('decant-button').textContent).toBe('Decant your first Morula');
  });

  it('shows free Decant count in body when freeDecantsRemaining > 0', () => {
    const { getByTestId } = render(<EmptyColony />);
    expect(getByTestId('empty-colony').textContent).toContain('3 free Decants available');
  });

  it('shows paid-path body when freeDecantsRemaining is 0', () => {
    useColonyStore.setState({ freeDecantsRemaining: 0 });
    const { getByTestId } = render(<EmptyColony />);
    expect(getByTestId('empty-colony').textContent).toContain('Decant a Morula to begin');
  });

  it('clicking the CTA decants the first specimen', () => {
    const { getByTestId } = render(<EmptyColony />);
    fireEvent.click(getByTestId('decant-button'));
    expect(useColonyStore.getState().units).toHaveLength(1);
  });

  it('empty state includes hoverable TermTooltip for Morula in paid-path body', () => {
    useColonyStore.setState({ freeDecantsRemaining: 0 });
    const { getByText, queryByTestId } = render(<EmptyColony />);
    const morulaTrigger = getByText('Morula').closest('span')!;
    expect(morulaTrigger).toBeDefined();
    // Before hover — no bubble
    expect(queryByTestId('tooltip-bubble-morula')).toBeNull();
    fireEvent.mouseEnter(morulaTrigger);
    // After hover — bubble should appear
    expect(queryByTestId('tooltip-bubble-morula')).not.toBeNull();
    fireEvent.mouseLeave(morulaTrigger);
  });

  it('empty state includes hoverable TermTooltip for Decant in paid-path body', () => {
    useColonyStore.setState({ freeDecantsRemaining: 0 });
    const { getAllByText, queryByTestId } = render(<EmptyColony />);
    const decantTriggers = getAllByText('Decant');
    const decantTrigger = decantTriggers[0]!.closest('span')!;
    expect(decantTrigger).toBeDefined();
    fireEvent.mouseEnter(decantTrigger);
    expect(queryByTestId('tooltip-bubble-decant')).not.toBeNull();
    fireEvent.mouseLeave(decantTrigger);
  });

  it('CTA is disabled when the daily Harvest limit is already hit', () => {
    useColonyStore.setState({
      units: [],
      nextId: 4,
      lastDecantedId: null,
      harvestsToday: 3,
      harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0,
      breedDayKey: todayLocalKey(),
    });
    const { getByTestId } = render(<EmptyColony />);
    const btn = getByTestId('decant-button');
    expect(btn.getAttribute('data-disabled')).toBe('true');
  });
});
