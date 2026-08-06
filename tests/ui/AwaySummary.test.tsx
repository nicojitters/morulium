// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { AwaySummary } from '../../src/ui/components/AwaySummary';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { DEFAULT_UNLOCKS } from '../../src/state/unlocks';

function baseSeed() {
  useColonyStore.setState({
    units: [], nextId: 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0,
    breedsToday: 0, breedDayKey: todayLocalKey(),
    fronts: FRESH_FRONTS, activeIncursion: null,
    serum: 0, stims: 0, lastGarrisonTickAt: Date.now(),
    buildings: { barracks: false, medbay: false },
    lastRestTickAt: Date.now(),
    unlocks: DEFAULT_UNLOCKS,
    pendingAwaySummary: null,
  });
}

describe('AwaySummary', () => {
  beforeEach(() => { localStorage.clear(); baseSeed(); });
  afterEach(() => cleanup());

  it('renders nothing when pendingAwaySummary is null', () => {
    const { queryByTestId } = render(<AwaySummary />);
    expect(queryByTestId('away-summary')).toBeNull();
  });

  it('renders the modal with all four lines when summary is set', () => {
    useColonyStore.setState({
      pendingAwaySummary: { elapsedMs: 3_600_000, serumEarned: 25, restGainedTotal: 40, injuriesHealed: 1 },
    });
    const { getByTestId } = render(<AwaySummary />);
    const modal = getByTestId('away-summary');
    expect(modal.textContent).toContain('25');
    expect(modal.textContent).toMatch(/40/);
    expect(modal.textContent).toMatch(/1/);
    expect(modal.textContent?.toLowerCase()).toContain('hour');
  });

  it('dismiss button clears the summary', () => {
    useColonyStore.setState({
      pendingAwaySummary: { elapsedMs: 10, serumEarned: 5, restGainedTotal: 0, injuriesHealed: 0 },
    });
    const { getByTestId, queryByTestId } = render(<AwaySummary />);
    fireEvent.click(getByTestId('away-summary-dismiss'));
    expect(queryByTestId('away-summary')).toBeNull();
    expect(useColonyStore.getState().pendingAwaySummary).toBeNull();
  });
});
