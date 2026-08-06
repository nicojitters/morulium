// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ConquestMap } from '../../src/ui/screens/ConquestMap';
import { useColonyStore } from '../../src/state/colony';

describe('ConquestMap (stub)', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('renders the stub with a testid', () => {
    const { getByTestId } = render(<ConquestMap />);
    expect(getByTestId('conquest-map-screen')).toBeDefined();
  });

  it('mentions conquest and hints the map is coming', () => {
    const { getByTestId } = render(<ConquestMap />);
    const text = getByTestId('conquest-map-screen').textContent ?? '';
    expect(text.toLowerCase()).toMatch(/conquest|region|map/);
  });
});

describe('ConquestMap first-visit callout (P6 Task 6.5)', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => cleanup());

  it('mounts the first-visit callout when unseen', () => {
    useColonyStore.getState().resetGame();
    const { getByTestId } = render(<ConquestMap />);
    expect(getByTestId('first-visit-conquest-map')).toBeDefined();
  });

  it('hides the callout after markSeen', () => {
    useColonyStore.getState().resetGame();
    useColonyStore.getState().markSeen('conquest-map');
    const { queryByTestId } = render(<ConquestMap />);
    expect(queryByTestId('first-visit-conquest-map')).toBeNull();
  });
});

describe('ConquestMap — real', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('renders the Region 1 header + three front cards', () => {
    const { getByTestId } = render(<ConquestMap />);
    expect(getByTestId('region-header-region-1').textContent).toContain('Region 1');
    expect(getByTestId('map-front-infrastructure')).toBeDefined();
    expect(getByTestId('map-front-military')).toBeDefined();
    expect(getByTestId('map-front-guerrilla')).toBeDefined();
  });

  it('shows region progress 0 of 3 on fresh state', () => {
    const { getByTestId } = render(<ConquestMap />);
    expect(getByTestId('region-progress').textContent).toContain('0 of 3');
  });

  it('shows conquest banner when all three held with no flares', () => {
    useColonyStore.setState({
      fronts: {
        infrastructure: { captured: true, cooldownUntil: null, garrison: [1], flareStartedAt: null, hardening: 0 },
        military:       { captured: true, cooldownUntil: null, garrison: [2], flareStartedAt: null, hardening: 0 },
        guerrilla:      { captured: true, cooldownUntil: null, garrison: [3], flareStartedAt: null, hardening: 0 },
      },
    });
    const { getByTestId } = render(<ConquestMap />);
    expect(getByTestId('region-progress').textContent?.toLowerCase()).toContain('conquered');
  });

  it('renders the multi-region footer promise', () => {
    const { getByTestId } = render(<ConquestMap />);
    expect(getByTestId('region-footer').textContent?.toLowerCase()).toContain('first of many');
  });
});
