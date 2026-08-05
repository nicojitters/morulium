import type { Tier } from '../sim/types';

/**
 * Batch size for a single Vat operation: 10 donors → 1 output.
 * See docs/superpowers/specs/2026-08-04-m7a-vat-cull-design.md.
 */
export const VAT_INPUT_SIZE = 10 as const;

/**
 * Maximum Vat operations per "Cull All" click. Caps total shredded at 100.
 */
export const VAT_MAX_BATCH_SIZE = 10 as const;

/**
 * Deterministic RNG substream prime for Vat rolls.
 * Distinct from FAILSAFE (1_000_003), BREED (1_000_033),
 * INCURSION (1_000_099), INJURY (1_000_213).
 */
export const VAT_SUBSTREAM_PRIME = 1_000_331 as const;

/**
 * Per input tier: probability of bumping the output tier by 0, 1, or 2 tiers.
 * Rows sum to 1.0. Progenitor stays Progenitor (already at top).
 */
export const VAT_TIER_BUMP_TABLE: Readonly<Record<Tier, { bump0: number; bump1: number; bump2: number }>> = {
  baseline:   { bump0: 0.10, bump1: 0.90, bump2: 0.00 },
  strain:     { bump0: 0.10, bump1: 0.90, bump2: 0.00 },
  mutant:     { bump0: 0.10, bump1: 0.90, bump2: 0.00 },
  chimera:    { bump0: 0.10, bump1: 0.90, bump2: 0.00 },
  progenitor: { bump0: 1.00, bump1: 0.00, bump2: 0.00 },
};
