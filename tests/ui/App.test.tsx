// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { App } from '../../src/App';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';
import { DEFAULT_UNLOCKS } from '../../src/state/unlocks';

function bootIntoApp(getByTestId: (id: string) => HTMLElement) {
  // NewGameGate always mounts first; click New Game to enter the shell.
  fireEvent.click(getByTestId('new-game-gate-new-game'));
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
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
      buildings: { barracks: false, medbay: false },
      lastRestTickAt: Date.now(),
      unlocks: DEFAULT_UNLOCKS,
    });
  });
  afterEach(() => cleanup());

  it('shows NewGameGate on first load with no localStorage', () => {
    localStorage.clear();
    const { getByTestId } = render(<App />);
    expect(getByTestId('new-game-gate')).toBeDefined();
  });

  it('New Game button resets state and enters the shell', () => {
    useColonyStore.setState({ serum: 999 });
    const { getByTestId } = render(<App />);
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    expect(getByTestId('status-hud')).toBeDefined();
    expect(useColonyStore.getState().serum).toBe(SERUM_STARTING_BALANCE);
  });

  it('renders Colony by default', () => {
    const { getByTestId } = render(<App />);
    bootIntoApp(getByTestId);
    // Empty Colony state renders when there are no units
    expect(getByTestId('empty-colony')).toBeDefined();
  });

  it('clicking the Breed tab switches to the Breed screen', () => {
    const { getByTestId, queryByTestId } = render(<App />);
    bootIntoApp(getByTestId);
    fireEvent.click(getByTestId('nav-tab-breed'));
    // Empty Breed state renders when Colony has < 2 units
    expect(getByTestId('breed-empty-state')).toBeDefined();
    expect(queryByTestId('empty-colony')).toBeNull();
  });

  it('clicking the Colony tab switches back', () => {
    const { getByTestId } = render(<App />);
    bootIntoApp(getByTestId);
    fireEvent.click(getByTestId('nav-tab-breed'));
    fireEvent.click(getByTestId('nav-tab-colony'));
    expect(getByTestId('empty-colony')).toBeDefined();
  });

  it('clicking the Incursion tab switches to the Incursion screen', () => {
    const { getByTestId, queryByTestId } = render(<App />);
    bootIntoApp(getByTestId);
    fireEvent.click(getByTestId('nav-tab-incursion'));
    // Empty Incursion state renders when Colony has < 4 units
    expect(getByTestId('incursion-empty-state')).toBeDefined();
    expect(queryByTestId('empty-colony')).toBeNull();
  });

  it('nav round-trip: Colony → Breed → Incursion → Colony', () => {
    const { getByTestId } = render(<App />);
    bootIntoApp(getByTestId);
    fireEvent.click(getByTestId('nav-tab-breed'));
    expect(getByTestId('breed-empty-state')).toBeDefined();
    fireEvent.click(getByTestId('nav-tab-incursion'));
    expect(getByTestId('incursion-empty-state')).toBeDefined();
    fireEvent.click(getByTestId('nav-tab-colony'));
    expect(getByTestId('empty-colony')).toBeDefined();
  });

  it('renders StatusHud with serum in the header', () => {
    const { getByTestId } = render(<App />);
    bootIntoApp(getByTestId);
    const item = getByTestId('hud-serum');
    expect(item.textContent).toContain('200');
  });

  it('renders every nav tab (9 surfaces)', () => {
    const { getByTestId } = render(<App />);
    bootIntoApp(getByTestId);
    for (const id of [
      'colony', 'dna-lab', 'breed', 'incursion',
      'conquest-map', 'vivarium', 'vat', 'sequencer', 'registry',
    ]) {
      expect(getByTestId(`nav-tab-${id}`)).toBeDefined();
    }
  });

  it('shows IntroModal on first run after boot', () => {
    localStorage.clear();
    useColonyStore.setState({ firstRunComplete: false });
    const { getByTestId } = render(<App />);
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    expect(getByTestId('intro-modal')).toBeDefined();
  });

  it('Begin dismisses the intro and marks first-run complete', () => {
    localStorage.clear();
    useColonyStore.setState({ firstRunComplete: false });
    const { getByTestId, queryByTestId } = render(<App />);
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    fireEvent.click(getByTestId('intro-modal-begin'));
    expect(queryByTestId('intro-modal')).toBeNull();
    expect(useColonyStore.getState().firstRunComplete).toBe(true);
  });
});

describe('nav — Vat tab (M7a)', () => {
  beforeEach(() => {
    localStorage.clear();
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
      serum: 200,
      stims: 0,
      lastGarrisonTickAt: Date.now(),
      buildings: { barracks: false, medbay: false },
      lastRestTickAt: Date.now(),
      unlocks: DEFAULT_UNLOCKS,
    });
  });
  afterEach(() => cleanup());

  it('renders 4 nav tabs including Vat', () => {
    const { getByTestId } = render(<App />);
    bootIntoApp(getByTestId);
    expect(getByTestId('nav-tab-colony')).not.toBeNull();
    expect(getByTestId('nav-tab-breed')).not.toBeNull();
    expect(getByTestId('nav-tab-incursion')).not.toBeNull();
    expect(getByTestId('nav-tab-vat')).not.toBeNull();
  });

  it('clicking Vat tab switches to the Vat screen', () => {
    const { getByTestId } = render(<App />);
    bootIntoApp(getByTestId);
    // resetGame() now uses LOCKED_STARTING; explicitly unlock to exercise nav
    act(() => { useColonyStore.setState({ unlocks: DEFAULT_UNLOCKS }); });
    fireEvent.click(getByTestId('nav-tab-vat'));
    // Empty colony → Vat empty-state visible
    expect(getByTestId('vat-empty-state')).not.toBeNull();
  });
});

describe('nav — Vivarium tab (M7b)', () => {
  beforeEach(() => {
    localStorage.clear();
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
      unlocks: DEFAULT_UNLOCKS,
    });
  });
  afterEach(() => cleanup());

  it('renders 5 nav tabs including Vivarium', () => {
    const { getByTestId } = render(<App />);
    bootIntoApp(getByTestId);
    expect(getByTestId('nav-tab-colony')).not.toBeNull();
    expect(getByTestId('nav-tab-breed')).not.toBeNull();
    expect(getByTestId('nav-tab-incursion')).not.toBeNull();
    expect(getByTestId('nav-tab-vat')).not.toBeNull();
    expect(getByTestId('nav-tab-vivarium')).not.toBeNull();
  });

  it('clicking Vivarium tab switches to the Vivarium screen', () => {
    const { getByTestId } = render(<App />);
    bootIntoApp(getByTestId);
    fireEvent.click(getByTestId('nav-tab-vivarium'));
    expect(getByTestId('barracks-panel')).not.toBeNull();
  });
});
