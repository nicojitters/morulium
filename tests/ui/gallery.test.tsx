// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Gallery } from '../../src/ui/screens/Gallery';

describe('Gallery smoke', () => {
  it('renders 50 specimen cards without throwing', () => {
    const { getAllByTestId, getByTestId } = render(<Gallery />);
    expect(getAllByTestId('specimen-card').length).toBe(50);
    expect(getByTestId('tier-legend')).toBeDefined();
    expect(getByTestId('gallery-grid')).toBeDefined();
  });

  it('renders a heading with the M2 title', () => {
    const { container } = render(<Gallery />);
    const heading = container.querySelector('h1');
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toContain('M2 sprite gallery');
  });
});
