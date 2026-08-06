import { describe, it, expect } from 'vitest';
import { summarize, isSignificant } from '../../src/state/session';

describe('summarize', () => {
  it('reports Serum earned as post − pre', () => {
    const prev = { serum: 100, units: [] };
    const next = { serum: 250, units: [] };
    const s = summarize(prev, next, 0, 3_600_000);
    expect(s.elapsedMs).toBe(3_600_000);
    expect(s.serumEarned).toBe(150);
  });

  it('sums per-unit rest gain and counts injuries healed', () => {
    const prev = {
      serum: 0,
      units: [
        { id: 1, restCurrent: 40, injuredUntil: 500 },   // was injured
        { id: 2, restCurrent: 80, injuredUntil: null },
      ],
    };
    const next = {
      serum: 0,
      units: [
        { id: 1, restCurrent: 100, injuredUntil: null }, // healed + rested
        { id: 2, restCurrent: 100, injuredUntil: null }, // rested
      ],
    };
    const s = summarize(prev, next, 0, 1000);
    expect(s.restGainedTotal).toBe(60 + 20);
    expect(s.injuriesHealed).toBe(1);
  });

  it('isSignificant is false when nothing meaningful changed', () => {
    expect(isSignificant({ elapsedMs: 10_000, serumEarned: 0, restGainedTotal: 0, injuriesHealed: 0 })).toBe(false);
  });

  it('isSignificant is true when any of serum/rest/heals moved', () => {
    expect(isSignificant({ elapsedMs: 10_000, serumEarned: 5, restGainedTotal: 0, injuriesHealed: 0 })).toBe(true);
    expect(isSignificant({ elapsedMs: 10_000, serumEarned: 0, restGainedTotal: 10, injuriesHealed: 0 })).toBe(true);
    expect(isSignificant({ elapsedMs: 10_000, serumEarned: 0, restGainedTotal: 0, injuriesHealed: 1 })).toBe(true);
  });
});
