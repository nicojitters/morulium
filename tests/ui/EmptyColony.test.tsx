// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { EmptyColony } from '../../src/ui/components/EmptyColony';
import { useColonyStore } from '../../src/state/colony';

describe('EmptyColony', () => {
  beforeEach(() => {
    useColonyStore.setState({ units: [], nextId: 1, lastDecantedId: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the empty-state title and CTA', () => {
    const { getByTestId, getByText } = render(<EmptyColony />);
    expect(getByTestId('empty-colony')).toBeDefined();
    expect(getByText(/your colony is empty/i)).toBeDefined();
    expect(getByTestId('decant-button').textContent).toBe('Decant your first Morula');
  });

  it('clicking the CTA decants the first specimen', () => {
    const { getByTestId } = render(<EmptyColony />);
    fireEvent.click(getByTestId('decant-button'));
    expect(useColonyStore.getState().units).toHaveLength(1);
  });
});
