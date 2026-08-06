// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { App } from '../../src/App';
import { useColonyStore } from '../../src/state/colony';

describe('onboarding — locked → unlocked flow', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('fresh state: Vat + Sequencer tabs are disabled', () => {
    const { getByTestId } = render(<App />);
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    fireEvent.click(getByTestId('intro-modal-skip'));
    expect((getByTestId('nav-tab-vat') as HTMLButtonElement).disabled).toBe(true);
    expect((getByTestId('nav-tab-sequencer') as HTMLButtonElement).disabled).toBe(true);
    expect((getByTestId('nav-tab-colony') as HTMLButtonElement).disabled).toBe(false);
  });

  it('after unlockSurface("vat"), the Vat tab becomes enabled and toast fires', () => {
    const { getByTestId } = render(<App />);
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    fireEvent.click(getByTestId('intro-modal-skip'));
    act(() => { useColonyStore.getState().unlockSurface('vat'); });
    expect((getByTestId('nav-tab-vat') as HTMLButtonElement).disabled).toBe(false);
    expect(getByTestId('unlocked-toast')).toBeDefined();
  });
});
