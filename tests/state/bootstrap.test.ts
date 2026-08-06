import { describe, it, expect } from 'vitest';
import { isFirstRun, STARTER_FREE_DECANTS } from '../../src/state/bootstrap';

describe('bootstrap', () => {
  it('STARTER_FREE_DECANTS is 3', () => {
    expect(STARTER_FREE_DECANTS).toBe(3);
  });

  it('isFirstRun returns true iff !firstRunComplete', () => {
    expect(isFirstRun({ firstRunComplete: false, units: [], serum: 200 })).toBe(true);
    expect(isFirstRun({ firstRunComplete: true, units: [], serum: 0 })).toBe(false);
    expect(isFirstRun({ firstRunComplete: true, units: [{}], serum: 200 })).toBe(false);
  });
});
