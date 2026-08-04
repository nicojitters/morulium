import type { Genome } from '../sim/types';

/**
 * A persisted Colony unit.
 *
 * Origin (pristine vs bred) is derived from `parentIds`:
 *   - `null` ⇒ pristine (Decanted / future Incursion drop / future Vat output)
 *   - `[a, b]` ⇒ bred; `wear` may carry per-locus degradation
 *
 * `wear` is a per-locus scalar map. Absent key ≡ 0 (never throws on lookup).
 *
 * M6b:
 * - `restCurrent`: 0..100, refreshed to REST_MAX on daily rollover
 *   inside decant(). Deducted by REST_DEPLOY_COST on Incursion launch.
 * - `injuredUntil`: Date.now() ms when the injury bench expires, or
 *   null when healthy. Set by launchIncursion when under-rested
 *   units roll injuries. Expires on its own timer — day-rollover
 *   does NOT reset it.
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
}
