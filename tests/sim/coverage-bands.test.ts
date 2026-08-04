import { describe, it, expect } from 'vitest';
import { bandForCoverage, BAND_PHRASES } from '../../src/sim/coverage-bands';
import { STATS } from '../../src/sim/types';

describe('bandForCoverage', () => {
  it('returns "crushed" below 0.5', () => {
    expect(bandForCoverage(0)).toBe('crushed');
    expect(bandForCoverage(0.499)).toBe('crushed');
  });
  it('returns "dangerouslySlow" at 0.5 up to 0.8', () => {
    expect(bandForCoverage(0.5)).toBe('dangerouslySlow');
    expect(bandForCoverage(0.799)).toBe('dangerouslySlow');
  });
  it('returns "holding" at 0.8 up to 1.0', () => {
    expect(bandForCoverage(0.8)).toBe('holding');
    expect(bandForCoverage(0.999)).toBe('holding');
  });
  it('returns "strong" at 1.0 up to 1.15', () => {
    expect(bandForCoverage(1.0)).toBe('strong');
    expect(bandForCoverage(1.149)).toBe('strong');
  });
  it('returns "overwhelming" at 1.15 and above', () => {
    expect(bandForCoverage(1.15)).toBe('overwhelming');
    expect(bandForCoverage(10)).toBe('overwhelming');
  });
});

describe('BAND_PHRASES', () => {
  it('has every (stat, band) pair populated with a non-empty string', () => {
    const bands = ['crushed', 'dangerouslySlow', 'holding', 'strong', 'overwhelming'] as const;
    for (const s of STATS) {
      for (const b of bands) {
        const phrase = BAND_PHRASES[s][b];
        expect(typeof phrase).toBe('string');
        expect(phrase.length).toBeGreaterThan(0);
      }
    }
  });
});
