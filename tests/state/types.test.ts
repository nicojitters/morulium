import { describe, it, expect } from 'vitest';
import { STORAGE_KEY } from '../../src/state/persist';

describe('state/persist', () => {
  it('storage key is exactly morulium/colony/v1 (bumping requires migration)', () => {
    expect(STORAGE_KEY).toBe('morulium/colony/v1');
  });
});
