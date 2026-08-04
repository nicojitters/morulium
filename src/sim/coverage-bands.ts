import type { Stat } from './types';

export type CoverageBand = 'crushed' | 'dangerouslySlow' | 'holding' | 'strong' | 'overwhelming';

/**
 * Bucket a coverage ratio into a qualitative band. Boundaries chosen so
 * SUCCESS_CUTOFF (0.85) sits comfortably inside the "holding" band —
 * a per-stat coverage of "holding" or better usually clears the cutoff.
 */
export function bandForCoverage(c: number): CoverageBand {
  if (c < 0.5) return 'crushed';
  if (c < 0.8) return 'dangerouslySlow';
  if (c < 1.0) return 'holding';
  if (c < 1.15) return 'strong';
  return 'overwhelming';
}

/**
 * Per-stat × per-band ticker phrases. 5 stats × 5 bands = 25 authored strings.
 * Front-agnostic at first; per-front variants deferred (spec §Deferred).
 * Copy leans conquest/military voice per game spec §1.
 */
export const BAND_PHRASES: Readonly<Record<Stat, Readonly<Record<CoverageBand, string>>>> = {
  PWR: {
    crushed:         'Their line grinds us to nothing.',
    dangerouslySlow: 'We punch, but the mass absorbs it.',
    holding:         'Trading blows evenly.',
    strong:          'Our push breaks their front.',
    overwhelming:    'We shatter them before they set.',
  },
  VIT: {
    crushed:         'Casualties compound faster than we can absorb.',
    dangerouslySlow: 'Attrition is punishing.',
    holding:         'The line bends but does not break.',
    strong:          'We take hits and keep moving.',
    overwhelming:    'They cannot dent us.',
  },
  SPD: {
    crushed:         'They act before we can respond.',
    dangerouslySlow: 'Our tempo lags theirs — we react, never lead.',
    holding:         'Trading initiative back and forth.',
    strong:          'We stay a beat ahead.',
    overwhelming:    'They never get to move.',
  },
  INT: {
    crushed:         'We are outmaneuvered before we act.',
    dangerouslySlow: 'They anticipate every angle.',
    holding:         'A slow chess match, tightly played.',
    strong:          'We read them cleanly.',
    overwhelming:    'Their patterns unravel in front of us.',
  },
  GUI: {
    crushed:         'They see us coming from every alley.',
    dangerouslySlow: 'Cover keeps evaporating.',
    holding:         'A jagged, close-quarters grind.',
    strong:          'We slip in unseen, again and again.',
    overwhelming:    'They cannot find us until it is too late.',
  },
};
