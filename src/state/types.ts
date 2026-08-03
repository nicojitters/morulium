import type { Genome } from '../sim/types';

/**
 * A persisted Colony unit (M3a shape). Level, xp, tags, injury, and rest
 * state are deferred to M3b / M4+.
 *
 * `id` and `seed` are the same value in M3a — they diverge later (breeding /
 * Vat fusion may produce units whose seed is derived, not the id itself).
 */
export interface Unit {
  readonly id: number;
  readonly seed: number;
  readonly decantedAt: number;   // Date.now() at Decant, for sorting
  readonly genome: Genome;
}
