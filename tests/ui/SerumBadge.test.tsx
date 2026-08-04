// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SerumBadge } from '../../src/ui/components/SerumBadge';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';

describe('SerumBadge', () => {
  beforeEach(() => {
    useColonyStore.setState({
      units: [], nextId: 1, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS, activeIncursion: null,
      serum: SERUM_STARTING_BALANCE,
      stims: 0,
    });
  });
  afterEach(() => cleanup());

  it('renders "SR 200" on fresh state', () => {
    const { getByTestId } = render(<SerumBadge />);
    expect(getByTestId('serum-badge').textContent).toBe('SR 200');
  });

  it('reflects store changes — setState serum=42 → renders "SR 42"', () => {
    useColonyStore.setState({ serum: 42 });
    const { getByTestId } = render(<SerumBadge />);
    expect(getByTestId('serum-badge').textContent).toBe('SR 42');
  });

  it('renders "SR 0" when balance is zero', () => {
    useColonyStore.setState({ serum: 0 });
    const { getByTestId } = render(<SerumBadge />);
    expect(getByTestId('serum-badge').textContent).toBe('SR 0');
  });

  it('data-testid="serum-badge" is present on the container', () => {
    const { getByTestId } = render(<SerumBadge />);
    expect(getByTestId('serum-badge')).toBeDefined();
  });
});
