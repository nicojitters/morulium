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

  it('full onboarding: gate → intro → directive → decant → registry discovers', () => {
    const { getByTestId } = render(<App />);
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    fireEvent.click(getByTestId('intro-modal-begin'));
    expect(getByTestId('directive-banner').textContent).toContain('Decant your first specimen');
    // navigate to Colony and Decant
    fireEvent.click(getByTestId('nav-tab-colony'));
    fireEvent.click(getByTestId('decant-button'));
    // directive advanced, reward toast fired, term discovered
    expect(getByTestId('directive-banner').textContent).toContain('DNA Lab');
    expect(useColonyStore.getState().discoveredTerms.morula).toBe(true);
    expect(useColonyStore.getState().discoveredTerms.decant).toBe(true);
    // navigate to Registry — morula row shows definition, not ???
    fireEvent.click(getByTestId('nav-tab-registry'));
    expect(getByTestId('registry-row-morula').textContent?.toLowerCase()).toContain('vat-embryo');
  });

  it('dev panel reset returns to first-run', () => {
    const { getByTestId } = render(<App />);
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    fireEvent.click(getByTestId('intro-modal-skip'));
    fireEvent.click(getByTestId('decant-button'));
    expect(useColonyStore.getState().units).toHaveLength(1);
    // open dev panel via keyboard
    fireEvent.keyDown(window, { key: 'D', shiftKey: true, metaKey: true });
    fireEvent.click(getByTestId('dev-panel-reset'));
    expect(useColonyStore.getState().units).toEqual([]);
    expect(useColonyStore.getState().firstRunComplete).toBe(false);
  });
});
