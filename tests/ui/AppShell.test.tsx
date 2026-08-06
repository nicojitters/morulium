// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { AppShell } from '../../src/ui/components/AppShell';
import { useColonyStore } from '../../src/state/colony';
import { DEFAULT_UNLOCKS, type SurfaceId } from '../../src/state/unlocks';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';

const ALL_SURFACES: readonly SurfaceId[] = [
  'colony', 'dna-lab', 'breed', 'vat', 'incursion',
  'vivarium', 'conquest-map', 'sequencer', 'registry',
];

function seed(unlocks = DEFAULT_UNLOCKS) {
  useColonyStore.setState({
    units: [], nextId: 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0,
    breedsToday: 0, breedDayKey: todayLocalKey(),
    fronts: FRESH_FRONTS, activeIncursion: null,
    serum: 200, stims: 0, lastGarrisonTickAt: Date.now(),
    buildings: { barracks: false, medbay: false },
    lastRestTickAt: Date.now(),
    unlocks,
  });
}

describe('AppShell', () => {
  beforeEach(() => { localStorage.clear(); seed(); });
  afterEach(() => cleanup());

  it('renders a nav tab for every surface', () => {
    const { getByTestId } = render(
      <AppShell current="colony" onNavigate={() => {}} directiveText={null}>
        <div data-testid="child" />
      </AppShell>,
    );
    for (const id of ALL_SURFACES) {
      expect(getByTestId(`nav-tab-${id}`)).toBeDefined();
    }
    expect(getByTestId('status-hud')).toBeDefined();
    expect(getByTestId('child')).toBeDefined();
  });

  it('calls onNavigate when an unlocked tab is clicked', () => {
    const spy = vi.fn();
    const { getByTestId } = render(
      <AppShell current="colony" onNavigate={spy} directiveText={null}>
        <div />
      </AppShell>,
    );
    fireEvent.click(getByTestId('nav-tab-dna-lab'));
    expect(spy).toHaveBeenCalledWith('dna-lab');
  });

  it('renders locked tabs with disabled state and does not fire onNavigate', () => {
    seed({
      ...DEFAULT_UNLOCKS,
      vat: { status: 'locked', reason: 'complete an Incursion first' },
    });
    const spy = vi.fn();
    const { getByTestId } = render(
      <AppShell current="colony" onNavigate={spy} directiveText={null}>
        <div />
      </AppShell>,
    );
    const vatTab = getByTestId('nav-tab-vat') as HTMLButtonElement;
    expect(vatTab.disabled).toBe(true);
    fireEvent.click(vatTab);
    expect(spy).not.toHaveBeenCalled();
  });

  it('forwards directiveText to the HUD', () => {
    const { getByTestId } = render(
      <AppShell current="colony" onNavigate={() => {}} directiveText="Decant your first specimen">
        <div />
      </AppShell>,
    );
    expect(getByTestId('hud-directive').textContent).toContain('Decant your first specimen');
  });
});
