import { describe, it, expect } from 'vitest';
import { DEFINITIONS, definitionOf, type TermKey } from '../../src/ui/definitions';

const ALL: TermKey[] = [
  'morula','decant','harvest','incursion','occupation','vat','dnaLab','sequencer',
  'registry','colony','vivarium','serum','freeDecant','generation',
  'tier-baseline','tier-strain','tier-mutant','tier-chimera','tier-progenitor',
];

describe('DEFINITIONS', () => {
  it('has an entry for every TermKey', () => {
    for (const k of ALL) expect(DEFINITIONS[k]).toBeTruthy();
  });

  it('every definition is ≤ 140 chars and free of numeric leakage', () => {
    for (const k of ALL) {
      const d = DEFINITIONS[k];
      expect(d.length).toBeLessThanOrEqual(140);
      expect(d).not.toMatch(/\b\d+\s*%|\b0\.\d|\bthreshold\b|\bprobability\b|\bweight\b|\brecessive\b|\bdominance\b|\bdominant\b|\bstack\b|\btail\b|\baberration\b/i);
    }
  });

  it('does not define pristine or degraded (deferred)', () => {
    expect((DEFINITIONS as unknown as Record<string, string>).pristine).toBeUndefined();
    expect((DEFINITIONS as unknown as Record<string, string>).degraded).toBeUndefined();
  });

  it('definitionOf throws on unknown key', () => {
    expect(() => definitionOf('bogus' as TermKey)).toThrow();
  });
});
