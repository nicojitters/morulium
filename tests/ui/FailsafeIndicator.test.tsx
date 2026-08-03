// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { FailsafeIndicator } from '../../src/ui/components/FailsafeIndicator';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';

function resetStore(droughtCount: number): void {
  useColonyStore.setState({
    units: [], nextId: 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(),
    droughtCount,
  });
}

describe('FailsafeIndicator', () => {
  beforeEach(() => resetStore(0));
  afterEach(() => cleanup());

  it('renders nothing when droughtCount < 40', () => {
    resetStore(39);
    const { queryByTestId } = render(<FailsafeIndicator />);
    expect(queryByTestId('failsafe-indicator')).toBeNull();
  });

  it('renders "Failsafe in 10" at droughtCount === 40', () => {
    resetStore(40);
    const { getByTestId } = render(<FailsafeIndicator />);
    expect(getByTestId('failsafe-indicator').textContent).toContain('Failsafe in 10');
  });

  it('renders "Failsafe in 1" at droughtCount === 49', () => {
    resetStore(49);
    const { getByTestId } = render(<FailsafeIndicator />);
    expect(getByTestId('failsafe-indicator').textContent).toContain('Failsafe in 1');
  });

  it('renders "Failsafe next" at droughtCount === 50', () => {
    resetStore(50);
    const { getByTestId } = render(<FailsafeIndicator />);
    expect(getByTestId('failsafe-indicator').textContent).toContain('Failsafe next');
  });

  it('renders "Failsafe next" at droughtCount > 50 (defensive)', () => {
    resetStore(75);
    const { getByTestId } = render(<FailsafeIndicator />);
    expect(getByTestId('failsafe-indicator').textContent).toContain('Failsafe next');
  });
});
