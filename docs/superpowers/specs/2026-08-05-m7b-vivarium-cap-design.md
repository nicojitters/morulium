# Morulium — M7b Vivarium + Colony Cap Design (v0.1)

**Date:** 2026-08-05
**Working directory:** `/Users/cnote/projects/morulium/`
**Remote:** `https://github.com/nicojitters/morulium` (public)
**Live:** `https://morulium.com` (Vercel, auto-deploys from main)
**Prior milestone:** M7a Vat + Cull — merged. This spec covers **M7b: Vivarium buildings + Colony cap** — the second slice of M7 (game spec §11 + §13). M7c (global tuning pass) remains a separate sub-milestone.

## Purpose

Give the acquisition-to-disposal loop a hard ceiling and give Serum a durable sink. M7a introduced the Vat + Cull triage; without a Colony cap, the player has no reason to Cull, and Serum accumulates faster than it drains once two fronts are garrisoned. M7b adds:

- A **hard Colony cap** (base 20; 40 with Barracks) that blocks Harvest + Breed when reached.
- **Barracks** (500 SR one-time): raises the cap and enables passive rest regeneration.
- **Medbay** (300 SR one-time): halves future injury bench duration.
- A new **Vivarium** screen (5th nav tab) hosting both purchase panels + Colony-cap indicator.

M7b ships when: opening morulium.com shows a 5th nav tab "Vivarium"; the Vivarium screen shows two purchase panels with disabled/enabled state based on Serum; buying Barracks flips the cap from 20 to 40 and starts crediting +10 rest/hour to non-garrisoned units; buying Medbay makes future injuries last 30 minutes instead of 60; the Colony header shows an `N/CAP` counter; the DecantButton + BreedButton disable with "Colony full" at cap. Nothing about existing Colony/Breed/Incursion/Vat mechanics changes otherwise.

## Scope decomposition context

M7 was split during initial M7 brainstorming: **M7a Vat + Cull** (shipped), **M7b Vivarium buildings + Colony cap** (this spec), **M7c global tuning pass** (measurement-driven calibration). Each ships as an MVP-completing slice. Additional buildings (Vault, Lab, Sequencer per game spec §13) are deferred post-MVP.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | **Barracks + Medbay + hard Colony cap**. New 5th nav tab "Vivarium". | Per M7 decomposition. Ships a complete gameplay slice. |
| Building depth | **Single-level buildings.** Each is a one-time purchase. No upgrade tree. | M7c will handle tuning. Keeps M7b scope tight. |
| Cap value | **Base cap 20; Barracks raises to 40.** | Scarce enough to matter (~5 hours of Harvest at 3/day + Vat cycles); Barracks doubles it (meaningful progression). |
| Cap enforcement | **Hard block on Harvest + Breed at cap.** `runVatOperation` is net −9 so always fits (guard is defense-in-depth). | Clean rule; drives the Cull loop. |
| Cap check location | **BEFORE the operation** for Harvest/Breed (`units.length >= cap` throws). AFTER donor removal for Vat (naturally passes). | Standard predicate; readable at the callsite. |
| Barracks rest effect | **Passive rest regen: +10 rest/hour** to non-garrisoned, non-injured units, capped at REST_MAX. Uses cross-cutting tick pattern. | Matches player expectation ("I left, my units rested"). +10/hr = 10h to full; slow enough that rotation still matters. |
| Rest tick eligibility | **Non-garrisoned AND non-injured AND rest < REST_MAX.** | Garrisoned = on duty; injured = in bench; full-rest = no-op. |
| Rest tick before Barracks | **Runs; credits 0; advances `lastRestTickAt` to now.** | Prevents retroactive credit-flood when Barracks is later built. |
| Medbay injury effect | **`INJURY_DURATION_MEDBAY_MS = 30 * 60 * 1000`** replaces `INJURY_DURATION_MS = 60 * 60 * 1000` for FUTURE injuries only. | Passive, simple, no new UI. Existing `injuredUntil` timestamps unchanged (per lock). |
| Medbay retroactivity | **None.** Buying Medbay does NOT recompute existing `injuredUntil` values. | Simpler semantics; consistent with "Medbay treats new patients". |
| Building costs | **Barracks 500 SR; Medbay 300 SR.** | ~2 days of one captured front's income (10 SR/hr × 24 = 240/day). Meaningful investment; not perpetual. M7c may retune. |
| Store shape | **`buildings: { readonly barracks: boolean; readonly medbay: boolean }`** — nested object. Plus `lastRestTickAt: number` at top level (mirrors `lastGarrisonTickAt`). | Grouped shape keeps future buildings additive. |
| RNG substream | **None.** M7b has no probabilistic rolls. | Pure state + UI. |
| Cross-cutting prologue order | **`checkFlareTimers → applyGarrisonTick → applyRestTick`.** | Rest tick runs against post-flare, post-garrison state (so a flare-freed unit's rest credit follows the un-garrison event in the same tick). |
| Persist bump | **Version 9**, chained `if (from < 9)` branch backfills `buildings: { barracks: false, medbay: false }` and `lastRestTickAt: Date.now()`. | Same convention. Storage key stays `morulium/colony/v1`. |
| UI placement | **New 5th nav tab: "Vivarium".** | Colony / Breed / Incursion / Vat / Vivarium. Consistent with tabbed model. |
| Colony header change | **New `Colony {N}/{CAP}` counter in the header sub-line.** | Persistent visibility of the cap. |
| Button states at cap | **DecantButton + BreedButton show disabled "Colony full" state.** `data-disabled-reason="cap"` for tests. | Direct feedback at the acquisition site. |
| Precedence in disabled labels | **DecantButton:** harvest-limit > cap > (other). **BreedButton:** cap > breed-limit > insufficient-SR > pick-two-units. | Cap dominates because it's a hard ceiling; you can't buy your way past it. |
| "Built ✓" indicator | **Unicode `✓` (checkmark)**, same visual convention as M7a's `✗` cull badge. | Design-locked visual, not a decorative emoji. |
| Loop isolation | `buildBarracks` and `buildMedbay` touch only `serum` + `buildings`. `applyRestTick` touches only `units[].restCurrent` + `lastRestTickAt`. `capOf(state)` is a pure selector. | Same discipline as M6a-M7a. |

## Anti-meta invariant check (game spec §14)

1. **Every gain has a cost** — reinforced. Buildings cost real Serum.
2. **No master stat** — untouched.
3. **Abilities compete** — untouched.
4. **Missions demand different profiles** — untouched.
5. **Information is hidden** — Barracks/Medbay effect magnitudes are VISIBLE mechanical upgrades (not tuning secrets); rarity + mission thresholds still hidden.
6. **Rest forces rotation** — preserved. Barracks eases rotation (+10 rest/hr) but doesn't remove it: rest still consumed on deploy; +10/hr means 10 real-time hours from 0 to full; at cap 20 you still need multiple viable units for consecutive Incursions.
7. **Convergence is taxed** — untouched.
8. **Rarity ≠ power** — untouched.
9. **The tail is aberration-driven** — untouched.

## Data model

**Unit shape unchanged.** No new fields on Unit.

**Colony store shape after M7b:**

```ts
interface ColonyStore {
  // ...existing fields (units, nextId, lastDecantedId, harvest*, drought*, breed*,
  //                     fronts, activeIncursion, serum, stims, lastGarrisonTickAt,
  //                     runVatOperation, toggleCulled, ...)

  // NEW in M7b:
  readonly buildings: {
    readonly barracks: boolean;
    readonly medbay: boolean;
  };
  readonly lastRestTickAt: number;

  buildBarracks: () => void;
  buildMedbay: () => void;
}
```

## Sim modules

**No new sim files.** M7b is pure state + UI; no deterministic-roll math.

## State module additions

### `src/state/vivarium.ts` (new — constants only)

```ts
export const COLONY_CAP_BASE = 20 as const;
export const COLONY_CAP_BARRACKS = 40 as const;
export const BARRACKS_COST_SERUM = 500 as const;
export const MEDBAY_COST_SERUM = 300 as const;
export const REST_REGEN_PER_HOUR = 10 as const;
export const INJURY_DURATION_MEDBAY_MS = 30 * 60 * 1000;
```

### `src/state/colony.ts` extensions

**Pure selector:**

```ts
export function capOf(state: { buildings: { barracks: boolean } }): number {
  return state.buildings.barracks ? COLONY_CAP_BARRACKS : COLONY_CAP_BASE;
}
```

**Cross-cutting helper `applyRestTick` (module-internal):**

```ts
function applyRestTick(state: ColonyStore, now: number): Partial<ColonyStore> {
  if (!state.buildings.barracks) return { lastRestTickAt: now };

  const elapsedMs = now - state.lastRestTickAt;
  const hourMs = 60 * 60 * 1000;
  const wholeHours = Math.floor(elapsedMs / hourMs);
  if (wholeHours <= 0) return {};   // fractional interval — retain remainder

  const garrisonedIds = new Set(
    (Object.keys(state.fronts) as FrontId[]).flatMap((fid) => state.fronts[fid].garrison),
  );
  const restGain = wholeHours * REST_REGEN_PER_HOUR;

  const newUnits = state.units.map((u) => {
    const injured = u.injuredUntil !== null && u.injuredUntil > now;
    const garrisoned = garrisonedIds.has(u.id);
    if (injured || garrisoned) return u;
    if (u.restCurrent >= REST_MAX) return u;
    return { ...u, restCurrent: Math.min(REST_MAX, u.restCurrent + restGain) };
  });

  return {
    units: newUnits,
    lastRestTickAt: state.lastRestTickAt + wholeHours * hourMs,
  };
}
```

**Cross-cutting prologue** — every state-mutating action changes from:

```ts
// Old (M6c-M7a):
const flareDelta = checkFlareTimers(state, now);
const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
const s = { ...state, ...flareDelta, ...tickDelta };
```

to:

```ts
// New (M7b):
const flareDelta = checkFlareTimers(state, now);
const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
const restDelta = applyRestTick({ ...state, ...flareDelta, ...tickDelta }, now);
const s = { ...state, ...flareDelta, ...tickDelta, ...restDelta };
```

And every `set({ ...flareDelta, ...tickDelta, ...actionFields })` becomes `set({ ...flareDelta, ...tickDelta, ...restDelta, ...actionFields })`.

**Cap guards in existing actions:**

- **`decant()`:**
  ```ts
  if (s.units.length >= capOf(s)) {
    throw new Error('Colony full — Cull or Vat first');
  }
  ```
  Placed after prologue, before harvest-limit check (prologue may reduce `units.length` via nothing currently, but keeps invariants forward-safe).

- **`breed()`:** same guard, same message.

- **`runVatOperation()`:** add defense-in-depth after donor removal + before `set()`:
  ```ts
  if (newUnits.length > capOf(s)) {
    throw new Error(`runVatOperation: cap exceeded (${newUnits.length} > ${capOf(s)})`);
  }
  ```
  Under normal play this never fires (op is net −9). The guard exists for future refactors.

**Medbay injury duration in `launchIncursion`:**

Current M6b code writes:
```ts
injuredUntil: gotInjured ? now + INJURY_DURATION_MS : u.injuredUntil,
```

Change to:
```ts
const injuryDuration = s.buildings.medbay ? INJURY_DURATION_MEDBAY_MS : INJURY_DURATION_MS;
// ...
injuredUntil: gotInjured ? now + injuryDuration : u.injuredUntil,
```

Existing `injuredUntil` timestamps unchanged when Medbay is later purchased (per lock).

**New actions:**

- **`buildBarracks()`:**
  ```ts
  buildBarracks: () => {
    const state = get();
    const now = Date.now();
    const flareDelta = checkFlareTimers(state, now);
    const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
    const restDelta = applyRestTick({ ...state, ...flareDelta, ...tickDelta }, now);
    const s = { ...state, ...flareDelta, ...tickDelta, ...restDelta };

    if (s.buildings.barracks) {
      throw new Error('buildBarracks: already built');
    }
    if (s.serum < BARRACKS_COST_SERUM) {
      throw new Error('buildBarracks: insufficient Serum');
    }
    set({
      ...flareDelta,
      ...tickDelta,
      ...restDelta,
      serum: s.serum - BARRACKS_COST_SERUM,
      buildings: { ...s.buildings, barracks: true },
    });
  },
  ```

- **`buildMedbay()`:** identical shape; substitute `medbay` + `MEDBAY_COST_SERUM`.

**Persist v9 migration** (chained after v8):

```ts
if (from < 9) {
  s = {
    ...s,
    buildings: (s as Partial<ColonyStore>).buildings ?? { barracks: false, medbay: false },
    lastRestTickAt: (s as Partial<ColonyStore>).lastRestTickAt ?? Date.now(),
  };
}
```

**`partialize` extends** to include `buildings` and `lastRestTickAt` (both mutations must survive a reload).

## UI

### `src/ui/screens/Vivarium.tsx` (new — 5th nav tab)

Structure:

```tsx
<main style={styles.page}>
  <h1>Morulium — Vivarium</h1>
  <p>
    Colony <span data-testid="vivarium-cap-counter">{units.length}/{cap}</span>
    {' · '}SR {serum}
    {' · '}Barracks {buildings.barracks ? 'built' : 'not built'}
    {' · '}Medbay {buildings.medbay ? 'built' : 'not built'}
  </p>

  <BuildingPanel
    id="barracks"
    label="Barracks"
    cost={BARRACKS_COST_SERUM}
    effects={['Raises Colony cap 20 → 40', '+10 rest/hour for non-garrisoned units']}
    built={buildings.barracks}
    canAfford={serum >= BARRACKS_COST_SERUM}
    onBuild={() => useColonyStore.getState().buildBarracks()}
  />

  <BuildingPanel
    id="medbay"
    label="Medbay"
    cost={MEDBAY_COST_SERUM}
    effects={['Halves injury bench (60 → 30 min)', 'Applies to injuries suffered after purchase']}
    built={buildings.medbay}
    canAfford={serum >= MEDBAY_COST_SERUM}
    onBuild={() => useColonyStore.getState().buildMedbay()}
  />
</main>
```

`BuildingPanel` is a local component (or inline JSX — spec allows either). It renders:
- Header row: `{label} — {cost} SR`
- Effect bullet list
- Action row: if `built`, render "Built ✓" as static text (testid `{id}-status`); else render a `<button>` (testid `{id}-build-button`) with label `"Build ({cost} SR)"` or `"Build ({cost} SR — need more SR)"` when `!canAfford`.

Panel container gets `data-testid="{id}-panel"`.

### `src/App.tsx` (extend nav)

Widen `Tab` union to `'colony' | 'breed' | 'incursion' | 'vat' | 'vivarium'`. Add 5th nav button `data-testid="nav-tab-vivarium"` labeled "Vivarium". Conditional render `{tab === 'vivarium' && <Vivarium />}`.

### `src/ui/screens/Colony.tsx` (extend)

Header sub-line adds a cap counter:

```tsx
Your Colony — {units.length}/{cap} specimens
```

Replace the existing `{units.length} specimens` with the counter. Testid on the whole sub-line stays untouched, but the counter itself gets `data-testid="colony-cap-header"`.

### `src/ui/components/DecantButton.tsx` (extend)

Existing disabled states: harvest-limit reached. Extend to:

- If `units.length >= cap`: disabled, label `"Colony full — Cull or Vat first"`, `data-disabled-reason="cap"`.
- Existing precedence: harvest-limit label wins over cap label (label displays whichever hit first). `data-disabled-reason` reflects the actual blocking reason.

Note: at present the button label logic already returns a string. Extend the string-return function to check cap before returning the enabled state.

### `src/ui/components/BreedButton.tsx` (extend)

Existing disabled states: not-two-units, insufficient-SR, breed-limit. Extend to:

- Add cap check as HIGHEST precedence: disabled, label `"Colony full"`, `data-disabled-reason="cap"`.

## Testing plan

### `tests/state/vivarium.test.ts` (new)

```ts
describe('Vivarium constants', () => {
  it('COLONY_CAP_BASE = 20');
  it('COLONY_CAP_BARRACKS = 40');
  it('BARRACKS_COST_SERUM = 500');
  it('MEDBAY_COST_SERUM = 300');
  it('REST_REGEN_PER_HOUR = 10');
  it('INJURY_DURATION_MEDBAY_MS = 30 min');
  it('INJURY_DURATION_MEDBAY_MS is half of M6b INJURY_DURATION_MS');
});
```

### `tests/state/colony.test.ts` (extend)

New `describe` blocks:

- **`capOf` selector:**
  - Returns COLONY_CAP_BASE when barracks not built.
  - Returns COLONY_CAP_BARRACKS when barracks built.

- **`buildBarracks`:**
  - Throws when already built.
  - Throws when `serum < BARRACKS_COST_SERUM`.
  - Success: decrements serum, flips `buildings.barracks` to true.
  - Loop isolation: does NOT touch units, harvestsToday, breedsToday, droughtCount, stims, fronts, activeIncursion.
  - Cross-cutting: garrison tick fires (SR credit from garrison before deduction).

- **`buildMedbay`:** same shape.

- **`applyRestTick` (through public actions):**
  - Barracks not built + 3 hours elapsed: no rest change; `lastRestTickAt` advances to `now`.
  - Barracks built + 30 min elapsed (fractional): no rest change; `lastRestTickAt` unchanged (retain fraction).
  - Barracks built + 2 hours elapsed: 2 × 10 = 20 rest credited to eligible units; `lastRestTickAt` advances by 2h worth.
  - Barracks built + garrisoned unit + 2 hours: garrisoned unit's rest UNCHANGED.
  - Barracks built + injured unit + 2 hours: injured unit's rest UNCHANGED.
  - Barracks built + unit at 95 rest + 2h regen (would add 20): clamps at REST_MAX=100.
  - Barracks built + unit at REST_MAX + 2h: unit unchanged (no-op branch).

- **Cap enforcement:**
  - `decant()` throws with `/Colony full/` at units.length=20 (Barracks not built).
  - `decant()` succeeds at units.length=39 (Barracks built).
  - `decant()` throws at units.length=40 (Barracks built).
  - `breed()` same pattern.
  - `runVatOperation()` succeeds at units.length=20 (net −9 leaves 12 units, well under 20).
  - `runVatOperation()` succeeds at units.length=40 (net −9 leaves 32 units).

- **Medbay injury duration:**
  - `launchIncursion` with an under-rested + non-Stimmed unit that rolls injury: `injuredUntil` = `now + INJURY_DURATION_MS` when Medbay not built.
  - Same setup with Medbay built: `injuredUntil` = `now + INJURY_DURATION_MEDBAY_MS`.
  - Existing `injuredUntil` on a unit unchanged when Medbay is purchased mid-injury.

- **Cross-cutting order:**
  - Setup: front captured with 1 garrison, `GARRISON_MIN`-triggering flare condition, Barracks built, 2h elapsed. Fake time advances past `GARRISON_GRACE_MS`. Call any state-mutating action (e.g. `decant`). Assertions:
    - Front un-captured (flare check fired).
    - Garrison income credited for the pre-flare period.
    - Rest tick credits the freed unit (now non-garrisoned) with +20 rest.

### `tests/state/persist.test.ts` (extend)

- v8 → v9 migration backfills `buildings: { barracks: false, medbay: false }` + `lastRestTickAt` (any number).
- v1 → v9 chain (all 8 branches).
- `parsed.version === 9` after any current-store write.
- Roundtrip: buy Barracks → reload → `buildings.barracks === true`, cap is 40.

### `tests/ui/Vivarium.test.tsx` (new)

- Renders both `barracks-panel` and `medbay-panel`.
- Barracks Build button enabled at serum=600, disabled at serum=400 (below cost).
- Click Build with sufficient serum: SR drops by cost, panel switches to "Built ✓" text.
- Once built, no Build button visible for that panel (only status text).
- Vivarium cap counter reflects `units.length / capOf`.

### `tests/ui/App.test.tsx` (extend)

- 5 nav tabs visible (add `nav-tab-vivarium`).
- Clicking Vivarium switches to the Vivarium screen (`barracks-panel` visible).

### `tests/ui/colony.test.tsx` (extend)

- Colony header shows `N/20` when Barracks not built.
- Colony header shows `N/40` when Barracks built.
- `colony-cap-header` testid present.

### `tests/ui/DecantButton.test.tsx` (extend)

- At `units.length === capOf(state)`: button disabled, label contains "Colony full", `data-disabled-reason="cap"`.
- Harvest-limit and cap both reached: harvest-limit label wins.

### `tests/ui/BreedButton.test.tsx` (extend)

- At cap: disabled, label "Colony full", `data-disabled-reason="cap"`.
- At cap AND insufficient SR: cap message wins.

**Expected test count:** 483 → ~540 (~57 new).

**Dev-server smoke:**
- Fresh app → 5 nav tabs; Vivarium tab shows both panels not-built.
- Harvest until Colony=20 → DecantButton disabled "Colony full — Cull or Vat first".
- Colony header shows `20/20`. Buy Barracks (need 500 SR) → cap flips to `20/40`; DecantButton re-enables.
- Wait ~1 hour (or advance in dev with fake timers) → non-garrisoned units gain +10 rest.
- Garrison one unit → over next hour, that unit's rest UNCHANGED; other units continue to gain.
- Buy Medbay (300 SR). Launch an under-rested unit into an Incursion → they get injured → injury duration is 30 min instead of 60.
- Reload → both buildings persist; cap stays at 40; injury timers still ticking.

## Deferred

- **Multi-level Barracks / Medbay upgrades** (level 1/2/3 with escalating effects). Single-level per lock.
- **Explicit "Heal (SR)" injury action** — game spec §11 mentions injury but doesn't require an active heal. Medbay is passive-only per lock.
- **Buildings selling-back / refund.**
- **Additional Vivarium buildings** (Vault, Lab, Sequencer, etc. — game spec §13). Sequencer is late-unlock; deferred post-MVP.
- **Cap-full modal** for Decant attempts at cap (button label is enough for M7b).
- **Auto-Cull predicate rules** (still deferred from M7a).
- **Serum-cost tuning** (M7c will retune all magnitudes based on measurement).
- **Rest recovery for garrisoned units** (garrisoning = "on duty", no rest per game spec §11 semantic).
- **`unitToRow` / `restStateFor` / `garrisonedAtFor` extraction to shared UI utility** — carrying M4/M5/M6b/M6c tech debt.

## Self-review notes

- **Spec coverage vs M7 decomposition:** Barracks ✓, Medbay ✓, Colony cap ✓. Vivarium screen ✓. Serum sinks ✓.
- **Anti-meta invariants:** all 9 preserved; #1 and #6 explicitly reinforced.
- **Determinism:** no new RNG substream needed. `applyRestTick` deterministic in `(state, now)`.
- **Loop isolation:** `buildBarracks`/`buildMedbay` touch only `serum` + `buildings`. `applyRestTick` touches only `units[].restCurrent` + `lastRestTickAt`. `capOf` is a pure selector.
- **Cross-cutting order:** `flare → garrison → rest`. Rest tick sees post-flare, post-garrison state; a flare that un-garrisons a unit correctly credits that unit's rest starting from the same tick.
- **Type consistency:** `capOf`, `buildBarracks`, `buildMedbay`, `applyRestTick`, `COLONY_CAP_BASE`, `COLONY_CAP_BARRACKS`, `BARRACKS_COST_SERUM`, `MEDBAY_COST_SERUM`, `REST_REGEN_PER_HOUR`, `INJURY_DURATION_MEDBAY_MS`, `buildings.barracks`, `buildings.medbay`, `lastRestTickAt` — all defined once, consumed identically.
- **Persist compatibility:** v9 chains after v1..v8. Storage key unchanged.
- **Cross-milestone integration:**
  - M6a: buildings are new SR sinks.
  - M6b: Medbay overrides `INJURY_DURATION_MS` at write time only; existing injuries not retro-adjusted.
  - M6c: cross-cutting prologue extended by one step; order preserved.
  - M7a: Vat op is net −9, safe under any cap; cap-block on Harvest/Breed pairs naturally with Cull All triage.
- **Non-determinism budget:** `Date.now()` in `buildBarracks`/`buildMedbay` (prologue + `lastRestTickAt` advance). No `Math.random`.
- **UI counts:** Colony/Breed/Incursion/Vat/Vivarium = 5 tabs. Nav is at capacity for MVP; post-MVP will need re-thinking (dropdown?), but not in M7b.
