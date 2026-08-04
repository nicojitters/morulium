import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { tierAtLeast } from '../../src/state/failsafe';
import { computeRarity } from '../../src/sim/rarity';
import { rollGenome } from '../../src/sim/genome';
import { createRng } from '../../src/sim/rng';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE, SERUM_DAILY_FAUCET, BREED_COST_SERUM } from '../../src/state/serum';

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
      fronts: FRESH_FRONTS,
      activeIncursion: null,
      serum: SERUM_STARTING_BALANCE,
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

  it('launchIncursion returns a resolution with the correct frontId and teamIds', () => {
    const u1 = useColonyStore.getState().decant();
    const u2 = useColonyStore.getState().decant();
    const u3 = useColonyStore.getState().decant();
    // Need a 4th unit but we're at the daily Harvest cap — advance a day
    vi.setSystemTime(new Date(2026, 7, 5, 12, 0, 0));
    const u4 = useColonyStore.getState().decant();
    vi.useRealTimers();

    const r = useColonyStore.getState().launchIncursion('infrastructure', [u1.id, u2.id, u3.id, u4.id]);
    expect(r.frontId).toBe('infrastructure');
    expect(r.teamIds).toEqual([u1.id, u2.id, u3.id, u4.id]);
  });

  it('launchIncursion sets activeIncursion but does NOT change front state yet', () => {
    const team = [
      useColonyStore.getState().decant(),
      useColonyStore.getState().decant(),
      useColonyStore.getState().decant(),
    ];
    vi.setSystemTime(new Date(2026, 7, 5, 12, 0, 0));
    const u4 = useColonyStore.getState().decant();
    vi.useRealTimers();

    useColonyStore.getState().launchIncursion('infrastructure', [team[0]!.id, team[1]!.id, team[2]!.id, u4.id]);
    const s = useColonyStore.getState();
    expect(s.activeIncursion).not.toBeNull();
    // Front state unchanged
    expect(s.fronts.infrastructure.captured).toBe(false);
    expect(s.fronts.infrastructure.cooldownUntil).toBeNull();
  });

  it('dismissIncursion commits captured=true on outcome=won', () => {
    // Seed 4 units directly to bypass daily cap
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 5,
    });
    // Force an "always-win" scenario: mutate the activeIncursion post-launch
    const r = useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
    // Overwrite outcome to test dismiss logic in isolation
    useColonyStore.setState({ activeIncursion: { ...r, outcome: 'won' } });
    useColonyStore.getState().dismissIncursion();
    const s = useColonyStore.getState();
    expect(s.fronts.infrastructure.captured).toBe(true);
    expect(s.fronts.infrastructure.cooldownUntil).toBeNull();
    expect(s.activeIncursion).toBeNull();
  });

  it('dismissIncursion commits cooldownUntil on outcome=failed', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 5,
    });
    const r = useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
    useColonyStore.setState({ activeIncursion: { ...r, outcome: 'failed' } });
    useColonyStore.getState().dismissIncursion();
    const s = useColonyStore.getState();
    expect(s.fronts.infrastructure.captured).toBe(false);
    const now = new Date(2026, 7, 4, 12, 0, 0).getTime();
    expect(s.fronts.infrastructure.cooldownUntil).toBe(now + 30 * 60 * 1000);
    expect(s.activeIncursion).toBeNull();
    vi.useRealTimers();
  });

  it('dismissIncursion is a no-op when activeIncursion is null', () => {
    const before = useColonyStore.getState();
    useColonyStore.getState().dismissIncursion();
    const after = useColonyStore.getState();
    expect(after.fronts).toEqual(before.fronts);
    expect(after.activeIncursion).toBeNull();
  });

  it('launchIncursion throws when front is captured', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 5,
      fronts: { ...FRESH_FRONTS, infrastructure: { captured: true, cooldownUntil: null } },
    });
    expect(() => useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]))
      .toThrow(/already captured/);
  });

  it('launchIncursion throws when front is on active cooldown', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    const now = Date.now();
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 5,
      fronts: { ...FRESH_FRONTS, military: { captured: false, cooldownUntil: now + 60_000 } },
    });
    expect(() => useColonyStore.getState().launchIncursion('military', [1, 2, 3, 4]))
      .toThrow(/on cooldown/);
    vi.useRealTimers();
  });

  it('launchIncursion allows a front whose cooldown has passed', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    const now = Date.now();
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 5,
      fronts: { ...FRESH_FRONTS, military: { captured: false, cooldownUntil: now - 60_000 } },
    });
    expect(() => useColonyStore.getState().launchIncursion('military', [1, 2, 3, 4])).not.toThrow();
    vi.useRealTimers();
  });

  it('launchIncursion throws on team size != 4', () => {
    useColonyStore.setState({
      units: [1, 2, 3].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 4,
    });
    // @ts-expect-error: intentional short tuple to test defensive check
    expect(() => useColonyStore.getState().launchIncursion('guerrilla', [1, 2, 3]))
      .toThrow(/exactly 4 members/);
  });

  it('launchIncursion throws when team ids contain duplicates', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 5,
    });
    expect(() => useColonyStore.getState().launchIncursion('guerrilla', [1, 1, 3, 4]))
      .toThrow(/must be distinct/);
  });

  it('launchIncursion throws when a team id is not a colony unit', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 5,
    });
    expect(() => useColonyStore.getState().launchIncursion('guerrilla', [1, 2, 3, 999]))
      .toThrow(/unit 999 not found/);
  });

  it('launchIncursion does NOT touch droughtCount, harvestsToday, or breedsToday', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 5,
      harvestsToday: 2,
      harvestDayKey: '2026-08-04',
      droughtCount: 17,
      breedsToday: 1,
      breedDayKey: '2026-08-04',
    });
    useColonyStore.getState().launchIncursion('guerrilla', [1, 2, 3, 4]);
    const s = useColonyStore.getState();
    expect(s.harvestsToday).toBe(2);
    expect(s.droughtCount).toBe(17);
    expect(s.breedsToday).toBe(1);
    vi.useRealTimers();
  });

  it('full round-trip: launch on Won → dismiss captures → re-launch throws', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 5,
    });
    const r = useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
    useColonyStore.setState({ activeIncursion: { ...r, outcome: 'won' } });
    useColonyStore.getState().dismissIncursion();
    expect(useColonyStore.getState().fronts.infrastructure.captured).toBe(true);
    expect(() => useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]))
      .toThrow(/already captured/);
  });

  it('starts with SERUM_STARTING_BALANCE serum', () => {
    expect(useColonyStore.getState().serum).toBe(SERUM_STARTING_BALANCE);
  });

  it('decant() same day does NOT grant the daily faucet', () => {
    // beforeEach set harvestDayKey to today — same-day decant should not trigger faucet
    const before = useColonyStore.getState().serum;
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().serum).toBe(before);
  });

  it('decant() on day-rollover grants +SERUM_DAILY_FAUCET exactly once', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    useColonyStore.setState({ harvestDayKey: '2026-08-03', serum: 200 });
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().serum).toBe(200 + SERUM_DAILY_FAUCET);

    // Second decant same day — no re-grant
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().serum).toBe(200 + SERUM_DAILY_FAUCET);
    vi.useRealTimers();
  });

  it('decant() after skipping multiple days grants faucet ONCE (not per skipped day)', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    useColonyStore.setState({ harvestDayKey: '2026-08-01', serum: 100 }); // 3 days ago
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().serum).toBe(100 + SERUM_DAILY_FAUCET); // +25, not +75
    vi.useRealTimers();
  });

  it('breed() throws /insufficient Serum/ when balance < BREED_COST_SERUM', () => {
    useColonyStore.setState({
      units: [1, 2].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 3,
      serum: BREED_COST_SERUM - 1,
    });
    expect(() => useColonyStore.getState().breed(1, 2)).toThrow(/insufficient Serum/);
  });

  it('breed() deducts BREED_COST_SERUM on success', () => {
    useColonyStore.setState({
      units: [1, 2].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 3,
      serum: 200,
    });
    useColonyStore.getState().breed(1, 2);
    expect(useColonyStore.getState().serum).toBe(200 - BREED_COST_SERUM);
  });

  it('breed() guard order: daily cap error priority over Serum error', () => {
    // breedsToday = 3 AND serum = 0 → should throw cap error (not Serum error)
    useColonyStore.setState({
      units: [1, 2].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 3,
      breedsToday: 3,
      breedDayKey: todayLocalKey(),
      serum: 0,
    });
    expect(() => useColonyStore.getState().breed(1, 2)).toThrow(/daily Breed limit/);
  });

  it('breed() does NOT deduct Serum when it throws', () => {
    useColonyStore.setState({
      units: [1].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 2,
      serum: 200,
    });
    // Missing parent → throws, but Serum should be untouched
    expect(() => useColonyStore.getState().breed(1, 999)).toThrow(/parent 999 not found/);
    expect(useColonyStore.getState().serum).toBe(200);
  });

  it('launchIncursion does NOT change serum', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 5,
      serum: 200,
    });
    useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
    expect(useColonyStore.getState().serum).toBe(200);
  });

  it('dismissIncursion does NOT change serum', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
      })),
      nextId: 5,
      serum: 200,
    });
    const r = useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
    useColonyStore.setState({ activeIncursion: { ...r, outcome: 'won' } });
    useColonyStore.getState().dismissIncursion();
    expect(useColonyStore.getState().serum).toBe(200);
  });
});
