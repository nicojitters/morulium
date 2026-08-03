import type { Locus } from '../types';
import { ALLELES } from './alleles';

export { ALLELES } from './alleles';
export { PALETTES } from './palettes';

function locus(id: string, type: 'quantitative' | 'qualitative'): Locus {
  const alleles = Object.values(ALLELES)
    .filter((a) => a.locus === id)
    .map((a) => a.id);
  return { id, type, alleles };
}

export const LOCI: Readonly<Record<string, Locus>> = Object.freeze({
  musculature:      locus('musculature',      'quantitative'),
  neural_tissue:    locus('neural_tissue',    'quantitative'),
  predator_drive:   locus('predator_drive',   'quantitative'),
  carapace_density: locus('carapace_density', 'quantitative'),
  metabolism:       locus('metabolism',       'quantitative'),
  sinew:            locus('sinew',            'quantitative'),
  vigor:            locus('vigor',            'quantitative'),
  acuity:           locus('acuity',           'quantitative'),
  head:             locus('head',             'qualitative'),
  carapace:         locus('carapace',         'qualitative'),
  locomotion:       locus('locomotion',       'qualitative'),
  appendage:        locus('appendage',        'qualitative'),
  eyes:             locus('eyes',             'qualitative'),
  aberration:       locus('aberration',       'qualitative'),
  palette:          locus('palette',          'qualitative'),
});
