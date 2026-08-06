// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { IncursionResultSummary } from '../../src/ui/components/IncursionResultSummary';
import { useColonyStore } from '../../src/state/colony';

describe('IncursionResultSummary', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('null when no last resolution', () => {
    const { queryByTestId } = render(<IncursionResultSummary />);
    expect(queryByTestId('incursion-result')).toBeNull();
  });

  it('renders qualitative won verdict', () => {
    useColonyStore.setState({
      lastIncursionResolution: {
        frontId: 'infrastructure', teamIds: [1,2,3,4] as const,
        coverage: { INT: 1.0, SPD: 0.9 },
        bestContributors: { INT: 1, SPD: 2 },
        successP: 0.95, outcome: 'won',
        beats: [{ kind: 'verdict', text: 'x' }],
      },
    });
    const { getByTestId } = render(<IncursionResultSummary />);
    const text = getByTestId('incursion-result').textContent ?? '';
    expect(text.toLowerCase()).toContain('overwhelmed');
    expect(text).not.toMatch(/\b0\.9\b/);
    expect(text).not.toMatch(/\b95\s*%/);
  });

  it('lost verdict names the weakest stat qualitatively', () => {
    useColonyStore.setState({
      lastIncursionResolution: {
        frontId: 'infrastructure', teamIds: [1,2,3,4] as const,
        coverage: { INT: 0.3, SPD: 0.9 },
        bestContributors: { INT: 1, SPD: 2 },
        successP: 0.15, outcome: 'lost' as 'failed',
        beats: [{ kind: 'verdict', text: 'x' }],
      },
    });
    const { getByTestId } = render(<IncursionResultSummary />);
    const text = getByTestId('incursion-result').textContent ?? '';
    expect(text.toLowerCase()).toContain('short');
    expect(text).toMatch(/INT/);
  });

  it('dismiss clears the resolution', () => {
    useColonyStore.setState({
      lastIncursionResolution: {
        frontId: 'infrastructure', teamIds: [1,2,3,4] as const,
        coverage: { INT: 1.0 }, bestContributors: { INT: 1 },
        successP: 0.9, outcome: 'won', beats: [],
      },
    });
    const { getByTestId, queryByTestId } = render(<IncursionResultSummary />);
    fireEvent.click(getByTestId('incursion-result-dismiss'));
    expect(queryByTestId('incursion-result')).toBeNull();
  });
});
