// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ConquestMap } from '../../src/ui/screens/ConquestMap';
import { useColonyStore } from '../../src/state/colony';

describe('ConquestMap (stub)', () => {
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
