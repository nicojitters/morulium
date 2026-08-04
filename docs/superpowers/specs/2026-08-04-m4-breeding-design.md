# Morulium — M4 Breeding Design (v0.1)

**Date:** 2026-08-04
**Working directory:** `/Users/cnote/projects/morulium/`
**Remote:** `https://github.com/nicojitters/morulium` (public)
**Live:** `https://morulium.com` (Vercel, auto-deploys from main)
**Prior milestone:** M3b Harvest + Failsafe — merged. This spec covers **M4: Breeding** (game spec §6 in full): Mendelian inheritance, per-allele mutation, per-locus lineage wear, generation tracking, a Breed screen, and lineage on the specimen card.

## Purpose

Add the second creature-acquisition loop. M3a/M3b shipped the Harvest→Decant loop; M4 opens the Breed loop — the player picks two Colony parents, spends one of a small daily budget, and gets an offspring genome via 50/50 Mendelian inheritance with a small per-allele mutation chance and per-locus stat wear that accumulates down bred lineages.

M4 ships when: opening morulium.com and navigating to Breed lets me pick two distinct parents, hit Confirm, and see a new specimen appear in the Colony with `Gen N · from #A × #B` on the card; hitting 3 Breeds/day disables the Breed button with a countdown to midnight (mirroring Harvest); a chained bred lineage visibly loses stat output on wear-affected loci while its rarity and sprite stay unchanged; and the Colony screen is unaffected by any of it (Harvest, Failsafe, Decant loop continue working exactly as before).

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | **M4 = Breed sim + Breed screen + lineage on card.** Sequencer (pre-Decant genome preview) and Vat fusion stay deferred. | Both are separate systems (M4 is genetics + wear; Vat is M7; Sequencer is late-unlock). |
| Inheritance | **Mendelian, 50/50 per parent, every locus, quantitative + qualitative alike.** Game spec §6. | Directly locked by the game spec. |
| Mutation | **Per-allele independent gate, weighted re-roll via `drawWeight` on hit.** Two independent rolls per locus. | Game spec §6 explicit. |
| Mutation rate | **`MUTATION_RATE = 0.015`** (1.5% per allele) — a tunable constant, not scattered magic numbers. | Middle of the spec's "start ~1–2%" band. `[CALIBRATING]` — future verify harness may retune. |
| Generation | **`max(pA.gen, pB.gen) + 1`.** Harvested = Gen 0. | Game spec §6. |
| Wear granularity | **Scalar per locus, stored as `Record<locusId, number>` with absent-key semantics == 0.** | Game spec §6 "wear is stored per-slot, not per-allele." Uniform data structure, no throws on missing key. |
| Wear function | **Linear:** `wearMultiplier(w) = max(WEAR_FLOOR, 1 - PER_GEN_WEAR * w)` with `PER_GEN_WEAR = 0.02`, `WEAR_FLOOR = 0.60`. | User ruling. Simple, tunable; hits 60% floor exactly at wearCount = 20. Resolves the game spec §15 OPEN item. |
| Wear accumulation | **`wear[locus] = (pA.wear[locus] ?? 0) + (pB.wear[locus] ?? 0) + 1`** for every locus not mutated in the child. Mutated loci → 0 (omitted from the map). | Bred child adds one generation of wear on that slot; mutation resets. Preserves invariant #7 (convergence taxed). |
| Wear effect on stats | **`computeStats` multiplies each locus's contribution by `wearMultiplier(wear[locus])` before summing.** Quantitative loci: multiplier applies to both alleles' summed `statDeltas`. Qualitative loci: multiplier applies to the expressed allele's `statDeltas`. | Wear affects stats only, never rarity. §6 explicit. |
| Origin flag | **Derived: `parentIds != null` ⇒ bred; `null` ⇒ pristine.** No separate `isPristine` flag. | Game spec §6 "one source of truth." Pristine ⇒ `wear: {}`, verified structurally. |
| Bred output shape | **Live specimen immediately.** No Morula intermediate. | User ruling. Bred is deliberate; the reveal IS the payoff. Morula step is Harvest-specific ceremony. |
| Preview before Confirm | **None — confirm blind.** | User ruling. Preserves invariant #5 (hidden info). Player commits, then sees the result. |
| Same-parent breeding | **Blocked in UI + store throws for defense-in-depth.** | User ruling. Prevents degenerate "clone with 50/50 recomb" meta. |
| Failsafe/drought interaction | **Breeding does NOT feed `droughtCount`.** | Drought is Harvest-loop pity; breeding has its own economics. Keeps the two systems isolated. |
| Breed cap | **`DAILY_BREED_LIMIT = 3` per day, resets at local midnight.** Mirrors DAILY_HARVEST_LIMIT. | Game spec §6 explicit: "mirroring the Daily Harvest limiter." Not free-for-now — balance playtesting needs the constraint. |
| M6 hook | **`// M6: replace or augment the Breed cap with Serum cost`** comment left in `src/state/breed.ts`. | Spec §13 says breeding is a Serum sink. Placeholder cap holds the invariant until Serum lands. |
| Breed RNG substream | **`BREED_SUBSTREAM_PRIME = 1_000_033`** — seed = `childId * BREED_SUBSTREAM_PRIME`. | Analog to `FAILSAFE_SUBSTREAM_PRIME = 1_000_003`; distinct prime keeps breed rolls in a separate deterministic stream from Decants/Failsafe. |
| Storage schema | **Keep key `morulium/colony/v1`**, bump `version: 3` with a chained `migrate` (v1→v2→v3). | Same convention as M3b. Additive fields; migration is unambiguous. |
| UnitCard lineage | **`Gen N · Harvested`** for pristine; **`Gen N · from #A × #B`** for bred. No per-slot wear surfaced. | User ruling. Minimum useful lineage; hide wear per invariant #5. Wear reveals through gameplay (a bred squad's stats feel lower), not a UI indicator. |
| Nav pattern | **In-app tab switch in `App.tsx`** (`useState<'colony' \| 'breed'>`). Not React Router. | Two screens don't need routing; add routing at M5+ when there are 3+. Keeps M4 diff focused. |
| Breed screen picker | **Fill-first-empty click on Colony grid.** Click a filled parent-slot card to clear it. | Simplest UX; no popover. Fits the two-slot shape. |
| lastDecantedId reuse | **Reuse existing `lastDecantedId` for the bred-highlight animation.** Do NOT rename. | Bred and Decanted units both animate in the same way; renaming introduces churn. Optional M5+ cleanup. |

## Data model

**`Unit` shape after M4** (extending M3b):

```ts
export interface Unit {
  // existing:
  readonly id: number;
  readonly seed: number;
  readonly decantedAt: number;
  readonly genome: Genome;

  // NEW in M4:
  readonly generation: number;
  readonly parentIds: readonly [number, number] | null;
  readonly wear: Readonly<Record<string, number>>;
}
```

- `generation` — 0 for Harvested, `max(pA.gen, pB.gen) + 1` for bred.
- `parentIds` — `null` for pristine (Harvested / future Incursion drops / future Vat output); `[a, b]` for bred. Origin flag is derived from this field.
- `wear` — per-locus counter. `wear[locus]` absent ≡ `wear[locus] === 0`. Never throws on missing key.

**Store shape after M4** (extending M3b):

```ts
interface ColonyStore {
  // existing (M3a/M3b):
  units: Unit[];
  nextId: number;
  lastDecantedId: number | null;
  harvestsToday: number;
  harvestDayKey: string;
  droughtCount: number;

  // NEW in M4 (persisted):
  breedsToday: number;
  breedDayKey: string;

  // actions:
  decant: () => Unit;
  breed: (parentAId: number, parentBId: number) => Unit;   // NEW
  clearHighlight: () => void;
}
```

`droughtCount` untouched by `breed()`. `lastDecantedId` reused for the bred-unit highlight.

## Sim modules

### `src/sim/breed.ts`

```ts
export const MUTATION_RATE = 0.015 as const;

export interface BreedResult {
  readonly genome: Genome;
  readonly mutatedLoci: ReadonlySet<string>;
}

export function breedGenome(
  parentA: Genome,
  parentB: Genome,
  rng: SeededRng,
  mutationRate: number = MUTATION_RATE,
): BreedResult;
```

For each locus in `LOCI`:
1. Draw `rng.next() < 0.5 ? 0 : 1` twice — one per parent — selecting which of the parent's two alleles is inherited.
2. For each of the two inherited alleles, draw `rng.next() < mutationRate`. If true: mark this locus in `mutatedLoci`, re-roll that side via `weightedPick(pool, rng)` over the locus's `drawWeight` distribution.
3. Assemble `[aInherited, bInherited]` (possibly mutated) as the child's pair.

Return `{ genome, mutatedLoci }`. Fully deterministic given `(parentA, parentB, rng, mutationRate)`.

RNG-call order (fixed): for each locus, in `LOCI` iteration order: (1) parent-A side pick, (2) parent-B side pick, (3) mutation gate A, (4) if A mutates, weighted re-roll for A, (5) mutation gate B, (6) if B mutates, weighted re-roll for B. This order must not change without a migration/versioning story — reproducing an old bred unit's genome depends on it.

### `src/sim/wear.ts`

```ts
export const PER_GEN_WEAR = 0.02 as const;
export const WEAR_FLOOR = 0.60 as const;

export function wearMultiplier(wearCount: number): number {
  return Math.max(WEAR_FLOOR, 1 - PER_GEN_WEAR * wearCount);
}

export function nextWear(
  parentA: { wear: Readonly<Record<string, number>> },
  parentB: { wear: Readonly<Record<string, number>> },
  mutatedLoci: ReadonlySet<string>,
): Record<string, number>;
```

`nextWear` builds the child's wear map:
- For each locus present in `LOCI`:
  - If `mutatedLoci.has(locus)` → skip (child's wear at that locus is 0, absent-key).
  - Else → `(parentA.wear[locus] ?? 0) + (parentB.wear[locus] ?? 0) + 1`. Every non-mutated locus therefore ends up with `wear ≥ 1`, so the returned map has an entry for every non-mutated locus.

Result: a `Record<string, number>` with mutated loci omitted (absent-key ≡ 0). Two pristine parents breeding produces a child with `wear` = `{ locus1: 1, locus2: 1, ...}` on every non-mutated locus.

### `src/sim/stats.ts` (edit)

Current signature (M1): `computeStats(genome: Genome, level: number): Record<Stat, number>` (or similar — the plan will read the actual signatures before editing).

Add an optional `wear` parameter, defaulting to `{}`:

```ts
export function computeBaseStats(
  genome: Genome,
  wear: Readonly<Record<string, number>> = {},
): Record<Stat, number>;

export function computeCurrentStats(
  genome: Genome,
  level: number,
  wear: Readonly<Record<string, number>> = {},
): Record<Stat, number>;
```

Inside each function, when accumulating a locus's contribution:
- Compute the locus's stat contribution as before (quantitative: sum both alleles' `statDeltas`; qualitative: expressed allele's `statDeltas`).
- Multiply that contribution by `wearMultiplier(wear[locusId] ?? 0)` **before** adding it to the running total.

Existing callers that pass no `wear` → default `{}` → multiplier is `1.0` on every locus → identical output. **Zero runtime regression** on M1–M3 tests. Test fixtures that inline-construct `Unit` will still need to add `generation`, `parentIds`, `wear` to satisfy the new required fields (type-level, not behavior).

Colony/UI callers that construct SpecimenCard data (`unitToRow` in `Colony.tsx`) update to pass `unit.wear` into `computeBaseStats`/`computeCurrentStats`.

## State module: `src/state/breed.ts`

```ts
export const DAILY_BREED_LIMIT = 3 as const;
export const BREED_SUBSTREAM_PRIME = 1_000_033 as const;
// M6: replace or augment the Breed cap with Serum cost

export function breedsRemaining(
  state: { readonly breedsToday: number; readonly breedDayKey: string },
  now?: number,
): number;
```

`breedsRemaining` is the exact analog of `harvestsRemaining` — uses `todayLocalKey` and `DAILY_BREED_LIMIT`; returns `DAILY_BREED_LIMIT` if day is stale, else `max(0, DAILY_BREED_LIMIT - state.breedsToday)`.

## Store extension: `src/state/colony.ts`

New action `breed(parentAId, parentBId)`:

```ts
breed: (parentAId, parentBId) => {
  const state = get();
  const today = todayLocalKey();

  if (parentAId === parentBId) {
    throw new Error('breed: cannot breed a specimen with itself');
  }
  const pA = state.units.find(u => u.id === parentAId);
  const pB = state.units.find(u => u.id === parentBId);
  if (!pA) throw new Error(`breed: parent ${parentAId} not found`);
  if (!pB) throw new Error(`breed: parent ${parentBId} not found`);

  const breedsUsedToday = state.breedDayKey === today ? state.breedsToday : 0;
  if (breedsUsedToday >= DAILY_BREED_LIMIT) {
    throw new Error('daily Breed limit reached');
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
    parentIds: [parentAId, parentBId],
    wear,
  };

  set({
    units: [...state.units, child],
    nextId: childId + 1,
    lastDecantedId: childId,
    breedsToday: breedsUsedToday + 1,
    breedDayKey: today,
  });

  return child;
}
```

`decant()` also grows the new fields when creating a pristine unit: `generation: 0`, `parentIds: null`, `wear: {}` — the pristine defaults are set in one place (the `Unit` constructor site).

**Migration** (v3):

```ts
version: 3,
migrate: (state, from) => {
  let s = state as ColonyStore;
  if (from < 2) {
    s = {
      ...s,
      harvestsToday: 0,
      harvestDayKey: todayLocalKey(),
      droughtCount: 0,
    };
  }
  if (from < 3) {
    s = {
      ...s,
      breedsToday: 0,
      breedDayKey: todayLocalKey(),
      units: s.units.map(u => ({
        ...u,
        generation: u.generation ?? 0,
        parentIds: u.parentIds ?? null,
        wear: u.wear ?? {},
      })),
    };
  }
  return s;
}
```

Chained if-statements — a v1 save upgrades through both branches. `partialize` extended to include `breedsToday`, `breedDayKey`. Unit's new fields are inside `units[]` and are already covered.

## UI

### Nav (`src/ui/App.tsx`)

Add `useState<'colony' | 'breed'>('colony')` and render a small tab strip above the current single-screen mount:

```tsx
<div style={styles.nav}>
  <button onClick={() => setTab('colony')} style={tab === 'colony' ? styles.navActive : styles.nav}>Colony</button>
  <button onClick={() => setTab('breed')}  style={tab === 'breed' ? styles.navActive : styles.nav}>Breed</button>
</div>
{tab === 'colony' ? <Colony /> : <Breed />}
```

Not persisted across reloads (M4 simplicity); state resets to Colony on refresh.

### `src/ui/screens/Breed.tsx`

Layout:
- **Header row:** title "Morulium", subtitle "Breed a Morula from two parents · Breed N/3".
- **Parent slots row:** two `<ParentSlot>` components side by side with an `×` between them. `<BreedButton>` centered below.
- **Colony picker grid:** reuses `SpecimenCard`; click behavior scoped to the Breed screen (fill first empty parent slot, or clear if the clicked card is one of the current parents).
- **Empty state:** if `units.length < 2`, render a message "Need at least two specimens to breed" and skip the picker.

Just-bred highlight: after Confirm succeeds, the just-bred unit's card in the picker grid gets the same highlight ring as the Colony screen (reusing `lastDecantedId`).

### `src/ui/components/ParentSlot.tsx`

Props: `{ unit: Unit | null; onClear: () => void; slotLabel: 'A' | 'B' }`. Empty state shows a dashed-border box with `"Parent {slotLabel}"` label. Filled state renders a compact `SpecimenCard` with a small "×" clear button.

### `src/ui/components/BreedButton.tsx`

Mirrors `DecantButton` structure:
- Reads `breedsToday`, `breedDayKey` from the store.
- Props: `{ disabled?: boolean; onClick: () => void; }` — extra `disabled` is for "same parent picked" / "not both slots filled" — the internal countdown-disable is still driven by the store.
- When breedsRemaining > 0: label = `"Confirm Breed (N/3)"`.
- When at limit: `disabled=true`, label = `"Next Breed in Xh Ym"`, ticks every 60s.

### `src/ui/components/BreedIndicator.tsx`

Mirrors `HarvestIndicator`:
- When breedsRemaining > 0: `"Breed N/3"`.
- When at limit: `"Next Breed in Xh Ym"`, ticks every 60s.
- `data-testid="breed-indicator"`.

### `src/ui/components/SpecimenCard.tsx` (edit)

Add a lineage line at the bottom of the card:
```tsx
<div style={styles.lineageLine}>
  {unit.parentIds
    ? `Gen ${unit.generation} · from #${unit.parentIds[0]} × #${unit.parentIds[1]}`
    : `Gen ${unit.generation} · Harvested`}
</div>
```

Small, muted-grey, monospace — same style tier as `harvestIndicator`. No wear indicator (invariant #5).

## Anti-meta invariant check

Every invariant from §14 stays intact:

1. **Every gain has a cost** — untouched (quantitative antagonism unchanged).
2. **No master stat** — untouched (leveling logic unchanged in M4).
3. **Abilities compete** — untouched (one part per slot unchanged).
4. **Missions demand different profiles** — untouched (mission logic is M5).
5. **Information is hidden** — Breed has no preview; per-slot wear stays off the card face; parent ids are the only new surfaced info (already the player's own history).
6. **Rest forces rotation** — untouched (rest is M6).
7. **Convergence is taxed** — **new mechanic enforcing this.** Wear + linear penalty implement the invariant directly.
8. **Rarity ≠ power** — `computeRarity` untouched. Wear affects stats only.
9. **The tail is aberration-driven** — untouched (aberration draw weights unchanged). Bred aberration recessives can still express via mutation, which is the intended path.

## Testing plan

**Sim (`tests/sim/`):**
- `breed.test.ts` — determinism, zero-mutation inheritance, full-mutation coverage, homozygous parents give heterozygous offspring, `mutatedLoci` behavior at extremes.
- `wear.test.ts` — `wearMultiplier` at 0/20/100, floor behavior, `nextWear` sums parent wear + 1 per locus, mutated loci get 0, absent-key semantics.
- `stats.test.ts` (extend) — existing tests unchanged (default `wear: {}` → multiplier 1.0); new test with non-empty wear produces the exact expected shave.

**State (`tests/state/`):**
- `breed.test.ts` — constants, `breedsRemaining` day-rollover semantics.
- `colony.test.ts` (extend) — `breed()` return shape, throws on missing parent / same-parent / limit-hit, day rollover, does NOT touch droughtCount, determinism given same childId + genomes.
- `persist.test.ts` (extend) — v2→v3 migration adds unit + store fields with defaults; v1→v3 chained migration works; new fields survive rehydration.

**UI (`tests/ui/`):**
- `BreedButton.test.tsx` — mirror of `DecantButton.test.tsx` shape.
- `BreedIndicator.test.tsx` — mirror of `HarvestIndicator.test.tsx` shape.
- `ParentSlot.test.tsx` — empty/filled render, clear callback.
- `Breed.test.tsx` — empty-state, fill-first-empty picker, Confirm gating (both slots filled + distinct + within limit), successful confirm calls `store.breed` and clears slots.
- `SpecimenCard.test.tsx` (extend) — pristine and bred lineage line rendering.
- `App.test.tsx` (new) — Colony/Breed tab switch.

**Expected count:** ~139 → ~174.

**Dev-server smoke:**
- Nav switches between Colony and Breed.
- Breed screen with 0 units → empty-state.
- Breed screen with 1 unit → picker renders, Confirm stays disabled.
- Pick two distinct parents → Confirm enables → click → new unit appears in Colony highlighted with `Gen 1 · from #A × #B`.
- Hit 3/day cap → BreedButton and BreedIndicator both show `Next Breed in Xh Ym`.
- Reload → bred units still have correct generation/parentIds; breed cap counter persists.
- Chain: breed A×B → C, then C×D → E; inspect E's wear to confirm it accumulates.

## Deferred

- **Sequencer** — pre-Decant preview of Morula contents. Late-unlock per game spec §2. Not in M4.
- **Vat / fusion** — M7.
- **Serum cost for breeding** — M6. The Breed cap is the M4 placeholder gate.
- **Rest gating on breed action** — game spec ties rest to Incursions; nothing says breeding drains rest. Not in M4.
- **Per-slot wear indicator on the card face** — game spec invariant #5 (hide info) argues against it. Deferred; may surface in a detail/expanded view later.
- **Portrait/paid avatar** — game spec §13 imagery locked but out of MVP scope entirely.
- **Failsafe on bred rolls** — Failsafe is a Harvest concept; bred rolls have no drought counter. Confirmed isolated.
- **Rename `lastDecantedId` to `lastAcquiredId`** — cosmetic churn; skip.
- **Nav persistence across reload** — trivial to add later.
- **URL routing** — worth introducing at M5+ when there are 3+ screens.

## Self-review notes

- **Spec coverage vs game spec §6:** Mendelian (locked, §6) → sim/breed.ts. Mutation per-allele (§6) → sim/breed.ts with `MUTATION_RATE`. Generation (§6) → Unit field + `breed()` sets. Wear per-locus + mutation-clears (§6) → sim/wear.ts. Data model (§6 sub-block) → Unit field additions + `parentIds` origin derivation. Breed gate (§6 sub-block) → state/breed.ts + `DAILY_BREED_LIMIT`. Wear function (§15 OPEN) → linear + floor + user-approved constants.
- **Compatibility with M3b:** Failsafe/drought path is untouched. All existing tests pass unchanged because `computeStats` gets a defaulting `wear` argument.
- **RNG isolation:** `BREED_SUBSTREAM_PRIME` distinct from `FAILSAFE_SUBSTREAM_PRIME`. Breed rolls don't collide with Decant/Failsafe rolls at any `nextId`.
- **`lastDecantedId` re-use rationale:** Highlight is UI ceremony; the current name is a small nit worth taking in exchange for zero UI change. Flag left in Deferred for later cleanup.
- **v3 migration testability:** covered by seeding a v1 shape and asserting all new fields populate correctly through the chained branches.
