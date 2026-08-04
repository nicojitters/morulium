// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { DecantButton } from '../../src/ui/components/DecantButton';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';

describe('DecantButton', () => {
  beforeEach(() => {
    useColonyStore.setState({
      units: [], nextId: 1, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders with default header label including N/3', () => {
    const { getByTestId } = render(<DecantButton />);
    expect(getByTestId('decant-button').textContent).toBe('Decant a Morula (3/3)');
  });

  it('renders with a custom label (bypasses N/3 suffix) when label prop is set', () => {
    const { getByTestId } = render(<DecantButton label="Decant your first Morula" />);
    expect(getByTestId('decant-button').textContent).toBe('Decant your first Morula');
  });

  it('calls decant() on click and adds a unit to the store', () => {
    const { getByTestId } = render(<DecantButton />);
    expect(useColonyStore.getState().units).toHaveLength(0);
    fireEvent.click(getByTestId('decant-button'));
    expect(useColonyStore.getState().units).toHaveLength(1);
    expect(useColonyStore.getState().lastDecantedId).toBe(1);
  });

  it('label reflects harvests remaining', () => {
    useColonyStore.setState({
      units: [], nextId: 2, lastDecantedId: null,
      harvestsToday: 2, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
    });
    const { getByTestId } = render(<DecantButton />);
    expect(getByTestId('decant-button').textContent).toBe('Decant a Morula (1/3)');
  });

  it('renders disabled with countdown label when limit hit', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4, 16, 37, 0)); // 7h 23m to midnight
    useColonyStore.setState({
      units: [], nextId: 4, lastDecantedId: null,
      harvestsToday: 3, harvestDayKey: '2026-08-04',
      droughtCount: 0,
    });
    const { getByTestId } = render(<DecantButton />);
    const btn = getByTestId('decant-button');
    expect(btn.textContent).toBe('Next Harvest in 7h 23m');
    expect(btn.getAttribute('disabled')).not.toBeNull();
    expect(btn.getAttribute('data-disabled')).toBe('true');
  });

  it('click is a no-op when disabled — store state unchanged', () => {
    useColonyStore.setState({
      units: [], nextId: 4, lastDecantedId: null,
      harvestsToday: 3, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
    });
    const { getByTestId } = render(<DecantButton />);
    fireEvent.click(getByTestId('decant-button'));
    expect(useColonyStore.getState().units).toHaveLength(0);
    expect(useColonyStore.getState().harvestsToday).toBe(3);
  });
});
