import type { Stat } from '../types';

export type FrontId = 'infrastructure' | 'military' | 'guerrilla';

export interface FrontRequirement {
  readonly threshold: number;
  readonly weight: number;
}

export interface FrontProfile {
  readonly id: FrontId;
  readonly label: string;
  readonly requirements: Readonly<Partial<Record<Stat, FrontRequirement>>>;
  readonly flavor: {
    readonly launchBlurb: string;
    readonly winBlurb: string;
    readonly failBlurb: string;
  };
}

/**
 * Frozen front profiles. Thresholds seeded from M1 verify-tool
 * distributions: a level-20 middling-Colony unit specializing in
 * a stat hits ~20-25 in that stat, so thresholds of 22 (weighted 0.6)
 * and 18 (weighted 0.4) mean a competent 2-specialist pairing wins.
 * All thresholds are [CALIBRATING] — retune after playtest.
 */
export const FRONTS: Readonly<Record<FrontId, FrontProfile>> = {
  infrastructure: {
    id: 'infrastructure',
    label: 'Infrastructure',
    requirements: {
      INT: { threshold: 22, weight: 0.6 }, // [CALIBRATING]
      SPD: { threshold: 18, weight: 0.4 }, // [CALIBRATING]
    },
    flavor: {
      launchBlurb: 'Their grid. Their logistics. Ours if we can read them.',
      winBlurb:    'The lattice folds. Infrastructure is ours.',
      failBlurb:   'Their systems repel our probes. We fall back.',
    },
  },
  military: {
    id: 'military',
    label: 'Military',
    requirements: {
      PWR: { threshold: 22, weight: 0.6 }, // [CALIBRATING]
      VIT: { threshold: 20, weight: 0.4 }, // [CALIBRATING]
    },
    flavor: {
      launchBlurb: 'Fortified lines. We break them or we bleed.',
      winBlurb:    'Their garrison collapses. Military is ours.',
      failBlurb:   'The line holds. We retreat with our dead.',
    },
  },
  guerrilla: {
    id: 'guerrilla',
    label: 'Guerrilla',
    requirements: {
      GUI: { threshold: 22, weight: 0.6 }, // [CALIBRATING]
      SPD: { threshold: 18, weight: 0.4 }, // [CALIBRATING]
    },
    flavor: {
      launchBlurb: 'A war of alleys and shadows. Reflex and cunning.',
      winBlurb:    'The cells scatter, silent. Guerrilla is ours.',
      failBlurb:   'They know every backstreet. We are pushed back.',
    },
  },
};
