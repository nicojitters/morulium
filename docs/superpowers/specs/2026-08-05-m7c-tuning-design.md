# Morulium — M7c Global Tuning Pass Design (v0.1)

**Date:** 2026-08-05
**Working directory:** `/Users/cnote/projects/morulium/`
**Remote:** `https://github.com/nicojitters/morulium` (public)
**Live:** `https://morulium.com` (Vercel, auto-deploys from main)
**Prior milestone:** M7b Vivarium + Colony cap — merged. This spec covers **M7c: Global Tuning Pass** — the third and final slice of M7 (game spec §15 "Calibrating numbers"). Ships the MVP.

## Purpose

Fix known imbalances that survived through M4-M7b, add measurement scripts for future retuning, and tighten a small set of magnitudes based on math. This is fundamentally different from M4-M7b: **no new features**, only adjustments to numbers plus a light measurement harness.

M7c ships when: (a) the rarity tier distribution shows clean descending progression (Mutant > Chimera > Progenitor); (b) Cull All's `VAT_MAX_BATCH_SIZE` cap is reachable in-game; (c) injury frequency and Failsafe pity timing feel calibrated to the current rarity distribution; (d) three verify scripts exist to justify future retunes with data.

After M7c, the MVP is complete: 5 nav tabs, full acquisition-to-conquest-to-triage loop, hard cap, buildings, tuning defensible from measurement.

## Scope decomposition context

M7 was split during initial M7 brainstorming: **M7a Vat + Cull** (shipped), **M7b Vivarium + cap** (shipped), **M7c global tuning pass** (this spec — ships the MVP). Additional buildings (Vault, Lab, Sequencer per game spec §13) are deferred post-MVP.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope shape | **Fix known issues + light measurement + narrow analytical tuning.** No new features. | Ships MVP fast; captures the two visible bugs (rarity inversion, VAT cap unreachability); leaves deeper tuning for post-launch playtest. |
| Rarity thresholds | `tierForScore` cut changes: Mutant expanded to score 5-6 (was 5-only), Chimera contracted to 7-11 (was 6-11). | Current distribution has Chimera (5.07%) MORE common than Mutant (3.72%) — inverted tier ladder. New cut yields 61.66/28.35/6.03/2.76/1.20 — clean descending progression at natural histogram gaps. |
| `VAT_MAX_BATCH_SIZE` | **10 → 4** (in `src/state/vat.ts`). | Colony cap is 40 max; 100-unit ceiling (10 ops × 10 units) is unreachable in-game. 4 matches the reachable maximum. Post-M7b final review flagged this. |
| `INJURY_CHANCE` | **0.25 → 0.15** (in `src/sim/injury.ts`). | At 0.25, an all-under-rested team of 4 has 68% chance of ≥1 injury per deploy — punishing given Incursions are the main progression loop. 0.15 → 47.8% ≥1 (still meaningful, less brutal). Medbay (30 min) still halves duration. |
| `DROUGHT_THRESHOLD` | **50 → 30** (in `src/state/failsafe.ts`). | Chimera rate drops from 5.07% → 2.76% (via rarity fix). At 50, only ~4% of players ever see natural Failsafe. At 30 with 2.76% chimera, P(pity fires before natural chimera) ≈ 43% — the safety net stays visible without dominating. |
| `FAILSAFE_INDICATOR_APPEARS_AT` | **40 → 20** (in `src/state/failsafe.ts`). | Preserves the same "last 10 dry decants" warning window (10 of 30 instead of 10 of 50). |
| Measurement scripts | **Extend `scripts/verify-rarity.ts` + add `scripts/verify-incursion.ts` + add `scripts/verify-drought.ts`.** | Not test files — exploration tools. Justify future retunes with data. Run via `npx tsx scripts/<name>.ts`. |
| verify-rarity extension | **Natural-gap detection section** listing the top 4 largest drops between adjacent scores, marked with the tier cut that falls on each. | Makes the spec's "cuts in natural gaps" invariant (game spec §5) visible + auditable. |
| verify-incursion.ts | **Sample N=1000 teams × 3 fronts × ~5 tier compositions × 2 rest states** (rested/under-rested), resolve via `resolveIncursion`, tally win rate. | Sanity-check `SUCCESS_CUTOFF = 0.85` produces the intended difficulty curve. |
| verify-drought.ts | **Simulate N=1000 fresh Colony runs**, count decants until Failsafe fires. Print histogram + mean + median. | Measures whether pity feels earned vs. dominant. |
| Constants left as-is | `MUTATION_RATE = 0.015`, `PER_GEN_WEAR = 0.02`, `WEAR_FLOOR = 0.60`, `GARRISON_INCOME_PER_UNIT_PER_HOUR = 5`, `BARRACKS_COST_SERUM = 500`, `MEDBAY_COST_SERUM = 300`, `REST_REGEN_PER_HOUR = 10`, `REST_DEPLOY_COST = 40`, `UNDER_RESTED_THRESHOLD = 40`, `UNDER_RESTED_PENALTY = 0.7`, `SUCCESS_CUTOFF = 0.85`, `COVERAGE_CLIP = 1.2`, front stat profiles, mission thresholds, SR economy magnitudes. | Defensible at current values from math; adjust only if the harness surfaces a problem or playtest justifies it post-launch. |
| RNG substream | **None new.** M7c is a tuning pass; scripts read the existing deterministic sim. | No new probabilistic mechanics. |
| Persist migration | **None needed.** Only constants change; no store shape change. Version stays at 9. | M7c doesn't touch the persisted Colony shape. Storage key stays `morulium/colony/v1`. |
| Anti-meta invariants | **All 9 preserved.** No mechanic changes. Invariant #5 (info hidden) untouched: tier thresholds remain in code, not exposed to the player. | Tuning is invariant-preserving by design. |
| Test count | **533 → ~540** (small increase from updated assertions). Measurement scripts don't add test files. | Same-day ship. |

## Anti-meta invariant check (game spec §14)

M7c preserves all nine invariants; no mechanic changes, only magnitudes:

1. **Every gain has a cost** — untouched.
2. **No master stat** — untouched.
3. **Abilities compete** — untouched.
4. **Missions demand different profiles** — untouched.
5. **Information is hidden** — tier thresholds stay in code, invisible to the player. `verify-*` scripts are developer tools, not user-facing.
6. **Rest forces rotation** — reinforced. Lower injury chance (0.15 vs 0.25) makes rotation less brutal; but rest still consumed on deploy, +10/hr regen still slow.
7. **Convergence is taxed** — untouched.
8. **Rarity ≠ power** — untouched. Rarity threshold changes affect the qualitative-locus histogram cuts; combat power is orthogonal.
9. **The tail is aberration-driven** — reinforced. Chimera contracts from 5.07% to 2.76% — the aberration-driven top tail is genuinely rarer now.

## Data model

**No changes.** M7c does not touch the store shape, Unit shape, or persistence.

## Sim modules

### `src/sim/rarity.ts` (modify)

Change one function:

```ts
function tierForScore(score: number): Tier {
  if (score <= 2) return 'baseline';
  if (score <= 4) return 'strain';
  if (score <= 6) return 'mutant';     // was `<= 5`
  if (score <= 11) return 'chimera';
  return 'progenitor';
}
```

Nothing else in this file changes.

### `src/sim/injury.ts` (modify)

Change one constant:

```ts
export const INJURY_CHANCE = 0.15 as const;   // was 0.25
```

## State module changes

### `src/state/vat.ts` (modify)

```ts
export const VAT_MAX_BATCH_SIZE = 4 as const;   // was 10
```

### `src/state/failsafe.ts` (modify)

```ts
export const DROUGHT_THRESHOLD = 30 as const;                // was 50
export const FAILSAFE_INDICATOR_APPEARS_AT = 20 as const;    // was 40
```

## Measurement scripts

### `scripts/verify-rarity.ts` (extend)

Existing script prints tier distribution + score histogram + per-locus contributions. Append a new section:

```
=== NATURAL GAPS (top 4 drops between adjacent scores) ===
  score A→B    X.XX% → Y.YY%   drop Zpp    ← <boundary or "">
```

The script iterates over adjacent (score, count) pairs, computes the percentage-point drop, sorts descending, prints the top 4. For each drop, if the current `tierForScore` boundary falls on the transition (score B is the first of a new tier), annotate the row with `← strain→mutant` etc.

Purpose: make it obvious whether tier cuts sit in natural histogram gaps. If M7c-post retuning shifts weights, this section immediately shows whether cuts need to move.

### `scripts/verify-incursion.ts` (new)

Iterate:
- `frontId` ∈ `{infrastructure, military, guerrilla}`
- `composition` ∈ 5 fixed compositions (labels: "4× baseline", "4× strain", "2× baseline + 2× mutant", "4× chimera", "4× progenitor")
- `restState` ∈ `{rested (100), under-rested (10)}`

For each cell, sample N=1000 team rolls. Compose team by rejection-sampling `rollGenome` until 4 units match the composition's tier mix. Call `resolveIncursion(team, FRONTS[frontId], restPenalties, 0)` (no hardening). Tally win rate.

Output shape (table per rest state):

```
=== INCURSION WIN RATES — RESTED (N=1000 per cell) ===
                  Infrastructure   Military      Guerrilla
4× baseline       XX%              XX%           XX%
4× strain         XX%              XX%           XX%
2×B + 2×M         XX%              XX%           XX%
4× chimera        XX%              XX%           XX%
4× progenitor     XX%              XX%           XX%

=== INCURSION WIN RATES — UNDER-RESTED ×0.7 (N=1000 per cell) ===
(same layout)
```

The intended difficulty curve is: 4× baseline → ~10-20% (mostly loses), 4× chimera → ~80% (mostly wins), 4× progenitor → ~95% (near-guaranteed).

### `scripts/verify-drought.ts` (new)

Simulate N=1000 fresh Colony runs. For each run:
1. Seed a Colony with default state.
2. Loop: call `decant()`, check if the result is chimera+ (per `tierAtLeast(computeRarity(unit.genome).tier, 'chimera')`).
3. If chimera+ before hitting `DROUGHT_THRESHOLD`, record the count as "natural chimera hit".
4. If `droughtCount` reaches threshold and Failsafe fires, record the count as "pity fired".

Print:
- Overall mean + median decants-to-chimera.
- Histogram bucketed by 5s (or 10s).
- Percentage of runs that fired via pity vs natural.

Constraints: script bypasses `DAILY_HARVEST_LIMIT` (each simulated day = 1 decant, no artificial pause). Determinism is preserved — the script uses seeded RNG per run.

## UI

**No UI changes.** Cull All button label at max ops reads `"Cull All (4 ops, 40 units)"` now — this is a purely-derived label change from the constant. No React edits needed.

## Testing plan

### `tests/sim/rarity.test.ts` (extend)

- Score 5 → tier is `'mutant'` (was `'mutant'` previously by boundary chance; now covered explicitly for the new cut).
- Score 6 → tier is `'mutant'` (was `'chimera'` before — new behavior).
- Score 7 → tier is `'chimera'` (unchanged).
- Snapshot the tier boundary set: `{baseline: <=2, strain: 3-4, mutant: 5-6, chimera: 7-11, progenitor: 12+}`.

### `tests/sim/injury.test.ts` (extend)

- `INJURY_CHANCE === 0.15` (constant sanity).
- Distribution test: over N=1000 rolls at penalty=0.7, ~15% of units are injured (with tolerance).
- Existing `rollInjuries` correctness tests should still pass; may need to update expected injury counts in any distribution-dependent test.

### `tests/state/vat.test.ts` (extend)

- `VAT_MAX_BATCH_SIZE === 4`.

### `tests/state/failsafe.test.ts` (extend)

- `DROUGHT_THRESHOLD === 30`.
- `FAILSAFE_INDICATOR_APPEARS_AT === 20`.
- Ratio: `FAILSAFE_INDICATOR_APPEARS_AT` equals `DROUGHT_THRESHOLD - 10` (last-10 warning window invariant).

### `tests/state/colony.test.ts` (review + fix)

Any test that:
- Assumes `INJURY_CHANCE = 0.25` in a deterministic injury-count assertion → update the expected count.
- Assumes `DROUGHT_THRESHOLD = 50` when seeding `droughtCount` for Failsafe tests → update to 30 (or use the imported constant directly if already indirectly referenced).

### `tests/ui/Vat.test.tsx` (review + fix)

One existing test ("Cull All caps at VAT_MAX_BATCH_SIZE") was reworked in M7b Task 4 to a 20-unit scenario. Now update to a 40-unit scenario:
- Seed 40 culled same-tier baselines.
- Click Cull All.
- Expected: 4 ops fire (cap hit), 40 units shredded, 4 new pristine outputs, 0 culled remain.

**Expected test count:** 533 → ~540 (small additions from new boundary tests + updated distribution assertions).

### Manual verification

After all tasks land:
1. Run `npx tsx scripts/verify-rarity.ts` — output should show Mutant > Chimera > Progenitor (clean descending). Natural-gaps section should confirm cuts sit in visible drops.
2. Run `npx tsx scripts/verify-incursion.ts` — win rates should form a reasonable difficulty curve (baseline ~15%, chimera ~80%, progenitor ~95%).
3. Run `npx tsx scripts/verify-drought.ts` — pity should fire ~40-50% of the time; mean decants-to-chimera should be ~25-30.

None of the scripts are part of `npm test` — they're `npx tsx` tools.

## Deferred (post-MVP playtest tuning)

- **Mission threshold retuning** — the harness reveals win-rate curves; if any front feels too easy/hard, mission thresholds get tweaked. Info hidden per invariant #5.
- **Full-loop playtest calibration** — actual play sessions with metrics collection.
- **SR economy retuning** — late-game SR flood post-full-conquest is a real but post-MVP problem.
- **`MUTATION_RATE`, `PER_GEN_WEAR`, `WEAR_FLOOR`** — breeding + convergence math needs play data to justify changes.
- **`SUCCESS_CUTOFF`, `COVERAGE_CLIP`** — Incursion math feels balanced from the sim; harness will surface issues.
- **Front stat profiles** — CALIBRATING per game spec; changes need play data.
- **Additional measurement scripts** — verify-serum-economy, verify-cull-loop, verify-breeding-convergence, etc.
- **Auto-Cull predicate rules** (still deferred from M7a).
- **Additional Vivarium buildings** (Vault, Lab, Sequencer — game spec §13).
- **`unitToRow` / `restStateFor` / `garrisonedAtFor` extraction to shared UI utility** — carrying M4/M5/M6b/M6c/M7b tech debt.

## Self-review notes

- **Spec coverage vs M7 decomposition:** rarity fix ✓, VAT cap fix ✓, INJURY_CHANCE ✓, DROUGHT_THRESHOLD ✓, FAILSAFE_INDICATOR_APPEARS_AT ✓, measurement scripts (3) ✓. Deferred set is explicit + non-blocking.
- **Anti-meta invariants:** all 9 preserved; #6 and #9 explicitly reinforced.
- **Determinism:** no new RNG substream. All scripts use existing seeded RNG for reproducibility.
- **Loop isolation:** no store code touched. All changes are constant-value replacements or module-internal (rarity's `tierForScore`).
- **Cross-milestone integration:**
  - M3b/Failsafe: threshold reduced; indicator window preserved.
  - M4/Breed: rarity threshold change may shift which children are chimera+ — Failsafe/rarity math untouched.
  - M5/Incursion: `SUCCESS_CUTOFF` unchanged; verify-incursion script validates the current curve.
  - M6b/Injury: chance lowered; injury duration unchanged (60 min base, 30 min with Medbay).
  - M6c/Occupations: untouched.
  - M7a/Vat: `VAT_MAX_BATCH_SIZE` lowered; `rollGenomeOfExactTier` still deterministic (rejection sampling loop runs longer for chimera now — 2.76% vs 5.07% — well under the 1000-attempt cap).
  - M7b/Vivarium: `Cull All` button label reflects new cap naturally via existing UI code.
- **Non-determinism budget:** none introduced. `Date.now()` and `Math.random` untouched.
- **Type consistency:** all constants are `as const`; all consumers unchanged. `tierForScore` return type still `Tier`; only the branch conditions shift.
- **Test hygiene:** 4 test files touched; no tests deleted; new tests explicit + assertive.
- **Task decomposition preview (4 tasks):**
  1. Rarity threshold fix + tests + Failsafe/Vat interaction tests updated.
  2. `VAT_MAX_BATCH_SIZE` + `INJURY_CHANCE` + `DROUGHT_THRESHOLD` + `FAILSAFE_INDICATOR_APPEARS_AT` + dependent tests updated.
  3. `verify-rarity.ts` natural-gap extension.
  4. `verify-incursion.ts` + `verify-drought.ts` new scripts.
