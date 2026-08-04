# Morulium — M6b Rest + Injury + Stim Design (v0.1)

**Date:** 2026-08-04
**Working directory:** `/Users/cnote/projects/morulium/`
**Remote:** `https://github.com/nicojitters/morulium` (public)
**Live:** `https://morulium.com` (Vercel, auto-deploys from main)
**Prior milestone:** M6a Serum Economy — merged. This spec covers **M6b: Rest + Injury + Stim** — the second slice of M6 (game spec §11). M6c (Occupations + flare) remains a separate sub-milestone.

## Purpose

Give the Incursion loop teeth. M5 shipped a deterministic Incursion resolution, and M6a introduced Serum with a Breed sink. Neither made deploys expensive at the unit level — the same top 4 units could carry every front indefinitely.

M6b adds per-unit consequences: rest depletes with each deploy, refreshes daily, and going under-rested at launch multiplies that unit's stat contribution by 0.7 (materially degrading their coverage in the weighted geometric mean) AND rolls a 25% independent chance of an hour-long injury bench. The player can pay 40 SR per unit to apply a Stim, which negates both the penalty and the injury roll for that deploy.

M6b ships when: opening morulium.com shows `"Rest N/100"` beneath the lineage line on every specimen card; running two Incursions with the same team leaves those units at 20/100 rest, triggering under-rested hints on the third attempt; some percentage of under-rested deploys leave units injured with a countdown; buying and applying Stims reliably negates both effects; and the day-rollover Decant refreshes rest on all Colony units.

## Scope decomposition context

M6 was split into three slices during M6a brainstorming: **M6a Serum Economy** (shipped), **M6b Rest + Injury + Stim** (this spec), **M6c Occupations + flare** (deferred). M6b is intentionally shipped as one integrated milestone rather than sub-split — the injury/Stim half only makes sense once rest exists, and a hard-gated intermediate stop ("only fully rested units can deploy") felt like an awkward stopping point.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | **All 7 mechanics ship together:** per-unit rest state + rest depletion on deploy + rest regen + under-rested effectiveness penalty + injury roll + injury bench + Stim consumable. | Tightly coupled — under-rested consequences and Stim override both need rest to exist; injury only makes sense with under-rested; Stim only makes sense with injury/penalty. |
| Rest representation | **`readonly restCurrent: number` on Unit — range 0..100** | Numeric composes with wear + serum patterns already in the code. Supports partial rest states, natural bar rendering, easy tuning. |
| Rest max | **`REST_MAX = 100`** | Round number. Aligns with 0-100 percent mental model. |
| Rest regen | **Full daily refresh at day-rollover, piggybacking on `decant()`'s existing day-rollover branch** — every Unit's `restCurrent` resets to REST_MAX on first Decant of a new day | Matches M6a's Serum faucet pattern. Predictable daily cadence. No continuous timer / hourly regen complexity. |
| Rest deploy cost | **`REST_DEPLOY_COST = 40`** per unit per Incursion deploy | Rest 100 / cost 40 → 2 fully-rested deploys per unit per day, with 20 rest remaining (under-rested by design on the 3rd). Aligns with the 3-front / captures-per-day pacing. |
| Under-rested threshold | **`UNDER_RESTED_THRESHOLD = 40`** — deploy with `restCurrent < 40` triggers the under-rested state | Threshold equals deploy cost — the 3rd deploy same-day is naturally under-rested. Simple to reason about. |
| Under-rested penalty | **`UNDER_RESTED_PENALTY = 0.7`** — under-rested units' stats multiplied by 0.7 before best-contributor comparison | 30% degradation is meaningful but not devastating. Compounds naturally with wear multipliers. Under-rested elite units can still contribute — they're just not always the best contributor anymore. |
| Injury model | **Per under-rested unit, independent 25% chance at launch. Injury benches unit for 1 hour real-time.** | Game spec §11: "chance of injury" is per-unit exposure, not team-level. Simple, per-unit, deterministic given seed. 1-hour bench is long enough to feel like a real cost, short enough to recover within a single play session. |
| Injury chance | **`INJURY_CHANCE = 0.25`** | 25% per under-rested unit. Statistically an under-rested team of 4 has a ~68% chance at least one gets injured — enough sting to make the risk feel real. |
| Injury duration | **`INJURY_DURATION_MS = 60 * 60 * 1000`** (1 hour) | Fixed for M6b. Game spec §11 mentions duration scales with recklessness — deferred as `[CALIBRATING]` for a future tuning pass. |
| Injury representation | **`readonly injuredUntil: number | null` on Unit** — `Date.now()` timestamp when the injury bench expires; `null` when healthy | Symmetric with front `cooldownUntil`. Reuses the "compare to now" pattern already established for FrontCard countdowns. |
| Injury RNG | **Dedicated substream: `INJURY_SUBSTREAM_PRIME = 1_000_213`; seed = `childSeed * INJURY_SUBSTREAM_PRIME`; per-unit roll index appended for distinct sequences per team member** | Follows M4/M5 substream pattern (BREED = 1_000_033, FAILSAFE = 1_000_003, INCURSION = 1_000_099). Distinct prime; deterministic given (childSeed, sorted-under-rested-team-ids). `childSeed` = `state.nextId` at launch time (unique per Incursion). |
| Stim inventory | **`readonly stims: number` on ColonyStore** — count of unused Stims | Simple integer. Serialized in `partialize`. |
| Stim cost | **`STIM_COST_SERUM = 40`** — same as a Breed but slightly less than a rest deploy cost | Cheaper than losing an hour to injury (roughly). Cheap enough to actually use; expensive enough that stockpiling matters. |
| Stim application | **Per-unit toggle at launch** — player marks which team slots to Stim. Each Stim consumes 1 from `stims`. Applying a Stim to a fully-rested unit is allowed but wasteful (no effect). | Player agency: they choose who gets covered when Stims are scarce. |
| Stim effects | **Full override:** applying a Stim to an under-rested unit removes the 0.7 penalty AND removes them from the injury roll pool. Their stat contribution is treated as fully rested. | Simple mental model: "Stim makes this unit deploy as if rested." Justifies the price. |
| Buy Stim UI | **A "Buy Stim (40 SR)" button on the Incursion screen, above the team picker row.** Disables when `serum < STIM_COST_SERUM`. Current inventory count shown next to it: `"Stims: N"`. | Contextual — buy where you use. Avoids inflating the nav or introducing a Vivarium screen prematurely (M7). |
| Injured picker cards | **Greyed-out card + `"Injured, ready in Xm Ys"` overlay text. Unpickable — click is a no-op.** `data-injured="true"` for tests. Countdown ticks via the same `now` clock that drives front cooldowns. | Same visual language as captured/cooldown fronts. Player sees the injured unit and its timer without cluttering the roster. |
| Rest display | **`"Rest N/100"` line beneath the lineage line on every SpecimenCard.** When injured, replaced by `"Injured, ready in Xm Ys"`. Small, monospace, muted color. | Uniform info surface across Colony grid + Breed picker + Incursion picker. No new icons/bars. |
| Rest cost on Breed | **Zero.** Breeding does NOT consume rest and does NOT gate on injury. | Breed and Incursion are separate consumption axes. Breeding is a deliberate genetic act; rest is a combat-recovery concept. |
| Rest cost on Decant | **Zero.** Decanting a new specimen doesn't touch any existing unit's rest. | Same as above. |
| `launchIncursion` signature | **New optional 3rd arg: `stimAppliedIds: readonly number[] = []`** — subset of `teamIds` marked for Stim | Backwards-compatible: existing calls without Stim still work. Explicit param avoids hidden state. |
| `launchIncursion` guard order | **existing guards (unknown front → captured → cooldown → team size → distinct ids → missing units) → injury check → Stim-not-in-team → insufficient Stims → compute** | Injury check comes after existing team-composition guards because it needs `teamIds` validated. Stim validation follows because it references `teamIds`. |
| Under-rested + injured team | **Injured units are UNPICKABLE at all.** Under-rested units are pickable with risk. | Injury = binary bench (game spec §11 "essentially useless"). Under-rested = degraded, not disabled. |
| Fully-rested Stim | **Wasteful but allowed** — applying Stim to a fully-rested unit consumes 1 Stim with no benefit. UI SHOULD hide the Stim toggle for fully-rested slots. Store does not throw. | Simplest guard shape. UI enforces the reasonable path; store is defensive. |
| `dismissIncursion` | **Unchanged.** Rest/injury/Stim consequences fire at launch (immediate), not on dismiss. Only front captured/cooldown state waits for dismiss. | Rest deduction and injury roll are pre-computed at launch (like the beats) — the ticker is presentation only. |
| Persistence | **Bump `version: 6`, chain new `if (from < 6)` branch after existing v1→v5 branches** | Same convention. Storage key stays `morulium/colony/v1`. |
| v5 → v6 migration | Unit fields backfilled: `restCurrent: REST_MAX, injuredUntil: null` (existing players start fully rested and healthy). Store fields backfilled: `stims: 0` (start empty). | No free advantage, no penalty. |
| Anti-meta invariant #6 (Rest forces rotation) | **Structurally enforced by M6b.** Every deploy costs 40 rest per unit; daily refresh caps at 100; three deploys same-day forces at least one team member under-rested. This IS invariant #6 arriving. | Game spec §14 #6 explicitly names this mechanic. |

## Anti-meta invariant check (game spec §14)

M6b activates one previously-dormant invariant:

1. **Every gain has a cost** — reinforced: rest is a new cost axis on Incursion deploys.
2. **No master stat** — untouched.
3. **Abilities compete** — untouched.
4. **Missions demand different profiles** — untouched (still enforced by best-contributor + coverage-clip).
5. **Information is hidden** — Rest is a straightforward number (not hidden). Injury duration is visible (not hidden). Under-rested penalty happens under the ticker's qualitative feedback surface — the numeric 0.7 multiplier never surfaces to UI, only the ticker's qualitative band phrases.
6. **Rest forces rotation** — **NEWLY ACTIVATED.** Every deploy costs rest; three deploys/day = at least one under-rested; injury pulls units offline for an hour. Rotation is now mechanically incentivized.
7. **Convergence is taxed** — untouched (wear still respected via `computeCurrentStats(g, 20, wear, restPenalty)`).
8. **Rarity ≠ power** — untouched.
9. **The tail is aberration-driven** — untouched.

Invariant #6 was flagged as "M6+" in earlier specs; M6b delivers it.

## Data model

**Unit shape after M6b** (extending M4):

```ts
export interface Unit {
  // existing (M3a/M3b/M4):
  readonly id: number;
  readonly seed: number;
  readonly decantedAt: number;
  readonly genome: Genome;
  readonly generation: number;
  readonly parentIds: readonly [number, number] | null;
  readonly wear: Readonly<Record<string, number>>;

  // NEW in M6b:
  readonly restCurrent: number;                  // 0..100
  readonly injuredUntil: number | null;          // Date.now() ms or null
}
```

**Colony store shape after M6b** (extending M6a):

```ts
interface ColonyStore {
  // ... existing (M3a/M3b/M4/M5/M6a)

  // NEW in M6b (persisted):
  readonly stims: number;

  // actions gain:
  launchIncursion: (
    frontId: FrontId,
    teamIds: readonly [number, number, number, number],
    stimAppliedIds?: readonly number[],
  ) => IncursionResolution;
  buyStim: () => void;
}
```

## Sim modules

### `src/sim/stats.ts` (extend — add restPenalty param)

`computeCurrentStats` gains an optional trailing `restPenalty` arg:

```ts
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

Default `1.0` means every legacy caller (M1–M6a) produces identical output. The penalty is a straight scalar applied to the wear-shaved, level-scaled value — no interaction with growth affinity or wear-multiplier internals. Composes multiplicatively with wear: a wear=20 locus + restPenalty=0.7 gives `wearMult * 0.7 = 0.6 * 0.7 = 0.42` on that locus's stat contribution.

`computeBaseStats` and `computeGrowthAffinity` are UNCHANGED. Only the final assembly in `computeCurrentStats` sees the penalty.

### `src/sim/incursion.ts` (extend — propagate restPenalties)

Both `bestContributorPerStat` and `resolveIncursion` gain an optional `restPenalties` param:

```ts
export function bestContributorPerStat(
  team: readonly Unit[],
  requiredStats: readonly Stat[],
  restPenalties: Readonly<Record<number, number>> = {},
): Readonly<Partial<Record<Stat, BestContributor>>>;

export function resolveIncursion(
  team: readonly Unit[],
  front: FrontProfile,
  restPenalties: Readonly<Record<number, number>> = {},
): IncursionResolution;
```

Inside `bestContributorPerStat`, per-unit stats are computed with `computeCurrentStats(unit.genome, INCURSION_LEVEL, unit.wear, restPenalties[unit.id] ?? 1.0)`. Everything else — the max walk, tie-break, coverage clip, weighted geo-mean, band selection, beat generation — is UNCHANGED. The penalty flows through naturally.

`IncursionResolution` struct is unchanged — the penalty is folded into `coverage[s]` at compute time.

### `src/sim/injury.ts` (new)

```ts
import { createRng } from './rng';

export function rollInjuries(
  restPenalties: Readonly<Record<number, number>>,
  seedBase: number,
): Readonly<Record<number, boolean>>;
```

Iterates `Object.keys(restPenalties)` in **sorted numeric order** (deterministic across engines), skips entries with `value === 1.0` (defensive — only sub-1.0 = under-rested = at risk), and rolls `createRng(seedBase + rollIndex).next() < INJURY_CHANCE` per remaining unit. Returns a map of `unitId → injured?`.

Pure and deterministic. Fully-rested units and Stimmed units never appear in `restPenalties` (the caller filters them out), so they cannot be injured.

## State module additions

### `src/state/rest.ts` (new — constants)

```ts
export const REST_MAX = 100 as const;
export const REST_DEPLOY_COST = 40 as const;
export const UNDER_RESTED_THRESHOLD = 40 as const;
export const UNDER_RESTED_PENALTY = 0.7 as const;
export const INJURY_CHANCE = 0.25 as const;
export const INJURY_DURATION_MS = 60 * 60 * 1000;   // 1 hour
export const INJURY_SUBSTREAM_PRIME = 1_000_213 as const;
export const STIM_COST_SERUM = 40 as const;
```

Constants only. Follows the pattern of `src/state/harvest.ts`, `src/state/breed.ts`, `src/state/failsafe.ts`, `src/state/incursion.ts`, `src/state/serum.ts`.

### `src/state/colony.ts` (extensions)

**Initial state addition:**
```ts
stims: 0,
```

**Unit type updated in `src/state/types.ts`** — adds `restCurrent: number` and `injuredUntil: number | null`. All Unit fixtures across the test suite gain these two fields. TS strict enforces at compile time.

**`decant()` extended — daily rest refresh:**

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

Note the daily refresh only touches `restCurrent`. `injuredUntil` is NOT reset — injuries expire on their own timer, not on day-rollover.

**`breed()` extended — child mints at full rest:**

Add to the child Unit assembly:
```ts
restCurrent: REST_MAX,
injuredUntil: null,
```

Breeding does NOT consume rest from parents, does NOT check injury on parents, and does NOT gate on rest. Rest is orthogonal to breeding.

**`launchIncursion()` extended — the big one:**

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

  // NEW: injury check — no injured units on the team
  const now = Date.now();
  const injured = team.filter((u) => u.injuredUntil !== null && u.injuredUntil > now);
  if (injured.length > 0) {
    throw new Error(`launchIncursion: units injured: ${injured.map((u) => u.id).join(', ')}`);
  }

  // NEW: Stim validation
  for (const id of stimAppliedIds) {
    if (!teamIds.includes(id)) {
      throw new Error(`launchIncursion: cannot apply Stim to non-team unit ${id}`);
    }
  }
  if (state.stims < stimAppliedIds.length) {
    throw new Error(`launchIncursion: need ${stimAppliedIds.length} Stim(s), have ${state.stims}`);
  }

  // NEW: compute restPenalties for the resolution math
  const restPenalties: Record<number, number> = {};
  for (const u of team) {
    const isUnderRested = u.restCurrent < UNDER_RESTED_THRESHOLD;
    const isStimmed = stimAppliedIds.includes(u.id);
    if (isUnderRested && !isStimmed) {
      restPenalties[u.id] = UNDER_RESTED_PENALTY;
    }
  }

  // NEW: roll injuries for under-rested (non-stimmed) team members
  const childSeed = state.nextId;
  const injuryRolls = rollInjuries(restPenalties, childSeed * INJURY_SUBSTREAM_PRIME);

  const resolution = resolveIncursion(team, FRONTS[frontId], restPenalties);

  // Atomic set(): deduct rest, apply injuries, deduct Stims, store resolution
  const newUnits = state.units.map((u) => {
    if (!teamIds.includes(u.id)) return u;
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

**`buyStim()` — new action:**

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

**`dismissIncursion()` — no changes.** Only front state changes commit here; rest/injury/Stim already committed at launch.

**Persist v6 migration** (chained after v1→v5 branches):

```ts
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
```

Chained `if`s, not `else if`. A v1 save cascades through all six branches.

**`partialize` extended** to include `stims`. `activeIncursion` still excluded.

## UI

### `src/ui/components/SpecimenCard.tsx` (extend)

Add optional `restState?: { restCurrent: number; injuredUntil: number | null; now: number }` prop. When provided:

- Injured (`injuredUntil !== null && injuredUntil > now`): render `"Injured, ready in Xm Ys"` in muted color, apply `styles.injuredCardOverlay` (opacity 0.55, cursor: not-allowed), set `data-injured="true"`.
- Healthy: render `"Rest {restCurrent}/100"` in the same muted style used for the lineage line, one line below.

`unitToRow` in `Colony.tsx` gets a companion helper `restStateFor(unit, now)` that returns the prop object. Colony/Breed/Incursion pickers each pass a `now` clock (owned by the screen, ticking every 1000ms — same pattern as Incursion's front-cooldown clock).

Style additions in `src/ui/styles.ts`:
- `restLine`: same monospace + subtle color as `lineageLine`.
- `injuredLine`: same shape, different muted amber tone to distinguish.
- `injuredCardOverlay`: `opacity: 0.55, cursor: 'not-allowed'` (composed via spread).

### `src/ui/screens/Colony.tsx` (extend)

Add a 1s `now` clock via `useEffect` (mirrors Incursion). Pass `restStateFor(unit, now)` as the new `restState` prop to every `SpecimenCard`. No other Colony changes.

### `src/ui/screens/Breed.tsx` (extend)

Same 1s `now` clock. Pass `restState` to every picker `SpecimenCard`. Rest does NOT gate breeding — under-rested and even injured units can be picked as parents (breeding is orthogonal to combat rest).

### `src/ui/screens/Incursion.tsx` (extend heavily)

1. **`now` clock scope extended.** The existing 1s tick during idle phase now also drives injury countdowns on picker cards.

2. **Injured units unpickable.** `handleCardClick` returns early if `unit.injuredUntil !== null && unit.injuredUntil > now`. Card already visually shows disabled state via SpecimenCard overlay.

3. **Local Stim state.** New `useState`: `const [stimApplied, setStimApplied] = useState<Set<number>>(new Set())`. Reset on Continue like other local state.

4. **Per-slot Stim toggle.** For each team slot that holds an under-rested unit, render a small `[+ Stim]` toggle next to the × clear button. Fully-rested slots don't show it. Clicking toggles the unit id in `stimApplied`.

5. **Stim inventory display + Buy Stim button.** Above the team picker row:
```
Stims: 2   [Buy Stim (40 SR)]
```
The buy button:
- `data-testid="buy-stim-button"`
- Reads `serum` from the store; disables when `serum < STIM_COST_SERUM` (matches BreedButton pattern).
- On click, calls `useColonyStore.getState().buyStim()`.

6. **Under-rested launch hints.** Extend the existing hint stack:
   - Existing (from M5): "Pick a front and 4 specimens to launch." / "Fill all 4 team slots." / "Pick 4 different specimens."
   - NEW: If any team slot is injured (defensive; picker prevents this normally) → "One of your picks is injured — swap them out."
   - NEW: If under-rested picks exist AND `stimApplied.size < under-rested count` → "K unit(s) still under-rested. Apply Stims or accept the risk (25% injury chance each)."
   - NEW: If Stim toggles > available Stims → "Not enough Stims — buy more or reduce toggles."

7. **Launch button.** Stays enabled through all under-rested scenarios (deploy-with-risk is intended). Only disabled when: missing front, incomplete team, non-distinct team, some picked unit injured, or Stim count > available. Insufficient Serum still disables via M6a logic (breed cost check unrelated but same pattern).

8. **Confirm-launch payload.** `handleLaunch` calls `useColonyStore.getState().launchIncursion(frontId, teamIds, [...stimApplied])`.

9. **Ticker verdict flavor.** No changes. Under-rested penalty flows through `coverage[s]` and produces qualitatively worse ticker beats via `BAND_PHRASES` — the "crushed" phrase reads more naturally when a well-genome unit went in under-rested.

Style additions in `src/ui/styles.ts`:
- `stimShopRow`: `display: flex, gap: 12, alignItems: center, marginBottom: 8`.
- `stimInventoryLabel`: monospace, subtle.
- `buyStimButton`: violet (matches BreedButton).
- `buyStimButtonDisabled`: same slate as BreedButtonDisabled.
- `slotStimToggle`: small pill button, offset from the × clear.

### `data-testid` additions

- `rest-line-{unitId}` (on the rest line inside SpecimenCard)
- `data-injured="true"` (on SpecimenCard container when injured)
- `buy-stim-button` (Incursion screen)
- `stim-inventory-label` (Incursion screen)
- `stim-toggle-{slotIndex}` (per-slot toggle, appears only when slot's unit is under-rested)

## Testing plan

**Sim (`tests/sim/`):**

- `stats.test.ts` (extend):
  - `computeCurrentStats` without `restPenalty` arg: existing output identical (regression).
  - `computeCurrentStats` with `restPenalty=0.7`: all stats scaled by 0.7 vs `1.0` call.
  - `restPenalty=1.0` explicit equals no-arg call.
  - Restpenalty composes with wear (wear=20 + restPenalty=0.7 → total shave of `wearMultiplier(20) * 0.7 = 0.42`).

- `incursion.test.ts` (extend):
  - `resolveIncursion` without `restPenalties` arg: existing output identical (regression).
  - `resolveIncursion` with one under-rested unit at 0.7 penalty: coverage drops for stats that unit dominates.
  - `bestContributorPerStat` with restPenalties: a normally-dominant unit can be dethroned by a fully-rested runner-up.

- `injury.test.ts` (new):
  - Constants check (INJURY_CHANCE, INJURY_DURATION_MS, INJURY_SUBSTREAM_PRIME).
  - `rollInjuries` determinism: same `(restPenalties keys sorted, seedBase)` returns identical map.
  - `rollInjuries` with empty `restPenalties`: returns `{}`.
  - `rollInjuries` skips entries with `value === 1.0` (defensive filter for fully-rested; only under-rested = sub-1.0 gets rolled).
  - Statistical check: 100 seeds with one under-rested unit; count of injured is roughly 25%.
  - Two under-rested units: each rolls independently (both can get injured, only one, or neither).

**State (`tests/state/`):**

- `rest.test.ts` (new): 8 constants correct values.

- `colony.test.ts` (extend):
  - `decant()` on day-rollover refreshes rest on ALL existing units to REST_MAX.
  - `decant()` same-day does NOT refresh existing units' rest.
  - New units always spawn at `restCurrent: REST_MAX, injuredUntil: null`.
  - `decant()` does NOT reset `injuredUntil` on day-rollover (injuries expire on their own timer).
  - `breed()` mints children at full rest with `injuredUntil: null`.
  - `breed()` does NOT consume rest from parents.
  - `breed()` does NOT gate on parent injury (injured parents can breed).
  - `launchIncursion()` deducts `REST_DEPLOY_COST` from every team member's rest.
  - `launchIncursion()` rest floors at 0 after multiple deploys.
  - `launchIncursion()` throws when a picked unit's `injuredUntil > now`.
  - `launchIncursion()` throws when `stimAppliedIds` contains an id not in `teamIds`.
  - `launchIncursion()` throws when `stimAppliedIds.length > state.stims`.
  - `launchIncursion()` deducts `stimAppliedIds.length` from `state.stims` on success.
  - Under-rested (`restCurrent < 40`) unstimmed units get `restPenalty=0.7` in resolution.
  - Under-rested Stimmed units get NO penalty (excluded from `restPenalties`).
  - Fully-rested units always get NO penalty regardless of Stim application.
  - Injuries: rolled deterministically given `(state.nextId, sorted-under-rested-ids)`. Fully-rested units never injured. Stimmed under-rested units never injured.
  - Injury duration: exactly `INJURY_DURATION_MS` (1 hour) from launch time.
  - `launchIncursion()` does NOT touch `serum`, `droughtCount`, `harvestsToday`, `breedsToday`.
  - `buyStim()` throws when `serum < STIM_COST_SERUM`.
  - `buyStim()` deducts `STIM_COST_SERUM` from serum and adds 1 to stims.
  - `buyStim()` does NOT touch any other field.

- `persist.test.ts` (extend):
  - v5 → v6 migration: existing units backfill `restCurrent: REST_MAX, injuredUntil: null`; store gains `stims: 0`.
  - v1 → v6 chained migration lands all six branches.
  - `stims`, `restCurrent`, `injuredUntil` all persist across a rehydration cycle.
  - `parsed.version === 6` after any current-store write.

**UI (`tests/ui/`):**

- `SpecimenCard.test.tsx` (extend):
  - `restState` prop absent: no rest line (backwards compat).
  - Healthy state: renders `"Rest N/100"` with `data-testid="rest-line-{unitId}"`.
  - Injured state: renders `"Injured, ready in Xm Ys"`, sets `data-injured="true"`.
  - Injury expired (`injuredUntil <= now`): treats as healthy (rest line renders).

- `Incursion.test.tsx` (extend):
  - Injured units in picker are unpickable (`data-injured="true"`, click no-ops).
  - Under-rested units picker (rested but < 40) fills slots normally.
  - Stim toggle appears on under-rested slots, NOT on fully-rested slots.
  - Toggling Stim reflects in local state and doesn't consume until launch.
  - Buy Stim button disabled when serum < 40; click calls buyStim; count updates.
  - Under-rested hint appears when picks are under-rested + no Stim applied.
  - Launch confirm passes `[...stimApplied]` as 3rd arg to `launchIncursion`.

- `Colony.test.tsx` + `Breed.test.tsx` (extend, minor):
  - SpecimenCard rest line appears on every card in Colony grid.
  - SpecimenCard rest line appears on every card in Breed picker.
  - Injured units remain PICKABLE in Breed picker (breeding orthogonal to rest).

**Expected count:** 297 → ~353 (~56 new tests).

**beforeEach hygiene:** every UI test file whose beforeEach resets the store gets `stims: 0` added. Every inline Unit fixture across state + UI tests needs `restCurrent: REST_MAX, injuredUntil: null` appended (TS strict enforces at compile time — this is the M4-style "big fixture update" pattern back for M6b).

**Dev-server smoke:**
- Fresh app → Colony cards show `"Rest 100/100"`.
- Complete an Incursion with 4 fresh units → cards show `"Rest 60/100"`.
- Complete a second Incursion with same team → cards show `"Rest 20/100"` (under-rested).
- Attempt to Launch → under-rested hint appears; button stays enabled.
- Click Launch → some team members may end up with `"Injured, ready in Xm Ys"`; injured units are unpickable in the next Incursion attempt.
- Buy 4 Stims → SR drops by 160; `"Stims: 4"` shown; toggle Stims on under-rested picks → hint clears; deploy with no under-rested penalty and no injury.
- Advance system clock a day + Decant → all units refresh to `"Rest 100/100"`. Any injuries that were mid-timer expire on their own schedule (day-rollover doesn't clear them).
- Reload during any state → rest, injuries, and Stim inventory all persist.

## Deferred

- **Injury duration scaling with recklessness** — game spec §11 says "severity scales with recklessness." M6b uses a flat 1-hour bench. `[CALIBRATING]` — later tuning pass can compute duration as a function of how far under-rested (e.g., `INJURY_DURATION_MS * (1 + underByFraction)`).
- **Vivarium Barracks (rest capacity/speed) + Medbay (injury recovery)** — game spec §11 mentions these. MVP §M7 puts Vivarium buildings in M7. Deferred.
- **Continuous hourly rest regen** — considered, chose full daily refresh for M6b simplicity. May revisit in M7 if Vivarium introduces regen-speed upgrades.
- **Rest cost variation by front** — considered, chose flat 40 per deploy. M6c or M7 tuning could introduce it.
- **Injury types** — game spec §11 mentions "recovery period set by injury type." M6b uses one flat injury with `INJURY_DURATION_MS`. Multiple injury types (concussion, lame, etc.) can layer in later without breaking the `injuredUntil` field shape.
- **Stim in Colony/Breed inventory panels** — Stim buy stays Incursion-scoped for M6b. Vivarium inventory panel in M7 can hoist it.
- **Serum reward on Incursion win** — still deferred from M6a. M6c is the natural home (Occupations already touching the Incursion result).
- **`unitToRow` extraction to shared UI utility** — flagged as M4/M5 tech debt; still deferred.
- **Colony store slice split** — M5/M6a flagged this; still deferred.

## Self-review notes

- **Spec coverage vs game spec §11:** Rest is mandatory (deploy cost 40) → check. Under-rested deploy has reduced effectiveness (0.7 multiplier) + injury chance (25%) → check. Injury benches unit (1 hour) with no permanent loss → check. Stim gates under-rested deploy (spec §11 [OPEN] lean: gated) → check. Vivarium buildings (Barracks/Medbay) → deferred to M7. Severity scales with recklessness → deferred as `[CALIBRATING]` (M6b flat).
- **Spec coverage vs invariant #6 (Rest forces rotation):** Structurally enforced by REST_DEPLOY_COST + REST_MAX / cost ratio + daily refresh. Third same-day deploy is forced under-rested; injury pulls units offline. Rotation now mechanically incentivized.
- **Type consistency:** `REST_MAX`, `REST_DEPLOY_COST`, `UNDER_RESTED_THRESHOLD`, `UNDER_RESTED_PENALTY`, `INJURY_CHANCE`, `INJURY_DURATION_MS`, `INJURY_SUBSTREAM_PRIME`, `STIM_COST_SERUM`, `restCurrent`, `injuredUntil`, `stims`, `stimAppliedIds`, `restPenalties`, `rollInjuries` — all defined once, consumed identically across sim/state/UI.
- **Compatibility with M6a:** SerumBadge unchanged. Breed cost unchanged. `buyStim()` deducts serum (a new sink) following the same guard-then-deduct pattern as `breed()`.
- **Compatibility with M5:** Front captured/cooldown mechanics unchanged. `dismissIncursion` untouched. `activeIncursion` still transient. Two-phase commit (launch computes + sets activeIncursion; dismiss commits front state) still works — M6b's rest/injury/Stim changes happen at LAUNCH, not dismiss, but the front state semantics are preserved.
- **Compatibility with M4:** `computeCurrentStats(g, level, wear, restPenalty)` is a backwards-compatible signature extension. Every existing caller (Colony's `unitToRow`, `bestContributorPerStat`) picks up the default `1.0`.
- **Storage:** key `morulium/colony/v1` unchanged. v6 migration is chained additive. A legacy v1 save upgrades through all six branches.
- **Non-determinism budget:** `Date.now()` in `launchIncursion` (injury timestamp) and `dismissIncursion` (unchanged). No `Math.random` — injury RNG uses `createRng(seedBase + rollIndex)` from the deterministic PRNG.
- **Anti-meta invariants:** #6 (Rest forces rotation) newly activated. All others preserved.
- **RNG substream:** `INJURY_SUBSTREAM_PRIME = 1_000_213` — distinct from FAILSAFE (1_000_003), BREED (1_000_033), INCURSION (1_000_099). Fully isolated deterministic stream.
- **Unit shape change:** For the first time since M4, `Unit` gains required fields (`restCurrent`, `injuredUntil`). TS strict enforces at compile time — every inline Unit fixture across the test suite must be updated. This is the "big fixture update" task shape from M4.
