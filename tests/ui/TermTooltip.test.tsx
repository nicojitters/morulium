// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { TermTooltip } from '../../src/ui/components/TermTooltip';

describe('TermTooltip', () => {
  afterEach(() => cleanup());

  it('renders the child inline', () => {
    const { getByText } = render(<TermTooltip termKey="morula">Morula</TermTooltip>);
    expect(getByText('Morula')).toBeDefined();
  });

  it('reveals the bubble on mouseenter and hides on mouseleave', () => {
    const { getByText, queryByTestId, getByTestId } = render(
      <TermTooltip termKey="morula">Morula</TermTooltip>,
    );
    const trigger = getByText('Morula').closest('span')!;
    expect(queryByTestId('tooltip-bubble-morula')).toBeNull();
    fireEvent.mouseEnter(trigger);
    expect(getByTestId('tooltip-bubble-morula').textContent).toContain('vat-embryo');
    fireEvent.mouseLeave(trigger);
    expect(queryByTestId('tooltip-bubble-morula')).toBeNull();
  });
});
