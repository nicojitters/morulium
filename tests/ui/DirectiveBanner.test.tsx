// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DirectiveBanner } from '../../src/ui/components/DirectiveBanner';
import { useColonyStore } from '../../src/state/colony';

describe('DirectiveBanner', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('renders the title + hint for the active directive', () => {
    const { getByTestId } = render(<DirectiveBanner />);
    expect(getByTestId('directive-banner').textContent).toContain('Decant your first specimen');
    expect(getByTestId('directive-banner').textContent).toContain('Morula');
  });

  it('returns null when no directive is active', () => {
    useColonyStore.setState({ activeDirectiveId: null });
    const { queryByTestId } = render(<DirectiveBanner />);
    expect(queryByTestId('directive-banner')).toBeNull();
  });
});
