// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';
import { STORAGE_KEY } from '../../src/state/persist';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';
import { REST_MAX } from '../../src/state/rest';

describe('colony persistence', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('empty localStorage rehydrates to clean initial state', async () => {
    // Trigger rehydration explicitly (Zustand persist middleware fires this on store creation
    // but we clear before each test so we need to ensure state matches expected initial).
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    expect(s.units).toEqual([]);
    expect(s.nextId).toBe(1);
    expect(s.lastDecantedId).toBeNull();
  });

  it('decanting persists units and nextId to localStorage under morulium/colony/v1', () => {
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    // Zustand's persist middleware wraps state under a `state` key
    expect(parsed.state.units).toHaveLength(2);
    expect(parsed.state.nextId).toBe(3);
    // lastDecantedId MUST NOT be persisted (partialize excludes it)
    expect(parsed.state.lastDecantedId).toBeUndefined();
  });

  it('rehydrating a saved state restores units and nextId, but lastDecantedId is null', async () => {
    // Seed localStorage manually to simulate a returning visitor
    const savedShape = {
      state: {
        units: [
          { id: 1, seed: 1, decantedAt: 1_700_000_000_000, genome: { loci: {} }, generation: 0, parentIds: null, wear: {}, restCurrent: REST_MAX, injuredUntil: null },
          { id: 2, seed: 2, decantedAt: 1_700_000_001_000, genome: { loci: {} }, generation: 0, parentIds: null, wear: {}, restCurrent: REST_MAX, injuredUntil: null },
        ],
        nextId: 3,
      },
      version: 0,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedShape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    expect(s.units).toHaveLength(2);
    expect(s.nextId).toBe(3);
    expect(s.lastDecantedId).toBeNull();
  });

  it('new M3b fields persist across a rehydration cycle', async () => {
    useColonyStore.setState({
      units: [], nextId: 5, lastDecantedId: null,
      harvestsToday: 2, harvestDayKey: '2026-08-04', droughtCount: 17,
      breedsToday: 0, breedDayKey: todayLocalKey(),
    });
    // Trigger persist middleware to flush by triggering a state update
    // (setState above already does this via the persist wrapper)
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.harvestsToday).toBe(2);
    expect(parsed.state.harvestDayKey).toBe('2026-08-04');
    expect(parsed.state.droughtCount).toBe(17);
    expect(parsed.state.lastDecantedId).toBeUndefined(); // still transient
    expect(parsed.version).toBe(8);
  });

  it('migrate function upgrades a v1 shape by adding M3b fields', async () => {
    // Seed localStorage with a v1 shape (M3a — no harvest/drought fields)
    const v1Shape = {
      state: {
        units: [
          { id: 1, seed: 1, decantedAt: 1_700_000_000_000, genome: { loci: {} } },
          { id: 2, seed: 2, decantedAt: 1_700_000_001_000, genome: { loci: {} } },
        ],
        nextId: 3,
      },
      version: 1,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1Shape));

    await useColonyStore.persist.rehydrate();

    const s = useColonyStore.getState();
    expect(s.units).toHaveLength(2);
    expect(s.nextId).toBe(3);
    // Migrated fields should be present with defaults
    expect(s.harvestsToday).toBe(0);
    expect(s.harvestDayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.droughtCount).toBe(0);
    // Transient field is still null after rehydrate
    expect(s.lastDecantedId).toBeNull();
  });

  it('M4 fields persist across a rehydration cycle', () => {
    useColonyStore.setState({
      units: [],
      nextId: 5,
      lastDecantedId: null,
      harvestsToday: 2,
      harvestDayKey: '2026-08-04',
      droughtCount: 17,
      breedsToday: 2,
      breedDayKey: '2026-08-04',
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.breedsToday).toBe(2);
    expect(parsed.state.breedDayKey).toBe('2026-08-04');
    expect(parsed.version).toBe(8);
  });

  it('migrate v2 → v3 backfills unit fields and store fields with defaults', async () => {
    // Seed localStorage with a v2 shape (M3b, no M4 fields)
    const v2Shape = {
      state: {
        units: [
          { id: 1, seed: 1, decantedAt: 1_700_000_000_000, genome: { loci: {} } },
          { id: 2, seed: 2, decantedAt: 1_700_000_001_000, genome: { loci: {} } },
        ],
        nextId: 3,
        harvestsToday: 1,
        harvestDayKey: '2026-08-04',
        droughtCount: 5,
      },
      version: 2,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v2Shape));

    await useColonyStore.persist.rehydrate();

    const s = useColonyStore.getState();
    expect(s.units).toHaveLength(2);
    expect(s.nextId).toBe(3);
    expect(s.harvestsToday).toBe(1); // preserved
    expect(s.droughtCount).toBe(5); // preserved
    expect(s.breedsToday).toBe(0); // new default
    expect(s.breedDayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Every unit gets pristine M4 defaults
    for (const u of s.units) {
      expect(u.generation).toBe(0);
      expect(u.parentIds).toBeNull();
      expect(u.wear).toEqual({});
    }
  });

  it('migrate v1 → v3 chains through both branches', async () => {
    const v1Shape = {
      state: {
        units: [
          { id: 1, seed: 1, decantedAt: 1_700_000_000_000, genome: { loci: {} } },
        ],
        nextId: 2,
      },
      version: 1,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1Shape));

    await useColonyStore.persist.rehydrate();

    const s = useColonyStore.getState();
    expect(s.units).toHaveLength(1);
    // M3b fields backfilled
    expect(s.harvestsToday).toBe(0);
    expect(s.droughtCount).toBe(0);
    // M4 store fields backfilled
    expect(s.breedsToday).toBe(0);
    // Unit's M4 fields backfilled
    expect(s.units[0]!.generation).toBe(0);
    expect(s.units[0]!.parentIds).toBeNull();
    expect(s.units[0]!.wear).toEqual({});
  });

  it('M5 fronts field persists across a rehydration cycle', () => {
    const modified = {
      ...FRESH_FRONTS,
      infrastructure: { captured: true, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
      military: { captured: false, cooldownUntil: 1_700_000_000_000, garrison: [], flareStartedAt: null, hardening: 0 },
    };
    useColonyStore.setState({
      fronts: modified,
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.fronts.infrastructure.captured).toBe(true);
    expect(parsed.state.fronts.military.cooldownUntil).toBe(1_700_000_000_000);
    expect(parsed.state.activeIncursion).toBeUndefined(); // transient
    expect(parsed.version).toBe(8);
  });

  it('migrate v3 → v4 adds FRESH_FRONTS', async () => {
    const v3Shape = {
      state: {
        units: [
          { id: 1, seed: 1, decantedAt: 1, genome: { loci: {} }, generation: 0, parentIds: null, wear: {}, restCurrent: REST_MAX, injuredUntil: null },
        ],
        nextId: 2,
        harvestsToday: 0, harvestDayKey: '2026-08-04', droughtCount: 0,
        breedsToday: 0, breedDayKey: '2026-08-04',
      },
      version: 3,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v3Shape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    expect(s.fronts).toEqual(FRESH_FRONTS);
    expect(s.activeIncursion).toBeNull();
  });

  it('migrate v1 → v4 chains through all branches', async () => {
    const v1Shape = {
      state: {
        units: [{ id: 1, seed: 1, decantedAt: 1, genome: { loci: {} } }],
        nextId: 2,
      },
      version: 1,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1Shape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    // M3b fields
    expect(s.harvestsToday).toBe(0);
    expect(s.droughtCount).toBe(0);
    // M4 store fields
    expect(s.breedsToday).toBe(0);
    // M4 unit fields backfilled
    expect(s.units[0]!.generation).toBe(0);
    expect(s.units[0]!.parentIds).toBeNull();
    expect(s.units[0]!.wear).toEqual({});
    // M5 fronts
    expect(s.fronts).toEqual(FRESH_FRONTS);
    expect(s.activeIncursion).toBeNull();
  });

  it('activeIncursion is NOT persisted (transient — ticker not resumable)', () => {
    const dummyResolution = {
      frontId: 'infrastructure' as const,
      teamIds: [1, 2, 3, 4] as const,
      coverage: { INT: 1.0, SPD: 0.9 },
      bestContributors: { INT: 1, SPD: 2 },
      successP: 0.95,
      outcome: 'won' as const,
      beats: [{ kind: 'verdict' as const, text: 'stub' }],
    };
    useColonyStore.setState({ activeIncursion: dummyResolution });
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.state.activeIncursion).toBeUndefined();
  });

  it('M6a serum field persists across a rehydration cycle', () => {
    useColonyStore.setState({ serum: 137 });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.serum).toBe(137);
    expect(parsed.version).toBe(8);
  });

  it('migrate v4 → v5 adds serum: SERUM_STARTING_BALANCE', async () => {
    const v4Shape = {
      state: {
        units: [
          { id: 1, seed: 1, decantedAt: 1, genome: { loci: {} }, generation: 0, parentIds: null, wear: {}, restCurrent: REST_MAX, injuredUntil: null },
        ],
        nextId: 2,
        harvestsToday: 0, harvestDayKey: '2026-08-04', droughtCount: 0,
        breedsToday: 0, breedDayKey: '2026-08-04',
        fronts: {
          infrastructure: { captured: false, cooldownUntil: null },
          military: { captured: false, cooldownUntil: null },
          guerrilla: { captured: false, cooldownUntil: null },
        },
      },
      version: 4,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v4Shape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    expect(s.serum).toBe(SERUM_STARTING_BALANCE);
  });

  it('migrate v1 → v5 chains through all branches', async () => {
    const v1Shape = {
      state: {
        units: [{ id: 1, seed: 1, decantedAt: 1, genome: { loci: {} } }],
        nextId: 2,
      },
      version: 1,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1Shape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    // M3b fields
    expect(s.harvestsToday).toBe(0);
    expect(s.droughtCount).toBe(0);
    // M4 store + unit fields
    expect(s.breedsToday).toBe(0);
    expect(s.units[0]!.generation).toBe(0);
    expect(s.units[0]!.parentIds).toBeNull();
    expect(s.units[0]!.wear).toEqual({});
    // M5 fronts
    expect(s.fronts.infrastructure.captured).toBe(false);
    // M6a serum
    expect(s.serum).toBe(SERUM_STARTING_BALANCE);
  });

  it('activeIncursion still NOT persisted after v5 bump', () => {
    const dummyResolution = {
      frontId: 'infrastructure' as const,
      teamIds: [1, 2, 3, 4] as const,
      coverage: { INT: 1.0, SPD: 0.9 },
      bestContributors: { INT: 1, SPD: 2 },
      successP: 0.95,
      outcome: 'won' as const,
      beats: [{ kind: 'verdict' as const, text: 'stub' }],
    };
    useColonyStore.setState({ activeIncursion: dummyResolution });
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.state.activeIncursion).toBeUndefined();
  });

  it('M6b stims field persists across a rehydration cycle', () => {
    useColonyStore.setState({ stims: 5 });
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.state.stims).toBe(5);
    expect(parsed.version).toBe(8);
  });

  it('M6b restCurrent + injuredUntil persist per unit across rehydration', () => {
    const injuryTime = 1_800_000_000_000;
    useColonyStore.setState({
      units: [{
        id: 1, seed: 1, decantedAt: 100,
        genome: { loci: {} },
        generation: 0, parentIds: null, wear: {},
        restCurrent: 42, injuredUntil: injuryTime, culled: false,
      }],
      nextId: 2,
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.state.units[0].restCurrent).toBe(42);
    expect(parsed.state.units[0].injuredUntil).toBe(injuryTime);
  });

  it('migrate v5 → v6 backfills unit rest fields + adds stims', async () => {
    const v5Shape = {
      state: {
        units: [
          { id: 1, seed: 1, decantedAt: 1, genome: { loci: {} },
            generation: 0, parentIds: null, wear: {} },
        ],
        nextId: 2,
        harvestsToday: 0, harvestDayKey: '2026-08-04', droughtCount: 0,
        breedsToday: 0, breedDayKey: '2026-08-04',
        fronts: {
          infrastructure: { captured: false, cooldownUntil: null },
          military: { captured: false, cooldownUntil: null },
          guerrilla: { captured: false, cooldownUntil: null },
        },
        serum: 200,
      },
      version: 5,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v5Shape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    expect(s.units[0]!.restCurrent).toBe(REST_MAX);
    expect(s.units[0]!.injuredUntil).toBeNull();
    expect(s.stims).toBe(0);
  });

  it('migrate v1 → v6 chains through all 5 branches', async () => {
    const v1Shape = {
      state: {
        units: [{ id: 1, seed: 1, decantedAt: 1, genome: { loci: {} } }],
        nextId: 2,
      },
      version: 1,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1Shape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    // M3b, M4, M5, M6a, M6b — every branch's fields present
    expect(s.harvestsToday).toBe(0);
    expect(s.breedsToday).toBe(0);
    expect(s.units[0]!.generation).toBe(0);
    expect(s.units[0]!.parentIds).toBeNull();
    expect(s.units[0]!.wear).toEqual({});
    expect(s.fronts.infrastructure.captured).toBe(false);
    expect(s.serum).toBe(SERUM_STARTING_BALANCE);
    expect(s.units[0]!.restCurrent).toBe(REST_MAX);
    expect(s.units[0]!.injuredUntil).toBeNull();
    expect(s.stims).toBe(0);
  });

  it('M6c lastGarrisonTickAt persists across a rehydration cycle', () => {
    useColonyStore.setState({ lastGarrisonTickAt: 1_700_000_000_000 });
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.state.lastGarrisonTickAt).toBe(1_700_000_000_000);
    expect(parsed.version).toBe(8);
  });

  it('M6c FrontState garrison/flareStartedAt/hardening persist per front', () => {
    useColonyStore.setState({
      fronts: {
        ...FRESH_FRONTS,
        infrastructure: { captured: true, cooldownUntil: null, garrison: [1, 2], flareStartedAt: 1_700_000_000_000, hardening: 4 },
      },
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.state.fronts.infrastructure.garrison).toEqual([1, 2]);
    expect(parsed.state.fronts.infrastructure.flareStartedAt).toBe(1_700_000_000_000);
    expect(parsed.state.fronts.infrastructure.hardening).toBe(4);
  });

  it('migrate v6 → v7 backfills FrontState fields + adds lastGarrisonTickAt', async () => {
    const v6Shape = {
      state: {
        units: [
          { id: 1, seed: 1, decantedAt: 1, genome: { loci: {} },
            generation: 0, parentIds: null, wear: {},
            restCurrent: 100, injuredUntil: null },
        ],
        nextId: 2,
        harvestsToday: 0, harvestDayKey: '2026-08-04', droughtCount: 0,
        breedsToday: 0, breedDayKey: '2026-08-04',
        fronts: {
          infrastructure: { captured: false, cooldownUntil: null },
          military: { captured: false, cooldownUntil: null },
          guerrilla: { captured: false, cooldownUntil: null },
        },
        serum: 200, stims: 0,
      },
      version: 6,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v6Shape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    expect(s.fronts.infrastructure.garrison).toEqual([]);
    expect(s.fronts.infrastructure.flareStartedAt).toBeNull();
    expect(s.fronts.infrastructure.hardening).toBe(0);
    expect(s.fronts.military.garrison).toEqual([]);
    expect(s.fronts.guerrilla.garrison).toEqual([]);
    expect(typeof s.lastGarrisonTickAt).toBe('number');
  });

  it('migrate v1 → v7 chains through all 6 branches', async () => {
    const v1Shape = {
      state: {
        units: [{ id: 1, seed: 1, decantedAt: 1, genome: { loci: {} } }],
        nextId: 2,
      },
      version: 1,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1Shape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    // M3b fields
    expect(s.harvestsToday).toBe(0);
    expect(s.droughtCount).toBe(0);
    // M4 store + unit fields
    expect(s.breedsToday).toBe(0);
    expect(s.units[0]!.generation).toBe(0);
    expect(s.units[0]!.parentIds).toBeNull();
    expect(s.units[0]!.wear).toEqual({});
    // M5 fronts
    expect(s.fronts.infrastructure.captured).toBe(false);
    // M6a serum
    expect(s.serum).toBe(SERUM_STARTING_BALANCE);
    // M6b unit rest fields + stims
    expect(s.units[0]!.restCurrent).toBe(REST_MAX);
    expect(s.units[0]!.injuredUntil).toBeNull();
    expect(s.stims).toBe(0);
    // M6c front garrison + lastGarrisonTickAt
    expect(s.fronts.infrastructure.garrison).toEqual([]);
    expect(s.fronts.infrastructure.flareStartedAt).toBeNull();
    expect(s.fronts.infrastructure.hardening).toBe(0);
    expect(typeof s.lastGarrisonTickAt).toBe('number');
  });

  it('migrate v7 → v8 backfills culled: false on every unit', async () => {
    const v7Shape = {
      state: {
        units: [
          { id: 1, seed: 1, decantedAt: 1, genome: { loci: {} },
            generation: 0, parentIds: null, wear: {},
            restCurrent: 100, injuredUntil: null },
          { id: 2, seed: 2, decantedAt: 2, genome: { loci: {} },
            generation: 0, parentIds: null, wear: {},
            restCurrent: 100, injuredUntil: null },
        ],
        nextId: 3,
        harvestsToday: 0, harvestDayKey: '2026-08-04', droughtCount: 0,
        breedsToday: 0, breedDayKey: '2026-08-04',
        fronts: {
          infrastructure: { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
          military:       { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
          guerrilla:      { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
        },
        serum: 200, stims: 0, lastGarrisonTickAt: 1_700_000_000_000,
      },
      version: 7,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v7Shape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    expect(s.units[0]!.culled).toBe(false);
    expect(s.units[1]!.culled).toBe(false);
  });

  it('migrate v1 → v8 chains through all 7 branches (culled: false present)', async () => {
    const v1Shape = {
      state: {
        units: [{ id: 1, seed: 1, decantedAt: 1, genome: { loci: {} } }],
        nextId: 2,
      },
      version: 1,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1Shape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    expect(s.units[0]!.culled).toBe(false);
  });

  it('parsed.version === 8 after any current-store write', () => {
    useColonyStore.getState().decant();
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(8);
  });
});
