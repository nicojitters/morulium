import type { Genome } from '../sim/types';

/**
 * A persisted Colony unit.
 *
 * Origin (pristine vs bred) is derived from `parentIds`:
 *   - `null` ⇒ pristine (Decanted / Vat output / future Incursion drop)
 *   - `[a, b]` ⇒ bred; `wear` may carry per-locus degradation
 *
 * `wear` is a per-locus scalar map. Absent key ≡ 0 (never throws on lookup).
 *
 * M7a: `culled` is a soft triage flag. False by default. Vat's "Cull All"
 * sweep operates on culled + eligible units; culled is NOT a hard gate for
 * Breed / Incursion pickers.
 */
export interface Unit {
  readonly id: number;
  readonly seed: number;
  readonly decantedAt: number;
  readonly genome: Genome;
  readonly generation: number;
  readonly parentIds: readonly [number, number] | null;
  readonly wear: Readonly<Record<string, number>>;
  readonly restCurrent: number;
  readonly injuredUntil: number | null;
  readonly culled: boolean;
}
