# M1 Rarity Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix M1's tuning problem where 100% of demo hatches land at Apex tier, by separating "how often does an allele roll" from "how much does it score toward tier," making rarity count only *expressed* qualitative alleles, and adopting a shared expressed-allele resolver used by both `rarity.ts` and `stats.ts`.

**Architecture:** Two stacked changes: (1) add `drawWeight` to Allele so rare alleles actually roll rarely (aberration hand-tuned so wild aberrations are ~1-in-10k), (2) `computeRarity` sums the *expressed* allele per qualitative locus only, so recessive carriers score 0 at that locus. Same-class dominance tie-break moves from "higher rarityWeight, ids ascending" to "earlier in `locus.alleles` wins" — dominance authored by ordering. A shared `resolveExpressed(locus, pair)` helper is used by both `expressPhenotype` and `computeStats` so phenotype and scoring can never diverge.

**Tech Stack:** No new dependencies. Vite + React + TS + Vitest, existing.

**Source spec:** `~/Downloads/m1-rarity-fix.md` (handed over by user 2026-08-03).

## Global Constraints

- **Branch context.** This plan continues on the existing `m1-sim-foundations` branch — do NOT create a new branch. The final review will still be one whole-branch review of `main..m1-sim-foundations` before merge.
- **TS strict.** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `strict: true`. No `any` in `src/sim/*`.
- **`src/sim/*` PURE.** No `react`, `react-dom`, `zustand`, `window`, `document`, `localStorage`, `Math.random`, `Date.now()`. The one existing exception is the CLI-entry guard at the bottom of `src/sim/__demo__.ts`.
- **Determinism.** RNG threads through `SeededRng`, passed explicitly to every function that consumes randomness. `weightedPick` takes `rng`, does one `rng.next()` call, returns deterministically.
- **Hidden-info invariant relaxes.** `computeRarity`'s new return type is `{ score: number; tier: Tier }` — the numeric score is now exposed. The spec doc will be updated to reflect this (see Task 8).
- **Ordering convention.** In each qualitative locus, `locus.alleles` MUST list alleles most-dominant first. This is what the new same-class tie-break rule uses. Reordering is required only for `aberration` (where `ab_none` is dominant but currently last).
- **Vitest imports:** `import { describe, it, expect } from 'vitest'` — no Jest globals.
- **Commits:** Conventional Commits + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` on every commit.

---

### Task 1: Add `drawWeight` to Allele + defaults + aberration override

**Files:**
- Modify: `src/sim/types.ts` — add `drawWeight: number` to the `Allele` interface (required field)
- Modify: `src/sim/data/alleles.ts` — thread `drawWeight` through the `q` and `qual` helpers; override draws for `ab_voltaic` (1), `ab_corrosive` (1), `ab_none` (200)
- Modify: `tests/sim/data.test.ts` — add tests for drawWeight presence and aberration override

**Interfaces:**
- Consumes: nothing from other tasks (this is the data foundation)
- Produces:
  - `Allele.drawWeight: number` (required, always present after this task)
  - Aberration allele draw distribution: `ab_none=200`, `ab_voltaic=1`, `ab_corrosive=1` (so aberration rolls: ~99% none, ~0.5% voltaic, ~0.5% corrosive)
  - Every other allele's drawWeight is derived from its rarityWeight via a `DRAW_WEIGHT_BY_RARITY` map: {0:100, 1:40, 3:12, 6:4, 10:1}

- [ ] **Step 1: Update `src/sim/types.ts` — add drawWeight to Allele**

Add `drawWeight: number` between `rarityWeight` and `statDeltas`:

```ts
export interface Allele {
  readonly id: string;
  readonly locus: string;
  readonly label: string;
  readonly rarityWeight: RarityWeight;
  readonly drawWeight: number;
  readonly statDeltas: Readonly<Partial<Record<Stat, number>>>;
  readonly ability?: string;
  readonly dominance?: Dominance;
}
```

- [ ] **Step 2: Write failing test at `tests/sim/data.test.ts` — extend the existing suite**

Add these tests to the existing `describe('data integrity', () => { ... })` block:

```ts
it('every allele has a positive drawWeight', () => {
  for (const allele of Object.values(ALLELES)) {
    expect(allele.drawWeight).toBeGreaterThan(0);
  }
});

it('aberration draw distribution: ab_none dominant, ab_voltaic and ab_corrosive very rare', () => {
  expect(ALLELES['ab_none']!.drawWeight).toBe(200);
  expect(ALLELES['ab_voltaic']!.drawWeight).toBe(1);
  expect(ALLELES['ab_corrosive']!.drawWeight).toBe(1);
});

it('default drawWeight follows the rarityWeight tier: 0→100, 1→40, 3→12, 6→4, 10→1', () => {
  // Sample non-aberration alleles at each rarity tier
  expect(ALLELES['mus_neutral']!.drawWeight).toBe(100); // weight 0
  expect(ALLELES['mus_lean']!.drawWeight).toBe(40);    // weight 1
  expect(ALLELES['mus_strong']!.drawWeight).toBe(12);  // weight 3
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- tests/sim/data.test.ts`
Expected: FAIL — `drawWeight` doesn't exist on alleles yet.

- [ ] **Step 4: Update `src/sim/data/alleles.ts` — add drawWeight helper and thread through builders**

At the top of the file, after the imports, add the default map and helper:

```ts
const DRAW_WEIGHT_BY_RARITY: Readonly<Record<number, number>> = { 0: 100, 1: 40, 3: 12, 6: 4, 10: 1 };
function defaultDraw(w: RarityWeight): number {
  return DRAW_WEIGHT_BY_RARITY[w] ?? 1;
}
```

Change the `q` helper to include drawWeight:

```ts
function q(
  id: string,
  locus: string,
  label: string,
  weight: RarityWeight,
  deltas: Partial<Record<Stat, number>>,
): Allele {
  return { id, locus, label, rarityWeight: weight, drawWeight: defaultDraw(weight), statDeltas: deltas };
}
```

Change the `qual` helper the same way. It currently has a branching return for the ability case — keep that branching but add drawWeight AND accept an optional `drawOverride` param at the end:

```ts
function qual(
  id: string,
  locus: string,
  label: string,
  weight: RarityWeight,
  dominance: Dominance,
  deltas: Partial<Record<Stat, number>> = {},
  ability?: string,
  drawOverride?: number,
): Allele {
  const drawWeight = drawOverride ?? defaultDraw(weight);
  return ability !== undefined
    ? { id, locus, label, rarityWeight: weight, drawWeight, statDeltas: deltas, ability, dominance }
    : { id, locus, label, rarityWeight: weight, drawWeight, statDeltas: deltas, dominance };
}
```

Then in the aberration block, add the drawOverride on the three lines:

```ts
qual('ab_voltaic',    'aberration', 'Voltaic',   10, 'recessive', { VIT: -2 }, 'Shock', 1),
qual('ab_corrosive',  'aberration', 'Corrosive', 10, 'recessive', { SPD: -2 }, 'Melt',  1),
qual('ab_none',       'aberration', 'None',       0, 'dominant',  {},          undefined, 200),
```

- [ ] **Step 5: Reorder aberration alleles — ab_none first (dominant-first convention)**

Since Task 3's tie-break uses `locus.alleles` ordering, and `ab_none` is the dominant allele, move it to the head of the aberration list so the ordering matches the "most-dominant first" convention. In `src/sim/data/alleles.ts`:

```ts
// aberration (rare recessive tree — game spec §2)
qual('ab_none',       'aberration', 'None',       0, 'dominant',  {},          undefined, 200),
qual('ab_voltaic',    'aberration', 'Voltaic',   10, 'recessive', { VIT: -2 }, 'Shock',   1),
qual('ab_corrosive',  'aberration', 'Corrosive', 10, 'recessive', { SPD: -2 }, 'Melt',    1),
```

- [ ] **Step 6: Run all data tests to verify pass**

Run: `npm test -- tests/sim/data.test.ts`
Expected: PASS (11 tests — 8 existing + 3 new).

Then: `npm test`
Expected: full suite — genome tests may fail on the aberration-related assertions because the ordering changed. That's expected and gets fixed in Task 3. `stats.test.ts` and `rarity.test.ts` should still pass here (their tests don't hit the rolled ordering).

Then: `npm run typecheck` — expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/sim/types.ts src/sim/data/alleles.ts tests/sim/data.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): add drawWeight to Allele; hand-tune aberration draws

Splits "how often an allele rolls" (drawWeight) from "how much it
scores toward tier" (rarityWeight). Default drawWeight is keyed off
rarityWeight so most alleles need no hand-authoring:
  0→100, 1→40, 3→12, 6→4, 10→1.

Aberration is overridden so wild aberrations are ~1-in-100 draws
(ab_none=200, ab_voltaic=1, ab_corrosive=1) — recessive expression
then makes wild expressed aberrations ~1-in-10k, as intended.

Aberration alleles reordered ab_none-first to match the new
same-class-tiebreak rule (allele order in locus.alleles decides ties).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `weightedPick` + rewire `rollGenome`

**Files:**
- Create: `src/sim/pick.ts` — the reusable weighted picker
- Modify: `src/sim/genome.ts` — `rollGenome` uses `weightedPick` instead of `rng.pick`
- Create/modify: `tests/sim/pick.test.ts` — determinism + distribution tests
- Modify: `tests/sim/genome.test.ts` — the `rollGenome` distribution test may need tweaking; the existing shape/determinism/valid-allele tests should still pass

**Interfaces:**
- Consumes: `Allele` from `types.ts`; `SeededRng` from `rng.ts`; `ALLELES`/`LOCI` from `data/loci.ts`
- Produces:
  - `function weightedPick<T extends { drawWeight: number }>(items: readonly T[], rng: SeededRng): T`
  - Determinism: same rng state + same items ⇒ same pick
  - One `rng.next()` call per pick
- Consumed by: Task 3 (`expressPhenotype` doesn't need it, but future tasks like breeding will)

- [ ] **Step 1: Write failing test at `tests/sim/pick.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { weightedPick } from '../../src/sim/pick';
import { createRng } from '../../src/sim/rng';

describe('weightedPick', () => {
  const items = [
    { id: 'a', drawWeight: 200 },
    { id: 'b', drawWeight: 1 },
    { id: 'c', drawWeight: 1 },
  ];

  it('is deterministic under the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 20; i++) expect(weightedPick(items, a)).toEqual(weightedPick(items, b));
  });

  it('does exactly one rng.next() call per pick', () => {
    // Verify by running weightedPick K times and separately advancing rng K times,
    // then confirming both rngs are in the same state (next() returns the same value)
    const via = createRng(7);
    const control = createRng(7);
    for (let i = 0; i < 50; i++) {
      weightedPick(items, via);
      control.next();
    }
    expect(via.next()).toBe(control.next());
  });

  it('distribution roughly matches weights over many rolls', () => {
    const rng = createRng(1);
    const tally: Record<string, number> = { a: 0, b: 0, c: 0 };
    const N = 20_000;
    for (let i = 0; i < N; i++) tally[weightedPick(items, rng).id]!++;
    // a has drawWeight 200 out of 202 total ≈ 99.0%
    expect(tally['a']! / N).toBeGreaterThan(0.98);
    expect(tally['a']! / N).toBeLessThan(0.995);
  });

  it('throws on empty items', () => {
    expect(() => weightedPick([], createRng(1))).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/sim/pick.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `src/sim/pick.ts`**

```ts
import type { SeededRng } from './rng';

export function weightedPick<T extends { drawWeight: number }>(items: readonly T[], rng: SeededRng): T {
  if (items.length === 0) throw new Error('weightedPick: empty items');
  let total = 0;
  for (const item of items) total += item.drawWeight;
  let r = rng.next() * total;
  for (const item of items) {
    r -= item.drawWeight;
    if (r < 0) return item;
  }
  return items[items.length - 1]!; // fp safety
}
```

- [ ] **Step 4: Run pick tests to verify pass**

Run: `npm test -- tests/sim/pick.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Rewire `rollGenome` in `src/sim/genome.ts` to use weightedPick**

Replace the two `rng.pick(locus.alleles)` calls with weighted picks over the full Allele objects:

```ts
import type { Genome, PhenotypeDescriptor, Locus, Allele } from './types';
import { LOCI, ALLELES } from './data/loci';
import type { SeededRng } from './rng';
import { weightedPick } from './pick';

export function rollGenome(rng: SeededRng): Genome {
  const loci: Record<string, readonly [string, string]> = {};
  for (const locus of Object.values(LOCI)) {
    const pool: Allele[] = locus.alleles.map((id) => {
      const a = ALLELES[id];
      if (!a) throw new Error(`unknown allele in locus ${locus.id}: ${id}`);
      return a;
    });
    const a = weightedPick(pool, rng).id;
    const b = weightedPick(pool, rng).id;
    loci[locus.id] = [a, b] as const;
  }
  return { loci };
}
```

Note: `expressPhenotype` stays as-is in this task — it gets rewritten in Task 3 when `resolveExpressed` lands.

- [ ] **Step 6: Run genome tests — expect some to fail because dominance rules haven't been rewritten yet**

Run: `npm test -- tests/sim/genome.test.ts`
Expected: The `rollGenome` shape/validity/determinism tests still pass. The `expressPhenotype` tests may still pass here (dominance logic is unchanged); if any fail, they're likely failing because the new weighted distribution makes previously-common alleles rare — that's expected and gets fixed in Task 3.

If a genome test fails because the specific genome that got rolled changed, note it in your report. Don't fix it here — it likely gets rewritten in Task 3.

- [ ] **Step 7: Run full suite and typecheck**

Run: `npm test`
Expected: pick tests pass; data tests pass; RNG tests pass. Some genome/rarity tests may fail (pre-existing tests that assumed old behavior) — that's OK for this task; document what fails in the report so Task 3 can address them cleanly.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/sim/pick.ts src/sim/genome.ts tests/sim/pick.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): weighted allele picking

Adds weightedPick(items, rng) that samples proportionally to
drawWeight in a single rng.next() call. Deterministic under a given
seed and rng state.

rollGenome now draws two independent alleles per locus via
weightedPick over the full Allele objects — rare drawWeights actually
roll rarely, so the tuning knob added in the previous commit takes
effect on real hatches.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Shared `resolveExpressed` + new tie-break rule + rewrite `expressPhenotype`

**Files:**
- Modify: `src/sim/genome.ts` — export `resolveExpressed(locus, pair)`; rewrite `expressPhenotype` to use it and to use the new tie-break rule
- Modify: `tests/sim/genome.test.ts` — replace the tie-break test cases (they used to assert rarityWeight-based tie-breaks; now they assert allele-order-based)

**Interfaces:**
- Consumes: `Allele`, `Locus`, `Genome`, `PhenotypeDescriptor` from `types.ts`; `LOCI`, `ALLELES` from `data/loci.ts`
- Produces:
  - `export function resolveExpressed(locus: Locus, pair: readonly [string, string]): Allele`
  - Tie-break rule: homozygous → that allele; het dominant+recessive → dominant; het same-class → the allele that appears EARLIER in `locus.alleles` wins.
  - `expressPhenotype(genome)` unchanged in signature; uses `resolveExpressed` internally for every locus.
- Consumed by: Task 4 (`computeRarity`), Task 5 (`computeStats` refactor).

- [ ] **Step 1: Rewrite the tie-break tests in `tests/sim/genome.test.ts`**

Find and REPLACE the existing tie-break tests. The new rule is order-based, not rarityWeight-based:

```ts
it('heterozygous two-dominants — allele that appears earlier in locus.alleles wins', () => {
  // In head locus, alleles list is [head_maw, head_sensor, head_mandible].
  // head_maw is earliest, so it beats head_sensor. head_sensor beats head_mandible.
  const p1 = expressPhenotype(g({
    musculature: ['mus_neutral', 'mus_neutral'], neural_tissue: ['neu_neutral', 'neu_neutral'],
    predator_drive: ['prd_neutral', 'prd_neutral'], carapace_density: ['car_neutral', 'car_neutral'],
    metabolism: ['met_neutral', 'met_neutral'], sinew: ['sin_neutral', 'sin_neutral'],
    vigor: ['vig_neutral', 'vig_neutral'], acuity: ['acu_neutral', 'acu_neutral'],
    head: ['head_sensor', 'head_maw'], // pair order doesn't matter — head_maw is earlier in locus
    carapace: ['cara_chitin', 'cara_chitin'],
    locomotion: ['loco_sprint', 'loco_sprint'],
    appendage: ['app_stinger', 'app_stinger'],
    aberration: ['ab_none', 'ab_none'],
    palette: ['pal_ash', 'pal_ash'],
  }));
  expect(p1.expressed['head']).toBe('head_maw');

  const p2 = expressPhenotype(g({
    musculature: ['mus_neutral', 'mus_neutral'], neural_tissue: ['neu_neutral', 'neu_neutral'],
    predator_drive: ['prd_neutral', 'prd_neutral'], carapace_density: ['car_neutral', 'car_neutral'],
    metabolism: ['met_neutral', 'met_neutral'], sinew: ['sin_neutral', 'sin_neutral'],
    vigor: ['vig_neutral', 'vig_neutral'], acuity: ['acu_neutral', 'acu_neutral'],
    head: ['head_mandible', 'head_sensor'],
    carapace: ['cara_chitin', 'cara_chitin'],
    locomotion: ['loco_sprint', 'loco_sprint'],
    appendage: ['app_stinger', 'app_stinger'],
    aberration: ['ab_none', 'ab_none'],
    palette: ['pal_ash', 'pal_ash'],
  }));
  expect(p2.expressed['head']).toBe('head_sensor');
});
```

REMOVE the previous "tied rarityWeight — lexicographically smaller id wins" test — it no longer applies.

Also REPLACE the "palette is passed through as-is (uses expressed rule too)" test — palette allele order after Task 1 rework is `[pal_ash, pal_rust, pal_moss, pal_bloom]`, all dominant. Under the new rule, `pal_ash` (earliest) wins any heterozygous pairing among palettes:

```ts
it('palette expresses via the same rule (order-based tie-break)', () => {
  const p = expressPhenotype(g({
    musculature: ['mus_neutral', 'mus_neutral'], neural_tissue: ['neu_neutral', 'neu_neutral'],
    predator_drive: ['prd_neutral', 'prd_neutral'], carapace_density: ['car_neutral', 'car_neutral'],
    metabolism: ['met_neutral', 'met_neutral'], sinew: ['sin_neutral', 'sin_neutral'],
    vigor: ['vig_neutral', 'vig_neutral'], acuity: ['acu_neutral', 'acu_neutral'],
    head: ['head_mandible', 'head_mandible'], carapace: ['cara_chitin', 'cara_chitin'],
    locomotion: ['loco_bulk', 'loco_bulk'], appendage: ['app_none', 'app_none'],
    aberration: ['ab_none', 'ab_none'],
    palette: ['pal_rust', 'pal_ash'], // pal_ash is earlier in the palette locus → wins
  }));
  expect(p.palette).toBe('pal_ash');
});
```

Keep the existing homozygous and dominant-vs-recessive tests unchanged (dominance rule and homozygous rule are unchanged).

Also update the "heterozygous dominant + recessive expresses the dominant" test to keep working with the new aberration ordering — the current test asserts `aberration: ['ab_none', 'ab_voltaic']` expresses `ab_none`, and that's still true (dominant over recessive rule unchanged).

- [ ] **Step 2: Run failing tests to confirm they fail**

Run: `npm test -- tests/sim/genome.test.ts`
Expected: the updated tie-break tests FAIL because `expressPhenotype` still uses the rarityWeight-based tie-break.

- [ ] **Step 3: Implement `resolveExpressed` and rewrite `expressPhenotype` in `src/sim/genome.ts`**

Replace the `pickExpressedAllele` helper with the new exported `resolveExpressed`:

```ts
export function resolveExpressed(locus: Locus, pair: readonly [string, string]): Allele {
  const [aId, bId] = pair;
  const a = ALLELES[aId];
  const b = ALLELES[bId];
  if (!a) throw new Error(`unknown allele: ${aId}`);
  if (!b) throw new Error(`unknown allele: ${bId}`);
  if (aId === bId) return a;

  const aDom = a.dominance === 'dominant';
  const bDom = b.dominance === 'dominant';
  if (aDom && !bDom) return a;
  if (bDom && !aDom) return b;

  // same class (both dominant, or compound-het recessive from mutation):
  // tie-break by position in locus.alleles — earlier = more dominant.
  return locus.alleles.indexOf(aId) <= locus.alleles.indexOf(bId) ? a : b;
}
```

Rewrite `expressPhenotype` to use it and delete the old `pickExpressedAllele`:

```ts
export function expressPhenotype(genome: Genome): PhenotypeDescriptor {
  const expressed: Record<string, string> = {};
  for (const [locusId, pair] of Object.entries(genome.loci)) {
    const locus = LOCI[locusId];
    if (!locus) throw new Error(`unknown locus in genome: ${locusId}`);
    expressed[locusId] = resolveExpressed(locus, pair).id;
  }
  const paletteId = expressed['palette'];
  if (!paletteId) throw new Error('genome has no palette locus');
  return { expressed, palette: paletteId };
}
```

- [ ] **Step 4: Run genome tests to verify pass**

Run: `npm test -- tests/sim/genome.test.ts`
Expected: PASS all tests including the updated tie-break ones.

- [ ] **Step 5: Commit**

```bash
git add src/sim/genome.ts tests/sim/genome.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): shared resolveExpressed with order-based tie-break

Adds resolveExpressed(locus, pair) — one helper used by both
expressPhenotype and (in the next commits) computeRarity and
computeStats. Phenotype and scoring can no longer diverge.

Same-class dominance tie-break moves from "higher rarityWeight, ids
ascending" to "earlier in locus.alleles wins" — dominance is now
fully authored by allele ordering, which is more predictable and
lets us add codominance later by swapping this single rule.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Expressed-only `computeRarity` + return-type change

**Files:**
- Modify: `src/sim/rarity.ts` — sum only the expressed allele per QUALITATIVE locus; return `{ score, tier }`
- Modify: `tests/sim/rarity.test.ts` — full rewrite of expected numbers; return-type change means every test uses `.tier` off the result now

**Interfaces:**
- Consumes: `resolveExpressed` from `genome.ts`; `LOCI` from `data/loci.ts`; types from `types.ts`
- Produces:
  - `function computeRarity(genome: Genome): { score: number; tier: Tier }`
  - Only qualitative loci contribute. Quantitative loci contribute 0 (rarity and combat power are independent axes).
  - Score sums `resolveExpressed(locus, pair).rarityWeight` over every qualitative locus.
- Consumed by: `src/sim/__demo__.ts` (updated in Task 6); future roster UI.

- [ ] **Step 1: Rewrite `tests/sim/rarity.test.ts`**

Completely replace the file's test body. The new expected numbers use expressed-only scoring:

```ts
import { describe, it, expect } from 'vitest';
import { computeRarity } from '../../src/sim/rarity';
import type { Genome } from '../../src/sim/types';

function genome(pairs: Record<string, [string, string]>): Genome {
  return { loci: pairs };
}

// A "min-qualitative" genome: every qualitative locus expresses its lowest-weight allele.
// Under the NEW allele table order, aberration is [ab_none, ab_voltaic, ab_corrosive],
// palette is [pal_ash, pal_rust, pal_moss, pal_bloom].
// Expressed weights: head_mandible=1, cara_chitin=1, loco_bulk=1 (recessive but homozygous),
// app_none=0 (recessive homozygous), ab_none=0 (dominant homozygous), pal_ash=0.
// Score = 1 + 1 + 1 + 0 + 0 + 0 = 3 → Variant.
const MIN_QUALITATIVE: Record<string, [string, string]> = {
  musculature:      ['mus_neutral', 'mus_neutral'],
  neural_tissue:    ['neu_neutral', 'neu_neutral'],
  predator_drive:   ['prd_neutral', 'prd_neutral'],
  carapace_density: ['car_neutral', 'car_neutral'],
  metabolism:       ['met_neutral', 'met_neutral'],
  sinew:            ['sin_neutral', 'sin_neutral'],
  vigor:            ['vig_neutral', 'vig_neutral'],
  acuity:           ['acu_neutral', 'acu_neutral'],
  head:             ['head_mandible', 'head_mandible'],
  carapace:         ['cara_chitin',   'cara_chitin'],
  locomotion:       ['loco_bulk',     'loco_bulk'],
  appendage:        ['app_none',      'app_none'],
  aberration:       ['ab_none',       'ab_none'],
  palette:          ['pal_ash',       'pal_ash'],
};

describe('computeRarity — expressed-only, qualitative-only', () => {
  it('returns { score, tier } for the min-qualitative genome (score 3 → Variant)', () => {
    const result = computeRarity(genome(MIN_QUALITATIVE));
    expect(result.score).toBe(3);
    expect(result.tier).toBe('Variant');
  });

  it('quantitative-only spike does not raise score', () => {
    // Adding heavy quantitative alleles must not change the score.
    const base = computeRarity(genome(MIN_QUALITATIVE)).score;
    const withSpike = computeRarity(genome({
      ...MIN_QUALITATIVE,
      musculature: ['mus_strong', 'mus_strong'],
      neural_tissue: ['neu_dense', 'neu_dense'],
    })).score;
    expect(withSpike).toBe(base);
  });

  it('recessive carrier scores 0 at that locus (expressed-only)', () => {
    // ab_none (dominant) + ab_voltaic (recessive) → expresses ab_none → weight 0
    const carrier = computeRarity(genome({
      ...MIN_QUALITATIVE,
      aberration: ['ab_none', 'ab_voltaic'],
    }));
    expect(carrier.score).toBe(3); // unchanged from baseline
  });

  it('homozygous ab_voltaic expresses and adds its full weight', () => {
    // ab_voltaic homozygous expresses ab_voltaic (weight 10) → total 3 + 10 = 13 → Adapted
    const wild = computeRarity(genome({
      ...MIN_QUALITATIVE,
      aberration: ['ab_voltaic', 'ab_voltaic'],
    }));
    expect(wild.score).toBe(13);
    expect(wild.tier).toBe('Adapted');
  });

  it('a genome loaded with expressed Adapted alleles hits Evolved or Apex', () => {
    // Expressed: head_maw(3), cara_bone(3), loco_sprint(3), app_stinger(3), ab_voltaic(10), pal_ash(0)
    // Score = 3+3+3+3+10+0 = 22 → Apex
    const loaded = computeRarity(genome({
      ...MIN_QUALITATIVE,
      head: ['head_maw', 'head_maw'],
      carapace: ['cara_bone', 'cara_bone'],
      locomotion: ['loco_sprint', 'loco_sprint'],
      appendage: ['app_stinger', 'app_stinger'],
      aberration: ['ab_voltaic', 'ab_voltaic'],
    }));
    expect(loaded.score).toBe(22);
    expect(loaded.tier).toBe('Apex');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- tests/sim/rarity.test.ts`
Expected: FAIL — return type is currently `Tier`, not `{ score, tier }`.

- [ ] **Step 3: Rewrite `src/sim/rarity.ts`**

```ts
import type { Genome, Tier } from './types';
import { LOCI } from './data/loci';
import { resolveExpressed } from './genome';

/**
 * Rarity sums the expressed allele's rarityWeight over every QUALITATIVE locus.
 * Quantitative loci contribute 0 — rarity and combat power are independent axes.
 * A recessive carrier scores 0 at that locus because the recessive isn't expressed.
 * Returns both the raw score (needed for tuning / verify harness) and the tier.
 */
export function computeRarity(genome: Genome): { score: number; tier: Tier } {
  let score = 0;
  for (const [locusId, pair] of Object.entries(genome.loci)) {
    const locus = LOCI[locusId];
    if (!locus) throw new Error(`unknown locus in genome: ${locusId}`);
    if (locus.type !== 'qualitative') continue;
    score += resolveExpressed(locus, pair).rarityWeight;
  }
  return { score, tier: tierForScore(score) };
}

function tierForScore(score: number): Tier {
  if (score <= 2) return 'Basic';
  if (score <= 10) return 'Variant';
  if (score <= 14) return 'Adapted';
  if (score <= 19) return 'Evolved';
  return 'Apex';
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- tests/sim/rarity.test.ts`
Expected: PASS (5 tests).

Then: `npm run typecheck` — expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/sim/rarity.ts tests/sim/rarity.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): expressed-only, qualitative-only computeRarity

Rarity now sums the EXPRESSED allele's rarityWeight over qualitative
loci only. Recessive carriers score 0 at that locus (as they should
— you can't see the trait yet). Quantitative loci contribute 0, so
combat power and rarity are genuinely independent axes: a Basic-tier
unit can still have monster stats and vice versa.

Return type is now { score, tier } instead of just Tier. The numeric
score is intentionally exposed — the tuning/verify harness needs it,
and hiding it behind an abstraction hasn't produced a real benefit.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `computeStats` uses `LOCI.type` + shared `resolveExpressed`

**Files:**
- Modify: `src/sim/stats.ts` — swap the `dominance === undefined && locusId !== 'palette'` proxy for `LOCI[locusId].type === 'quantitative'`; use `resolveExpressed` for qualitative loci

**Interfaces:**
- Consumes: `resolveExpressed` from `genome.ts` (already imported for `expressPhenotype` in current file — this task removes the `expressPhenotype` import and uses `resolveExpressed` directly, since we no longer need the whole phenotype)
- Produces: `computeBaseStats`, `computeGrowthAffinity`, `computeCurrentStats` — signatures unchanged; internal behavior for qualitative loci is functionally identical to before (still sums expressed allele's stat deltas) but uses the shared helper

- [ ] **Step 1: Modify `src/sim/stats.ts` — replace expressPhenotype path with LOCI.type + resolveExpressed**

Replace the current `computeBaseStats` implementation. It currently imports `expressPhenotype`; swap to `resolveExpressed`:

```ts
import type { Genome, Stat } from './types';
import { STATS } from './types';
import { ALLELES, LOCI } from './data/loci';
import { resolveExpressed } from './genome';

export const BASE_STATS: Readonly<Record<Stat, number>> = Object.freeze({
  PWR: 10, VIT: 10, SPD: 10, INT: 10, GUI: 10,
});

export function computeBaseStats(genome: Genome): Record<Stat, number> {
  const result: Record<Stat, number> = { ...BASE_STATS };

  for (const [locusId, pair] of Object.entries(genome.loci)) {
    const locus = LOCI[locusId];
    if (!locus) throw new Error(`unknown locus in genome: ${locusId}`);

    if (locus.type === 'quantitative') {
      for (const alleleId of pair) addDeltas(result, alleleOrThrow(alleleId));
    } else {
      addDeltas(result, resolveExpressed(locus, pair));
    }
  }

  for (const s of STATS) {
    if (result[s] < 0) result[s] = 0;
  }
  return result;
}

function alleleOrThrow(id: string) {
  const a = ALLELES[id];
  if (!a) throw new Error(`unknown allele: ${id}`);
  return a;
}

function addDeltas(target: Record<Stat, number>, allele: { statDeltas: Partial<Record<Stat, number>> }): void {
  for (const s of STATS) {
    const d = allele.statDeltas[s];
    if (d !== undefined) target[s] += d;
  }
}

// computeGrowthAffinity and computeCurrentStats — unchanged. Keep as-is.
```

Keep `computeGrowthAffinity` and `computeCurrentStats` exactly as they are today. Only `computeBaseStats` and the imports change.

- [ ] **Step 2: Run stats tests to verify still-green**

Run: `npm test -- tests/sim/stats.test.ts`
Expected: PASS. The internal detection change should produce identical results for existing tests (palette is still classified as qualitative via `LOCI.palette.type === 'qualitative'`, quantitative loci behave the same, qualitative expressed-allele stats are the same value).

- [ ] **Step 3: Run full suite + typecheck**

Run: `npm test`
Expected: everything green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/sim/stats.ts
git commit -m "$(cat <<'EOF'
refactor(sim): computeBaseStats uses LOCI.type + shared resolveExpressed

Replaces the "dominance === undefined && locusId !== 'palette'" proxy
with the direct LOCI[locusId].type === 'quantitative' check — removes
the latent bug where a quantitative locus with dominance data or a
palette-adjacent qualitative locus would silently misclassify.

Also swaps expressPhenotype for the shared resolveExpressed helper.
Same result, one less dependency, and stats + rarity now share the
same expressed-allele resolution path.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: rng NaN guard + fork determinism test + update demo & App

**Files:**
- Modify: `src/sim/rng.ts` — add `Number.isFinite` throw at the top of `createRng`
- Modify: `tests/sim/rng.test.ts` — add the NaN-throws test AND (per the fix doc) a fork determinism test
- Modify: `src/sim/__demo__.ts` — `runDemo` returns rows that include the numeric score; `formatDemoTable` shows a "score" column between "tier" and the stat columns
- Modify: `tests/sim/demo.test.ts` — update the shape test to assert the new score field
- Modify: `src/App.tsx` — no change needed if the browser page just renders the table string; verify

**Interfaces:**
- Consumes: updated `computeRarity` from Task 4
- Produces: `DemoRow.score: number`; formatted table has a `score` column
- Consumed by: user during M1 review

- [ ] **Step 1: Add NaN guard to `src/sim/rng.ts`**

Add at the top of `createRng`:

```ts
export function createRng(seed: number): SeededRng {
  if (!Number.isFinite(seed)) {
    throw new Error(`createRng: seed must be finite, got ${seed}`);
  }
  const src = mulberry32(seed);
  // ... rest unchanged
```

- [ ] **Step 2: Add NaN + fork tests to `tests/sim/rng.test.ts`**

Add to the existing `describe('SeededRng', () => { ... })` block:

```ts
it('createRng throws on non-finite seeds', () => {
  expect(() => createRng(NaN)).toThrow(/finite/);
  expect(() => createRng(Infinity)).toThrow(/finite/);
  expect(() => createRng(-Infinity)).toThrow(/finite/);
});

it('fork determinism: two forks from equal parents produce identical streams', () => {
  const parent1 = createRng(500);
  const parent2 = createRng(500);
  const child1 = parent1.fork(9);
  const child2 = parent2.fork(9);
  for (let i = 0; i < 10; i++) expect(child1.next()).toBe(child2.next());
});

it('fork does not perturb the parent stream beyond the one draw fork consumes', () => {
  const a = createRng(700);
  a.next(); // advance once
  a.fork(1); // fork consumes one draw of the parent
  const afterFork = a.next();

  const b = createRng(700);
  b.next(); // advance once
  b.next(); // fork() would have consumed this
  const afterAdvance = b.next();

  expect(afterFork).toBe(afterAdvance);
});
```

- [ ] **Step 3: Run RNG tests to verify pass**

Run: `npm test -- tests/sim/rng.test.ts`
Expected: PASS all (existing 8 + 3 new = 11).

- [ ] **Step 4: Update `src/sim/__demo__.ts` — surface the numeric score**

Change the `DemoRow` interface and the two functions:

```ts
export interface DemoRow {
  seed: number;
  tier: Tier;
  score: number;
  base: Record<Stat, number>;
  current: Record<Stat, number>;
  expressed: Record<string, string>;
  palette: string;
}

export function runDemo(seed = 1): DemoRow[] {
  const rows: DemoRow[] = [];
  for (let i = 0; i < 50; i++) {
    const rowSeed = seed * 1000 + i;
    const rng = createRng(rowSeed);
    const genome = rollGenome(rng);
    const phen = expressPhenotype(genome);
    const { score, tier } = computeRarity(genome);
    rows.push({
      seed: rowSeed,
      tier,
      score,
      base: computeBaseStats(genome),
      current: computeCurrentStats(genome, 20),
      expressed: phen.expressed,
      palette: phen.palette,
    });
  }
  return rows;
}
```

Update `formatDemoTable` to include a `score` column between `tier` and the base stats:

```ts
export function formatDemoTable(rows: DemoRow[]): string {
  const header = ['#', 'seed', 'tier', 'score',
    ...STATS.map((s) => `${s}(base)`),
    ...STATS.map((s) => `${s}(L20)`),
    'head', 'appendage', 'aberration', 'palette',
  ];
  const lines: string[] = [header.join('\t')];
  rows.forEach((r, i) => {
    lines.push([
      String(i),
      String(r.seed),
      r.tier,
      String(r.score),
      ...STATS.map((s) => String(Math.round(r.base[s]))),
      ...STATS.map((s) => r.current[s].toFixed(1)),
      r.expressed['head'] ?? '',
      r.expressed['appendage'] ?? '',
      r.expressed['aberration'] ?? '',
      r.palette,
    ].join('\t'));
  });
  return lines.join('\n');
}
```

- [ ] **Step 5: Update the demo test — assert score field**

In `tests/sim/demo.test.ts`, extend the "every row includes a tier and non-negative base stats" test (or add a new one):

```ts
it('every row includes a numeric score and a tier', () => {
  for (const row of runDemo(3)) {
    expect(typeof row.score).toBe('number');
    expect(row.score).toBeGreaterThanOrEqual(0);
    expect(['Basic', 'Variant', 'Adapted', 'Evolved', 'Apex']).toContain(row.tier);
  }
});

it('formatDemoTable header includes a score column', () => {
  const s = formatDemoTable(runDemo(1));
  expect(s.split('\n')[0]).toContain('score');
});
```

- [ ] **Step 6: Run full suite and typecheck**

Run: `npm test`
Expected: everything green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 7: Verify in browser**

Run: `npm run dev` (briefly), open http://localhost:5173, confirm the table renders with a `score` column and that most tiers are NOT Apex. Ctrl-C.

If you cannot open a browser interactively, at least start the server and confirm it binds. Note it in the report.

- [ ] **Step 8: Commit**

```bash
git add src/sim/rng.ts src/sim/__demo__.ts tests/sim/rng.test.ts tests/sim/demo.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): rng seed guard, fork tests, demo shows score

createRng throws on NaN / Infinity so a bad upstream value fails
fast instead of silently seeding 0.

Adds two fork() tests: (1) two forks from equal parents produce
identical streams; (2) fork consumes exactly one draw of the parent
stream. Both invariants are load-bearing for M2's per-sprite RNG
substreams.

Demo now surfaces the numeric rarity score alongside the tier so the
tier distribution can be eyeballed at a glance.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Rarity verify harness + measured distribution

**Files:**
- Create: `scripts/verify-rarity.ts` — the throwaway calibration harness
- Modify: `package.json` — add `"verify:rarity"` script

**Interfaces:**
- Consumes: `createRng`, `rollGenome`, `computeRarity` — no new APIs
- Produces: a runnable `npm run verify:rarity` that prints a tier histogram from 10,000 hatches
- Consumed by: humans, during tuning

- [ ] **Step 1: Create `scripts/verify-rarity.ts`**

```ts
import { createRng } from '../src/sim/rng';
import { rollGenome } from '../src/sim/genome';
import { computeRarity } from '../src/sim/rarity';

const N = 10_000;
const tally: Record<string, number> = {};
let scoreSum = 0;
let scoreMax = 0;
let scoreMin = Number.POSITIVE_INFINITY;

for (let i = 0; i < N; i++) {
  const { score, tier } = computeRarity(rollGenome(createRng(i + 1)));
  tally[tier] = (tally[tier] ?? 0) + 1;
  scoreSum += score;
  if (score > scoreMax) scoreMax = score;
  if (score < scoreMin) scoreMin = score;
}

const order = ['Basic', 'Variant', 'Adapted', 'Evolved', 'Apex'];
// eslint-disable-next-line no-console
console.log(`N = ${N}`);
for (const tier of order) {
  const n = tally[tier] ?? 0;
  // eslint-disable-next-line no-console
  console.log(tier.padEnd(8), String(n).padStart(5), `${((100 * n) / N).toFixed(2)}%`);
}
// eslint-disable-next-line no-console
console.log(`\nscore: min=${scoreMin}  avg=${(scoreSum / N).toFixed(2)}  max=${scoreMax}`);
```

- [ ] **Step 2: Add npm script**

Add to `package.json` scripts:

```json
"verify:rarity": "vite-node scripts/verify-rarity.ts"
```

- [ ] **Step 3: Run it**

Run: `npm run verify:rarity`
Expected: a histogram printed to stdout showing the tier distribution over 10,000 hatches. According to the fix spec the target read is "Basic-dominant, Variant next, a thin tail — Apex ~1–2%." Actual numbers may vary; capture the exact output in the report and DO NOT rebalance thresholds automatically. If Apex is way off the ~1-2% target, note it in the report as a tuning observation and leave threshold changes for the human to decide.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-rarity.ts package.json
git commit -m "$(cat <<'EOF'
chore(sim): add rarity calibration harness

npm run verify:rarity rolls 10,000 fresh hatches and prints a tier
histogram plus score min/avg/max. Not a test — no assertions — a
tuning knob for adjusting drawWeights and (later) tier thresholds
before landing changes.

Kept as a script rather than a test so it doesn't run every CI cycle
and doesn't have a "correct" pass condition; it's a measurement tool.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Update the design doc's hidden-info invariant

**Files:**
- Modify: `docs/superpowers/specs/2026-08-02-morulium-mvp-design.md` — the "Invariants" section currently says `mission.ts` and (by implication) `rarity.ts` hide numeric internals behind qualitative feedback. Now that `computeRarity` returns `{ score, tier }`, the invariant needs a caveat.

**Interfaces:** none — doc change only

- [ ] **Step 1: Update the invariants section**

Find the "Hidden info is enforced at the module boundary" bullet in the design spec and replace with:

```markdown
- **Hidden info is enforced at the module boundary — with one deliberate exception.**
  Mission thresholds, allele weights, dominance/recessive carriers are never returned to the
  UI layer — principle 5 becomes a compile-time guarantee, not a discipline. The one exception
  is `computeRarity`, which returns `{ score, tier }`: the numeric score is exposed so the
  tuning/verify harness can measure and iterate on the distribution. The UI layer should
  render only the tier, not the score, but the module boundary permits both.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-08-02-morulium-mvp-design.md
git commit -m "$(cat <<'EOF'
docs(spec): note computeRarity now exposes numeric score

The hidden-info-at-module-boundary invariant now carries one
deliberate exception: computeRarity returns { score, tier } so the
verify harness can measure the distribution. UI still renders tier
only — this is a module-boundary permission, not a UI mandate.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** fix doc §1 → Task 1. §2 → Task 2. §3 → Task 3. §4 → Task 4. §5 → Task 5. §6 → Task 6 (NaN guard + fork test; fork keep + init-loop skip = no-ops, correctly). §7 verify → Task 7. Bonus: design-doc invariant update → Task 8.
- **Type consistency:** `Allele.drawWeight: number`, `weightedPick<T extends { drawWeight: number }>`, `resolveExpressed(locus, pair): Allele`, `computeRarity(genome): { score, tier }` — signatures agree across tasks.
- **Placeholders:** none — every step has real code or a real command.
- **One deliberate deviation from the fix doc:** doc says "keep fork(), add a one-line determinism test" — I added two tests (equal-parent determinism AND parent-stream perturbation). The second one is the load-bearing invariant M2 will rely on, so it's worth the extra test line.
- **YAGNI note:** the verify harness is committed rather than throwaway, because it's a useful tuning tool for every future rebalance. Trivial cost.
- **Test churn:** Tasks 2, 3, 4, 6 all touch tests. Task 3's tie-break rule change is the biggest test-behavior shift; Task 4's return-type change is the biggest test-shape shift.
