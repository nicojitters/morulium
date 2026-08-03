# M1 Baselines + Verify Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three weight-0 baseline alleles (head_plain, cara_bare, loco_plain) so Basic tier becomes reachable in the rarity distribution, and upgrade `scripts/verify-rarity.ts` to print a score histogram + per-locus contribution breakdown so the human tuning pass has visibility into where score mass sits.

**Architecture:** Two mechanical changes stacked. (1) Three new dominant weight-0 qualitative alleles land at the TOP of their respective locus's block in the QUALITATIVE array (the `locus()` helper preserves insertion order, and the same-class dominance tie-break in `resolveExpressed` uses that order — baseline-first is what makes plain the default expression). (2) `verify-rarity.ts` gains a score histogram and per-locus mean/breakdown, reusing `resolveExpressed` so its numbers can't diverge from `computeRarity`.

**Tech Stack:** No new deps. Vite + React + TS + Vitest, existing.

**Source spec:** `~/Downloads/m1-baseline-alleles-and-verify.md` (handed over 2026-08-03).

## Global Constraints

- **Branch continuation.** Same `m1-sim-foundations` branch. Do not create a new branch.
- **TS strict.** `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any` in `src/sim/*`.
- **`src/sim/*` PURE.** Only the existing CLI-guard exception in `src/sim/__demo__.ts` is allowed.
- **`Allele.part` is deferred.** The source doc includes `part: { slot, shape }` on the new alleles, but our current `Allele` type has no `part` field (that lands with the M2 sprite renderer). Do NOT add `part` fields in this pass. Do NOT extend the `Allele` type here.
- **statDeltas balance choice.** The new baselines carry `{ X: 1 }` per the source doc's literal code (head_plain → `{ PWR: 1 }`, cara_bare → `{ VIT: 1 }`, loco_plain → `{ SPD: 1 }`). Do NOT change to `{}` — that's a deliberate handoff-time choice for the human.
- **Insertion order is load-bearing.** In `src/sim/data/alleles.ts`, each new baseline MUST be added at the TOP of its locus's block in the `QUALITATIVE` array (before the other qualitative alleles for the same locus). The `locus()` helper in `src/sim/data/loci.ts` filters `Object.values(ALLELES)` in insertion order, and `resolveExpressed`'s same-class tie-break uses `locus.alleles.indexOf(...)`, so "listed first" is what makes the baseline the default expression when heterozygous with another dominant.
- **Do NOT rebalance tuning knobs based on the harness output.** After the harness runs, capture output verbatim in the report and hand off to the human. Do not change drawWeights, aberration overrides, or tier thresholds even if the distribution is "off."
- **Vitest imports:** `import { describe, it, expect } from 'vitest'`.
- **Commits:** Conventional Commits + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` on every commit.

---

### Task 1: Add three baseline alleles + update affected tests

**Files:**
- Modify: `src/sim/data/alleles.ts` — add head_plain, cara_bare, loco_plain to the QUALITATIVE array, each at the TOP of its respective locus block
- Modify: `tests/sim/data.test.ts` — add one test asserting the three baselines exist with `rarityWeight: 0`, `drawWeight: 180`, `dominance: 'dominant'`
- Modify: `tests/sim/rarity.test.ts` — the current MIN_QUALITATIVE genome scores 3 (via head_mandible=1 + cara_chitin=1 + loco_bulk=1). With the baselines available, update tests to reflect that a genome expressing the baselines scores 0 → Basic.
- Modify: `tests/sim/genome.test.ts` — verify no existing tie-break tests break due to the reorder. Some tests use `head_sensor`/`head_maw` etc. and the `head_plain` addition shifts their indices; assertions using `head_maw` beats `head_sensor` still hold (head_maw is index 1, head_sensor index 2 after reorder). No change expected, but re-run the file to confirm.
- Modify: `tests/sim/stats.test.ts` — the `NEUTRAL_QUAL` const uses `head_mandible` etc.; base-stat expectations there depend on the qual alleles chosen. These tests assert dose additions relative to `BASE_STATS`, so they should still pass. Re-run to confirm; no code change expected.

**Interfaces produced:**
- Three new alleles registered in `ALLELES`:
  - `head_plain`: qual, weight 0, drawWeight 180, dominant, `{PWR: 1}`
  - `cara_bare`: qual, weight 0, drawWeight 180, dominant, `{VIT: 1}`
  - `loco_plain`: qual, weight 0, drawWeight 180, dominant, `{SPD: 1}`
- `LOCI.head.alleles` becomes `['head_plain', 'head_maw', 'head_sensor', 'head_mandible']`
- `LOCI.carapace.alleles` becomes `['cara_bare', 'cara_chitin', 'cara_bone', 'cara_hide']`
- `LOCI.locomotion.alleles` becomes `['loco_plain', 'loco_sprint', 'loco_burrow', 'loco_bulk']`
- ALLELES total: 42 → 45

- [ ] **Step 1: Add the failing baseline-presence test to `tests/sim/data.test.ts`**

Add to the existing `describe('data integrity', () => { ... })` block:

```ts
it('has weight-0 baseline alleles head_plain, cara_bare, loco_plain with drawWeight 180', () => {
  for (const id of ['head_plain', 'cara_bare', 'loco_plain']) {
    const a = ALLELES[id];
    expect(a, `missing baseline allele ${id}`).toBeDefined();
    expect(a!.rarityWeight).toBe(0);
    expect(a!.drawWeight).toBe(180);
    expect(a!.dominance).toBe('dominant');
  }
});

it('baseline alleles are listed FIRST in their locus alleles array', () => {
  expect(LOCI['head']!.alleles[0]).toBe('head_plain');
  expect(LOCI['carapace']!.alleles[0]).toBe('cara_bare');
  expect(LOCI['locomotion']!.alleles[0]).toBe('loco_plain');
});
```

If `LOCI` is not already imported at the top of the file, add it: `import { ALLELES, LOCI, PALETTES } from '../../src/sim/data/loci';` (only if not already present — the file already imports ALLELES and PALETTES).

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/sim/data.test.ts`
Expected: FAIL — the three baseline ids don't exist yet.

- [ ] **Step 3: Add the three baseline alleles to `src/sim/data/alleles.ts`**

In the `QUALITATIVE` array, add each baseline at the TOP of its locus's block. Use the existing `qual` helper. Order matters for the tie-break rule — new lines go BEFORE the existing lines for that locus:

```ts
// head — baseline first (weight 0, dominant, heavy draw)
qual('head_plain',    'head', 'Blunt Head',       0, 'dominant', { PWR: 1 }, undefined, 180),
qual('head_maw',      'head', 'Maw',              3, 'dominant', { PWR: 3 }, 'Rend'),
qual('head_sensor',   'head', 'Sensor-Cluster',   3, 'dominant', { INT: 3 }, 'Recon'),
qual('head_mandible', 'head', 'Mandibles',        1, 'dominant', { PWR: 1 }, 'Grip'),

// carapace — baseline first
qual('cara_bare',     'carapace', 'Bare Hide',    0, 'dominant',  { VIT: 1 }, undefined, 180),
qual('cara_chitin',   'carapace', 'Chitin',       1, 'dominant',  { VIT: 1 }),
qual('cara_bone',     'carapace', 'Bone-Plate',   3, 'dominant',  { VIT: 3, SPD: -1 }, 'Bulwark'),
qual('cara_hide',     'carapace', 'Hide',         1, 'recessive', { VIT: 1, SPD: 1 }),

// locomotion — baseline first
qual('loco_plain',    'locomotion', 'Plain Limbs',  0, 'dominant',  { SPD: 1 }, undefined, 180),
qual('loco_sprint',   'locomotion', 'Sprint-Limbs', 3, 'dominant',  { SPD: 3 }, 'Sprint'),
qual('loco_burrow',   'locomotion', 'Burrowers',    3, 'dominant',  { GUI: 3 }, 'Ambush'),
qual('loco_bulk',     'locomotion', 'Bulk-Treads',  1, 'recessive', { VIT: 2, SPD: -1 }),
```

Do not modify appendage, aberration, or palette blocks — they stay as they are.

- [ ] **Step 4: Run data tests to verify pass**

Run: `npm test -- tests/sim/data.test.ts`
Expected: PASS — the two new baseline-presence tests should pass; all existing data-integrity tests should also still pass (drawWeight positive, allele-in-locus consistency, etc.).

- [ ] **Step 5: Run full test suite to see what other tests need updating**

Run: `npm test`
Expected: rarity.test.ts will have failures because the MIN_QUALITATIVE genome no longer scores 3 (it can't reach 0 with its old shape — but now that Basic is reachable, we should also change what MIN_QUALITATIVE is). Other test files should still pass.

If genome.test.ts or stats.test.ts show unexpected failures, STOP and report them — they weren't expected to break.

- [ ] **Step 6: Update `tests/sim/rarity.test.ts` to reflect that Basic is now reachable**

Replace the `MIN_QUALITATIVE` const at the top of the file — the new minimum uses the baseline alleles:

```ts
// A "min-qualitative" genome using the weight-0 baselines wherever available.
// Expressed weights: head_plain=0, cara_bare=0, loco_plain=0, app_none=0, ab_none=0, pal_ash=0.
// Score = 0 → Basic.
const MIN_QUALITATIVE: Record<string, [string, string]> = {
  musculature:      ['mus_neutral', 'mus_neutral'],
  neural_tissue:    ['neu_neutral', 'neu_neutral'],
  predator_drive:   ['prd_neutral', 'prd_neutral'],
  carapace_density: ['car_neutral', 'car_neutral'],
  metabolism:       ['met_neutral', 'met_neutral'],
  sinew:            ['sin_neutral', 'sin_neutral'],
  vigor:            ['vig_neutral', 'vig_neutral'],
  acuity:           ['acu_neutral', 'acu_neutral'],
  head:             ['head_plain',  'head_plain'],
  carapace:         ['cara_bare',   'cara_bare'],
  locomotion:       ['loco_plain',  'loco_plain'],
  appendage:        ['app_none',    'app_none'],
  aberration:       ['ab_none',     'ab_none'],
  palette:          ['pal_ash',     'pal_ash'],
};
```

Then update the assertions in the existing tests. Replace the file's `describe('computeRarity — expressed-only, qualitative-only', () => { ... })` body with:

```ts
describe('computeRarity — expressed-only, qualitative-only', () => {
  it('returns { score, tier } for the all-baseline genome (score 0 → Basic)', () => {
    const result = computeRarity(genome(MIN_QUALITATIVE));
    expect(result.score).toBe(0);
    expect(result.tier).toBe('Basic');
  });

  it('quantitative-only spike does not raise score', () => {
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
    expect(carrier.score).toBe(0); // unchanged from baseline
  });

  it('homozygous ab_voltaic expresses and adds its full weight', () => {
    // ab_voltaic homozygous → weight 10. Total 0 + 10 = 10 → Variant (upper edge)
    const wild = computeRarity(genome({
      ...MIN_QUALITATIVE,
      aberration: ['ab_voltaic', 'ab_voltaic'],
    }));
    expect(wild.score).toBe(10);
    expect(wild.tier).toBe('Variant');
  });

  it('a genome loaded with expressed Adapted alleles hits Apex', () => {
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

- [ ] **Step 7: Run rarity tests to verify pass**

Run: `npm test -- tests/sim/rarity.test.ts`
Expected: PASS all 5 tests.

- [ ] **Step 8: Run full suite + typecheck**

Run: `npm test`
Expected: everything green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add src/sim/data/alleles.ts tests/sim/data.test.ts tests/sim/rarity.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): add weight-0 baseline alleles (head_plain, cara_bare, loco_plain)

Makes Basic tier reachable. Each baseline is dominant, weight 0,
drawWeight 180, and listed FIRST in its locus's allele array so it
wins same-class dominance ties and becomes the default expressed
allele on heterozygous hatches.

The 'part' field from the source doc is intentionally omitted — the
Allele type does not carry a 'part' field until M2 lands the sprite
renderer. Small statDeltas ({ X: 1 }) are retained per the source
doc's literal code; switching to {} for pure filler is a deliberate
handoff-time choice for the human.

MIN_QUALITATIVE in rarity tests now scores 0 (Basic). All other test
expectations follow from that shift.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Upgrade `verify:rarity` with score histogram + per-locus breakdown, and run it

**Files:**
- Modify: `scripts/verify-rarity.ts` — full rewrite per source doc §2
- No test file changes (this is tooling, not sim code)

**Interfaces produced:**
- Same npm command (`npm run verify:rarity`), richer output
- Runs 20,000 hatches (up from 10,000)
- Prints tier distribution, score histogram (with ascii bars), and per-locus contribution breakdown

- [ ] **Step 1: Replace the contents of `scripts/verify-rarity.ts`**

```ts
import { createRng } from '../src/sim/rng';
import { rollGenome } from '../src/sim/genome';
import { computeRarity } from '../src/sim/rarity';
import { resolveExpressed } from '../src/sim/genome';
import { LOCI } from '../src/sim/data/loci';

const N = 20_000;

const tierTally: Record<string, number> = {};
const scoreHist: Record<number, number> = {};
const perLocus: Record<string, { total: number; byWeight: Record<number, number> }> = {};

for (let i = 0; i < N; i++) {
  const g = rollGenome(createRng(i + 1));
  const { score, tier } = computeRarity(g);

  tierTally[tier] = (tierTally[tier] ?? 0) + 1;
  scoreHist[score] = (scoreHist[score] ?? 0) + 1;

  for (const [locusId, pair] of Object.entries(g.loci)) {
    const locus = LOCI[locusId];
    if (!locus) continue;
    if (locus.type !== 'qualitative') continue;
    const w = resolveExpressed(locus, pair).rarityWeight;
    const pl = (perLocus[locusId] ??= { total: 0, byWeight: {} });
    pl.total += w;
    pl.byWeight[w] = (pl.byWeight[w] ?? 0) + 1;
  }
}

const pct = (n: number): string => `${((100 * n) / N).toFixed(2)}%`;

// eslint-disable-next-line no-console
console.log(`\n=== TIER DISTRIBUTION (N=${N}) ===`);
for (const tier of ['Basic', 'Variant', 'Adapted', 'Evolved', 'Apex']) {
  const n = tierTally[tier] ?? 0;
  // eslint-disable-next-line no-console
  console.log(tier.padEnd(9), String(n).padStart(6), pct(n).padStart(8));
}

// eslint-disable-next-line no-console
console.log(`\n=== SCORE HISTOGRAM ===`);
const scoreKeys = Object.keys(scoreHist).map(Number);
const maxScore = scoreKeys.length > 0 ? Math.max(...scoreKeys) : 0;
for (let s = 0; s <= maxScore; s++) {
  const n = scoreHist[s] ?? 0;
  if (!n) continue;
  const bar = '#'.repeat(Math.round((60 * n) / N));
  // eslint-disable-next-line no-console
  console.log(String(s).padStart(3), String(n).padStart(6), pct(n).padStart(8), bar);
}

// eslint-disable-next-line no-console
console.log(`\n=== PER-LOCUS EXPRESSED CONTRIBUTION (qualitative only) ===`);
for (const [locusId, pl] of Object.entries(perLocus)) {
  const mean = (pl.total / N).toFixed(3);
  const breakdown = Object.entries(pl.byWeight)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([w, n]) => `w${w}:${pct(n)}`)
    .join('  ');
  // eslint-disable-next-line no-console
  console.log(locusId.padEnd(12), `mean ${mean}`.padEnd(13), breakdown);
}
```

Two implementation notes:
- The source doc's import `import { resolveExpressed } from '../src/sim/genetics';` uses a wrong path — our helper lives in `src/sim/genome.ts`. Import path corrected above.
- Under `noUncheckedIndexedAccess`, `LOCI[locusId]` is `Locus | undefined`. The `if (!locus) continue;` guard handles the undefined case, matching how the demo and other consumers guard.

- [ ] **Step 2: Run `npm run typecheck` to confirm the script's types are still OK from the workspace typecheck perspective**

Run: `npm run typecheck`
Expected: clean. (Note: `scripts/` may or may not be covered by tsconfig.include — that's a separate item flagged elsewhere. If typecheck doesn't visit the file, that's fine for this task; just confirm no error surfaces.)

- [ ] **Step 3: Run the harness and CAPTURE the exact output**

Run: `npm run verify:rarity`
Expected: three sections — tier distribution, score histogram (with bars), per-locus contribution.

**DO NOT** adjust drawWeights, aberration overrides, or tier thresholds based on the output — only report it.

- [ ] **Step 4: Run full suite to make sure nothing else broke**

Run: `npm test`
Expected: everything green.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-rarity.ts
git commit -m "$(cat <<'EOF'
chore(sim): upgrade verify:rarity with histogram + per-locus breakdown

Adds a score histogram (where mass sits → where thresholds belong)
and a per-locus expressed-weight breakdown (which locus is inflating
the score) so the human tuning pass can carve the tail they see
instead of guessing.

Reuses resolveExpressed so the harness cannot diverge from
computeRarity's math. N increased to 20,000 for cleaner distribution
signal.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** source doc §1 (baselines + wire-up) → Task 1. §2 (upgraded harness) → Task 2. The doc's "loop" §3 is guidance for the human's tuning pass — not for me to run; captured as global-constraint text.
- **Type consistency:** `Allele` type unchanged; three new alleles use the existing `qual` helper. `resolveExpressed` signature unchanged. `computeRarity` signature unchanged. Harness reuses same imports as before.
- **Placeholders:** none — every step has real code or a real command.
- **Deliberate deviations from source doc:** (a) `part` fields omitted (Allele type doesn't carry `part` yet — deferred to M2), (b) import path for `resolveExpressed` corrected to `../src/sim/genome` (doc had `genetics` as a placeholder).
- **Balance choice noted:** baselines get `{ X: 1 }` per doc's literal code; the pure-filler `{}` alternative is a handoff-time decision left to the human.
- **Test churn:** rarity.test.ts is the only test file with real content changes (MIN_QUALITATIVE now scores 0 instead of 3, downstream assertions adjust). genome.test.ts and stats.test.ts should not need changes; if they do, that's a red flag worth stopping on.
