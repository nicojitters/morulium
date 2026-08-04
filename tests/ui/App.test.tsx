// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { App } from '../../src/App';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';

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
      fronts: FRESH_FRONTS,
      activeIncursion: null,
      serum: SERUM_STARTING_BALANCE,
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

  it('clicking the Incursion tab switches to the Incursion screen', () => {
    const { getByTestId, queryByTestId } = render(<App />);
    fireEvent.click(getByTestId('nav-tab-incursion'));
    // Empty Incursion state renders when Colony has < 4 units
    expect(getByTestId('incursion-empty-state')).toBeDefined();
    expect(queryByTestId('empty-colony')).toBeNull();
  });

  it('nav round-trip: Colony → Breed → Incursion → Colony', () => {
    const { getByTestId } = render(<App />);
    fireEvent.click(getByTestId('nav-tab-breed'));
    expect(getByTestId('breed-empty-state')).toBeDefined();
    fireEvent.click(getByTestId('nav-tab-incursion'));
    expect(getByTestId('incursion-empty-state')).toBeDefined();
    fireEvent.click(getByTestId('nav-tab-colony'));
    expect(getByTestId('empty-colony')).toBeDefined();
  });
});
