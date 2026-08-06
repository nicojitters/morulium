// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { RewardToast } from '../../src/ui/components/RewardToast';
import { useColonyStore } from '../../src/state/colony';

describe('RewardToast', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('renders nothing when recentReward is null', () => {
    const { queryByTestId } = render(<RewardToast />);
    expect(queryByTestId('reward-toast')).toBeNull();
  });

  it('renders when recentReward is set and includes the SR gain', () => {
    useColonyStore.setState({ recentReward: { directiveId: 'decant-first', serum: 10 } });
    const { getByTestId } = render(<RewardToast />);
    expect(getByTestId('reward-toast').textContent).toContain('10');
  });

  it('auto-dismisses after 3 seconds', () => {
    vi.useFakeTimers();
    useColonyStore.setState({ recentReward: { directiveId: 'decant-first', serum: 10 } });
    const { queryByTestId } = render(<RewardToast />);
    expect(queryByTestId('reward-toast')).not.toBeNull();
    act(() => { vi.advanceTimersByTime(3100); });
    expect(useColonyStore.getState().recentReward).toBeNull();
    vi.useRealTimers();
  });
});
