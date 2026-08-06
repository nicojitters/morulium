// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { NewGameGate } from '../../src/ui/screens/NewGameGate';

describe('NewGameGate', () => {
  afterEach(() => cleanup());

  it('renders both buttons', () => {
    const { getByTestId } = render(
      <NewGameGate hasExistingSave={true} onContinue={() => {}} onNewGame={() => {}} />,
    );
    expect(getByTestId('new-game-gate')).toBeDefined();
    expect(getByTestId('new-game-gate-continue')).toBeDefined();
    expect(getByTestId('new-game-gate-new-game')).toBeDefined();
  });

  it('disables Continue when no save exists', () => {
    const { getByTestId } = render(
      <NewGameGate hasExistingSave={false} onContinue={() => {}} onNewGame={() => {}} />,
    );
    expect((getByTestId('new-game-gate-continue') as HTMLButtonElement).disabled).toBe(true);
  });

  it('fires the callbacks on click', () => {
    const onContinue = vi.fn();
    const onNewGame = vi.fn();
    const { getByTestId } = render(
      <NewGameGate hasExistingSave={true} onContinue={onContinue} onNewGame={onNewGame} />,
    );
    fireEvent.click(getByTestId('new-game-gate-continue'));
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onNewGame).toHaveBeenCalledOnce();
  });
});
