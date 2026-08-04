// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { IncursionBeat } from '../../src/ui/components/IncursionBeat';
import type { IncursionBeat as Beat } from '../../src/sim/incursion';

describe('IncursionBeat', () => {
  afterEach(() => cleanup());

  const stubBeat: Beat = { kind: 'verdict', text: 'The lattice folds.' };

  it('renders the beat text', () => {
    const { getByTestId } = render(<IncursionBeat beat={stubBeat} visible={true} index={0} />);
    expect(getByTestId('incursion-beat-0').textContent).toContain('The lattice folds.');
  });

  it('sets data-visible="true" when visible', () => {
    const { getByTestId } = render(<IncursionBeat beat={stubBeat} visible={true} index={3} />);
    expect(getByTestId('incursion-beat-3').getAttribute('data-visible')).toBe('true');
  });

  it('omits data-visible when hidden', () => {
    const { getByTestId } = render(<IncursionBeat beat={stubBeat} visible={false} index={1} />);
    expect(getByTestId('incursion-beat-1').getAttribute('data-visible')).toBeNull();
  });

  it('uses data-testid indexed by position', () => {
    const { getByTestId } = render(<IncursionBeat beat={stubBeat} visible={true} index={2} />);
    expect(getByTestId('incursion-beat-2')).toBeDefined();
  });
});
