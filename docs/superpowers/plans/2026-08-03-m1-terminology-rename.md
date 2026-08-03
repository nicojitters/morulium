# Morulium Terminology Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock the in-game vocabulary — swap the `Tier` string values from `'Basic'|'Variant'|'Adapted'|'Evolved'|'Apex'` to `'baseline'|'strain'|'mutant'|'chimera'|'progenitor'`, introduce a single labels module (`src/ui/terms.ts`) that owns every player-facing string so the next rename is a one-liner, and refresh the design spec to use the new terminology.

**Architecture:** Two-task pass. (1) Rename the `Tier` type from Title-Case display values to stable lowercase internal keys, and introduce `src/ui/terms.ts` as the single source of player-facing vocabulary. The demo table and `verify:rarity` render via `TERMS.tiers[key]` — the engine returns keys, the display layer maps to names. (2) Update the design spec and sweep code comments/docstrings for stale terminology (Grinder/Home/Roster/Hunt/Codex/etc. still appear in the spec's milestone table).

**Tech Stack:** No new deps. Vite + React + TS + Vitest, existing.

**Source spec:** `~/Downloads/morulium-terminology-rename.md` (handed over 2026-08-03).

**Impact recon (already done — no need to re-grep):**
- Tier values appear in exactly 5 files: `src/sim/types.ts`, `src/sim/rarity.ts`, `src/sim/__demo__.ts` (via DemoRow.tier), `scripts/verify-rarity.ts`, and 2 test files (`tests/sim/rarity.test.ts`, `tests/sim/demo.test.ts`).
- Other renamed concepts (grinder, fusion, trash, credits, pity, codex, roster, egg scanner, hunt, home, egg, pull, hatch) DO NOT appear as identifiers in `src/`, `tests/`, or `scripts/`. They only appear in doc prose (design spec + plan docs).
- Plan docs are historical process artifacts and are NOT updated in this pass. Only the design spec (`docs/superpowers/specs/2026-08-02-morulium-mvp-design.md`) is updated.
- `.superpowers/sdd/` ledger files are untracked scratch — NOT updated.

## Global Constraints

- **Branch continuation.** Same `m1-sim-foundations` branch. Do not create a new branch.
- **TS strict.** `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any` in `src/sim/*` or `src/ui/*`.
- **`src/sim/*` PURE.** Only the existing CLI-guard exception in `src/sim/__demo__.ts`.
- **Internal keys stay stable, display strings live in `TERMS`.** UI code must not compare against display strings — it should render `TERMS.x` given an internal key.
- **`TERMS.tiers` must be a `Record<Tier, string>`** via a `satisfies` clause so the type system guarantees every tier key has a display string. Do NOT use non-null assertions on `TERMS.tiers[tier]` at call sites — the type should make the return string-not-undefined.
- **Do NOT rename the `Egg`/`Hatch`/`Grinder`/`Roster`/`Home`/`Hunt`/`Credits`/`Trash`/`Pity`/`Codex` concepts in code** — they don't have code representations yet. Only their appearance in comments/docs is in scope for the sweep task.
- **Do NOT touch the unit noun.** The doc explicitly says the unit noun is still open — do not introduce "specimen" or bake any noun into identifiers.
- **Do NOT touch genetics vocabulary.** Allele/locus/genome/dominant/recessive/mutation/generation/aberration/phenotype/DNA Lab stay.
- **Do NOT touch stat names.** PWR/VIT/SPD/INT/GUI stay.
- Vitest imports from `'vitest'`.
- Conventional Commits + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` on every commit.

---

### Task 1: Rename `Tier` type + create TERMS module + wire displays

**Files:**
- Create: `src/ui/terms.ts` — the labels module (new file)
- Modify: `src/sim/types.ts` — change `Tier` values to lowercase keys
- Modify: `src/sim/rarity.ts` — change `tierForScore` return values
- Modify: `src/sim/__demo__.ts` — display tier via `TERMS.tiers[r.tier]` in `formatDemoTable`
- Modify: `scripts/verify-rarity.ts` — iterate new keys, display via `TERMS.tiers[key]`
- Modify: `tests/sim/rarity.test.ts` — 3 `.toBe(...)` tier assertions
- Modify: `tests/sim/demo.test.ts` — 2 `toContain` array assertions

**Interfaces produced:**
- `Tier = 'baseline' | 'strain' | 'mutant' | 'chimera' | 'progenitor'` (was Title-Case)
- `computeRarity(genome).tier` returns lowercase key
- `TERMS` const exported from `src/ui/terms.ts` — the whole map from the source doc, not just tiers
- `TERMS.tiers` is typed as `Record<Tier, string>` so lookups are safe under `noUncheckedIndexedAccess`
- Display in demo table + verify output uses `TERMS.tiers[tier]` — not raw internal keys

- [ ] **Step 1: Update `Tier` in `src/sim/types.ts`**

Change one line:

```ts
export type Tier = 'baseline' | 'strain' | 'mutant' | 'chimera' | 'progenitor';
```

- [ ] **Step 2: Update `tierForScore` in `src/sim/rarity.ts`**

Update the 4 return statements (thresholds stay unchanged: 2/4/5/11 from the tuning plan):

```ts
function tierForScore(score: number): Tier {
  if (score <= 2) return 'baseline';
  if (score <= 4) return 'strain';
  if (score <= 5) return 'mutant';
  if (score <= 11) return 'chimera';
  return 'progenitor';
}
```

- [ ] **Step 3: Create `src/ui/terms.ts` with the full TERMS map**

Create the file:

```ts
import type { Tier } from '../sim/types';

/**
 * Single source of player-facing vocabulary.
 * Internal identifiers stay semantic and stable; only the string values here are the "name."
 * UI reads TERMS.x; logic never compares against display strings.
 */
export const TERMS = {
  tiers: {
    baseline:   'Baseline',
    strain:     'Strain',
    mutant:     'Mutant',
    chimera:    'Chimera',
    progenitor: 'Progenitor',
  } satisfies Record<Tier, string>,

  morula:      'Morula',        // was Egg
  harvest:     'Harvest',       // was Pull
  decant:      'Decant',        // was Hatch
  sequencer:   'Sequencer',     // was Egg Scanner
  cull:        'Cull',          // was Trash
  cullAll:     'Cull All',      // was Grind All Trash
  vat:         'the Vat',       // was The Grinder / Fusion
  failsafe:    'Failsafe',      // was Pity
  incursion:   'Incursion',     // was Hunt
  occupation:  'Occupation',    // was Job
  vivarium:    'Vivarium',      // was Home
  serum:       'Serum',         // was Credits
  serumAbbr:   'SR',            // was CR
  registry:    'the Registry',  // was Codex
  colony:      'the Colony',    // was Roster
} as const;
```

Note the two important patterns:
- `TERMS.tiers` uses `satisfies Record<Tier, string>` inside `as const` — this makes lookups return `string` (not `string | undefined`) so callers can use `TERMS.tiers[key]` directly without non-null assertions.
- The rest of `TERMS` uses `as const` so string values are literal types where useful.

- [ ] **Step 4: Update `src/sim/__demo__.ts` to render tier via TERMS**

Find `formatDemoTable`. Currently it emits `r.tier` directly. Change to render via TERMS:

```ts
import { STATS, type Stat, type Tier } from './types';
import { TERMS } from '../ui/terms';
// ... other imports unchanged

// ... inside formatDemoTable, in the row-emission section:
lines.push([
  String(i),
  String(r.seed),
  TERMS.tiers[r.tier],   // was: r.tier
  String(r.score),
  ...STATS.map((s) => String(Math.round(r.base[s]))),
  ...STATS.map((s) => r.current[s].toFixed(1)),
  r.expressed['head'] ?? '',
  r.expressed['appendage'] ?? '',
  r.expressed['aberration'] ?? '',
  r.palette,
].join('\t'));
```

Everything else in the file is unchanged. `DemoRow.tier` stays typed as `Tier` (which is now the lowercase union), so no other change is needed. The header row's `'tier'` label stays as-is (that's a column heading, not a tier value).

- [ ] **Step 5: Update `scripts/verify-rarity.ts` to iterate new keys + display via TERMS**

Find the tier-distribution loop:

```ts
// Currently:
for (const tier of ['Basic', 'Variant', 'Adapted', 'Evolved', 'Apex']) {
  const n = tierTally[tier] ?? 0;
  console.log(tier.padEnd(9), String(n).padStart(6), pct(n).padStart(8));
}
```

Change to use the new keys AND import + render via TERMS:

At the top of the file, add:
```ts
import { TERMS } from '../src/ui/terms';
```

Then update the loop:
```ts
const TIER_ORDER: Tier[] = ['baseline', 'strain', 'mutant', 'chimera', 'progenitor'];
// ...
for (const tier of TIER_ORDER) {
  const n = tierTally[tier] ?? 0;
  // eslint-disable-next-line no-console
  console.log(TERMS.tiers[tier].padEnd(11), String(n).padStart(6), pct(n).padStart(8));
}
```

Also add `Tier` to the type-only import from types.ts (or a new import if needed):
```ts
import type { Tier } from '../src/sim/types';
```

The `.padEnd(11)` accommodates 'Progenitor' (10 chars) with one trailing space.

- [ ] **Step 6: Update tier assertions in `tests/sim/rarity.test.ts`**

Find the 3 tier assertions and swap the string values:

```ts
// Line 35: was expect(result.tier).toBe('Basic');
expect(result.tier).toBe('baseline');

// Line 64: was expect(wild.tier).toBe('Evolved');
expect(wild.tier).toBe('chimera');

// Line 79: was expect(loaded.tier).toBe('Apex');
expect(loaded.tier).toBe('progenitor');
```

- [ ] **Step 7: Update tier assertions in `tests/sim/demo.test.ts`**

Find both `toContain` array assertions and swap the string values:

```ts
// Line 15 and Line 24 (same array, appears twice)
expect(['baseline', 'strain', 'mutant', 'chimera', 'progenitor']).toContain(row.tier);
```

- [ ] **Step 8: Run tests + typecheck**

Run: `npm test`
Expected: 61 passing (all existing tests + the tier renames).

Run: `npm run typecheck`
Expected: clean. If typecheck errors mention `TERMS.tiers[...]` being `string | undefined`, the `satisfies Record<Tier, string>` clause isn't landing — check the syntax matches Step 3's example.

- [ ] **Step 9: Sanity-check the demo + verify output**

Run: `npm run demo | head -5`
Expected: header row + 4 data rows; the `tier` column now shows values like `Baseline`, `Strain`, `Mutant`, `Chimera`, `Progenitor` (capitalized display strings from TERMS).

Run: `npm run verify:rarity | head -10`
Expected: the "=== TIER DISTRIBUTION ===" section shows the 5 tiers in order using capitalized display strings.

Capture both outputs in the task report.

- [ ] **Step 10: Commit**

```bash
git add src/ui/terms.ts src/sim/types.ts src/sim/rarity.ts src/sim/__demo__.ts scripts/verify-rarity.ts tests/sim/rarity.test.ts tests/sim/demo.test.ts
git commit -m "$(cat <<'EOF'
feat(ui): lock terminology — Tier keys go lowercase, TERMS module owns display strings

Introduces src/ui/terms.ts as the single source of player-facing
vocabulary. Every future rename is a one-liner in TERMS instead of
a scatter-search across components.

Tier keys change from Title-Case display values ('Basic'|'Variant'
|'Adapted'|'Evolved'|'Apex') to stable lowercase internal keys
('baseline'|'strain'|'mutant'|'chimera'|'progenitor'). Display
happens via TERMS.tiers[key] with a satisfies clause guaranteeing
Record<Tier, string> coverage at compile time.

The full TERMS map is landed now (morula, decant, harvest, vat,
serum, colony, ...) even though most callers don't exist yet — the
point is future code paths already have the vocabulary locked.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Update design spec + sweep code comments/docstrings for stale terminology

**Files:**
- Modify: `docs/superpowers/specs/2026-08-02-morulium-mvp-design.md` — replace stale terms in the milestone table and deferred-decisions list
- Modify: comments/docstrings in `src/` and `tests/` where old tier names or renamed-concept names appear in prose

**Explicit exclusions (do NOT touch):**
- Plan docs at `docs/superpowers/plans/*.md` — historical process artifacts, immutable
- `.superpowers/sdd/*` ledger files — untracked scratch
- Commit messages (obviously immutable)

**Interfaces produced:**
- Design spec's milestone table + deferred-decisions list use new terminology
- Any src/tests comments referencing "Basic"/"Variant"/etc. as tier names are updated to the new keys
- Any src/tests comments referencing "hatch"/"grinder"/"roster"/"home" language use the new terms (or are removed if redundant)

- [ ] **Step 1: Update the design spec's milestone table**

Open `docs/superpowers/specs/2026-08-02-morulium-mvp-design.md`. Find the milestone table (starts near line 85). Apply these specific replacements:

- Row **M3**: `Roster + hatching UI` → `The Colony + decanting UI`
  - Cell: "Zustand + localStorage, roster screen, tag/sort/trash, hatch button, daily-pull mechanic. First 'playable-shape' milestone." → "Zustand + localStorage, Colony screen, tag/sort/cull, Decant button, daily-Harvest mechanic. First 'playable-shape' milestone."
- Row **M4**: `Breeding` — no rename in the term "breeding" itself; leave title alone. Body: "Breed screen, Mendelian + mutation + wear + generation, lineage on UnitCard. Review target: does breeding feel meaningful?" — no rename needed here (breeding, mutation, wear, generation stay).
- Row **M5**: `Missions & fronts` → `Incursions & fronts`
  - Cell: "One region, 3 fronts, hidden thresholds, best-contributor resolve, live ticker, qualitative feedback. First real gameplay loop." — no rename in "region" or "fronts"; but "mission" isn't in the copy. Leave as-is beyond the title.
- Row **M6**: `Rest, injury, garrison economy` → `Rest, injury, Occupation economy`
  - Cell: "Rest state, Stim consumable, injury bench, Jobs income, under-garrison flare. Failure now has teeth." → "Rest state, Stim consumable, injury bench, Occupation income, under-garrison flare. Failure now has teeth."
- Row **M7**: `Grinder + minimal Home` → `The Vat + minimal Vivarium`
  - Cell: "10→1 fusion, auto-trash rules, Barracks / Medbay / roster cap. Full MVP + global tuning pass." → "10→1 Vat, auto-cull rules, Barracks / Medbay / Colony cap. Full MVP + global tuning pass."

- [ ] **Step 2: Update the design spec's deferred-decisions list**

Find the "Deferred / flagged decisions" section (starts near line 103). Apply:

- Item **4**: "**Auto-trash rule UX** (M3) — chip-based filter builder vs. simple predicate list." → "**Auto-cull rule UX** (M3) — chip-based filter builder vs. simple predicate list."

Item 5 ("Garrison flare trigger") stays as-is.

- [ ] **Step 3: Sweep `src/` and `tests/` for stale tier-name references in comments**

Grep for `Basic|Variant|Adapted|Evolved|Apex` in `src/` and `tests/` looking for COMMENT/DOCSTRING references (the code assertions were fixed in Task 1):

```bash
grep -rn -E '(//|/\*|\*).*(Basic|Variant|Adapted|Evolved|Apex)' src/ tests/ scripts/ 2>&1 || true
```

For each match found:
- If it's a stale comment describing tier names, update to the new terms (e.g., "Basic → Variant → ..." becomes "Baseline → Strain → ...", OR use lowercase keys if the comment is describing internal identifiers)
- If it's incidental (e.g., a variable name that happens to include one of these words), leave it

Common places likely to have stale comments:
- `tests/sim/rarity.test.ts` — comment above MIN_QUALITATIVE saying "Score = 0 → Basic" needs updating to "Score = 0 → Baseline"
- Test assertion inline comments
- `src/sim/rarity.ts` — the docstring for `computeRarity` may reference the old tier names

Update comments to use the new terminology (either display strings or internal keys, whichever is clearer in context).

- [ ] **Step 4: Sweep `src/` and `tests/` for stale renamed-concept references in comments**

Grep for the following words in COMMENTS across `src/`, `tests/`, `scripts/`:

```bash
grep -rin -E '(//|/\*|\*).*(hatch|grinder|fusion|trash|codex|roster|\bhome\b|\bhunt\b|\bpull\b|pity|credits|\bCR\b)' src/ tests/ scripts/ 2>&1 || true
```

For each match:
- Update the comment to use the new terminology per the glossary
- If the comment describes something we haven't built yet (references to M3-M7 systems), update the language to use the new terms — but do NOT change any code identifiers, only the prose

Known likely locations:
- Comments describing what M1's demo shows (may say "50 hatched monsters" or similar; update to "50 Decanted specimens" or leave "monsters" as the unit noun is still open, but update "hatched" → "Decanted")
- The comment above `runDemo` in `src/sim/__demo__.ts` if it mentions "hatch"

- [ ] **Step 5: Update `src/App.tsx` if it references renamed concepts**

Read the current `src/App.tsx`. The current text likely says something like "50 rolled monsters, seed=1. Tradeoff distribution and rarity should look plausible." If it references any renamed terms (hatch, egg, etc.), update via the same rules:

- "hatched" → "decanted" (verb)
- "hatches" (noun, count of events) → "decants"
- "eggs" → "Morula" (mass noun; "50 Morula" reads fine)
- "monsters" / "creatures" / "units" — leave as-is (unit noun still open)

If the current text doesn't reference any renamed terms, no change needed — note that in the report.

- [ ] **Step 6: Run tests + typecheck**

Run: `npm test`
Expected: 61 passing — Task 2 shouldn't change any test-runtime behavior.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 7: Run demo + verify:rarity as a final sanity check**

Run: `npm run demo | head -3` — expected: header + 2 data rows with new tier display names.
Run: `npm run verify:rarity | head -10` — expected: tier distribution section with new names.

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/specs/2026-08-02-morulium-mvp-design.md src/ tests/ scripts/
git commit -m "$(cat <<'EOF'
docs(spec): sweep terminology in design spec + code comments

Updates the design spec's milestone table and deferred-decisions
list to use the locked new vocabulary (the Colony, Decant, Harvest,
Incursions, Occupation, the Vat, Vivarium, auto-cull).

Also sweeps code comments and docstrings that referenced the old
tier names ('Basic'/'Variant'/...) or old concept names ('hatch',
'roster', 'grinder', ...) — code identifiers were already handled
in the previous commit; this is prose consistency only.

Plan docs and .superpowers ledger files are intentionally left
untouched — historical process artifacts, not living references.
The unit noun ('monster'/'unit') stays as-is per the source doc's
explicit exclusion (unit noun still open).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** Source doc §1 (glossary) → Task 1 (Tier + TERMS) + Task 2 (spec/comments). §2 (labels module) → Task 1, Step 3. §3 deeper renames — only the Tier rename applies (Trash/Credits/Grinder concepts have no code yet). §4 exclusions honored (genetics vocab, stat names, unit noun untouched). §5 checklist steps 1-6 are covered: create TERMS (T1.3), point strings at TERMS (T1.4, T1.5), do deeper renames (T1.2), update Tier + verify (T1.1, T1.2, T1.5), grep for stragglers (T2.3-4), typecheck (T1.8, T2.6).
- **Type consistency:** `Tier` is lowercase union throughout, `TERMS.tiers` is `Record<Tier, string>` — same source of truth. Import paths correct: sim types → types.ts, TERMS import → ../ui/terms from within sim, ../src/ui/terms from scripts.
- **Placeholders:** none — every step has real code or a real command.
- **Task splitting rationale:** T1 is the mechanical code change (compilation-relevant). T2 is prose consistency (no runtime impact). Splitting keeps the reviewer's attention focused per task: T1 reviewer confirms the Tier rename lands consistently; T2 reviewer confirms prose is consistent.
- **Deliberate scope constraints:** plan docs and ledger files are NOT updated (they're history, not references). The `.superpowers/` gitignore hardening is out of scope — mentioned as a Minor observation possibility for a later cleanup rather than folded into this rename.
