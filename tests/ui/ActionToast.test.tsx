// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { ActionToast } from '../../src/ui/components/ActionToast';
import { useColonyStore } from '../../src/state/colony';

describe('ActionToast', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('null when no message', () => {
    const { queryByTestId } = render(<ActionToast />);
    expect(queryByTestId('action-toast')).toBeNull();
  });

  it('shows the message when set', () => {
    useColonyStore.setState({ recentActionMessage: 'Decanted #1.' });
    const { getByTestId } = render(<ActionToast />);
    expect(getByTestId('action-toast').textContent).toContain('Decanted #1');
  });

  it('auto-dismisses after 2.5s', () => {
    vi.useFakeTimers();
    useColonyStore.setState({ recentActionMessage: 'x' });
    render(<ActionToast />);
    act(() => { vi.advanceTimersByTime(2600); });
    expect(useColonyStore.getState().recentActionMessage).toBeNull();
    vi.useRealTimers();
  });
});
