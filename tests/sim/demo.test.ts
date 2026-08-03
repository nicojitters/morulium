import { describe, it, expect } from 'vitest';
import { runDemo, formatDemoTable } from '../../src/sim/__demo__';

describe('runDemo', () => {
  it('returns exactly 50 rows', () => {
    expect(runDemo(1).length).toBe(50);
  });

  it('is deterministic for a given seed', () => {
    expect(runDemo(42)).toEqual(runDemo(42));
  });

  it('every row includes a tier and non-negative base stats', () => {
    for (const row of runDemo(3)) {
      expect(['Basic', 'Variant', 'Adapted', 'Evolved', 'Apex']).toContain(row.tier);
      for (const v of Object.values(row.base)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('formatDemoTable returns a non-empty string containing a header row', () => {
    const s = formatDemoTable(runDemo(1));
    expect(s.length).toBeGreaterThan(0);
    expect(s).toContain('PWR');
    expect(s).toContain('tier');
  });
});
