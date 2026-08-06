// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Registry } from '../../src/ui/screens/Registry';

describe('Registry (stub)', () => {
  afterEach(() => cleanup());

  it('renders the stub screen with a testid', () => {
    const { getByTestId } = render(<Registry />);
    expect(getByTestId('registry-screen')).toBeDefined();
  });

  it('names what the Registry is, not just "coming soon"', () => {
    const { getByTestId } = render(<Registry />);
    const text = getByTestId('registry-screen').textContent ?? '';
    expect(text.toLowerCase()).toContain('registry');
    expect(text.length).toBeGreaterThan(20);
  });
});
