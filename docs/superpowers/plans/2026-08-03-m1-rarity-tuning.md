# M1 Rarity Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get all five rarity tiers to actually appear in the fresh-hatch distribution — currently 100% of rolls land in Basic (67%) or Variant (33%), so Adapted/Evolved/Apex are unreachable via hatching and the "rare discovery" fantasy (game spec §3) doesn't fire.

**Architecture:** Two stacked tuning changes. (1) Bump the aberration recessive draw weights so wild aberrations occasionally home (ab_none dominance preserved — most hatches are still normal). This restores the Apex tail via the aberration mechanic, matching the game-spec's design intent. (2) Rescale `tierForScore` thresholds to describe the observed histogram, so Adapted/Evolved appear as populated bands instead of empty ones. Deliberately NOT taking Lever 1 (`app_stub`) — it would push more mass into Basic and make the tail thinner, not thicker.

**Tech Stack:** No new deps. Vite + React + TS + Vitest, existing.

**Design intent (target distribution):** Basic-dominant (~55%), Variant next (~30%), thin tail through Adapted (~10%) / Evolved (~4%) / Apex (~1%). This matches game spec §3's "computed rarity, thin apex tail" model.

## Global Constraints

- **Branch continuation.** Same `m1-sim-foundations` branch. Do not create a new branch.
- **TS strict.** `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any` in `src/sim/*`.
- **`src/sim/*` PURE.** Only the existing CLI-guard exception in `src/sim/__demo__.ts` is allowed.
- **Tuning happens in two commits, not one.** Task 1 lands the aberration bump alone so we can measure its effect BEFORE choosing thresholds. Task 2 reads Task 1's histogram output and derives thresholds from real data, not guesses.
- **Test-value asserts should be robust, not fragile.** The current `data.test.ts` asserts exact drawWeight values (200/1/1). We're changing those; rather than hard-code new specific values, refactor to a RELATIONSHIP assertion (`ab_none.drawWeight` > `ab_voltaic.drawWeight + ab_corrosive.drawWeight`), so a future tuning pass doesn't have to rewrite the test.
- **Do NOT change:** aberration allele set (still `ab_none`/`ab_voltaic`/`ab_corrosive`), aberration allele order (`ab_none` first for tie-break), aberration dominance (`ab_none` dominant, wilds recessive), the shared `resolveExpressed` helper, `computeRarity`'s signature or expressed-only logic, allele/locus tables outside aberration.
- **Vitest imports:** `import { describe, it, expect } from 'vitest'`.
- **Commits:** Conventional Commits + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` on every commit.

---

### Task 1: Bump aberration recessive drawWeights (Lever 2)

**Files:**
- Modify: `src/sim/data/alleles.ts` — change aberration `drawOverride` values
- Modify: `tests/sim/data.test.ts` — refactor the aberration-values test from exact-values to a relationship assertion

**Interfaces produced:**
- New aberration draw distribution:
  - `ab_none.drawWeight = 60` (was 200)
  - `ab_voltaic.drawWeight = 5` (was 1)
  - `ab_corrosive.drawWeight = 5` (was 1)
- Total aberration draw pool: 70 (was 202)
- P(single roll = ab_voltaic) = 5/70 ≈ 7.1%, P(homozygous voltaic) ≈ 0.51%
- P(single roll = ab_corrosive) ≈ 7.1%, P(homozygous corrosive) ≈ 0.51%
- P(any wild homozygous per hatch) ≈ 1.02%
- P(carrier — at least one recessive allele) ≈ 25.5% per hatch
- These are the starting values. If Task 2 shows Apex is still too rare/common, the human tunes.

**Design constraints preserved:**
- `ab_none` still dominates (60 >> 5+5=10)
- Most hatches still express `ab_none` (about 85% homozygous ab_none, ~15% carrier, ~1% wild expressed)
- Wild aberrations remain "rare and special" — 1-in-100 not 1-in-40000

- [ ] **Step 1: Modify `src/sim/data/alleles.ts` — bump the aberration overrides**

Find the aberration block in the QUALITATIVE array (after Task 1 of the baselines plan reordered ab_none-first). Change the three `drawOverride` values:

```ts
// aberration (rare recessive tree — game spec §2)
qual('ab_none',       'aberration', 'None',       0, 'dominant',  {},          undefined,  60),
qual('ab_voltaic',    'aberration', 'Voltaic',   10, 'recessive', { VIT: -2 }, 'Shock',     5),
qual('ab_corrosive',  'aberration', 'Corrosive', 10, 'recessive', { SPD: -2 }, 'Melt',      5),
```

Only the LAST parameter changes on each of the three lines (200→60, 1→5, 1→5). Everything else stays exactly as it is.

- [ ] **Step 2: Refactor the aberration-values test in `tests/sim/data.test.ts`**

Find the existing test:

```ts
it('aberration draw distribution: ab_none dominant, ab_voltaic and ab_corrosive very rare', () => {
  expect(ALLELES['ab_none']!.drawWeight).toBe(200);
  expect(ALLELES['ab_voltaic']!.drawWeight).toBe(1);
  expect(ALLELES['ab_corrosive']!.drawWeight).toBe(1);
});
```

Replace with a relationship assertion that survives future tuning:

```ts
it('aberration draw distribution: ab_none dominant, ab_voltaic and ab_corrosive both recessive-rare', () => {
  const none = ALLELES['ab_none']!.drawWeight;
  const voltaic = ALLELES['ab_voltaic']!.drawWeight;
  const corrosive = ALLELES['ab_corrosive']!.drawWeight;
  // ab_none must dominate the pool so most hatches express ab_none
  expect(none).toBeGreaterThan(voltaic + corrosive);
  // Wild aberrations must be genuinely rare
  expect(voltaic).toBeLessThan(none / 4);
  expect(corrosive).toBeLessThan(none / 4);
  // Wilds should be roughly balanced with each other (within 3× either direction)
  expect(voltaic).toBeLessThanOrEqual(corrosive * 3);
  expect(corrosive).toBeLessThanOrEqual(voltaic * 3);
});
```

- [ ] **Step 3: Run the data tests to verify pass**

Run: `npm test -- tests/sim/data.test.ts`
Expected: PASS.

- [ ] **Step 4: Run full test suite + typecheck**

Run: `npm test`
Expected: 57/57 pass. If anything else breaks, STOP and report — no other test should reference aberration drawWeight exact values.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Run `npm run verify:rarity` and capture the output verbatim**

Run: `npm run verify:rarity`
Expected: three sections (tier distribution, score histogram, per-locus breakdown) over 20k hatches. Capture the entire output verbatim in the task report — Task 2 will read this file and use it to choose thresholds.

- [ ] **Step 6: Commit**

```bash
git add src/sim/data/alleles.ts tests/sim/data.test.ts
git commit -m "$(cat <<'EOF'
tune(sim): bump aberration recessive draws so wild aberrations occasionally home

ab_none=60 (was 200), ab_voltaic=5 (was 1), ab_corrosive=5 (was 1).
ab_none still dominates the pool (60 >> 10), so most hatches still
express baseline. But wild aberrations now hit ~1% of hatches
(homozygous voltaic or corrosive), giving the aberration mechanic its
intended "rare discovery" role — game spec §3.

Data test refactored from exact-value assertions to relationship
assertions so future tuning passes don't have to rewrite the test.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Rescale tier thresholds from the observed histogram (Lever 3)

**Files:**
- Modify: `src/sim/rarity.ts` — update the `tierForScore` thresholds
- Modify: `tests/sim/rarity.test.ts` — update the tier expectations for the existing 5 tests (scores don't change, but their bucket names might)
- Modify: `docs/superpowers/specs/2026-08-02-morulium-mvp-design.md` — the design spec references the old thresholds (0-2/3-10/11-14/15-19/20+); update to the new values
- (Read only): `.superpowers/sdd/2026-08-03-m1-rarity-tuning/task-1-report.md` — the histogram from Task 1

**Interfaces produced:**
- New `tierForScore` thresholds derived from Task 1's histogram using the algorithm below
- Same `computeRarity(genome): { score: number; tier: Tier }` signature — behavior at score N may map to a different tier now
- The 5 rarity tests still exist with the same input genomes; only their `.toBe(tier)` assertions may change

**Threshold-selection algorithm (deterministic; run against Task 1's histogram):**

1. Read the score histogram from `task-1-report.md`. Build `cumFrac[s]` = cumulative fraction of rolls with score ≤ s.
2. Choose thresholds such that the cumulative fraction crosses the target boundaries:
   - `basicMax` = smallest `s` with `cumFrac[s] >= 0.55` (Basic covers scores ≤ basicMax → ~55% of hatches)
   - `variantMax` = smallest `s > basicMax` with `cumFrac[s] >= 0.85` (Variant adds up to ~30% more)
   - `adaptedMax` = smallest `s > variantMax` with `cumFrac[s] >= 0.95` (Adapted adds up to ~10% more)
   - `evolvedMax` = smallest `s > adaptedMax` with `cumFrac[s] >= 0.99` (Evolved adds up to ~4% more)
   - Everything above `evolvedMax` → Apex (~1%)
3. If two thresholds would collide (histogram is too sparse to give distinct cutoffs at every target boundary), advance by 1 — e.g. if `basicMax == variantMax`, set `variantMax = basicMax + 1`. Do this greedily left-to-right so tier bands stay strictly increasing.
4. If the histogram tops out at `maxScore` before hitting a target boundary, set the remaining thresholds to `maxScore` (so their tier is unreachable but the thresholds are internally consistent).

**Expected output shape:** the algorithm should produce 4 integer thresholds, all in the observed score range. Given Task 1's expected histogram (mass peaks in 0–4, thins fast, small Apex tail from aberration bumps), reasonable results might look like `basicMax=1, variantMax=4, adaptedMax=8, evolvedMax=15`. Don't hard-code — compute from the histogram.

- [ ] **Step 1: Read the Task 1 histogram**

Read `.superpowers/sdd/2026-08-03-m1-rarity-tuning/task-1-report.md` and copy the SCORE HISTOGRAM section into scratch. It's a table of `score  count  pct` lines. Compute cumulative fractions from those counts.

Show your work in the task report: list `cumFrac[s]` for every score bucket that appeared.

- [ ] **Step 2: Compute the four thresholds per the algorithm above**

Apply the algorithm. Record the chosen `basicMax`, `variantMax`, `adaptedMax`, `evolvedMax` and the cumulative-fraction values they satisfy. Also record what target percentage each threshold ACHIEVED (may differ from target because the histogram is discrete).

If any collision-advancement fired, note which one.

- [ ] **Step 3: Modify `src/sim/rarity.ts` — update `tierForScore` with the new thresholds**

Find the file-local `tierForScore` function and update the four boundary values. Keep the function shape exactly (5 tiers, `if (score <= ...)` ladder). For example (using illustrative values — replace with your computed ones):

```ts
function tierForScore(score: number): Tier {
  if (score <= 1) return 'Basic';
  if (score <= 4) return 'Variant';
  if (score <= 8) return 'Adapted';
  if (score <= 15) return 'Evolved';
  return 'Apex';
}
```

- [ ] **Step 4: Update `tests/sim/rarity.test.ts` — adjust tier expectations**

The 5 tests still have the same input genomes and scores. Recompute what tier each test's input score maps to under the NEW thresholds, and update the `.toBe(tier)` assertions accordingly:

- Test "returns { score, tier } for the all-baseline genome (score 0 → Basic)": score 0 → still Basic (under any reasonable rescale, since Basic covers score 0). Assertion may not need to change.
- Test "quantitative-only spike does not raise score": score comparison, doesn't touch tier.
- Test "recessive carrier scores 0 at that locus": asserts `.score` equals baseline, doesn't touch tier.
- Test "homozygous ab_voltaic expresses and adds its full weight": input score is 10. New tier depends on where you set `adaptedMax`/`evolvedMax`. **Compute what tier 10 maps to under your new thresholds** and update the assertion (was `Variant`).
- Test "a genome loaded with expressed Adapted alleles hits Apex": input score is 22. If any threshold sets `evolvedMax >= 22`, this would NOT be Apex. Verify: since we're rescaling to fit the observed histogram (max score ~13 in Task 1's measurement), `evolvedMax` should be well below 22, so 22 → Apex still holds. Confirm and leave the assertion as-is.

Also update the test's docstring/comments to reflect the new threshold values.

- [ ] **Step 5: Update the design spec's threshold reference**

Find in `docs/superpowers/specs/2026-08-02-morulium-mvp-design.md` — the "Locked decisions" table or wherever the tier thresholds are mentioned. If the spec doesn't reference the specific numbers, no change needed. If it does (search for `0-2` / `3-10` / `11-14` / `15-19` / `20+` or similar), update to the new values.

If no spec update is needed (spec is silent on specific threshold numbers), note that in the report and skip this file.

- [ ] **Step 6: Run rarity tests + full suite + typecheck**

Run: `npm test -- tests/sim/rarity.test.ts`
Expected: PASS all 5 tests.

Run: `npm test`
Expected: 57/57.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 7: Run `npm run verify:rarity` and capture the new distribution**

Run: `npm run verify:rarity`
Expected: three sections. Capture the entire tier distribution table verbatim in the task report — this is the "after both levers" measurement.

Note in the report: is the distribution roughly matching the target (Basic-dominant, Variant next, thin tail, Apex ~1-2%)? If it's meaningfully off in a way suggesting the algorithm needs adjustment (e.g., a tier band is completely empty because two thresholds collided at the same score), note it clearly. DO NOT further adjust thresholds beyond what the algorithm produced — that's the human's iteration decision.

- [ ] **Step 8: Commit**

```bash
git add src/sim/rarity.ts tests/sim/rarity.test.ts docs/superpowers/specs/2026-08-02-morulium-mvp-design.md
git commit -m "$(cat <<'EOF'
tune(sim): rescale tierForScore thresholds to fit the measured histogram

Derives new thresholds from the score histogram measured after the
aberration draw bump: pick each threshold as the smallest score
whose cumulative fraction crosses the target boundary
(Basic ≤55%, Variant ≤85%, Adapted ≤95%, Evolved ≤99%, Apex >99%).

All five tiers now populate the fresh-hatch distribution instead of
Adapted/Evolved/Apex sitting empty. The rare-discovery fantasy
(game spec §3) now fires: rare hatches produce visibly rarer units.

Rarity ↔ combat power decoupling from the prior rarity fix is
preserved — a Basic unit can still have monster stats. Only the
tier BAND-BOUNDARIES change.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** Lever 2 → Task 1. Lever 3 → Task 2. Task 2 explicitly consumes Task 1's measurement rather than guessing, so the two-task split is load-bearing (not artificial).
- **Type consistency:** No signatures change. Only:
  - `Allele.drawWeight` VALUES on three aberration alleles (Task 1)
  - `tierForScore`'s 4 threshold VALUES (Task 2)
  - Test assertion VALUES on maybe 1 test in `rarity.test.ts` (Task 2)
- **Placeholders:** none — every step has real code or a real command. Task 2's threshold values are computed from data at implementation time (not pre-guessed), which is the intended shape for a tuning task.
- **Deliberately NOT doing Lever 1 (`app_stub`).** Reasoning captured in the plan header and confirmed with the human before writing this plan: adding another weight-0 baseline would push MORE mass into Basic and thin the Apex tail further, making the "everything is Basic" problem worse.
- **Robustness note:** Task 1 refactors the data test to a relationship assertion so future tuning iterations don't have to rewrite the test each time the values shift. Small quality-of-life win.
