# Morulium — M6a Serum Economy Design (v0.1)

**Date:** 2026-08-04
**Working directory:** `/Users/cnote/projects/morulium/`
**Remote:** `https://github.com/nicojitters/morulium` (public)
**Live:** `https://morulium.com` (Vercel, auto-deploys from main)
**Prior milestone:** M5 Incursions & fronts — merged. This spec covers **M6a: Serum economy foundation** — the first slice of M6. Rest+Injury+Stim (M6b) and Occupations+flare (M6c) land as separate sub-milestones.

## Purpose

Introduce Serum (SR), the game's currency, as the shared foundation for M6b's Stim consumable and M6c's Occupation garrison income. M6a delivers the currency itself, a small daily faucet, one sink (Breed cost, closing the `// M6: replace or augment the Breed cap with Serum cost` TODO left in M4), and a Serum badge in the nav.

M6a ships when: opening morulium.com shows `"SR 200"` in the top-right of the nav; the value decrements by 50 each successful Breed; the value increments by 25 each new local-midnight rollover; the Breed screen surfaces `"Not enough Serum — need 50 SR (have N)"` when the player can't afford a Breed; and nothing about Harvest/Failsafe/Incursion resolution changes.

## Scope decomposition (M6 as a whole)

Original M6 per the MVP schedule bundled: Serum currency + rest state + Stim consumable + injury bench + Occupation garrison income + under-garrison flare. That's 3 independent subsystems (Serum foundation, per-unit rest/injury/Stim, post-capture Occupation dynamics). M6 is being split into three review-sized slices:

| Slice | Deliverable | Depends on |
|---|---|---|
| **M6a Serum economy** (this spec) | Serum currency + starting balance + daily faucet + Breed cost + Serum badge | M5 (nothing structural — Serum stands alone) |
| **M6b Rest + Injury + Stim** | Per-unit rest/injury state + Stim consumable that overrides rest gate | M6a (Stim priced in SR) |
| **M6c Occupations + flare** | Garrison mechanic on captured fronts → passive SR income + under-garrison flare | M5 (captured fronts) + M6a (SR income landing point) |

Each slice ships alone. Vivarium buildings (Barracks / Medbay / Colony cap) remain M7.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | **M6a = Serum currency + 200 SR starting balance + 25 SR/day faucet + 50 SR Breed cost + Serum badge in nav.** No Extra Harvest, no Incursion reward SR, no gear costs, no Vivarium upgrades. | Minimum viable economy. Every other Serum sink/source is deferred to the slice that introduces it. |
| Starting balance | **`SERUM_STARTING_BALANCE = 200`** — ~4 Breeds' worth | Enough runway to try the loop; not so much that Serum feels weightless. Player quickly feels the sink. |
| Daily faucet amount | **`SERUM_DAILY_FAUCET = 25`** per day | Small ongoing income. Between the starting balance and faucet, casual play doesn't run dry. Occupations (M6c) will layer on top. |
| Daily faucet trigger | **Inside `decant()` day-rollover logic** — faucet grants once when the stored `harvestDayKey` doesn't match today | Piggybacks on existing harvest-day-rollover check; no new persisted field. Player opening the app on a new day sees SR jump on first Decant. Small lag but no drama. |
| Skip-days behavior | **Faucet grants ONCE per day-rollover, not once per skipped day** | Prevents "not-playing" farming. Skip 3 days, first Decant grants +25 (not +75). |
| Breed cost | **`BREED_COST_SERUM = 50` per Breed** | Straightforward tuning number. Player runs through the starting balance in ~4 Breeds; daily faucet funds one every two days on average. |
| Breed cost + M4 daily cap | **AUGMENT: keep the 3/day cap AND charge SR** | Both constraints active. Preserves the "deliberate, paced" quality of the daily cap; Serum is the second deliberation. Cleanest closure of the M4 `// M6: replace or augment` TODO. |
| Breed guard order | **self-breed → missing parent → daily cap → Serum → compute** | Cap error takes priority over Serum error when both are true — matches expected UX (player sees "you've hit the daily cap" not "you don't have enough SR" when the cap is the wall). |
| Insufficient-Serum UX | **`BreedButton` visually disables + shows `"Breed costs 50 SR (have N)"` label; store `breed()` throws `/insufficient Serum/` defensively** | Belt-and-suspenders matching M4/M5. UI never lets the player attempt a broken action; guard is there if UI bypasses. |
| BreedButton disabled-priority | **cap countdown > insufficient Serum > external disabled > enabled** | Countdown is the biggest constraint (nothing works until tomorrow); insufficient-Serum is next-most-informative; external disabled is silent. |
| Breed-screen hint | **When both parents picked + distinct + cap not hit + serum < BREED_COST_SERUM: show `"Not enough Serum — need 50 SR (have N)"`** | Complements the existing hint stack (`"Click two specimens below..."` / `"Pick two different specimens"`). |
| UI placement of SR | **In the nav bar, right-aligned, always visible** | One place across every screen. `<SerumBadge />` component in App.tsx nav. Format: `"SR 245"` (monospace pill, subtle color). |
| Incursion reward SR | **Deferred** — no Serum granted on Incursion win in M6a | Keeps M6a small. `launchIncursion` and `dismissIncursion` unchanged. Reward SR lands in M6b or M6c wherever it best fits the design. |
| Persistence | **Bump `version: 5`, chain new migrate branch (v1→v2→v3→v4→v5)** | Same convention as M3b/M4/M5. Storage key stays `morulium/colony/v1`. |
| Migration default | **v4 → v5 sets `serum: SERUM_STARTING_BALANCE`** — existing players get the same starting balance a new player gets | No free money, no penalty. Clean upgrade path. |
| Serum field type | **`readonly serum: number`** — persisted, mutated only through actions (decant faucet + breed deduction) | Zustand handles the readonly-in-interface + set-inside-actions pattern already. |
| `launchIncursion` / `dismissIncursion` | **No changes** — Serum is untouched by the Incursion loop in M6a | Keeps the slice focused. |
| RNG substream | **None** — Serum economy is deterministic. No prime reserved. | Economy is not stochastic in M6a. |

## Anti-meta invariant check (game spec §14)

Every invariant preserved:

1. **Every gain has a cost** — untouched (M6a doesn't touch genome, stats, or combat).
2. **No master stat** — untouched.
3. **Abilities compete** — untouched.
4. **Missions demand different profiles** — untouched.
5. **Information is hidden** — Serum is a straightforward number, no hidden thresholds; consistent with §14 which is about combat/genome hidden info, not economy.
6. **Rest forces rotation** — untouched (rest is M6b).
7. **Convergence is taxed** — untouched (wear stays as-is).
8. **Rarity ≠ power** — untouched.
9. **The tail is aberration-driven** — untouched.

The Serum sink on Breed nudges toward invariant #1 (every gain has a cost) at the economy layer: Breeding a specimen now has a concrete SR cost in addition to the genetic wear and daily-cap cost.

## Data model

**Colony store shape after M6a** (extending M5):

```ts
interface ColonyStore {
  // ... existing (M3a/M3b/M4/M5)

  // NEW in M6a (persisted):
  readonly serum: number;

  // actions unchanged plus a Serum deduction inside breed()
  // and a Serum faucet inside decant() day-rollover.
}
```

**No new sub-map, no new sub-record.** Just one number field.

## Sim modules

None. Serum is a state-layer concern only — no genome/combat math involved.

## State module additions

### `src/state/serum.ts` (new — constants only)

```ts
export const SERUM_STARTING_BALANCE = 200 as const;
export const SERUM_DAILY_FAUCET = 25 as const;
export const BREED_COST_SERUM = 50 as const;
```

Pure constants — no helpers. Follows the pattern of `src/state/harvest.ts`, `src/state/breed.ts`, `src/state/failsafe.ts`, `src/state/incursion.ts`.

### `src/state/colony.ts` (extensions)

**Initial state addition:**
```ts
serum: SERUM_STARTING_BALANCE,
```

**`decant()` gains a day-rollover faucet check:**

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
    id, seed: id, decantedAt: Date.now(), genome,
    generation: 0, parentIds: null, wear: {},
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

Faucet edge cases:
- **First Decant ever:** initial state has `harvestDayKey: todayLocalKey()` — matches today, so no faucet on very first play. Player has starting balance, no bonus.
- **Same-day second Decant:** `harvestDayKey === today` → no faucet.
- **Next-day first Decant:** `harvestDayKey !== today` → faucet fires, granted alongside the counter reset.
- **Skipped days:** the faucet triggers on the FIRST decant after a day rollover, not per missed day. Skipping 3 days grants +25 on next Decant, not +75.

**`breed()` gains a Serum guard + deduction:**

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

  // NEW: Serum guard
  if (state.serum < BREED_COST_SERUM) {
    throw new Error('breed: insufficient Serum');
  }

  const childId = state.nextId;
  const rng = createRng(childId * BREED_SUBSTREAM_PRIME);
  const { genome, mutatedLoci } = breedGenome(pA.genome, pB.genome, rng, MUTATION_RATE);
  const wear = nextWear(pA, pB, mutatedLoci);
  const generation = Math.max(pA.generation, pB.generation) + 1;

  const child: Unit = {
    id: childId, seed: childId, decantedAt: Date.now(), genome,
    generation, parentIds: [parentAId, parentBId] as const, wear,
  };

  set({
    units: [...state.units, child],
    nextId: childId + 1,
    lastDecantedId: childId,
    breedsToday: breedsUsedToday + 1,
    breedDayKey: today,
    serum: state.serum - BREED_COST_SERUM,   // NEW: deduct
  });
  return child;
},
```

Guard order (locked): **self-breed → missing parent → daily cap → Serum → compute**. Rationale: cap error priority ("you've hit the daily cap") wins over Serum error when both are true.

**`partialize` extended:**
```ts
partialize: (state) => ({
  units: state.units,
  nextId: state.nextId,
  harvestsToday: state.harvestsToday,
  harvestDayKey: state.harvestDayKey,
  droughtCount: state.droughtCount,
  breedsToday: state.breedsToday,
  breedDayKey: state.breedDayKey,
  fronts: state.fronts,
  serum: state.serum,   // NEW
  // activeIncursion still excluded (transient)
}),
```

**Migration v5** (chained after v2/v3/v4):

```ts
version: 5,
migrate: (state, from) => {
  let s = state as ColonyStore;
  if (from < 2) { /* M3b branch — adds harvest fields */ }
  if (from < 3) { /* M4 branch — adds breed fields + backfills unit shape */ }
  if (from < 4) { /* M5 branch — adds fronts */ }
  if (from < 5) {
    s = { ...s, serum: SERUM_STARTING_BALANCE };
  }
  return s;
},
```

Chained if-statements — a v1 save cascades through all four branches.

**`launchIncursion` and `dismissIncursion` — no changes.** Serum untouched by Incursion in M6a. `set(...)` calls in both actions do NOT include `serum`.

## UI

### `src/ui/components/SerumBadge.tsx` (new)

Reads `serum` from the store; renders a monospace pill.

```tsx
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

Style entry (added to `src/ui/styles.ts`):

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

`marginLeft: 'auto'` inside the existing flex nav pushes the badge to the right edge.

### `src/App.tsx` (extended)

Add `<SerumBadge />` at the end of the nav strip (no changes to tab buttons):

```tsx
<nav style={styles.nav}>
  <button ... data-testid="nav-tab-colony">Colony</button>
  <button ... data-testid="nav-tab-breed">Breed</button>
  <button ... data-testid="nav-tab-incursion">Incursion</button>
  <SerumBadge />
</nav>
```

### `src/ui/components/BreedButton.tsx` (extended)

Reads `serum` from the store. Adds an "insufficient Serum" state:

```tsx
const serum = useColonyStore((s) => s.serum);
const insufficientSerum = serum < BREED_COST_SERUM;
const isDisabled = disabled || limitHit || insufficientSerum;

const label = limitHit
  ? `Next Breed in ${formatCountdown(millisUntilLocalMidnight())}`
  : insufficientSerum
    ? `Breed costs ${BREED_COST_SERUM} SR (have ${serum})`
    : `Confirm Breed (${remaining}/${DAILY_BREED_LIMIT})`;
```

Priority: **limitHit (countdown) > insufficientSerum (SR message) > external disabled > enabled**. `data-disabled="true"` when isDisabled; `data-disabled-reason="serum" | "limit" | "external"` when disabled (helps tests target the specific state).

### `src/ui/screens/Breed.tsx` (extended)

Add one more hint tier to the existing hint stack. Current stack (from M4):

- Neither parent picked → `"Click two specimens below to pick parents."`
- One parent picked → `"Fill both parent slots."` (existing)
- Both picked but same unit → `"Pick two different specimens."`

New hint added (when NO other hint applies):

- Both picked + distinct + cap not hit + serum < BREED_COST_SERUM → `"Not enough Serum — need 50 SR (have N)"`

Hint priority (highest→lowest): pick-parents → fill-slots → distinct → **insufficient-Serum** (new) → no hint. When the cap is hit, the countdown appears in the button, not as a hint.

## Testing plan

**State (`tests/state/`):**

- `colony.test.ts` (extend):
  - `decant()` on fresh state does NOT grant faucet (dayKey matches today).
  - `decant()` after `vi.setSystemTime` advances one day grants +25 SR exactly once.
  - Second `decant()` same day does NOT re-grant.
  - Skip 3 days → next `decant()` grants +25 (not +75).
  - `breed()` throws `/insufficient Serum/` when `serum < BREED_COST_SERUM`.
  - `breed()` deducts BREED_COST_SERUM on success.
  - Guard order: `breedsToday=3, serum=0` throws `daily Breed limit` (not Serum error).
  - `breed()` does NOT deduct when it throws (balance unchanged on failed breed).
  - `launchIncursion` + `dismissIncursion` do NOT touch `serum`.

- `persist.test.ts` (extend):
  - v4 → v5 migration adds `serum: 200`.
  - v1 → v5 chained migration through all branches leaves the unit with full M4 + M5 + M6a shape (unit has generation/parentIds/wear, store has harvest+breed+fronts+serum defaults).
  - `serum` field persists across a rehydration cycle.
  - `parsed.version === 5` after any current-store write.

**UI (`tests/ui/`):**

- `SerumBadge.test.tsx` (new):
  - Renders `"SR 200"` on fresh state.
  - Reflects store changes (setState `serum: 42` → renders `"SR 42"`).
  - `data-testid="serum-badge"` present.

- `BreedButton.test.tsx` (extend):
  - Existing tests still pass (starting balance = 200 covers 50 SR cost).
  - `serum=25` + no cap → label = `"Breed costs 50 SR (have 25)"`, `data-disabled="true"`, `data-disabled-reason="serum"`, click is no-op.
  - `serum=0, breedsToday=3` → label = countdown (cap priority), `data-disabled-reason="limit"`.
  - `disabled={true}` external + serum=200 → label = default `"Confirm Breed (3/3)"` but `data-disabled="true"`, `data-disabled-reason="external"`.

- `Breed.test.tsx` (extend):
  - Insufficient-Serum hint appears when both parents distinct + cap not hit + serum < 50.
  - Insufficient-Serum hint does NOT appear when serum ≥ 50.

- `App.test.tsx` (extend):
  - `<SerumBadge />` renders inside the nav (`getByTestId('serum-badge')` after `render(<App />)`).

**beforeEach hygiene:** every store-touching test file's `beforeEach` gets `serum: SERUM_STARTING_BALANCE`. Files: `colony.test.ts`, `persist.test.ts`, and every UI test file that resets the store. Same pattern as M5's `fronts: FRESH_FRONTS` addition.

**Expected count:** 272 → ~287 (roughly 15 new tests).

**Dev-server smoke:**
- Fresh app load → nav shows `"SR 200"` right-aligned.
- Decant once same-day → SR unchanged.
- DevTools: advance system clock a day and reload → next Decant credits +25 → SR reads `"SR 225"`.
- Breed once → SR reads `"SR 175"`.
- DevTools: set `serum=25` → Breed screen with 2 distinct parents picked shows hint `"Not enough Serum — need 50 SR (have 25)"`; BreedButton is disabled with label `"Breed costs 50 SR (have 25)"`.
- Hit daily Breed cap (`breedsToday=3`) AND set `serum=0` → BreedButton shows the countdown (cap priority holds).
- Reload during any state → SR persists at its current value.

## Deferred

- **Incursion reward SR** on win — deferred to M6b or M6c wherever it best fits the design.
- **Extra Harvest** (SR-cost Harvest beyond the daily 3) — deferred; not required for M6a.
- **Gear costs** — Gear system is M7+ per MVP.
- **Vivarium upgrade costs** — Vivarium buildings are M7 per MVP.
- **Sequencer** — late-unlock per game spec; MVP deferral.
- **Variable Breed cost** (e.g. `50 + 25 * max(parent generation)`) — considered and deferred. Would add depth (deep lineages cost more) but also adds tuning surface and UI (show cost per Breed). Flat 50 SR is sufficient for the M6a foundation.
- **Serum in the header of each screen** — considered; nav-only placement is simpler and consistent.
- **Store-level slice split** (recommended by M5 review) — colony.ts continues to grow; slice extraction is a cross-cutting cleanup best done between milestones, not inside a feature slice.
- **`unitToRow` cross-screen extraction** (M4/M5 review) — same reasoning.

## Self-review notes

- **Spec coverage vs game spec §13:** Serum (SR) locked as currency. Source: daily faucet (spec §13 lists "daily" as a source). Sink: Breed (spec §13 lists breeding as a sink). Other sources (Occupations, Incursion rewards, Vat outputs) and sinks (Harvests, gear, Vivarium upgrades, consumables, late Sequencer) deferred to their respective slices.
- **Spec coverage vs M4 TODO:** M4 left `// M6: replace or augment the Breed cap with Serum cost`. M6a closes this by augmenting (keeping the cap + adding SR cost).
- **Type consistency:** `SERUM_STARTING_BALANCE`, `SERUM_DAILY_FAUCET`, `BREED_COST_SERUM`, `serum` — all defined once, consumed identically across state + UI.
- **Isolation of concerns:** Constants in `src/state/serum.ts` (parity with harvest/breed/failsafe/incursion). Store mutations in `colony.ts` actions. UI in one new component (`SerumBadge`) + minor edits to `BreedButton` + `Breed.tsx` + `App.tsx`. No sim-layer changes (economy is pure state, not simulation math).
- **Anti-meta invariants (§14):** All preserved; noted per-invariant above.
- **Compatibility with M5:** Nothing about Incursion resolution, front state, or `activeIncursion` changes. All 272 M5 tests continue to pass.
- **Storage:** key `morulium/colony/v1` unchanged. v5 migration is additive; a legacy v1 save upgrades through all four prior branches AND the new v5 branch.
- **Non-determinism budget:** `src/state/colony.ts` may use `Date.now()` (via `todayLocalKey` in the day-rollover check). No new `Date.now()` calls in `src/ui/*` at module load. No `Math.random`.
- **No new sim/render/RNG surface.** M6a is purely economy — no substream primes, no new sim modules.
