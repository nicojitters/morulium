// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Registry } from '../../src/ui/screens/Registry';
import { useColonyStore } from '../../src/state/colony';

describe('Registry (stub)', () => {
  afterEach(() => cleanup());

  it('renders the stub screen with a testid', () => {
    const { getByTestId } = render(<Registry />);
    expect(getByTestId('registry-screen')).toBeDefined();
  });

  it('names what the Registry is, not just "coming soon"', () => {
    const { getByTestId } = render(<Registry />);
    const text = getByTestId('registry-screen').textContent ?? '';
    expect(text.toLowerCase()).toContain('registry');
    expect(text.length).toBeGreaterThan(20);
  });
});

describe('Registry first-visit callout (P6 Task 6.5)', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => cleanup());

  it('mounts the first-visit callout when unseen', () => {
    useColonyStore.getState().resetGame();
    const { getByTestId } = render(<Registry />);
    expect(getByTestId('first-visit-registry')).toBeDefined();
  });

  it('hides the callout after markSeen', () => {
    useColonyStore.getState().resetGame();
    useColonyStore.getState().markSeen('registry');
    const { queryByTestId } = render(<Registry />);
    expect(queryByTestId('first-visit-registry')).toBeNull();
  });
});
