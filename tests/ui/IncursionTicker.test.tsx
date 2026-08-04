// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { IncursionTicker } from '../../src/ui/components/IncursionTicker';
import type { IncursionResolution } from '../../src/sim/incursion';

const RESOLUTION: IncursionResolution = {
  frontId: 'infrastructure',
  teamIds: [1, 2, 3, 4],
  coverage: { INT: 0.9, SPD: 0.8 },
  bestContributors: { INT: 1, SPD: 2 },
  successP: 0.85,
  outcome: 'won',
  beats: [
    { kind: 'launch',  text: 'Their grid. Their logistics.' },
    { kind: 'stat', stat: 'INT', band: 'strong',  text: 'We read them cleanly.' },
    { kind: 'stat', stat: 'SPD', band: 'holding', text: 'Trading initiative back and forth.' },
    { kind: 'verdict', text: 'The lattice folds. Infrastructure is ours.' },
  ],
};

describe('IncursionTicker', () => {
  afterEach(() => cleanup());

  it('renders all beat slots (visible + hidden) regardless of visibleBeatCount', () => {
    const { getByTestId } = render(
      <IncursionTicker resolution={RESOLUTION} visibleBeatCount={2} onSkip={() => {}} />
    );
    expect(getByTestId('incursion-beat-0')).toBeDefined();
    expect(getByTestId('incursion-beat-1')).toBeDefined();
    expect(getByTestId('incursion-beat-2')).toBeDefined();
    expect(getByTestId('incursion-beat-3')).toBeDefined();
  });

  it('marks beats up to visibleBeatCount-1 as visible, later beats hidden', () => {
    const { getByTestId } = render(
      <IncursionTicker resolution={RESOLUTION} visibleBeatCount={2} onSkip={() => {}} />
    );
    expect(getByTestId('incursion-beat-0').getAttribute('data-visible')).toBe('true');
    expect(getByTestId('incursion-beat-1').getAttribute('data-visible')).toBe('true');
    expect(getByTestId('incursion-beat-2').getAttribute('data-visible')).toBeNull();
    expect(getByTestId('incursion-beat-3').getAttribute('data-visible')).toBeNull();
  });

  it('renders a Skip button that fires onSkip', () => {
    const onSkip = vi.fn();
    const { getByTestId } = render(
      <IncursionTicker resolution={RESOLUTION} visibleBeatCount={2} onSkip={onSkip} />
    );
    fireEvent.click(getByTestId('incursion-skip-button'));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('data-testid="incursion-ticker" is present on the container', () => {
    const { getByTestId } = render(
      <IncursionTicker resolution={RESOLUTION} visibleBeatCount={4} onSkip={() => {}} />
    );
    expect(getByTestId('incursion-ticker')).toBeDefined();
  });
});
