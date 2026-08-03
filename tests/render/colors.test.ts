import { describe, it, expect } from 'vitest';
import { resolvePalette } from '../../src/render/colors';

describe('resolvePalette', () => {
  it('returns 4 colors for a known palette', () => {
    const c = resolvePalette('pal_ash');
    expect(c.base).toMatch(/^#[0-9a-f]{6}$/i);
    expect(c.dark).toMatch(/^#[0-9a-f]{6}$/i);
    expect(c.light).toMatch(/^#[0-9a-f]{6}$/i);
    expect(c.accent).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('throws on unknown palette id', () => {
    expect(() => resolvePalette('pal_nope')).toThrow(/unknown palette/);
  });
});
