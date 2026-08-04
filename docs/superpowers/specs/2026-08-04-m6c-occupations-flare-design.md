# Morulium — M6c Occupations + Flare Design (v0.1)

**Date:** 2026-08-04
**Working directory:** `/Users/cnote/projects/morulium/`
**Remote:** `https://github.com/nicojitters/morulium` (public)
**Live:** `https://morulium.com` (Vercel, auto-deploys from main)
**Prior milestone:** M6b Rest + Injury + Stim — merged. This spec covers **M6c: Occupations + Flare** — the third and final M6 slice (game spec §10). M6 (Serum + Rest/Injury/Stim + Occupations) is complete after this ships.

## Purpose

Give captured fronts weight. M5 shipped the Incursion → capture loop; M6a gave the player a currency; M6b introduced per-unit consequences. But once a front was captured it just sat there — a static "✓" — and Colony surplus stopped mattering as long as you had 4 team members to run Incursions.

M6c makes captured fronts an ongoing commitment. The player garrisons captured fronts with Colony units to generate passive Serum. Under-garrisoned fronts start a 30-minute flare timer and eventually un-capture. Capturing one front raises threshold requirements on the other fronts (radicalization / "conquest order authors difficulty" per game spec §10), so the sequence of captures matters and un-captures unwind the radicalization.

M6c ships when: winning an Incursion captures the front, which shows a `"Garrison: 0/2"` sub-line on its card; assigning 2 units to a garrison locks them out of Incursion team-picking and passively generates 10 SR/hour; capturing a second front adds a `"Hardened: +4"` warning to the third; removing garrisoned units below 1/2 triggers a 30-minute flare countdown that, if not resolved, un-captures the front and removes its hardening contribution to the others.

## Scope decomposition context

M6 was split into three slices during M6a brainstorming: **M6a Serum Economy** (merged), **M6b Rest + Injury + Stim** (merged), **M6c Occupations + Flare** (this spec — the final slice). M6c intentionally ships all four sub-mechanics (garrison + income + flare + radicalization) as one milestone — a "garrison + income only" intermediate stop with no flare/radicalization would deliver captured-fronts-that-just-pay-tribute-forever, breaking the "conquest order authors difficulty" theme.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | **All 4 mechanics in one M6c:** garrison assignment + passive SR income + under-garrison flare + capture-order radicalization. | Delivers game spec §10 in full for one region. Splitting would create awkward intermediate states. |
| Garrison shape | **Per-front `garrison: readonly number[]`** — array of unit ids stationed at each captured front. Target size 2. | Natural composition with existing per-front `FrontState`. Cross-front assignment prevented by walking all fronts on assign. |
| Garrison target size | **`GARRISON_TARGET = 2`** per front | 3 fronts × 2 units = 6 garrison slots total. With 4-unit Incursion cap, player needs 10+ Colony units to keep everything staffed comfortably. |
| Flare threshold | **`GARRISON_MIN = 1`** — flare timer starts when garrison drops below 1 | Losing all defenders triggers flare, not just dropping one. Gives the player breathing room. |
| Flare grace period | **`GARRISON_GRACE_MS = 30 * 60 * 1000`** (30 min) — front un-captures if garrison still below min after this window | 30 min matches the Incursion failure cooldown. Enough time for a returning player to react; too long to just neglect. |
| Flare cooldown | **`FLARE_COOLDOWN_MS = 30 * 60 * 1000`** — un-captured front cools down for 30 min before it can be re-fought | Same as failed-Incursion cooldown from M5 for consistency. |
| Passive income rate | **`GARRISON_INCOME_PER_UNIT_PER_HOUR = 5`** SR — 2-unit garrison earns 10 SR/hour | Predictable. A full 6-unit garrison (all 3 fronts held) earns 30 SR/hour — meaningful but not dominant (M6a daily faucet is 25/day; player still has to actively play). |
| Income accrual | **Computed on-demand from `(lastGarrisonTickAt, now, garrisonedCount)` at every store action** | No timer, no per-tick state. Pure `computeGarrisonIncome` helper. Fractional SR retained by NOT advancing `lastGarrisonTickAt` past what was actually credited. |
| Income floor | **`Math.floor` on income earned** — fractional SR accumulates by leaving `lastGarrisonTickAt` behind by the fraction. | Prevents "0-SR increment" store actions from advancing the tick past unaccrued time. Whole-hour-worth credited advances the timer by the corresponding whole-ms amount. |
| Radicalization model | **Additive per-region hardening** — `hardening: number` on each `FrontState`. Sum of `RADICALIZATION_BONUS` for every OTHER captured front. Applied uniformly across all required stats on the target front. | Simplest coherent math. Symmetric — capture cascades to hardening, un-capture cascades to unhardening. |
| Radicalization bonus | **`RADICALIZATION_BONUS = 4`** per required stat, per other captured front | ~18% of a base threshold-22 requirement. Meaningful but not devastating. Two other captures = +8 → notably harder but still winnable with a strong team. |
| Hardening application | **In `resolveIncursion` at compute time**: `effectiveThreshold = req.threshold + hardening`. Coverage uses `best.value / effectiveThreshold`. | Non-invasive extension of M5's coverage math. Default `hardening: 0` preserves legacy behavior at every legacy call site. |
| Hardening persistence | **Persisted on each `FrontState`** but always recomputed on capture/uncapture (`computeHardeningFor` walks other fronts). | Stored for cheap reads; computed for correctness on state change. |
| Region-conquered state | **All 3 fronts captured AND none flaring** | Flare-in-progress on any front disqualifies. Player must stabilize all three simultaneously. |
| Garrisoned unit rules | **Cannot deploy to Incursion; CAN breed; DO NOT deplete rest** | Garrison = defensive posture, orthogonal to breeding. Rest doesn't drain because they're stationed, not deployed. Prevents garrison being a hidden "unit black hole." |
| Injured units in garrison | **Injured units DO count toward garrison size** — swap them out yourself if you want fresh defenders | Simple accounting: `garrison.length` is the count regardless of injury. Injured-in-garrison still holds the front; player rotation is voluntary. |
| Unit cross-front assignment | **A unit can only be garrisoned at ONE front** — `assignToGarrison` walks all fronts and throws if the unit is already stationed anywhere | Prevents accidental double-assignment. Cross-front check is defensive; UI's picker overlay filters candidates first. |
| Garrison UI location | **Inline expandable sub-panel on each captured `FrontCard`** on the existing Incursion screen | No new nav tab. Player manages captures where they attempt them. Un-captured fronts stay in their current visual state. |
| Garrison-slot interaction | **Empty slot click → assignment overlay opens. Filled slot click → removes unit (calls `removeFromGarrison`).** | Direct-manipulation UX. Overlay dismisses on backdrop click. |
| Garrison assignment eligibility | **Not currently garrisoned anywhere + not currently injured + not currently in the local Incursion team picker state** | Overlay filters candidates by these three rules. Prevents most bad-state clicks; store throws defensively. |
| SpecimenCard garrison badge | **Optional `garrisonedAt?: FrontId | null` prop** — when set, renders `"Garrison: Infra/Mil/Guer"` badge (short label) next to the rest line. When null/absent, no badge (backwards compat). | Uniform info surface. Garrison status visible in Colony, Breed, and Incursion pickers. |
| Team-picker guard for garrisoned units | **Store throws + UI disables the pick** — mirrors injury handling from M6b | Belt-and-suspenders. `data-garrisoned="true"` on the card for tests + visual greyed overlay. |
| Cross-cutting concerns | **Two private helpers — `applyGarrisonTick(state, now)` and `checkFlareTimers(state, now)` — called at the START of every state-mutating action** (decant/breed/launchIncursion/dismissIncursion/buyStim/assignToGarrison/removeFromGarrison). Deltas returned merged into the action's own `set(...)` call. | Ensures income/flare state stays fresh regardless of which action fires next. No polling, no timers. |
| Persistence | **Bump `version: 7`, chain new `if (from < 7)` branch after existing v1→v6 branches** | Same convention. Storage key stays `morulium/colony/v1`. |
| v6 → v7 migration | Each `FrontState` backfilled with `garrison: [], flareStartedAt: null, hardening: 0`. Store gains `lastGarrisonTickAt: Date.now()` (NO retroactive income). | Fresh install of the mechanic — no back-crediting SR to existing players. |
| `activeIncursion` still transient | Excluded from `partialize`. | Unchanged from M5. |

## Anti-meta invariant check (game spec §14)

M6c reinforces two invariants and touches a third:

1. **Every gain has a cost** — reinforced: capturing a front now costs ongoing garrison capacity + radicalizes future captures.
2. **No master stat** — untouched.
3. **Abilities compete** — untouched.
4. **Missions demand different profiles** — reinforced: radicalization means the 2nd and 3rd captures need MORE than the 1st did. The player can't just repeat the same 4-unit team.
5. **Information is hidden** — radicalization bonuses are VISIBLE (`"Hardened: +4"`) — the player should be able to see how ordering affects their next fight. Only per-stat qualitative bands stay hidden (per M5).
6. **Rest forces rotation** — reinforced: garrisoned units are locked out of Incursion, so the player needs an even bigger active roster. M6b's daily refresh alone doesn't cover the demand once garrisons are staffed.
7. **Convergence is taxed** — untouched.
8. **Rarity ≠ power** — untouched.
9. **The tail is aberration-driven** — untouched.

Invariant #4 (Missions demand different profiles) previously relied only on front-specific stat profiles. M6c strengthens it by adding capture-order pressure — a player who dumped everything into one specialty gets punished when their remaining fronts harden.

## Data model

**`FrontState` shape after M6c** (extending M5):

```ts
export interface FrontState {
  // existing (M5):
  readonly captured: boolean;
  readonly cooldownUntil: number | null;

  // NEW in M6c:
  readonly garrison: readonly number[];
  readonly flareStartedAt: number | null;
  readonly hardening: number;
}
```

**Colony store shape after M6c** (extending M6b):

```ts
interface ColonyStore {
  // ... existing (M3a/M3b/M4/M5/M6a/M6b) ...

  // NEW in M6c (persisted):
  readonly lastGarrisonTickAt: number;

  // actions gain:
  assignToGarrison: (frontId: FrontId, unitId: number) => void;
  removeFromGarrison: (frontId: FrontId, unitId: number) => void;
  // launchIncursion signature unchanged; guards gain a garrisoned-unit check;
  // hardening flows to resolveIncursion.
  // dismissIncursion signature unchanged; recomputes hardening on capture.
}
```

## Sim modules

### `src/sim/incursion.ts` (extend — add hardening param)

`resolveIncursion` gains an optional 4th param `hardening: number = 0`. Inside the function, coverage math uses `req.threshold + hardening` in place of `req.threshold`:

```ts
export function resolveIncursion(
  team: readonly Unit[],
  front: FrontProfile,
  restPenalties: Readonly<Record<number, number>> = {},
  hardening: number = 0,
): IncursionResolution {
  // ... existing team size check + requiredStatsOrdered ...

  const bests = bestContributorPerStat(team, requiredStatsOrdered, restPenalties);

  const coverage: Partial<Record<Stat, number>> = {};
  const bestContributors: Partial<Record<Stat, number>> = {};
  for (const s of requiredStatsOrdered) {
    const req = front.requirements[s]!;
    const best = bests[s]!;
    const effectiveThreshold = req.threshold + hardening;
    if (effectiveThreshold <= 0) {
      // Defensive: shouldn't happen with RADICALIZATION_BONUS > 0 and non-negative base thresholds
      coverage[s] = best.value > 0 ? COVERAGE_CLIP : 0;
    } else {
      coverage[s] = Math.min(COVERAGE_CLIP, best.value / effectiveThreshold);
    }
    bestContributors[s] = best.unitId;
  }

  // ... rest of function unchanged (successP, outcome, beats) ...
}
```

Default `0` means every M1–M6b caller produces identical output — zero runtime regression. Test fixtures that construct their own resolutions can pass hardening explicitly.

Hardening applies uniformly across all required stats on the target front (no per-stat hardening — simpler math, matches the "the whole front got harder" mental model).

### No new sim module

Injury math and coverage math are unchanged. All new logic is state-layer helpers.

## State module additions

### `src/state/occupation.ts` (new — constants + pure helpers)

```ts
import type { FrontId } from '../sim/data/fronts';
import type { FrontState } from './incursion';

export const GARRISON_TARGET = 2 as const;
export const GARRISON_MIN = 1 as const;
export const GARRISON_INCOME_PER_UNIT_PER_HOUR = 5 as const;
export const GARRISON_GRACE_MS = 30 * 60 * 1000;   // 30 minutes
export const FLARE_COOLDOWN_MS = 30 * 60 * 1000;   // matches failed-Incursion cooldown from M5
export const RADICALIZATION_BONUS = 4 as const;

/**
 * Passive Serum income earned by garrisoned units since lastTickAt.
 * Floored at 0 (defensive against clock drift), integer via Math.floor.
 * Caller advances lastTickAt by exactly the whole-hour-worth credited
 * so fractional SR isn't lost across many small store actions.
 */
export function computeGarrisonIncome(
  garrisonedCount: number,
  lastTickAt: number,
  now: number,
): number {
  const msElapsed = Math.max(0, now - lastTickAt);
  const hoursElapsed = msElapsed / (60 * 60 * 1000);
  return Math.floor(garrisonedCount * GARRISON_INCOME_PER_UNIT_PER_HOUR * hoursElapsed);
}

/**
 * Sum of RADICALIZATION_BONUS for every OTHER front that is currently captured.
 * Self is excluded (a captured front doesn't harden itself).
 * Returns 0 if no other fronts are captured.
 */
export function computeHardeningFor(
  frontId: FrontId,
  fronts: Readonly<Record<FrontId, FrontState>>,
): number {
  let bonus = 0;
  for (const otherId of Object.keys(fronts) as FrontId[]) {
    if (otherId === frontId) continue;
    if (fronts[otherId].captured) bonus += RADICALIZATION_BONUS;
  }
  return bonus;
}
```

Both helpers are pure — no `Date.now`, no side effects. Caller (store) passes `now` explicitly.

**Design rationale for the income floor:** if a store action fires 5 seconds after the last tick, `msElapsed = 5000`, `hoursElapsed ≈ 0.00139`, income floor = 0. The action returns `{}` (no delta), leaving `lastGarrisonTickAt` unchanged. When enough time passes to earn at least 1 SR, the tick advances by exactly the whole-hour-worth credited so future ticks continue accumulating from where the credited time ended.

### `src/state/colony.ts` (extensions)

**Initial state addition:**

```ts
lastGarrisonTickAt: Date.now(),
```

**FrontState default (initial + migration + newly-captured-front) gains three new fields:**

```ts
// Initial FRESH_FRONTS map (in src/state/incursion.ts):
export const FRESH_FRONTS: Readonly<Record<FrontId, FrontState>> = {
  infrastructure: { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
  military:       { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
  guerrilla:      { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
};
```

**Two private helpers inside colony.ts:**

```ts
function applyGarrisonTick(state: ColonyStore, now: number): Partial<ColonyStore> {
  const garrisonedCount = (Object.keys(state.fronts) as FrontId[])
    .reduce((n, fid) => n + state.fronts[fid].garrison.length, 0);

  if (garrisonedCount === 0) return { lastGarrisonTickAt: now };

  const incomeEarned = computeGarrisonIncome(garrisonedCount, state.lastGarrisonTickAt, now);
  if (incomeEarned === 0) return {};   // fractional interval — leave lastTickAt alone

  const wholeHoursCredited = incomeEarned / (garrisonedCount * GARRISON_INCOME_PER_UNIT_PER_HOUR);
  const msCredited = wholeHoursCredited * (60 * 60 * 1000);
  return {
    serum: state.serum + incomeEarned,
    lastGarrisonTickAt: state.lastGarrisonTickAt + msCredited,
  };
}

function checkFlareTimers(state: ColonyStore, now: number): Partial<ColonyStore> {
  const nextFronts = { ...state.fronts } as Record<FrontId, FrontState>;
  let anyUncaptured = false;
  for (const fid of Object.keys(nextFronts) as FrontId[]) {
    const front = nextFronts[fid];
    if (!front.captured) continue;
    if (front.flareStartedAt === null) continue;
    if (front.flareStartedAt + GARRISON_GRACE_MS > now) continue;
    // Front un-captures
    nextFronts[fid] = {
      ...front,
      captured: false,
      cooldownUntil: now + FLARE_COOLDOWN_MS,
      garrison: [],
      flareStartedAt: null,
      // hardening will be recomputed below across all fronts
    };
    anyUncaptured = true;
  }
  if (!anyUncaptured) return {};
  // Recompute hardening on ALL fronts after cascading un-captures
  for (const fid of Object.keys(nextFronts) as FrontId[]) {
    nextFronts[fid] = { ...nextFronts[fid], hardening: computeHardeningFor(fid, nextFronts) };
  }
  return { fronts: nextFronts };
}
```

**Every existing state-mutating action** (`decant`, `breed`, `launchIncursion`, `dismissIncursion`, `buyStim`) starts by computing these two deltas and spreading them into its own `set(...)`:

```ts
someAction: (...) => {
  const state = get();
  const now = Date.now();
  const tickDelta = applyGarrisonTick(state, now);
  const flareDelta = checkFlareTimers({ ...state, ...tickDelta }, now);
  // ... action-specific logic reads from { ...state, ...tickDelta, ...flareDelta } ...
  set({ ...tickDelta, ...flareDelta, ...actionDelta });
},
```

Note the sequencing: tickDelta first (credits pending income), then flareDelta (with tickDelta already applied — flare check sees the fresh state). The action's own logic reads from `{ ...state, ...tickDelta, ...flareDelta }` so it operates on the fully-fresh state.

**Two new actions:**

```ts
assignToGarrison: (frontId: FrontId, unitId: number) => {
  const state = get();
  const now = Date.now();
  const tickDelta = applyGarrisonTick(state, now);
  const flareDelta = checkFlareTimers({ ...state, ...tickDelta }, now);
  const s = { ...state, ...tickDelta, ...flareDelta };

  const front = s.fronts[frontId];
  if (!front.captured) throw new Error(`assignToGarrison: front ${frontId} is not captured`);
  if (front.garrison.length >= GARRISON_TARGET) {
    throw new Error(`assignToGarrison: front ${frontId} at target size`);
  }
  if (front.garrison.includes(unitId)) {
    throw new Error(`assignToGarrison: unit ${unitId} already garrisoned here`);
  }
  for (const fid of Object.keys(s.fronts) as FrontId[]) {
    if (s.fronts[fid].garrison.includes(unitId)) {
      throw new Error(`assignToGarrison: unit ${unitId} already garrisoned at ${fid}`);
    }
  }
  const unit = s.units.find((u) => u.id === unitId);
  if (!unit) throw new Error(`assignToGarrison: unit ${unitId} not found`);

  const newGarrison = [...front.garrison, unitId];
  const newFrontState: FrontState = {
    ...front,
    garrison: newGarrison,
    flareStartedAt: newGarrison.length >= GARRISON_MIN ? null : front.flareStartedAt,
  };
  set({
    ...tickDelta,
    ...flareDelta,
    fronts: { ...s.fronts, [frontId]: newFrontState },
  });
},

removeFromGarrison: (frontId: FrontId, unitId: number) => {
  const state = get();
  const now = Date.now();
  const tickDelta = applyGarrisonTick(state, now);
  const flareDelta = checkFlareTimers({ ...state, ...tickDelta }, now);
  const s = { ...state, ...tickDelta, ...flareDelta };

  const front = s.fronts[frontId];
  if (!front.garrison.includes(unitId)) {
    throw new Error(`removeFromGarrison: unit ${unitId} not in front ${frontId} garrison`);
  }

  const newGarrison = front.garrison.filter((id) => id !== unitId);
  const newFrontState: FrontState = {
    ...front,
    garrison: newGarrison,
    flareStartedAt: (newGarrison.length < GARRISON_MIN && front.flareStartedAt === null)
      ? now
      : front.flareStartedAt,
  };
  set({
    ...tickDelta,
    ...flareDelta,
    fronts: { ...s.fronts, [frontId]: newFrontState },
  });
},
```

**`launchIncursion()` extended:** new garrisoned-team-member guard + hardening pass:

```ts
launchIncursion: (frontId, teamIds, stimAppliedIds = []) => {
  const state = get();
  const now = Date.now();
  const tickDelta = applyGarrisonTick(state, now);
  const flareDelta = checkFlareTimers({ ...state, ...tickDelta }, now);
  const s = { ...state, ...tickDelta, ...flareDelta };

  // ... existing guards: unknown front / captured / cooldown / team size / distinct / missing / injured / stim-not-in-team / insufficient Stims ...

  // NEW: reject garrisoned team members
  const garrisonedIds = new Set(
    (Object.keys(s.fronts) as FrontId[]).flatMap((fid) => s.fronts[fid].garrison),
  );
  const garrisonedPicks = teamIds.filter((id) => garrisonedIds.has(id));
  if (garrisonedPicks.length > 0) {
    throw new Error(`launchIncursion: units garrisoned: ${garrisonedPicks.join(', ')}`);
  }

  // ... existing restPenalties + injury roll ...

  // NEW: pass hardening (computed from current fronts state)
  const hardening = computeHardeningFor(frontId, s.fronts);
  const resolution = resolveIncursion(team, FRONTS[frontId], restPenalties, hardening);

  // ... existing rest deduction + injury commit + stim deduction ...

  set({
    ...tickDelta,
    ...flareDelta,
    activeIncursion: resolution,
    units: newUnits,
    stims: s.stims - stimAppliedIds.length,
  });
  return resolution;
},
```

Guard order (updated): existing 9 guards → **garrisoned team member** → compute.

**`dismissIncursion()` extended:** on any outcome, after mutating `captured`/`cooldownUntil`, recompute hardening across ALL fronts:

```ts
dismissIncursion: () => {
  const state = get();
  const r = state.activeIncursion;
  if (r === null) return;
  const now = Date.now();
  const tickDelta = applyGarrisonTick(state, now);
  const flareDelta = checkFlareTimers({ ...state, ...tickDelta }, now);
  const s = { ...state, ...tickDelta, ...flareDelta };

  const target: FrontState = { ...s.fronts[r.frontId] };
  const nextFronts = { ...s.fronts } as Record<FrontId, FrontState>;
  if (r.outcome === 'won') {
    nextFronts[r.frontId] = { ...target, captured: true, cooldownUntil: null };
  } else {
    nextFronts[r.frontId] = { ...target, cooldownUntil: now + FRONT_COOLDOWN_MS };
  }
  // Recompute hardening on ALL fronts after capture/failure cascades
  for (const fid of Object.keys(nextFronts) as FrontId[]) {
    nextFronts[fid] = { ...nextFronts[fid], hardening: computeHardeningFor(fid, nextFronts) };
  }
  set({ ...tickDelta, ...flareDelta, fronts: nextFronts, activeIncursion: null });
},
```

**Persist v7 migration** (chained after v1–v6 branches):

```ts
if (from < 7) {
  const legacyFronts = s.fronts as Record<FrontId, Partial<FrontState> & { captured: boolean; cooldownUntil: number | null }>;
  const nextFronts = { ...legacyFronts } as Record<FrontId, FrontState>;
  for (const fid of Object.keys(nextFronts) as FrontId[]) {
    nextFronts[fid] = {
      ...nextFronts[fid],
      garrison: nextFronts[fid].garrison ?? [],
      flareStartedAt: nextFronts[fid].flareStartedAt ?? null,
      hardening: nextFronts[fid].hardening ?? 0,
    };
  }
  s = { ...s, fronts: nextFronts, lastGarrisonTickAt: Date.now() };
}
```

Chained `if`s (not `else if`). Storage key stays `morulium/colony/v1`.

**`partialize` extended** to include `lastGarrisonTickAt`. `activeIncursion` still excluded.

**Loop isolation:** garrison actions don't touch `harvestsToday`/`breedsToday`/`droughtCount`. `applyGarrisonTick` only touches `serum` + `lastGarrisonTickAt`. `checkFlareTimers` only touches `fronts`.

## UI

### `src/ui/components/FrontCard.tsx` (extend)

Currently: 4 visual states (Available / Selected / Captured / Cooling down).
After M6c: captured fronts expand to show a garrison sub-panel; un-captured fronts show any hardening warning.

**Captured state additions:**
- `"Garrison: N/2"` sub-line beneath the `"Captured ✓"` status.
- Card click toggles a garrison sub-panel (accordion — new local component state in Incursion.tsx driving it, or lifted per-front expand state).
- **Garrison sub-panel:** 2 slot mini-elements. Empty slot → dashed border with `"Empty"` label; click opens the picker overlay. Filled slot → shows padded id (`M-00042`) + a small `×` button that calls `removeFromGarrison`.
- **Flare warning:** if `flareStartedAt !== null`, replace the `"Garrison: N/2"` sub-line with `"⚠ Flaring in Xm Ys"` amber warning. Countdown ticks via the same 1s `now` clock that drives front cooldowns.
- **Radicalization contribution (informational):** small line `"→ +4 threshold on other fronts"` beneath the garrison sub-line. Only rendered when the front is captured AND at least one other front is UN-captured (so the bonus is actually applying somewhere).

**Un-captured state additions:**
- If `hardening > 0`, render `"Hardened: +N"` amber note beneath the status line (Available or Cooling down). Player sees the difficulty penalty BEFORE launching.

**`data-testid` additions:**
- `front-card-garrison-{frontId}` — the sub-panel container.
- `front-card-garrison-slot-{frontId}-{i}` — each garrison slot.
- `front-card-garrison-slot-clear-{frontId}-{i}` — the × button on a filled slot.
- `front-card-flare-{frontId}` — the flare countdown span.
- `front-card-hardening-{frontId}` — the "Hardened: +N" warning span.

Style additions in `src/ui/styles.ts`:
- `frontCardGarrisonRow`, `frontCardGarrisonSlotEmpty`, `frontCardGarrisonSlotFilled`, `frontCardGarrisonSlotClear`, `frontCardFlareLine`, `frontCardHardeningLine`, `frontCardRadicalizationLine`.

### `src/ui/components/GarrisonPickerOverlay.tsx` (new)

Small overlay component that renders below the FrontCard when an empty garrison slot is clicked.

**Props:**
```ts
interface Props {
  readonly frontId: FrontId;
  readonly eligibleUnits: readonly Unit[];
  readonly onAssign: (unitId: number) => void;
  readonly onDismiss: () => void;
}
```

Renders a small compact list of eligible units — each row shows the padded id + tier + rest. Click a row → calls `onAssign(unitId)`, which invokes the store's `assignToGarrison(frontId, unitId)`. Backdrop click → `onDismiss()`.

**Eligibility filtering** (done by the caller, not the overlay):
- Not currently garrisoned anywhere.
- Not currently injured.
- Not currently in the local Incursion team-picker state.

**`data-testid`s:**
- `front-card-garrison-picker-{frontId}` — the overlay container.
- `front-card-garrison-picker-unit-{frontId}-{unitId}` — each eligible unit row.
- `front-card-garrison-picker-backdrop-{frontId}` — the dismiss backdrop.

Style additions in `src/ui/styles.ts`: `garrisonPickerOverlay`, `garrisonPickerRow`, `garrisonPickerBackdrop`.

### `src/ui/components/SpecimenCard.tsx` (extend)

Add optional `garrisonedAt?: FrontId | null` prop. When set to a `FrontId`, renders a small `"Garrison: {shortLabel}"` badge next to the rest line (short labels: `"Infra"`, `"Mil"`, `"Guer"`). When null or absent, no badge.

Same monospace muted style as the rest line. `data-garrisoned="true"` on the card container when garrisoned.

### `src/ui/screens/Colony.tsx` (extend)

Add a `garrisonedAtFor(unitId, fronts): FrontId | null` helper (exported alongside `unitToRow` and `restStateFor`). Colony's grid render passes `garrisonedAt={garrisonedAtFor(unit.id, fronts)}` to every SpecimenCard.

Requires a `fronts` selector added to the Colony screen (currently doesn't need one).

### `src/ui/screens/Breed.tsx` (extend)

Same `fronts` selector + `garrisonedAt` prop wiring. Garrisoned units remain PICKABLE for breeding (breeding orthogonal to garrison).

### `src/ui/screens/Incursion.tsx` (extend heavily)

1. **Fronts selector** already present (M5).
2. **Per-front expand state**: `const [expandedFrontId, setExpandedFrontId] = useState<FrontId | null>(null)` — tracks which captured front's garrison panel is open.
3. **Per-front picker-overlay state**: `const [pickerOpenFor, setPickerOpenFor] = useState<{ frontId: FrontId; slotIndex: number } | null>(null)`.
4. **FrontCard click behavior** (updated):
   - Un-captured Available → select for launch (existing).
   - Captured → toggle `expandedFrontId`.
   - Cooling down / captured-but-picker-open → click no-op.
5. **Garrison sub-panel** rendered below each captured FrontCard when `expandedFrontId === fid`.
6. **Empty slot click** → `setPickerOpenFor({ frontId: fid, slotIndex: i })`.
7. **Filled slot click** → `useColonyStore.getState().removeFromGarrison(fid, unitId)`.
8. **GarrisonPickerOverlay** rendered when `pickerOpenFor !== null`. Passes eligible units (filtered by the 3 rules), `onAssign` (calls store + closes overlay), `onDismiss` (closes overlay).
9. **Team-picker gate** (updated): clicking a garrisoned unit in the Colony picker is a no-op (mirrors injury handling). Cards get `data-garrisoned="true"` visual overlay.
10. **Region-conquered state** (updated): `allCaptured && !anyFlaring` — flare in progress disqualifies. Local computation from `fronts` state.
11. **Continue reset** (updated): `setExpandedFrontId(null)` + `setPickerOpenFor(null)` alongside other local state resets.

**Optional: SpecimenCard `garrisonedAt` wiring** in the Incursion picker grid (mirrors Colony/Breed).

**`data-testid` additions from Incursion screen:**
- `data-garrisoned="true"` on garrisoned picker cards.
- Reuses testids from FrontCard + GarrisonPickerOverlay.

## Testing plan

**Sim (`tests/sim/`):**

- `incursion.test.ts` (extend):
  - `resolveIncursion` without `hardening` arg: existing output identical (regression lock).
  - `resolveIncursion` with `hardening: 8`: coverage drops as `best.value / (threshold + 8)`; outcome may flip from won to failed at a threshold-close team.
  - `hardening: 0` explicit equals no-arg call.
  - Hardening applied to ALL required stats on the front (not just one).
  - Coverage clip still upper-bounded at COVERAGE_CLIP even with hardening — a team dominant enough still saturates.

**State (`tests/state/`):**

- `occupation.test.ts` (new):
  - Constants: `GARRISON_TARGET=2`, `GARRISON_MIN=1`, `GARRISON_INCOME_PER_UNIT_PER_HOUR=5`, `GARRISON_GRACE_MS=1800000`, `FLARE_COOLDOWN_MS=1800000`, `RADICALIZATION_BONUS=4`.
  - `computeGarrisonIncome(0, ...)` → 0.
  - `computeGarrisonIncome(2, now - 1h, now)` → 10.
  - `computeGarrisonIncome(2, now - 90min, now)` → 15.
  - `computeGarrisonIncome(2, now - 20min, now)` → 3.
  - `computeGarrisonIncome(2, now + 1000, now)` → 0 (clock drift → floor to 0).
  - `computeHardeningFor(fid, allUncaptured)` → 0.
  - `computeHardeningFor(fid, {fid captured, others uncaptured})` → 0 (self excluded).
  - `computeHardeningFor(fid, {other1 captured, other2 captured, fid uncaptured})` → 8 (2 × RADICALIZATION_BONUS).
  - `computeHardeningFor(fid, {other1 captured, other2 captured, fid captured})` → 8 (self still excluded even when captured).

- `colony.test.ts` (extend):
  - `assignToGarrison` adds unit id to `fronts[frontId].garrison`.
  - `assignToGarrison` throws when front is not captured.
  - `assignToGarrison` throws when garrison already at `GARRISON_TARGET`.
  - `assignToGarrison` throws when unit already garrisoned on the SAME front.
  - `assignToGarrison` throws when unit already garrisoned on ANOTHER front (cross-front check).
  - `assignToGarrison` throws when unit id doesn't exist.
  - `assignToGarrison` at threshold: adding a unit that brings garrison back to `>= GARRISON_MIN` clears `flareStartedAt`.
  - `removeFromGarrison` removes unit id from `fronts[frontId].garrison`.
  - `removeFromGarrison` throws when unit not in that front's garrison.
  - `removeFromGarrison` below threshold: sets `flareStartedAt = now` when garrison drops below `GARRISON_MIN` and no timer was running.
  - `removeFromGarrison` when flare timer already active: does NOT reset `flareStartedAt`.
  - Any store action credits pending garrison income (test with 2 garrisoned units, advance system time by 1 hour, call `decant()` — serum increases by 10).
  - Income floor semantics: two consecutive same-second actions don't accumulate extra SR (both see `msElapsed → floor to 0`).
  - Income tick advances `lastGarrisonTickAt` by exactly the whole-hour-worth credited (not by `now - lastTickAt` in full — preserves fractional accumulation).
  - `launchIncursion` throws when a picked team unit is garrisoned on ANY front.
  - `launchIncursion` passes hardening to resolveIncursion: capturing one front then attempting another shows a coverage drop consistent with +4 on that front's thresholds.
  - `dismissIncursion` on win: recomputes hardening on ALL fronts. Newly-captured front now hardens the other 2 by +4 each.
  - `dismissIncursion` on loss: hardening NOT changed (loss doesn't capture).
  - Flare timer check: elapsing past `GARRISON_GRACE_MS` with garrison still below min on next store action → front un-captures, `cooldownUntil = now + FLARE_COOLDOWN_MS`, `garrison: []`, `flareStartedAt: null`, hardening recomputed across ALL fronts (unhardening the previously-hardened remaining fronts).
  - Region-conquered state derivation (via a helper or computed inside Incursion screen tests): all 3 captured AND `flareStartedAt === null` on all 3 → conquered. Any flare in progress → NOT conquered.
  - `applyGarrisonTick` + `checkFlareTimers` do NOT touch `harvestsToday`/`breedsToday`/`droughtCount`.

- `persist.test.ts` (extend):
  - v6 → v7 migration: fronts backfill `garrison: [], flareStartedAt: null, hardening: 0`; store gains `lastGarrisonTickAt`.
  - v1 → v7 chained migration through all 7 branches lands every field.
  - `lastGarrisonTickAt`, `fronts[fid].garrison`, `fronts[fid].flareStartedAt`, `fronts[fid].hardening` all persist across a rehydration cycle.
  - `parsed.version === 7` after any current-store write.

**UI (`tests/ui/`):**

- `FrontCard.test.tsx` (extend):
  - Captured front renders `"Garrison: 0/2"` sub-line initially.
  - Captured front with 2 units renders `"Garrison: 2/2"`.
  - Captured front with garrison < GARRISON_MIN AND `flareStartedAt` set: renders `"Flaring in Xm Ys"` (`data-testid="front-card-flare-{frontId}"`).
  - Un-captured front with hardening > 0: renders `"Hardened: +N"` (`data-testid="front-card-hardening-{frontId}"`).
  - Captured front card click toggles the garrison sub-panel expand state (verified via testid presence/absence of sub-panel).
  - Un-captured front card click still selects for launch (regression from M5).

- `GarrisonPickerOverlay.test.tsx` (new):
  - Renders one row per eligible unit (`front-card-garrison-picker-unit-{frontId}-{unitId}`).
  - Row click calls `onAssign(unitId)`.
  - Backdrop click calls `onDismiss()`.

- `SpecimenCard.test.tsx` (extend):
  - `garrisonedAt` prop absent → no garrison badge (backwards compat).
  - `garrisonedAt: 'infrastructure'` → renders `"Garrison: Infra"` badge; `data-garrisoned="true"` on card.
  - `garrisonedAt: null` → no badge.

- `Incursion.test.tsx` (extend):
  - Garrisoned units in the team picker get `data-garrisoned="true"` and are unpickable.
  - Store throws when a garrisoned unit is launch-picked (defensive test).
  - Region-conquered state shows when all 3 captured AND none flaring.
  - Region-conquered state hidden when any front is flaring.
  - Empty garrison slot click opens the picker overlay.
  - Filled garrison slot click calls `removeFromGarrison`.
  - Picker overlay unit click calls `assignToGarrison` and closes the overlay.

- `Colony.test.tsx` + `Breed.test.tsx` (minor):
  - Colony grid shows garrison badge on garrisoned units.
  - Breed picker shows garrison badges (informational — still pickable).

**Expected count:** 348 → ~415 (~67 new tests).

**Dev-server smoke:**
- Fresh app → 3 fronts Available. No garrison sub-panels, no hardening warnings.
- Win Infrastructure → its card shows `"Captured ✓"` + `"Garrison: 0/2"`. Military and Guerrilla now show `"Hardened: +4"` beneath their Available status.
- Click Infra card → garrison sub-panel expands with 2 empty slots. Small `"→ +4 threshold on other fronts"` note beneath.
- Click empty slot 0 → picker overlay drops down listing eligible Colony units (excluding injured / already-garrisoned / in-current-team-picker). Click a unit → assigned; overlay closes; slot now shows `M-XXXXX`.
- Repeat for slot 1 → garrison now `2/2`. SR badge unchanged (fractional interval hasn't accumulated a whole SR yet).
- DevTools: advance system clock by ~1 hour. Trigger any action (Decant, Buy Stim, etc.). SR badge jumps by 10.
- Remove 1 garrisoned unit from Infra (drop to 1) → still at GARRISON_MIN, no flare. Remove the second (drop to 0) → flare timer starts. Front card sub-line replaced with `"⚠ Flaring in 30m 0s"`.
- DevTools: advance clock 31 minutes. Trigger any action. Front un-captures. Cooldown countdown appears. Military and Guerrilla lose their `"Hardened: +4"` warnings.
- Win a second front → third front shows `"Hardened: +4"`. Win the third → all captured. If none are flaring, "Region conquered ✓" state renders.
- Reload during any state → garrison arrays, flare timers, hardening, `lastGarrisonTickAt`, income timing all persist.

## Deferred

- **Region-conquered permanence** — after all 3 fronts captured with garrisons stable, some longer-term state? Not in scope. M6c leaves the region in the "conquered" state as long as the garrisons hold; if they lapse, the state disappears. Future milestone can add a "region locked" mechanic if desired.
- **Second region** — MVP §7 is one region; expansion is M7+.
- **Injured garrisoned units effect on income** — M6c uses simple `garrison.length` counting. A future tuning pass could reduce income from injured garrisoned units. Deferred.
- **Continuous UI income ticker** — M6c uses on-demand computation (real-time SR only updates on store actions). A visible per-second SR ticker is polish for a later pass.
- **Multiple hardening levels / non-additive hardening** — the additive model is the M6c baseline. Multiplicative / logarithmic / capped hardening are all future tuning options.
- **Cross-front hardening story flavor** — game spec §10 hints at authored per-pair effects ("Guerrilla hardens"). M6c uses symmetric additive hardening. Authored per-pair effects deferred.
- **`unitToRow` / `restStateFor` / `garrisonedAtFor` extraction to shared UI utility** — M4/M5/M6b tech debt. All three helpers still live in `Colony.tsx`. Deferred to a cleanup pass.
- **Colony store slice split** — same tech-debt story. Deferred.

## Self-review notes

- **Spec coverage vs game spec §10:** Region → fronts (M5 shipped 1 region, 3 fronts). Occupations = garrisoning held fronts for passive Serum → M6c garrison + income. Conquest order authors difficulty → M6c hardening. Understaff an Occupation → M6c flare. All §10 elements land.
- **Anti-meta invariant reinforcement:** #1 (every gain has a cost) reinforced by ongoing garrison demand + radicalization. #4 (missions demand different profiles) reinforced by capture-order hardening. #6 (rest forces rotation) reinforced by garrisoned units being locked out of Incursion.
- **Type consistency:** `GARRISON_TARGET`, `GARRISON_MIN`, `GARRISON_INCOME_PER_UNIT_PER_HOUR`, `GARRISON_GRACE_MS`, `FLARE_COOLDOWN_MS`, `RADICALIZATION_BONUS`, `garrison`, `flareStartedAt`, `hardening`, `lastGarrisonTickAt`, `computeGarrisonIncome`, `computeHardeningFor`, `applyGarrisonTick`, `checkFlareTimers`, `assignToGarrison`, `removeFromGarrison`, `garrisonedAtFor` — all defined once, consumed identically across sim/state/UI.
- **Compatibility with M6b:** Rest mechanics untouched. `restCurrent` and `injuredUntil` on Unit unchanged. `buyStim` untouched. Injury count doesn't affect garrison eligibility (garrisoned units can be injured — they still count toward garrison size per locked decision).
- **Compatibility with M6a:** `serum` field unchanged in shape — passive income adds to the same number field. Breed cost mechanic untouched.
- **Compatibility with M5:** `FrontState` extended with 3 optional-defaulted fields; capture/dismiss semantics preserved. `resolveIncursion` gains an optional 4th param with a default that reproduces legacy behavior.
- **Storage:** key `morulium/colony/v1` unchanged. v7 migration is chained additive.
- **Non-determinism budget:** `Date.now()` used in `applyGarrisonTick`, `checkFlareTimers`, `assignToGarrison`, `removeFromGarrison` — all state-layer, all fine. No `Math.random` anywhere.
- **Income accumulation edge case:** Between store actions, the player earns fractional SR. `Math.floor` returns 0 for sub-hour intervals, and `lastGarrisonTickAt` is only advanced by whole-hour-worth credited. Over many small actions, the fractional SR accumulates and eventually crosses the whole-hour threshold. This is the "no wasted income" property.
- **Radicalization symmetry:** capture → recompute hardening on all fronts (target front's hardening reflects OTHER captures; other fronts' hardening reflects new capture). Un-capture (via flare) → same recomputation (removes the newly-un-captured front from everyone else's bonus contribution).
- **RNG:** No new substream primes. Garrison/flare/income/hardening are all deterministic; no random rolls.
