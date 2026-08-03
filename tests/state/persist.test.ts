// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';
import { STORAGE_KEY } from '../../src/state/persist';
import { todayLocalKey } from '../../src/state/harvest';

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
          { id: 1, seed: 1, decantedAt: 1_700_000_000_000, genome: { loci: {} } },
          { id: 2, seed: 2, decantedAt: 1_700_000_001_000, genome: { loci: {} } },
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
    expect(parsed.version).toBe(2);
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
});
