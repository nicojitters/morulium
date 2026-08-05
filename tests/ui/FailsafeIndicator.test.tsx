// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { FailsafeIndicator } from '../../src/ui/components/FailsafeIndicator';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';
import { DROUGHT_THRESHOLD, FAILSAFE_INDICATOR_APPEARS_AT } from '../../src/state/failsafe';

function resetStore(droughtCount: number): void {
  useColonyStore.setState({
    units: [], nextId: 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(),
    droughtCount,
    breedsToday: 0, breedDayKey: todayLocalKey(),
    fronts: FRESH_FRONTS,
    activeIncursion: null,
    serum: SERUM_STARTING_BALANCE,
    stims: 0,
    lastGarrisonTickAt: Date.now(),   // NEW
  });
}

describe('FailsafeIndicator', () => {
  beforeEach(() => resetStore(0));
  afterEach(() => cleanup());

  it('renders nothing when droughtCount < FAILSAFE_INDICATOR_APPEARS_AT', () => {
    resetStore(FAILSAFE_INDICATOR_APPEARS_AT - 1);
    const { queryByTestId } = render(<FailsafeIndicator />);
    expect(queryByTestId('failsafe-indicator')).toBeNull();
  });

  it('renders "Failsafe in 10" at droughtCount === FAILSAFE_INDICATOR_APPEARS_AT', () => {
    resetStore(FAILSAFE_INDICATOR_APPEARS_AT);
    const { getByTestId } = render(<FailsafeIndicator />);
    expect(getByTestId('failsafe-indicator').textContent).toContain('Failsafe in 10');
  });

  it('renders "Failsafe in 1" at droughtCount === DROUGHT_THRESHOLD - 1', () => {
    resetStore(DROUGHT_THRESHOLD - 1);
    const { getByTestId } = render(<FailsafeIndicator />);
    expect(getByTestId('failsafe-indicator').textContent).toContain('Failsafe in 1');
  });

  it('renders "Failsafe next" at droughtCount === DROUGHT_THRESHOLD', () => {
    resetStore(DROUGHT_THRESHOLD);
    const { getByTestId } = render(<FailsafeIndicator />);
    expect(getByTestId('failsafe-indicator').textContent).toContain('Failsafe next');
  });

  it('renders "Failsafe next" at droughtCount > DROUGHT_THRESHOLD (defensive)', () => {
    resetStore(DROUGHT_THRESHOLD + 25);
    const { getByTestId } = render(<FailsafeIndicator />);
    expect(getByTestId('failsafe-indicator').textContent).toContain('Failsafe next');
  });
});
