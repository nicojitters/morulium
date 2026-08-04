# M6b Rest + Injury + Stim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Incursion loop teeth (game spec §11): per-unit rest (0-100, cost 40/deploy, daily refresh), 0.7 effectiveness penalty + 25% injury roll when under-rested, and a 40 SR Stim consumable that negates both. Injuries bench units for 1 hour. Activates anti-meta invariant #6 (Rest forces rotation).

**Architecture:** No new render surface. Two sim additions (`stats.ts` gains a `restPenalty` param; new `injury.ts` module for `rollInjuries`), one new state helpers module (`rest.ts` with 8 constants), extend the Colony store's `decant()` with a daily rest refresh + `breed()` mints at full rest + `launchIncursion()` with rest deduction/injury roll/Stim application + new `buyStim()` action + persist v6 migration. SpecimenCard gains a rest line (+ injured overlay); Incursion screen gains Stim toggles + Buy Stim button + under-rested hints.

**Tech Stack:** No new runtime deps. Vite + React + TypeScript + Zustand + Vitest.

**Source spec:** `docs/superpowers/specs/2026-08-04-m6b-rest-injury-stim-design.md`.

## Global Constraints

- **Branch:** work on `m6b-rest-injury-stim` (create with `git checkout -b m6b-rest-injury-stim` from `main` before Task 1). Do NOT commit to main directly.
- **TS strict:** `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any` in `src/sim/*`, `src/state/*`, `src/ui/*`, or tests.
- **`src/sim/*` PURE** — no `Math.random`, no `Date.now`, no side effects at module load. All RNG through `createRng(seed)`.
- **`src/state/*` non-determinism budget:** `Date.now()` in `launchIncursion` (injury timestamp) and `todayLocalKey` (day-rollover). No `Math.random`.
- **`src/ui/*` non-determinism budget:** existing 60s intervals in `HarvestIndicator`/`BreedIndicator` and 1s clock in `Incursion.tsx` unchanged; a new 1s clock lands in Colony.tsx and Breed.tsx to drive injury countdowns on picker cards.
- **Storage key stays `morulium/colony/v1`** — DO NOT rename. Bump `version: 6` and add `if (from < 6)` branch AFTER existing v2/v3/v4/v5 branches. Chained `if`s, not `else if`.
- **Constants** (baked, not user-configurable):
  - `REST_MAX = 100`
  - `REST_DEPLOY_COST = 40`
  - `UNDER_RESTED_THRESHOLD = 40`
  - `UNDER_RESTED_PENALTY = 0.7`
  - `INJURY_CHANCE = 0.25`
  - `INJURY_DURATION_MS = 60 * 60 * 1000` (1 hour)
  - `INJURY_SUBSTREAM_PRIME = 1_000_213`
  - `STIM_COST_SERUM = 40`
- **Injury RNG substream:** `createRng(childSeed * INJURY_SUBSTREAM_PRIME + rollIndex)` where `childSeed = state.nextId` at launch. `rollIndex` iterates in sorted-numeric order of under-rested unit ids so results are deterministic across engines.
- **Rest refresh scope:** `decant()` on day-rollover refreshes `restCurrent` on ALL existing units to REST_MAX. `injuredUntil` is NOT reset — injuries expire on their own timer.
- **Rest deploy semantics:** `launchIncursion` deducts REST_DEPLOY_COST from every team member's rest, floored at 0. Applied atomically in the same `set()` as the resolution + injury commit.
- **Under-rested filter:** a unit is under-rested iff `restCurrent < UNDER_RESTED_THRESHOLD` at launch AND not in `stimAppliedIds`. Only under-rested (non-stimmed) units appear in `restPenalties` and get an injury roll.
- **launchIncursion guard order (fixed):** unknown front → captured → cooldown → team size → distinct ids → missing units → **injured team member** → **stim-not-in-team** → **insufficient Stims** → compute.
- **Stim application** to a fully-rested unit is allowed but wasteful (consumes 1 Stim, no effect). Store does NOT throw. UI SHOULD hide the toggle for fully-rested slots.
- **`dismissIncursion` UNCHANGED** — rest/injury/Stim consequences fire at LAUNCH, not dismiss.
- **`breed()`:** child mints at `restCurrent: REST_MAX, injuredUntil: null`. Does NOT consume parent rest. Does NOT gate on parent injury.
- **`Unit` shape gains TWO REQUIRED fields:** `restCurrent: number`, `injuredUntil: number | null`. TS strict enforces at compile time — every inline `Unit` fixture across the test suite must be updated. This is the M4-style "big fixture update" task shape.
- **Vitest imports:** `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'`. UI + persist tests use `// @vitest-environment jsdom` at file top. Cleanup with `cleanup()` in `afterEach`.
- **Store reset in tests** (updated for M6b): `beforeEach(() => useColonyStore.setState({ units: [], nextId: 1, lastDecantedId: null, harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0, breedsToday: 0, breedDayKey: todayLocalKey(), fronts: FRESH_FRONTS, activeIncursion: null, serum: SERUM_STARTING_BALANCE, stims: 0 }))`. Plus `localStorage.clear()` in persist tests. Plus `vi.useRealTimers()` in `afterEach` for tests that mocked time.
- **Unit fixture template** (for tests that inline-construct a Unit): `{ id, seed, decantedAt, genome, generation: 0, parentIds: null, wear: {}, restCurrent: REST_MAX, injuredUntil: null }`. Update every existing fixture to include the two new fields.
- **Commits:** Conventional Commits + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` on every commit.

---

### Task 1: Sim — `stats.ts` restPenalty + `incursion.ts` restPenalties propagation

**Files:**
- Modify: `src/sim/stats.ts` — add optional `restPenalty` param to `computeCurrentStats`
- Modify: `src/sim/incursion.ts` — add optional `restPenalties` param to `bestContributorPerStat` and `resolveIncursion`; propagate to `computeCurrentStats`
- Modify: `tests/sim/stats.test.ts` — regression test (no-arg unchanged) + 3 new tests
- Modify: `tests/sim/incursion.test.ts` — update `makeUnit` helper with the two new Unit fields; regression test (no-arg unchanged) + 2 new tests

**Interfaces produced:**
- `computeCurrentStats(genome, level, wear?, restPenalty?): Record<Stat, number>` — trailing `restPenalty: number = 1.0`.
- `bestContributorPerStat(team, requiredStats, restPenalties?): Readonly<Partial<Record<Stat, BestContributor>>>` — trailing `restPenalties: Readonly<Record<number, number>> = {}`.
- `resolveIncursion(team, front, restPenalties?): IncursionResolution` — same trailing param.

**Global constraints for this task:**
- Pure module — no side effects. All new params optional; default values preserve legacy behavior.
- No `any`. `restPenalties[unitId]` under `noUncheckedIndexedAccess` returns `number | undefined` — always `?? 1.0`.
- Do NOT touch `src/state/*` or `src/ui/*` in this task.
- Do NOT introduce injury logic — that's Task 2.

- [ ] **Step 1: Write failing tests at `tests/sim/stats.test.ts` (append inside existing outer describe)**

Add these tests at the end of the file:

```ts
describe('rest penalty in computeCurrentStats', () => {
  it('no restPenalty arg matches restPenalty=1.0 (regression lock)', () => {
    const g = rollGenome(createRng(42));
    expect(computeCurrentStats(g, 20)).toEqual(computeCurrentStats(g, 20, {}, 1.0));
  });

  it('restPenalty=0.7 multiplies every stat by 0.7 vs no arg', () => {
    const g = rollGenome(createRng(101));
    const full = computeCurrentStats(g, 20);
    const penalized = computeCurrentStats(g, 20, {}, 0.7);
    for (const s of STATS) {
      expect(penalized[s]).toBeCloseTo(full[s] * 0.7, 10);
    }
  });

  it('restPenalty composes with wear multiplicatively', () => {
    const g = rollGenome(createRng(202));
    // Use a locus with a definite non-zero contribution
    const firstStatLocus = Object.values(LOCI).find((l) =>
      l.alleles.some((aid) => {
        const a = ALLELES[aid];
        return a && Object.values(a.statDeltas).some((d) => d !== 0 && d !== undefined);
      }),
    );
    if (!firstStatLocus) throw new Error('no stat-bearing locus found');

    const noPenaltyWithWear = computeCurrentStats(g, 20, { [firstStatLocus.id]: 20 }, 1.0);
    const bothPenaltyAndWear = computeCurrentStats(g, 20, { [firstStatLocus.id]: 20 }, 0.7);
    // Every stat should be exactly 0.7 of the wear-only version
    for (const s of STATS) {
      expect(bothPenaltyAndWear[s]).toBeCloseTo(noPenaltyWithWear[s] * 0.7, 10);
    }
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- tests/sim/stats.test.ts`
Expected: FAIL — `computeCurrentStats` doesn't accept 4 args yet.

- [ ] **Step 3: Modify `src/sim/stats.ts` — add optional restPenalty param**

Find the current `computeCurrentStats` function. Add a fourth optional parameter and multiply the final value by it. The full replacement:

```ts
/**
 * Current stats = base * (1 + 0.02 * level * affinity) * restPenalty.
 * At level 20 with affinity=1.0 and restPenalty=1.0 → base * 1.4 (+40% cap).
 * restPenalty defaults to 1.0 — under-rested units pass 0.7 (M6b).
 * Caller enforces the level cap.
 */
export function computeCurrentStats(
  genome: Genome,
  level: number,
  wear: Wear = NO_WEAR,
  restPenalty: number = 1.0,
): Record<Stat, number> {
  const base = computeBaseStats(genome, wear);
  const affinity = computeGrowthAffinity(genome, wear);
  const out = {} as Record<Stat, number>;
  for (const s of STATS) {
    out[s] = base[s] * (1 + 0.02 * level * affinity[s]) * restPenalty;
  }
  return out;
}
```

`computeBaseStats` and `computeGrowthAffinity` are UNCHANGED.

- [ ] **Step 4: Run stats tests to verify pass**

Run: `npm test -- tests/sim/stats.test.ts`
Expected: PASS all existing + 3 new tests.

- [ ] **Step 5: Update `tests/sim/incursion.test.ts` — extend `makeUnit` helper first**

The existing `makeUnit` helper at line ~17 needs `restCurrent` and `injuredUntil`. Even though these fields aren't defined on `Unit` yet (that's Task 3), TS-strict compile depends on the Unit type — and Task 3 is what changes the type. To avoid a cross-task type dependency, this task only updates `makeUnit` in a forward-compatible way: use `as Unit` cast temporarily so the fixture doesn't drift when Task 3 lands.

Actually, cleaner: update `makeUnit` to include the two fields NOW as literal values. The type doesn't require them YET (still on M6a shape), but adding literal fields is forward-compatible — TS won't complain about extra fields at construction time because `Unit` is not (yet) sealed against additions. When Task 3 adds them to the type, no code churn.

Replace `makeUnit` in `tests/sim/incursion.test.ts`:

```ts
function makeUnit(id: number, seed: number): Unit {
  return {
    id, seed, decantedAt: 100 * id,
    genome: rollGenome(createRng(seed)),
    generation: 0, parentIds: null, wear: {},
    restCurrent: 100, injuredUntil: null,  // M6b — forward-compatible; type gains these in Task 3
  };
}
```

**Note:** `restCurrent: 100` uses the literal, not `REST_MAX` (which lives in `src/state/rest.ts`, created in Task 3). This is fine — the literal matches the constant and avoids a state-layer import from a sim test.

- [ ] **Step 6: Add restPenalties propagation tests to `tests/sim/incursion.test.ts`**

Add these tests inside the existing `describe('resolveIncursion', ...)` block:

```ts
it('no restPenalties arg matches restPenalties={} (regression lock)', () => {
  const a = resolveIncursion(team, FRONTS.infrastructure);
  const b = resolveIncursion(team, FRONTS.infrastructure, {});
  expect(a).toEqual(b);
});

it('restPenalties on the dominant unit can flip the outcome', () => {
  // Pick a well-rested strong team
  const strongTeam = [makeUnit(1, 999), makeUnit(2, 999), makeUnit(3, 999), makeUnit(4, 999)];
  const clean = resolveIncursion(strongTeam, FRONTS.infrastructure);

  // Apply 0.7 penalty to every unit — successP drops
  const penalized = resolveIncursion(strongTeam, FRONTS.infrastructure, {
    1: 0.7, 2: 0.7, 3: 0.7, 4: 0.7,
  });
  expect(penalized.successP).toBeLessThan(clean.successP);
});
```

Add this test inside `describe('bestContributorPerStat', ...)`:

```ts
it('applies restPenalty when choosing the best contributor', () => {
  // Unit 1 with penalty=0.7 may lose to unit 2 without penalty
  const team = [makeUnit(1, 555), makeUnit(2, 100), makeUnit(3, 200), makeUnit(4, 300)];
  const noPenalty = bestContributorPerStat(team, ['PWR']);
  const withPenalty = bestContributorPerStat(team, ['PWR'], { [noPenalty.PWR!.unitId]: 0.7 });
  // The penalized unit's contribution is now 0.7 of what it was;
  // if its lead was less than 30%, another unit takes over.
  const originalLeader = noPenalty.PWR!.unitId;
  const newLeader = withPenalty.PWR!.unitId;
  // Sanity: either the leader is the same (their lead was > 30%) or it changed.
  // In either case, if the leader stayed the same, their value should drop by 0.7.
  if (newLeader === originalLeader) {
    expect(withPenalty.PWR!.value).toBeCloseTo(noPenalty.PWR!.value * 0.7, 5);
  } else {
    // A new unit won — their value is at full strength (no penalty)
    expect(withPenalty.PWR!.value).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 7: Modify `src/sim/incursion.ts` — propagate restPenalties**

Update `bestContributorPerStat` and `resolveIncursion` signatures + inner logic:

```ts
export function bestContributorPerStat(
  team: readonly Unit[],
  requiredStats: readonly Stat[],
  restPenalties: Readonly<Record<number, number>> = {},
): Readonly<Partial<Record<Stat, BestContributor>>> {
  const out: Partial<Record<Stat, BestContributor>> = {};
  const perUnitStats: { unit: Unit; stats: Record<Stat, number> }[] = team.map((u) => ({
    unit: u,
    stats: computeCurrentStats(u.genome, INCURSION_LEVEL, u.wear, restPenalties[u.id] ?? 1.0),
  }));
  for (const s of requiredStats) {
    let best: BestContributor | undefined;
    for (const entry of perUnitStats) {
      const v = entry.stats[s];
      if (best === undefined || v > best.value) {
        best = { unitId: entry.unit.id, value: v };
      }
    }
    if (best !== undefined) out[s] = best;
  }
  return out;
}

export function resolveIncursion(
  team: readonly Unit[],
  front: FrontProfile,
  restPenalties: Readonly<Record<number, number>> = {},
): IncursionResolution {
  if (team.length !== TEAM_SIZE) {
    throw new Error(`resolveIncursion: team size ${team.length} !== TEAM_SIZE ${TEAM_SIZE}`);
  }

  const requiredStatsOrdered: Stat[] = [];
  for (const s of Object.keys(front.requirements) as Stat[]) {
    if (front.requirements[s] !== undefined) requiredStatsOrdered.push(s);
  }

  const bests = bestContributorPerStat(team, requiredStatsOrdered, restPenalties);

  const coverage: Partial<Record<Stat, number>> = {};
  const bestContributors: Partial<Record<Stat, number>> = {};
  for (const s of requiredStatsOrdered) {
    const req = front.requirements[s]!;
    const best = bests[s]!;
    if (req.threshold === 0) {
      coverage[s] = best.value > 0 ? COVERAGE_CLIP : 0;
    } else {
      coverage[s] = Math.min(COVERAGE_CLIP, best.value / req.threshold);
    }
    bestContributors[s] = best.unitId;
  }

  let successP = 1;
  for (const s of requiredStatsOrdered) {
    const c = coverage[s]!;
    const w = front.requirements[s]!.weight;
    successP *= c ** w;
  }

  const outcome: 'won' | 'failed' = successP >= SUCCESS_CUTOFF ? 'won' : 'failed';

  const beats: IncursionBeat[] = [];
  beats.push({ kind: 'launch', text: front.flavor.launchBlurb });
  for (const s of requiredStatsOrdered) {
    const c = coverage[s]!;
    const band = bandForCoverage(c);
    beats.push({ kind: 'stat', stat: s, band, text: BAND_PHRASES[s][band] });
  }
  beats.push({
    kind: 'verdict',
    text: outcome === 'won' ? front.flavor.winBlurb : front.flavor.failBlurb,
  });

  return {
    frontId: front.id,
    teamIds: [team[0]!.id, team[1]!.id, team[2]!.id, team[3]!.id] as const,
    coverage,
    bestContributors,
    successP,
    outcome,
    beats,
  };
}
```

- [ ] **Step 8: Run incursion tests**

Run: `npm test -- tests/sim/incursion.test.ts`
Expected: PASS existing + new tests.

- [ ] **Step 9: Full suite + typecheck**

Run: `npm test`
Expected: 297 previous + ~6 new (3 stats + 3 incursion) = ~303 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 10: Commit**

```bash
git checkout -b m6b-rest-injury-stim
git add src/sim/stats.ts src/sim/incursion.ts tests/sim/stats.test.ts tests/sim/incursion.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): restPenalty in computeCurrentStats + restPenalties in resolveIncursion

Adds optional trailing restPenalty param (default 1.0) to
computeCurrentStats: the final stat value is multiplied by
restPenalty AFTER wear + level scaling. Composes multiplicatively
with wear (a wear=20 locus + restPenalty=0.7 shaves the locus
contribution by wearMultiplier(20) * 0.7 = 0.42).

Adds optional trailing restPenalties param (default {}) to both
bestContributorPerStat and resolveIncursion. Under-rested units'
ids map to their penalty (0.7 for M6b). The penalty flows into
computeCurrentStats per-unit; a normally-dominant unit can be
dethroned by a fully-rested runner-up.

Default values preserve legacy behavior — every existing caller
(Colony's unitToRow, Incursion's launch) produces identical output.
Zero regression risk on M4/M5/M6a tests.

Updated makeUnit helper in tests/sim/incursion.test.ts to include
the two new Unit fields (restCurrent: 100, injuredUntil: null)
forward-compatibly — Task 3 will add them to the Unit type proper.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Sim — `src/sim/injury.ts` (new module) + `rollInjuries`

**Files:**
- Create: `src/sim/injury.ts`
- Create: `tests/sim/injury.test.ts`

**Interfaces produced:**
- `const INJURY_CHANCE = 0.25 as const`
- `function rollInjuries(restPenalties: Readonly<Record<number, number>>, seedBase: number): Readonly<Record<number, boolean>>`

**Global constraints for this task:**
- Pure module — no side effects, no `Date.now`. RNG via `createRng` only.
- Iterates `Object.keys(restPenalties)` in **sorted numeric order** (deterministic across engines).
- Skips entries with `value === 1.0` (defensive — only sub-1.0 = under-rested = at risk).
- No `any`.
- Do NOT touch `src/state/*` or `src/ui/*` in this task.

- [ ] **Step 1: Write failing tests at `tests/sim/injury.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { INJURY_CHANCE, rollInjuries } from '../../src/sim/injury';

describe('injury constants', () => {
  it('INJURY_CHANCE is 0.25', () => expect(INJURY_CHANCE).toBe(0.25));
});

describe('rollInjuries', () => {
  it('returns empty map when restPenalties is empty', () => {
    const out = rollInjuries({}, 42);
    expect(Object.keys(out)).toHaveLength(0);
  });

  it('is deterministic: same restPenalties + seedBase returns identical map', () => {
    const penalties = { 1: 0.7, 2: 0.7, 3: 0.7 };
    const a = rollInjuries(penalties, 12345);
    const b = rollInjuries(penalties, 12345);
    expect(a).toEqual(b);
  });

  it('skips entries with value === 1.0 (defensive filter)', () => {
    const penalties = { 1: 1.0, 2: 0.7 };
    const out = rollInjuries(penalties, 99);
    // Unit 1 (fully rested — shouldn't have been in the map) not present
    expect(out[1]).toBeUndefined();
    // Unit 2 (under-rested) got rolled
    expect(typeof out[2]).toBe('boolean');
  });

  it('injury rate is roughly INJURY_CHANCE (0.25) across 100 seeds', () => {
    // Roll one under-rested unit against 100 different seeds
    let injuredCount = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const out = rollInjuries({ 1: 0.7 }, seed * 1_000_213);
      if (out[1]) injuredCount++;
    }
    // With INJURY_CHANCE=0.25 and 100 rolls, expected ~25 with variance.
    // Wide tolerance to avoid flakiness: 10-40 (very generous).
    expect(injuredCount).toBeGreaterThan(10);
    expect(injuredCount).toBeLessThan(40);
  });

  it('two under-rested units roll independently', () => {
    // Across many seeds, confirm both (true, true), (true, false),
    // (false, true), (false, false) all occur at some point
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const out = rollInjuries({ 1: 0.7, 2: 0.7 }, seed);
      outcomes.add(`${out[1] ? 1 : 0},${out[2] ? 1 : 0}`);
    }
    // All four combinations should appear across 200 seeds
    expect(outcomes.has('0,0')).toBe(true);
    expect(outcomes.has('1,1')).toBe(true);
    // At least one mixed outcome
    const mixed = outcomes.has('1,0') || outcomes.has('0,1');
    expect(mixed).toBe(true);
  });

  it('iterates keys in sorted numeric order (determinism guarantee)', () => {
    // If iteration order differed between engines, rollIndex would drift
    // and results would diverge. Provide keys in "wrong" order and confirm
    // the result matches a sorted-order fixture:
    const outFromMixed = rollInjuries({ 5: 0.7, 1: 0.7, 3: 0.7 }, 42);
    const outFromSorted = rollInjuries({ 1: 0.7, 3: 0.7, 5: 0.7 }, 42);
    expect(outFromMixed).toEqual(outFromSorted);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- tests/sim/injury.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `src/sim/injury.ts`**

```ts
import { createRng } from './rng';

export const INJURY_CHANCE = 0.25 as const;

/**
 * Roll injuries for each under-rested unit in restPenalties.
 * Iterates keys in sorted numeric order so results are deterministic
 * regardless of insertion order.
 *
 * Rules:
 * - Empty restPenalties → empty result.
 * - value === 1.0 entries are skipped (defensive — only sub-1.0 =
 *   under-rested = at risk).
 * - For each remaining entry, roll createRng(seedBase + rollIndex).next()
 *   < INJURY_CHANCE. rollIndex increments per entry in sorted order.
 */
export function rollInjuries(
  restPenalties: Readonly<Record<number, number>>,
  seedBase: number,
): Readonly<Record<number, boolean>> {
  const out: Record<number, boolean> = {};
  const ids = Object.keys(restPenalties)
    .map((k) => Number(k))
    .filter((id) => (restPenalties[id] ?? 1.0) < 1.0)
    .sort((a, b) => a - b);
  ids.forEach((id, rollIndex) => {
    const rng = createRng(seedBase + rollIndex);
    out[id] = rng.next() < INJURY_CHANCE;
  });
  return out;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/sim/injury.test.ts`
Expected: PASS all 6 tests.

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test`
Expected: ~303 previous + 6 new = ~309 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/sim/injury.ts tests/sim/injury.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): rollInjuries — deterministic per-unit injury roll

Adds INJURY_CHANCE = 0.25 and rollInjuries(restPenalties, seedBase):

- Iterates restPenalties keys in sorted numeric order (deterministic
  across engines) so rollIndex assignment is stable regardless of
  insertion order.
- Skips entries with value === 1.0 (defensive filter — fully rested
  units and Stimmed units are excluded by the caller from
  restPenalties, but this guard prevents accidents).
- For each remaining under-rested unit, seeds createRng(seedBase +
  rollIndex) and returns true iff next() < INJURY_CHANCE.

Pure module. No Math.random. No Date.now. Fully deterministic given
(restPenalties keys sorted, seedBase). The caller (colony store's
launchIncursion in Task 4) will use childSeed * INJURY_SUBSTREAM_PRIME
as seedBase — distinct from BREED/FAILSAFE/INCURSION substream primes.

Statistical test uses a wide tolerance (10-40 of 100 rolls) to avoid
flakiness while still catching a broken RNG.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: State — `rest.ts` constants + Unit shape extension + `decant()` refresh + `breed()` mints + persist v6 + ALL fixture updates

**Files:**
- Create: `src/state/rest.ts` — 8 constants
- Modify: `src/state/types.ts` — extend `Unit` with `restCurrent`, `injuredUntil`
- Modify: `src/state/colony.ts` — extend store with `stims`; `decant()` daily rest refresh + full-rest new units; `breed()` mints at full rest; persist bump to v6 with chained migrate; extend partialize
- Modify: `tests/state/colony.test.ts` — extend beforeEach with `stims: 0`; update every inline Unit fixture with `restCurrent: REST_MAX, injuredUntil: null`; add rest-refresh + fresh-unit-rest tests
- Modify: `tests/state/persist.test.ts` — extend beforeEach; update Unit fixtures; add v5→v6 migration + v1→v6 chained tests
- Modify: `tests/ui/colony.test.tsx` — extend beforeEach; update every inline Unit fixture
- Modify: `tests/ui/Incursion.test.tsx` — update the `unit()` helper (adds 2 fields); extend beforeEach
- Modify: `tests/ui/ParentSlot.test.tsx` — update the `fixture` Unit constant
- Modify: `tests/ui/{EmptyColony,DecantButton,HarvestIndicator,FailsafeIndicator,Breed,BreedButton,BreedIndicator,App,SerumBadge}.test.tsx` — extend beforeEach with `stims: 0` (no inline Unit fixtures in these files, just store resets)

**Interfaces produced:**
- `const REST_MAX = 100 as const`
- `const REST_DEPLOY_COST = 40 as const`
- `const UNDER_RESTED_THRESHOLD = 40 as const`
- `const UNDER_RESTED_PENALTY = 0.7 as const`
- `const INJURY_DURATION_MS = 60 * 60 * 1000`
- `const INJURY_SUBSTREAM_PRIME = 1_000_213 as const`
- `const STIM_COST_SERUM = 40 as const`
- (INJURY_CHANCE was created in `src/sim/injury.ts` Task 2 — do NOT duplicate here)
- `Unit` gains `readonly restCurrent: number` and `readonly injuredUntil: number | null` — both REQUIRED.
- Store gains `readonly stims: number` (persisted, backfilled to 0 by migration).
- `decant()` on day-rollover refreshes rest on ALL existing units.
- `decant()` and `breed()` mint new units at `restCurrent: REST_MAX, injuredUntil: null`.
- Persist `version: 6` with new chained branch.

**Global constraints for this task:**
- Storage key stays `morulium/colony/v1`. Do NOT rename.
- Chained `if`s in migrate. No `else if`.
- Unit fields ADD required — TS strict will fail compile if any inline fixture is missed. Grep pattern: `decantedAt:` appears in 5 test files (colony.test.ts:16, persist.test.ts:11, colony.test.tsx:12, Incursion.test.tsx:1 helper, ParentSlot.test.tsx:1 fixture) and once in `tests/sim/incursion.test.ts` (already updated in Task 1). This task updates the remaining 5 files.
- No `any`.
- Do NOT extend `launchIncursion` or add `buyStim` — those are Task 4.

- [ ] **Step 1: Create `src/state/rest.ts`**

```ts
// Constants for the M6b Rest + Injury + Stim mechanics.
// INJURY_CHANCE lives in src/sim/injury.ts (Task 2) because it's used
// inside the pure sim roll — do NOT duplicate here.
export const REST_MAX = 100 as const;
export const REST_DEPLOY_COST = 40 as const;
export const UNDER_RESTED_THRESHOLD = 40 as const;
export const UNDER_RESTED_PENALTY = 0.7 as const;
export const INJURY_DURATION_MS = 60 * 60 * 1000;   // 1 hour
export const INJURY_SUBSTREAM_PRIME = 1_000_213 as const;
export const STIM_COST_SERUM = 40 as const;
```

- [ ] **Step 2: Extend `src/state/types.ts`**

Replace the file with:

```ts
import type { Genome } from '../sim/types';

/**
 * A persisted Colony unit.
 *
 * Origin (pristine vs bred) is derived from `parentIds`:
 *   - `null` ⇒ pristine (Decanted / future Incursion drop / future Vat output)
 *   - `[a, b]` ⇒ bred; `wear` may carry per-locus degradation
 *
 * `wear` is a per-locus scalar map. Absent key ≡ 0 (never throws on lookup).
 *
 * M6b:
 * - `restCurrent`: 0..100, refreshed to REST_MAX on daily rollover
 *   inside decant(). Deducted by REST_DEPLOY_COST on Incursion launch.
 * - `injuredUntil`: Date.now() ms when the injury bench expires, or
 *   null when healthy. Set by launchIncursion when under-rested
 *   units roll injuries. Expires on its own timer — day-rollover
 *   does NOT reset it.
 */
export interface Unit {
  readonly id: number;
  readonly seed: number;
  readonly decantedAt: number;
  readonly genome: Genome;
  readonly generation: number;
  readonly parentIds: readonly [number, number] | null;
  readonly wear: Readonly<Record<string, number>>;
  readonly restCurrent: number;
  readonly injuredUntil: number | null;
}
```

- [ ] **Step 3: Modify `src/state/colony.ts` — add `stims`, refresh rest in decant, mint new units at full rest, migrate v6**

Add imports:

```ts
import { REST_MAX } from './rest';
```

Extend the `ColonyStore` interface:

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
  readonly serum: number;
  readonly stims: number;                          // NEW (Task 3; buyStim action lands in Task 4)

  decant: () => Unit;
  breed: (parentAId: number, parentBId: number) => Unit;
  launchIncursion: (frontId: FrontId, teamIds: readonly [number, number, number, number]) => IncursionResolution;
  dismissIncursion: () => void;
  clearHighlight: () => void;
}
```

Note: `launchIncursion` signature does NOT change yet — Task 4 adds the `stimAppliedIds` third param. `buyStim` action does NOT exist yet — also Task 4.

Extend initial state:

```ts
stims: 0,
```

Replace `decant()` — add rest refresh + new-unit rest fields:

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
    restCurrent: REST_MAX,
    injuredUntil: null,
  };

  // On day-rollover: refresh rest on all EXISTING units (injuredUntil is
  // NOT reset — injuries expire on their own timer).
  const refreshedUnits = dayRolledOver
    ? state.units.map((u) => ({ ...u, restCurrent: REST_MAX }))
    : state.units;

  set({
    units: [...refreshedUnits, unit],
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

Replace `breed()` — child mints at full rest, no gate on parent injury:

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
    restCurrent: REST_MAX,
    injuredUntil: null,
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

`launchIncursion` and `dismissIncursion` remain their current M5+M6a shape for Task 3 — Task 4 extends them.

Update the persist config — bump version to 6, add v6 branch, extend partialize:

```ts
{
  name: STORAGE_KEY,
  version: 6,
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
      type LegacyUnit = Omit<Unit, 'generation' | 'parentIds' | 'wear' | 'restCurrent' | 'injuredUntil'> & {
        generation?: number;
        parentIds?: readonly [number, number] | null;
        wear?: Readonly<Record<string, number>>;
        restCurrent?: number;
        injuredUntil?: number | null;
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
          restCurrent: u.restCurrent ?? REST_MAX,
          injuredUntil: u.injuredUntil ?? null,
        })),
      };
    }
    if (from < 4) {
      s = { ...s, fronts: FRESH_FRONTS };
    }
    if (from < 5) {
      s = { ...s, serum: SERUM_STARTING_BALANCE };
    }
    if (from < 6) {
      s = {
        ...s,
        stims: 0,
        units: s.units.map((u) => ({
          ...u,
          restCurrent: (u as Partial<Unit>).restCurrent ?? REST_MAX,
          injuredUntil: (u as Partial<Unit>).injuredUntil ?? null,
        })),
      };
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
    stims: state.stims,   // NEW
    // activeIncursion excluded (transient)
  }),
},
```

Note the `from < 3` branch grows the `LegacyUnit` alias to acknowledge the two new optional fields on the v2→v3 hop (backfilling to `REST_MAX` / `null`). The `from < 6` branch redundantly backfills for units that are already v3+ but pre-M6b — the `??` idempotency makes this safe.

- [ ] **Step 4: Update `tests/state/colony.test.ts`**

Add imports at the top:

```ts
import { REST_MAX } from '../../src/state/rest';
```

Replace the shared `beforeEach`:

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
    stims: 0,
  });
});
```

Update every inline Unit fixture — grep the file for `decantedAt:` (16 hits). Each must gain `restCurrent: REST_MAX, injuredUntil: null`. Example pattern:

```ts
// Before:
{ id: 1, seed: 1, decantedAt: 100, genome: rollGenome(createRng(101)),
  generation: 0, parentIds: null, wear: {} }

// After:
{ id: 1, seed: 1, decantedAt: 100, genome: rollGenome(createRng(101)),
  generation: 0, parentIds: null, wear: {},
  restCurrent: REST_MAX, injuredUntil: null }
```

Add these new tests at the end of the outer `describe('colony store', ...)` block:

```ts
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
```

- [ ] **Step 5: Update `tests/state/persist.test.ts`**

Add imports:

```ts
import { REST_MAX } from '../../src/state/rest';
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
    stims: 0,
  });
});
```

Update every inline Unit fixture (11 hits for `decantedAt:` — same pattern as colony.test.ts).

Update any existing version-output assertions from `=== 5` to `=== 6`.

Add these new tests:

```ts
it('M6b stims field persists across a rehydration cycle', () => {
  useColonyStore.setState({ stims: 5 });
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = JSON.parse(raw!);
  expect(parsed.state.stims).toBe(5);
  expect(parsed.version).toBe(6);
});

it('M6b restCurrent + injuredUntil persist per unit across rehydration', () => {
  const injuryTime = 1_800_000_000_000;
  useColonyStore.setState({
    units: [{
      id: 1, seed: 1, decantedAt: 100,
      genome: { loci: {} },
      generation: 0, parentIds: null, wear: {},
      restCurrent: 42, injuredUntil: injuryTime,
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
```

- [ ] **Step 6: Update `tests/ui/Incursion.test.tsx` — extend `unit()` helper**

Find the `unit()` helper at line ~13. Update:

```ts
function unit(id: number, seed = id): Unit {
  return {
    id, seed, decantedAt: 100 * id,
    genome: rollGenome(createRng(seed * 101)),
    generation: 0, parentIds: null, wear: {},
    restCurrent: 100, injuredUntil: null,  // M6b — literal 100 avoids state-layer import
  };
}
```

Extend the `resetStore` helper (or its inline `beforeEach`) with `stims: 0`.

- [ ] **Step 7: Update `tests/ui/colony.test.tsx`**

Add `import { REST_MAX } from '../../src/state/rest';`. Extend `beforeEach` with `stims: 0`. Update every inline Unit fixture (12 hits for `decantedAt:`) with the two new fields.

- [ ] **Step 8: Update `tests/ui/ParentSlot.test.tsx`**

Update the `fixture` constant to include the two new fields:

```ts
const fixture: Unit = {
  id: 7,
  seed: 7,
  decantedAt: 100,
  genome: dummyGenome,
  generation: 2,
  parentIds: [1, 2],
  wear: {},
  restCurrent: 100,        // NEW
  injuredUntil: null,      // NEW
};
```

- [ ] **Step 9: Update remaining UI test beforeEach hooks**

For each of the following files, add `stims: 0` to the `beforeEach` `setState` object. These files have no inline Unit fixtures (nothing to update beyond beforeEach):

- `tests/ui/EmptyColony.test.tsx`
- `tests/ui/DecantButton.test.tsx`
- `tests/ui/HarvestIndicator.test.tsx`
- `tests/ui/FailsafeIndicator.test.tsx`
- `tests/ui/Breed.test.tsx`
- `tests/ui/BreedButton.test.tsx`
- `tests/ui/BreedIndicator.test.tsx`
- `tests/ui/App.test.tsx`
- `tests/ui/SerumBadge.test.tsx`

Files without any store `setState` in `beforeEach` (do NOT touch): `tests/ui/FrontCard.test.tsx`, `tests/ui/IncursionBeat.test.tsx`, `tests/ui/IncursionTicker.test.tsx`.

- [ ] **Step 10: Run state tests**

Run: `npm test -- tests/state/`
Expected: all state tests pass (existing + 7 new colony tests + 4 new persist tests). TS-strict fails compile if any Unit fixture was missed — that's the safety net.

- [ ] **Step 11: Run UI tests**

Run: `npm test -- tests/ui/`
Expected: all existing UI tests pass with the extended fixtures/beforeEach.

- [ ] **Step 12: Full suite + typecheck**

Run: `npm test`
Expected: ~309 previous + 7 new colony + 4 new persist = ~320 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 13: Commit**

```bash
git add src/state/rest.ts src/state/types.ts src/state/colony.ts tests/state/colony.test.ts tests/state/persist.test.ts tests/ui/colony.test.tsx tests/ui/Incursion.test.tsx tests/ui/ParentSlot.test.tsx tests/ui/EmptyColony.test.tsx tests/ui/DecantButton.test.tsx tests/ui/HarvestIndicator.test.tsx tests/ui/FailsafeIndicator.test.tsx tests/ui/Breed.test.tsx tests/ui/BreedButton.test.tsx tests/ui/BreedIndicator.test.tsx tests/ui/App.test.tsx tests/ui/SerumBadge.test.tsx
git commit -m "$(cat <<'EOF'
feat(state): rest.ts constants + Unit rest fields + decant refresh + v6 migration

Adds src/state/rest.ts (7 constants; INJURY_CHANCE lives in
src/sim/injury.ts):
- REST_MAX = 100, REST_DEPLOY_COST = 40
- UNDER_RESTED_THRESHOLD = 40, UNDER_RESTED_PENALTY = 0.7
- INJURY_DURATION_MS = 60 * 60 * 1000 (1 hour)
- INJURY_SUBSTREAM_PRIME = 1_000_213
- STIM_COST_SERUM = 40

Extends Unit with two REQUIRED fields:
- restCurrent: number (0..100)
- injuredUntil: number | null (Date.now() ms or null)

Extends ColonyStore with one new persisted field:
- stims: number (buyStim action lands in Task 4)

decant() day-rollover branch now refreshes restCurrent on ALL
existing units to REST_MAX. injuredUntil is NOT reset — injuries
expire on their own timer. Piggybacks on the existing
harvestDayKey rollover check.

decant() and breed() mint new units at { restCurrent: REST_MAX,
injuredUntil: null }.

breed() does NOT gate on parent injury and does NOT consume parent
rest — breeding is orthogonal to combat rest.

Persist bumped to version: 6 with chained migrate:
- v2 → v3 branch's LegacyUnit alias grew to acknowledge the two
  new optional fields (backfilled if absent).
- New v5 → v6 branch: backfills unit fields to defaults, adds
  stims: 0 to the store.
- A v1 save cascades through all 5 branches in one pass.

Storage key stays 'morulium/colony/v1'.

Every UI test beforeEach updated to reset stims. Every inline Unit
fixture across state + UI tests gained restCurrent + injuredUntil.
TS strict enforces at compile time — this is the M4-style big
fixture task returning for M6b.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: State — `launchIncursion()` rest/injury/Stim + new `buyStim()` action

**Files:**
- Modify: `src/state/colony.ts` — extend `launchIncursion` signature + logic; add `buyStim` action
- Modify: `tests/state/colony.test.ts` — add ~15 new tests for Incursion rest/injury/Stim + buyStim

**Interfaces produced:**
- `launchIncursion(frontId, teamIds, stimAppliedIds?): IncursionResolution` — trailing `stimAppliedIds: readonly number[] = []`.
- `buyStim(): void` — throws on insufficient serum; deducts 40 SR + adds 1 stim.

**Global constraints for this task:**
- launchIncursion guard order (fixed): existing guards → **injured team member** → **stim-not-in-team** → **insufficient Stims** → compute.
- restPenalties includes ONLY under-rested (< 40) AND non-Stimmed units. Fully-rested units → no entry. Stimmed under-rested → no entry.
- `childSeed = state.nextId` at launch (unique per Incursion, deterministic).
- Injury deterministic via `rollInjuries(restPenalties, childSeed * INJURY_SUBSTREAM_PRIME)`.
- On success: rest deducted + injuries applied + Stims deducted + resolution stored, all in one atomic `set()`.
- Rest floors at 0 (`Math.max(0, u.restCurrent - REST_DEPLOY_COST)`).
- `launchIncursion` does NOT touch `serum`, `droughtCount`, `harvestsToday`, `breedsToday`.
- `buyStim()` throws when `serum < STIM_COST_SERUM`; does NOT touch any other field.
- No `any`.
- Do NOT touch UI components (Tasks 5–6).

- [ ] **Step 1: Modify `src/state/colony.ts` — add imports**

Add imports:

```ts
import {
  REST_DEPLOY_COST,
  UNDER_RESTED_THRESHOLD,
  UNDER_RESTED_PENALTY,
  INJURY_DURATION_MS,
  INJURY_SUBSTREAM_PRIME,
  STIM_COST_SERUM,
} from './rest';
import { rollInjuries } from '../sim/injury';
```

Extend the `ColonyStore` interface — update `launchIncursion` signature and add `buyStim`:

```ts
interface ColonyStore {
  // ... existing fields unchanged ...

  decant: () => Unit;
  breed: (parentAId: number, parentBId: number) => Unit;
  launchIncursion: (
    frontId: FrontId,
    teamIds: readonly [number, number, number, number],
    stimAppliedIds?: readonly number[],   // NEW optional param
  ) => IncursionResolution;
  dismissIncursion: () => void;
  buyStim: () => void;   // NEW action
  clearHighlight: () => void;
}
```

Replace `launchIncursion()`:

```ts
launchIncursion: (frontId, teamIds, stimAppliedIds = []) => {
  const state = get();
  const frontState = state.fronts[frontId];
  if (!frontState) throw new Error(`launchIncursion: unknown front ${frontId}`);
  if (frontState.captured) throw new Error(`launchIncursion: front ${frontId} already captured`);
  if (frontState.cooldownUntil !== null && frontState.cooldownUntil > Date.now()) {
    throw new Error(`launchIncursion: front ${frontId} on cooldown`);
  }
  if (teamIds.length !== TEAM_SIZE) {
    throw new Error(`launchIncursion: team must have exactly ${TEAM_SIZE} members`);
  }
  const unique = new Set(teamIds);
  if (unique.size !== TEAM_SIZE) {
    throw new Error('launchIncursion: team ids must be distinct');
  }
  const team: Unit[] = [];
  for (const id of teamIds) {
    const u = state.units.find((u) => u.id === id);
    if (!u) throw new Error(`launchIncursion: unit ${id} not found`);
    team.push(u);
  }

  const now = Date.now();
  const injuredMembers = team.filter((u) => u.injuredUntil !== null && u.injuredUntil > now);
  if (injuredMembers.length > 0) {
    throw new Error(`launchIncursion: units injured: ${injuredMembers.map((u) => u.id).join(', ')}`);
  }

  for (const id of stimAppliedIds) {
    if (!teamIds.includes(id)) {
      throw new Error(`launchIncursion: cannot apply Stim to non-team unit ${id}`);
    }
  }
  if (state.stims < stimAppliedIds.length) {
    throw new Error(`launchIncursion: need ${stimAppliedIds.length} Stim(s), have ${state.stims}`);
  }

  // Compute restPenalties: under-rested (< threshold) AND not Stimmed
  const restPenalties: Record<number, number> = {};
  for (const u of team) {
    const isUnderRested = u.restCurrent < UNDER_RESTED_THRESHOLD;
    const isStimmed = stimAppliedIds.includes(u.id);
    if (isUnderRested && !isStimmed) {
      restPenalties[u.id] = UNDER_RESTED_PENALTY;
    }
  }

  // Roll injuries for at-risk units (deterministic given nextId + sorted team)
  const childSeed = state.nextId;
  const injuryRolls = rollInjuries(restPenalties, childSeed * INJURY_SUBSTREAM_PRIME);

  const resolution = resolveIncursion(team, FRONTS[frontId], restPenalties);

  // Deduct rest + apply injuries + deduct stims in ONE atomic set()
  const teamIdSet = new Set(teamIds);
  const newUnits = state.units.map((u) => {
    if (!teamIdSet.has(u.id)) return u;
    const gotInjured = injuryRolls[u.id] === true;
    return {
      ...u,
      restCurrent: Math.max(0, u.restCurrent - REST_DEPLOY_COST),
      injuredUntil: gotInjured ? now + INJURY_DURATION_MS : u.injuredUntil,
    };
  });

  set({
    activeIncursion: resolution,
    units: newUnits,
    stims: state.stims - stimAppliedIds.length,
  });

  return resolution;
},
```

Add `buyStim`:

```ts
buyStim: () => {
  const state = get();
  if (state.serum < STIM_COST_SERUM) {
    throw new Error('buyStim: insufficient Serum');
  }
  set({
    serum: state.serum - STIM_COST_SERUM,
    stims: state.stims + 1,
  });
},
```

`dismissIncursion` remains unchanged.

- [ ] **Step 2: Add Incursion rest/injury/Stim tests to `tests/state/colony.test.ts`**

Add these tests inside the existing outer `describe('colony store', ...)` block:

```ts
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
```

Add imports at the top:
```ts
import {
  REST_DEPLOY_COST,
  UNDER_RESTED_THRESHOLD,
  UNDER_RESTED_PENALTY,
  INJURY_DURATION_MS,
  STIM_COST_SERUM,
} from '../../src/state/rest';
```

- [ ] **Step 3: Run colony tests**

Run: `npm test -- tests/state/colony.test.ts`
Expected: existing + 13 new tests pass.

- [ ] **Step 4: Full suite + typecheck**

Run: `npm test`
Expected: ~320 previous + 13 new = ~333 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/state/colony.ts tests/state/colony.test.ts
git commit -m "$(cat <<'EOF'
feat(state): launchIncursion rest/injury/Stim + buyStim action

Extends launchIncursion signature with optional 3rd arg
stimAppliedIds: readonly number[] = []. New guard order:
  unknown front → captured → cooldown → team size → distinct ids
  → missing units → injured team member → stim-not-in-team
  → insufficient Stims → compute

Under-rested (restCurrent < 40) AND non-Stimmed team members
land in restPenalties: Record<unitId, 0.7> and get an injury
roll via rollInjuries(restPenalties, nextId * INJURY_SUBSTREAM_PRIME).

Atomic set() at launch commits:
- rest deduction on every team member (floored at 0)
- injury bench (now + INJURY_DURATION_MS) on injured under-rested units
- Stim deduction (state.stims - stimAppliedIds.length)
- resolution stored in activeIncursion (unchanged from M5)

Fully-rested units and Stimmed under-rested units never appear
in restPenalties → never get injury-rolled → never get injured.

launchIncursion does NOT touch serum, droughtCount, harvestsToday,
breedsToday. Explicit tests guard this.

New buyStim() action: -40 SR, +1 stim. Throws on insufficient serum;
does NOT touch any other field.

dismissIncursion unchanged — rest/injury/Stim consequences fire
at launch, not dismiss.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: UI — SpecimenCard rest line + injured overlay + `restStateFor` helper + Colony/Breed picker wiring

**Files:**
- Modify: `src/ui/components/SpecimenCard.tsx` — accept optional `restState` prop, render rest/injury line
- Modify: `src/ui/styles.ts` — add `restLine`, `injuredLine`, `injuredCardOverlay` styles
- Modify: `src/ui/screens/Colony.tsx` — add 1s `now` clock; export `restStateFor(unit, now)` helper; pass `restState` prop
- Modify: `src/ui/screens/Breed.tsx` — add 1s `now` clock; pass `restState` prop to picker cards
- Modify: `tests/ui/SpecimenCard.test.tsx` (or `tests/ui/colony.test.tsx` if there's no dedicated SpecimenCard test) — extend with restState tests

**Interfaces produced:**
- `<SpecimenCard row={...} highlighted?={...} lineage?={...} restState?={{ restCurrent: number; injuredUntil: number | null; now: number }} />` — new optional prop.
- `restStateFor(unit: Unit, now: number): { restCurrent, injuredUntil, now }` — exported from `Colony.tsx` (or a shared location; keeping it in Colony.tsx for now per the M4/M5 unitToRow pattern).
- New `data-testid="rest-line-{unitId}"` on the rest text span.
- New `data-injured="true"` attribute on the SpecimenCard container when the unit is currently injured (`injuredUntil !== null && injuredUntil > now`).

**Global constraints for this task:**
- No `any`.
- Test file uses `// @vitest-environment jsdom`.
- Injury countdown formatted `"Xm Ys"` (mirrors FrontCard).
- Injured overlay: `opacity: 0.55, cursor: 'not-allowed'` — composed by spreading `styles.injuredCardOverlay` over the base card style.
- SpecimenCard remains BACKWARDS-COMPATIBLE — `restState` prop is optional; existing tests that don't pass it must still render normally without the rest line or overlay.
- Do NOT touch Incursion.tsx (Task 6) or store logic.

- [ ] **Step 1: Add styles to `src/ui/styles.ts`**

Add inside the exported `styles` object:

```ts
restLine: {
  marginTop: 2,
  fontSize: 11,
  color: '#64748b',
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  textAlign: 'center',
} as CSSProperties,

injuredLine: {
  marginTop: 2,
  fontSize: 11,
  color: '#b45309',      // amber-700 — differentiates from healthy rest line
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  textAlign: 'center',
} as CSSProperties,

injuredCardOverlay: {
  opacity: 0.55,
  cursor: 'not-allowed',
} as CSSProperties,
```

- [ ] **Step 2: Write failing tests at `tests/ui/SpecimenCard.test.tsx`** (create if missing; extend if present)

If the file exists, append inside its outer describe. Otherwise, create it fresh:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SpecimenCard } from '../../src/ui/components/SpecimenCard';
import type { DemoRow } from '../../src/sim/__demo__';

const NOW = new Date(2026, 7, 4, 12, 0, 0).getTime();

const stubRow: DemoRow = {
  seed: 42,
  tier: 'baseline',
  score: 0,
  base: { PWR: 10, VIT: 10, SPD: 10, INT: 10, GUI: 10 },
  current: { PWR: 10, VIT: 10, SPD: 10, INT: 10, GUI: 10 },
  expressed: {
    head: 'head_plain',
    carapace: 'cara_bare',
    locomotion: 'loco_plain',
    appendage: 'app_none',
    eyes: 'eyes_plain',
    hide_pattern: 'hide_plain',
    aberration: 'ab_none',
  },
  palette: 'pal_ash',
};

describe('SpecimenCard rest / injury line', () => {
  afterEach(() => cleanup());

  it('does NOT render rest line when restState prop is absent (backwards compat)', () => {
    const { queryByTestId } = render(<SpecimenCard row={stubRow} />);
    expect(queryByTestId(/^rest-line-/)).toBeNull();
  });

  it('renders "Rest 75/100" when healthy', () => {
    const { getByTestId } = render(
      <SpecimenCard
        row={stubRow}
        restState={{ restCurrent: 75, injuredUntil: null, now: NOW }}
      />,
    );
    expect(getByTestId('rest-line-42').textContent).toBe('Rest 75/100');
    // Not injured — no attribute, no overlay
    const card = getByTestId('specimen-card');
    expect(card.getAttribute('data-injured')).toBeNull();
  });

  it('renders injured line + data-injured="true" when injuredUntil > now', () => {
    const injuredUntil = NOW + 7 * 60 * 1000 + 23 * 1000;  // 7m 23s
    const { getByTestId } = render(
      <SpecimenCard
        row={stubRow}
        restState={{ restCurrent: 10, injuredUntil, now: NOW }}
      />,
    );
    expect(getByTestId('rest-line-42').textContent).toContain('7m 23s');
    expect(getByTestId('rest-line-42').textContent).toContain('Injured');
    expect(getByTestId('specimen-card').getAttribute('data-injured')).toBe('true');
  });

  it('renders as healthy when injuredUntil <= now (expired)', () => {
    const { getByTestId } = render(
      <SpecimenCard
        row={stubRow}
        restState={{ restCurrent: 40, injuredUntil: NOW - 1000, now: NOW }}
      />,
    );
    // Expired injury reads as healthy
    expect(getByTestId('rest-line-42').textContent).toBe('Rest 40/100');
    expect(getByTestId('specimen-card').getAttribute('data-injured')).toBeNull();
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npm test -- tests/ui/SpecimenCard.test.tsx`
Expected: FAIL — `restState` prop doesn't exist yet.

- [ ] **Step 4: Modify `src/ui/components/SpecimenCard.tsx`**

Extend the Props interface and render logic:

```tsx
import type { ReactElement } from 'react';
import type { DemoRow } from '../../sim/__demo__';
import { Sprite } from '../../render/sprite';
import { resolvePalette } from '../../render/colors';
import { TierBadge } from './TierBadge';
import { styles } from '../styles';

interface Lineage {
  readonly generation: number;
  readonly parentIds: readonly [number, number] | null;
}

interface RestState {
  readonly restCurrent: number;
  readonly injuredUntil: number | null;
  readonly now: number;
}

interface Props {
  readonly row: DemoRow;
  readonly highlighted?: boolean;
  readonly lineage?: Lineage;
  readonly restState?: RestState;
}

function formatInjuryCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function SpecimenCard({ row, highlighted = false, lineage, restState }: Props): ReactElement {
  const colors = resolvePalette(row.palette);
  const bgTint = tintForCard(colors.base);
  const specimenId = `M-${String(row.seed).padStart(5, '0')}`;

  const isInjured = restState !== undefined
    && restState.injuredUntil !== null
    && restState.injuredUntil > restState.now;

  let cardStyle = highlighted
    ? { ...styles.card(bgTint), ...styles.highlightedCard }
    : styles.card(bgTint);
  if (isInjured) {
    cardStyle = { ...cardStyle, ...styles.injuredCardOverlay };
  }

  return (
    <div
      style={cardStyle}
      data-testid="specimen-card"
      data-highlighted={highlighted || undefined}
      data-unit-id={row.seed}
      data-injured={isInjured ? 'true' : undefined}
    >
      <TierBadge tier={row.tier} />
      <div style={styles.cardSprite}>
        <Sprite phenotype={row.expressed} palette={row.palette} />
      </div>
      <div style={styles.cardFooter}>{specimenId}</div>
      {lineage !== undefined && (
        <div style={styles.lineageLine} data-testid="lineage-line">
          {lineage.parentIds
            ? `Gen ${lineage.generation} · from #${lineage.parentIds[0]} × #${lineage.parentIds[1]}`
            : `Gen ${lineage.generation} · Harvested`}
        </div>
      )}
      {restState !== undefined && (
        <div
          style={isInjured ? styles.injuredLine : styles.restLine}
          data-testid={`rest-line-${row.seed}`}
        >
          {isInjured
            ? `Injured, ready in ${formatInjuryCountdown(restState.injuredUntil! - restState.now)}`
            : `Rest ${restState.restCurrent}/100`}
        </div>
      )}
    </div>
  );
}

function tintForCard(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(255 * 0.92 + c * 0.08);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}
```

- [ ] **Step 5: Run SpecimenCard tests to verify pass**

Run: `npm test -- tests/ui/SpecimenCard.test.tsx`
Expected: PASS all 4 tests.

- [ ] **Step 6: Modify `src/ui/screens/Colony.tsx` — add now clock + restStateFor + wire to cards**

Add these imports:

```ts
import { useState } from 'react';
```

(Adjust — `useState` is likely already imported for other reasons. If it's already there, just add the effect hook.)

Add a `now` clock in the component body (near the existing `useMemo` hooks):

```tsx
const [now, setNow] = useState(Date.now());
useEffect(() => {
  const t = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(t);
}, []);
```

Add and export the helper (outside the component, near `unitToRow`):

```tsx
export function restStateFor(unit: Unit, now: number) {
  return {
    restCurrent: unit.restCurrent,
    injuredUntil: unit.injuredUntil,
    now,
  };
}
```

Update the SpecimenCard mount in the grid render:

```tsx
<SpecimenCard
  key={unit.id}
  row={unitToRow(unit)}
  highlighted={unit.id === lastDecantedId}
  lineage={{ generation: unit.generation, parentIds: unit.parentIds }}
  restState={restStateFor(unit, now)}
/>
```

- [ ] **Step 7: Modify `src/ui/screens/Breed.tsx` — same pattern**

Add the same `now` clock (import `useState`/`useEffect` if needed).

Import `restStateFor` from `./Colony`:

```tsx
import { unitToRow, restStateFor } from './Colony';
```

Update the picker grid to pass `restState`:

```tsx
{sortedUnits.map((unit) => (
  <div key={unit.id} onClick={() => handleCardClick(unit)} style={{ cursor: 'pointer' }}>
    <SpecimenCard
      row={unitToRow(unit)}
      highlighted={unit.id === lastDecantedId}
      lineage={{ generation: unit.generation, parentIds: unit.parentIds }}
      restState={restStateFor(unit, now)}
    />
  </div>
))}
```

Rest does NOT gate breeding — the card still shows the info but click behavior is unchanged.

- [ ] **Step 8: Extend `tests/ui/colony.test.tsx` and `tests/ui/Breed.test.tsx`** — minor regression tests

In `tests/ui/colony.test.tsx`, add:

```ts
it('renders rest line on every card in Colony grid', () => {
  useColonyStore.setState({
    units: [1, 2].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
      restCurrent: 75, injuredUntil: null,
    })),
    nextId: 3,
  });
  const { getAllByTestId } = render(<Colony />);
  const restLines = getAllByTestId(/^rest-line-/);
  expect(restLines).toHaveLength(2);
  expect(restLines[0]!.textContent).toBe('Rest 75/100');
});
```

Add necessary imports (`rollGenome`, `createRng`) if not present.

In `tests/ui/Breed.test.tsx`, add:

```ts
it('renders rest line on every card in Breed picker (breeding orthogonal to rest)', () => {
  useColonyStore.setState({
    units: [1, 2].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
      restCurrent: 25, injuredUntil: null,   // even under-rested renders
    })),
    nextId: 3,
    serum: 200,
    breedsToday: 0, breedDayKey: todayLocalKey(),
  });
  const { getAllByTestId } = render(<Breed />);
  const restLines = getAllByTestId(/^rest-line-/);
  expect(restLines).toHaveLength(2);
});

it('injured units are still pickable in Breed picker (breeding ignores injury)', () => {
  const injuredUntil = Date.now() + 30 * 60 * 1000;
  useColonyStore.setState({
    units: [1, 2].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
      restCurrent: 100, injuredUntil,
    })),
    nextId: 3,
    serum: 200,
    breedsToday: 0, breedDayKey: todayLocalKey(),
  });
  const { getAllByTestId, getByTestId } = render(<Breed />);
  const cards = getAllByTestId('specimen-card');
  fireEvent.click(cards[0]!);
  // Slot A filled — click was accepted despite injury
  expect(getByTestId('parent-slot-a').textContent).not.toContain('Parent A');
});
```

- [ ] **Step 9: Run UI tests**

Run: `npm test -- tests/ui/`
Expected: existing + 4 (SpecimenCard) + 1 (colony) + 2 (Breed) = 7 new tests pass.

- [ ] **Step 10: Full suite + typecheck**

Run: `npm test`
Expected: ~333 previous + 7 new = ~340 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 11: Commit**

```bash
git add src/ui/components/SpecimenCard.tsx src/ui/styles.ts src/ui/screens/Colony.tsx src/ui/screens/Breed.tsx tests/ui/SpecimenCard.test.tsx tests/ui/colony.test.tsx tests/ui/Breed.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): SpecimenCard rest line + injured overlay + Colony/Breed wiring

Extends SpecimenCard with an optional restState prop:
{ restCurrent, injuredUntil, now }. When provided:
- Healthy: renders "Rest N/100" beneath the lineage line
  (muted monospace).
- Injured (injuredUntil > now): renders "Injured, ready in Xm Ys"
  in amber, sets data-injured="true", applies opacity 0.55 +
  cursor: not-allowed via styles.injuredCardOverlay.
- Expired injury (injuredUntil <= now): treated as healthy.

Prop is optional — absence means no rest line renders (backwards
compat with legacy call sites and tests).

Exports restStateFor(unit, now) helper from Colony.tsx (M4/M5
pattern with unitToRow — cross-screen import to Breed.tsx and
future Incursion.tsx in Task 6).

Colony and Breed screens each own a 1s now clock via useState +
setInterval; pass restStateFor(unit, now) to every SpecimenCard.

Breeding is orthogonal to rest and injury — injured units remain
pickable as parents in the Breed screen; only visual info surfaces.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: UI — `Incursion.tsx` Stim toggles + Buy Stim button + hints + launch payload + dev-server smoke

**Files:**
- Modify: `src/ui/screens/Incursion.tsx` — inject rest into picker cards; add per-slot Stim toggle; add Buy Stim button; extend hint stack; wire launch payload
- Modify: `src/ui/styles.ts` — add `stimShopRow`, `stimInventoryLabel`, `buyStimButton`, `buyStimButtonDisabled`, `slotStimToggle`, `slotStimToggleActive` styles
- Modify: `tests/ui/Incursion.test.tsx` — add tests for injured pickers, Stim toggles, Buy Stim button, launch payload, under-rested hint

**Interfaces produced:**
- Incursion picker cards: `restState` prop wired via `restStateFor(unit, now)`.
- Injured picker cards get `data-injured="true"`; click is a no-op.
- Team-slot Stim toggle: `data-testid="stim-toggle-{slotIndex}"` when slotted unit is under-rested. Click toggles unit id in a local `Set<number>`.
- `data-testid="buy-stim-button"` on the Buy Stim button.
- `data-testid="stim-inventory-label"` on the "Stims: N" text.
- Launch handler passes `[...stimApplied]` as 3rd arg to `useColonyStore.getState().launchIncursion`.

**Global constraints for this task:**
- No `any`.
- Test file uses `// @vitest-environment jsdom`.
- Injured units unpickable — click on their picker card is a no-op.
- Under-rested picks are allowed (they may be Stimmed at confirm).
- Stim toggle appears ONLY on under-rested slot cards. Fully-rested slots do NOT show the toggle.
- Launch button stays ENABLED in all under-rested scenarios (deploy-with-risk is intentional). Only disabled when: missing front, incomplete team, non-distinct team, some picked unit injured (defensive), Stim count > available.
- Do NOT modify SpecimenCard, Colony, or Breed screens (Task 5's job).

- [ ] **Step 1: Add styles to `src/ui/styles.ts`**

Add inside the exported `styles` object:

```ts
stimShopRow: {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 0',
  marginBottom: 8,
} as CSSProperties,

stimInventoryLabel: {
  fontSize: 13,
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  color: '#475569',
} as CSSProperties,

buyStimButton: {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid #7c3aed',
  background: '#8b5cf6',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
} as CSSProperties,

buyStimButtonDisabled: {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  background: '#e2e8f0',
  color: '#64748b',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'not-allowed',
  fontFamily: 'inherit',
} as CSSProperties,

slotStimToggle: {
  position: 'absolute',
  bottom: 4,
  right: 4,
  padding: '2px 6px',
  borderRadius: 4,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#475569',
  fontSize: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
} as CSSProperties,

slotStimToggleActive: {
  position: 'absolute',
  bottom: 4,
  right: 4,
  padding: '2px 6px',
  borderRadius: 4,
  border: '1px solid #7c3aed',
  background: '#8b5cf6',
  color: '#ffffff',
  fontSize: 10,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
} as CSSProperties,
```

- [ ] **Step 2: Write failing tests at `tests/ui/Incursion.test.tsx`** (append inside existing outer describe)

Add these tests. First add necessary imports if not already present:

```ts
import { STIM_COST_SERUM, UNDER_RESTED_THRESHOLD } from '../../src/state/rest';
```

Then add:

```ts
it('injured picker cards get data-injured="true" and are unpickable', () => {
  const injuryTime = Date.now() + 30 * 60 * 1000;
  useColonyStore.setState({
    units: [
      { id: 1, seed: 1, decantedAt: 100,
        genome: rollGenome(createRng(101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: injuryTime },   // injured
      { id: 2, seed: 2, decantedAt: 200,
        genome: rollGenome(createRng(202)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null },
      { id: 3, seed: 3, decantedAt: 300,
        genome: rollGenome(createRng(303)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null },
      { id: 4, seed: 4, decantedAt: 400,
        genome: rollGenome(createRng(404)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null },
    ],
    nextId: 5,
  });
  const { getAllByTestId, getByTestId } = render(<Incursion />);
  const cards = getAllByTestId('specimen-card');
  // Newest-first sort → id 4 first
  const injuredCard = cards.find((c) => c.getAttribute('data-injured') === 'true');
  expect(injuredCard).toBeDefined();
  // Clicking the injured card is a no-op
  fireEvent.click(injuredCard!);
  expect(getByTestId('parent-slot-a').textContent).toContain('Parent A');   // still empty
});

it('under-rested slots show Stim toggle; fully-rested slots do not', () => {
  useColonyStore.setState({
    units: [
      { id: 1, seed: 1, decantedAt: 100,
        genome: rollGenome(createRng(101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 20, injuredUntil: null },    // under-rested
      { id: 2, seed: 2, decantedAt: 200,
        genome: rollGenome(createRng(202)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null },
      { id: 3, seed: 3, decantedAt: 300,
        genome: rollGenome(createRng(303)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null },
      { id: 4, seed: 4, decantedAt: 400,
        genome: rollGenome(createRng(404)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null },
    ],
    nextId: 5,
    stims: 3,
  });
  const { getAllByTestId, queryByTestId } = render(<Incursion />);
  const cards = getAllByTestId('specimen-card');
  // Click a card to fill slot A. Newest-first: id 4, 3, 2, 1 in that order.
  // The one with restCurrent=20 is id 1. Click it first — Stim toggle should appear.
  // Find the card by data-unit-id=1
  const unit1Card = cards.find((c) => c.getAttribute('data-unit-id') === '1');
  fireEvent.click(unit1Card!);
  // slot A now holds the under-rested unit → toggle should be visible
  expect(queryByTestId('stim-toggle-0')).not.toBeNull();
  // Now click a rested card into slot B (unit id 2)
  const unit2Card = cards.find((c) => c.getAttribute('data-unit-id') === '2');
  fireEvent.click(unit2Card!);
  // slot B has a fully-rested unit — no toggle for it
  expect(queryByTestId('stim-toggle-1')).toBeNull();
});

it('Buy Stim button calls buyStim; disables when serum < STIM_COST_SERUM', () => {
  useColonyStore.setState({
    units: [1, 2, 3, 4].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
      restCurrent: 100, injuredUntil: null,
    })),
    nextId: 5,
    serum: 200,
    stims: 0,
  });
  const { getByTestId } = render(<Incursion />);
  const buyBtn = getByTestId('buy-stim-button');
  expect(buyBtn.getAttribute('data-disabled')).toBeNull();
  fireEvent.click(buyBtn);
  expect(useColonyStore.getState().serum).toBe(200 - STIM_COST_SERUM);
  expect(useColonyStore.getState().stims).toBe(1);
});

it('Buy Stim button disables when serum insufficient', () => {
  useColonyStore.setState({
    units: [1, 2, 3, 4].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
      restCurrent: 100, injuredUntil: null,
    })),
    nextId: 5,
    serum: STIM_COST_SERUM - 1,
    stims: 0,
  });
  const onClick = vi.fn();
  const { getByTestId } = render(<Incursion />);
  const buyBtn = getByTestId('buy-stim-button');
  expect(buyBtn.getAttribute('data-disabled')).toBe('true');
  fireEvent.click(buyBtn);
  // Serum unchanged
  expect(useColonyStore.getState().serum).toBe(STIM_COST_SERUM - 1);
  expect(useColonyStore.getState().stims).toBe(0);
  void onClick;
});

it('Launch confirm passes stimAppliedIds as 3rd arg to launchIncursion', () => {
  useColonyStore.setState({
    units: [
      { id: 1, seed: 1, decantedAt: 100,
        genome: rollGenome(createRng(101)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 20, injuredUntil: null },    // under-rested
      { id: 2, seed: 2, decantedAt: 200,
        genome: rollGenome(createRng(202)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null },
      { id: 3, seed: 3, decantedAt: 300,
        genome: rollGenome(createRng(303)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null },
      { id: 4, seed: 4, decantedAt: 400,
        genome: rollGenome(createRng(404)),
        generation: 0, parentIds: null, wear: {},
        restCurrent: 100, injuredUntil: null },
    ],
    nextId: 5,
    stims: 1,
  });
  const { getByTestId, getAllByTestId } = render(<Incursion />);
  fireEvent.click(getByTestId('front-card-infrastructure'));
  const cards = getAllByTestId('specimen-card');
  // Click all 4 in newest-first order (4, 3, 2, 1) → slot A=4, B=3, C=2, D=1
  const sortedById = [...cards].sort((a, b) =>
    Number(b.getAttribute('data-unit-id')) - Number(a.getAttribute('data-unit-id')),
  );
  fireEvent.click(sortedById[0]!);   // id 4 → slot A
  fireEvent.click(sortedById[1]!);   // id 3 → slot B
  fireEvent.click(sortedById[2]!);   // id 2 → slot C
  fireEvent.click(sortedById[3]!);   // id 1 → slot D (under-rested)
  // slot D (index 3) holds under-rested unit — toggle its Stim
  fireEvent.click(getByTestId('stim-toggle-3'));
  // Launch
  fireEvent.click(getByTestId('launch-incursion-button'));

  const s = useColonyStore.getState();
  expect(s.activeIncursion).not.toBeNull();
  // Unit 1 was Stimmed — one stim consumed
  expect(s.stims).toBe(0);
  // Unit 1's rest deducted, but no injury (Stim covered it)
  expect(s.units.find((u) => u.id === 1)!.injuredUntil).toBeNull();
});

it('under-rested hint appears when picks are under-rested + insufficient Stims applied', () => {
  useColonyStore.setState({
    units: [1, 2, 3, 4].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
      restCurrent: 20, injuredUntil: null,   // all under-rested
    })),
    nextId: 5,
    stims: 0,
  });
  const { getByTestId, getAllByTestId, queryByText } = render(<Incursion />);
  fireEvent.click(getByTestId('front-card-infrastructure'));
  const cards = getAllByTestId('specimen-card');
  cards.forEach((c) => fireEvent.click(c));
  // 4 slots filled, 0 stims applied, 4 under-rested → hint should appear
  expect(queryByText(/still under-rested/i)).not.toBeNull();
});

it('stim inventory label reflects current stims count', () => {
  useColonyStore.setState({
    units: [1, 2, 3, 4].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
      restCurrent: 100, injuredUntil: null,
    })),
    nextId: 5,
    stims: 7,
  });
  const { getByTestId } = render(<Incursion />);
  expect(getByTestId('stim-inventory-label').textContent).toBe('Stims: 7');
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npm test -- tests/ui/Incursion.test.tsx`
Expected: existing tests pass, new tests FAIL (Stim UI not built).

- [ ] **Step 4: Modify `src/ui/screens/Incursion.tsx`**

Update the imports:

```tsx
import { restStateFor } from './Colony';
import { UNDER_RESTED_THRESHOLD, STIM_COST_SERUM } from '../../state/rest';
```

Inside the component, add selectors + local Stim state:

```tsx
const serum = useColonyStore((s) => s.serum);
const stims = useColonyStore((s) => s.stims);
const buyStim = useColonyStore((s) => s.buyStim);

const [stimApplied, setStimApplied] = useState<Set<number>>(new Set());
```

Extend `handleContinue` to reset the Stim set:

```tsx
function handleContinue(): void {
  dismissIncursion();
  setPhase('idle');
  setVisibleBeatCount(0);
  setSelectedFrontId(null);
  setTeamIds([null, null, null, null]);
  setStimApplied(new Set());   // NEW
}
```

Extend `handleCardClick` — reject injured units:

```tsx
function handleCardClick(u: Unit): void {
  if (phase !== 'idle') return;
  // NEW: reject injured units
  if (u.injuredUntil !== null && u.injuredUntil > now) return;
  const idx = teamIds.findIndex((id) => id === u.id);
  if (idx !== -1) {
    const next = [...teamIds]; next[idx] = null; setTeamIds(next);
    // Also clear any Stim toggle on this unit
    setStimApplied((prev) => {
      const nextSet = new Set(prev);
      nextSet.delete(u.id);
      return nextSet;
    });
    return;
  }
  const emptyIdx = teamIds.findIndex((id) => id === null);
  if (emptyIdx === -1) return;
  const next = [...teamIds]; next[emptyIdx] = u.id; setTeamIds(next);
}
```

Extend `clearSlot` to also unset Stim toggle:

```tsx
function clearSlot(i: number): void {
  if (phase !== 'idle') return;
  const clearedId = teamIds[i];
  const next = [...teamIds]; next[i] = null; setTeamIds(next);
  if (clearedId !== null) {
    setStimApplied((prev) => {
      const nextSet = new Set(prev);
      nextSet.delete(clearedId);
      return nextSet;
    });
  }
}
```

Add a helper for toggling Stim:

```tsx
function toggleStim(unitId: number): void {
  setStimApplied((prev) => {
    const nextSet = new Set(prev);
    if (nextSet.has(unitId)) nextSet.delete(unitId);
    else nextSet.add(unitId);
    return nextSet;
  });
}
```

Compute under-rested count for hints:

```tsx
const underRestedCount = teamIds.filter((id) => {
  if (id === null) return false;
  const u = units.find((u) => u.id === id);
  return u !== undefined && u.restCurrent < UNDER_RESTED_THRESHOLD && !stimApplied.has(id);
}).length;

const stimsRequired = stimApplied.size;
const stimsInsufficient = stimsRequired > stims;
const anyInjured = teamIds.some((id) => {
  if (id === null) return false;
  const u = units.find((u) => u.id === id);
  return u !== undefined && u.injuredUntil !== null && u.injuredUntil > now;
});

// Launch button disabled: existing (front + team + distinct) OR any injured OR stims insufficient
const canLaunch = phase === 'idle' && bothPickedComplete && distinctTeam
  && !anyInjured && !stimsInsufficient;
```

Update `handleLaunch` to pass Stim payload:

```tsx
function handleLaunch(): void {
  if (!canLaunch) return;
  const ids = teamIds as [number, number, number, number];
  launchIncursion(selectedFrontId!, ids, [...stimApplied]);
  setVisibleBeatCount(0);
  setPhase('resolving');
}
```

Add the Buy Stim row + team slot Stim toggles to the JSX. Insert this new section ABOVE the existing team picker row inside the `phase === 'idle'` block:

```tsx
<div style={styles.stimShopRow}>
  <span style={styles.stimInventoryLabel} data-testid="stim-inventory-label">
    Stims: {stims}
  </span>
  <button
    type="button"
    style={serum < STIM_COST_SERUM ? styles.buyStimButtonDisabled : styles.buyStimButton}
    onClick={() => { if (serum >= STIM_COST_SERUM) buyStim(); }}
    disabled={serum < STIM_COST_SERUM}
    data-testid="buy-stim-button"
    data-disabled={serum < STIM_COST_SERUM ? 'true' : undefined}
  >
    Buy Stim ({STIM_COST_SERUM} SR)
  </button>
</div>
```

Update the team-slot rendering inside the `incursionTeamRow` block. For each slot at index `i` with a unit `u` (non-null slot), if `u.restCurrent < UNDER_RESTED_THRESHOLD` render the Stim toggle:

```tsx
{u !== null && u.restCurrent < UNDER_RESTED_THRESHOLD && (
  <button
    type="button"
    style={stimApplied.has(u.id) ? styles.slotStimToggleActive : styles.slotStimToggle}
    onClick={(e) => { e.stopPropagation(); toggleStim(u.id); }}
    data-testid={`stim-toggle-${i}`}
  >
    {stimApplied.has(u.id) ? '✓ Stim' : '+ Stim'}
  </button>
)}
```

Extend the hint stack — add these hint conditionals AFTER the existing hints (from M5), inside the `phase === 'idle'` block:

```tsx
{anyInjured && (
  <div style={styles.incursionHint}>One of your picks is injured — swap them out.</div>
)}
{!anyInjured && underRestedCount > 0 && (
  <div style={styles.incursionHint}>
    {underRestedCount} unit(s) still under-rested. Apply Stims or accept the risk (25% injury chance each).
  </div>
)}
{stimsInsufficient && (
  <div style={styles.incursionHint}>
    Not enough Stims ({stims} available for {stimsRequired} toggled).
  </div>
)}
```

Wire `restStateFor` into the picker grid — update the SpecimenCard mount:

```tsx
{sortedUnits.map((unit) => (
  <div key={unit.id} onClick={() => handleCardClick(unit)} style={{ cursor: 'pointer' }}>
    <SpecimenCard
      row={unitToRow(unit)}
      highlighted={unit.id === lastDecantedId}
      lineage={{ generation: unit.generation, parentIds: unit.parentIds }}
      restState={restStateFor(unit, now)}
    />
  </div>
))}
```

- [ ] **Step 5: Run Incursion tests**

Run: `npm test -- tests/ui/Incursion.test.tsx`
Expected: existing + 7 new tests pass.

- [ ] **Step 6: Full suite + typecheck + build**

Run: `npm test`
Expected: ~340 previous + 7 new = ~347 green.

Run: `npm run typecheck`
Expected: clean.

Run: `npm run build`
Expected: bundle succeeds. Note the gzipped size — target < 72 KB (M6a was 61.40 KB; M6b adds rest UI + Stim controls, likely +5–7 KB).

- [ ] **Step 7: Local dev-server smoke check**

Run: `npm run dev` in the background. Wait for "Local: http://localhost:5173/" line (or higher port if 5173 is in use). Confirm bind. Kill the server.

Note in report: interactive verification deferred to controller. Expected behaviors to eyeball once the controller has access:

- Fresh app → Colony cards show "Rest 100/100" under lineage.
- Run an Incursion with 4 fresh units → cards drop to "Rest 60/100".
- Run a second Incursion with the same team → cards drop to "Rest 20/100" (under-rested).
- Attempt Launch → hint "4 unit(s) still under-rested..." appears; button stays enabled.
- Click Launch → some team members end up "Injured, ready in Xm Ys"; injured cards greyed out and unpickable in the next Incursion.
- Buy 4 Stims → SR drops by 160; "Stims: 4" shown.
- Fill team with under-rested picks + toggle Stims on all → hint clears; Launch proceeds with no injury.
- Advance clock a day + Decant → all units back to "Rest 100/100" (any short injuries expired on their own timer).
- Reload → rest, injuries, Stim inventory all persist.

- [ ] **Step 8: Commit**

```bash
git add src/ui/screens/Incursion.tsx src/ui/styles.ts tests/ui/Incursion.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): Incursion screen — Stim toggles + Buy Stim + rest hints + launch payload

Incursion screen picker cards now receive restState via
restStateFor(unit, now) — the 1s clock that drives front cooldowns
also drives injury countdowns on picker cards.

New behavior:
- Injured picker cards get data-injured="true" + overlay; clicks
  are no-ops (defensive; the picker guard also runs handleCardClick).
- Under-rested slot cards render a "+ Stim" toggle in the corner.
  Toggling adds/removes the unit id from local Set<number>
  stimApplied. Fully-rested slots don't show the toggle.
- Above the team picker row: "Stims: N" label + "Buy Stim (40 SR)"
  button. Button disables when serum < STIM_COST_SERUM; on click
  calls useColonyStore's buyStim() action.

New hints (added to the M5 stack):
- Any picked unit injured → "One of your picks is injured — swap
  them out." (also disables Launch defensively)
- Under-rested (non-Stimmed) picks exist → "K unit(s) still
  under-rested. Apply Stims or accept the risk (25% injury chance
  each)."
- More Stim toggles than available inventory → "Not enough Stims
  (K available for J toggled)." (also disables Launch)

Launch button stays ENABLED in all under-rested scenarios (deploy-
with-risk is intentional per spec). Only disabled when: missing
front, incomplete team, non-distinct team, any picked injured, or
stims insufficient.

handleLaunch passes [...stimApplied] as the 3rd arg to
launchIncursion. handleContinue resets stimApplied along with other
local state on Continue.

M6b closes: rest, injury, and Stim mechanics are now navigable
end-to-end. Anti-meta invariant #6 (Rest forces rotation) is
mechanically active.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage vs game spec §11:**
  - Rest is mandatory (deploy cost 40) → Task 4.
  - Under-rested = reduced effectiveness (0.7) + injury chance (25%) → Tasks 1, 2, 4.
  - Injury benches unit (1 hour) with no permanent loss → Task 4 (`injuredUntil` set; day-rollover does NOT reset).
  - Stim consumable overrides under-rested → Task 4.
  - Buy Stim UI → Task 6.
- **Spec coverage vs invariant #6:** REST_MAX / REST_DEPLOY_COST ratio + daily refresh + injury bench structurally enforces rotation.
- **Type consistency:** REST_MAX, REST_DEPLOY_COST, UNDER_RESTED_THRESHOLD, UNDER_RESTED_PENALTY, INJURY_CHANCE, INJURY_DURATION_MS, INJURY_SUBSTREAM_PRIME, STIM_COST_SERUM, restCurrent, injuredUntil, stims, stimAppliedIds, restPenalties, rollInjuries, buyStim, restStateFor — all defined once, consumed identically.
- **Task splitting rationale:**
  - T1 (sim/stats + sim/incursion propagation) and T2 (sim/injury) are pure sim additions with no cross-task deps beyond the constants Task 3 introduces. T1's makeUnit update includes forward-compatible restCurrent/injuredUntil fields so Task 3's type change doesn't break T1's tests.
  - T3 is the big shape-change task (Unit type + persist v6 + every fixture updated) — same shape as M4 Task 4.
  - T4 lands launchIncursion extension + buyStim. Isolated to state layer.
  - T5, T6 are UI-only. T5 wires SpecimenCard rest line into Colony + Breed. T6 wires Incursion controls.
- **Placeholders:** none. Every step has real code or real commands.
- **beforeEach hygiene:** 12 UI test files touched. TS strict enforces at compile time — this is the safety net.
- **Fixture hygiene:** 6 files with inline Unit constructions: colony.test.ts (16), persist.test.ts (11), colony.test.tsx (12), Incursion.test.tsx (1 helper), ParentSlot.test.tsx (1), sim/incursion.test.ts (1 helper, updated in Task 1). All updated in Task 3 (except sim/incursion.test.ts which Task 1 already covered).
- **Test count trajectory:** 297 → ~347 (~50 new tests).
- **Bundle target:** < 72 KB gzipped (M6a was 61.40).
- **Deferred (from spec §Deferred):** Injury duration scaling, Vivarium buildings (Barracks/Medbay → M7), hourly rest regen, rest cost variation by front, multiple injury types, Stim in Vivarium inventory panel, Incursion reward SR, unitToRow extraction, colony store slice split.
