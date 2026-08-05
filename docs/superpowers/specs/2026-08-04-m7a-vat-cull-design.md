# Morulium — M7a Vat + Cull Design (v0.1)

**Date:** 2026-08-04
**Working directory:** `/Users/cnote/projects/morulium/`
**Remote:** `https://github.com/nicojitters/morulium` (public)
**Live:** `https://morulium.com` (Vercel, auto-deploys from main)
**Prior milestone:** M6c Occupations + Flare — merged. This spec covers **M7a: The Vat + Cull** — the first slice of M7 (game spec §12). M7b (Vivarium buildings + Colony cap) and M7c (global tuning pass) remain separate sub-milestones.

## Purpose

Give the player a way to convert quantity into quality. M1–M6 built the acquisition + combat + occupation loop; over hours of play the Colony fills with mid-tier specimens that no longer earn their keep. The Vat is a fusion chamber: 10 same-tier specimens go in, 1 (usually higher-tier) specimen comes out. The `culled` flag + Cull All mass action let the player triage over time and then sweep in one click.

M7a ships when: opening morulium.com shows a 4th nav tab "Vat"; the Vat screen groups Colony units by tier with per-tier "Vat these 10" buttons; picking exactly 10 same-tier units and clicking Vat produces 1 pristine output (usually one tier higher, occasionally two, sometimes the same); the Colony screen lets the player toggle a `[Cull]` flag on any unit; the Vat's "Cull All" button sweeps all culled-and-eligible units in floor(N/10) batches per tier. Nothing about existing Colony/Breed/Incursion mechanics changes.

## Scope decomposition context

M7 was split into three slices during M7 brainstorming: **M7a Vat + Cull** (this spec), **M7b Vivarium buildings + Colony cap** (Barracks + Medbay + hard unit limit), **M7c Global tuning pass** (measurement-driven calibration of thresholds/rates). Each ships as an MVP-completing slice.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | **The Vat 10→1 fusion + Unit.culled flag + Cull All mass action.** Vat lives on a new 4th nav tab; culled toggle lives on the Colony screen's SpecimenCards. | Complete gameplay slice — acquisition to disposal loop closes. |
| Batch size | **`VAT_INPUT_SIZE = 10`** per single Vat operation; **`VAT_MAX_BATCH_SIZE = 10`** total operations per Cull All click (max 100 units shredded, matching game spec §12) | Simplest interpretation. Player selects exactly 10 same-tier units → 1 output. Cull All batches up to 10 ops in a single click. |
| Tier bump probability | Per input tier: **90% bump-1 tier + 10% no-bump (stays same)**. Progenitor: **100% no-bump** (already at top). No 2-tier bumps in M7a. | Predictable ladder. Player invests 10 Baselines expecting a Strain, gets one 90% of the time. Doesn't trivially manufacture Chimera+ (spec §14 "the tail is aberration-driven"). |
| Output tier semantics | **Exact match to computed tier** — output genome must produce `computeRarity(g).tier === outputTier` under M5+ rarity rules | The Vat doesn't just declare a tier; the output's actual genome must qualify. Rejection-sample via `rollGenomeOfExactTier`. |
| Output genome | **Fresh weighted-random roll (rejection sampling until tier matches)** | Deterministic given (outputId, tier). Ignores donor genomes entirely. Output is a NEW pristine specimen. Preserves "output is always pristine" (game spec §12). |
| Genome inheritance | **None.** Donor genomes are discarded. Output has no `parentIds` (still `null`), no wear (`{}`), no injury, full rest. | Same as Decant + Failsafe outputs. Pristine origin. |
| RNG substream | **`VAT_SUBSTREAM_PRIME = 1_000_331`.** Seed for the bump roll: `outputId * VAT_SUBSTREAM_PRIME`. Seed for the genome rejection-sampling loop: `outputId * VAT_SUBSTREAM_PRIME + 100 + offset` (offset iterates 0..999). | Distinct from BREED (1_000_033), FAILSAFE (1_000_003), INCURSION (1_000_099), INJURY (1_000_213). Small primes near 10^6 pattern. `+100+offset` separates bump roll from genome-search rolls so they don't collide at offset 0. |
| Rejection-sampling cap | **`MAX_ATTEMPTS = 1000`** — defense-in-depth guard matching Failsafe's cap | Won't trigger in practice for any of the 5 real tiers (all reachable via `rollGenome`), but the guard prevents infinite loops if the alleles table is ever tuned unreachable-heavy. |
| Donor validation | **Exactly 10 distinct ids; all same computed tier; none injured; none garrisoned; none missing** | Six guards. Non-culled + culled units are BOTH eligible — the `culled` flag is a triage suggestion, not a hard filter. |
| Guard order (fixed) | **batch size → distinct ids → missing unit → injured donor → garrisoned donor → same-tier check → compute** | Cheap checks first, cross-front lookup last. |
| `culled` field | **`readonly culled: boolean` on Unit** — default `false` for new/migrated units | Boolean flag. Migrated units backfill to `false`. `toggleCulled(unitId)` flips it. |
| Cull toggle placement | **Only on Colony screen's SpecimenCards.** Breed + Incursion pickers do NOT show the toggle. | Colony is the "triage" screen; other screens are action screens. Keeps clutter localized. |
| Cull toggle UI | **A small `[Cull]` / `[Uncull]` button rendered on the SpecimenCard footer** in the Colony screen. Toggle updates the store via `toggleCulled(unitId)`. Card gains a subtle red border + red `✗` badge + `data-culled="true"` when flagged. | Direct, visible, revertible. |
| Cull All batch semantics | **Groups all `culled=true && eligible` units by tier; for each tier with ≥10 such units, runs `floor(N/10)` Vat operations back-to-back**. Total ops capped at `VAT_MAX_BATCH_SIZE = 10` across all tiers. | Fast triage sweep. Culled Baselines: 23 → 2 ops (20 shredded, 2 outputs), 3 remaining culled. Cap prevents unbounded work per click. |
| Cull All rounding | **Sub-10 tier remainders stay culled** for the next sweep | Player builds culled backlog over time; Cull All never partially processes a tier. |
| Vat screen UI | **New 4th nav tab: "Vat"** — Colony / Breed / Incursion / Vat. Per-tier groups (grid + count + "Vat these 10" button). Cull All at the top. Ineligible-count footer for transparency. | Clean separation from other screens. No modal state. |
| Selection model | **Per-tier local `Set<number>`** in the Vat screen — clicking a card toggles its id in that tier's set. Per-tier "Vat these 10" button enables only when size === 10 exactly. | Explicit selection UX; can't accidentally cross tier boundaries. |
| Ineligibility handling | **Garrisoned + injured units are HIDDEN from the Vat screen's tier groups.** A footer shows `"N hidden (garrisoned/injured)"` for transparency. | Prevents the player from selecting a unit that would throw at run time. |
| Highlight | **Reuse existing `lastDecantedId`** — the newly-produced Vat output shows briefly with the highlight ring on next screen visit | Same behavior as decant + breed outputs. No new highlight machinery. |
| Loop isolation | **`runVatOperation` does NOT touch `serum`, `stims`, `droughtCount`, `harvestsToday`, `breedsToday`.** Only `units`, `nextId`, `lastDecantedId` mutate. | Vat is orthogonal to economy and combat loops. |
| Cross-cutting garrison-tick | **`applyGarrisonTick` + `checkFlareTimers` run at the start of `runVatOperation` and `toggleCulled`** — M6c pattern for uniformity | Every state-mutating action pays the tick prologue. Rapid `toggleCulled` clicks credit at-most-whole-hour SR each due to floor + fractional retention (M6c invariant). |
| Failsafe interaction | **`runVatOperation` does NOT touch `droughtCount`.** Vat outputs are pristine but don't reset the Failsafe pity. | Failsafe is a Harvest-loop concept. If the player wants a guaranteed Chimera+, they still Harvest. Vat CAN produce Chimera/Progenitor via bump, but doesn't shortcut the drought counter. |
| Persistence | **Bump `version: 8`, chain new `if (from < 8)` branch** — backfills `culled: false` on every existing unit | Same convention. Storage key stays `morulium/colony/v1`. |
| Store shape change | **No new persisted store fields.** All Vat logic reads existing state. `Unit.culled` is the only shape change. | Minimal footprint. |

## Anti-meta invariant check (game spec §14)

M7a reinforces one invariant and doesn't disturb the rest:

1. **Every gain has a cost** — reinforced. The Vat converts 10 units into 1; the tier bump is a genuine gain but at 10× cost.
2. **No master stat** — untouched.
3. **Abilities compete** — untouched.
4. **Missions demand different profiles** — untouched. Vat outputs are pristine but still need to pass Incursion coverage independently.
5. **Information is hidden** — Vat bump probabilities are VISIBLE (spec §12: explicit game mechanic). Rarity thresholds and mission thresholds stay hidden. No new hidden info leaks.
6. **Rest forces rotation** — untouched.
7. **Convergence is taxed** — untouched (wear semantics unchanged; Vat outputs are pristine, so wear doesn't factor).
8. **Rarity ≠ power** — untouched. The Vat bumps TIER, not raw combat power. A Progenitor from the Vat has the same "rarity ≠ combat effectiveness" property as one from Harvest.
9. **The tail is aberration-driven** — reinforced. The Vat produces the top tail *without* trivializing it: 10 Baselines → most often Strain (still baseline-tier combat performance mostly), 10 Chimeras → 90% Progenitor. Aberration mechanics (per game spec §5) still gate the actual expression of top-tier traits during genome generation, so Vat outputs feel earned via the genome roll, not gifted.

## Data model

**Unit shape after M7a** (extending M6b):

```ts
export interface Unit {
  // existing (M3a/M3b/M4/M6b):
  readonly id: number;
  readonly seed: number;
  readonly decantedAt: number;
  readonly genome: Genome;
  readonly generation: number;
  readonly parentIds: readonly [number, number] | null;
  readonly wear: Readonly<Record<string, number>>;
  readonly restCurrent: number;
  readonly injuredUntil: number | null;

  // NEW in M7a:
  readonly culled: boolean;
}
```

**Colony store shape unchanged.** No new persisted fields.

## Sim modules

### `src/sim/vat.ts` (new)

```ts
import type { Genome, Tier } from './types';
import { createRng } from './rng';
import { rollGenome } from './genome';
import { computeRarity } from './rarity';
import {
  VAT_INPUT_SIZE,
  VAT_SUBSTREAM_PRIME,
  VAT_TIER_BUMP_TABLE,
} from '../state/vat';

const TIER_LADDER: readonly Tier[] = ['baseline', 'strain', 'mutant', 'chimera', 'progenitor'];
const MAX_ATTEMPTS = 1000;

export interface VatResolution {
  readonly donorIds: readonly [number, number, number, number, number, number, number, number, number, number];
  readonly outputId: number;
  readonly outputGenome: Genome;
  readonly inputTier: Tier;
  readonly outputTier: Tier;
  readonly bumpAmount: 0 | 1 | 2;
}

/**
 * Roll a genome whose computed rarity tier === targetTier via rejection sampling.
 * Distinct from Failsafe's `rollGenomeAtLeast` (which uses tierAtLeast).
 * Deterministic given (subseedBase, targetTier).
 * Throws if the 1000-attempt cap is hit — defense in depth for future tuning.
 */
function rollGenomeOfExactTier(subseedBase: number, targetTier: Tier): Genome {
  for (let offset = 0; offset < MAX_ATTEMPTS; offset++) {
    const g = rollGenome(createRng(subseedBase + offset));
    if (computeRarity(g).tier === targetTier) return g;
  }
  throw new Error(`rollGenomeOfExactTier: exhausted ${MAX_ATTEMPTS} attempts for tier ${targetTier}`);
}

/**
 * Resolve a single 10→1 Vat operation.
 *
 * Steps:
 *   1. Bump roll via createRng(outputId * VAT_SUBSTREAM_PRIME).
 *      Draw r = rng.next(). Compare against VAT_TIER_BUMP_TABLE[inputTier]:
 *      r < bump0 → bump=0; else r < bump0+bump1 → bump=1; else bump=2.
 *   2. outputTier = TIER_LADDER[min(inputTierIndex + bumpAmount, 4)].
 *   3. Genome via rollGenomeOfExactTier at seed
 *      outputId * VAT_SUBSTREAM_PRIME + 100 (offset separates from bump roll).
 *   4. Return { donorIds, outputId, outputGenome, inputTier, outputTier, bumpAmount }.
 *
 * Fully deterministic given (donorIds, outputId, inputTier).
 */
export function resolveVatOperation(
  donorIds: readonly [number, number, number, number, number, number, number, number, number, number],
  outputId: number,
  inputTier: Tier,
): VatResolution;
```

**Pure module.** No `Date.now`, no `Math.random`, no side effects. Caller (state layer) validates donors + tier before calling; `resolveVatOperation` trusts its inputs.

### `src/state/vat.ts` (new — constants + tier bump table)

```ts
import type { Tier } from '../sim/types';

export const VAT_INPUT_SIZE = 10 as const;
export const VAT_MAX_BATCH_SIZE = 10 as const;      // max ops per Cull All click
export const VAT_SUBSTREAM_PRIME = 1_000_331 as const;

/**
 * Per input tier: probability of bumping by 0, 1, or 2 tiers.
 * Rows sum to 1.0 (asserted in tests).
 * Progenitor always stays Progenitor (can't bump above the ceiling).
 */
export const VAT_TIER_BUMP_TABLE: Readonly<Record<Tier, { bump0: number; bump1: number; bump2: number }>> = {
  baseline:   { bump0: 0.10, bump1: 0.90, bump2: 0.00 },
  strain:     { bump0: 0.10, bump1: 0.90, bump2: 0.00 },
  mutant:     { bump0: 0.10, bump1: 0.90, bump2: 0.00 },
  chimera:    { bump0: 0.10, bump1: 0.90, bump2: 0.00 },
  progenitor: { bump0: 1.00, bump1: 0.00, bump2: 0.00 },
};
```

## State module additions

### `src/state/colony.ts` (extensions)

**Two new actions:**

```ts
runVatOperation: (donorIds: readonly number[]) => Unit;
toggleCulled: (unitId: number) => void;
```

**`runVatOperation(donorIds)` logic:**

```ts
runVatOperation: (donorIds) => {
  const state = get();
  const now = Date.now();
  const flareDelta = checkFlareTimers(state, now);
  const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
  const s = { ...state, ...flareDelta, ...tickDelta };

  // Validate batch size
  if (donorIds.length !== VAT_INPUT_SIZE) {
    throw new Error(`runVatOperation: exactly ${VAT_INPUT_SIZE} donors required, got ${donorIds.length}`);
  }
  const unique = new Set(donorIds);
  if (unique.size !== VAT_INPUT_SIZE) {
    throw new Error('runVatOperation: donor ids must be distinct');
  }

  // Look up donors + validate eligibility
  const donors: Unit[] = [];
  const garrisonedIds = new Set(
    (Object.keys(s.fronts) as FrontId[]).flatMap((fid) => s.fronts[fid].garrison),
  );
  for (const id of donorIds) {
    const u = s.units.find((u) => u.id === id);
    if (!u) throw new Error(`runVatOperation: donor ${id} not found`);
    if (u.injuredUntil !== null && u.injuredUntil > now) {
      throw new Error(`runVatOperation: donor ${id} is injured`);
    }
    if (garrisonedIds.has(id)) {
      throw new Error(`runVatOperation: donor ${id} is garrisoned`);
    }
    donors.push(u);
  }

  // Same-tier check
  const tiers = donors.map((u) => computeRarity(u.genome).tier);
  const inputTier = tiers[0]!;
  if (!tiers.every((t) => t === inputTier)) {
    throw new Error(`runVatOperation: donors must share the same tier (got ${[...new Set(tiers)].join(', ')})`);
  }

  // Compute resolution
  const outputId = s.nextId;
  const donorTuple = donorIds as readonly [number, number, number, number, number, number, number, number, number, number];
  const resolution = resolveVatOperation(donorTuple, outputId, inputTier);

  // Build pristine output Unit
  const output: Unit = {
    id: outputId,
    seed: outputId,
    decantedAt: now,
    genome: resolution.outputGenome,
    generation: 0,
    parentIds: null,
    wear: {},
    restCurrent: REST_MAX,
    injuredUntil: null,
    culled: false,
  };

  // Remove donors + append output (atomic set)
  const donorIdSet = new Set(donorIds);
  const newUnits = s.units.filter((u) => !donorIdSet.has(u.id));
  newUnits.push(output);

  set({
    ...flareDelta,
    ...tickDelta,
    units: newUnits,
    nextId: outputId + 1,
    lastDecantedId: outputId,
  });

  return output;
},
```

**Guard order (fixed):** batch size → distinct ids → missing unit → injured donor → garrisoned donor → same-tier check → compute.

**`toggleCulled(unitId)` logic:**

```ts
toggleCulled: (unitId) => {
  const state = get();
  const now = Date.now();
  const flareDelta = checkFlareTimers(state, now);
  const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
  const s = { ...state, ...flareDelta, ...tickDelta };

  const unit = s.units.find((u) => u.id === unitId);
  if (!unit) throw new Error(`toggleCulled: unit ${unitId} not found`);

  set({
    ...flareDelta,
    ...tickDelta,
    units: s.units.map((u) => u.id === unitId ? { ...u, culled: !u.culled } : u),
  });
},
```

Cross-cutting garrison tick prologue matches every other state-mutating action from M6c.

**`decant()` and `breed()` mint new units with `culled: false`** (add the field to the Unit construction in both actions).

**Persist v8 migration** (chained after v1–v7):

```ts
if (from < 8) {
  s = {
    ...s,
    units: s.units.map((u) => ({
      ...u,
      culled: (u as Partial<Unit>).culled ?? false,
    })),
  };
}
```

**`partialize` unchanged** — no new persisted store field. `Unit.culled` lives inside `units[]`, already persisted.

**`launchIncursion`, `dismissIncursion`, `buyStim`, `assignToGarrison`, `removeFromGarrison`, `decant`, `breed` — all unchanged** except for adding `culled: false` to Unit construction sites in `decant` and `breed`.

## UI

### `src/ui/components/SpecimenCard.tsx` (extend)

Add optional `culled?: boolean` prop and optional `onToggleCull?: () => void` prop. When `culled === true`, render a small red `✗` badge in the corner and apply `styles.culledCardOverlay` (subtle red border tint). When `onToggleCull` is provided, render a `[Cull]` / `[Uncull]` button in the card footer. `data-culled="true"` on the card container.

**Only the Colony screen wires the `onToggleCull` prop.** Breed + Incursion + Vat pickers pass `culled` (visual) but NOT `onToggleCull` (no toggle button in those flows). SpecimenCard renders the badge visual whenever `culled` is true regardless of whether the toggle is wired.

Style additions in `src/ui/styles.ts`:
- `culledCardOverlay`: subtle red border tint (`border-color: #dc2626` at low opacity).
- `culledBadge`: small red `✗` icon top-right corner.
- `cullToggleButton`: small text button in card footer, styled unobtrusively.

### `src/ui/screens/Colony.tsx` (extend)

Wire `onToggleCull={() => useColonyStore.getState().toggleCulled(unit.id)}` + `culled={unit.culled}` on every SpecimenCard in the grid. No other Colony changes.

### `src/ui/screens/Breed.tsx` (extend, minor)

Pass `culled={unit.culled}` to every picker SpecimenCard (visual only — no toggle). Culled units remain PICKABLE as breed parents (orthogonal — same as garrisoned/injured units in the Breed picker).

### `src/ui/screens/Incursion.tsx` (extend, minor)

Same as Breed — pass `culled` (visual), don't wire toggle. Culled units remain PICKABLE as team members (orthogonal).

### `src/ui/screens/Vat.tsx` (new)

**Structure:**

```tsx
<main style={styles.page}>
  <h1>Morulium</h1>
  <p>The Vat — 10 same-tier specimens → 1</p>

  <CullAllBar />

  {ineligibleCount > 0 && (
    <div>Ineligible (garrisoned/injured): {ineligibleCount} hidden</div>
  )}

  {eligibleTiers.map((tier) => (
    <VatTierGroup tier={tier} units={eligibleByTier[tier]} />
  ))}

  {totalEligible === 0 && <EmptyState />}
</main>
```

**Local state:**
- `selectionByTier: Record<Tier, Set<number>>` — per-tier selection sets.

**`VatTierGroup`** renders:
- Header: `{tierLabel} — {eligibleCount} eligible, {culledCount} culled`
- Button: `Vat these 10 ({selection.size}/10)` — enabled only when `selection.size === 10`
- Grid of SpecimenCards — clicking a card toggles its id in `selectionByTier[tier]`.

**`Vat these 10` click handler:**
```ts
const selected = [...selectionByTier[tier]];
useColonyStore.getState().runVatOperation(selected);
setSelectionByTier({ ...selectionByTier, [tier]: new Set() });
```

**Cull All logic:**
```ts
function culledEligibleByTier(): Record<Tier, number[]> {
  // group culled=true && eligible units by their computed tier
}

const batches = TIERS.map((tier) => ({
  tier,
  ids: culledEligibleByTier[tier].slice(0, Math.floor(culledEligibleByTier[tier].length / 10) * 10),
}));

const totalOps = batches.reduce((n, b) => n + b.ids.length / 10, 0);
const cappedOps = Math.min(totalOps, VAT_MAX_BATCH_SIZE);
// (cap distribution: fill batches in tier order until cappedOps reached)

function onCullAll(): void {
  let opsRemaining = VAT_MAX_BATCH_SIZE;
  for (const { tier, ids } of batches) {
    while (ids.length >= 10 && opsRemaining > 0) {
      const chunk = ids.splice(0, 10);
      useColonyStore.getState().runVatOperation(chunk);
      opsRemaining--;
    }
  }
}
```

Cull All button:
- Disabled when `totalOps === 0`. Label: `"Cull All (no batches ready)"`.
- Enabled when `totalOps > 0`. Label: `"Cull All ({cappedOps} ops, {cappedOps*10} units)"`.

`data-testid`s:
- `vat-cull-all-button`
- `vat-tier-group-{tier}`
- `vat-tier-run-button-{tier}`
- `vat-tier-count-{tier}`
- `vat-ineligible-count`
- `vat-empty-state`

**No `now` clock needed** — no time-based UI elements on Vat screen. Injured/garrisoned filtering happens once per render from the store state.

### `src/App.tsx` (extend nav)

Widen Tab union to `'colony' | 'breed' | 'incursion' | 'vat'`. Add fourth nav button `data-testid="nav-tab-vat"` labeled "Vat". Same active-tab underline pattern.

## Testing plan

**Sim (`tests/sim/`):**

- `vat.test.ts` (new):
  - Constants (VAT_INPUT_SIZE=10, VAT_MAX_BATCH_SIZE=10, VAT_SUBSTREAM_PRIME=1_000_331).
  - `VAT_TIER_BUMP_TABLE` completeness: 5 tiers present, each row sums to 1.0 (invariant test).
  - `resolveVatOperation` determinism: same `(donorIds, outputId, inputTier)` returns identical resolution.
  - Bump distribution: 100 seeded outputIds with inputTier=Baseline, most (~90) land on bump=1 (Strain). Wide tolerance (75-100 bump=1) avoids flakiness.
  - Progenitor input: bump is always 0 across many seeds.
  - `rollGenomeOfExactTier` returns genome of exactly the requested tier for each of the 5 tiers (reachability check).
  - VatResolution shape validation: donorIds length 10, outputId matches, bumpAmount ∈ {0,1,2}, outputTier consistent with inputTier + bumpAmount.

**State (`tests/state/`):**

- `vat.test.ts` (new): constants + table completeness + row sums.

- `colony.test.ts` (extend):
  - `runVatOperation` throws on wrong donor count (9 or 11 ids).
  - `runVatOperation` throws on duplicate ids.
  - `runVatOperation` throws on missing unit id.
  - `runVatOperation` throws on injured donor.
  - `runVatOperation` throws on garrisoned donor.
  - `runVatOperation` throws on mixed tiers.
  - Success: removes exactly 10 donors, appends 1 output, `nextId` advances by 1, `lastDecantedId` set.
  - Output Unit shape: pristine (generation=0, parentIds=null, wear={}, restCurrent=REST_MAX, injuredUntil=null, culled=false).
  - Determinism: same (nextId, donor set, inputTier) → same output tier + genome.
  - Loop isolation: does NOT touch serum/stims/droughtCount/harvestsToday/breedsToday.
  - Cross-cutting: applyGarrisonTick + checkFlareTimers run at start (test: garrison income credits when a Vat op fires).
  - `toggleCulled` flips flag; second call flips back.
  - `toggleCulled` throws on missing unit.
  - `toggleCulled` cross-cutting garrison tick fires.
  - `decant()` + `breed()` mint new units with `culled: false`.

- `persist.test.ts` (extend):
  - v7 → v8 migration backfills `culled: false` on every unit.
  - v1 → v8 chained migration passes through all 7 branches.
  - Vat op + reload: donors gone, output persists with full pristine shape (including culled=false).
  - `culled` flag persists per-unit.
  - `parsed.version === 8` after any current-store write.

**UI (`tests/ui/`):**

- `SpecimenCard.test.tsx` (extend):
  - `culled` prop absent OR false → no red badge, no `data-culled`.
  - `culled=true` → red badge visible, `data-culled="true"` on card.
  - `onToggleCull` handler fires on cull button click.
  - `onToggleCull` prop absent → no cull button rendered.

- `Vat.test.tsx` (new):
  - Empty state when Colony has 0 eligible units.
  - Per-tier grid renders eligible units grouped by tier.
  - Ineligible count footer shows `N hidden` when garrisoned/injured units exist.
  - Clicking a card toggles selection.
  - "Vat these 10" button disabled when selection.size !== 10.
  - "Vat these 10" click calls `runVatOperation`; selection clears; new output appears.
  - "Cull All" button disabled with 0 batches; enabled with label `(K ops, K×10 units)` otherwise.
  - "Cull All" click runs floor(N/10) ops per tier, capped at VAT_MAX_BATCH_SIZE.
  - `data-culled="true"` on culled cards in the Vat grid.

- `Colony.test.tsx` (extend):
  - Colony grid shows the cull toggle button.
  - Toggle click flips the store's `culled` flag; card visual updates.

- `Breed.test.tsx` + `Incursion.test.tsx` (extend, minor):
  - Cards in those pickers do NOT show the cull toggle button.
  - Culled units still pickable for breeding (orthogonal — the flag is a triage suggestion, not a hard gate).
  - Culled units still pickable for Incursion teams (orthogonal — same rationale). Garrisoned + injured units remain UNPICKABLE per M6b/M6c; culled is deliberately weaker than either of those gates.

- `App.test.tsx` (extend):
  - Nav shows 4 tabs (Colony, Breed, Incursion, Vat).
  - Clicking Vat tab switches to the Vat screen.

**Expected count:** 418 → ~475 (~57 new tests).

**Dev-server smoke:**
- Fresh app → 4 nav tabs visible. Vat tab shows empty state.
- Harvest ~15 units → most will be Baseline. Vat screen groups them under "Baseline — 15 eligible, 0 culled".
- Colony screen: cull 12 units via the `[Cull]` toggle on their SpecimenCards. Return to Vat.
- Vat: "Cull All (1 op, 10 units)" button enabled. Click → 10 culled Baselines removed, 1 output appears (usually Strain per 90% bump).
- 2 culled Baselines remain (below threshold). Cull All is disabled again.
- Select 10 non-culled Baselines individually → "Vat these 10" enables → click → another op.
- Try to mix Baseline + Strain in a selection → the buttons are per-tier so can't cross tiers.
- Garrison a unit at a captured front. Confirm it's hidden from the Vat screen (ineligibility footer count increments).
- Reload → outputs persist. Culled flags persist. Vat selection state does NOT persist (local UI only).

## Deferred

- **Player-defined cull predicates** — e.g. "auto-cull all Baselines with wear > 20". M7a uses a plain boolean flag; predicate rules are richer UX for a future milestone.
- **Vat rarity weighting on partial donor sets** — game spec §12 mentions "output rarity weighted on input rarity"; M7a interprets this as "input rarity determines the tier ladder position." A future refinement could weight by the exact rarity SCORES (not just tier bucket).
- **Donor abilities/aberration inheritance** — M7a's output genome is a fresh roll, ignoring donor aberration content. A future refinement could give the output a small aberration boost per donor aberration expressed.
- **Cull All confirmation modal** — currently one-click executes. Could add a preview modal for accident prevention.
- **Vat animation** — the Vat operation currently completes atomically with the highlight ring. A future polish pass could add a visual "shredding" animation.
- **Batch UI on Vat screen** — currently player selects 10 at a time and clicks a button. Could add a "select N in this tier" quick-picker.
- **Vat output flavor text** — a small message describing the output ("The chamber hums, and something new steps out.").
- **Rarity-score weighting** for the tier bump probability — currently all Baselines are equally likely to promote to Strain regardless of their exact rarity scores.
- **`unitToRow` / `restStateFor` / `garrisonedAtFor` extraction to shared UI utility** — M4/M5/M6b/M6c tech debt.
- **Colony store slice split** — same tech debt.

## Self-review notes

- **Spec coverage vs game spec §12:** 10 same-rarity → 1 → check. Output rarity weighted on input rarity → check (tier bump table). Max 100 shredded at once → check (`VAT_MAX_BATCH_SIZE = 10 × VAT_INPUT_SIZE = 10 = 100`). Donors permanently retired → check (removed from `units[]`). Output always pristine → check (Unit assembled with all pristine defaults). Player-defined Cull rules → deferred (M7a uses a plain boolean). Cull All sweep → check.
- **Anti-meta invariant coverage:** Invariant #1 (every gain has a cost) reinforced. Invariant #9 (the tail is aberration-driven) reinforced — Vat produces top-tier via genome roll requiring exact tier match, so aberration mechanics still gate expression.
- **Type consistency:** `VAT_INPUT_SIZE`, `VAT_MAX_BATCH_SIZE`, `VAT_SUBSTREAM_PRIME`, `VAT_TIER_BUMP_TABLE`, `resolveVatOperation`, `rollGenomeOfExactTier`, `VatResolution`, `culled`, `runVatOperation`, `toggleCulled` — all defined once, consumed identically.
- **Determinism:** `resolveVatOperation` is fully deterministic given (donorIds, outputId, inputTier). The bump roll and the genome-search rolls use offset separation (+100+offset) to prevent seed collision.
- **RNG substream isolation:** `VAT_SUBSTREAM_PRIME = 1_000_331` distinct from BREED (1_000_033), FAILSAFE (1_000_003), INCURSION (1_000_099), INJURY (1_000_213).
- **Compatibility with M6c:** Every existing action uses the `applyGarrisonTick` + `checkFlareTimers` prologue; `runVatOperation` and `toggleCulled` follow the same pattern. Garrisoned units cannot be Vat'd (guard). Injured units cannot be Vat'd (guard).
- **Compatibility with M6b:** `runVatOperation` doesn't touch rest/injury/Stim state. Injured donors are blocked at the guard; garrisoned donors are blocked at the guard.
- **Compatibility with M6a:** `runVatOperation` doesn't touch `serum`. Vat is orthogonal to economy.
- **Compatibility with M5:** `runVatOperation` doesn't touch `activeIncursion`, `fronts`, or `hardening`. Vat is orthogonal to Incursions.
- **Compatibility with M4:** Vat output is pristine (`generation: 0, parentIds: null, wear: {}`). No breeding lineage from Vat outputs.
- **Storage:** key `morulium/colony/v1` unchanged. v8 migration adds `culled: false` per unit; existing UI + state tests need fixture updates (~20 inline Unit fixtures across the same 6 test files that got updated in M4/M6b) — TS strict enforces at compile time.
- **Non-determinism budget:** `Date.now()` in `runVatOperation` (for `decantedAt` on output + garrison tick prologue). No `Math.random` — Vat uses `createRng`.
- **Failsafe interaction:** Vat outputs are pristine but do NOT reset `droughtCount`. Failsafe stays a Harvest-loop pity.
- **Injured/garrisoned-in-Vat semantics:** hidden from Vat screen entirely (informational footer counts them). Prevents accidental attempts + preserves the "each Vat op is a triage act" texture.
