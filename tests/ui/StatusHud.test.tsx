// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { StatusHud } from '../../src/ui/components/StatusHud';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { DEFAULT_UNLOCKS } from '../../src/state/unlocks';

function seed(overrides: Partial<Parameters<typeof useColonyStore.setState>[0]> = {}) {
  useColonyStore.setState({
    units: [], nextId: 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0,
    breedsToday: 0, breedDayKey: todayLocalKey(),
    fronts: FRESH_FRONTS, activeIncursion: null,
    serum: 200, stims: 0, lastGarrisonTickAt: Date.now(),
    buildings: { barracks: false, medbay: false },
    lastRestTickAt: Date.now(),
    unlocks: DEFAULT_UNLOCKS,
    ...overrides,
  });
}

describe('StatusHud', () => {
  beforeEach(() => { localStorage.clear(); seed(); });
  afterEach(() => cleanup());

  it('renders the four HUD items', () => {
    const { getByTestId } = render(<StatusHud directiveText={null} />);
    expect(getByTestId('status-hud')).toBeDefined();
    expect(getByTestId('hud-serum').textContent).toContain('200');
    expect(getByTestId('hud-colony-cap').textContent).toContain('0/20');
    expect(getByTestId('hud-free-decants')).toBeDefined();
    expect(getByTestId('hud-directive')).toBeDefined();
  });

  it('shows a placeholder when directiveText is null', () => {
    const { getByTestId } = render(<StatusHud directiveText={null} />);
    expect(getByTestId('hud-directive').textContent).toMatch(/no directive/i);
  });

  it('shows the directive when provided', () => {
    const { getByTestId } = render(<StatusHud directiveText="Decant your first specimen" />);
    expect(getByTestId('hud-directive').textContent).toContain('Decant your first specimen');
  });

  it('reflects Barracks-raised cap', () => {
    seed({ buildings: { barracks: true, medbay: false } });
    const { getByTestId } = render(<StatusHud directiveText={null} />);
    expect(getByTestId('hud-colony-cap').textContent).toContain('0/40');
  });
});
