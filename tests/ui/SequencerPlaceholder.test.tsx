// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SequencerPlaceholder } from '../../src/ui/screens/SequencerPlaceholder';

describe('SequencerPlaceholder', () => {
  afterEach(() => cleanup());

  it('renders with sequencer-screen testid', () => {
    const { getByTestId } = render(<SequencerPlaceholder />);
    expect(getByTestId('sequencer-screen')).toBeDefined();
  });

  it('does not leak Registry text', () => {
    const { queryByTestId } = render(<SequencerPlaceholder />);
    expect(queryByTestId('registry-screen')).toBeNull();
    expect(queryByTestId('registry-vocab')).toBeNull();
  });
});
