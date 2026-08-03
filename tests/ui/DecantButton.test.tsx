// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { DecantButton } from '../../src/ui/components/DecantButton';
import { useColonyStore } from '../../src/state/colony';

describe('DecantButton', () => {
  beforeEach(() => {
    useColonyStore.setState({ units: [], nextId: 1, lastDecantedId: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders with the default label "Decant a Morula"', () => {
    const { getByTestId } = render(<DecantButton />);
    expect(getByTestId('decant-button').textContent).toBe('Decant a Morula');
  });

  it('renders with a custom label when provided', () => {
    const { getByTestId } = render(<DecantButton label="Decant your first Morula" />);
    expect(getByTestId('decant-button').textContent).toBe('Decant your first Morula');
  });

  it('calls decant() on click and adds a unit to the store', () => {
    const { getByTestId } = render(<DecantButton />);
    expect(useColonyStore.getState().units).toHaveLength(0);
    fireEvent.click(getByTestId('decant-button'));
    expect(useColonyStore.getState().units).toHaveLength(1);
    expect(useColonyStore.getState().lastDecantedId).toBe(1);
  });
});
