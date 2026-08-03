import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useColonyStore } from '../../src/state/colony';

describe('colony store', () => {
  beforeEach(() => {
    useColonyStore.setState({ units: [], nextId: 1, lastDecantedId: null });
  });

  it('starts empty with nextId=1 and no highlight', () => {
    const s = useColonyStore.getState();
    expect(s.units).toEqual([]);
    expect(s.nextId).toBe(1);
    expect(s.lastDecantedId).toBeNull();
  });

  it('decant() appends a Unit with the expected shape and increments nextId', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const unit = useColonyStore.getState().decant();
    expect(unit.id).toBe(1);
    expect(unit.seed).toBe(1);
    expect(unit.decantedAt).toBe(Date.parse('2026-01-01T00:00:00Z'));
    expect(unit.genome).toBeDefined();
    expect(unit.genome.loci).toBeDefined();

    const s = useColonyStore.getState();
    expect(s.units).toHaveLength(1);
    expect(s.units[0]).toEqual(unit);
    expect(s.nextId).toBe(2);
    expect(s.lastDecantedId).toBe(1);

    vi.useRealTimers();
  });

  it('two consecutive decants produce different genomes', () => {
    const a = useColonyStore.getState().decant();
    const b = useColonyStore.getState().decant();
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
    // Genome equality by structural check — different seeds produce different
    // allele picks (via weightedPick), so at least one locus should differ.
    const anyLocusDiffers = Object.keys(a.genome.loci).some(
      (locusId) =>
        JSON.stringify(a.genome.loci[locusId]) !== JSON.stringify(b.genome.loci[locusId]),
    );
    expect(anyLocusDiffers).toBe(true);
  });

  it('clearHighlight() sets lastDecantedId to null', () => {
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().lastDecantedId).toBe(1);
    useColonyStore.getState().clearHighlight();
    expect(useColonyStore.getState().lastDecantedId).toBeNull();
  });
});
