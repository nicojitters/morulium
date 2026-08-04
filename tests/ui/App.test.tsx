// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { App } from '../../src/App';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';

describe('App', () => {
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
  afterEach(() => cleanup());

  it('renders Colony by default', () => {
    const { getByTestId } = render(<App />);
    // Empty Colony state renders when there are no units
    expect(getByTestId('empty-colony')).toBeDefined();
  });

  it('clicking the Breed tab switches to the Breed screen', () => {
    const { getByTestId, queryByTestId } = render(<App />);
    fireEvent.click(getByTestId('nav-tab-breed'));
    // Empty Breed state renders when Colony has < 2 units
    expect(getByTestId('breed-empty-state')).toBeDefined();
    expect(queryByTestId('empty-colony')).toBeNull();
  });

  it('clicking the Colony tab switches back', () => {
    const { getByTestId } = render(<App />);
    fireEvent.click(getByTestId('nav-tab-breed'));
    fireEvent.click(getByTestId('nav-tab-colony'));
    expect(getByTestId('empty-colony')).toBeDefined();
  });
});
