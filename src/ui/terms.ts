import type { Tier } from '../sim/types';

/**
 * Single source of player-facing vocabulary.
 * Internal identifiers stay semantic and stable; only the string values here are the "name."
 * UI reads TERMS.x; logic never compares against display strings.
 */
export const TERMS = {
  tiers: {
    baseline:   'Baseline',
    strain:     'Strain',
    mutant:     'Mutant',
    chimera:    'Chimera',
    progenitor: 'Progenitor',
  } satisfies Record<Tier, string>,

  morula:      'Morula',        // was Egg
  harvest:     'Harvest',       // was Pull
  decant:      'Decant',        // was Hatch
  sequencer:   'Sequencer',     // was Egg Scanner
  cull:        'Cull',          // was Trash
  cullAll:     'Cull All',      // was Grind All Trash
  vat:         'the Vat',       // was The Grinder / Fusion
  failsafe:    'Failsafe',      // was Pity
  incursion:   'Incursion',     // was Hunt
  occupation:  'Occupation',    // was Job
  vivarium:    'Vivarium',      // was Home
  serum:       'Serum',         // was Credits
  serumAbbr:   'SR',            // was CR
  registry:    'the Registry',  // was Codex
  colony:      'the Colony',    // was Roster
  freeDecant:  'Free Decant',
  directive:   'Directive',
  dnaLab:      'the DNA Lab',
  conquestMap: 'Conquest Map',
  newGame:     'New Game',
  continueGame:'Continue',
  unlocked:    'Unlocked',
  region:      'Region',
} as const;
