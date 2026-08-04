import type { Genome } from '../sim/types';

/**
 * A persisted Colony unit.
 *
 * Origin (pristine vs bred) is derived from `parentIds`:
 *   - `null` ⇒ pristine (Decanted / future Incursion drop / future Vat output)
 *   - `[a, b]` ⇒ bred; `wear` may carry per-locus degradation
 *
 * `wear` is a per-locus scalar map. Absent key ≡ 0 (never throws on lookup).
 * A mutation at either allele of a locus clears that locus's wear (see
 * sim/wear.ts nextWear).
 */
export interface Unit {
  readonly id: number;
  readonly seed: number;
  readonly decantedAt: number;
  readonly genome: Genome;
  readonly generation: number;
  readonly parentIds: readonly [number, number] | null;
  readonly wear: Readonly<Record<string, number>>;
}
