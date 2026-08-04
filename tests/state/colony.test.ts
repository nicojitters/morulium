import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { tierAtLeast } from '../../src/state/failsafe';
import { computeRarity } from '../../src/sim/rarity';

describe('colony store', () => {
  beforeEach(() => {
    useColonyStore.setState({
      units: [],
      nextId: 1,
      lastDecantedId: null,
      harvestsToday: 0,
      harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0,
      breedDayKey: todayLocalKey(),
    });
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
    // M4 pristine defaults
    expect(unit.generation).toBe(0);
    expect(unit.parentIds).toBeNull();
    expect(unit.wear).toEqual({});

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

  it('decant() enforces daily harvest limit and throws on the 4th call', () => {
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().harvestsToday).toBe(3);
    expect(() => useColonyStore.getState().decant()).toThrow(/daily Harvest limit/);
  });

  it('day rollover resets the harvest counter', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().harvestsToday).toBe(3);

    // Advance one day
    vi.setSystemTime(new Date(2026, 7, 5, 12, 0, 0));
    const unit = useColonyStore.getState().decant();
    expect(unit.id).toBe(4);
    expect(useColonyStore.getState().harvestsToday).toBe(1); // reset then +1
    expect(useColonyStore.getState().harvestDayKey).toBe('2026-08-05');
    vi.useRealTimers();
  });

  it('drought counter increments on non-Chimera+ rolls', () => {
    // Force the harvest limit high enough not to interfere
    useColonyStore.setState({
      units: [], nextId: 1, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    // The current allele distribution gives Chimera+ ~5% of the time; over
    // three consecutive small-id rolls (id=1..3), it is overwhelmingly likely
    // all three are dry. We just check the counter advances and is bounded by
    // the number of dry vs. chimera+ rolls.
    const before = useColonyStore.getState().droughtCount;
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    const after = useColonyStore.getState().droughtCount;
    const chimeraCount = useColonyStore
      .getState()
      .units.filter((u) => tierAtLeast(computeRarity(u.genome).tier, 'chimera')).length;
    // Each dry Decant increments drought by 1; each Chimera+ resets it to 0.
    // So: after >= 0 (always) and after <= 3 (upper bound in 3 rolls).
    expect(after).toBeGreaterThanOrEqual(0);
    expect(after).toBeLessThanOrEqual(3);
    // If none were Chimera+, after should equal before + 3.
    if (chimeraCount === 0) {
      expect(after).toBe(before + 3);
    }
  });

  it('drought counter resets to 0 when a naturally-rolled Chimera+ appears', () => {
    // Seed droughtCount at a middling value; if the next natural roll is Chimera+, reset
    useColonyStore.setState({
      units: [], nextId: 1, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 10,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    const unit = useColonyStore.getState().decant();
    const { tier } = computeRarity(unit.genome);
    if (tierAtLeast(tier, 'chimera')) {
      expect(useColonyStore.getState().droughtCount).toBe(0);
    } else {
      expect(useColonyStore.getState().droughtCount).toBe(11);
    }
  });

  it('failsafe fires when droughtCount >= 50 and returns a Chimera+ genome', () => {
    useColonyStore.setState({
      units: [], nextId: 42, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 50,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    const unit = useColonyStore.getState().decant();
    expect(tierAtLeast(computeRarity(unit.genome).tier, 'chimera')).toBe(true);
    // After the guaranteed roll, droughtCount resets to 0
    expect(useColonyStore.getState().droughtCount).toBe(0);
    // nextId still advances by exactly 1
    expect(useColonyStore.getState().nextId).toBe(43);
  });

  it('failsafe is deterministic: same (nextId, droughtCount=50) yields same genome', () => {
    useColonyStore.setState({
      units: [], nextId: 99, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 50,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    const first = useColonyStore.getState().decant();

    useColonyStore.setState({
      units: [], nextId: 99, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 50,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    const second = useColonyStore.getState().decant();

    expect(first.genome).toEqual(second.genome);
  });

  it('breed() creates a child with parentIds, generation=max(pA,pB)+1, and wear', () => {
    // Seed two pristine parents by decanting them
    const pA = useColonyStore.getState().decant();
    const pB = useColonyStore.getState().decant();
    expect(pA.generation).toBe(0);
    expect(pB.generation).toBe(0);

    const child = useColonyStore.getState().breed(pA.id, pB.id);
    expect(child.parentIds).toEqual([pA.id, pB.id]);
    expect(child.generation).toBe(1);
    // Wear map is populated for every locus that wasn't mutated (both parents pristine)
    const wearEntries = Object.keys(child.wear).length;
    expect(wearEntries).toBeGreaterThan(0);
    // Store state updated
    const s = useColonyStore.getState();
    expect(s.units).toHaveLength(3);
    expect(s.lastDecantedId).toBe(child.id);
    expect(s.breedsToday).toBe(1);
  });

  it('breed() throws when parents are the same unit', () => {
    const pA = useColonyStore.getState().decant();
    expect(() => useColonyStore.getState().breed(pA.id, pA.id)).toThrow(/breed a specimen with itself/);
  });

  it('breed() throws when a parent id is missing', () => {
    const pA = useColonyStore.getState().decant();
    expect(() => useColonyStore.getState().breed(pA.id, 999)).toThrow(/parent 999 not found/);
    expect(() => useColonyStore.getState().breed(999, pA.id)).toThrow(/parent 999 not found/);
  });

  it('breed() enforces DAILY_BREED_LIMIT and throws on the 4th same-day call', () => {
    const pA = useColonyStore.getState().decant();
    const pB = useColonyStore.getState().decant();
    useColonyStore.getState().breed(pA.id, pB.id);
    useColonyStore.getState().breed(pA.id, pB.id);
    useColonyStore.getState().breed(pA.id, pB.id);
    expect(useColonyStore.getState().breedsToday).toBe(3);
    expect(() => useColonyStore.getState().breed(pA.id, pB.id)).toThrow(/daily Breed limit/);
  });

  it('day rollover resets the breed counter', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    const pA = useColonyStore.getState().decant();
    const pB = useColonyStore.getState().decant();
    useColonyStore.getState().breed(pA.id, pB.id);
    useColonyStore.getState().breed(pA.id, pB.id);
    useColonyStore.getState().breed(pA.id, pB.id);
    expect(useColonyStore.getState().breedsToday).toBe(3);

    vi.setSystemTime(new Date(2026, 7, 5, 12, 0, 0));
    useColonyStore.getState().breed(pA.id, pB.id);
    expect(useColonyStore.getState().breedsToday).toBe(1);
    expect(useColonyStore.getState().breedDayKey).toBe('2026-08-05');
    vi.useRealTimers();
  });

  it('breed() does NOT touch droughtCount', () => {
    const pA = useColonyStore.getState().decant();
    const pB = useColonyStore.getState().decant();
    // Force droughtCount to a known value
    useColonyStore.setState({ droughtCount: 42 });
    useColonyStore.getState().breed(pA.id, pB.id);
    expect(useColonyStore.getState().droughtCount).toBe(42);
  });

  it('breed() is deterministic: same (nextId, pA.genome, pB.genome) yields same offspring genome', () => {
    const pA = useColonyStore.getState().decant();
    const pB = useColonyStore.getState().decant();
    const firstNextId = useColonyStore.getState().nextId;

    const c1 = useColonyStore.getState().breed(pA.id, pB.id);

    // Reset to the same state and breed again
    useColonyStore.setState({
      units: [pA, pB],
      nextId: firstNextId,
      lastDecantedId: null,
      harvestsToday: 0,
      harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0,
      breedDayKey: todayLocalKey(),
    });
    const c2 = useColonyStore.getState().breed(pA.id, pB.id);

    expect(c1.genome).toEqual(c2.genome);
    expect(c1.wear).toEqual(c2.wear);
  });

  it('a bred child inherits generation as max(pA, pB) + 1', () => {
    const pA = useColonyStore.getState().decant();
    const pB = useColonyStore.getState().decant();
    const g1 = useColonyStore.getState().breed(pA.id, pB.id);
    expect(g1.generation).toBe(1);

    // Cross g1 with pA — child should be gen 2
    const g2 = useColonyStore.getState().breed(g1.id, pA.id);
    expect(g2.generation).toBe(2);

    // Cross g2 with g1 (gen 2 × gen 1) → gen 3
    const g3 = useColonyStore.getState().breed(g2.id, g1.id);
    expect(g3.generation).toBe(3);
  });
});
