import type { Allele, RarityWeight, Stat, Dominance } from '../types';

const DRAW_WEIGHT_BY_RARITY: Readonly<Record<number, number>> = { 0: 100, 1: 40, 3: 12, 6: 4, 10: 1 };
function defaultDraw(w: RarityWeight): number {
  return DRAW_WEIGHT_BY_RARITY[w] ?? 1;
}

function q(
  id: string,
  locus: string,
  label: string,
  weight: RarityWeight,
  deltas: Partial<Record<Stat, number>>,
): Allele {
  return { id, locus, label, rarityWeight: weight, drawWeight: defaultDraw(weight), statDeltas: deltas };
}

function qual(
  id: string,
  locus: string,
  label: string,
  weight: RarityWeight,
  dominance: Dominance,
  deltas: Partial<Record<Stat, number>> = {},
  ability?: string,
  drawOverride?: number,
): Allele {
  const drawWeight = drawOverride ?? defaultDraw(weight);
  return ability !== undefined
    ? { id, locus, label, rarityWeight: weight, drawWeight, statDeltas: deltas, ability, dominance }
    : { id, locus, label, rarityWeight: weight, drawWeight, statDeltas: deltas, dominance };
}

// Quantitative — 8 loci, 23 alleles total.
const QUANTITATIVE: Allele[] = [
  // musculature (axis: PWR ↔ INT)
  q('mus_strong',  'musculature', 'Corded Musculature',   3, { PWR:  4, INT: -3 }),
  q('mus_lean',    'musculature', 'Lean Musculature',     1, { PWR:  2, INT: -1 }),
  q('mus_neutral', 'musculature', 'Baseline Musculature', 0, {}),

  // neural_tissue (axis: INT ↔ VIT)
  q('neu_dense',   'neural_tissue', 'Dense Neural Tissue',    3, { INT:  4, VIT: -3 }),
  q('neu_woven',   'neural_tissue', 'Woven Neural Tissue',    1, { INT:  2, VIT: -1 }),
  q('neu_neutral', 'neural_tissue', 'Baseline Neural Tissue', 0, {}),

  // predator_drive (axis: PWR ↔ GUI)
  q('prd_hunter',  'predator_drive', 'Hunter Drive',   3, { PWR:  3, GUI: -2 }),
  q('prd_neutral', 'predator_drive', 'Balanced Drive', 0, {}),
  q('prd_stalker', 'predator_drive', 'Stalker Drive',  3, { GUI:  3, PWR: -2 }),

  // carapace_density (axis/tempo: VIT ↔ SPD)
  q('car_heavy',   'carapace_density', 'Heavy Carapace',    3, { VIT:  4, SPD: -3 }),
  q('car_medium',  'carapace_density', 'Medium Carapace',   1, { VIT:  2, SPD: -1 }),
  q('car_neutral', 'carapace_density', 'Baseline Carapace', 0, {}),

  // metabolism (tempo: SPD ↔ VIT)
  q('met_burn',    'metabolism', 'Burning Metabolism',   3, { SPD:  4, VIT: -2 }),
  q('met_fast',    'metabolism', 'Fast Metabolism',      1, { SPD:  2 }),
  q('met_neutral', 'metabolism', 'Baseline Metabolism',  0, {}),

  // sinew (tempo: SPD ↔ PWR)
  q('sin_wiry',    'sinew', 'Wiry Sinew',    1, { SPD:  3, PWR: -1 }),
  q('sin_neutral', 'sinew', 'Baseline Sinew', 0, {}),

  // vigor (fine)
  q('vig_strong',  'vigor', 'Strong Vigor',    1, { VIT:  2 }),
  q('vig_mild',    'vigor', 'Mild Vigor',      1, { VIT:  1 }),
  q('vig_neutral', 'vigor', 'Baseline Vigor',  0, {}),

  // acuity (fine)
  q('acu_sharp',   'acuity', 'Sharp Acuity',   1, { INT:  2 }),
  q('acu_keen',    'acuity', 'Keen Acuity',    1, { GUI:  1 }),
  q('acu_neutral', 'acuity', 'Baseline Acuity', 0, {}),
];

// Qualitative — 5 loci, 18 alleles total (added 3 weight-0 baselines).
// Dominance choices: all "None"/baseline options are recessive; distinctive
// parts are dominant; the aberration tree is recessive (per game spec).
const QUALITATIVE: Allele[] = [
  // head — baseline first (weight 0, dominant, heavy draw)
  qual('head_plain',    'head', 'Blunt Head',       0, 'dominant', { PWR: 1 }, undefined, 180),
  qual('head_maw',      'head', 'Maw',            3, 'dominant', { PWR: 3 }, 'Rend'),
  qual('head_sensor',   'head', 'Sensor-Cluster', 3, 'dominant', { INT: 3 }, 'Recon'),
  qual('head_mandible', 'head', 'Mandibles',      1, 'dominant', { PWR: 1 }, 'Grip'),

  // carapace — baseline first
  qual('cara_bare',     'carapace', 'Bare Hide',    0, 'dominant',  { VIT: 1 }, undefined, 180),
  qual('cara_chitin',   'carapace', 'Chitin',     1, 'dominant', { VIT: 1 }),
  qual('cara_bone',     'carapace', 'Bone-Plate', 3, 'dominant', { VIT: 3, SPD: -1 }, 'Bulwark'),
  qual('cara_hide',     'carapace', 'Hide',       1, 'recessive', { VIT: 1, SPD: 1 }),

  // locomotion — baseline first
  qual('loco_plain',    'locomotion', 'Plain Limbs',  0, 'dominant',  { SPD: 1 }, undefined, 180),
  qual('loco_sprint',   'locomotion', 'Sprint-Limbs', 3, 'dominant', { SPD: 3 }, 'Sprint'),
  qual('loco_burrow',   'locomotion', 'Burrowers',    3, 'dominant', { GUI: 3 }, 'Ambush'),
  qual('loco_bulk',     'locomotion', 'Bulk-Treads',  1, 'recessive', { VIT: 2, SPD: -1 }),

  // appendage
  qual('app_stinger',   'appendage', 'Stinger',   3, 'dominant', {},           'Venom'),
  qual('app_lash',      'appendage', 'Lash',      1, 'dominant', { PWR: 1 }),
  qual('app_spinneret', 'appendage', 'Spinneret', 3, 'dominant', { GUI: 2 },   'Cloak'),
  qual('app_none',      'appendage', 'None',      0, 'recessive'),

  // eyes — perception slot; baseline first
  qual('eyes_plain',    'eyes', 'Plain Eyes',    0, 'dominant',  { GUI: 1 },          undefined, 180),
  qual('eyes_bright',   'eyes', 'Bright Eyes',   1, 'dominant',  { INT: 1 }),
  qual('eyes_multi',    'eyes', 'Multi-Facet',   3, 'dominant',  { INT: 2 }),
  qual('eyes_singular', 'eyes', 'Singular Eye',  3, 'recessive', { GUI: 3, INT: -1 }),

  // aberration (rare recessive tree — game spec §2)
  qual('ab_none',       'aberration', 'None',       0, 'dominant',  {},          undefined, 60),
  qual('ab_voltaic',    'aberration', 'Voltaic',   10, 'recessive', { VIT: -2 }, 'Shock',   5),
  qual('ab_corrosive',  'aberration', 'Corrosive', 10, 'recessive', { SPD: -2 }, 'Melt',    5),
];

// Palette (qualitative-adjacent, no stat effect)
const PALETTE_ALLELES: Allele[] = [
  qual('pal_ash',    'palette', 'Ash',    0, 'dominant'),
  qual('pal_rust',   'palette', 'Rust',   1, 'dominant'),
  qual('pal_moss',   'palette', 'Moss',   1, 'dominant'),
  qual('pal_bloom',  'palette', 'Bloom',  3, 'recessive'),
];

function index(list: Allele[]): Readonly<Record<string, Allele>> {
  const out: Record<string, Allele> = {};
  for (const a of list) {
    if (out[a.id]) throw new Error(`duplicate allele id: ${a.id}`);
    out[a.id] = a;
  }
  return Object.freeze(out);
}

export const ALLELES = index([...QUANTITATIVE, ...QUALITATIVE, ...PALETTE_ALLELES]);
