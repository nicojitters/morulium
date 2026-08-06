import { describe, it, expect } from 'vitest';
import { DEFAULT_UNLOCKS, LOCKED_STARTING, UNLOCK_REASONS, isUnlocked, type SurfaceId } from '../../src/state/unlocks';

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

describe('LOCKED_STARTING', () => {
  it('locks Vat and Sequencer, unlocks everything else', () => {
    expect(LOCKED_STARTING.vat.status).toBe('locked');
    expect(LOCKED_STARTING.sequencer.status).toBe('locked');
    for (const id of ['colony', 'dna-lab', 'breed', 'incursion', 'vivarium', 'conquest-map', 'registry'] as SurfaceId[]) {
      expect(LOCKED_STARTING[id].status).toBe('unlocked');
    }
  });

  it('UNLOCK_REASONS has an entry for every surface', () => {
    const ids: SurfaceId[] = ['colony', 'dna-lab', 'breed', 'vat', 'incursion', 'vivarium', 'conquest-map', 'sequencer', 'registry'];
    for (const id of ids) expect(UNLOCK_REASONS[id]).toBeTruthy();
  });
});
