// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { UnlockedToast } from '../../src/ui/components/UnlockedToast';
import { useColonyStore } from '../../src/state/colony';

describe('UnlockedToast', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('null when recentUnlock is null', () => {
    const { queryByTestId } = render(<UnlockedToast />);
    expect(queryByTestId('unlocked-toast')).toBeNull();
  });

  it('renders label + reason for the Vat', () => {
    useColonyStore.setState({ recentUnlock: { id: 'vat', reason: 'Fuse ten same-tier specimens into one, pristine.' } });
    const { getByTestId } = render(<UnlockedToast />);
    const text = getByTestId('unlocked-toast').textContent ?? '';
    expect(text).toContain('Unlocked');
    expect(text).toContain('Vat');
    expect(text).toContain('Fuse');
  });

  it('auto-dismisses after 4s', () => {
    vi.useFakeTimers();
    useColonyStore.setState({ recentUnlock: { id: 'vat', reason: 'x' } });
    render(<UnlockedToast />);
    act(() => { vi.advanceTimersByTime(4100); });
    expect(useColonyStore.getState().recentUnlock).toBeNull();
    vi.useRealTimers();
  });
});
