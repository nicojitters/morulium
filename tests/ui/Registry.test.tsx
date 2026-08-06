// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Registry } from '../../src/ui/screens/Registry';
import { useColonyStore } from '../../src/state/colony';

describe('Registry (real)', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('renders the two group headers and stats', () => {
    const { getByTestId } = render(<Registry />);
    expect(getByTestId('registry-screen')).toBeDefined();
    expect(getByTestId('registry-vocab')).toBeDefined();
    expect(getByTestId('registry-tiers')).toBeDefined();
    expect(getByTestId('registry-stats')).toBeDefined();
  });

  it('shows undiscovered terms as ???', () => {
    const { getByTestId } = render(<Registry />);
    // "morula" not discovered on a fresh reset — should render its row as locked
    const row = getByTestId('registry-row-morula');
    expect(row.textContent).toContain('???');
  });

  it('shows the definition once discovered', () => {
    useColonyStore.getState().discoverTerm('morula');
    const { getByTestId } = render(<Registry />);
    const row = getByTestId('registry-row-morula');
    expect(row.textContent?.toLowerCase()).toContain('vat-embryo');
  });
});

describe('Registry first-visit callout (P6 Task 6.5)', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('mounts the first-visit callout when unseen', () => {
    const { getByTestId } = render(<Registry />);
    expect(getByTestId('first-visit-registry')).toBeDefined();
  });

  it('hides the callout after markSeen', () => {
    useColonyStore.getState().markSeen('registry');
    const { queryByTestId } = render(<Registry />);
    expect(queryByTestId('first-visit-registry')).toBeNull();
  });
});
