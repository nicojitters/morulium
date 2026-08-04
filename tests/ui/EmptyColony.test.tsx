// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { EmptyColony } from '../../src/ui/components/EmptyColony';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';

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

  it('clicking the CTA decants the first specimen', () => {
    const { getByTestId } = render(<EmptyColony />);
    fireEvent.click(getByTestId('decant-button'));
    expect(useColonyStore.getState().units).toHaveLength(1);
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
