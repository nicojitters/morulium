export type TermKey =
  | 'morula' | 'decant' | 'harvest' | 'incursion' | 'occupation' | 'vat' | 'dnaLab'
  | 'sequencer' | 'registry' | 'colony' | 'vivarium' | 'serum' | 'freeDecant'
  | 'generation' | 'tier-baseline' | 'tier-strain' | 'tier-mutant' | 'tier-chimera' | 'tier-progenitor';

export const DEFINITIONS: Readonly<Record<TermKey, string>> = {
  morula:      'An unopened vat-embryo. Decant one to reveal the specimen inside.',
  decant:      'Open a Morula and grow the specimen inside into your Colony.',
  harvest:     'Draw a fresh Morula from the vat pipeline.',
  incursion:   'Push against a contested front with a team of four specimens.',
  occupation:  'Garrison a held front so it stays yours and earns you Serum.',
  vat:         'Fuse ten same-tier specimens into one, pristine.',
  dnaLab:      'Inspect a specimen you already own — lineage, condition, tier.',
  sequencer:   'Peek at what is inside a Morula before you Decant it.',
  registry:    'A reference of everything you have met.',
  colony:      'Every specimen you have Decanted and kept.',
  vivarium:    'Buildings that shape your Colony: Barracks raise the cap, Medbay speeds recovery.',
  serum:       'The currency the operation runs on. You earn it and spend it on Morulae, breeding, and gear.',
  freeDecant:  'A Decant that costs no daily-Harvest slot.',
  generation:  'How many breeding steps deep a specimen sits — pure lineage depth, not a stat.',
  'tier-baseline':   'An ordinary specimen. Common but never worthless.',
  'tier-strain':     'A specimen with an unusual trait or two.',
  'tier-mutant':     'A specimen with several unusual traits.',
  'tier-chimera':    'A specimen with an uncommon trait fully showing.',
  'tier-progenitor': 'The rarest expression, seldom seen.',
};

export function definitionOf(k: TermKey): string {
  const d = DEFINITIONS[k];
  if (!d) throw new Error(`Unknown TermKey: ${k}`);
  return d;
}
