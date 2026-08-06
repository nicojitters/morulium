import { describe, it, expect } from 'vitest';
import { DEFAULT_UNLOCKS, isUnlocked, type SurfaceId } from '../../src/state/unlocks';

describe('unlocks defaults', () => {
  it('exposes every SurfaceId with status unlocked', () => {
    const ids: readonly SurfaceId[] = [
      'colony', 'dna-lab', 'breed', 'vat', 'incursion',
      'vivarium', 'conquest-map', 'sequencer', 'registry',
    ];
    for (const id of ids) {
      expect(DEFAULT_UNLOCKS[id]).toBeDefined();
      expect(DEFAULT_UNLOCKS[id].status).toBe('unlocked');
    }
  });

  it('isUnlocked returns true for the default map on every surface', () => {
    for (const id of Object.keys(DEFAULT_UNLOCKS) as SurfaceId[]) {
      expect(isUnlocked(DEFAULT_UNLOCKS, id)).toBe(true);
    }
  });
});
