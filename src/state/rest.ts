// Constants for the M6b Rest + Injury + Stim mechanics.
// INJURY_CHANCE lives in src/sim/injury.ts (Task 2) because it's used
// inside the pure sim roll — do NOT duplicate here.
export const REST_MAX = 100 as const;
export const REST_DEPLOY_COST = 40 as const;
export const UNDER_RESTED_THRESHOLD = 40 as const;
export const UNDER_RESTED_PENALTY = 0.7 as const;
export const INJURY_DURATION_MS = 60 * 60 * 1000;   // 1 hour
export const INJURY_SUBSTREAM_PRIME = 1_000_213 as const;
export const STIM_COST_SERUM = 40 as const;
