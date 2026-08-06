// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { IntroModal } from '../../src/ui/components/IntroModal';

describe('IntroModal', () => {
  afterEach(() => cleanup());

  it('renders the modal with Begin and Skip', () => {
    const { getByTestId } = render(<IntroModal onDone={() => {}} />);
    expect(getByTestId('intro-modal')).toBeDefined();
    expect(getByTestId('intro-modal-begin')).toBeDefined();
    expect(getByTestId('intro-modal-skip')).toBeDefined();
  });

  it('Begin and Skip both call onDone', () => {
    const onDone = vi.fn();
    const { getByTestId } = render(<IntroModal onDone={onDone} />);
    fireEvent.click(getByTestId('intro-modal-begin'));
    fireEvent.click(getByTestId('intro-modal-skip'));
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it('body does not mention mechanics like thresholds, weights, or scores', () => {
    const { getByTestId } = render(<IntroModal onDone={() => {}} />);
    const text = (getByTestId('intro-modal').textContent ?? '').toLowerCase();
    expect(text).not.toMatch(/threshold|weight|score|percent|probability/);
  });
});
