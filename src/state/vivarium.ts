/**
 * M7b Vivarium constants. Costs and magnitudes are locked here; M7c may retune.
 * INJURY_DURATION_MEDBAY_MS overrides the base INJURY_DURATION_MS (src/state/rest.ts)
 * when state.buildings.medbay === true.
 */

export const COLONY_CAP_BASE = 20 as const;
export const COLONY_CAP_BARRACKS = 40 as const;
export const BARRACKS_COST_SERUM = 500 as const;
export const MEDBAY_COST_SERUM = 300 as const;
export const REST_REGEN_PER_HOUR = 10 as const;
export const INJURY_DURATION_MEDBAY_MS = 30 * 60 * 1000;
