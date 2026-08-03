# M1 Minor Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address the accumulated Minor findings from the 6 prior M1 final reviews — code hygiene fixes, missing test coverage, and one small game-design cleanup (adding a w1-recessive to `head` so it matches the other body-part loci's shape).

**Architecture:** Three-task pass grouped by concern. (1) Small code-hygiene changes with zero runtime impact — skip quant loci in `expressPhenotype`, add `scripts/` to tsconfig include, clarify pick.ts fp-safety comment, fix stale genome.test.ts comment, reorder verify-rarity's per-locus loop to use LOCI declaration order. (2) Test coverage additions — an explicit baseline tie-break assertion for the new head_plain baseline, and extending the hand-crafted 14-locus genomes in `genome.test.ts` to include the 2 newer loci (eyes, hide_pattern). (3) Add `head_folded` — a w1-recessive head allele that gives `head` the same 4-allele shape as the other body-part loci (currently head has no recessive path at all).

**Tech Stack:** No new deps. Vite + React + TS + Vitest, existing.

**Source:** Cumulative Minors from M1 sim-foundations, rarity-fix, baselines-and-verify, rarity-tuning, new-loci, and terminology-rename final reviews.

## Global Constraints

- **Branch continuation.** Same `m1-sim-foundations` branch. Do not create a new branch.
- **TS strict.** `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any` in `src/sim/*` or `src/ui/*`.
- **`src/sim/*` PURE** except the existing CLI-guard exception in `src/sim/__demo__.ts`.
- **Vitest imports:** `import { describe, it, expect } from 'vitest'`.
- **Commits:** Conventional Commits + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` on every commit.
- **Do NOT touch:** the Allele type (no new fields), `computeRarity` signature, `resolveExpressed` behavior, existing allele/locus data outside Task 3's single addition, plan docs, `.superpowers/sdd/*` ledgers.

**Key facts already verified from the current code** (implementers don't need to re-verify these — they're accurate as of this plan's authoring):
- `expressPhenotype` (src/sim/genome.ts:39-49) currently iterates `genome.loci` unconditionally, calling `resolveExpressed` on every locus including quantitative ones. Quant loci have `dominance === undefined` on both alleles, so they fall through to the same-class tie-break and produce meaningless "expressed" entries.
- `src/sim/pick.ts:12` returns `items[items.length - 1]!` as the fp-safety fallback (post-`items.length === 0` throw), correct but comment-free.
- `tsconfig.json` currently has `"include": ["src", "tests"]` — `scripts/verify-rarity.ts` is NOT typechecked by `npm run typecheck`.
- `tests/sim/genome.test.ts:86` has a stale comment: `// In head locus, alleles list is [head_maw, head_sensor, head_mandible].` — this is inaccurate since `head_plain` was added at index 0 in the baselines plan. Assertions in that test still hold (head_maw beats head_sensor because head_maw is at index 1, head_sensor at index 2), but the comment misleads readers.
- `scripts/verify-rarity.ts:58` iterates `Object.entries(perLocus)` — that's first-seen order, deterministic in practice but silently reorderable after a future refactor.
- The `expressPhenotype` tests in `tests/sim/genome.test.ts` (multiple cases) hand-craft 14-locus genomes that omit `eyes` and `hide_pattern`. Tests pass because the function iterates genome keys, so missing keys silently drop out — but the fixtures aren't representative of a real rolled genome.
- The `head` locus currently has 4 alleles (`head_plain`/`head_maw`/`head_sensor`/`head_mandible`), all dominant. Every other body-part slot has at least one recessive; head is the odd one out.

---

### Task 1: Code hygiene — 5 small fixes

**Files:**
- Modify: `src/sim/genome.ts` — skip non-qualitative loci in `expressPhenotype`
- Modify: `src/sim/pick.ts` — add a one-line comment on the fp-safety return
- Modify: `tsconfig.json` — add `"scripts"` to `include`
- Modify: `tests/sim/genome.test.ts:86` — update the stale comment to include `head_plain`
- Modify: `scripts/verify-rarity.ts` — iterate the per-locus report in `LOCI` declaration order

**Interfaces produced:** No signatures change. `expressPhenotype` return-type stays `PhenotypeDescriptor`, but `expressed` now has entries ONLY for qualitative loci (previously included quant loci with meaningless values — no existing consumer reads those).

- [ ] **Step 1: Update `src/sim/genome.ts` `expressPhenotype` to skip non-qualitative loci**

Change the loop to filter by `locus.type`:

```ts
export function expressPhenotype(genome: Genome): PhenotypeDescriptor {
  const expressed: Record<string, string> = {};
  for (const [locusId, pair] of Object.entries(genome.loci)) {
    const locus = LOCI[locusId];
    if (!locus) throw new Error(`unknown locus in genome: ${locusId}`);
    if (locus.type !== 'qualitative') continue;      // NEW: skip quant loci
    expressed[locusId] = resolveExpressed(locus, pair).id;
  }
  const paletteId = expressed['palette'];
  if (!paletteId) throw new Error('genome has no palette locus');
  return { expressed, palette: paletteId };
}
```

The `palette` locus is qualitative in the data (LOCI.palette.type === 'qualitative'), so `expressed['palette']` will still be populated. `computeBaseStats` doesn't call `expressPhenotype` (uses `resolveExpressed` directly since the rarity-fix's T5 refactor), so this change is safe for stats.

- [ ] **Step 2: Add clarifying comment to `src/sim/pick.ts`**

At the fp-safety fallback line (currently `return items[items.length - 1]!; // fp safety`), expand the comment so future readers know why it's there:

```ts
  // fp-safety net: unreachable in normal arithmetic (the walk above always
  // finds an item because total > 0 given items.length > 0), but rounding
  // error on `r` could theoretically leave it at exactly 0 after the last
  // decrement. Returning the last item preserves the pick's shape rather
  // than throwing or returning undefined.
  return items[items.length - 1]!;
```

- [ ] **Step 3: Add `scripts/` to `tsconfig.json` include**

Change:
```json
  "include": ["src", "tests"],
```
to:
```json
  "include": ["src", "tests", "scripts"],
```

Then run `npm run typecheck` to confirm `scripts/verify-rarity.ts` now typechecks cleanly (should be clean — it was already valid TS, just not included).

- [ ] **Step 4: Fix stale comment in `tests/sim/genome.test.ts:86`**

Find:
```ts
    // In head locus, alleles list is [head_maw, head_sensor, head_mandible].
    // head_maw is earliest, so it beats head_sensor. head_sensor beats head_mandible.
```

Replace with:
```ts
    // In head locus, alleles list is [head_plain, head_maw, head_sensor, head_mandible].
    // Baseline head_plain is at index 0; head_maw at 1, head_sensor at 2, head_mandible at 3.
    // For pairs NOT involving head_plain, head_maw beats head_sensor (1 < 2), head_sensor
    // beats head_mandible (2 < 3). Assertions in this test use pairs that don't include
    // head_plain — the plain baseline gets its own dedicated tie-break test.
```

(The last sentence sets up Task 2's new assertion.)

- [ ] **Step 5: Reorder `scripts/verify-rarity.ts` per-locus loop to use LOCI order**

Find the current loop:
```ts
for (const [locusId, pl] of Object.entries(perLocus)) {
  const mean = (pl.total / N).toFixed(3);
  // ...
}
```

Change to iterate `LOCI` keys in declaration order and index into `perLocus`:

```ts
for (const locusId of Object.keys(LOCI)) {
  const pl = perLocus[locusId];
  if (!pl) continue;
  const mean = (pl.total / N).toFixed(3);
  const breakdown = Object.entries(pl.byWeight)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([w, n]) => `w${w}:${pct(n)}`)
    .join('  ');
  // eslint-disable-next-line no-console
  console.log(locusId.padEnd(12), `mean ${mean}`.padEnd(13), breakdown);
}
```

- [ ] **Step 6: Run tests + typecheck + verify:rarity + demo**

Run: `npm test`
Expected: 61 passing.

Run: `npm run typecheck`
Expected: clean (verify-rarity.ts is now in scope).

Run: `npm run verify:rarity | tail -20`
Expected: per-locus section now lists loci in LOCI declaration order (musculature, neural_tissue, ... through palette). Since it skips non-qualitative and quantitative loci don't populate `perLocus`, only the qualitative loci appear.

Run: `npm run demo | head -3`
Expected: unchanged — same tier column and phenotype entries. `expressed` map internally is smaller (no quant entries), but the demo only reads specific qualitative keys.

- [ ] **Step 7: Commit**

```bash
git add src/sim/genome.ts src/sim/pick.ts tsconfig.json tests/sim/genome.test.ts scripts/verify-rarity.ts
git commit -m "$(cat <<'EOF'
chore(sim): sweep code-hygiene minors from prior final reviews

Five small fixes bundled together:

1. expressPhenotype now skips non-qualitative loci (was producing
   meaningless "expressed" entries for quant loci via the same-class
   tie-break fall-through; no consumer read those keys but the trap
   is real for future readers).
2. Pick.ts fp-safety return has an explanatory comment so it doesn't
   read as dead code.
3. tsconfig.json now includes scripts/ so verify-rarity.ts typechecks
   with npm run typecheck (was silently skipped).
4. Stale comment in genome.test.ts head-tiebreak test updated to
   include head_plain, which was added at index 0 in the baselines
   plan but the comment still listed the old 3-allele array.
5. verify-rarity.ts per-locus loop iterates LOCI in declaration order
   instead of first-seen order for stable, human-readable output.

Zero runtime behavior changes. Tests still 61/61 green.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Test coverage additions

**Files:**
- Modify: `tests/sim/genome.test.ts` — add a dedicated `head_plain` tie-break test; extend the existing hand-crafted 14-locus genomes to include `eyes` and `hide_pattern`

**Interfaces produced:** No code changes. Only new test cases + fixture extensions.

- [ ] **Step 1: Add dedicated baseline tie-break test in `tests/sim/genome.test.ts`**

Add a new `it()` inside the existing `describe('expressPhenotype', () => { ... })` block, right after the "heterozygous two-dominants" test:

```ts
it('baseline wins any same-class het pairing (head_plain vs any other head dominant)', () => {
  // head_plain is at index 0 in LOCI.head.alleles; all other head alleles are dominant.
  // So head_plain beats head_maw, head_sensor, and head_mandible in any heterozygous pair.
  const pairs: Array<[string, string]> = [
    ['head_plain', 'head_maw'],
    ['head_maw',   'head_plain'],  // pair order should not matter
    ['head_plain', 'head_sensor'],
    ['head_plain', 'head_mandible'],
  ];
  for (const pair of pairs) {
    const p = expressPhenotype(g({
      musculature: ['mus_neutral', 'mus_neutral'], neural_tissue: ['neu_neutral', 'neu_neutral'],
      predator_drive: ['prd_neutral', 'prd_neutral'], carapace_density: ['car_neutral', 'car_neutral'],
      metabolism: ['met_neutral', 'met_neutral'], sinew: ['sin_neutral', 'sin_neutral'],
      vigor: ['vig_neutral', 'vig_neutral'], acuity: ['acu_neutral', 'acu_neutral'],
      head: pair,
      carapace: ['cara_bare', 'cara_bare'],
      locomotion: ['loco_plain', 'loco_plain'],
      appendage: ['app_none', 'app_none'],
      eyes: ['eyes_plain', 'eyes_plain'],
      hide_pattern: ['hide_plain', 'hide_plain'],
      aberration: ['ab_none', 'ab_none'],
      palette: ['pal_ash', 'pal_ash'],
    }));
    expect(p.expressed['head']).toBe('head_plain');
  }
});
```

Note this test's genome ALREADY includes eyes/hide_pattern — that's on purpose to make the fixture representative of a real 16-locus genome.

- [ ] **Step 2: Extend the existing hand-crafted 14-locus genomes to include eyes + hide_pattern**

In `tests/sim/genome.test.ts`, find every hand-crafted genome in the `expressPhenotype` tests (there are roughly 4-5 of them). Each currently has 14 locus entries (missing `eyes` and `hide_pattern`). Add these two lines to each:

```ts
      eyes: ['eyes_plain', 'eyes_plain'],
      hide_pattern: ['hide_plain', 'hide_plain'],
```

Add them in a reasonable position (e.g., between `appendage` and `aberration` to match LOCI declaration order).

The tests you'll need to touch:
- "homozygous locus expresses that allele" (~line 44)
- "heterozygous dominant + recessive expresses the dominant" (~line 58)
- "heterozygous two-dominants — allele that appears earlier in locus.alleles wins" — has TWO genome constructions (~lines 85 and 102)
- "palette expresses via the same rule (order-based tie-break)" (~line 131 or wherever the palette test lives)

Don't add eyes/hide_pattern to the palette test's genome IF that would change what "expressed" contains in a way that affects the assertion. In practice the assertions only check specific keys (head, carapace, palette, etc.) so adding baselines for eyes/hide_pattern is invisible.

- [ ] **Step 3: Run tests to verify pass**

Run: `npm test -- tests/sim/genome.test.ts`
Expected: PASS all tests including the new baseline tie-break test.

Run: `npm test`
Expected: 62 passing (61 previous + 1 new).

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add tests/sim/genome.test.ts
git commit -m "$(cat <<'EOF'
test(sim): add baseline tie-break coverage + extend genomes to 16 loci

Adds an explicit test asserting head_plain (baseline, at index 0)
wins any heterozygous same-class pair with the other head dominants
(maw, sensor, mandible). The tie-break rule was previously covered
only indirectly via the "head_maw beats head_sensor" case.

Also extends every hand-crafted genome in the expressPhenotype
tests to include the eyes and hide_pattern loci (added in the
new-loci plan) with their baseline homozygous pairs. Tests were
passing before because expressPhenotype iterates the genome's own
keys, but the fixtures were pretending to be 14-locus genomes when
the real thing is 16-locus.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Add `head_folded` — w1-recessive head allele for locus-shape symmetry

**Files:**
- Modify: `src/sim/data/alleles.ts` — add `head_folded` allele in the head block
- Modify: `tests/sim/data.test.ts` — the assertion that lists `LOCI.head.alleles` needs updating to include the new allele

**Interfaces produced:**
- New allele `head_folded`: qual, w1, drawWeight default (40), recessive, `{ GUI: 1 }`, no ability, no `part` field
- `LOCI.head.alleles` becomes `['head_plain', 'head_maw', 'head_sensor', 'head_mandible', 'head_folded']` — baseline first, dominants next, recessive last (matching cara_hide's position at the end of `LOCI.carapace.alleles`)
- ALLELES total: 53 → 54
- Head locus: 4 alleles → 5 alleles

**Design rationale (for the reviewer):**
- Every other body-part slot has at least one recessive; head was the only one without. Adding `head_folded` gives head the "carrier expresses baseline, homozygous recessive expresses w1" pattern that the other loci already have.
- Placed LAST in `LOCI.head.alleles` (after all dominants) so it stays hidden from the same-class tie-break — the tie-break only fires when both alleles are same-class, so recessive-vs-recessive is the only case, and that's genuinely rare.
- Small `{ GUI: 1 }` stat contribution — a folded/retracted head thematically suggests concealment. This is a balance-neutral placeholder; the user can rebalance later.
- No `ability` field (consistent with cara_hide, loco_bulk, and every other recessive at w1).
- No `part` field (Allele type doesn't carry it — deferred to M2 sprite renderer).
- Predicted distribution effect: negligible. head_folded's expressed rate ≈ (40/284)² ≈ 2%, adding rarity weight 1 to those units. Basic mass drops ~1-2pp, Adapted/Evolved go up ~1pp combined.

- [ ] **Step 1: Add `head_folded` to the head block in `src/sim/data/alleles.ts`**

Insert as the LAST line in the head block (after `head_mandible`):

```ts
// head — baseline first, dominants, then recessive last
qual('head_plain',    'head', 'Blunt Head',       0, 'dominant',  { PWR: 1 }, undefined, 180),
qual('head_maw',      'head', 'Maw',              3, 'dominant',  { PWR: 3 }, 'Rend'),
qual('head_sensor',   'head', 'Sensor-Cluster',   3, 'dominant',  { INT: 3 }, 'Recon'),
qual('head_mandible', 'head', 'Mandibles',        1, 'dominant',  { PWR: 1 }, 'Grip'),
qual('head_folded',   'head', 'Folded Head',      1, 'recessive', { GUI: 1 }),
```

- [ ] **Step 2: Update the head-locus assertion in `tests/sim/data.test.ts`**

Find the test that asserts `LOCI['head']!.alleles` order. It currently reads:

```ts
expect(LOCI['head']!.alleles).toEqual(['head_plain', 'head_maw', 'head_sensor', 'head_mandible']);
```

(Or similar. The exact test name may be "baseline alleles are listed FIRST in their locus alleles array" or a head-specific test.)

Update to include the new allele at the end:

```ts
expect(LOCI['head']!.alleles).toEqual(['head_plain', 'head_maw', 'head_sensor', 'head_mandible', 'head_folded']);
```

Also add a targeted allele-presence test (right after the existing head-order assertion):

```ts
it('head_folded is w1-recessive with expected drawWeight and dominance', () => {
  const a = ALLELES['head_folded'];
  expect(a, 'missing head_folded').toBeDefined();
  expect(a!.rarityWeight).toBe(1);
  expect(a!.drawWeight).toBe(40);   // default for w1 via DRAW_WEIGHT_BY_RARITY
  expect(a!.dominance).toBe('recessive');
  expect(a!.locus).toBe('head');
});
```

- [ ] **Step 3: Run data tests to verify pass**

Run: `npm test -- tests/sim/data.test.ts`
Expected: PASS all data-integrity tests including the head_folded assertion.

- [ ] **Step 4: Run full suite + typecheck**

Run: `npm test`
Expected: 63 passing (62 previous + 1 new head_folded test). If any other test breaks due to a hard-coded head allele count, note it in the report — none should, but confirm.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Run `npm run verify:rarity` and CAPTURE the full output verbatim**

Run: `npm run verify:rarity`
Expected: three sections. Capture the entire output verbatim in the task report.

Compare to the previous distribution (Basic 63.31% / Variant 28.01% / Adapted 3.17% / Evolved 4.38% / Apex 1.13%). Note the shift in the report but do NOT further adjust anything — this is a measurement.

- [ ] **Step 6: Commit**

```bash
git add src/sim/data/alleles.ts tests/sim/data.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): add head_folded (w1-recessive) — head gets a recessive path

Every other body-part slot has at least one recessive allele; head
was the only one without. head_folded is w1, drawWeight 40, recessive,
{ GUI: 1 }, placed last in the head allele order so it stays out of
the same-class dominant tie-break. Fits the same shape as cara_hide,
loco_bulk, and app_none (recessives at the tail of their loci).

Expected distribution effect: negligible per-hatch shift (~2%
homozygous-folded rate contributing +1 to score). Real point is
locus-shape symmetry, not tuning.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** T1 addresses 5 code-hygiene Minors. T2 addresses 2 test-coverage Minors. T3 addresses 1 locus-shape Minor (head asymmetry). All 8 items match the list I gave the human in the sweep-option handoff.
- **Type consistency:** No signatures change across the plan. New `head_folded` uses the existing `qual()` helper. New test uses the existing `g()` helper and `expressPhenotype`.
- **Placeholders:** none — every step has real code or a real command.
- **Task splitting rationale:** T1 is behavior-neutral hygiene (5 tiny files). T2 is test-only. T3 introduces a real data addition. Splitting keeps reviews focused.
- **Deliberate scope constraints:** Not touching the older-loci baseline drawWeight (opus's other suggested lever) — that's a separate tuning call, not a listed Minor from any review, and not what "sweep the Minors" asks for. If the user wants it later, one more task.
- **head_folded naming/stats:** proposed with rationale (folded/retracted head → GUI+1). User can rename or adjust stats — the addition itself is the point.
