import { describe, it, expect } from 'vitest';
import { DISCOVERED_INITIAL, hasDiscovered } from '../../src/state/discovered';

describe('discovered', () => {
  it('starts with every term undiscovered', () => {
    for (const v of Object.values(DISCOVERED_INITIAL)) expect(v).toBe(false);
  });
  it('hasDiscovered returns the map value', () => {
    expect(hasDiscovered(DISCOVERED_INITIAL, 'morula')).toBe(false);
    expect(hasDiscovered({ ...DISCOVERED_INITIAL, morula: true }, 'morula')).toBe(true);
  });
});
