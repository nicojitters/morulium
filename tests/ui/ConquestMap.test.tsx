// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ConquestMap } from '../../src/ui/screens/ConquestMap';

describe('ConquestMap (stub)', () => {
  afterEach(() => cleanup());

  it('renders the stub with a testid', () => {
    const { getByTestId } = render(<ConquestMap />);
    expect(getByTestId('conquest-map-screen')).toBeDefined();
  });

  it('mentions conquest and hints the map is coming', () => {
    const { getByTestId } = render(<ConquestMap />);
    const text = getByTestId('conquest-map-screen').textContent ?? '';
    expect(text.toLowerCase()).toMatch(/conquest|region|map/);
  });
});
