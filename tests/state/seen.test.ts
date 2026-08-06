import { describe, it, expect } from 'vitest';
import { SEEN_INITIAL, hasSeen } from '../../src/state/seen';

describe('seen', () => {
  it('SEEN_INITIAL is all false', () => {
    for (const v of Object.values(SEEN_INITIAL)) expect(v).toBe(false);
  });
  it('hasSeen reflects the map', () => {
    expect(hasSeen(SEEN_INITIAL, 'colony')).toBe(false);
    expect(hasSeen({ ...SEEN_INITIAL, colony: true }, 'colony')).toBe(true);
  });
});
