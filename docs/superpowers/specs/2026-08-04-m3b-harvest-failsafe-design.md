# Morulium — M3b Harvest + Failsafe Design (v0.1)

**Date:** 2026-08-04
**Working directory:** `/Users/cnote/projects/morulium/`
**Remote:** `https://github.com/nicojitters/morulium` (public)
**Live:** `https://morulium.com` (Vercel, auto-deploys from main)
**Prior milestone:** M3a Colony + Decant — merged. This spec covers **M3b: daily Harvest cadence + Failsafe pity** (the middle third of the original M3; the final third — M3c Tag/Sort/Cull — remains deferred).

## Purpose

Add the pace-control layer to the collector loop. M3a shipped unlimited on-demand Decant; M3b constrains it (3 per day, resets at local midnight) and adds a pity guarantee (Chimera-or-better after 50 dry Decants) so genuinely bad luck gets rescued.

M3b ships when: opening morulium.com after 3 Decants shows a disabled button with a live countdown to midnight; a fresh Colony that Decants a lot without seeing a Chimera+ eventually hits the guarantee at the 51st Decant; and the "Failsafe in N" indicator shows up in the header when the drought counter reaches 40.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | **M3b = Harvest + Failsafe.** M3c = Tag/Sort/Cull (deferred). | Curation actions are independent from cadence; splitting lets us playtest pace-of-play before adding filter/cull UX. |
| Daily Harvest limit | **3 per day** | Slow enough that each Decant matters; generous enough for a real session; fits the "morning batch" biotech-lab feel. |
| Reset semantics | **Local midnight** (calendar date rollover in user's timezone) | Simple, predictable; solo-play so cross-timezone "cheese" (11:59 + 12:00) doesn't matter. |
| Failsafe threshold | **50 dry Decants** | Mean drought before a natural Chimera+ is ~20; 50 rescues genuinely bad luck (~3% of playtests hit it). |
| Failsafe guarantee | **Chimera-or-better** | Meaningful rescue (Chimera is the 4% tier); Progenitor guarantee would be too rare to encounter. |
| Failsafe visibility | **Semi-visible: shown at last 10** (droughtCount ≥ 40) | Telegraphs the mechanic without spoiling every roll. Middle ground between industry-standard always-visible and pure silent. |
| Failsafe forced-roll implementation | **Rejection sampling on a substream seed** (`nextId * 1_000_003`) | Guarantees Chimera+ without wasting `nextId` positions or breaking "genome-is-a-roll" invariant. Fully deterministic given `(nextId, droughtCount)`. |
| Storage schema | **Keep key `morulium/colony/v1`**, use Zustand's numeric `version: 2` + `migrate` fn | Additive fields don't need a key rename; migrate function adds the three new fields on rehydration. |
| Failsafe applies to | **All Decants (currently only Harvest-gated Decants exist)** | Serum-cost "Extra Harvest" doesn't exist until M6; when it does, Failsafe applies uniformly. |
| DecantButton disabled UX | **Live countdown label: "Next Harvest in Xh Ym"** (recomputes every 60s) | Standard mobile-collector-game pattern; players always know when they can Decant again. |
| Persistent counters | **`harvestsToday`, `harvestDayKey`, `droughtCount` all persisted;** `lastDecantedId` still transient | Progress and pity must survive page reload; highlight is per-session ceremony. |

## Data model

**Store shape after M3b** (extending M3a):

```ts
interface ColonyStore {
  // existing (M3a):
  units: Unit[];
  nextId: number;
  lastDecantedId: number | null;    // still transient

  // NEW in M3b (persisted):
  harvestsToday: number;             // 0..3
  harvestDayKey: string;             // YYYY-MM-DD in local time
  droughtCount: number;              // Decants since last Chimera+
}
```

`Unit` shape stays unchanged from M3a (id/seed/decantedAt/genome).

**Persist configuration update:**

```ts
persist(store, {
  name: STORAGE_KEY,  // stays 'morulium/colony/v1'
  version: 2,          // bumped from 1
  migrate: (state, from) => {
    if (from < 2) {
      return {
        ...state,
        harvestsToday: 0,
        harvestDayKey: todayLocalKey(),
        droughtCount: 0,
      };
    }
    return state;
  },
  partialize: (s) => ({
    units: s.units,
    nextId: s.nextId,
    harvestsToday: s.harvestsToday,
    harvestDayKey: s.harvestDayKey,
    droughtCount: s.droughtCount,
  }),
})
```

Rehydration from a v1 (M3a) save runs the migrate function once, adds the three new fields, and re-saves as v2. Users who had an M3a Colony keep their units and start today with a fresh 3-Harvest allowance and 0-drought counter.

## Harvest mechanics

**`decant()` logic (extends M3a's implementation):**

```ts
decant: () => {
  const state = get();

  // 1. Day rollover check
  const today = todayLocalKey();
  const harvestsUsed = state.harvestDayKey === today ? state.harvestsToday : 0;
  if (harvestsUsed >= DAILY_HARVEST_LIMIT) {
    throw new Error('daily Harvest limit reached');
  }

  // 2. Roll the genome (Failsafe-aware)
  const id = state.nextId;
  const genome = state.droughtCount >= DROUGHT_THRESHOLD
    ? rollGenomeAtLeast(id * FAILSAFE_SUBSTREAM_PRIME, FAILSAFE_MIN_TIER)
    : rollGenome(createRng(id));

  // 3. Compute new drought (0 if Chimera+, else +1)
  const { tier } = computeRarity(genome);
  const newDrought = tierAtLeast(tier, 'chimera') ? 0 : state.droughtCount + 1;

  // 4. Assemble and commit
  const unit: Unit = { id, seed: id, decantedAt: Date.now(), genome };
  set({
    units: [...state.units, unit],
    nextId: id + 1,
    lastDecantedId: id,
    harvestsToday: harvestsUsed + 1,
    harvestDayKey: today,
    droughtCount: newDrought,
  });
  return unit;
}
```

**Constants** (in `src/state/failsafe.ts` and `src/state/harvest.ts`):

```ts
export const DAILY_HARVEST_LIMIT = 3;
export const DROUGHT_THRESHOLD = 50;
export const FAILSAFE_INDICATOR_APPEARS_AT = 40;
export const FAILSAFE_MIN_TIER: Tier = 'chimera';
export const FAILSAFE_SUBSTREAM_PRIME = 1_000_003;
```

**Failsafe substream:** `createRng(id * 1_000_003)` produces a completely different sequence from `createRng(id)`. The rejection loop:

```ts
export function rollGenomeAtLeast(subseed: number, minTier: Tier): Genome {
  let offset = 0;
  const MAX_ATTEMPTS = 1000;
  while (offset < MAX_ATTEMPTS) {
    const g = rollGenome(createRng(subseed + offset));
    if (tierAtLeast(computeRarity(g).tier, minTier)) return g;
    offset++;
  }
  throw new Error(`rollGenomeAtLeast: exceeded ${MAX_ATTEMPTS} attempts for tier ${minTier}`);
}
```

The `MAX_ATTEMPTS` guard is defense-in-depth. Expected iterations for `minTier=chimera` given current distribution (~5% Chimera+): ~20 rolls. `MAX_ATTEMPTS=1000` is 50× that — essentially unreachable unless the rarity distribution is catastrophically miscalibrated.

**Determinism guarantee:** given `(nextId, droughtCount)`, the returned genome is fully deterministic. A user could rewind localStorage and get exactly the same Decant outcome.

## UI mechanics

**Header row layout when the day is fresh (Harvest 3/3 available):**

```
Morulium
Your Colony — 47 specimens
Harvest 3/3                                           [ Decant a Morula (3/3) ]
● Baseline  ● Strain  ● Mutant  ● Chimera  ● Progenitor
```

**Header row after 3 Decants (limit hit):**

```
Morulium
Your Colony — 50 specimens
Next Harvest in 7h 23m                                [ Next Harvest in 7h 23m ]
● Baseline  ● Strain  ● Mutant  ● Chimera  ● Progenitor
```

Both indicator and button surface the same countdown text. Button is disabled/muted.

**Header row with active Failsafe indicator (droughtCount ≥ 40):**

```
Morulium
Your Colony — 47 specimens
Harvest 2/3 · ⚠️ Failsafe in 3                        [ Decant a Morula (2/3) ]
● Baseline  ● Strain  ● Mutant  ● Chimera  ● Progenitor
```

- Failsafe pill appears at `droughtCount === 40` ("Failsafe in 10") and decreases as more dry Decants accumulate: "Failsafe in 1" at `droughtCount === 49`.
- **Edge case at `droughtCount === 50`:** the pill reads **"Failsafe next"** (not "Failsafe in 0"). The next Decant call triggers the guaranteed Chimera+ roll and resets the counter to 0, so this text only shows between the 50th dry Decant and the guaranteed 51st.
- Hidden entirely when `droughtCount < 40`.
- Small amber pill styling — subtle, not alarming.
- Disappears the moment `droughtCount` resets to 0 (either natural Chimera+ or Failsafe-forced Chimera+).

**Display formula:**
```ts
if (droughtCount >= DROUGHT_THRESHOLD) return 'Failsafe next';
if (droughtCount >= FAILSAFE_INDICATOR_APPEARS_AT) return `Failsafe in ${DROUGHT_THRESHOLD - droughtCount}`;
return null;  // hidden
```

**On a Failsafe-guaranteed Decant:**

- Regular highlight fires on the new card. No banner, no modal, no fanfare beyond the tier badge showing "Chimera" or "Progenitor."
- The reveal of a Chimera+ card at that moment IS the reward; adding extra UI dilutes it.

**Empty state (`units.length === 0`):**

- Reachable only on first visit (M3c will add mass-cull that could re-empty).
- CTA respects Harvest limit: if `harvestsToday >= 3` on first visit (weird edge case), CTA shows the same disabled countdown label.
- No Failsafe indicator (`droughtCount === 0` on first visit).

## Component structure

```
src/
  state/
    colony.ts                        # MODIFIED — extend store, decant() logic, migrate fn
    harvest.ts                       # NEW — todayLocalKey, millisUntilLocalMidnight, harvestsRemaining selector, DAILY_HARVEST_LIMIT
    failsafe.ts                      # NEW — DROUGHT_THRESHOLD, FAILSAFE_INDICATOR_APPEARS_AT, FAILSAFE_MIN_TIER, FAILSAFE_SUBSTREAM_PRIME, tierAtLeast, rollGenomeAtLeast
    persist.ts                       # unchanged — key stays 'morulium/colony/v1'
    types.ts                         # unchanged
  ui/
    components/
      DecantButton.tsx               # MODIFIED — reads harvest state, disabled state, countdown label
      HarvestIndicator.tsx           # NEW — "Harvest N/3" OR "Next Harvest in Xh Ym"
      FailsafeIndicator.tsx          # NEW — shown only when droughtCount ≥ 40
      SpecimenCard.tsx               # unchanged
      TierBadge.tsx                  # unchanged
      EmptyColony.tsx                # MODIFIED — CTA respects harvest limit
    screens/
      Colony.tsx                     # MODIFIED — inserts new indicators into header row
    styles.ts                        # MODIFIED — add disabled-button, indicator, failsafe-pill styles

tests/
  state/
    harvest.test.ts                  # NEW — helper tests
    failsafe.test.ts                 # NEW — rollGenomeAtLeast tests
    colony.test.ts                   # MODIFIED — extend with harvest + drought + failsafe scenarios
    persist.test.ts                  # MODIFIED — add migration test
  ui/
    DecantButton.test.tsx            # MODIFIED — extend with harvest states
    HarvestIndicator.test.tsx        # NEW
    FailsafeIndicator.test.tsx       # NEW
    colony.test.tsx                  # MODIFIED — failsafe indicator visibility test
```

## Testing approach

Extends the M3a patterns (Vitest, node env for state, jsdom for React/localStorage).

### 1. State: `tests/state/colony.test.ts` (extend)

- Harvest counter increments per Decant; throws on 4th call same day
- Day rollover (mocked via `vi.setSystemTime` advancing 24h+) resets counter to 0
- Drought counter increments on Baseline/Variant/Adapted/Strain/Mutant rolls, resets on Chimera+ rolls
- Force `droughtCount = 50`, call `decant()` → returned Unit has `tier ∈ {chimera, progenitor}` and `droughtCount` post-Decant is 0
- Rejection-sampling determinism: same `(nextId=X, droughtCount=50)` yields the same guaranteed genome on repeat runs

### 2. State: `tests/state/persist.test.ts` (extend)

- New fields persist across a rehydrate cycle
- **Migration**: seed localStorage with `{state: {units, nextId}, version: 1}` → rehydrate → assert store has `harvestsToday: 0`, `harvestDayKey: <today>`, `droughtCount: 0` while `units`/`nextId` are preserved

### 3. State: `tests/state/harvest.test.ts` (new)

- `todayLocalKey(mockNow)` returns `YYYY-MM-DD`
- `millisUntilLocalMidnight(mockNow)` positive, ≤ 86_400_000
- `harvestsRemaining(state)` returns 0 or `DAILY_HARVEST_LIMIT - harvestsToday` based on day-key match

### 4. State: `tests/state/failsafe.test.ts` (new)

- `tierAtLeast('chimera', 'chimera') === true`
- `tierAtLeast('mutant', 'chimera') === false`
- `rollGenomeAtLeast(subseed, 'chimera')` always returns a genome with `tier >= chimera`
- Two calls with same `subseed`+`minTier` return the same genome (determinism)

### 5. UI: `tests/ui/DecantButton.test.tsx` (extend)

- Available state: button enabled with label `"Decant a Morula (N/3)"`
- Limit-hit state: button disabled with `"Next Harvest in Xh Ym"` label; text updates when mocked time advances 61+ seconds

### 6. UI: `tests/ui/HarvestIndicator.test.tsx` (new)

- Shows `"Harvest 3/3"` when fresh
- Shows `"Next Harvest in Xh Ym"` when limit hit
- Updates when time mock advances

### 7. UI: `tests/ui/FailsafeIndicator.test.tsx` (new)

- Renders nothing when `droughtCount < 40`
- Renders `"Failsafe in 10"` at `droughtCount === 40`
- Renders `"Failsafe in 1"` at `droughtCount === 49`
- Renders `"Failsafe next"` at `droughtCount === 50` (edge case: transiently visible between the 50th dry Decant and the guaranteed 51st)

### 8. UI: `tests/ui/colony.test.tsx` (extend)

- FailsafeIndicator appears in the header row when store has `droughtCount === 45`
- Disappears after a mocked Decant that resets droughtCount to 0

**Expected test count:** ~95 (M3a total) → ~110 (M3b adds ~15 new). Bundle should stay under 60 KB gzipped.

## Non-goals (deferred to M3c / later milestones)

- Tag/Sort/Cull actions and any curation UX (M3c)
- Auto-Cull rules (M3c)
- Serum currency and "Extra Harvest" beyond daily 3 (~M6, requires currency system)
- Failsafe history / stats ("you've hit Failsafe N times")
- Configurable daily limit or drought threshold (constants only in M3b)
- Cross-tab sync of Harvest counter (solo playtest is single-tab in practice; document but don't fix)
- Ability to "save up" unused Harvests across days (deliberately: use it or lose it, keeps daily rhythm)
- Progenitor-tier Failsafe (separate, rarer guarantee) — could add in a later polish pass
- Migration from v2 → future versions (defer until we know what the next shape needs)

## Open logistics

- **Bundle expectation:** M3a landed at 54.25 KB gzipped. M3b adds no runtime deps, only new source files. Should land around 56–58 KB gzipped.
- **Migration story:** existing M3a Colonies (any localStorage data at `morulium/colony/v1` with `version: 1`) will auto-migrate on first M3b load. My own Colony from M3a testing will migrate transparently.
- **Vercel auto-deploy:** landing M3b on main auto-updates morulium.com. Returning visitors' Colonies migrate on load; first-time visitors get a fresh v2 state.
- **Failsafe telemetry (out of scope but noted):** it would be nice to know how often Failsafe fires in real play. No analytics infrastructure yet; deferred.
- **Playtesting recommendation:** after M3b lands, clear localStorage and do a manual smoke run — Decant 3× today, verify countdown updates, wait until tomorrow (or mock via DevTools), verify counter resets. For Failsafe: manually set `droughtCount` via DevTools console and confirm indicator appears then guarantee fires.
- **`.superpowers/` gitignore was fixed in M2** — SDD scratch already ignored, no additional hardening needed.
