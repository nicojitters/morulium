# M6a Serum Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce Serum (SR) as the game's currency: 200 SR starting balance, +25 SR daily faucet on day-rollover, 50 SR per Breed as the first sink (closing the M4 `// M6: replace or augment` TODO), and a SerumBadge in the nav that reflects the balance across every screen.

**Architecture:** No new sim/render surface. One new state helper module (`src/state/serum.ts` — three constants), extend the Colony store's `decant()` with a faucet on day-rollover + `breed()` with a SR guard and deduction + persist v5 chained migration. One new UI component (`SerumBadge`) wired into `App.tsx` nav. `BreedButton` gains an insufficient-Serum disabled state; the Breed screen gains a hint tier for the same case.

**Tech Stack:** No new runtime deps. Vite + React + TypeScript + Zustand + Vitest.

**Source spec:** `docs/superpowers/specs/2026-08-04-m6a-serum-economy-design.md`.

## Global Constraints

- **Branch:** work on `m6a-serum-economy` (create with `git checkout -b m6a-serum-economy` from `main` before Task 1). Do NOT commit to main directly.
- **TS strict:** `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any` in `src/state/*`, `src/ui/*`, or tests.
- **`src/sim/*` and `src/render/*` UNTOUCHED** — M6a is purely economy state + UI.
- **`src/state/*` non-determinism budget:** `Date.now()` via `todayLocalKey` inside `decant()`. No `Math.random`.
- **`src/ui/*` non-determinism budget:** no `Math.random`, no `Date.now()` at module load. Existing 60s intervals in `HarvestIndicator`/`BreedIndicator`/`FrontCard` unchanged.
- **Storage key stays `morulium/colony/v1`** — DO NOT rename. Bump `version: 5` and add a `if (from < 5)` branch AFTER the existing v2/v3/v4 branches. Chained `if`s, not `else if`.
- **Constants** (baked, not user-configurable): `SERUM_STARTING_BALANCE = 200`, `SERUM_DAILY_FAUCET = 25`, `BREED_COST_SERUM = 50`.
- **Faucet rules:**
  - Grants **only** when `harvestDayKey !== todayLocalKey()` at the start of `decant()`.
  - Once per rollover — skipping N days grants +25 total on next Decant, not +25×N.
  - The faucet is added to the SAME `set(...)` call that already runs on day-rollover (spread with `...(dayRolledOver ? { serum: state.serum + SERUM_DAILY_FAUCET } : {})`).
- **Breed guard order (fixed):** self-breed → missing parent → daily cap → **Serum** → compute. Cap error priority over Serum error when both true.
- **`launchIncursion` and `dismissIncursion` — no changes.** Their `set(...)` calls must NOT include `serum`.
- **`Unit` shape UNCHANGED from M5.** No test-fixture Unit-shape updates required.
- **BreedButton disabled priority (fixed):** cap countdown > insufficient Serum > external disabled > enabled. `data-disabled-reason` attribute is NEW (`"limit"` | `"serum"` | `"external"`); existing `data-disabled="true"` behavior preserved.
- **`SerumBadge` component:** pure functional, reads `serum` from `useColonyStore`, renders `"SR {value}"` in a monospace pill. `data-testid="serum-badge"`. Placed at the right edge of the nav via `marginLeft: 'auto'`.
- **Vitest imports:** `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'`. UI + persist tests use `// @vitest-environment jsdom` at file top. Cleanup with `cleanup()` in `afterEach`.
- **Store reset in tests** (updated for M6a): `beforeEach(() => useColonyStore.setState({ units: [], nextId: 1, lastDecantedId: null, harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0, breedsToday: 0, breedDayKey: todayLocalKey(), fronts: FRESH_FRONTS, activeIncursion: null, serum: SERUM_STARTING_BALANCE }))`. Plus `localStorage.clear()` in persist tests. Plus `vi.useRealTimers()` in `afterEach` for tests that mocked time.
- **Commits:** Conventional Commits + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` on every commit.

---

### Task 1: State — `src/state/serum.ts` + Colony store extensions + v5 migration + beforeEach updates

**Files:**
- Create: `src/state/serum.ts` — three constants
- Modify: `src/state/colony.ts` — extend store shape with `serum`, faucet in `decant()`, SR guard + deduction in `breed()`, bump persist to `version: 5` with new migrate branch, extend `partialize`
- Modify: `tests/state/colony.test.ts` — extend `beforeEach`, add Serum tests
- Modify: `tests/state/persist.test.ts` — extend `beforeEach`, add v4→v5 migration + v1→v5 chained + persist tests
- Modify: `tests/ui/{colony,EmptyColony,DecantButton,HarvestIndicator,FailsafeIndicator,Breed,BreedButton,BreedIndicator,ParentSlot,App,SerumBadge*,Incursion,FrontCard,IncursionBeat,IncursionTicker}.test.tsx` — every UI test file whose `beforeEach` resets the store gets `serum: SERUM_STARTING_BALANCE` added. Files that don't reset the store don't need touching.

**Interfaces produced:**
- `const SERUM_STARTING_BALANCE = 200 as const`
- `const SERUM_DAILY_FAUCET = 25 as const`
- `const BREED_COST_SERUM = 50 as const`
- Store gains `readonly serum: number`.
- `decant()` grants faucet on day-rollover; deducts nothing.
- `breed()` throws `/insufficient Serum/` when `state.serum < BREED_COST_SERUM`; deducts `BREED_COST_SERUM` on success.
- Persist: `version: 5` with chained v1→v5 migration.

**Global constraints for this task:**
- Storage key stays `morulium/colony/v1`. Do NOT rename.
- Chained `if`s in migrate. No `else if`.
- `Unit` shape UNCHANGED. Inline Unit fixtures don't need updates.
- No `any`.
- `launchIncursion` and `dismissIncursion` — do NOT touch `serum` in their `set(...)` calls.

- [ ] **Step 1: Create `src/state/serum.ts`**

```ts
// Constants for the M6a Serum economy. See docs/superpowers/specs/2026-08-04-m6a-serum-economy-design.md
export const SERUM_STARTING_BALANCE = 200 as const;
export const SERUM_DAILY_FAUCET = 25 as const;
export const BREED_COST_SERUM = 50 as const;
```

- [ ] **Step 2: Modify `src/state/colony.ts` — add `serum` field, faucet in decant, guard+deduct in breed, v5 migration**

Add imports at the top of the existing imports block:

```ts
import { SERUM_STARTING_BALANCE, SERUM_DAILY_FAUCET, BREED_COST_SERUM } from './serum';
```

Extend the `ColonyStore` interface (add one field, keep everything else):

```ts
interface ColonyStore {
  readonly units: Unit[];
  readonly nextId: number;
  readonly lastDecantedId: number | null;
  readonly harvestsToday: number;
  readonly harvestDayKey: string;
  readonly droughtCount: number;
  readonly breedsToday: number;
  readonly breedDayKey: string;
  readonly fronts: Readonly<Record<FrontId, FrontState>>;
  readonly activeIncursion: IncursionResolution | null;
  readonly serum: number;                          // NEW

  decant: () => Unit;
  breed: (parentAId: number, parentBId: number) => Unit;
  launchIncursion: (frontId: FrontId, teamIds: readonly [number, number, number, number]) => IncursionResolution;
  dismissIncursion: () => void;
  clearHighlight: () => void;
}
```

Extend the initial state (add `serum` after `activeIncursion`):

```ts
serum: SERUM_STARTING_BALANCE,
```

Replace `decant()` with the day-rollover-aware faucet version:

```ts
decant: () => {
  const state = get();
  const today = todayLocalKey();
  const dayRolledOver = state.harvestDayKey !== today;

  const harvestsUsedToday = dayRolledOver ? 0 : state.harvestsToday;
  if (harvestsUsedToday >= DAILY_HARVEST_LIMIT) {
    throw new Error('daily Harvest limit reached');
  }

  const id = state.nextId;
  const genome = state.droughtCount >= DROUGHT_THRESHOLD
    ? rollGenomeAtLeast(id * FAILSAFE_SUBSTREAM_PRIME, FAILSAFE_MIN_TIER)
    : rollGenome(createRng(id));
  const { tier } = computeRarity(genome);
  const newDrought = tierAtLeast(tier, 'chimera') ? 0 : state.droughtCount + 1;

  const unit: Unit = {
    id,
    seed: id,
    decantedAt: Date.now(),
    genome,
    generation: 0,
    parentIds: null,
    wear: {},
  };

  set({
    units: [...state.units, unit],
    nextId: id + 1,
    lastDecantedId: id,
    harvestsToday: harvestsUsedToday + 1,
    harvestDayKey: today,
    droughtCount: newDrought,
    ...(dayRolledOver ? { serum: state.serum + SERUM_DAILY_FAUCET } : {}),
  });
  return unit;
},
```

Replace `breed()` with the Serum-aware version (guard order unchanged apart from the new Serum check between "daily cap" and "compute"):

```ts
breed: (parentAId, parentBId) => {
  if (parentAId === parentBId) {
    throw new Error('breed: cannot breed a specimen with itself');
  }
  const state = get();
  const pA = state.units.find((u) => u.id === parentAId);
  const pB = state.units.find((u) => u.id === parentBId);
  if (!pA) throw new Error(`breed: parent ${parentAId} not found`);
  if (!pB) throw new Error(`breed: parent ${parentBId} not found`);

  const today = todayLocalKey();
  const breedsUsedToday = state.breedDayKey === today ? state.breedsToday : 0;
  if (breedsUsedToday >= DAILY_BREED_LIMIT) {
    throw new Error('daily Breed limit reached');
  }
  if (state.serum < BREED_COST_SERUM) {
    throw new Error('breed: insufficient Serum');
  }

  const childId = state.nextId;
  const rng = createRng(childId * BREED_SUBSTREAM_PRIME);
  const { genome, mutatedLoci } = breedGenome(pA.genome, pB.genome, rng, MUTATION_RATE);
  const wear = nextWear(pA, pB, mutatedLoci);
  const generation = Math.max(pA.generation, pB.generation) + 1;

  const child: Unit = {
    id: childId,
    seed: childId,
    decantedAt: Date.now(),
    genome,
    generation,
    parentIds: [parentAId, parentBId] as const,
    wear,
  };

  set({
    units: [...state.units, child],
    nextId: childId + 1,
    lastDecantedId: childId,
    breedsToday: breedsUsedToday + 1,
    breedDayKey: today,
    serum: state.serum - BREED_COST_SERUM,
  });
  return child;
},
```

Update the persist config — bump version to 5, add a new chained branch to `migrate`, extend `partialize`:

```ts
{
  name: STORAGE_KEY,
  version: 5,
  migrate: (state, from) => {
    let s = state as ColonyStore;
    if (from < 2) {
      const v1 = s as Partial<ColonyStore> & { units: Unit[]; nextId: number };
      s = {
        ...v1,
        harvestsToday: 0,
        harvestDayKey: todayLocalKey(),
        droughtCount: 0,
      } as ColonyStore;
    }
    if (from < 3) {
      type LegacyUnit = Omit<Unit, 'generation' | 'parentIds' | 'wear'> & {
        generation?: number;
        parentIds?: readonly [number, number] | null;
        wear?: Readonly<Record<string, number>>;
      };
      const v2 = s as ColonyStore & { units: LegacyUnit[] };
      s = {
        ...v2,
        breedsToday: 0,
        breedDayKey: todayLocalKey(),
        units: v2.units.map((u) => ({
          id: u.id,
          seed: u.seed,
          decantedAt: u.decantedAt,
          genome: u.genome,
          generation: u.generation ?? 0,
          parentIds: u.parentIds ?? null,
          wear: u.wear ?? {},
        })),
      };
    }
    if (from < 4) {
      s = { ...s, fronts: FRESH_FRONTS };
    }
    if (from < 5) {
      s = { ...s, serum: SERUM_STARTING_BALANCE };
    }
    return s;
  },
  partialize: (state) => ({
    units: state.units,
    nextId: state.nextId,
    harvestsToday: state.harvestsToday,
    harvestDayKey: state.harvestDayKey,
    droughtCount: state.droughtCount,
    breedsToday: state.breedsToday,
    breedDayKey: state.breedDayKey,
    fronts: state.fronts,
    serum: state.serum,
    // activeIncursion excluded (transient — ticker not resumable)
  }),
},
```

`launchIncursion` and `dismissIncursion` are UNCHANGED — do not touch their `set(...)` calls.

- [ ] **Step 3: Update `tests/state/colony.test.ts` — extend beforeEach + add Serum tests**

Add imports at the top of the file:

```ts
import { SERUM_STARTING_BALANCE, SERUM_DAILY_FAUCET, BREED_COST_SERUM } from '../../src/state/serum';
```

Replace the shared `beforeEach` in the outer `describe('colony store', ...)` block:

```ts
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
```

Add these new tests at the end of the outer describe block:

```ts
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
```

- [ ] **Step 4: Update `tests/state/persist.test.ts` — extend beforeEach + add migration tests**

Add imports:

```ts
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';
```

Replace the shared `beforeEach`:

```ts
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
  });
});
```

Update the two existing "version" assertions in the file. Any test that reads the persisted JSON and asserts `parsed.version === 4` should now assert `=== 5`. Search the file for `parsed.version === 4` or `.toBe(4)` inside a version-comparison context and update to 5. Do NOT change tests that seed a specific old-version shape (v3, v2, v1) — those are input fixtures, not output assertions.

Add these new tests:

```ts
it('M6a serum field persists across a rehydration cycle', () => {
  useColonyStore.setState({ serum: 137 });
  const raw = localStorage.getItem(STORAGE_KEY);
  expect(raw).not.toBeNull();
  const parsed = JSON.parse(raw!);
  expect(parsed.state.serum).toBe(137);
  expect(parsed.version).toBe(5);
});

it('migrate v4 → v5 adds serum: SERUM_STARTING_BALANCE', async () => {
  const v4Shape = {
    state: {
      units: [
        { id: 1, seed: 1, decantedAt: 1, genome: { loci: {} }, generation: 0, parentIds: null, wear: {} },
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
```

- [ ] **Step 5: Update UI test `beforeEach` blocks in all store-touching files**

For each of the following files, add `import { SERUM_STARTING_BALANCE } from '../../src/state/serum';` and add `serum: SERUM_STARTING_BALANCE` to the `beforeEach` `setState` object:

- `tests/ui/colony.test.tsx`
- `tests/ui/EmptyColony.test.tsx`
- `tests/ui/DecantButton.test.tsx`
- `tests/ui/HarvestIndicator.test.tsx`
- `tests/ui/FailsafeIndicator.test.tsx`
- `tests/ui/Breed.test.tsx`
- `tests/ui/BreedButton.test.tsx`
- `tests/ui/BreedIndicator.test.tsx`
- `tests/ui/App.test.tsx`
- `tests/ui/Incursion.test.tsx`

Files WITHOUT store `setState` in `beforeEach` (do NOT touch): `tests/ui/ParentSlot.test.tsx`, `tests/ui/FrontCard.test.tsx`, `tests/ui/IncursionBeat.test.tsx`, `tests/ui/IncursionTicker.test.tsx`, `tests/ui/SpecimenCard.test.tsx` (if present).

Verify by grepping: `grep -l "useColonyStore.setState" tests/ui/*.tsx` — every match needs `serum` in its beforeEach.

Per-test setState calls inside individual `it()` blocks DO NOT need updating — Zustand merges by default and the beforeEach reset covers the base state.

- [ ] **Step 6: Run state tests**

Run: `npm test -- tests/state/`
Expected: all state tests pass — new colony tests (10 new) + persist tests (4 new) + existing tests all green.

- [ ] **Step 7: Run UI tests (regression check from beforeEach updates)**

Run: `npm test -- tests/ui/`
Expected: all existing UI tests still pass with the extended `beforeEach`. TS-strict will fail compile if any beforeEach was missed.

- [ ] **Step 8: Full suite + typecheck**

Run: `npm test`
Expected: 272 previous + 10 new colony + 4 new persist = 286 green.

Run: `npm run typecheck`
Expected: clean. TS strict enforces that every `beforeEach` provides the new required `serum` field.

- [ ] **Step 9: Commit**

```bash
git checkout -b m6a-serum-economy
git add src/state/serum.ts src/state/colony.ts tests/state/colony.test.ts tests/state/persist.test.ts tests/ui/colony.test.tsx tests/ui/EmptyColony.test.tsx tests/ui/DecantButton.test.tsx tests/ui/HarvestIndicator.test.tsx tests/ui/FailsafeIndicator.test.tsx tests/ui/Breed.test.tsx tests/ui/BreedButton.test.tsx tests/ui/BreedIndicator.test.tsx tests/ui/App.test.tsx tests/ui/Incursion.test.tsx
git commit -m "$(cat <<'EOF'
feat(state): Serum currency + daily faucet + Breed cost + v5 migration

Adds src/state/serum.ts with three constants:
- SERUM_STARTING_BALANCE = 200
- SERUM_DAILY_FAUCET = 25
- BREED_COST_SERUM = 50

Extends ColonyStore with one new persisted field:
- serum: number

decant() gains a day-rollover check: when harvestDayKey !== today,
+SERUM_DAILY_FAUCET is added to the SAME set() call that resets
the harvest counter. Faucet fires ONCE per rollover — skipping N
days grants +25 total on next Decant, not +25*N. Prevents
not-playing farming.

breed() gains a Serum guard + deduction. Guard order:
  self-breed → missing parent → daily cap → Serum → compute
Cap error priority over Serum error when both true. On success,
BREED_COST_SERUM deducted from state.serum in the same set() call.

launchIncursion and dismissIncursion are UNCHANGED — Serum stays
untouched by the Incursion loop in M6a. Test guards this
explicitly.

Persist bumped to version: 5 with a chained migrate branch:
  if (from < 5) → add serum: SERUM_STARTING_BALANCE
A legacy v1 save cascades through v2 → v3 → v4 → v5 in one pass.
Storage key stays 'morulium/colony/v1'.

partialize extended to include serum (persisted); activeIncursion
still excluded (transient).

All UI test beforeEach blocks updated to reset the new field.
Files without store setState in beforeEach untouched (ParentSlot,
FrontCard, ticker sub-components).

Closes the M4 "// M6: replace or augment the Breed cap with Serum
cost" TODO — augments (both constraints active) rather than
replaces.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: UI — `SerumBadge` component + `App.tsx` nav integration

**Files:**
- Create: `src/ui/components/SerumBadge.tsx`
- Modify: `src/ui/styles.ts` — add `serumBadge` style
- Modify: `src/App.tsx` — add `<SerumBadge />` to the nav strip
- Create: `tests/ui/SerumBadge.test.tsx`
- Modify: `tests/ui/App.test.tsx` — add assertion that SerumBadge renders inside nav

**Interfaces produced:**
- `<SerumBadge />` — no props. Reads `serum` from `useColonyStore`. Renders `"SR {value}"` in a monospace pill, right-aligned via `marginLeft: 'auto'`. `data-testid="serum-badge"`.

**Global constraints for this task:**
- No `any`.
- Test file starts with `// @vitest-environment jsdom`.
- No `useEffect`, no `Date.now()`, no `setInterval` — SerumBadge is purely reactive to store state.
- Right-alignment via `marginLeft: 'auto'` inside the existing flex nav; DO NOT change the nav's outer style.
- Do NOT modify BreedButton or Breed.tsx (Tasks 3 & 4).

- [ ] **Step 1: Add `serumBadge` style to `src/ui/styles.ts`**

Add inside the exported `styles` object:

```ts
serumBadge: {
  marginLeft: 'auto',
  padding: '6px 12px',
  fontSize: 13,
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  fontWeight: 500,
  color: '#334155',   // slate-700
  alignSelf: 'center',
} as CSSProperties,
```

- [ ] **Step 2: Write failing tests at `tests/ui/SerumBadge.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SerumBadge } from '../../src/ui/components/SerumBadge';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';

describe('SerumBadge', () => {
  beforeEach(() => {
    useColonyStore.setState({
      units: [], nextId: 1, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS, activeIncursion: null,
      serum: SERUM_STARTING_BALANCE,
    });
  });
  afterEach(() => cleanup());

  it('renders "SR 200" on fresh state', () => {
    const { getByTestId } = render(<SerumBadge />);
    expect(getByTestId('serum-badge').textContent).toBe('SR 200');
  });

  it('reflects store changes — setState serum=42 → renders "SR 42"', () => {
    useColonyStore.setState({ serum: 42 });
    const { getByTestId } = render(<SerumBadge />);
    expect(getByTestId('serum-badge').textContent).toBe('SR 42');
  });

  it('renders "SR 0" when balance is zero', () => {
    useColonyStore.setState({ serum: 0 });
    const { getByTestId } = render(<SerumBadge />);
    expect(getByTestId('serum-badge').textContent).toBe('SR 0');
  });

  it('data-testid="serum-badge" is present on the container', () => {
    const { getByTestId } = render(<SerumBadge />);
    expect(getByTestId('serum-badge')).toBeDefined();
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npm test -- tests/ui/SerumBadge.test.tsx`
Expected: FAIL — component doesn't exist.

- [ ] **Step 4: Create `src/ui/components/SerumBadge.tsx`**

```tsx
import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { styles } from '../styles';

export function SerumBadge(): ReactElement {
  const serum = useColonyStore((s) => s.serum);
  return (
    <span style={styles.serumBadge} data-testid="serum-badge">
      SR {serum}
    </span>
  );
}
```

- [ ] **Step 5: Modify `src/App.tsx` — add `<SerumBadge />` to the nav**

Add the import at the top:

```tsx
import { SerumBadge } from './ui/components/SerumBadge';
```

Add `<SerumBadge />` as the last child of the `<nav>` element (after the three tab buttons):

```tsx
<nav style={styles.nav}>
  <button
    type="button"
    style={active('colony')}
    onClick={() => setTab('colony')}
    data-testid="nav-tab-colony"
  >
    Colony
  </button>
  <button
    type="button"
    style={active('breed')}
    onClick={() => setTab('breed')}
    data-testid="nav-tab-breed"
  >
    Breed
  </button>
  <button
    type="button"
    style={active('incursion')}
    onClick={() => setTab('incursion')}
    data-testid="nav-tab-incursion"
  >
    Incursion
  </button>
  <SerumBadge />
</nav>
```

- [ ] **Step 6: Extend `tests/ui/App.test.tsx` — assert SerumBadge renders inside nav**

Add one test inside the existing outer `describe('App', ...)` block:

```ts
it('renders SerumBadge in the nav on default state', () => {
  const { getByTestId } = render(<App />);
  const badge = getByTestId('serum-badge');
  expect(badge).toBeDefined();
  expect(badge.textContent).toBe('SR 200');
});
```

- [ ] **Step 7: Run SerumBadge + App tests**

Run: `npm test -- tests/ui/SerumBadge.test.tsx tests/ui/App.test.tsx`
Expected: PASS — 4 SerumBadge + existing App tests + 1 new App test = 4 + 6 = 10 tests in these two files.

- [ ] **Step 8: Full suite + typecheck**

Run: `npm test`
Expected: 286 previous + 4 SerumBadge + 1 App = 291 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add src/ui/components/SerumBadge.tsx src/ui/styles.ts src/App.tsx tests/ui/SerumBadge.test.tsx tests/ui/App.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): SerumBadge in nav — "SR N" pill, always visible

SerumBadge is a pure, reactive component that reads `serum` from
useColonyStore and renders "SR {value}" in a monospace pill. Placed
at the right edge of the nav via `marginLeft: 'auto'` inside the
existing flex layout — no changes to the tab buttons or nav outer
style.

data-testid="serum-badge" for cross-screen assertions.

Consistent placement across Colony / Breed / Incursion screens
because App.tsx renders the badge once, above the swapped-in screen.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: UI — `BreedButton` insufficient-Serum disabled state

**Files:**
- Modify: `src/ui/components/BreedButton.tsx` — read `serum` from store, add insufficient-Serum disabled tier, add `data-disabled-reason` attribute
- Modify: `tests/ui/BreedButton.test.tsx` — add tests for the new disabled state + priority order

**Interfaces produced:**
- `<BreedButton onClick? disabled?>` — signature unchanged. New internal disabled tier when `serum < BREED_COST_SERUM`. Label priority (highest→lowest): cap countdown → insufficient Serum → external disabled → enabled.
- New `data-disabled-reason` attribute on the button element: `"limit"` | `"serum"` | `"external"` when disabled; absent when enabled. `data-disabled="true"` behavior unchanged (present when disabled, absent when enabled).

**Global constraints for this task:**
- No `any`.
- Test file already exists with `// @vitest-environment jsdom` at the top.
- Existing tests must still pass — starting balance 200 covers 50 SR cost, so existing "Confirm Breed (3/3)" assertions remain valid.
- Do NOT modify Breed.tsx (Task 4).
- Do NOT modify SerumBadge or App.tsx (Task 2).

- [ ] **Step 1: Write failing tests at `tests/ui/BreedButton.test.tsx` (append inside existing describe)**

Add these tests at the end of the outer `describe('BreedButton', ...)` block. Also add `import { BREED_COST_SERUM, SERUM_STARTING_BALANCE } from '../../src/state/serum';` at the top if not already present.

```ts
it('label reflects insufficient Serum when balance < BREED_COST_SERUM', () => {
  useColonyStore.setState({
    serum: 25,
    breedsToday: 0,
    breedDayKey: todayLocalKey(),
  });
  const onClick = vi.fn();
  const { getByTestId } = render(<BreedButton onClick={onClick} />);
  const btn = getByTestId('breed-button');
  expect(btn.textContent).toBe(`Breed costs ${BREED_COST_SERUM} SR (have 25)`);
  expect(btn.getAttribute('data-disabled')).toBe('true');
  expect(btn.getAttribute('data-disabled-reason')).toBe('serum');
  fireEvent.click(btn);
  expect(onClick).not.toHaveBeenCalled();
});

it('cap countdown takes priority over insufficient Serum', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 4, 16, 37, 0));
  useColonyStore.setState({
    serum: 0,
    breedsToday: 3,
    breedDayKey: '2026-08-04',
  });
  const onClick = vi.fn();
  const { getByTestId } = render(<BreedButton onClick={onClick} />);
  const btn = getByTestId('breed-button');
  expect(btn.textContent).toBe('Next Breed in 7h 23m');
  expect(btn.getAttribute('data-disabled')).toBe('true');
  expect(btn.getAttribute('data-disabled-reason')).toBe('limit');
  fireEvent.click(btn);
  expect(onClick).not.toHaveBeenCalled();
  vi.useRealTimers();
});

it('external disabled with sufficient Serum and no cap → default label but disabled', () => {
  useColonyStore.setState({
    serum: SERUM_STARTING_BALANCE,
    breedsToday: 0,
    breedDayKey: todayLocalKey(),
  });
  const onClick = vi.fn();
  const { getByTestId } = render(<BreedButton onClick={onClick} disabled />);
  const btn = getByTestId('breed-button');
  expect(btn.textContent).toBe('Confirm Breed (3/3)');
  expect(btn.getAttribute('data-disabled')).toBe('true');
  expect(btn.getAttribute('data-disabled-reason')).toBe('external');
  fireEvent.click(btn);
  expect(onClick).not.toHaveBeenCalled();
});

it('enabled state — no data-disabled attribute, no reason', () => {
  useColonyStore.setState({
    serum: SERUM_STARTING_BALANCE,
    breedsToday: 0,
    breedDayKey: todayLocalKey(),
  });
  const onClick = vi.fn();
  const { getByTestId } = render(<BreedButton onClick={onClick} />);
  const btn = getByTestId('breed-button');
  expect(btn.getAttribute('data-disabled')).toBeNull();
  expect(btn.getAttribute('data-disabled-reason')).toBeNull();
  fireEvent.click(btn);
  expect(onClick).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- tests/ui/BreedButton.test.tsx`
Expected: existing BreedButton tests pass, the 4 new tests FAIL (data-disabled-reason not implemented, insufficient-Serum label not implemented).

- [ ] **Step 3: Modify `src/ui/components/BreedButton.tsx`**

Replace the file's content with:

```tsx
import { useEffect, useState, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { millisUntilLocalMidnight } from '../../state/harvest';
import { DAILY_BREED_LIMIT, breedsRemaining } from '../../state/breed';
import { BREED_COST_SERUM } from '../../state/serum';
import { styles } from '../styles';

interface Props {
  readonly onClick: () => void;
  readonly disabled?: boolean;
}

const TICK_MS = 60_000;

function formatCountdown(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

type DisabledReason = 'limit' | 'serum' | 'external' | null;

export function BreedButton({ onClick, disabled = false }: Props): ReactElement {
  const breedsToday = useColonyStore((s) => s.breedsToday);
  const breedDayKey = useColonyStore((s) => s.breedDayKey);
  const serum = useColonyStore((s) => s.serum);

  const [, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const remaining = breedsRemaining({ breedsToday, breedDayKey });
  const limitHit = remaining === 0;
  const insufficientSerum = serum < BREED_COST_SERUM;

  // Priority: limit → serum → external → enabled
  let reason: DisabledReason;
  if (limitHit) reason = 'limit';
  else if (insufficientSerum) reason = 'serum';
  else if (disabled) reason = 'external';
  else reason = null;

  const isDisabled = reason !== null;

  const label = reason === 'limit'
    ? `Next Breed in ${formatCountdown(millisUntilLocalMidnight())}`
    : reason === 'serum'
      ? `Breed costs ${BREED_COST_SERUM} SR (have ${serum})`
      : `Confirm Breed (${remaining}/${DAILY_BREED_LIMIT})`;

  const style = isDisabled ? styles.breedButtonDisabled : styles.breedButton;

  return (
    <button
      type="button"
      style={style}
      onClick={() => { if (!isDisabled) onClick(); }}
      disabled={isDisabled}
      data-testid="breed-button"
      data-disabled={isDisabled ? 'true' : undefined}
      data-disabled-reason={reason ?? undefined}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 4: Run BreedButton tests to verify pass**

Run: `npm test -- tests/ui/BreedButton.test.tsx`
Expected: all existing + 4 new tests pass.

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test`
Expected: 291 previous + 4 new = 295 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/ui/components/BreedButton.tsx tests/ui/BreedButton.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): BreedButton — insufficient-Serum disabled state + data-disabled-reason

BreedButton now reads serum from the store and gains a third disabled
tier. Priority order (highest → lowest):
  cap countdown → insufficient Serum → external disabled → enabled

Labels per state:
- cap:      "Next Breed in Xh Ym"
- serum:    "Breed costs 50 SR (have N)"
- external: default "Confirm Breed (3/3)"
- enabled:  default "Confirm Breed (3/3)"

New `data-disabled-reason` attribute exposes the reason to tests and
future UI code: "limit" | "serum" | "external" when disabled; absent
when enabled. Existing `data-disabled="true"` behavior preserved.

Existing tests still pass — the starting balance (200 SR) covers
the 50 SR cost, so "Confirm Breed (3/3)" is still the default label
in existing fixtures.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: UI — `Breed.tsx` insufficient-Serum hint + dev-server smoke check

**Files:**
- Modify: `src/ui/screens/Breed.tsx` — add insufficient-Serum hint tier
- Modify: `tests/ui/Breed.test.tsx` — add two hint-visibility tests

**Interfaces produced:**
- Breed screen hint stack now includes an insufficient-Serum tier:
  - Neither parent picked → `"Click two specimens below to pick parents."`
  - Both picked but same unit → `"Pick two different specimens."`
  - **NEW:** Both picked + distinct + cap not hit + `serum < BREED_COST_SERUM` → `"Not enough Serum — need 50 SR (have N)"`
  - Otherwise → no hint.

**Global constraints for this task:**
- No `any`.
- Test file uses `// @vitest-environment jsdom` (existing).
- The hint should NOT appear when the cap is hit (the BreedButton countdown carries that message instead).
- Do NOT modify BreedButton (Task 3), SerumBadge, App.tsx, or any other file.

- [ ] **Step 1: Modify `src/ui/screens/Breed.tsx` — add the insufficient-Serum hint**

Add these imports at the top of the file if not already present:

```ts
import { BREED_COST_SERUM } from '../../state/serum';
```

Add a `serum` selector at the top of the component (near the other `useColonyStore` selectors):

```tsx
const serum = useColonyStore((s) => s.serum);
```

Find the hint block in the Breed screen (the section that renders `"Click two specimens below to pick parents."` / `"Pick two different specimens."`). Extend it with the new tier. The exact insertion point depends on the current file's hint structure — the reference below is the intended final shape:

```tsx
{!bothPicked && (
  <div style={styles.breedHint}>Click two specimens below to pick parents.</div>
)}
{bothPicked && !distinct && (
  <div style={styles.breedHint}>Pick two different specimens.</div>
)}
{bothPicked && distinct && !limitHit && serum < BREED_COST_SERUM && (
  <div style={styles.breedHint}>
    Not enough Serum — need {BREED_COST_SERUM} SR (have {serum})
  </div>
)}
```

Where `limitHit` is derived from `breedsRemaining` (already used in the screen for the launch button state). If `limitHit` is not already a local variable, compute it once in the component body:

```tsx
const limitHit = breedsRemaining({ breedsToday, breedDayKey }) === 0;
```

- [ ] **Step 2: Extend `tests/ui/Breed.test.tsx` with two hint tests**

Add these tests inside the existing outer `describe('Breed screen', ...)` block. Add `import { BREED_COST_SERUM } from '../../src/state/serum';` at the top of the file.

```ts
it('shows the insufficient-Serum hint when serum < BREED_COST_SERUM (both parents distinct)', () => {
  const u1 = useColonyStore.getState().decant();
  const u2 = useColonyStore.getState().decant();
  useColonyStore.setState({ serum: 25 });
  const { getByText, getAllByTestId } = render(<Breed />);
  const cards = getAllByTestId('specimen-card');
  fireEvent.click(cards[0]!);
  fireEvent.click(cards[1]!);
  expect(getByText(/Not enough Serum — need 50 SR \(have 25\)/)).toBeDefined();
  void u1; void u2;
});

it('does NOT show the insufficient-Serum hint when serum >= BREED_COST_SERUM', () => {
  useColonyStore.getState().decant();
  useColonyStore.getState().decant();
  useColonyStore.setState({ serum: BREED_COST_SERUM });
  const { queryByText, getAllByTestId } = render(<Breed />);
  const cards = getAllByTestId('specimen-card');
  fireEvent.click(cards[0]!);
  fireEvent.click(cards[1]!);
  expect(queryByText(/Not enough Serum/)).toBeNull();
});
```

- [ ] **Step 3: Run Breed tests**

Run: `npm test -- tests/ui/Breed.test.tsx`
Expected: existing tests still pass + 2 new tests pass.

- [ ] **Step 4: Full suite + typecheck + build**

Run: `npm test`
Expected: 295 previous + 2 new = 297 green.

Run: `npm run typecheck`
Expected: clean.

Run: `npm run build`
Expected: bundle succeeds. Note the gzipped size — target < 68 KB (M5 was 61.09 KB; M6a adds one small component + constants + string additions, likely +1–2 KB).

- [ ] **Step 5: Local dev-server smoke check**

Run: `npm run dev`. Open `http://localhost:5173`. Expected behaviors to eyeball:

- **Fresh load:** Nav shows Colony / Breed / Incursion tabs + right-aligned `"SR 200"`.
- **Decant once same-day:** SR remains at 200 (no faucet — same day).
- **Advance system clock a day:** In DevTools, run `Date.now = () => new Date(2026, 7, 5, 12, 0, 0).getTime();` (mock a different day) — or reload and rely on real day-rollover. On next Decant, SR credits +25 → `"SR 225"`.
- **Breed once:** SR reads `"SR 175"`.
- **Set `serum: 25` via DevTools:** In console, run `useColonyStore.setState({serum: 25})` (or via React DevTools). Navigate to Breed screen with 2 distinct parents picked:
  - BreedButton label: `"Breed costs 50 SR (have 25)"`
  - BreedButton has `data-disabled="true"` and `data-disabled-reason="serum"`
  - Screen hint reads: `"Not enough Serum — need 50 SR (have 25)"`
- **Set `serum: 0` AND `breedsToday: 3`:** BreedButton shows the countdown (`"Next Breed in Xh Ym"`) — cap priority holds. No insufficient-Serum hint (cap suppresses it).
- **Reload during any state:** SR persists at its current value.

Note the results. If you cannot interactively verify in a browser (headless environment), start the dev server and confirm it binds to port 5173, then note that interactive verification is deferred to milestone review.

Ctrl-C when done.

- [ ] **Step 6: Commit**

```bash
git add src/ui/screens/Breed.tsx tests/ui/Breed.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): Breed screen — insufficient-Serum hint tier

Extends the Breed screen's hint stack with one new tier:
- Both parents picked + distinct + cap NOT hit + serum < 50
  → "Not enough Serum — need 50 SR (have N)"

Hint priority (highest → lowest):
  pick-parents → fill-slots → distinct → insufficient-Serum
When the cap is hit, the countdown lives in the BreedButton itself,
not as a hint — the insufficient-Serum hint is suppressed to avoid
double-messaging.

Closes M6a. Serum economy is now navigable end-to-end:
- SerumBadge visible in every nav (Task 2)
- BreedButton reflects insufficient-Serum state (Task 3)
- Breed screen surfaces the same info as a hint (Task 4)
- Store handles the faucet + deduction + persistence (Task 1)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** Every locked decision from the spec maps to a task:
  - `SERUM_STARTING_BALANCE`, `SERUM_DAILY_FAUCET`, `BREED_COST_SERUM` constants → Task 1.
  - `serum` store field + `decant()` faucet + `breed()` guard/deduction + persist v5 chained migration → Task 1.
  - Faucet edge cases (first Decant / same-day / skip-days) → Task 1 tests.
  - Breed guard order (cap priority over Serum) → Task 1 tests.
  - `launchIncursion` and `dismissIncursion` unchanged → Task 1 explicitly asserts these don't touch `serum`.
  - SerumBadge component + right-aligned in nav → Task 2.
  - BreedButton insufficient-Serum state + priority → Task 3.
  - `data-disabled-reason` attribute → Task 3.
  - Breed screen hint tier → Task 4.
  - Dev-server smoke check → Task 4.
- **Anti-meta invariants** — Serum sink on Breed nudges invariant #1 (every gain has a cost) at the economy layer; no other invariants touched.
- **Type consistency:** `SERUM_STARTING_BALANCE`, `SERUM_DAILY_FAUCET`, `BREED_COST_SERUM`, `serum` — all defined once (in `src/state/serum.ts`), consumed identically across state + UI + tests. `data-disabled-reason` values (`"limit"` | `"serum"` | `"external"`) match between the impl (Task 3) and test assertions (Task 3).
- **Placeholders:** none. Every step has real code or a real command. Test genomes use `rollGenome(createRng(...))` fixtures established in M4/M5.
- **Task splitting rationale:**
  - T1 is the "big" task — state extension + migration + every test file's beforeEach update. Same shape as M5 Task 4.
  - T2, T3, T4 are UI-only tasks with narrow scopes (one component / one component / one screen edit).
  - Total: 4 tasks. Small milestone by design.
- **beforeEach hygiene:** every UI test file with `useColonyStore.setState` in `beforeEach` gains `serum: SERUM_STARTING_BALANCE`. TS-strict enforces at compile time. Files without such a `beforeEach` don't need touching.
- **`Unit` shape UNCHANGED** from M5 — no inline Unit fixture updates required, unlike M4's Unit-shape extension.
- **Test count trajectory:** 272 → ~297 (25 new tests).
- **Bundle target:** 61.09 KB → target < 68 KB gzipped.
- **Deferred (from spec §Deferred):** Incursion reward SR, Extra Harvest, gear costs, Vivarium upgrades, Sequencer, variable Breed cost, store-slice split, unitToRow extraction. None surface in this plan's tasks.
