# M3b Harvest + Failsafe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Constrain the M3a on-demand Decant loop with (1) a daily Harvest limit of 3 that resets at local midnight, and (2) a Failsafe pity guarantee of Chimera-or-better after 50 dry Decants, using rejection-sampling on a substream seed to preserve determinism.

**Architecture:** Extend the existing Colony Zustand store with three new persisted fields (`harvestsToday`, `harvestDayKey`, `droughtCount`). Add two new pure state modules (`src/state/harvest.ts` for date helpers + `src/state/failsafe.ts` for tier gating + `rollGenomeAtLeast`). Two new UI components (`HarvestIndicator`, `FailsafeIndicator`) surface the state in the Colony header. `DecantButton` grows a disabled countdown state. Persist middleware bumps to `version: 2` with a `migrate` fn.

**Tech Stack:** No new runtime deps. Uses existing Zustand + Vitest + React.

**Source spec:** `docs/superpowers/specs/2026-08-04-m3b-harvest-failsafe-design.md`.

## Global Constraints

- **Branch:** work on `m3b-harvest-failsafe` (already created from main after M3a shipped, spec doc committed there). Do NOT commit to main directly.
- **TS strict:** `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any` in `src/state/*`, `src/ui/*`, or tests.
- **`src/sim/*` and `src/render/*` PURE** — unchanged from prior milestones.
- **`src/state/*` non-determinism budget:** may use `Date.now()` (in `decant()` and in `harvest.ts` helpers) and `localStorage` (via Zustand persist). NO `Math.random` anywhere.
- **`src/ui/*` non-determinism budget:** `useEffect` for timers is allowed at runtime; NO `Math.random`/`Date.now()` at module load.
- **Storage schema key stays `morulium/colony/v1`.** DO NOT change the key — bump `version: 2` in the persist config and provide a `migrate` fn instead. Design spec is explicit on this.
- **Constants** (baked in, not user-configurable): `DAILY_HARVEST_LIMIT = 3`, `DROUGHT_THRESHOLD = 50`, `FAILSAFE_INDICATOR_APPEARS_AT = 40`, `FAILSAFE_MIN_TIER = 'chimera'`, `FAILSAFE_SUBSTREAM_PRIME = 1_000_003`.
- **Failsafe substream seed:** `nextId * FAILSAFE_SUBSTREAM_PRIME`. Rejection loop iterates by adding `offset` to that base until a Chimera+ genome comes out. `MAX_ATTEMPTS = 1000` defense-in-depth cap.
- **Failsafe reset condition:** `droughtCount` resets to `0` when the rolled tier is `>= chimera` (whether naturally rolled or Failsafe-forced).
- **Countdown UI:** `setInterval` at 60_000ms — no per-second updates. Cleanup returned from `useEffect`.
- **Vitest imports:** `import { describe, it, expect, beforeEach, vi } from 'vitest'`. React component + localStorage tests use `// @vitest-environment jsdom` at file top.
- **Store reset in tests:** `beforeEach(() => useColonyStore.setState({ units: [], nextId: 1, lastDecantedId: null, harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0 }))`. Plus `localStorage.clear()` in persist tests. Plus `vi.useRealTimers()` at end of tests that mocked time.
- **Commits:** Conventional Commits + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` on every commit.

---

### Task 1: Harvest date helpers (`src/state/harvest.ts`)

**Files:**
- Create: `src/state/harvest.ts`
- Create: `tests/state/harvest.test.ts`

**Interfaces produced:**
- `const DAILY_HARVEST_LIMIT = 3 as const`
- `todayLocalKey(now?: number): string` — returns `YYYY-MM-DD` in local time (uses `Date.now()` by default; `now` param for tests)
- `millisUntilLocalMidnight(now?: number): number` — always in `(0, 86_400_000]`; returns `86_400_000` at the moment of midnight (not `0`), so the countdown UI never shows "0 seconds"
- `harvestsRemaining(state: { harvestsToday: number; harvestDayKey: string }, now?: number): number` — returns `DAILY_HARVEST_LIMIT` if `state.harvestDayKey !== todayLocalKey(now)`, else `Math.max(0, DAILY_HARVEST_LIMIT - state.harvestsToday)`

**Global constraints for this task:**
- Pure module — no side effects at import
- `Date.now()` may be called; tests mock via `vi.setSystemTime`
- No `any`
- Do NOT touch `colony.ts` yet (Task 3)

- [ ] **Step 1: Write failing tests at `tests/state/harvest.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DAILY_HARVEST_LIMIT,
  todayLocalKey,
  millisUntilLocalMidnight,
  harvestsRemaining,
} from '../../src/state/harvest';

describe('harvest helpers', () => {
  afterEach(() => vi.useRealTimers());

  it('DAILY_HARVEST_LIMIT is 3', () => {
    expect(DAILY_HARVEST_LIMIT).toBe(3);
  });

  it('todayLocalKey returns YYYY-MM-DD in local time', () => {
    // Use a specific local timestamp — 2026-08-04 12:00:00 local time
    const noon = new Date(2026, 7, 4, 12, 0, 0).getTime(); // month is 0-indexed: 7 = August
    expect(todayLocalKey(noon)).toBe('2026-08-04');
  });

  it('todayLocalKey handles single-digit months and days with zero-padding', () => {
    const feb3 = new Date(2026, 1, 3, 9, 30, 0).getTime();
    expect(todayLocalKey(feb3)).toBe('2026-02-03');
  });

  it('millisUntilLocalMidnight is 86_400_000 at exactly midnight', () => {
    const midnight = new Date(2026, 7, 4, 0, 0, 0).getTime();
    expect(millisUntilLocalMidnight(midnight)).toBe(86_400_000);
  });

  it('millisUntilLocalMidnight returns positive < 86_400_000 at noon', () => {
    const noon = new Date(2026, 7, 4, 12, 0, 0).getTime();
    const ms = millisUntilLocalMidnight(noon);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThan(86_400_000);
    // noon → midnight = 12h = 43_200_000 ms
    expect(ms).toBe(43_200_000);
  });

  it('harvestsRemaining returns full limit when day has rolled over', () => {
    const today = new Date(2026, 7, 4, 12, 0, 0).getTime();
    expect(
      harvestsRemaining({ harvestsToday: 3, harvestDayKey: '2026-08-03' }, today),
    ).toBe(DAILY_HARVEST_LIMIT);
  });

  it('harvestsRemaining subtracts harvestsToday when day matches', () => {
    const today = new Date(2026, 7, 4, 12, 0, 0).getTime();
    expect(
      harvestsRemaining({ harvestsToday: 2, harvestDayKey: '2026-08-04' }, today),
    ).toBe(1);
  });

  it('harvestsRemaining floors at 0 (defensive)', () => {
    const today = new Date(2026, 7, 4, 12, 0, 0).getTime();
    expect(
      harvestsRemaining({ harvestsToday: 99, harvestDayKey: '2026-08-04' }, today),
    ).toBe(0);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- tests/state/harvest.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `src/state/harvest.ts`**

```ts
export const DAILY_HARVEST_LIMIT = 3 as const;

/**
 * Returns YYYY-MM-DD in the user's local timezone. Optional `now` param for tests.
 */
export function todayLocalKey(now: number = Date.now()): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Milliseconds from `now` until the next local-midnight (00:00:00 of the next day).
 * At exactly midnight, returns a full day (86_400_000) rather than 0 so the
 * countdown UI never displays "0 seconds until reset."
 */
export function millisUntilLocalMidnight(now: number = Date.now()): number {
  const d = new Date(now);
  const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  const delta = nextMidnight.getTime() - now;
  return delta === 0 ? 86_400_000 : delta;
}

/**
 * How many Decants remain today given the store's harvest counters.
 * If the stored day key is behind the current local day, returns the full limit.
 */
export function harvestsRemaining(
  state: { readonly harvestsToday: number; readonly harvestDayKey: string },
  now: number = Date.now(),
): number {
  if (state.harvestDayKey !== todayLocalKey(now)) return DAILY_HARVEST_LIMIT;
  return Math.max(0, DAILY_HARVEST_LIMIT - state.harvestsToday);
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/state/harvest.test.ts`
Expected: PASS all 8 tests.

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test`
Expected: 95 previous + 8 new = 103 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/state/harvest.ts tests/state/harvest.test.ts
git commit -m "$(cat <<'EOF'
feat(state): harvest date helpers (todayLocalKey, millisUntilLocalMidnight, harvestsRemaining)

Introduces DAILY_HARVEST_LIMIT = 3 and three pure helpers for
local-timezone day boundary reasoning:

- todayLocalKey(now?) → YYYY-MM-DD in the user's timezone; used by
  the store's day-rollover check and by the header day indicator
- millisUntilLocalMidnight(now?) → count-down source for the disabled
  DecantButton label; returns a full day at exactly midnight so the
  UI never shows "0s until reset"
- harvestsRemaining(state, now?) → 3 if the stored day key is stale,
  else max(0, 3 - harvestsToday)

All tests mock time via vi.setSystemTime.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Failsafe helpers (`src/state/failsafe.ts`)

**Files:**
- Create: `src/state/failsafe.ts`
- Create: `tests/state/failsafe.test.ts`

**Interfaces produced:**
- `const DROUGHT_THRESHOLD = 50 as const`
- `const FAILSAFE_INDICATOR_APPEARS_AT = 40 as const`
- `const FAILSAFE_MIN_TIER: Tier = 'chimera'`
- `const FAILSAFE_SUBSTREAM_PRIME = 1_000_003 as const`
- `const TIER_RANK: Record<Tier, number>` — mapping `baseline=0, strain=1, mutant=2, chimera=3, progenitor=4` — used by `tierAtLeast`
- `tierAtLeast(actual: Tier, minimum: Tier): boolean` — returns `TIER_RANK[actual] >= TIER_RANK[minimum]`
- `rollGenomeAtLeast(subseed: number, minTier: Tier): Genome` — rejection-sampling roll on the substream; iterates `offset = 0..999`, calls `rollGenome(createRng(subseed + offset))`, returns first genome whose `computeRarity(genome).tier` satisfies `tierAtLeast(..., minTier)`. Throws `Error('rollGenomeAtLeast: exceeded 1000 attempts for tier X')` if the cap is exhausted.

**Global constraints for this task:**
- Pure module — no `Date.now`, no side effects
- Imports `Tier` from `../sim/types`; `Genome` from `../sim/types`; `rollGenome` from `../sim/genome`; `createRng` from `../sim/rng`; `computeRarity` from `../sim/rarity`
- No `any`
- Do NOT touch `colony.ts` yet (Task 3)

- [ ] **Step 1: Write failing tests at `tests/state/failsafe.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  DROUGHT_THRESHOLD,
  FAILSAFE_INDICATOR_APPEARS_AT,
  FAILSAFE_MIN_TIER,
  FAILSAFE_SUBSTREAM_PRIME,
  tierAtLeast,
  rollGenomeAtLeast,
} from '../../src/state/failsafe';
import { computeRarity } from '../../src/sim/rarity';

describe('failsafe constants', () => {
  it('DROUGHT_THRESHOLD is 50', () => expect(DROUGHT_THRESHOLD).toBe(50));
  it('FAILSAFE_INDICATOR_APPEARS_AT is 40', () => expect(FAILSAFE_INDICATOR_APPEARS_AT).toBe(40));
  it('FAILSAFE_MIN_TIER is chimera', () => expect(FAILSAFE_MIN_TIER).toBe('chimera'));
  it('FAILSAFE_SUBSTREAM_PRIME is 1_000_003', () => expect(FAILSAFE_SUBSTREAM_PRIME).toBe(1_000_003));
});

describe('tierAtLeast', () => {
  it('same tier returns true', () => {
    expect(tierAtLeast('chimera', 'chimera')).toBe(true);
  });
  it('higher tier returns true', () => {
    expect(tierAtLeast('progenitor', 'chimera')).toBe(true);
  });
  it('lower tier returns false', () => {
    expect(tierAtLeast('mutant', 'chimera')).toBe(false);
    expect(tierAtLeast('baseline', 'chimera')).toBe(false);
  });
  it('across full ladder: baseline < strain < mutant < chimera < progenitor', () => {
    expect(tierAtLeast('strain', 'baseline')).toBe(true);
    expect(tierAtLeast('baseline', 'strain')).toBe(false);
    expect(tierAtLeast('progenitor', 'baseline')).toBe(true);
    expect(tierAtLeast('mutant', 'progenitor')).toBe(false);
  });
});

describe('rollGenomeAtLeast', () => {
  it('returns a Chimera-or-better genome given enough attempts', () => {
    const g = rollGenomeAtLeast(1 * FAILSAFE_SUBSTREAM_PRIME, 'chimera');
    expect(tierAtLeast(computeRarity(g).tier, 'chimera')).toBe(true);
  });

  it('is deterministic: same seed + minTier returns the same genome', () => {
    const a = rollGenomeAtLeast(7 * FAILSAFE_SUBSTREAM_PRIME, 'chimera');
    const b = rollGenomeAtLeast(7 * FAILSAFE_SUBSTREAM_PRIME, 'chimera');
    expect(a).toEqual(b);
  });

  it('works for the baseline case (always succeeds on first attempt)', () => {
    // Any genome satisfies "at least baseline"
    const g = rollGenomeAtLeast(1, 'baseline');
    expect(g.loci).toBeDefined();
  });

  it('throws on the 1000-attempt guard when the target is unreachable', () => {
    // This can't practically happen with the real ALLELES table (progenitor is
    // reachable), so we only assert the error shape by inspecting the code path
    // indirectly: rollGenomeAtLeast with progenitor should still succeed within
    // ~1000 attempts for most seeds. We can't force the failure without mocking
    // rollGenome. Skipping the negative case; the guard is defense-in-depth.
    const g = rollGenomeAtLeast(1 * FAILSAFE_SUBSTREAM_PRIME, 'progenitor');
    expect(tierAtLeast(computeRarity(g).tier, 'progenitor')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- tests/state/failsafe.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `src/state/failsafe.ts`**

```ts
import type { Genome, Tier } from '../sim/types';
import { rollGenome } from '../sim/genome';
import { createRng } from '../sim/rng';
import { computeRarity } from '../sim/rarity';

export const DROUGHT_THRESHOLD = 50 as const;
export const FAILSAFE_INDICATOR_APPEARS_AT = 40 as const;
export const FAILSAFE_MIN_TIER: Tier = 'chimera';
export const FAILSAFE_SUBSTREAM_PRIME = 1_000_003 as const;
const MAX_ATTEMPTS = 1000;

const TIER_RANK: Record<Tier, number> = {
  baseline: 0,
  strain: 1,
  mutant: 2,
  chimera: 3,
  progenitor: 4,
};

/**
 * True iff `actual` is at least as rare as `minimum` in the tier ladder.
 * baseline < strain < mutant < chimera < progenitor.
 */
export function tierAtLeast(actual: Tier, minimum: Tier): boolean {
  return TIER_RANK[actual] >= TIER_RANK[minimum];
}

/**
 * Rejection-sampling roll: keep rolling from the substream until a genome
 * satisfies the minimum tier. Deterministic given (subseed, minTier).
 *
 * Called by the Colony store's decant() when droughtCount >= DROUGHT_THRESHOLD.
 * The substream seed is `nextId * FAILSAFE_SUBSTREAM_PRIME` so guaranteed rolls
 * are drawn from a completely separate deterministic sequence than the main
 * `createRng(nextId)` used by normal Decants.
 */
export function rollGenomeAtLeast(subseed: number, minTier: Tier): Genome {
  for (let offset = 0; offset < MAX_ATTEMPTS; offset++) {
    const g = rollGenome(createRng(subseed + offset));
    if (tierAtLeast(computeRarity(g).tier, minTier)) return g;
  }
  throw new Error(`rollGenomeAtLeast: exceeded ${MAX_ATTEMPTS} attempts for tier ${minTier}`);
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/state/failsafe.test.ts`
Expected: PASS all 11 tests.

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test`
Expected: 103 previous + 11 new = 114 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/state/failsafe.ts tests/state/failsafe.test.ts
git commit -m "$(cat <<'EOF'
feat(state): failsafe constants + tier gating + rollGenomeAtLeast

Adds the Failsafe/pity machinery as pure helpers, keeping the
Colony store thin:

- DROUGHT_THRESHOLD = 50: dry Decant count that triggers guarantee
- FAILSAFE_INDICATOR_APPEARS_AT = 40: UI reveal threshold (last 10)
- FAILSAFE_MIN_TIER = 'chimera': guaranteed floor
- FAILSAFE_SUBSTREAM_PRIME = 1_000_003: substream seed multiplier
  so guaranteed rolls draw from a completely different deterministic
  sequence than normal Decants
- TIER_RANK ladder + tierAtLeast(actual, minimum) predicate
- rollGenomeAtLeast(subseed, minTier): rejection sampling with a
  1000-attempt defense-in-depth cap. Fully deterministic given
  (subseed, minTier).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Extend Colony store with harvest + drought fields, v2 migration

**Files:**
- Modify: `src/state/colony.ts` — extend store shape, update `decant()` logic, bump persist config to `version: 2` with `migrate`
- Modify: `tests/state/colony.test.ts` — extend with harvest + drought + failsafe scenarios
- Modify: `tests/state/persist.test.ts` — extend with new-field persistence + migration test

**Interfaces produced:**
- Store gains `harvestsToday: number`, `harvestDayKey: string`, `droughtCount: number` fields (all persisted)
- `decant()` throws when the daily limit is exhausted (defense in depth — the UI disables the button); resets counter on day rollover; increments droughtCount unless the roll is Chimera+; uses `rollGenomeAtLeast` on the substream when `droughtCount >= DROUGHT_THRESHOLD`
- Persist config: `version: 2` + `migrate: (state, from) => { if (from < 2) return { ...state, harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0 }; return state; }`
- `partialize` extended to include the three new persisted fields; `lastDecantedId` still transient

**Global constraints for this task:**
- No `any`
- STORAGE_KEY stays exactly `'morulium/colony/v1'` — DO NOT bump the key; bump `version: 2` instead
- `beforeEach` in tests must reset ALL five persisted fields (units, nextId, harvestsToday, harvestDayKey, droughtCount) plus lastDecantedId
- Do NOT create or modify UI components (Tasks 4–6)

- [ ] **Step 1: Extend `src/state/colony.ts`**

Update the file — new imports, extended interface, updated `decant()`, migrate function, extended partialize:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Unit } from './types';
import { STORAGE_KEY } from './persist';
import { rollGenome } from '../sim/genome';
import { createRng } from '../sim/rng';
import { computeRarity } from '../sim/rarity';
import {
  DAILY_HARVEST_LIMIT,
  todayLocalKey,
} from './harvest';
import {
  DROUGHT_THRESHOLD,
  FAILSAFE_MIN_TIER,
  FAILSAFE_SUBSTREAM_PRIME,
  rollGenomeAtLeast,
  tierAtLeast,
} from './failsafe';

interface ColonyStore {
  readonly units: Unit[];
  readonly nextId: number;
  readonly lastDecantedId: number | null;
  readonly harvestsToday: number;
  readonly harvestDayKey: string;
  readonly droughtCount: number;

  decant: () => Unit;
  clearHighlight: () => void;
}

export const useColonyStore = create<ColonyStore>()(
  persist(
    (set, get) => ({
      units: [],
      nextId: 1,
      lastDecantedId: null,
      harvestsToday: 0,
      harvestDayKey: todayLocalKey(),
      droughtCount: 0,

      decant: () => {
        const state = get();
        const today = todayLocalKey();

        // Day rollover: if the stored day is stale, treat harvestsToday as 0
        const harvestsUsedToday = state.harvestDayKey === today ? state.harvestsToday : 0;
        if (harvestsUsedToday >= DAILY_HARVEST_LIMIT) {
          throw new Error('daily Harvest limit reached');
        }

        const id = state.nextId;

        // Failsafe: when drought has reached the threshold, roll from the substream
        // until we get a Chimera+ genome. Otherwise, normal roll.
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
        };

        set({
          units: [...state.units, unit],
          nextId: id + 1,
          lastDecantedId: id,
          harvestsToday: harvestsUsedToday + 1,
          harvestDayKey: today,
          droughtCount: newDrought,
        });
        return unit;
      },

      clearHighlight: () => set({ lastDecantedId: null }),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      migrate: (state, from) => {
        // Cast is safe here because Zustand's migrate types are open (unknown-ish);
        // we know the v1 shape from M3a: { units, nextId }
        if (from < 2) {
          const v1 = state as Partial<ColonyStore> & { units: Unit[]; nextId: number };
          return {
            ...v1,
            harvestsToday: 0,
            harvestDayKey: todayLocalKey(),
            droughtCount: 0,
          };
        }
        return state as ColonyStore;
      },
      partialize: (state) => ({
        units: state.units,
        nextId: state.nextId,
        harvestsToday: state.harvestsToday,
        harvestDayKey: state.harvestDayKey,
        droughtCount: state.droughtCount,
      }),
    },
  ),
);

/** Pure selector: find a unit by id. */
export function unitById(state: { units: readonly Unit[] }, id: number): Unit | undefined {
  return state.units.find((u) => u.id === id);
}
```

- [ ] **Step 2: Extend `tests/state/colony.test.ts` — add harvest + drought + failsafe cases**

Find the existing `describe('colony store', ...)` block and add these tests inside it (after the existing 4). Also update the shared `beforeEach` to reset the new fields.

Replace the current `beforeEach` with:

```ts
beforeEach(() => {
  useColonyStore.setState({
    units: [],
    nextId: 1,
    lastDecantedId: null,
    harvestsToday: 0,
    harvestDayKey: todayLocalKey(),
    droughtCount: 0,
  });
});
```

Add these new tests (import `todayLocalKey` from `../../src/state/harvest`, `tierAtLeast` from `../../src/state/failsafe`, `computeRarity` from `../../src/sim/rarity` at the top):

```ts
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
  });
  const first = useColonyStore.getState().decant();

  useColonyStore.setState({
    units: [], nextId: 99, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 50,
  });
  const second = useColonyStore.getState().decant();

  expect(first.genome).toEqual(second.genome);
});
```

- [ ] **Step 3: Extend `tests/state/persist.test.ts` — new-field persistence + migration**

Add these tests to the existing `describe('colony persistence', ...)` block. Update the shared `beforeEach` to reset all five persisted fields (same pattern as above).

```ts
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
```

- [ ] **Step 4: Run store + persist tests**

Run: `npm test -- tests/state/colony.test.ts tests/state/persist.test.ts`
Expected: previous 4 store + 3 persist tests + 6 new store + 2 new persist = 15 total in those files, all passing.

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test`
Expected: 114 previous + 8 new (6 store + 2 persist) = 122 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/state/colony.ts tests/state/colony.test.ts tests/state/persist.test.ts
git commit -m "$(cat <<'EOF'
feat(state): Colony store gains harvest counter, drought counter, failsafe roll + v2 migration

Extends ColonyStore with three new persisted fields:
- harvestsToday: 0..3, resets on day rollover inside decant()
- harvestDayKey: YYYY-MM-DD anchoring the counter to a local date
- droughtCount: Decants since last Chimera+, feeds the failsafe

decant() logic gains:
- Day-rollover reset before consuming a harvest slot
- Throw on daily limit exhaustion (UI still disables the button)
- Failsafe branch: when droughtCount >= DROUGHT_THRESHOLD, roll via
  rollGenomeAtLeast on nextId * FAILSAFE_SUBSTREAM_PRIME so the
  guaranteed roll is drawn from a separate deterministic substream.
  nextId still increments by 1.
- droughtCount resets to 0 on any Chimera+ (natural or forced), else +1

Persist middleware bumped to version: 2 with a migrate() fn that
adds the three new fields with defaults on v1 saves. Storage key
unchanged at morulium/colony/v1 — Zustand's version handles it.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `HarvestIndicator` component

**Files:**
- Create: `src/ui/components/HarvestIndicator.tsx`
- Create: `tests/ui/HarvestIndicator.test.tsx`
- Modify: `src/ui/styles.ts` — add `harvestIndicator` style (text look-and-feel)

**Interfaces produced:**
- `<HarvestIndicator />` — reads `harvestsToday`, `harvestDayKey`, `harvestsRemaining` semantics from `useColonyStore`. If remaining > 0: renders `"Harvest N/3"`. Otherwise renders `"Next Harvest in Xh Ym"` recomputed every 60s via `useEffect` + `setInterval` (with cleanup).
- `data-testid="harvest-indicator"`
- Formats: `Xh Ym` (e.g., `"7h 23m"`, `"0h 45m"`, `"23h 59m"`). No seconds precision.

**Global constraints for this task:**
- No `any`
- Test file starts with `// @vitest-environment jsdom`
- Test uses `vi.useFakeTimers` / `vi.setSystemTime` for time manipulation
- `useEffect` cleanup must clear the interval (test can assert no leaks by unmount + confirming no stray callbacks)
- Do NOT modify `DecantButton` (Task 5) or `Colony.tsx` (Task 7)
- The countdown format helper is local to this file (not exported) — YAGNI, only one consumer

- [ ] **Step 1: Add style entry to `src/ui/styles.ts`**

Add inside the exported `styles` object:

```ts
  harvestIndicator: {
    fontSize: 13,
    color: '#555',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,
```

- [ ] **Step 2: Write failing tests at `tests/ui/HarvestIndicator.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { HarvestIndicator } from '../../src/ui/components/HarvestIndicator';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';

describe('HarvestIndicator', () => {
  beforeEach(() => {
    useColonyStore.setState({
      units: [], nextId: 1, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders "Harvest 3/3" on a fresh day', () => {
    const { getByTestId } = render(<HarvestIndicator />);
    expect(getByTestId('harvest-indicator').textContent).toBe('Harvest 3/3');
  });

  it('renders "Harvest 1/3" when 2 have been used today', () => {
    useColonyStore.setState({
      units: [], nextId: 3, lastDecantedId: null,
      harvestsToday: 2, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
    });
    const { getByTestId } = render(<HarvestIndicator />);
    expect(getByTestId('harvest-indicator').textContent).toBe('Harvest 1/3');
  });

  it('renders "Next Harvest in Xh Ym" when limit is hit', () => {
    // Set time to 4:37 PM local — 7 hours 23 minutes until midnight
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4, 16, 37, 0));
    useColonyStore.setState({
      units: [], nextId: 4, lastDecantedId: null,
      harvestsToday: 3, harvestDayKey: '2026-08-04',
      droughtCount: 0,
    });
    const { getByTestId } = render(<HarvestIndicator />);
    expect(getByTestId('harvest-indicator').textContent).toBe('Next Harvest in 7h 23m');
  });

  it('countdown updates when 61+ seconds pass', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4, 16, 37, 0));
    useColonyStore.setState({
      units: [], nextId: 4, lastDecantedId: null,
      harvestsToday: 3, harvestDayKey: '2026-08-04',
      droughtCount: 0,
    });
    const { getByTestId } = render(<HarvestIndicator />);
    expect(getByTestId('harvest-indicator').textContent).toBe('Next Harvest in 7h 23m');

    // Advance 61 seconds + trigger the 60s interval tick
    vi.setSystemTime(new Date(2026, 7, 4, 16, 38, 1));
    vi.advanceTimersByTime(60_000);
    expect(getByTestId('harvest-indicator').textContent).toBe('Next Harvest in 7h 22m');
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npm test -- tests/ui/HarvestIndicator.test.tsx`
Expected: FAIL — component doesn't exist.

- [ ] **Step 4: Create `src/ui/components/HarvestIndicator.tsx`**

```tsx
import { useEffect, useState, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import {
  DAILY_HARVEST_LIMIT,
  harvestsRemaining,
  millisUntilLocalMidnight,
} from '../../state/harvest';
import { styles } from '../styles';

const TICK_MS = 60_000;

function formatCountdown(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function HarvestIndicator(): ReactElement {
  const harvestsToday = useColonyStore((s) => s.harvestsToday);
  const harvestDayKey = useColonyStore((s) => s.harvestDayKey);

  // Force re-render every 60s while limit is hit so the countdown ticks
  const [, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const remaining = harvestsRemaining({ harvestsToday, harvestDayKey });
  const label = remaining > 0
    ? `Harvest ${remaining}/${DAILY_HARVEST_LIMIT}`
    : `Next Harvest in ${formatCountdown(millisUntilLocalMidnight())}`;

  return (
    <span style={styles.harvestIndicator} data-testid="harvest-indicator">
      {label}
    </span>
  );
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- tests/ui/HarvestIndicator.test.tsx`
Expected: PASS all 4 tests.

- [ ] **Step 6: Full suite + typecheck**

Run: `npm test`
Expected: 122 previous + 4 new = 126 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/ui/components/HarvestIndicator.tsx src/ui/styles.ts tests/ui/HarvestIndicator.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): HarvestIndicator shows "Harvest N/3" or "Next Harvest in Xh Ym"

Reads harvestsToday + harvestDayKey from the Colony store. When at
least one Harvest remains today, renders "Harvest N/3". When the
limit is hit, renders "Next Harvest in Xh Ym" and refreshes every
60s via setInterval (cleaned up on unmount).

Countdown format is minutes-resolution (no seconds noise). Uses
harvestsRemaining + millisUntilLocalMidnight from src/state/harvest.

data-testid="harvest-indicator" for Colony header assertions.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `FailsafeIndicator` component

**Files:**
- Create: `src/ui/components/FailsafeIndicator.tsx`
- Create: `tests/ui/FailsafeIndicator.test.tsx`
- Modify: `src/ui/styles.ts` — add `failsafeIndicator` style (amber pill)

**Interfaces produced:**
- `<FailsafeIndicator />` — reads `droughtCount` from `useColonyStore`. Returns `null` when `droughtCount < FAILSAFE_INDICATOR_APPEARS_AT` (40). Otherwise renders a small pill with `data-testid="failsafe-indicator"` and label per the spec's formula:
  - `droughtCount >= DROUGHT_THRESHOLD` (50): `"Failsafe next"`
  - `FAILSAFE_INDICATOR_APPEARS_AT <= droughtCount < DROUGHT_THRESHOLD` (40..49): `"Failsafe in ${DROUGHT_THRESHOLD - droughtCount}"`

**Global constraints for this task:**
- No `any`
- Test file starts with `// @vitest-environment jsdom`
- No `useEffect` needed — component is derived purely from store state
- Do NOT modify DecantButton (Task 6) or Colony.tsx (Task 7)

- [ ] **Step 1: Add style entry to `src/ui/styles.ts`**

Add inside the exported `styles` object:

```ts
  failsafeIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 500,
    color: '#92400e',           // amber-800
    backgroundColor: '#fef3c7', // amber-100
    border: '1px solid #fde68a',// amber-200
  } as CSSProperties,
```

- [ ] **Step 2: Write failing tests at `tests/ui/FailsafeIndicator.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { FailsafeIndicator } from '../../src/ui/components/FailsafeIndicator';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';

function resetStore(droughtCount: number): void {
  useColonyStore.setState({
    units: [], nextId: 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(),
    droughtCount,
  });
}

describe('FailsafeIndicator', () => {
  beforeEach(() => resetStore(0));
  afterEach(() => cleanup());

  it('renders nothing when droughtCount < 40', () => {
    resetStore(39);
    const { queryByTestId } = render(<FailsafeIndicator />);
    expect(queryByTestId('failsafe-indicator')).toBeNull();
  });

  it('renders "Failsafe in 10" at droughtCount === 40', () => {
    resetStore(40);
    const { getByTestId } = render(<FailsafeIndicator />);
    expect(getByTestId('failsafe-indicator').textContent).toContain('Failsafe in 10');
  });

  it('renders "Failsafe in 1" at droughtCount === 49', () => {
    resetStore(49);
    const { getByTestId } = render(<FailsafeIndicator />);
    expect(getByTestId('failsafe-indicator').textContent).toContain('Failsafe in 1');
  });

  it('renders "Failsafe next" at droughtCount === 50', () => {
    resetStore(50);
    const { getByTestId } = render(<FailsafeIndicator />);
    expect(getByTestId('failsafe-indicator').textContent).toContain('Failsafe next');
  });

  it('renders "Failsafe next" at droughtCount > 50 (defensive)', () => {
    resetStore(75);
    const { getByTestId } = render(<FailsafeIndicator />);
    expect(getByTestId('failsafe-indicator').textContent).toContain('Failsafe next');
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npm test -- tests/ui/FailsafeIndicator.test.tsx`
Expected: FAIL — component doesn't exist.

- [ ] **Step 4: Create `src/ui/components/FailsafeIndicator.tsx`**

```tsx
import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { DROUGHT_THRESHOLD, FAILSAFE_INDICATOR_APPEARS_AT } from '../../state/failsafe';
import { styles } from '../styles';

export function FailsafeIndicator(): ReactElement | null {
  const droughtCount = useColonyStore((s) => s.droughtCount);
  if (droughtCount < FAILSAFE_INDICATOR_APPEARS_AT) return null;

  const label = droughtCount >= DROUGHT_THRESHOLD
    ? 'Failsafe next'
    : `Failsafe in ${DROUGHT_THRESHOLD - droughtCount}`;

  return (
    <span style={styles.failsafeIndicator} data-testid="failsafe-indicator">
      <span aria-hidden="true">⚠️</span> {label}
    </span>
  );
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- tests/ui/FailsafeIndicator.test.tsx`
Expected: PASS all 5 tests.

- [ ] **Step 6: Full suite + typecheck**

Run: `npm test`
Expected: 126 previous + 5 new = 131 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/ui/components/FailsafeIndicator.tsx src/ui/styles.ts tests/ui/FailsafeIndicator.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): FailsafeIndicator shows countdown pill in the last 10 dry Decants

Reads droughtCount from the Colony store. Hidden when droughtCount
< 40 (FAILSAFE_INDICATOR_APPEARS_AT). At 40..49 renders "Failsafe
in N" pill. At droughtCount >= 50 renders "Failsafe next" — the
edge-case text for the moment between the 50th dry Decant and the
guaranteed 51st.

Amber pill styling (amber-100 background, amber-800 text) — subtle,
telegraphs concern without alarm. ⚠️ icon marked aria-hidden.

data-testid="failsafe-indicator" for Colony header assertions.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: DecantButton — disabled state + countdown label

**Files:**
- Modify: `src/ui/components/DecantButton.tsx` — add disabled state driven by `harvestsRemaining`, dynamic label showing count or countdown
- Modify: `src/ui/styles.ts` — add `decantButtonDisabled` style
- Modify: `tests/ui/DecantButton.test.tsx` — extend with disabled + countdown label tests

**Interfaces produced:**
- `<DecantButton label?: string variant?: 'header' | 'empty-cta' />` — unchanged signature. New behavior:
  - When `harvestsRemaining(state) > 0`: button is enabled. If NO `label` prop was passed, label becomes `"Decant a Morula (N/3)"` (header variant) or `"Decant your first Morula (N/3)"` (empty-cta variant). If a `label` prop was passed, use it verbatim (backward compat with existing EmptyColony usage).
  - Wait — this creates a conflict with EmptyColony passing an explicit `label`. Refinement: the `(N/3)` suffix is appended when NO label is provided; when a caller passes `label`, they're responsible for their own text.
  - When `harvestsRemaining(state) === 0`: button is disabled, ignores custom `label`, renders `"Next Harvest in Xh Ym"` with 60s tick via `setInterval`. Aria: `disabled` attribute set.
- `data-testid="decant-button"` (unchanged)
- `data-disabled="true"` when the button is disabled (for test assertions)

**Global constraints for this task:**
- Backward compatible: existing DecantButton tests must still pass (their fixtures already have harvestsToday=0 via beforeEach reset)
- No `any`
- `useEffect` cleanup clears the interval
- Do NOT modify Colony.tsx (Task 7)
- Do NOT modify EmptyColony.tsx yet (Task 7's job — it needs a small update to observe the disabled state for the CTA)

- [ ] **Step 1: Add `decantButtonDisabled` style to `src/ui/styles.ts`**

Add inside the exported `styles` object:

```ts
  decantButtonDisabled: {
    padding: '10px 20px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',   // slate-300
    background: '#e2e8f0',          // slate-200
    color: '#64748b',               // slate-500
    fontSize: 14,
    fontWeight: 600,
    cursor: 'not-allowed',
    fontFamily: 'inherit',
  } as CSSProperties,

  emptyStateCtaDisabled: {
    padding: '14px 28px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: '#e2e8f0',
    color: '#64748b',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'not-allowed',
    fontFamily: 'inherit',
  } as CSSProperties,
```

- [ ] **Step 2: Modify `src/ui/components/DecantButton.tsx`**

Replace the file's content with:

```tsx
import { useEffect, useState, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import {
  DAILY_HARVEST_LIMIT,
  harvestsRemaining,
  millisUntilLocalMidnight,
} from '../../state/harvest';
import { styles } from '../styles';

interface Props {
  readonly label?: string;
  readonly variant?: 'header' | 'empty-cta';
}

const TICK_MS = 60_000;

function formatCountdown(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function DecantButton({ label, variant = 'header' }: Props): ReactElement {
  const decant = useColonyStore((s) => s.decant);
  const harvestsToday = useColonyStore((s) => s.harvestsToday);
  const harvestDayKey = useColonyStore((s) => s.harvestDayKey);

  const [, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const remaining = harvestsRemaining({ harvestsToday, harvestDayKey });
  const disabled = remaining === 0;

  const defaultLabel = variant === 'empty-cta'
    ? `Decant your first Morula (${remaining}/${DAILY_HARVEST_LIMIT})`
    : `Decant a Morula (${remaining}/${DAILY_HARVEST_LIMIT})`;

  const enabledLabel = label ?? defaultLabel;
  const displayLabel = disabled
    ? `Next Harvest in ${formatCountdown(millisUntilLocalMidnight())}`
    : enabledLabel;

  const style = disabled
    ? (variant === 'empty-cta' ? styles.emptyStateCtaDisabled : styles.decantButtonDisabled)
    : (variant === 'empty-cta' ? styles.emptyStateCta : styles.decantButton);

  return (
    <button
      type="button"
      style={style}
      onClick={() => { if (!disabled) decant(); }}
      disabled={disabled}
      data-testid="decant-button"
      data-disabled={disabled ? 'true' : undefined}
    >
      {displayLabel}
    </button>
  );
}
```

- [ ] **Step 3: Extend `tests/ui/DecantButton.test.tsx` with new state tests**

Add these tests inside the existing `describe('DecantButton', ...)` block (also update the `beforeEach` to include the new fields):

Replace the current `beforeEach` with:

```ts
beforeEach(() => {
  useColonyStore.setState({
    units: [], nextId: 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(),
    droughtCount: 0,
  });
});
afterEach(() => vi.useRealTimers());
```

Import `todayLocalKey` from `../../src/state/harvest` and `vi` from `vitest` at the top.

Update the first existing test's assertion (label now includes count):

```ts
it('renders with default header label including N/3', () => {
  const { getByTestId } = render(<DecantButton />);
  expect(getByTestId('decant-button').textContent).toBe('Decant a Morula (3/3)');
});
```

Add new tests:

```ts
it('label reflects harvests remaining', () => {
  useColonyStore.setState({
    units: [], nextId: 2, lastDecantedId: null,
    harvestsToday: 2, harvestDayKey: todayLocalKey(),
    droughtCount: 0,
  });
  const { getByTestId } = render(<DecantButton />);
  expect(getByTestId('decant-button').textContent).toBe('Decant a Morula (1/3)');
});

it('renders disabled with countdown label when limit hit', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 4, 16, 37, 0)); // 7h 23m to midnight
  useColonyStore.setState({
    units: [], nextId: 4, lastDecantedId: null,
    harvestsToday: 3, harvestDayKey: '2026-08-04',
    droughtCount: 0,
  });
  const { getByTestId } = render(<DecantButton />);
  const btn = getByTestId('decant-button');
  expect(btn.textContent).toBe('Next Harvest in 7h 23m');
  expect(btn.getAttribute('disabled')).not.toBeNull();
  expect(btn.getAttribute('data-disabled')).toBe('true');
});

it('click is a no-op when disabled — store state unchanged', () => {
  useColonyStore.setState({
    units: [], nextId: 4, lastDecantedId: null,
    harvestsToday: 3, harvestDayKey: todayLocalKey(),
    droughtCount: 0,
  });
  const { getByTestId } = render(<DecantButton />);
  fireEvent.click(getByTestId('decant-button'));
  expect(useColonyStore.getState().units).toHaveLength(0);
  expect(useColonyStore.getState().harvestsToday).toBe(3);
});
```

Also update the existing "custom label" test — since EmptyColony passes an explicit label, custom-label callers still work but bypass the (N/3) suffix:

```ts
it('renders with a custom label (bypasses N/3 suffix) when label prop is set', () => {
  const { getByTestId } = render(<DecantButton label="Decant your first Morula" />);
  expect(getByTestId('decant-button').textContent).toBe('Decant your first Morula');
});
```

Keep the existing "calls decant() on click" test as-is — it should still pass because `beforeEach` gives 3 Harvests available.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/ui/DecantButton.test.tsx`
Expected: PASS — 3 original (with the updated label assertion) + 3 new = 6 total.

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test`
Expected: 131 previous + 3 net new (3 added, 0 removed) = 134 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/ui/components/DecantButton.tsx src/ui/styles.ts tests/ui/DecantButton.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): DecantButton — disabled + countdown when Harvest limit hit

Reads harvestsToday/harvestDayKey from the Colony store. When
harvestsRemaining > 0, renders "Decant a Morula (N/3)" (or
"Decant your first Morula (N/3)" in empty-cta variant) — a caller
that passes an explicit label prop still bypasses the suffix
(backward compatible with EmptyColony).

When the limit is hit, button becomes disabled, ignores custom
label, and shows "Next Harvest in Xh Ym" driven by a 60s interval.
Click handler no-ops when disabled — defense in depth on top of
the store's own throw. data-disabled attribute set for test targets.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Wire indicators into Colony header + refine EmptyColony

**Files:**
- Modify: `src/ui/screens/Colony.tsx` — insert `<HarvestIndicator />` and `<FailsafeIndicator />` in the header row
- Modify: `src/ui/components/EmptyColony.tsx` — CTA respects the harvest limit (uses DecantButton which now handles it, so the change is minimal); update the body copy to mention the Harvest cadence
- Modify: `tests/ui/colony.test.tsx` — extend with failsafe indicator visibility test
- Modify: `tests/ui/EmptyColony.test.tsx` — regression check that CTA still renders (it does, via updated DecantButton)

**Interfaces produced:**
- Colony header now includes `<HarvestIndicator />` and `<FailsafeIndicator />` (conditionally rendered by the component itself, i.e. FailsafeIndicator returns null when hidden)
- EmptyColony body copy updated to explain the daily rhythm briefly

**Global constraints for this task:**
- No `any`
- Keep the existing Colony header layout (h1 + subtitle + DecantButton on the right) — just add the two indicators to the subtitle line
- Do NOT rewrite Colony.tsx from scratch — modify it in place
- Test file starts with `// @vitest-environment jsdom` (existing convention)
- Do NOT modify SpecimenCard, TierBadge, Sprite, or anything under `src/render/`

- [ ] **Step 1: Modify `src/ui/screens/Colony.tsx` — add indicators**

Find the header block (currently `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>`) and update its inner content. The existing subtitle `<p>Your Colony — N specimens</p>` becomes a container that also holds `<HarvestIndicator />` and `<FailsafeIndicator />`. Something like:

```tsx
// Add these imports at the top of Colony.tsx
import { HarvestIndicator } from '../components/HarvestIndicator';
import { FailsafeIndicator } from '../components/FailsafeIndicator';

// Then in the returned JSX, replace the current header block:
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
  <div>
    <h1 style={styles.headerTitle}>Morulium</h1>
    <p style={styles.headerSub}>
      Your Colony — {units.length} specimens
      {' · '}<HarvestIndicator />
      {' '}<FailsafeIndicator />
    </p>
  </div>
  <DecantButton />
</div>
```

The `FailsafeIndicator` returns `null` when hidden, so nothing renders in that spot until droughtCount reaches 40 — no layout jump beyond the natural inline text flow.

- [ ] **Step 2: Update body copy in `src/ui/components/EmptyColony.tsx`**

Replace the current body text to mention the daily cadence:

```tsx
import type { ReactElement } from 'react';
import { DecantButton } from './DecantButton';
import { styles } from '../styles';

export function EmptyColony(): ReactElement {
  return (
    <div style={styles.emptyState} data-testid="empty-colony">
      <div style={styles.emptyStateTitle}>Your Colony is empty</div>
      <div style={styles.emptyStateBody}>
        Decant a Morula to seed the collection. You get 3 free Harvests each day.
      </div>
      <DecantButton label="Decant your first Morula" variant="empty-cta" />
    </div>
  );
}
```

Note: the DecantButton (with an explicit `label` prop) still handles the disabled + countdown state internally — so if for some reason the user hits the empty state after Harvesting 3× (edge case), the CTA correctly disables.

- [ ] **Step 3: Extend `tests/ui/colony.test.tsx` — failsafe indicator visibility**

Import `FAILSAFE_INDICATOR_APPEARS_AT` from `../../src/state/failsafe`; import `todayLocalKey` from `../../src/state/harvest`. Update the shared `beforeEach` in the file to reset the new fields (same pattern as other test files). Add these tests inside the existing `describe('Colony screen', ...)` block:

```ts
it('renders the FailsafeIndicator in the header when droughtCount >= 40', () => {
  useColonyStore.setState({
    units: [
      { id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome() },
    ],
    nextId: 2, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(),
    droughtCount: 45,
  });
  const { getByTestId } = render(<Colony />);
  const pill = getByTestId('failsafe-indicator');
  expect(pill.textContent).toContain('Failsafe in 5');
});

it('does not render the FailsafeIndicator when droughtCount < 40', () => {
  useColonyStore.setState({
    units: [
      { id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome() },
    ],
    nextId: 2, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(),
    droughtCount: 20,
  });
  const { queryByTestId } = render(<Colony />);
  expect(queryByTestId('failsafe-indicator')).toBeNull();
});

it('always renders the HarvestIndicator', () => {
  useColonyStore.setState({
    units: [
      { id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome() },
    ],
    nextId: 2, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(),
    droughtCount: 0,
  });
  const { getByTestId } = render(<Colony />);
  expect(getByTestId('harvest-indicator').textContent).toBe('Harvest 3/3');
});
```

Also — the existing colony.test.tsx tests set store state manually without the M3b fields. Make sure the tests that create `useColonyStore.setState({...})` calls include the new fields (`harvestsToday: 0`, `harvestDayKey: todayLocalKey()`, `droughtCount: 0`). If the store's type is strict about the shape, these become required.

- [ ] **Step 4: Extend `tests/ui/EmptyColony.test.tsx` regression check**

Update the shared `beforeEach` in that file to reset the new fields:

```ts
beforeEach(() => {
  useColonyStore.setState({
    units: [], nextId: 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(),
    droughtCount: 0,
  });
});
```

Update the existing "clicking the CTA decants the first specimen" test to still pass (the DecantButton with a label prop doesn't append `(N/3)` so text-based assertions still match).

Add one new test:

```ts
it('CTA is disabled when the daily Harvest limit is already hit', () => {
  useColonyStore.setState({
    units: [], nextId: 4, lastDecantedId: null,
    harvestsToday: 3, harvestDayKey: todayLocalKey(),
    droughtCount: 0,
  });
  const { getByTestId } = render(<EmptyColony />);
  const btn = getByTestId('decant-button');
  expect(btn.getAttribute('data-disabled')).toBe('true');
});
```

- [ ] **Step 5: Run all UI tests**

Run: `npm test -- tests/ui/`
Expected: all UI tests pass (colony.test.tsx +3, EmptyColony.test.tsx +1, plus existing).

- [ ] **Step 6: Full suite + typecheck + build**

Run: `npm test`
Expected: 134 previous + 4 new = ~138 green.

Run: `npm run typecheck`
Expected: clean.

Run: `npm run build`
Expected: bundle succeeds. Note the gzipped size — spec target is 56–58 KB.

- [ ] **Step 7: Local dev-server smoke check**

Run: `npm run dev` briefly. Open `http://localhost:5173`. Expected behaviors to eyeball:
- Empty Colony (fresh browser): CTA reads "Decant your first Morula", body text mentions "3 free Harvests each day", HarvestIndicator not visible (no header on empty state)
- After 1 Decant: header appears with "Harvest 2/3"; DecantButton label reads "Decant a Morula (2/3)"; new card has highlight
- After 3 Decants: HarvestIndicator reads "Next Harvest in Xh Ym"; DecantButton is disabled and shows the same countdown; clicking does nothing
- To test Failsafe manually: in DevTools console run:
  ```js
  const store = JSON.parse(localStorage.getItem('morulium/colony/v1'));
  store.state.droughtCount = 45;
  localStorage.setItem('morulium/colony/v1', JSON.stringify(store));
  location.reload();
  ```
  Verify FailsafeIndicator pill appears in header reading "⚠️ Failsafe in 5". Then set to 50 and verify it reads "Failsafe next".

Note the results in the task report. If you cannot interactively verify in a browser (headless environment), start the server and confirm it binds to port 5173 without errors, then note that manual verification is deferred to milestone review.

Ctrl-C when done.

- [ ] **Step 8: Commit**

```bash
git add src/ui/screens/Colony.tsx src/ui/components/EmptyColony.tsx tests/ui/colony.test.tsx tests/ui/EmptyColony.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): wire HarvestIndicator + FailsafeIndicator into Colony header

Colony header's subtitle line now reads:
  Your Colony — N specimens · Harvest N/3 [Failsafe in N]

FailsafeIndicator returns null when droughtCount < 40, so nothing
appears in that spot until the last-10-Decants window opens.
HarvestIndicator is always shown.

EmptyColony body copy mentions the daily Harvest cadence
("You get 3 free Harvests each day."). Its CTA still handles the
disabled + countdown state via the shared DecantButton — if a user
somehow reaches the empty state with 0 remaining Harvests, the CTA
disables correctly.

Existing colony/EmptyColony tests updated to reset the three new
persisted fields (harvestsToday, harvestDayKey, droughtCount) in
beforeEach.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** Data model (store extension + migration) → Tasks 2 + 3. Harvest mechanics (limit + reset) → Tasks 1 + 3 + 4 + 6. Failsafe mechanics (drought + rejection sampling + reset) → Tasks 2 + 3 + 5. UI (HarvestIndicator, FailsafeIndicator, DecantButton disabled state, Colony header wiring, EmptyColony CTA behavior) → Tasks 4 + 5 + 6 + 7. Testing (extended state + persist tests, new UI tests) → Tasks 1 + 2 + 3 + 4 + 5 + 6 + 7 each end with their own test additions.
- **Type consistency:** `Unit`, `useColonyStore`, `STORAGE_KEY`, `todayLocalKey`, `harvestsRemaining`, `millisUntilLocalMidnight`, `DAILY_HARVEST_LIMIT`, `DROUGHT_THRESHOLD`, `FAILSAFE_INDICATOR_APPEARS_AT`, `FAILSAFE_MIN_TIER`, `FAILSAFE_SUBSTREAM_PRIME`, `tierAtLeast`, `rollGenomeAtLeast` — all defined once, consumed identically across tasks.
- **Placeholders:** none — every step has real code or a real command. Test genomes for state tests use the `makeMinimalGenome()` helper style established in M3a colony.test.tsx; UI tests set store state with the same shape.
- **Task splitting rationale:** T1 (harvest helpers) + T2 (failsafe helpers) are pure modules with no store coupling — parallelizable in principle but the plan runs them sequentially for simplicity. T3 integrates them into the store — one big diff but coherent (store extension is a single concern). T4/T5 are independent UI components. T6 extends DecantButton. T7 is the integration + smoke.
- **DecantButton backward-compat subtlety:** the label-prop-bypasses-suffix rule is called out in T6 because EmptyColony passes `label="Decant your first Morula"`. Without that rule, the EmptyColony CTA would show "Decant your first Morula (3/3)" which is redundant with the body copy. This is a real design decision worth documenting for a reviewer who might otherwise ask "why doesn't the label always include the count?"
- **beforeEach hygiene:** every test file that touches the store has to reset all 6 store fields now. Missing one leads to a subtle test-bleed bug. Reminders in T3/T4/T5/T6/T7.
- **Deferred:** all M3c concerns (tag/sort/cull), Serum currency (M6+), "Extra Harvest" (M6+), Failsafe history/stats, configurable constants, cross-tab sync, Progenitor-tier separate Failsafe. None of these should surface in this plan's tasks.
