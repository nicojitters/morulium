import type { SurfaceId } from './unlocks';

export type SeenMap = Readonly<Record<SurfaceId, boolean>>;

export const SEEN_INITIAL: SeenMap = {
  colony: false, 'dna-lab': false, breed: false, vat: false, incursion: false,
  vivarium: false, 'conquest-map': false, sequencer: false, registry: false,
};

export function hasSeen(map: SeenMap, id: SurfaceId): boolean {
  return map[id] === true;
}
