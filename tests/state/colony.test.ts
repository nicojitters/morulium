import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { tierAtLeast } from '../../src/state/failsafe';
import { computeRarity } from '../../src/sim/rarity';
import { rollGenome } from '../../src/sim/genome';
import { createRng } from '../../src/sim/rng';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE, SERUM_DAILY_FAUCET, BREED_COST_SERUM } from '../../src/state/serum';
import { REST_MAX, REST_DEPLOY_COST, STIM_COST_SERUM } from '../../src/state/rest';
import { RADICALIZATION_BONUS } from '../../src/state/occupation';

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
      stims: 0,
      lastGarrisonTickAt: Date.now(),   // NEW
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
        restCurrent: REST_MAX, injuredUntil: null,
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
        restCurrent: REST_MAX, injuredUntil: null,
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
        restCurrent: REST_MAX, injuredUntil: null,
      })),
      nextId: 5,
      fronts: { ...FRESH_FRONTS, infrastructure: { captured: true, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 } },
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
        restCurrent: REST_MAX, injuredUntil: null,
      })),
      nextId: 5,
      fronts: { ...FRESH_FRONTS, military: { captured: false, cooldownUntil: now + 60_000, garrison: [], flareStartedAt: null, hardening: 0 } },
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
        restCurrent: REST_MAX, injuredUntil: null,
      })),
      nextId: 5,
      fronts: { ...FRESH_FRONTS, military: { captured: false, cooldownUntil: now - 60_000, garrison: [], flareStartedAt: null, hardening: 0 } },
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
        restCurrent: REST_MAX, injuredUntil: null,
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
        restCurrent: REST_MAX, injuredUntil: null,
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
        restCurrent: REST_MAX, injuredUntil: null,
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
        restCurrent: REST_MAX, injuredUntil: null,
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
        restCurrent: REST_MAX, injuredUntil: null,
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
        restCurrent: REST_MAX, injuredUntil: null,
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
        restCurrent: REST_MAX, injuredUntil: null,
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
        restCurrent: REST_MAX, injuredUntil: null,
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
        restCurrent: REST_MAX, injuredUntil: null,
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
        restCurrent: REST_MAX, injuredUntil: null,
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
        restCurrent: REST_MAX, injuredUntil: null,
      })),
      nextId: 5,
      serum: 200,
    });
    const r = useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
    useColonyStore.setState({ activeIncursion: { ...r, outcome: 'won' } });
    useColonyStore.getState().dismissIncursion();
    expect(useColonyStore.getState().serum).toBe(200);
  });

  it('decant() spawns new units at full rest and no injury', () => {
    const unit = useColonyStore.getState().decant();
    expect(unit.restCurrent).toBe(REST_MAX);
    expect(unit.injuredUntil).toBeNull();
  });

  it('decant() on day-rollover refreshes rest on ALL existing units', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    // Seed 2 existing units at low rest
    useColonyStore.setState({
      units: [1, 2].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 10, injuredUntil: null,
      })),
      nextId: 3,
      harvestDayKey: '2026-08-03',  // yesterday
    });
    useColonyStore.getState().decant();
    const s = useColonyStore.getState();
    expect(s.units[0]!.restCurrent).toBe(REST_MAX);
    expect(s.units[1]!.restCurrent).toBe(REST_MAX);
    expect(s.units[2]!.restCurrent).toBe(REST_MAX);  // the newly decanted one
    vi.useRealTimers();
  });

  it('decant() same-day does NOT refresh existing units rest', () => {
    useColonyStore.setState({
      units: [{
        id: 1, seed: 1, decantedAt: 100,
        genome: rollGenome(createRng(101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 10, injuredUntil: null,
      }],
      nextId: 2,
      // harvestDayKey stays at today from beforeEach
    });
    useColonyStore.getState().decant();
    const s = useColonyStore.getState();
    expect(s.units[0]!.restCurrent).toBe(10);   // preserved
    expect(s.units[1]!.restCurrent).toBe(REST_MAX);   // new spawn
  });

  it('decant() does NOT reset injuredUntil on day-rollover', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    const injuryTime = Date.now() + 30 * 60 * 1000;  // 30 min from now (still injured)
    useColonyStore.setState({
      units: [{
        id: 1, seed: 1, decantedAt: 100,
        genome: rollGenome(createRng(101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 10, injuredUntil: injuryTime,
      }],
      nextId: 2,
      harvestDayKey: '2026-08-03',
    });
    useColonyStore.getState().decant();
    const s = useColonyStore.getState();
    expect(s.units[0]!.injuredUntil).toBe(injuryTime);   // preserved through refresh
    vi.useRealTimers();
  });

  it('breed() mints child at full rest and no injury', () => {
    // Seed 2 parents at low rest (breeding should ignore parent rest)
    useColonyStore.setState({
      units: [1, 2].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 10, injuredUntil: null,
      })),
      nextId: 3,
      serum: 200,
    });
    const child = useColonyStore.getState().breed(1, 2);
    expect(child.restCurrent).toBe(REST_MAX);
    expect(child.injuredUntil).toBeNull();
  });

  it('breed() does NOT gate on parent injury (injured parents can breed)', () => {
    const injuryTime = Date.now() + 30 * 60 * 1000;
    useColonyStore.setState({
      units: [1, 2].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: injuryTime,
      })),
      nextId: 3,
      serum: 200,
    });
    // Should not throw — breeding ignores injury
    expect(() => useColonyStore.getState().breed(1, 2)).not.toThrow();
  });

  it('breed() does NOT consume parent rest', () => {
    useColonyStore.setState({
      units: [1, 2].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 3,
      serum: 200,
    });
    useColonyStore.getState().breed(1, 2);
    const s = useColonyStore.getState();
    expect(s.units[0]!.restCurrent).toBe(100);   // parent unchanged
    expect(s.units[1]!.restCurrent).toBe(100);
  });

  it('launchIncursion deducts REST_DEPLOY_COST from every team member', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 5,
    });
    useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
    const s = useColonyStore.getState();
    for (const u of s.units) {
      expect(u.restCurrent).toBe(100 - REST_DEPLOY_COST);
    }
  });

  it('launchIncursion rest floors at 0 (never negative)', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 10, injuredUntil: null,   // less than REST_DEPLOY_COST
      })),
      nextId: 5,
    });
    useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
    const s = useColonyStore.getState();
    for (const u of s.units) {
      expect(u.restCurrent).toBe(0);
    }
  });

  it('launchIncursion throws when a picked unit is currently injured', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    const now = Date.now();
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100,
        injuredUntil: i === 2 ? now + 30 * 60 * 1000 : null,  // unit 2 injured
      })),
      nextId: 5,
    });
    expect(() => useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]))
      .toThrow(/units injured: 2/);
    vi.useRealTimers();
  });

  it('launchIncursion throws when stimAppliedIds contains a non-team id', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 5,
      stims: 5,
    });
    expect(() => useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4], [999]))
      .toThrow(/cannot apply Stim to non-team unit 999/);
  });

  it('launchIncursion throws when stimAppliedIds.length > state.stims', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 20, injuredUntil: null,
      })),
      nextId: 5,
      stims: 1,   // only 1 available
    });
    expect(() => useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4], [1, 2, 3]))
      .toThrow(/need 3 Stim\(s\), have 1/);
  });

  it('launchIncursion deducts stimAppliedIds.length from state.stims on success', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 20, injuredUntil: null,
      })),
      nextId: 5,
      stims: 5,
    });
    useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4], [1, 2]);
    expect(useColonyStore.getState().stims).toBe(5 - 2);
  });

  it('launchIncursion fully-rested units never get injured', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 5,
    });
    useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
    const s = useColonyStore.getState();
    for (const u of s.units) {
      expect(u.injuredUntil).toBeNull();
    }
  });

  it('launchIncursion Stimmed under-rested units never get injured', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 10, injuredUntil: null,   // all under-rested
      })),
      nextId: 5,
      stims: 4,
    });
    // Stim all 4 under-rested units → none should be injured
    useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4], [1, 2, 3, 4]);
    const s = useColonyStore.getState();
    for (const u of s.units) {
      expect(u.injuredUntil).toBeNull();
    }
  });

  it('launchIncursion injury determinism: same (nextId, under-rested set) yields same injuries', () => {
    const setupState = {
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 10, injuredUntil: null,
      })),
      nextId: 5,
    };

    useColonyStore.setState(setupState);
    useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
    const firstResult = useColonyStore.getState().units.map((u) => u.injuredUntil);

    useColonyStore.setState(setupState);   // reset to identical state
    useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
    const secondResult = useColonyStore.getState().units.map((u) => u.injuredUntil);

    // Same nextId (5) + same under-rested set → same injury outcomes
    // (allow small variance in the actual timestamp — but injured-vs-null pattern
    //  must match)
    const firstPattern = firstResult.map((t) => t !== null);
    const secondPattern = secondResult.map((t) => t !== null);
    expect(firstPattern).toEqual(secondPattern);
  });

  it('launchIncursion does NOT touch serum, droughtCount, harvestsToday, breedsToday', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 5,
      serum: 200,
      droughtCount: 17,
      harvestsToday: 2,
      harvestDayKey: '2026-08-04',
      breedsToday: 1,
      breedDayKey: '2026-08-04',
    });
    useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
    const s = useColonyStore.getState();
    expect(s.serum).toBe(200);
    expect(s.droughtCount).toBe(17);
    expect(s.harvestsToday).toBe(2);
    expect(s.breedsToday).toBe(1);
    vi.useRealTimers();
  });

  it('buyStim throws when serum < STIM_COST_SERUM', () => {
    useColonyStore.setState({ serum: STIM_COST_SERUM - 1, stims: 0 });
    expect(() => useColonyStore.getState().buyStim()).toThrow(/insufficient Serum/);
  });

  it('buyStim deducts STIM_COST_SERUM and adds 1 stim on success', () => {
    useColonyStore.setState({ serum: 200, stims: 3 });
    useColonyStore.getState().buyStim();
    const s = useColonyStore.getState();
    expect(s.serum).toBe(200 - STIM_COST_SERUM);
    expect(s.stims).toBe(4);
  });

  it('buyStim does NOT touch other fields', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    useColonyStore.setState({
      units: [{
        id: 1, seed: 1, decantedAt: 100,
        genome: rollGenome(createRng(101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 50, injuredUntil: null,
      }],
      nextId: 2,
      serum: 200,
      stims: 0,
      harvestsToday: 2,
      harvestDayKey: '2026-08-04',
      droughtCount: 5,
      breedsToday: 1,
      breedDayKey: '2026-08-04',
    });
    useColonyStore.getState().buyStim();
    const s = useColonyStore.getState();
    expect(s.harvestsToday).toBe(2);
    expect(s.droughtCount).toBe(5);
    expect(s.breedsToday).toBe(1);
    expect(s.units[0]!.restCurrent).toBe(50);   // unit untouched
    vi.useRealTimers();
  });

  it('applyGarrisonTick: any store action with garrisoned units credits pending SR', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    const startTime = Date.now();
    useColonyStore.setState({
      units: [1, 2].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 3,
      fronts: {
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [1, 2], flareStartedAt: null, hardening: 0 },
      },
      serum: 100,
      lastGarrisonTickAt: startTime,   // set to 12:00
    });
    vi.setSystemTime(new Date(2026, 7, 4, 13, 0, 0));   // 1 hour later → 13:00
    useColonyStore.getState().decant();
    // 2 garrisoned × 5 SR/hr × 1 hr = 10 SR credited
    expect(useColonyStore.getState().serum).toBe(100 + 10);
    vi.useRealTimers();
  });

  it('applyGarrisonTick: zero garrison → no income, lastGarrisonTickAt still advances', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    const startTime = Date.now();
    useColonyStore.setState({
      lastGarrisonTickAt: startTime - 60 * 60 * 1000,
      serum: 200,
    });
    vi.setSystemTime(new Date(2026, 7, 4, 13, 0, 0));
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().serum).toBe(200);   // faucet may credit +25 if day rolled, else unchanged
    // lastGarrisonTickAt should be `now` (13:00) since no garrison
    const nowMs = new Date(2026, 7, 4, 13, 0, 0).getTime();
    expect(useColonyStore.getState().lastGarrisonTickAt).toBe(nowMs);
    vi.useRealTimers();
  });

  it('applyGarrisonTick: fractional interval retains SR (does not lose it)', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    const startTime = Date.now();
    useColonyStore.setState({
      units: [1, 2].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 3,
      fronts: {
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [1, 2], flareStartedAt: null, hardening: 0 },
      },
      serum: 100,
      lastGarrisonTickAt: startTime,
    });
    // Advance 20 minutes — 2 units × 5 SR/hr × 0.333hr = 3.33 SR → floor to 3
    vi.setSystemTime(new Date(2026, 7, 4, 12, 20, 0));
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().serum).toBe(100 + 3);
    // Advance another 20 min. 2 × 5 × 0.333 = 3.33 more → floor to 3.
    // Combined: 6.66 total → 6 credited. But we've already credited 3, so 3 more.
    vi.setSystemTime(new Date(2026, 7, 4, 12, 40, 0));
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().serum).toBe(100 + 3 + 3);
    // Advance another 20 min → hits 1 hour total. Should get another 3 (for 9 credited total)
    // vs. straight-line 10 (2 × 5 × 1). We're LOSING 1 SR due to floor per-tick.
    // Correction: the design keeps lastTickAt behind by fractional to avoid this loss.
    // After tick 1: lastTickAt advanced by 18 min (3 whole SR credited / 10 SR-per-hr = 0.3 hr → 18 min)
    // Actual elapsed remaining: 20 - 18 = 2 min at end of tick 1.
    // Tick 2 sees 2 + 20 = 22 min → 2 × 5 × 0.366 = 3.66 → floor 3, advance lastTickAt by 18 min. Remaining 4.
    // Tick 3 sees 4 + 20 = 24 min → 2 × 5 × 0.4 = 4 → floor 4, advance by 24 min. Remaining 0.
    // Total credited: 3 + 3 + 4 = 10. Matches straight-line.
    vi.setSystemTime(new Date(2026, 7, 4, 13, 0, 0));
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().serum).toBe(100 + 10);
    vi.useRealTimers();
  });

  it('checkFlareTimers: front un-captures after GARRISON_GRACE_MS with garrison below min', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    const flareStart = Date.now();
    useColonyStore.setState({
      units: [1].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 2,
      fronts: {
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [], flareStartedAt: flareStart, hardening: 0 },
      },
    });
    // Advance past GARRISON_GRACE_MS
    vi.setSystemTime(new Date(2026, 7, 4, 12, 31, 0));   // 31 minutes later
    useColonyStore.getState().decant();
    const s = useColonyStore.getState();
    expect(s.fronts.infrastructure.captured).toBe(false);
    expect(s.fronts.infrastructure.cooldownUntil).toBe(new Date(2026, 7, 4, 12, 31, 0).getTime() + 30 * 60 * 1000);
    expect(s.fronts.infrastructure.garrison).toEqual([]);
    expect(s.fronts.infrastructure.flareStartedAt).toBeNull();
    vi.useRealTimers();
  });

  it('checkFlareTimers: front does NOT un-capture before grace period expires', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    const flareStart = Date.now();
    useColonyStore.setState({
      units: [1].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 2,
      fronts: {
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [], flareStartedAt: flareStart, hardening: 0 },
      },
    });
    // Advance only 15 minutes — still within grace
    vi.setSystemTime(new Date(2026, 7, 4, 12, 15, 0));
    useColonyStore.getState().decant();
    const s = useColonyStore.getState();
    expect(s.fronts.infrastructure.captured).toBe(true);
    expect(s.fronts.infrastructure.flareStartedAt).toBe(flareStart);
    vi.useRealTimers();
  });

  it('assignToGarrison adds unit id to front.garrison', () => {
    useColonyStore.setState({
      units: [1].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 2,
      fronts: {
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
      },
    });
    useColonyStore.getState().assignToGarrison('infrastructure', 1);
    expect(useColonyStore.getState().fronts.infrastructure.garrison).toEqual([1]);
  });

  it('assignToGarrison throws when front is not captured', () => {
    useColonyStore.setState({
      units: [1].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 2,
      // FRESH_FRONTS: none captured
    });
    expect(() => useColonyStore.getState().assignToGarrison('infrastructure', 1))
      .toThrow(/not captured/);
  });

  it('assignToGarrison throws when garrison already at GARRISON_TARGET', () => {
    useColonyStore.setState({
      units: [1, 2, 3].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 4,
      fronts: {
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [1, 2], flareStartedAt: null, hardening: 0 },
      },
    });
    expect(() => useColonyStore.getState().assignToGarrison('infrastructure', 3))
      .toThrow(/at target size/);
  });

  it('assignToGarrison throws when unit already garrisoned on SAME front', () => {
    useColonyStore.setState({
      units: [1].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 2,
      fronts: {
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [1], flareStartedAt: null, hardening: 0 },
      },
    });
    expect(() => useColonyStore.getState().assignToGarrison('infrastructure', 1))
      .toThrow(/already garrisoned here/);
  });

  it('assignToGarrison throws when unit already garrisoned on ANOTHER front', () => {
    useColonyStore.setState({
      units: [1].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 2,
      fronts: {
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
        military: { captured: true, cooldownUntil: null, garrison: [1], flareStartedAt: null, hardening: 0 },
      },
    });
    expect(() => useColonyStore.getState().assignToGarrison('infrastructure', 1))
      .toThrow(/already garrisoned at military/);
  });

  it('assignToGarrison throws when unit id does not exist', () => {
    useColonyStore.setState({
      fronts: {
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
      },
    });
    expect(() => useColonyStore.getState().assignToGarrison('infrastructure', 999))
      .toThrow(/unit 999 not found/);
  });

  it('assignToGarrison at threshold: adding a unit that brings garrison to GARRISON_MIN clears flareStartedAt', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    const flareStart = Date.now();
    useColonyStore.setState({
      units: [1].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 2,
      fronts: {
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [], flareStartedAt: flareStart, hardening: 0 },
      },
    });
    useColonyStore.getState().assignToGarrison('infrastructure', 1);
    expect(useColonyStore.getState().fronts.infrastructure.flareStartedAt).toBeNull();
    expect(useColonyStore.getState().fronts.infrastructure.garrison).toEqual([1]);
    vi.useRealTimers();
  });

  it('removeFromGarrison removes unit id from front.garrison', () => {
    useColonyStore.setState({
      units: [1, 2].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 3,
      fronts: {
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [1, 2], flareStartedAt: null, hardening: 0 },
      },
    });
    useColonyStore.getState().removeFromGarrison('infrastructure', 1);
    expect(useColonyStore.getState().fronts.infrastructure.garrison).toEqual([2]);
  });

  it('removeFromGarrison throws when unit not in that front garrison', () => {
    useColonyStore.setState({
      fronts: {
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [1], flareStartedAt: null, hardening: 0 },
      },
    });
    expect(() => useColonyStore.getState().removeFromGarrison('infrastructure', 999))
      .toThrow(/unit 999 not in front infrastructure garrison/);
  });

  it('removeFromGarrison below threshold: sets flareStartedAt = now when garrison drops below GARRISON_MIN', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    const now = Date.now();
    useColonyStore.setState({
      units: [1].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 2,
      fronts: {
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [1], flareStartedAt: null, hardening: 0 },
      },
    });
    useColonyStore.getState().removeFromGarrison('infrastructure', 1);
    expect(useColonyStore.getState().fronts.infrastructure.flareStartedAt).toBe(now);
    vi.useRealTimers();
  });

  it('removeFromGarrison when flare timer already active: does NOT reset flareStartedAt', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    const originalFlare = Date.now();
    useColonyStore.setState({
      units: [1, 2].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 3,
      fronts: {
        // Start with garrison=[1] and flare already running. Add unit 2 first, then remove — flare should stay.
        // Actually easier: garrison=[1, 2] with flare running (pathological — shouldn't happen normally, but tests the flag).
        // Realistic path: garrison=[1] with flare running, remove 1 → garrison=[], flareStartedAt unchanged.
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [1], flareStartedAt: originalFlare, hardening: 0 },
      },
    });
    // Advance time slightly
    vi.setSystemTime(new Date(2026, 7, 4, 12, 5, 0));
    useColonyStore.getState().removeFromGarrison('infrastructure', 1);
    // flareStartedAt preserved (not reset to new now)
    expect(useColonyStore.getState().fronts.infrastructure.flareStartedAt).toBe(originalFlare);
    vi.useRealTimers();
  });

  it('launchIncursion throws when a picked team unit is garrisoned', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 5,
      fronts: {
        // Infrastructure captured with unit 2 garrisoned; Military available for launch
        infrastructure: { captured: true, cooldownUntil: null, garrison: [2], flareStartedAt: null, hardening: 0 },
        military: { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
        guerrilla: { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
      },
    });
    expect(() => useColonyStore.getState().launchIncursion('military', [1, 2, 3, 4]))
      .toThrow(/units garrisoned: 2/);
  });

  it('launchIncursion passes hardening to resolveIncursion when other fronts are captured', () => {
    // Capture Infra to harden Military and Guerrilla by +4
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 5,
      fronts: {
        infrastructure: { captured: true, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
        military: { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: RADICALIZATION_BONUS },
        guerrilla: { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: RADICALIZATION_BONUS },
      },
    });
    const rHard = useColonyStore.getState().launchIncursion('military', [1, 2, 3, 4]);

    // Reset & try without hardening (all uncaptured)
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 5,
      fronts: FRESH_FRONTS,
      activeIncursion: null,
    });
    const rClean = useColonyStore.getState().launchIncursion('military', [1, 2, 3, 4]);
    expect(rHard.successP).toBeLessThanOrEqual(rClean.successP);
  });

  it('dismissIncursion on win recomputes hardening on ALL fronts', () => {
    useColonyStore.setState({
      units: [1, 2, 3, 4].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 5,
      fronts: FRESH_FRONTS,
    });
    const r = useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
    // Force outcome=won for the test
    useColonyStore.setState({ activeIncursion: { ...r, outcome: 'won' } });
    useColonyStore.getState().dismissIncursion();
    const s = useColonyStore.getState();
    // Newly-captured Infra: no hardening from itself
    expect(s.fronts.infrastructure.hardening).toBe(0);
    // Other fronts: hardened by +RADICALIZATION_BONUS each (one other captured)
    expect(s.fronts.military.hardening).toBe(RADICALIZATION_BONUS);
    expect(s.fronts.guerrilla.hardening).toBe(RADICALIZATION_BONUS);
  });

  it('flare un-capture cascades hardening back to zero on other fronts', () => {
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    const flareStart = Date.now() - 60 * 60 * 1000;   // 1 hour ago (past grace)
    useColonyStore.setState({
      units: [1].map((i) => ({
        id: i, seed: i, decantedAt: 100 * i,
        genome: rollGenome(createRng(i * 101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null,
      })),
      nextId: 2,
      fronts: {
        infrastructure: { captured: true, cooldownUntil: null, garrison: [], flareStartedAt: flareStart, hardening: 0 },
        military: { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: RADICALIZATION_BONUS },
        guerrilla: { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: RADICALIZATION_BONUS },
      },
    });
    // Trigger checkFlareTimers via any store action
    useColonyStore.getState().decant();
    const s = useColonyStore.getState();
    expect(s.fronts.infrastructure.captured).toBe(false);   // un-captured
    expect(s.fronts.military.hardening).toBe(0);            // unhardening cascaded
    expect(s.fronts.guerrilla.hardening).toBe(0);
    vi.useRealTimers();
  });
});
