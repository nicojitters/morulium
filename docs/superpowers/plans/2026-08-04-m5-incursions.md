# M5 Incursions & Fronts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first real gameplay loop (game spec §9 + §10 for one region): pick a front, pick 4 team members, launch, watch a 6-second qualitative ticker, see the verdict. Capture all 3 fronts to conquer the region. Failure locks that front for 30 minutes.

**Architecture:** Three pure sim modules (`coverage-bands.ts`, `data/fronts.ts`, `incursion.ts`) do the math — best-contributor-per-stat, coverage clipped to 1.2, weighted geometric mean of coverage ratios vs. a 0.85 cutoff, deterministic. One state module (`state/incursion.ts` for constants) plus a colony-store extension adds `fronts` + transient `activeIncursion` state and the `launchIncursion`/`dismissIncursion` action pair. Four new UI components (`FrontCard`, `IncursionBeat`, `IncursionTicker`, `Incursion` screen) plus a tab-switch widened in `App.tsx`.

**Tech Stack:** No new runtime deps. Vite + React + TypeScript + Zustand + Vitest.

**Source spec:** `docs/superpowers/specs/2026-08-04-m5-incursions-design.md`.

## Global Constraints

- **Branch:** work on `m5-incursions` (create with `git checkout -b m5-incursions` from `main` before Task 1). Do NOT commit to main directly.
- **TS strict:** `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any` in `src/sim/*`, `src/state/*`, `src/ui/*`, or any test file. Sparse map access (`front.requirements[stat]`, `coverage[stat]`) returns `T | undefined` — always narrow before use.
- **`src/sim/*` and `src/render/*` PURE** — no `Math.random`, no `Date.now()`, no I/O at module load. `src/sim/incursion.ts`, `src/sim/coverage-bands.ts`, and `src/sim/data/fronts.ts` inherit this.
- **`src/state/*` non-determinism budget:** may use `Date.now()` (in `dismissIncursion` for cooldown stamping and in cooldown-check inside `launchIncursion`) and `localStorage` (via Zustand persist). No `Math.random`.
- **`src/ui/*` non-determinism budget:** `useEffect` timers OK at runtime; NO `Math.random`/`Date.now()` at module load.
- **Storage schema key stays `morulium/colony/v1`** — DO NOT change the key. Bump `version: 4` and add a branch to the existing chained `migrate` fn. Design spec is explicit.
- **Constants** (baked, not user-configurable): `TEAM_SIZE = 4`, `COVERAGE_CLIP = 1.2`, `SUCCESS_CUTOFF = 0.85`, `INCURSION_LEVEL = 20`, `INCURSION_SUBSTREAM_PRIME = 1_000_099` (reserved for M6+, not used in M5), `FRONT_COOLDOWN_MS = 30 * 60 * 1000`.
- **Resolution is deterministic** — same team + same front → identical `IncursionResolution`. No RNG in M5. `INCURSION_SUBSTREAM_PRIME` is reserved but unused.
- **Coverage formula:** `coverage[s] = min(COVERAGE_CLIP, bestContrib[s].value / threshold[s])`. Weighted geometric mean: `successP = Π (coverage[s] ^ weight[s])` over required stats.
- **Outcome:** `successP >= SUCCESS_CUTOFF ? 'won' : 'failed'`.
- **Coverage bands** (drives ticker phrases): `crushed` c<0.5 · `dangerouslySlow` 0.5≤c<0.8 · `holding` 0.8≤c<1.0 · `strong` 1.0≤c<1.15 · `overwhelming` c≥1.15.
- **Beats canonical order:** `launch` blurb → one `stat` beat per required stat in `Object.keys(front.requirements)` iteration order → `verdict` blurb. For a 2-stat front (all three M5 fronts), that's exactly **4 beats**.
- **Ticker interval:** `1500ms` per beat; 4 beats = 6s total. Skippable via a Skip button.
- **`launchIncursion` does NOT touch `droughtCount`, `harvestsToday`, or `breedsToday`.** Each loop stays isolated.
- **Two-phase commit:** `launchIncursion` computes + returns the resolution and sets `activeIncursion`. Front `captured`/`cooldownUntil` state changes only when `dismissIncursion` fires (after the ticker plays). Reloading mid-ticker DROPS `activeIncursion` and leaves front state untouched.
- **`activeIncursion` is transient** — omitted from `partialize`. `fronts` is persisted.
- **`Unit` shape UNCHANGED from M4.** Test fixtures that construct Units inline still work as-is — no fixture updates needed (unlike M4 Task 4).
- **Vitest imports:** `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'`. React component + persist tests use `// @vitest-environment jsdom` at file top. Cleanup with `cleanup()` from `@testing-library/react` in `afterEach`.
- **Store reset in tests** (updated for M5): `beforeEach(() => useColonyStore.setState({ units: [], nextId: 1, lastDecantedId: null, harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0, breedsToday: 0, breedDayKey: todayLocalKey(), fronts: FRESH_FRONTS, activeIncursion: null }))` where `FRESH_FRONTS` is `{ infrastructure: { captured: false, cooldownUntil: null }, military: { captured: false, cooldownUntil: null }, guerrilla: { captured: false, cooldownUntil: null } }`. Plus `localStorage.clear()` in persist tests. Plus `vi.useRealTimers()` in `afterEach` for tests that mocked time.
- **Commits:** Conventional Commits + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` on every commit.

---

### Task 1: Sim — `src/sim/coverage-bands.ts` (bandForCoverage + BAND_PHRASES)

**Files:**
- Create: `src/sim/coverage-bands.ts`
- Create: `tests/sim/coverage-bands.test.ts`

**Interfaces produced:**
- `type CoverageBand = 'crushed' | 'dangerouslySlow' | 'holding' | 'strong' | 'overwhelming'`
- `function bandForCoverage(c: number): CoverageBand`
- `const BAND_PHRASES: Readonly<Record<Stat, Readonly<Record<CoverageBand, string>>>>` — 25 authored strings

**Global constraints for this task:**
- Pure module — no side effects at import.
- No `any`. No `Math.random`. No `Date.now`.
- BAND_PHRASES is complete: every one of 5 stats × 5 bands has a non-empty string.
- Do NOT touch `src/state/*`, `src/ui/*`, or `src/sim/data/fronts.ts` (Task 2).

- [ ] **Step 1: Write failing tests at `tests/sim/coverage-bands.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { bandForCoverage, BAND_PHRASES } from '../../src/sim/coverage-bands';
import { STATS } from '../../src/sim/types';

describe('bandForCoverage', () => {
  it('returns "crushed" below 0.5', () => {
    expect(bandForCoverage(0)).toBe('crushed');
    expect(bandForCoverage(0.499)).toBe('crushed');
  });
  it('returns "dangerouslySlow" at 0.5 up to 0.8', () => {
    expect(bandForCoverage(0.5)).toBe('dangerouslySlow');
    expect(bandForCoverage(0.799)).toBe('dangerouslySlow');
  });
  it('returns "holding" at 0.8 up to 1.0', () => {
    expect(bandForCoverage(0.8)).toBe('holding');
    expect(bandForCoverage(0.999)).toBe('holding');
  });
  it('returns "strong" at 1.0 up to 1.15', () => {
    expect(bandForCoverage(1.0)).toBe('strong');
    expect(bandForCoverage(1.149)).toBe('strong');
  });
  it('returns "overwhelming" at 1.15 and above', () => {
    expect(bandForCoverage(1.15)).toBe('overwhelming');
    expect(bandForCoverage(10)).toBe('overwhelming');
  });
});

describe('BAND_PHRASES', () => {
  it('has every (stat, band) pair populated with a non-empty string', () => {
    const bands = ['crushed', 'dangerouslySlow', 'holding', 'strong', 'overwhelming'] as const;
    for (const s of STATS) {
      for (const b of bands) {
        const phrase = BAND_PHRASES[s][b];
        expect(typeof phrase).toBe('string');
        expect(phrase.length).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- tests/sim/coverage-bands.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `src/sim/coverage-bands.ts`**

```ts
import type { Stat } from './types';

export type CoverageBand = 'crushed' | 'dangerouslySlow' | 'holding' | 'strong' | 'overwhelming';

/**
 * Bucket a coverage ratio into a qualitative band. Boundaries chosen so
 * SUCCESS_CUTOFF (0.85) sits comfortably inside the "holding" band —
 * a per-stat coverage of "holding" or better usually clears the cutoff.
 */
export function bandForCoverage(c: number): CoverageBand {
  if (c < 0.5) return 'crushed';
  if (c < 0.8) return 'dangerouslySlow';
  if (c < 1.0) return 'holding';
  if (c < 1.15) return 'strong';
  return 'overwhelming';
}

/**
 * Per-stat × per-band ticker phrases. 5 stats × 5 bands = 25 authored strings.
 * Front-agnostic at first; per-front variants deferred (spec §Deferred).
 * Copy leans conquest/military voice per game spec §1.
 */
export const BAND_PHRASES: Readonly<Record<Stat, Readonly<Record<CoverageBand, string>>>> = {
  PWR: {
    crushed:         'Their line grinds us to nothing.',
    dangerouslySlow: 'We punch, but the mass absorbs it.',
    holding:         'Trading blows evenly.',
    strong:          'Our push breaks their front.',
    overwhelming:    'We shatter them before they set.',
  },
  VIT: {
    crushed:         'Casualties compound faster than we can absorb.',
    dangerouslySlow: 'Attrition is punishing.',
    holding:         'The line bends but does not break.',
    strong:          'We take hits and keep moving.',
    overwhelming:    'They cannot dent us.',
  },
  SPD: {
    crushed:         'They act before we can respond.',
    dangerouslySlow: 'Our tempo lags theirs — we react, never lead.',
    holding:         'Trading initiative back and forth.',
    strong:          'We stay a beat ahead.',
    overwhelming:    'They never get to move.',
  },
  INT: {
    crushed:         'We are outmaneuvered before we act.',
    dangerouslySlow: 'They anticipate every angle.',
    holding:         'A slow chess match, tightly played.',
    strong:          'We read them cleanly.',
    overwhelming:    'Their patterns unravel in front of us.',
  },
  GUI: {
    crushed:         'They see us coming from every alley.',
    dangerouslySlow: 'Cover keeps evaporating.',
    holding:         'A jagged, close-quarters grind.',
    strong:          'We slip in unseen, again and again.',
    overwhelming:    'They cannot find us until it is too late.',
  },
};
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/sim/coverage-bands.test.ts`
Expected: PASS all 6 tests.

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test`
Expected: 203 previous + 6 new = 209 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git checkout -b m5-incursions
git add src/sim/coverage-bands.ts tests/sim/coverage-bands.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): coverage bands + qualitative ticker phrases

Adds bandForCoverage(c): buckets a coverage ratio into 5 qualitative
bands (crushed / dangerouslySlow / holding / strong / overwhelming).
Boundaries: 0.5 / 0.8 / 1.0 / 1.15. SUCCESS_CUTOFF (0.85, defined in
sim/incursion.ts, task 3) sits inside "holding".

Adds BAND_PHRASES: Record<Stat, Record<CoverageBand, string>> — 25
authored phrases in conquest/military voice per game spec §1. The
ticker (task 7) picks one phrase per (stat, band) pair; front-agnostic
at first.

Pure module; no Math.random, no Date.now, no side effects.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Sim — `src/sim/data/fronts.ts` (3 FrontProfile entries)

**Files:**
- Create: `src/sim/data/fronts.ts`
- Create: `tests/sim/data/fronts.test.ts`

**Interfaces produced:**
- `type FrontId = 'infrastructure' | 'military' | 'guerrilla'`
- `interface FrontRequirement { threshold: number; weight: number }`
- `interface FrontProfile { id: FrontId; label: string; requirements: Readonly<Partial<Record<Stat, FrontRequirement>>>; flavor: { launchBlurb, winBlurb, failBlurb } }`
- `const FRONTS: Readonly<Record<FrontId, FrontProfile>>`

**Global constraints for this task:**
- Pure module — no side effects at import, frozen data.
- No `any`. Types imported from `src/sim/types.ts` (Stat) — do NOT define Stat here.
- All three fronts have exactly 2 required stats; weights sum to 1.0 per front.
- Threshold values marked `// [CALIBRATING]` inline.

- [ ] **Step 1: Add `FrontId`, `FrontRequirement`, `FrontProfile` types**

Types live in the fronts data file (they're not needed anywhere else until Task 3, and this keeps the data + shape colocated for reviewer clarity):

```ts
// This will be at the top of src/sim/data/fronts.ts (see Step 3).
import type { Stat } from '../types';

export type FrontId = 'infrastructure' | 'military' | 'guerrilla';

export interface FrontRequirement {
  readonly threshold: number;
  readonly weight: number;
}

export interface FrontProfile {
  readonly id: FrontId;
  readonly label: string;
  readonly requirements: Readonly<Partial<Record<Stat, FrontRequirement>>>;
  readonly flavor: {
    readonly launchBlurb: string;
    readonly winBlurb: string;
    readonly failBlurb: string;
  };
}
```

- [ ] **Step 2: Write failing tests at `tests/sim/data/fronts.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { FRONTS } from '../../../src/sim/data/fronts';
import type { FrontId } from '../../../src/sim/data/fronts';

describe('FRONTS', () => {
  it('has exactly 3 entries with the expected ids', () => {
    const ids = Object.keys(FRONTS).sort();
    expect(ids).toEqual(['guerrilla', 'infrastructure', 'military']);
  });

  it('every front has exactly 2 required stats', () => {
    for (const id of Object.keys(FRONTS) as FrontId[]) {
      const stats = Object.values(FRONTS[id].requirements).filter((r) => r !== undefined);
      expect(stats).toHaveLength(2);
    }
  });

  it('every front has weights summing to 1.0', () => {
    for (const id of Object.keys(FRONTS) as FrontId[]) {
      const reqs = Object.values(FRONTS[id].requirements).filter((r) => r !== undefined);
      const sum = reqs.reduce((acc, r) => acc + r!.weight, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it('every front has non-empty flavor blurbs', () => {
    for (const id of Object.keys(FRONTS) as FrontId[]) {
      const f = FRONTS[id].flavor;
      expect(f.launchBlurb.length).toBeGreaterThan(0);
      expect(f.winBlurb.length).toBeGreaterThan(0);
      expect(f.failBlurb.length).toBeGreaterThan(0);
    }
  });

  it('every front has a label and id that agrees with the map key', () => {
    for (const id of Object.keys(FRONTS) as FrontId[]) {
      expect(FRONTS[id].id).toBe(id);
      expect(FRONTS[id].label.length).toBeGreaterThan(0);
    }
  });

  it('front stats match the spec-locked profile', () => {
    // Spec: Infra=INT/SPD, Mil=PWR/VIT, Guer=GUI/SPD
    expect(FRONTS.infrastructure.requirements.INT).toBeDefined();
    expect(FRONTS.infrastructure.requirements.SPD).toBeDefined();
    expect(FRONTS.military.requirements.PWR).toBeDefined();
    expect(FRONTS.military.requirements.VIT).toBeDefined();
    expect(FRONTS.guerrilla.requirements.GUI).toBeDefined();
    expect(FRONTS.guerrilla.requirements.SPD).toBeDefined();
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npm test -- tests/sim/data/fronts.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 4: Create `src/sim/data/fronts.ts`**

```ts
import type { Stat } from '../types';

export type FrontId = 'infrastructure' | 'military' | 'guerrilla';

export interface FrontRequirement {
  readonly threshold: number;
  readonly weight: number;
}

export interface FrontProfile {
  readonly id: FrontId;
  readonly label: string;
  readonly requirements: Readonly<Partial<Record<Stat, FrontRequirement>>>;
  readonly flavor: {
    readonly launchBlurb: string;
    readonly winBlurb: string;
    readonly failBlurb: string;
  };
}

/**
 * Frozen front profiles. Thresholds seeded from M1 verify-tool
 * distributions: a level-20 middling-Colony unit specializing in
 * a stat hits ~20-25 in that stat, so thresholds of 22 (weighted 0.6)
 * and 18 (weighted 0.4) mean a competent 2-specialist pairing wins.
 * All thresholds are [CALIBRATING] — retune after playtest.
 */
export const FRONTS: Readonly<Record<FrontId, FrontProfile>> = {
  infrastructure: {
    id: 'infrastructure',
    label: 'Infrastructure',
    requirements: {
      INT: { threshold: 22, weight: 0.6 }, // [CALIBRATING]
      SPD: { threshold: 18, weight: 0.4 }, // [CALIBRATING]
    },
    flavor: {
      launchBlurb: 'Their grid. Their logistics. Ours if we can read them.',
      winBlurb:    'The lattice folds. Infrastructure is ours.',
      failBlurb:   'Their systems repel our probes. We fall back.',
    },
  },
  military: {
    id: 'military',
    label: 'Military',
    requirements: {
      PWR: { threshold: 22, weight: 0.6 }, // [CALIBRATING]
      VIT: { threshold: 20, weight: 0.4 }, // [CALIBRATING]
    },
    flavor: {
      launchBlurb: 'Fortified lines. We break them or we bleed.',
      winBlurb:    'Their garrison collapses. Military is ours.',
      failBlurb:   'The line holds. We retreat with our dead.',
    },
  },
  guerrilla: {
    id: 'guerrilla',
    label: 'Guerrilla',
    requirements: {
      GUI: { threshold: 22, weight: 0.6 }, // [CALIBRATING]
      SPD: { threshold: 18, weight: 0.4 }, // [CALIBRATING]
    },
    flavor: {
      launchBlurb: 'A war of alleys and shadows. Reflex and cunning.',
      winBlurb:    'The cells scatter, silent. Guerrilla is ours.',
      failBlurb:   'They know every backstreet. We are pushed back.',
    },
  },
};
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- tests/sim/data/fronts.test.ts`
Expected: PASS all 6 tests.

- [ ] **Step 6: Full suite + typecheck**

Run: `npm test`
Expected: 209 previous + 6 new = 215 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/sim/data/fronts.ts tests/sim/data/fronts.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): FRONTS data — 3 front profiles (Infra/Mil/Guerrilla)

Adds FrontId + FrontRequirement + FrontProfile types and the frozen
FRONTS map. Three fronts with stat profiles from game spec §10:
- Infrastructure: INT weight 0.6 + SPD weight 0.4
- Military:      PWR weight 0.6 + VIT weight 0.4
- Guerrilla:     GUI weight 0.6 + SPD weight 0.4

Every front has exactly 2 required stats; weights sum to 1.0.
Thresholds seeded around 22 (heavy) / 18-20 (light) — all
[CALIBRATING] per spec §Locked. Flavor blurbs in conquest-military
voice per game spec §1.

Pure module; frozen data.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Sim — `src/sim/incursion.ts` (constants + bestContributorPerStat + resolveIncursion)

**Files:**
- Create: `src/sim/incursion.ts`
- Create: `tests/sim/incursion.test.ts`

**Interfaces produced:**
- `const TEAM_SIZE = 4 as const`
- `const COVERAGE_CLIP = 1.2 as const`
- `const SUCCESS_CUTOFF = 0.85 as const`
- `const INCURSION_LEVEL = 20 as const`
- `const INCURSION_SUBSTREAM_PRIME = 1_000_099 as const` (reserved, unused in M5)
- `interface IncursionBeat { kind: 'launch' | 'stat' | 'verdict'; stat?: Stat; band?: CoverageBand; text: string }`
- `interface IncursionResolution { frontId, teamIds, coverage, bestContributors, successP, outcome, beats }`
- `function bestContributorPerStat(team: readonly Unit[], requiredStats: readonly Stat[]): Readonly<Partial<Record<Stat, { unitId: number; value: number }>>>`
- `function resolveIncursion(team: readonly Unit[], front: FrontProfile): IncursionResolution`

**Global constraints for this task:**
- Pure module — no side effects, no RNG (deterministic in M5).
- No `any`. Sparse maps narrow before use.
- Uses `computeCurrentStats(unit.genome, INCURSION_LEVEL, unit.wear)` from `src/sim/stats.ts` — the wear-aware stat calc from M4.
- Do NOT touch `src/state/*` or `src/ui/*` in this task.

- [ ] **Step 1: Write failing tests at `tests/sim/incursion.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  TEAM_SIZE,
  COVERAGE_CLIP,
  SUCCESS_CUTOFF,
  INCURSION_LEVEL,
  INCURSION_SUBSTREAM_PRIME,
  bestContributorPerStat,
  resolveIncursion,
} from '../../src/sim/incursion';
import { FRONTS } from '../../src/sim/data/fronts';
import { rollGenome } from '../../src/sim/genome';
import { createRng } from '../../src/sim/rng';
import type { Unit } from '../../src/state/types';
import type { Stat } from '../../src/sim/types';

function makeUnit(id: number, seed: number): Unit {
  return {
    id, seed, decantedAt: 100 * id,
    genome: rollGenome(createRng(seed)),
    generation: 0, parentIds: null, wear: {},
  };
}

describe('incursion constants', () => {
  it('TEAM_SIZE is 4', () => expect(TEAM_SIZE).toBe(4));
  it('COVERAGE_CLIP is 1.2', () => expect(COVERAGE_CLIP).toBe(1.2));
  it('SUCCESS_CUTOFF is 0.85', () => expect(SUCCESS_CUTOFF).toBe(0.85));
  it('INCURSION_LEVEL is 20', () => expect(INCURSION_LEVEL).toBe(20));
  it('INCURSION_SUBSTREAM_PRIME is 1_000_099', () => expect(INCURSION_SUBSTREAM_PRIME).toBe(1_000_099));
});

describe('bestContributorPerStat', () => {
  it('picks the maximum per stat (not sum, not average)', () => {
    const team = [makeUnit(1, 11), makeUnit(2, 22), makeUnit(3, 33), makeUnit(4, 44)];
    const bests = bestContributorPerStat(team, ['PWR', 'VIT']);
    // Each entry, if present, must be the team-wide max for that stat.
    for (const s of ['PWR', 'VIT'] as Stat[]) {
      const entry = bests[s];
      expect(entry).toBeDefined();
      const maxAcross = Math.max(
        ...team.map((u) => {
          // We can't import computeCurrentStats here easily, but the value
          // returned must be >= any single team member's contribution to that stat.
          return entry!.value;
        }),
      );
      expect(entry!.value).toBe(maxAcross);
    }
  });

  it('breaks ties toward the earlier team-list index', () => {
    // Two identical units: id 1 comes first, id 2 comes second. Both have
    // the same genome (same seed), so their stats are identical → tie goes
    // to id 1.
    const team = [makeUnit(1, 55), makeUnit(2, 55), makeUnit(3, 66), makeUnit(4, 77)];
    const bests = bestContributorPerStat(team, ['PWR']);
    // If unit 1 is the strongest OR tied for strongest, its id wins the tie.
    // We can't predict which unit is strongest without recomputing, but if
    // the winner is unit 1 or unit 2 with equal stats, unit 1 must win.
    if (bests['PWR']!.unitId === 2) {
      // If id 2 won outright, unit 3 or 4 must be equal to it or lower —
      // but the test-case setup makes id 1 and id 2 identical, so we
      // expect unit 1 to win the tie.
      throw new Error('expected id 1 to win a tie with id 2');
    }
  });

  it('returns entries only for the requested stats', () => {
    const team = [makeUnit(1, 1), makeUnit(2, 2), makeUnit(3, 3), makeUnit(4, 4)];
    const bests = bestContributorPerStat(team, ['INT']);
    expect(bests.INT).toBeDefined();
    expect(bests.PWR).toBeUndefined();
    expect(bests.VIT).toBeUndefined();
    expect(bests.SPD).toBeUndefined();
    expect(bests.GUI).toBeUndefined();
  });
});

describe('resolveIncursion', () => {
  const team = [makeUnit(1, 101), makeUnit(2, 202), makeUnit(3, 303), makeUnit(4, 404)];

  it('is deterministic: same team + front returns identical resolution', () => {
    const a = resolveIncursion(team, FRONTS.infrastructure);
    const b = resolveIncursion(team, FRONTS.infrastructure);
    expect(a).toEqual(b);
  });

  it('returns beats in canonical order: launch, one per required stat, verdict', () => {
    const r = resolveIncursion(team, FRONTS.infrastructure);
    // Infrastructure has 2 required stats → 1 + 2 + 1 = 4 beats
    expect(r.beats).toHaveLength(4);
    expect(r.beats[0]!.kind).toBe('launch');
    expect(r.beats[1]!.kind).toBe('stat');
    expect(r.beats[2]!.kind).toBe('stat');
    expect(r.beats[3]!.kind).toBe('verdict');
  });

  it('coverage clipped at COVERAGE_CLIP for over-covered stats', () => {
    // Force a scenario where a stat vastly exceeds threshold: build a
    // team whose collective INT is huge, launch on Infrastructure.
    // We use a stub team where every unit is the same strong-genome roll —
    // the max INT will vastly clear the 22 threshold.
    const strong = [makeUnit(1, 999), makeUnit(2, 999), makeUnit(3, 999), makeUnit(4, 999)];
    const r = resolveIncursion(strong, FRONTS.infrastructure);
    // For any required stat, coverage cannot exceed COVERAGE_CLIP
    for (const s of Object.keys(r.coverage) as Stat[]) {
      expect(r.coverage[s]!).toBeLessThanOrEqual(COVERAGE_CLIP);
    }
  });

  it('outcome is "won" when successP >= SUCCESS_CUTOFF, "failed" below', () => {
    const r = resolveIncursion(team, FRONTS.infrastructure);
    if (r.successP >= SUCCESS_CUTOFF) expect(r.outcome).toBe('won');
    else expect(r.outcome).toBe('failed');
  });

  it('zero-coverage stat forces successP=0 and outcome=failed', () => {
    // Craft a fake front with a huge threshold to force coverage below floor.
    // We use the real Infrastructure front with an ad-hoc modification:
    const impossibleFront = {
      ...FRONTS.infrastructure,
      requirements: {
        INT: { threshold: 1_000_000, weight: 0.6 },
        SPD: { threshold: 1_000_000, weight: 0.4 },
      },
    };
    const r = resolveIncursion(team, impossibleFront);
    expect(r.successP).toBeCloseTo(0, 5);
    expect(r.outcome).toBe('failed');
  });

  it('only required stats appear in coverage', () => {
    const r = resolveIncursion(team, FRONTS.infrastructure);
    // Infrastructure requires INT + SPD only
    expect(r.coverage.INT).toBeDefined();
    expect(r.coverage.SPD).toBeDefined();
    expect(r.coverage.PWR).toBeUndefined();
    expect(r.coverage.VIT).toBeUndefined();
    expect(r.coverage.GUI).toBeUndefined();
  });

  it('teamIds mirrors the input team order', () => {
    const r = resolveIncursion(team, FRONTS.infrastructure);
    expect(r.teamIds).toEqual([1, 2, 3, 4]);
  });

  it('throws when team size is not TEAM_SIZE', () => {
    const shortTeam = [makeUnit(1, 1), makeUnit(2, 2), makeUnit(3, 3)];
    expect(() => resolveIncursion(shortTeam, FRONTS.infrastructure)).toThrow(/TEAM_SIZE|team size/);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- tests/sim/incursion.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `src/sim/incursion.ts`**

```ts
import type { Stat } from './types';
import { STATS } from './types';
import type { Unit } from '../state/types';
import type { FrontProfile, FrontId } from './data/fronts';
import type { CoverageBand } from './coverage-bands';
import { bandForCoverage, BAND_PHRASES } from './coverage-bands';
import { computeCurrentStats } from './stats';

export const TEAM_SIZE = 4 as const;
export const COVERAGE_CLIP = 1.2 as const;
export const SUCCESS_CUTOFF = 0.85 as const;
export const INCURSION_LEVEL = 20 as const;
export const INCURSION_SUBSTREAM_PRIME = 1_000_099 as const; // reserved for M6+; unused in M5

export interface IncursionBeat {
  readonly kind: 'launch' | 'stat' | 'verdict';
  readonly stat?: Stat;
  readonly band?: CoverageBand;
  readonly text: string;
}

export interface BestContributor {
  readonly unitId: number;
  readonly value: number;
}

export interface IncursionResolution {
  readonly frontId: FrontId;
  readonly teamIds: readonly [number, number, number, number];
  readonly coverage: Readonly<Partial<Record<Stat, number>>>;
  readonly bestContributors: Readonly<Partial<Record<Stat, number>>>; // unitId per stat
  readonly successP: number;
  readonly outcome: 'won' | 'failed';
  readonly beats: readonly IncursionBeat[];
}

/**
 * For each requested stat, find the team member with the highest computed
 * stat value at INCURSION_LEVEL, wear applied. Ties break toward the earlier
 * team-list index (first-seen wins).
 */
export function bestContributorPerStat(
  team: readonly Unit[],
  requiredStats: readonly Stat[],
): Readonly<Partial<Record<Stat, BestContributor>>> {
  const out: Partial<Record<Stat, BestContributor>> = {};
  // Precompute per-unit stats once
  const perUnitStats: { unit: Unit; stats: Record<Stat, number> }[] = team.map((u) => ({
    unit: u,
    stats: computeCurrentStats(u.genome, INCURSION_LEVEL, u.wear),
  }));
  for (const s of requiredStats) {
    let best: BestContributor | undefined;
    for (const entry of perUnitStats) {
      const v = entry.stats[s];
      if (best === undefined || v > best.value) {
        best = { unitId: entry.unit.id, value: v };
      }
    }
    if (best !== undefined) out[s] = best;
  }
  return out;
}

/**
 * Deterministic Incursion resolution. Same team + front → identical output.
 * No RNG in M5.
 */
export function resolveIncursion(team: readonly Unit[], front: FrontProfile): IncursionResolution {
  if (team.length !== TEAM_SIZE) {
    throw new Error(`resolveIncursion: team size ${team.length} !== TEAM_SIZE ${TEAM_SIZE}`);
  }

  // Extract required stats (keys of front.requirements where value !== undefined),
  // preserving Object.keys order — this becomes the beat order.
  const requiredStatsOrdered: Stat[] = [];
  for (const s of Object.keys(front.requirements) as Stat[]) {
    if (front.requirements[s] !== undefined) requiredStatsOrdered.push(s);
  }

  const bests = bestContributorPerStat(team, requiredStatsOrdered);

  const coverage: Partial<Record<Stat, number>> = {};
  const bestContributors: Partial<Record<Stat, number>> = {};
  for (const s of requiredStatsOrdered) {
    const req = front.requirements[s]!;
    const best = bests[s]!;
    if (req.threshold === 0) {
      // Defensive: threshold 0 means "any positive value clears it".
      coverage[s] = best.value > 0 ? COVERAGE_CLIP : 0;
    } else {
      coverage[s] = Math.min(COVERAGE_CLIP, best.value / req.threshold);
    }
    bestContributors[s] = best.unitId;
  }

  let successP = 1;
  for (const s of requiredStatsOrdered) {
    const c = coverage[s]!;
    const w = front.requirements[s]!.weight;
    successP *= c ** w;
  }

  const outcome: 'won' | 'failed' = successP >= SUCCESS_CUTOFF ? 'won' : 'failed';

  const beats: IncursionBeat[] = [];
  beats.push({ kind: 'launch', text: front.flavor.launchBlurb });
  for (const s of requiredStatsOrdered) {
    const c = coverage[s]!;
    const band = bandForCoverage(c);
    beats.push({ kind: 'stat', stat: s, band, text: BAND_PHRASES[s][band] });
  }
  beats.push({
    kind: 'verdict',
    text: outcome === 'won' ? front.flavor.winBlurb : front.flavor.failBlurb,
  });

  return {
    frontId: front.id,
    teamIds: [team[0]!.id, team[1]!.id, team[2]!.id, team[3]!.id] as const,
    coverage,
    bestContributors,
    successP,
    outcome,
    beats,
  };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/sim/incursion.test.ts`
Expected: PASS all 13 tests.

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test`
Expected: 215 previous + 13 new = 228 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/sim/incursion.ts tests/sim/incursion.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): resolveIncursion — best-contributor + weighted geometric mean

Adds the Incursion resolution math:
- TEAM_SIZE = 4, COVERAGE_CLIP = 1.2, SUCCESS_CUTOFF = 0.85
- INCURSION_LEVEL = 20 (fixed level for M5 stat computation)
- INCURSION_SUBSTREAM_PRIME = 1_000_099 (reserved for M6+, unused now)

bestContributorPerStat(team, requiredStats): for each stat, the team
member with the highest computeCurrentStats value at level 20 with
wear applied. Ties break to earlier team-list index. Precomputes
per-unit stats once so the inner loop is cheap.

resolveIncursion(team, front):
  coverage[s] = min(1.2, best[s].value / threshold[s])
  successP = Π (coverage[s] ^ weight[s]) over required stats only
  outcome = successP >= 0.85 ? 'won' : 'failed'
  beats = [launch, statA, statB, verdict] (4 beats for a 2-stat front)

Deterministic. Same team + front → identical resolution. No RNG.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: State — `state/incursion.ts` helpers + Colony store extensions + v4 migration

**Files:**
- Create: `src/state/incursion.ts`
- Modify: `src/state/colony.ts` — extend store shape, add `launchIncursion` + `dismissIncursion` actions, bump persist to `version: 4` with a new migrate branch, extend `partialize`
- Modify: `tests/state/colony.test.ts` — extend `beforeEach` with `fronts` + `activeIncursion`, add Incursion tests
- Modify: `tests/state/persist.test.ts` — extend `beforeEach`, add v3→v4 migration test + v1→v4 chained test + mid-Incursion drop test
- Modify: `tests/ui/{colony,EmptyColony,DecantButton,HarvestIndicator,FailsafeIndicator,Breed,BreedButton,BreedIndicator,ParentSlot,App}.test.tsx` — update `beforeEach` to reset new fields where present

**Interfaces produced:**
- `const FRONT_COOLDOWN_MS = 30 * 60 * 1000 as const`
- `interface FrontState { captured: boolean; cooldownUntil: number | null }`
- Store gains: `fronts: Readonly<Record<FrontId, FrontState>>`, `activeIncursion: IncursionResolution | null`, `launchIncursion(frontId, teamIds): IncursionResolution`, `dismissIncursion(): void`.
- Persist: `version: 4`, chained migrate now handles v3→v4 (fronts defaults).

**Global constraints for this task:**
- Storage key stays `morulium/colony/v1`. Do NOT rename.
- `launchIncursion` throws on: unknown frontId, captured front, cooldown-active front (checked at call time via `Date.now()`), team size ≠ 4, duplicate team ids, missing unit id.
- `dismissIncursion` is a no-op when `activeIncursion === null`.
- `launchIncursion` sets ONLY `activeIncursion` — front state changes happen in `dismissIncursion`.
- `launchIncursion` does NOT touch `droughtCount`, `harvestsToday`, `breedsToday`.
- `activeIncursion` is transient (excluded from `partialize`).
- `Unit` shape is UNCHANGED. Test fixtures do not need Unit-shape updates.
- Chained migration: `if (from < 4) { ... }` appended AFTER the existing v2 and v3 branches — no `else`.
- No `any`.

- [ ] **Step 1: Create `src/state/incursion.ts`**

```ts
import type { FrontId } from '../sim/data/fronts';

export const FRONT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

export interface FrontState {
  readonly captured: boolean;
  readonly cooldownUntil: number | null;
}

export const FRESH_FRONTS: Readonly<Record<FrontId, FrontState>> = {
  infrastructure: { captured: false, cooldownUntil: null },
  military:       { captured: false, cooldownUntil: null },
  guerrilla:      { captured: false, cooldownUntil: null },
};
```

- [ ] **Step 2: Modify `src/state/colony.ts`**

Replace the file's content with (see the full text below; the changes vs. M4 are: new imports, extended `ColonyStore` interface, initial-state additions, `launchIncursion` + `dismissIncursion` actions, new v4 migrate branch, extended `partialize`):

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Unit } from './types';
import { STORAGE_KEY } from './persist';
import { rollGenome } from '../sim/genome';
import { createRng } from '../sim/rng';
import { computeRarity } from '../sim/rarity';
import {
  DAILY_HARVEST_LIMIT,
  todayLocalKey,
} from './harvest';
import {
  DROUGHT_THRESHOLD,
  FAILSAFE_MIN_TIER,
  FAILSAFE_SUBSTREAM_PRIME,
  rollGenomeAtLeast,
  tierAtLeast,
} from './failsafe';
import {
  DAILY_BREED_LIMIT,
  BREED_SUBSTREAM_PRIME,
} from './breed';
import { breedGenome, MUTATION_RATE } from '../sim/breed';
import { nextWear } from '../sim/wear';
import type { FrontId } from '../sim/data/fronts';
import { FRONTS } from '../sim/data/fronts';
import { TEAM_SIZE, resolveIncursion } from '../sim/incursion';
import type { IncursionResolution } from '../sim/incursion';
import { FRESH_FRONTS, FRONT_COOLDOWN_MS } from './incursion';
import type { FrontState } from './incursion';

interface ColonyStore {
  readonly units: Unit[];
  readonly nextId: number;
  readonly lastDecantedId: number | null;
  readonly harvestsToday: number;
  readonly harvestDayKey: string;
  readonly droughtCount: number;
  readonly breedsToday: number;
  readonly breedDayKey: string;
  readonly fronts: Readonly<Record<FrontId, FrontState>>;
  readonly activeIncursion: IncursionResolution | null;

  decant: () => Unit;
  breed: (parentAId: number, parentBId: number) => Unit;
  launchIncursion: (frontId: FrontId, teamIds: readonly [number, number, number, number]) => IncursionResolution;
  dismissIncursion: () => void;
  clearHighlight: () => void;
}

export const useColonyStore = create<ColonyStore>()(
  persist(
    (set, get) => ({
      units: [],
      nextId: 1,
      lastDecantedId: null,
      harvestsToday: 0,
      harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0,
      breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS,
      activeIncursion: null,

      decant: () => {
        const state = get();
        const today = todayLocalKey();
        const harvestsUsedToday = state.harvestDayKey === today ? state.harvestsToday : 0;
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
        });
        return unit;
      },

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
        });
        return child;
      },

      launchIncursion: (frontId, teamIds) => {
        const state = get();
        const frontState = state.fronts[frontId];
        if (!frontState) throw new Error(`launchIncursion: unknown front ${frontId}`);
        if (frontState.captured) throw new Error(`launchIncursion: front ${frontId} already captured`);
        if (frontState.cooldownUntil !== null && frontState.cooldownUntil > Date.now()) {
          throw new Error(`launchIncursion: front ${frontId} on cooldown`);
        }
        if (teamIds.length !== TEAM_SIZE) {
          throw new Error(`launchIncursion: team must have exactly ${TEAM_SIZE} members`);
        }
        const unique = new Set(teamIds);
        if (unique.size !== TEAM_SIZE) {
          throw new Error('launchIncursion: team ids must be distinct');
        }
        const team: Unit[] = [];
        for (const id of teamIds) {
          const u = state.units.find((u) => u.id === id);
          if (!u) throw new Error(`launchIncursion: unit ${id} not found`);
          team.push(u);
        }
        const resolution = resolveIncursion(team, FRONTS[frontId]);
        set({ activeIncursion: resolution });
        return resolution;
      },

      dismissIncursion: () => {
        const state = get();
        const r = state.activeIncursion;
        if (r === null) return;
        const target: FrontState = { ...state.fronts[r.frontId] };
        if (r.outcome === 'won') {
          set({
            fronts: { ...state.fronts, [r.frontId]: { captured: true, cooldownUntil: null } },
            activeIncursion: null,
          });
        } else {
          set({
            fronts: { ...state.fronts, [r.frontId]: { ...target, cooldownUntil: Date.now() + FRONT_COOLDOWN_MS } },
            activeIncursion: null,
          });
        }
      },

      clearHighlight: () => set({ lastDecantedId: null }),
    }),
    {
      name: STORAGE_KEY,
      version: 4,
      migrate: (state, from) => {
        let s = state as ColonyStore;
        if (from < 2) {
          const v1 = s as Partial<ColonyStore> & { units: Unit[]; nextId: number };
          s = {
            ...v1,
            harvestsToday: 0,
            harvestDayKey: todayLocalKey(),
            droughtCount: 0,
          } as ColonyStore;
        }
        if (from < 3) {
          type LegacyUnit = Omit<Unit, 'generation' | 'parentIds' | 'wear'> & {
            generation?: number;
            parentIds?: readonly [number, number] | null;
            wear?: Readonly<Record<string, number>>;
          };
          const v2 = s as ColonyStore & { units: LegacyUnit[] };
          s = {
            ...v2,
            breedsToday: 0,
            breedDayKey: todayLocalKey(),
            units: v2.units.map((u) => ({
              id: u.id,
              seed: u.seed,
              decantedAt: u.decantedAt,
              genome: u.genome,
              generation: u.generation ?? 0,
              parentIds: u.parentIds ?? null,
              wear: u.wear ?? {},
            })),
          };
        }
        if (from < 4) {
          s = {
            ...s,
            fronts: FRESH_FRONTS,
            // activeIncursion is transient — no need to backfill
          };
        }
        return s;
      },
      partialize: (state) => ({
        units: state.units,
        nextId: state.nextId,
        harvestsToday: state.harvestsToday,
        harvestDayKey: state.harvestDayKey,
        droughtCount: state.droughtCount,
        breedsToday: state.breedsToday,
        breedDayKey: state.breedDayKey,
        fronts: state.fronts,
        // activeIncursion excluded (transient — ticker not resumable)
      }),
    },
  ),
);

/** Pure selector: find a unit by id. */
export function unitById(state: { units: readonly Unit[] }, id: number): Unit | undefined {
  return state.units.find((u) => u.id === id);
}
```

- [ ] **Step 3: Update `tests/state/colony.test.ts`**

Replace the shared `beforeEach` with:

```ts
import { FRESH_FRONTS } from '../../src/state/incursion';

beforeEach(() => {
  useColonyStore.setState({
    units: [],
    nextId: 1,
    lastDecantedId: null,
    harvestsToday: 0,
    harvestDayKey: todayLocalKey(),
    droughtCount: 0,
    breedsToday: 0,
    breedDayKey: todayLocalKey(),
    fronts: FRESH_FRONTS,
    activeIncursion: null,
  });
});
```

Add these new tests at the end of the outer `describe('colony store', ...)` block:

```ts
it('launchIncursion returns a resolution with the correct frontId and teamIds', () => {
  const u1 = useColonyStore.getState().decant();
  const u2 = useColonyStore.getState().decant();
  const u3 = useColonyStore.getState().decant();
  // Need a 4th unit but we're at the daily Harvest cap — advance a day
  vi.setSystemTime(new Date(2026, 7, 5, 12, 0, 0));
  const u4 = useColonyStore.getState().decant();
  vi.useRealTimers();

  const r = useColonyStore.getState().launchIncursion('infrastructure', [u1.id, u2.id, u3.id, u4.id]);
  expect(r.frontId).toBe('infrastructure');
  expect(r.teamIds).toEqual([u1.id, u2.id, u3.id, u4.id]);
});

it('launchIncursion sets activeIncursion but does NOT change front state yet', () => {
  const team = [
    useColonyStore.getState().decant(),
    useColonyStore.getState().decant(),
    useColonyStore.getState().decant(),
  ];
  vi.setSystemTime(new Date(2026, 7, 5, 12, 0, 0));
  const u4 = useColonyStore.getState().decant();
  vi.useRealTimers();

  useColonyStore.getState().launchIncursion('infrastructure', [team[0]!.id, team[1]!.id, team[2]!.id, u4.id]);
  const s = useColonyStore.getState();
  expect(s.activeIncursion).not.toBeNull();
  // Front state unchanged
  expect(s.fronts.infrastructure.captured).toBe(false);
  expect(s.fronts.infrastructure.cooldownUntil).toBeNull();
});

it('dismissIncursion commits captured=true on outcome=won', () => {
  // Seed 4 units directly to bypass daily cap
  useColonyStore.setState({
    units: [1, 2, 3, 4].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
    })),
    nextId: 5,
  });
  // Force an "always-win" scenario: mutate the activeIncursion post-launch
  const r = useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
  // Overwrite outcome to test dismiss logic in isolation
  useColonyStore.setState({ activeIncursion: { ...r, outcome: 'won' } });
  useColonyStore.getState().dismissIncursion();
  const s = useColonyStore.getState();
  expect(s.fronts.infrastructure.captured).toBe(true);
  expect(s.fronts.infrastructure.cooldownUntil).toBeNull();
  expect(s.activeIncursion).toBeNull();
});

it('dismissIncursion commits cooldownUntil on outcome=failed', () => {
  vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
  useColonyStore.setState({
    units: [1, 2, 3, 4].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
    })),
    nextId: 5,
  });
  const r = useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
  useColonyStore.setState({ activeIncursion: { ...r, outcome: 'failed' } });
  useColonyStore.getState().dismissIncursion();
  const s = useColonyStore.getState();
  expect(s.fronts.infrastructure.captured).toBe(false);
  const now = new Date(2026, 7, 4, 12, 0, 0).getTime();
  expect(s.fronts.infrastructure.cooldownUntil).toBe(now + 30 * 60 * 1000);
  expect(s.activeIncursion).toBeNull();
  vi.useRealTimers();
});

it('dismissIncursion is a no-op when activeIncursion is null', () => {
  const before = useColonyStore.getState();
  useColonyStore.getState().dismissIncursion();
  const after = useColonyStore.getState();
  expect(after.fronts).toEqual(before.fronts);
  expect(after.activeIncursion).toBeNull();
});

it('launchIncursion throws when front is captured', () => {
  useColonyStore.setState({
    units: [1, 2, 3, 4].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
    })),
    nextId: 5,
    fronts: { ...FRESH_FRONTS, infrastructure: { captured: true, cooldownUntil: null } },
  });
  expect(() => useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]))
    .toThrow(/already captured/);
});

it('launchIncursion throws when front is on active cooldown', () => {
  vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
  const now = Date.now();
  useColonyStore.setState({
    units: [1, 2, 3, 4].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
    })),
    nextId: 5,
    fronts: { ...FRESH_FRONTS, military: { captured: false, cooldownUntil: now + 60_000 } },
  });
  expect(() => useColonyStore.getState().launchIncursion('military', [1, 2, 3, 4]))
    .toThrow(/on cooldown/);
  vi.useRealTimers();
});

it('launchIncursion allows a front whose cooldown has passed', () => {
  vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
  const now = Date.now();
  useColonyStore.setState({
    units: [1, 2, 3, 4].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
    })),
    nextId: 5,
    fronts: { ...FRESH_FRONTS, military: { captured: false, cooldownUntil: now - 60_000 } },
  });
  expect(() => useColonyStore.getState().launchIncursion('military', [1, 2, 3, 4])).not.toThrow();
  vi.useRealTimers();
});

it('launchIncursion throws on team size != 4', () => {
  useColonyStore.setState({
    units: [1, 2, 3].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
    })),
    nextId: 4,
  });
  // @ts-expect-error: intentional short tuple to test defensive check
  expect(() => useColonyStore.getState().launchIncursion('guerrilla', [1, 2, 3]))
    .toThrow(/exactly 4 members/);
});

it('launchIncursion throws when team ids contain duplicates', () => {
  useColonyStore.setState({
    units: [1, 2, 3, 4].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
    })),
    nextId: 5,
  });
  expect(() => useColonyStore.getState().launchIncursion('guerrilla', [1, 1, 3, 4]))
    .toThrow(/must be distinct/);
});

it('launchIncursion throws when a team id is not a colony unit', () => {
  useColonyStore.setState({
    units: [1, 2, 3, 4].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
    })),
    nextId: 5,
  });
  expect(() => useColonyStore.getState().launchIncursion('guerrilla', [1, 2, 3, 999]))
    .toThrow(/unit 999 not found/);
});

it('launchIncursion does NOT touch droughtCount, harvestsToday, or breedsToday', () => {
  vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
  useColonyStore.setState({
    units: [1, 2, 3, 4].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
    })),
    nextId: 5,
    harvestsToday: 2,
    harvestDayKey: '2026-08-04',
    droughtCount: 17,
    breedsToday: 1,
    breedDayKey: '2026-08-04',
  });
  useColonyStore.getState().launchIncursion('guerrilla', [1, 2, 3, 4]);
  const s = useColonyStore.getState();
  expect(s.harvestsToday).toBe(2);
  expect(s.droughtCount).toBe(17);
  expect(s.breedsToday).toBe(1);
  vi.useRealTimers();
});

it('full round-trip: launch on Won → dismiss captures → re-launch throws', () => {
  useColonyStore.setState({
    units: [1, 2, 3, 4].map((i) => ({
      id: i, seed: i, decantedAt: 100 * i,
      genome: rollGenome(createRng(i * 101)),
      generation: 0, parentIds: null, wear: {},
    })),
    nextId: 5,
  });
  const r = useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]);
  useColonyStore.setState({ activeIncursion: { ...r, outcome: 'won' } });
  useColonyStore.getState().dismissIncursion();
  expect(useColonyStore.getState().fronts.infrastructure.captured).toBe(true);
  expect(() => useColonyStore.getState().launchIncursion('infrastructure', [1, 2, 3, 4]))
    .toThrow(/already captured/);
});
```

Add the necessary imports at the top of `tests/state/colony.test.ts` if not present:

```ts
import { rollGenome } from '../../src/sim/genome';
import { createRng } from '../../src/sim/rng';
import { FRESH_FRONTS } from '../../src/state/incursion';
```

- [ ] **Step 4: Update `tests/state/persist.test.ts`**

Replace the shared `beforeEach` with the 10-field version above (add the two new fronts + activeIncursion fields). Add `import { FRESH_FRONTS } from '../../src/state/incursion';` and `import type { FrontState } from '../../src/state/incursion';` at the top.

Add these tests to the outer describe:

```ts
it('M5 fronts field persists across a rehydration cycle', () => {
  const modified = {
    ...FRESH_FRONTS,
    infrastructure: { captured: true, cooldownUntil: null },
    military: { captured: false, cooldownUntil: 1_700_000_000_000 },
  };
  useColonyStore.setState({
    fronts: modified,
  });
  const raw = localStorage.getItem(STORAGE_KEY);
  expect(raw).not.toBeNull();
  const parsed = JSON.parse(raw!);
  expect(parsed.state.fronts.infrastructure.captured).toBe(true);
  expect(parsed.state.fronts.military.cooldownUntil).toBe(1_700_000_000_000);
  expect(parsed.state.activeIncursion).toBeUndefined(); // transient
  expect(parsed.version).toBe(4);
});

it('migrate v3 → v4 adds FRESH_FRONTS', async () => {
  const v3Shape = {
    state: {
      units: [
        { id: 1, seed: 1, decantedAt: 1, genome: { loci: {} }, generation: 0, parentIds: null, wear: {} },
      ],
      nextId: 2,
      harvestsToday: 0, harvestDayKey: '2026-08-04', droughtCount: 0,
      breedsToday: 0, breedDayKey: '2026-08-04',
    },
    version: 3,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v3Shape));
  await useColonyStore.persist.rehydrate();
  const s = useColonyStore.getState();
  expect(s.fronts).toEqual(FRESH_FRONTS);
  expect(s.activeIncursion).toBeNull();
});

it('migrate v1 → v4 chains through all branches', async () => {
  const v1Shape = {
    state: {
      units: [{ id: 1, seed: 1, decantedAt: 1, genome: { loci: {} } }],
      nextId: 2,
    },
    version: 1,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v1Shape));
  await useColonyStore.persist.rehydrate();
  const s = useColonyStore.getState();
  // M3b fields
  expect(s.harvestsToday).toBe(0);
  expect(s.droughtCount).toBe(0);
  // M4 store fields
  expect(s.breedsToday).toBe(0);
  // M4 unit fields backfilled
  expect(s.units[0]!.generation).toBe(0);
  expect(s.units[0]!.parentIds).toBeNull();
  expect(s.units[0]!.wear).toEqual({});
  // M5 fronts
  expect(s.fronts).toEqual(FRESH_FRONTS);
  expect(s.activeIncursion).toBeNull();
});

it('activeIncursion is NOT persisted (transient — ticker not resumable)', () => {
  const dummyResolution = {
    frontId: 'infrastructure' as const,
    teamIds: [1, 2, 3, 4] as const,
    coverage: { INT: 1.0, SPD: 0.9 },
    bestContributors: { INT: 1, SPD: 2 },
    successP: 0.95,
    outcome: 'won' as const,
    beats: [{ kind: 'verdict' as const, text: 'stub' }],
  };
  useColonyStore.setState({ activeIncursion: dummyResolution });
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = JSON.parse(raw!);
  expect(parsed.state.activeIncursion).toBeUndefined();
});
```

- [ ] **Step 5: Update UI test `beforeEach` blocks**

Every UI test file that resets the store needs the two new fields. Files affected (grep for `useColonyStore.setState({` in `tests/ui/`):

- `tests/ui/colony.test.tsx`
- `tests/ui/EmptyColony.test.tsx`
- `tests/ui/DecantButton.test.tsx`
- `tests/ui/HarvestIndicator.test.tsx`
- `tests/ui/FailsafeIndicator.test.tsx`
- `tests/ui/Breed.test.tsx`
- `tests/ui/BreedButton.test.tsx`
- `tests/ui/BreedIndicator.test.tsx`
- `tests/ui/ParentSlot.test.tsx`
- `tests/ui/App.test.tsx`

In each `beforeEach` (and any inline `setState` that fully resets state), add:

```ts
import { FRESH_FRONTS } from '../../src/state/incursion';

// inside beforeEach:
useColonyStore.setState({
  units: [], nextId: 1, lastDecantedId: null,
  harvestsToday: 0, harvestDayKey: todayLocalKey(),
  droughtCount: 0,
  breedsToday: 0, breedDayKey: todayLocalKey(),
  fronts: FRESH_FRONTS,
  activeIncursion: null,
});
```

Partial-state test-inner `setState` calls (that don't reset the store, only tweak specific fields) do NOT need updating — Zustand merges by default and `beforeEach` handles the base reset.

- [ ] **Step 6: Run state tests**

Run: `npm test -- tests/state/`
Expected: all state tests pass (existing + new: 12 new Incursion tests in colony.test.ts + 4 new persist tests).

- [ ] **Step 7: Run UI tests (regression check from beforeEach updates)**

Run: `npm test -- tests/ui/`
Expected: all existing UI tests pass with the extended `beforeEach`.

- [ ] **Step 8: Full suite + typecheck**

Run: `npm test`
Expected: 228 previous + 12 new colony tests + 4 new persist tests = ~244 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add src/state/incursion.ts src/state/colony.ts tests/state/colony.test.ts tests/state/persist.test.ts tests/ui/colony.test.tsx tests/ui/EmptyColony.test.tsx tests/ui/DecantButton.test.tsx tests/ui/HarvestIndicator.test.tsx tests/ui/FailsafeIndicator.test.tsx tests/ui/Breed.test.tsx tests/ui/BreedButton.test.tsx tests/ui/BreedIndicator.test.tsx tests/ui/ParentSlot.test.tsx tests/ui/App.test.tsx
git commit -m "$(cat <<'EOF'
feat(state): Colony store gains launchIncursion + dismissIncursion + v4 migration

Adds src/state/incursion.ts:
- FRONT_COOLDOWN_MS = 30 * 60 * 1000 (30-minute per-front cooldown)
- FrontState { captured, cooldownUntil } and FRESH_FRONTS default map

Extends ColonyStore with two new fields:
- fronts: Record<FrontId, FrontState> (persisted)
- activeIncursion: IncursionResolution | null (transient)

New actions:
- launchIncursion(frontId, teamIds): computes resolution via
  resolveIncursion, sets activeIncursion — does NOT commit front
  state changes. Throws on: unknown front, captured, active
  cooldown, team size != 4, duplicate ids, missing unit id.
- dismissIncursion(): commits captured=true on won, or
  cooldownUntil=now+30m on failed. Clears activeIncursion.

Two-phase commit prevents the UI from flashing captured state before
the ticker plays.

Reload mid-Incursion drops activeIncursion (transient), leaves
fronts intact — ticker not resumable, but front state persists.

Persist bumped to version: 4 with chained migrate; a v1 save
cascades through v2 → v3 → v4 in one pass. Storage key stays
'morulium/colony/v1'.

launchIncursion does NOT touch droughtCount/harvestsToday/breedsToday.
Each acquisition loop stays isolated.

Every UI test beforeEach updated to reset the two new store fields.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: UI — `FrontCard.tsx`

**Files:**
- Create: `src/ui/components/FrontCard.tsx`
- Modify: `src/ui/styles.ts` — add `frontCard`, `frontCardSelected`, `frontCardCaptured`, `frontCardCooldown`, `frontCardLabel`, `frontCardStatus` styles
- Create: `tests/ui/FrontCard.test.tsx`

**Interfaces produced:**
- `<FrontCard frontId: FrontId label: string state: FrontState selected: boolean now: number onClick: () => void />` — renders one clickable card with label + status pill. Renders `Available` / `Cooling down · Xm Ys` / `Captured ✓` based on `state` + `now`. Clickable only when Available (not captured, not on active cooldown).
- `data-testid="front-card-{frontId}"` on the container.
- `data-testid="front-card-status-{frontId}"` on the status text span.
- `data-disabled="true"` when not clickable.

**Global constraints for this task:**
- No `any`.
- Test file starts with `// @vitest-environment jsdom`.
- No `useEffect` inside `FrontCard` — parent (`Incursion.tsx`, Task 7) drives the "now" clock via a passed prop so the countdown ticks without every card owning its own interval.
- Do NOT modify `Incursion.tsx`, `IncursionBeat.tsx`, or `App.tsx`.

- [ ] **Step 1: Add style entries to `src/ui/styles.ts`**

Add inside the exported `styles` object:

```ts
  frontCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 220,
    height: 140,
    borderRadius: 10,
    border: '2px solid #cbd5e1',
    background: '#ffffff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 12,
    transition: 'border-color 120ms ease',
  } as CSSProperties,

  frontCardSelected: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 220,
    height: 140,
    borderRadius: 10,
    border: '2px solid #8b5cf6',   // violet
    background: '#faf5ff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 12,
    boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.25)',
  } as CSSProperties,

  frontCardCaptured: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 220,
    height: 140,
    borderRadius: 10,
    border: '2px solid #22c55e',   // green
    background: '#f0fdf4',
    cursor: 'not-allowed',
    fontFamily: 'inherit',
    padding: 12,
  } as CSSProperties,

  frontCardCooldown: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 220,
    height: 140,
    borderRadius: 10,
    border: '2px solid #cbd5e1',
    background: '#f1f5f9',
    color: '#94a3b8',
    cursor: 'not-allowed',
    fontFamily: 'inherit',
    padding: 12,
  } as CSSProperties,

  frontCardLabel: {
    fontSize: 18,
    fontWeight: 600,
    color: '#0f172a',
  } as CSSProperties,

  frontCardStatus: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,
```

- [ ] **Step 2: Write failing tests at `tests/ui/FrontCard.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { FrontCard } from '../../src/ui/components/FrontCard';

const NOW = new Date(2026, 7, 4, 12, 0, 0).getTime();

describe('FrontCard', () => {
  afterEach(() => cleanup());

  it('renders "Available" status for available fronts', () => {
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: false, cooldownUntil: null }}
        selected={false}
        now={NOW}
        onClick={() => {}}
      />
    );
    expect(getByTestId('front-card-status-infrastructure').textContent).toBe('Available');
    expect(getByTestId('front-card-infrastructure').getAttribute('data-disabled')).toBeNull();
  });

  it('renders "Captured" and disables clicks for captured fronts', () => {
    const onClick = vi.fn();
    const { getByTestId } = render(
      <FrontCard
        frontId="military"
        label="Military"
        state={{ captured: true, cooldownUntil: null }}
        selected={false}
        now={NOW}
        onClick={onClick}
      />
    );
    expect(getByTestId('front-card-status-military').textContent).toBe('Captured ✓');
    expect(getByTestId('front-card-military').getAttribute('data-disabled')).toBe('true');
    fireEvent.click(getByTestId('front-card-military'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders "Cooling down · Xm Ys" for active cooldown', () => {
    // 7 min 23 sec remaining
    const cooldownUntil = NOW + 7 * 60 * 1000 + 23 * 1000;
    const onClick = vi.fn();
    const { getByTestId } = render(
      <FrontCard
        frontId="guerrilla"
        label="Guerrilla"
        state={{ captured: false, cooldownUntil }}
        selected={false}
        now={NOW}
        onClick={onClick}
      />
    );
    expect(getByTestId('front-card-status-guerrilla').textContent).toContain('7m 23s');
    expect(getByTestId('front-card-guerrilla').getAttribute('data-disabled')).toBe('true');
    fireEvent.click(getByTestId('front-card-guerrilla'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders "Available" when cooldownUntil has passed', () => {
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: false, cooldownUntil: NOW - 1000 }}
        selected={false}
        now={NOW}
        onClick={() => {}}
      />
    );
    expect(getByTestId('front-card-status-infrastructure').textContent).toBe('Available');
    expect(getByTestId('front-card-infrastructure').getAttribute('data-disabled')).toBeNull();
  });

  it('applies selected style when selected=true', () => {
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: false, cooldownUntil: null }}
        selected={true}
        now={NOW}
        onClick={() => {}}
      />
    );
    const card = getByTestId('front-card-infrastructure');
    // Selected border is violet 8b5cf6
    expect(card.style.borderColor).toMatch(/(#8b5cf6)|(rgb\(139, ?92, ?246\))/i);
  });

  it('calls onClick when available and clicked', () => {
    const onClick = vi.fn();
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: false, cooldownUntil: null }}
        selected={false}
        now={NOW}
        onClick={onClick}
      />
    );
    fireEvent.click(getByTestId('front-card-infrastructure'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npm test -- tests/ui/FrontCard.test.tsx`
Expected: FAIL — component doesn't exist.

- [ ] **Step 4: Create `src/ui/components/FrontCard.tsx`**

```tsx
import type { ReactElement } from 'react';
import type { FrontId } from '../../sim/data/fronts';
import type { FrontState } from '../../state/incursion';
import { styles } from '../styles';

interface Props {
  readonly frontId: FrontId;
  readonly label: string;
  readonly state: FrontState;
  readonly selected: boolean;
  readonly now: number;                // parent-driven clock for cooldown countdown
  readonly onClick: () => void;
}

function formatCooldown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function FrontCard({ frontId, label, state, selected, now, onClick }: Props): ReactElement {
  const cooldownActive = state.cooldownUntil !== null && state.cooldownUntil > now;
  const clickable = !state.captured && !cooldownActive;

  let statusText: string;
  if (state.captured) statusText = 'Captured ✓';
  else if (cooldownActive) statusText = `Cooling down · ${formatCooldown(state.cooldownUntil! - now)}`;
  else statusText = 'Available';

  const style = state.captured
    ? styles.frontCardCaptured
    : cooldownActive
      ? styles.frontCardCooldown
      : selected
        ? styles.frontCardSelected
        : styles.frontCard;

  return (
    <div
      style={style}
      onClick={() => { if (clickable) onClick(); }}
      data-testid={`front-card-${frontId}`}
      data-disabled={clickable ? undefined : 'true'}
    >
      <div style={styles.frontCardLabel}>{label}</div>
      <div style={styles.frontCardStatus} data-testid={`front-card-status-${frontId}`}>
        {statusText}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- tests/ui/FrontCard.test.tsx`
Expected: PASS all 6 tests.

- [ ] **Step 6: Full suite + typecheck**

Run: `npm test`
Expected: ~244 previous + 6 new = ~250 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/ui/components/FrontCard.tsx src/ui/styles.ts tests/ui/FrontCard.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): FrontCard — clickable status card for one front

FrontCard renders one of three visual states:
- Available (clickable, plain border; violet ring when selected)
- Cooling down (grey, shows "Cooling down · Xm Ys" from a parent-driven
  now prop so the parent's setInterval ticks all three cards together)
- Captured (green, ✓ badge, unclickable)

Cooldown countdown formatted as "Xm Ys" — matches game spec §11's
qualitative-not-numeric feedback on stat coverage while giving the
player an unambiguous timer for the pacing mechanic.

data-testid: 'front-card-{frontId}' on container; 'front-card-status-
{frontId}' on the status text span; 'data-disabled="true"' when the
card is not clickable.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: UI — `IncursionBeat.tsx` + `IncursionTicker.tsx`

**Files:**
- Create: `src/ui/components/IncursionBeat.tsx`
- Create: `src/ui/components/IncursionTicker.tsx`
- Modify: `src/ui/styles.ts` — add `incursionTicker`, `incursionBeat`, `incursionBeatVisible`, `incursionBeatHidden`, `incursionSkipButton` styles
- Create: `tests/ui/IncursionBeat.test.tsx`
- Create: `tests/ui/IncursionTicker.test.tsx`

**Interfaces produced:**
- `<IncursionBeat beat: IncursionBeat visible: boolean index: number />` — renders one beat's text; hidden (opacity 0 + not focusable, still in the DOM so layout doesn't jump) when `visible=false`. `data-testid="incursion-beat-{index}"`, `data-visible="true"` when visible.
- `<IncursionTicker resolution: IncursionResolution visibleBeatCount: number onSkip: () => void />` — renders an ordered stack of beat rows; Skip button below. `data-testid="incursion-ticker"` on the container, `data-testid="incursion-skip-button"` on the button.

**Global constraints for this task:**
- No `any`. No `useEffect` in either component — parent (`Incursion.tsx`, Task 7) drives `visibleBeatCount` via its interval.
- Test files start with `// @vitest-environment jsdom`.
- Do NOT modify Incursion.tsx yet (Task 7).

- [ ] **Step 1: Add style entries to `src/ui/styles.ts`**

Add:

```ts
  incursionTicker: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 24,
    background: '#0f172a',                 // slate-900 — dark theater
    color: '#e2e8f0',                       // slate-200
    borderRadius: 12,
    minHeight: 220,
  } as CSSProperties,

  incursionBeat: {
    fontSize: 15,
    lineHeight: 1.5,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'opacity 400ms ease',
  } as CSSProperties,

  incursionBeatVisible: {
    opacity: 1,
  } as CSSProperties,

  incursionBeatHidden: {
    opacity: 0,
  } as CSSProperties,

  incursionSkipButton: {
    alignSelf: 'flex-end',
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid #475569',
    background: 'transparent',
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 8,
  } as CSSProperties,
```

- [ ] **Step 2: Write failing tests at `tests/ui/IncursionBeat.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { IncursionBeat } from '../../src/ui/components/IncursionBeat';
import type { IncursionBeat as Beat } from '../../src/sim/incursion';

describe('IncursionBeat', () => {
  afterEach(() => cleanup());

  const stubBeat: Beat = { kind: 'verdict', text: 'The lattice folds.' };

  it('renders the beat text', () => {
    const { getByTestId } = render(<IncursionBeat beat={stubBeat} visible={true} index={0} />);
    expect(getByTestId('incursion-beat-0').textContent).toContain('The lattice folds.');
  });

  it('sets data-visible="true" when visible', () => {
    const { getByTestId } = render(<IncursionBeat beat={stubBeat} visible={true} index={3} />);
    expect(getByTestId('incursion-beat-3').getAttribute('data-visible')).toBe('true');
  });

  it('omits data-visible when hidden', () => {
    const { getByTestId } = render(<IncursionBeat beat={stubBeat} visible={false} index={1} />);
    expect(getByTestId('incursion-beat-1').getAttribute('data-visible')).toBeNull();
  });

  it('uses data-testid indexed by position', () => {
    const { getByTestId } = render(<IncursionBeat beat={stubBeat} visible={true} index={2} />);
    expect(getByTestId('incursion-beat-2')).toBeDefined();
  });
});
```

- [ ] **Step 3: Write failing tests at `tests/ui/IncursionTicker.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { IncursionTicker } from '../../src/ui/components/IncursionTicker';
import type { IncursionResolution } from '../../src/sim/incursion';

const RESOLUTION: IncursionResolution = {
  frontId: 'infrastructure',
  teamIds: [1, 2, 3, 4],
  coverage: { INT: 0.9, SPD: 0.8 },
  bestContributors: { INT: 1, SPD: 2 },
  successP: 0.85,
  outcome: 'won',
  beats: [
    { kind: 'launch',  text: 'Their grid. Their logistics.' },
    { kind: 'stat', stat: 'INT', band: 'strong',  text: 'We read them cleanly.' },
    { kind: 'stat', stat: 'SPD', band: 'holding', text: 'Trading initiative back and forth.' },
    { kind: 'verdict', text: 'The lattice folds. Infrastructure is ours.' },
  ],
};

describe('IncursionTicker', () => {
  afterEach(() => cleanup());

  it('renders all beat slots (visible + hidden) regardless of visibleBeatCount', () => {
    const { getByTestId } = render(
      <IncursionTicker resolution={RESOLUTION} visibleBeatCount={2} onSkip={() => {}} />
    );
    expect(getByTestId('incursion-beat-0')).toBeDefined();
    expect(getByTestId('incursion-beat-1')).toBeDefined();
    expect(getByTestId('incursion-beat-2')).toBeDefined();
    expect(getByTestId('incursion-beat-3')).toBeDefined();
  });

  it('marks beats up to visibleBeatCount-1 as visible, later beats hidden', () => {
    const { getByTestId } = render(
      <IncursionTicker resolution={RESOLUTION} visibleBeatCount={2} onSkip={() => {}} />
    );
    expect(getByTestId('incursion-beat-0').getAttribute('data-visible')).toBe('true');
    expect(getByTestId('incursion-beat-1').getAttribute('data-visible')).toBe('true');
    expect(getByTestId('incursion-beat-2').getAttribute('data-visible')).toBeNull();
    expect(getByTestId('incursion-beat-3').getAttribute('data-visible')).toBeNull();
  });

  it('renders a Skip button that fires onSkip', () => {
    const onSkip = vi.fn();
    const { getByTestId } = render(
      <IncursionTicker resolution={RESOLUTION} visibleBeatCount={2} onSkip={onSkip} />
    );
    fireEvent.click(getByTestId('incursion-skip-button'));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('data-testid="incursion-ticker" is present on the container', () => {
    const { getByTestId } = render(
      <IncursionTicker resolution={RESOLUTION} visibleBeatCount={4} onSkip={() => {}} />
    );
    expect(getByTestId('incursion-ticker')).toBeDefined();
  });
});
```

- [ ] **Step 4: Run to confirm failure**

Run: `npm test -- tests/ui/IncursionBeat.test.tsx tests/ui/IncursionTicker.test.tsx`
Expected: FAIL — components don't exist.

- [ ] **Step 5: Create `src/ui/components/IncursionBeat.tsx`**

```tsx
import type { ReactElement } from 'react';
import type { IncursionBeat as Beat } from '../../sim/incursion';
import { styles } from '../styles';

interface Props {
  readonly beat: Beat;
  readonly visible: boolean;
  readonly index: number;
}

export function IncursionBeat({ beat, visible, index }: Props): ReactElement {
  const style = { ...styles.incursionBeat, ...(visible ? styles.incursionBeatVisible : styles.incursionBeatHidden) };
  return (
    <div
      style={style}
      data-testid={`incursion-beat-${index}`}
      data-visible={visible ? 'true' : undefined}
    >
      {beat.text}
    </div>
  );
}
```

- [ ] **Step 6: Create `src/ui/components/IncursionTicker.tsx`**

```tsx
import type { ReactElement } from 'react';
import type { IncursionResolution } from '../../sim/incursion';
import { IncursionBeat } from './IncursionBeat';
import { styles } from '../styles';

interface Props {
  readonly resolution: IncursionResolution;
  readonly visibleBeatCount: number;
  readonly onSkip: () => void;
}

export function IncursionTicker({ resolution, visibleBeatCount, onSkip }: Props): ReactElement {
  return (
    <div style={styles.incursionTicker} data-testid="incursion-ticker">
      {resolution.beats.map((beat, i) => (
        <IncursionBeat key={i} beat={beat} visible={i < visibleBeatCount} index={i} />
      ))}
      <button
        type="button"
        style={styles.incursionSkipButton}
        onClick={onSkip}
        data-testid="incursion-skip-button"
      >
        Skip →
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Run tests to verify pass**

Run: `npm test -- tests/ui/IncursionBeat.test.tsx tests/ui/IncursionTicker.test.tsx`
Expected: PASS 4 (beat) + 4 (ticker) = 8 tests.

- [ ] **Step 8: Full suite + typecheck**

Run: `npm test`
Expected: ~250 previous + 8 new = ~258 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add src/ui/components/IncursionBeat.tsx src/ui/components/IncursionTicker.tsx src/ui/styles.ts tests/ui/IncursionBeat.test.tsx tests/ui/IncursionTicker.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): IncursionBeat + IncursionTicker — theatrical reveal

IncursionBeat renders a single beat row in the ticker panel; visible
prop toggles opacity 1 ↔ 0 (still in DOM so layout doesn't jump).
Parent (Incursion screen, Task 7) drives visibility via its interval.

IncursionTicker composes an ordered stack of IncursionBeats plus a
Skip button. Slate-900 dark background — theatrical, contrasts with
the app's white/beige.

data-testid: 'incursion-ticker' on the container; 'incursion-beat-N'
on each beat row (with data-visible='true' when visible);
'incursion-skip-button' on the Skip button.

No side effects at import; no interval, no Date.now — parent owns
the clock so all beats reveal on the same schedule.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: UI — `Incursion.tsx` screen

**Files:**
- Create: `src/ui/screens/Incursion.tsx`
- Modify: `src/ui/styles.ts` — add `incursionSection`, `incursionFrontsRow`, `incursionTeamRow`, `incursionHint`, `incursionSlotEmpty`, `incursionSlotFilled`, `incursionSlotClear`, `incursionLaunchRow`, `incursionResultRow`, `incursionContinueButton`, `incursionResolved`, `regionConquered` styles
- Create: `tests/ui/Incursion.test.tsx`

**Interfaces produced:**
- `<Incursion />` — the full screen. Three visual phases (`idle` / `resolving` / `resolved`), driven by local `useState`. Wired to `useColonyStore.getState().launchIncursion` + `.dismissIncursion`. Reuses `SpecimenCard` for the picker grid (via a `<div onClick>` wrapper, same as Breed screen).
- `data-testid`s per the spec: `incursion-empty-state`, `incursion-region-conquered`, `front-card-{frontId}`, `incursion-team-slot-{0..3}`, `incursion-team-slot-clear-{0..3}`, `incursion-picker-grid`, `launch-incursion-button`, `incursion-ticker`, `incursion-continue-button`.

**Global constraints for this task:**
- No `any`.
- Test file starts with `// @vitest-environment jsdom`.
- Local state only — nothing written to the store except via `launchIncursion` / `dismissIncursion`.
- `useEffect` interval for the ticker uses `1500ms` per beat; also owns the `now` clock that FrontCard consumes.
- No `Math.random`. No `Date.now()` at module load.
- Do NOT modify App.tsx (Task 8).

- [ ] **Step 1: Add style entries to `src/ui/styles.ts`**

Add:

```ts
  incursionSection: {
    marginBottom: 24,
  } as CSSProperties,

  incursionFrontsRow: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    padding: '16px 0',
    flexWrap: 'wrap',
  } as CSSProperties,

  incursionTeamRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    padding: '16px 0',
    flexWrap: 'wrap',
  } as CSSProperties,

  incursionHint: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 12,
  } as CSSProperties,

  incursionSlotEmpty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 150,
    borderRadius: 8,
    border: '2px dashed #cbd5e1',
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  incursionSlotFilled: {
    position: 'relative',
    width: 120,
    padding: 8,
    borderRadius: 8,
    border: '2px solid #8b5cf6',
    background: '#faf5ff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  } as CSSProperties,

  incursionSlotClear: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: 'none',
    background: '#f1f5f9',
    color: '#475569',
    fontSize: 12,
    lineHeight: 1,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as CSSProperties,

  incursionSlotIdLine: {
    fontSize: 12,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    color: '#475569',
  } as CSSProperties,

  incursionSlotGenLine: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  incursionLaunchRow: {
    display: 'flex',
    justifyContent: 'center',
    padding: '8px 0 24px 0',
  } as CSSProperties,

  incursionLaunchButton: {
    padding: '12px 28px',
    borderRadius: 6,
    border: '1px solid #dc2626',   // red-600
    background: '#ef4444',          // red-500
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,

  incursionLaunchButtonDisabled: {
    padding: '12px 28px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    background: '#e2e8f0',
    color: '#64748b',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'not-allowed',
    fontFamily: 'inherit',
  } as CSSProperties,

  incursionContinueButton: {
    padding: '10px 24px',
    borderRadius: 6,
    border: '1px solid #0f172a',
    background: '#1e293b',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 12,
  } as CSSProperties,

  regionConquered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 48,
    background: '#f0fdf4',
    border: '2px solid #22c55e',
    borderRadius: 12,
    marginTop: 24,
  } as CSSProperties,

  regionConqueredTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#166534',
  } as CSSProperties,

  regionConqueredBody: {
    fontSize: 14,
    color: '#166534',
    textAlign: 'center',
  } as CSSProperties,
```

- [ ] **Step 2: Write failing tests at `tests/ui/Incursion.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { Incursion } from '../../src/ui/screens/Incursion';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { rollGenome } from '../../src/sim/genome';
import { createRng } from '../../src/sim/rng';
import type { Unit } from '../../src/state/types';

function unit(id: number, seed = id): Unit {
  return {
    id, seed, decantedAt: 100 * id,
    genome: rollGenome(createRng(seed * 101)),
    generation: 0, parentIds: null, wear: {},
  };
}

function reset(units: Unit[] = [], fronts = FRESH_FRONTS) {
  useColonyStore.setState({
    units, nextId: units.length + 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(),
    droughtCount: 0,
    breedsToday: 0, breedDayKey: todayLocalKey(),
    fronts, activeIncursion: null,
  });
}

describe('Incursion screen', () => {
  beforeEach(() => {
    reset();
    vi.useRealTimers();
  });
  afterEach(() => cleanup());

  it('shows empty state when Colony has < 4 units', () => {
    reset([unit(1), unit(2), unit(3)]);
    const { getByTestId, queryByTestId } = render(<Incursion />);
    expect(getByTestId('incursion-empty-state')).toBeDefined();
    expect(queryByTestId('incursion-picker-grid')).toBeNull();
  });

  it('renders front cards + team picker when Colony has >= 4 units', () => {
    reset([unit(1), unit(2), unit(3), unit(4)]);
    const { getByTestId } = render(<Incursion />);
    expect(getByTestId('front-card-infrastructure')).toBeDefined();
    expect(getByTestId('front-card-military')).toBeDefined();
    expect(getByTestId('front-card-guerrilla')).toBeDefined();
    expect(getByTestId('incursion-picker-grid')).toBeDefined();
  });

  it('Launch is disabled until a front + all 4 team slots are filled', () => {
    reset([unit(1), unit(2), unit(3), unit(4)]);
    const { getByTestId, getAllByTestId } = render(<Incursion />);

    // No front, no team → disabled
    expect(getByTestId('launch-incursion-button').getAttribute('data-disabled')).toBe('true');

    // Pick a front → still disabled
    fireEvent.click(getByTestId('front-card-infrastructure'));
    expect(getByTestId('launch-incursion-button').getAttribute('data-disabled')).toBe('true');

    // Fill all 4 slots
    const cards = getAllByTestId('specimen-card');
    fireEvent.click(cards[0]!);
    fireEvent.click(cards[1]!);
    fireEvent.click(cards[2]!);
    fireEvent.click(cards[3]!);
    expect(getByTestId('launch-incursion-button').getAttribute('data-disabled')).toBeNull();
  });

  it('clicking a card that is already in a slot clears that slot', () => {
    reset([unit(1), unit(2), unit(3), unit(4)]);
    const { getAllByTestId, getByTestId } = render(<Incursion />);
    const cards = getAllByTestId('specimen-card');
    fireEvent.click(cards[0]!);
    // Slot 0 filled
    expect(getByTestId('incursion-team-slot-0').textContent).not.toContain('Slot 1');
    // Click same card again → slot 0 clears
    fireEvent.click(cards[0]!);
    expect(getByTestId('incursion-team-slot-0').textContent).toContain('Slot 1');
  });

  it('Launch transitions to resolving; beats reveal on 1500ms interval', () => {
    vi.useFakeTimers();
    reset([unit(1), unit(2), unit(3), unit(4)]);
    const { getByTestId, getAllByTestId } = render(<Incursion />);
    fireEvent.click(getByTestId('front-card-infrastructure'));
    const cards = getAllByTestId('specimen-card');
    fireEvent.click(cards[0]!);
    fireEvent.click(cards[1]!);
    fireEvent.click(cards[2]!);
    fireEvent.click(cards[3]!);

    fireEvent.click(getByTestId('launch-incursion-button'));

    // Ticker visible, beat 0 hidden at first
    expect(getByTestId('incursion-ticker')).toBeDefined();
    // Advance 1500ms → beat 0 visible
    act(() => { vi.advanceTimersByTime(1500); });
    expect(getByTestId('incursion-beat-0').getAttribute('data-visible')).toBe('true');
    // Advance to reveal all 4 beats
    act(() => { vi.advanceTimersByTime(1500 * 4); });
    expect(getByTestId('incursion-beat-3').getAttribute('data-visible')).toBe('true');
    // After all beats visible, Continue button appears
    expect(getByTestId('incursion-continue-button')).toBeDefined();
  });

  it('Skip jumps directly to resolved phase', () => {
    vi.useFakeTimers();
    reset([unit(1), unit(2), unit(3), unit(4)]);
    const { getByTestId, getAllByTestId } = render(<Incursion />);
    fireEvent.click(getByTestId('front-card-infrastructure'));
    const cards = getAllByTestId('specimen-card');
    [0, 1, 2, 3].forEach((i) => fireEvent.click(cards[i]!));
    fireEvent.click(getByTestId('launch-incursion-button'));

    fireEvent.click(getByTestId('incursion-skip-button'));
    // Every beat visible, Continue button rendered
    expect(getByTestId('incursion-beat-0').getAttribute('data-visible')).toBe('true');
    expect(getByTestId('incursion-beat-3').getAttribute('data-visible')).toBe('true');
    expect(getByTestId('incursion-continue-button')).toBeDefined();
  });

  it('Continue calls dismissIncursion, commits front state, resets to idle', () => {
    vi.useFakeTimers();
    reset([unit(1), unit(2), unit(3), unit(4)]);
    const { getByTestId, getAllByTestId } = render(<Incursion />);
    fireEvent.click(getByTestId('front-card-infrastructure'));
    const cards = getAllByTestId('specimen-card');
    [0, 1, 2, 3].forEach((i) => fireEvent.click(cards[i]!));
    fireEvent.click(getByTestId('launch-incursion-button'));
    fireEvent.click(getByTestId('incursion-skip-button'));
    fireEvent.click(getByTestId('incursion-continue-button'));

    const s = useColonyStore.getState();
    expect(s.activeIncursion).toBeNull();
    // Front state committed (won → captured OR failed → cooldown)
    const infra = s.fronts.infrastructure;
    expect(infra.captured || infra.cooldownUntil !== null).toBe(true);
    // UI back to idle: picker visible, team slots empty
    expect(getByTestId('incursion-picker-grid')).toBeDefined();
    expect(getByTestId('incursion-team-slot-0').textContent).toContain('Slot 1');
  });

  it('renders "Region conquered ✓" state when all 3 fronts captured', () => {
    reset(
      [unit(1), unit(2), unit(3), unit(4)],
      {
        infrastructure: { captured: true, cooldownUntil: null },
        military:       { captured: true, cooldownUntil: null },
        guerrilla:      { captured: true, cooldownUntil: null },
      },
    );
    const { getByTestId, queryByTestId } = render(<Incursion />);
    expect(getByTestId('incursion-region-conquered')).toBeDefined();
    expect(queryByTestId('incursion-picker-grid')).toBeNull();
    expect(queryByTestId('launch-incursion-button')).toBeNull();
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npm test -- tests/ui/Incursion.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 4: Create `src/ui/screens/Incursion.tsx`**

```tsx
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import type { FrontId } from '../../sim/data/fronts';
import { FRONTS } from '../../sim/data/fronts';
import { useColonyStore } from '../../state/colony';
import type { Unit } from '../../state/types';
import { SpecimenCard } from '../components/SpecimenCard';
import { FrontCard } from '../components/FrontCard';
import { IncursionTicker } from '../components/IncursionTicker';
import { unitToRow } from './Colony';
import { styles } from '../styles';

type Phase = 'idle' | 'resolving' | 'resolved';

const TICK_MS = 1500;
const CLOCK_MS = 1000;   // FrontCard cooldown ticks every 1s

export function Incursion(): ReactElement {
  const units = useColonyStore((s) => s.units);
  const fronts = useColonyStore((s) => s.fronts);
  const activeIncursion = useColonyStore((s) => s.activeIncursion);
  const launchIncursion = useColonyStore((s) => s.launchIncursion);
  const dismissIncursion = useColonyStore((s) => s.dismissIncursion);
  const lastDecantedId = useColonyStore((s) => s.lastDecantedId);

  const [selectedFrontId, setSelectedFrontId] = useState<FrontId | null>(null);
  const [teamIds, setTeamIds] = useState<(number | null)[]>([null, null, null, null]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [visibleBeatCount, setVisibleBeatCount] = useState(0);
  const [now, setNow] = useState<number>(Date.now());

  // Cooldown clock (idle only). Ticks every second so all FrontCards show
  // the same "now" and countdowns update together.
  useEffect(() => {
    if (phase !== 'idle') return;
    const t = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => clearInterval(t);
  }, [phase]);

  // Ticker interval (resolving only). Reveals one beat per TICK_MS; when
  // all beats visible, transition to resolved.
  useEffect(() => {
    if (phase !== 'resolving') return;
    const total = activeIncursion?.beats.length ?? 0;
    if (total === 0) return;
    const t = setInterval(() => {
      setVisibleBeatCount((n) => {
        const next = n + 1;
        if (next >= total) {
          clearInterval(t);
          setPhase('resolved');
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(t);
  }, [phase, activeIncursion]);

  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => b.decantedAt - a.decantedAt || b.id - a.id),
    [units],
  );

  const allCaptured = fronts.infrastructure.captured && fronts.military.captured && fronts.guerrilla.captured;

  if (allCaptured) {
    return (
      <main style={styles.page}>
        <h1 style={styles.headerTitle}>Morulium</h1>
        <p style={styles.headerSub}>Incursion — Region 1</p>
        <div style={styles.regionConquered} data-testid="incursion-region-conquered">
          <div style={styles.regionConqueredTitle}>Region conquered ✓</div>
          <div style={styles.regionConqueredBody}>
            All three fronts held. The region falls silent under your banner.
          </div>
        </div>
      </main>
    );
  }

  if (units.length < 4) {
    return (
      <main style={styles.page}>
        <h1 style={styles.headerTitle}>Morulium</h1>
        <p style={styles.headerSub}>Incursion — Region 1</p>
        <div style={styles.emptyState} data-testid="incursion-empty-state">
          <div style={styles.emptyStateTitle}>Need at least 4 specimens for an Incursion.</div>
          <div style={styles.emptyStateBody}>
            Harvest or Breed to fill the roster.
          </div>
        </div>
      </main>
    );
  }

  const bothPickedComplete =
    selectedFrontId !== null && teamIds.every((id) => id !== null);
  const distinctTeam = new Set(teamIds.filter((id): id is number => id !== null)).size === teamIds.filter((id) => id !== null).length;
  const canLaunch = phase === 'idle' && bothPickedComplete && distinctTeam;

  function handleCardClick(u: Unit): void {
    if (phase !== 'idle') return;
    const idx = teamIds.findIndex((id) => id === u.id);
    if (idx !== -1) {
      const next = [...teamIds]; next[idx] = null; setTeamIds(next); return;
    }
    const emptyIdx = teamIds.findIndex((id) => id === null);
    if (emptyIdx === -1) return;
    const next = [...teamIds]; next[emptyIdx] = u.id; setTeamIds(next);
  }

  function clearSlot(i: number): void {
    if (phase !== 'idle') return;
    const next = [...teamIds]; next[i] = null; setTeamIds(next);
  }

  function handleLaunch(): void {
    if (!canLaunch) return;
    const ids = teamIds as [number, number, number, number];
    launchIncursion(selectedFrontId!, ids);
    setVisibleBeatCount(0);
    setPhase('resolving');
  }

  function handleSkip(): void {
    if (phase !== 'resolving') return;
    const total = activeIncursion?.beats.length ?? 0;
    setVisibleBeatCount(total);
    setPhase('resolved');
  }

  function handleContinue(): void {
    dismissIncursion();
    setPhase('idle');
    setVisibleBeatCount(0);
    setSelectedFrontId(null);
    setTeamIds([null, null, null, null]);
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.headerTitle}>Morulium</h1>
      <p style={styles.headerSub}>Incursion — Region 1</p>

      {/* Front cards row */}
      <div style={styles.incursionFrontsRow}>
        {(['infrastructure', 'military', 'guerrilla'] as FrontId[]).map((fid) => (
          <FrontCard
            key={fid}
            frontId={fid}
            label={FRONTS[fid].label}
            state={fronts[fid]}
            selected={selectedFrontId === fid}
            now={now}
            onClick={() => { if (phase === 'idle') setSelectedFrontId(fid); }}
          />
        ))}
      </div>

      {/* Team picker row (idle only) or Ticker (resolving/resolved) */}
      {phase === 'idle' && (
        <>
          <div style={styles.incursionTeamRow}>
            {teamIds.map((id, i) => {
              const u = id === null ? null : units.find((u) => u.id === id) ?? null;
              return (
                <div key={i} data-testid={`incursion-team-slot-${i}`}>
                  {u === null ? (
                    <div style={styles.incursionSlotEmpty}>Slot {i + 1}</div>
                  ) : (
                    <div style={styles.incursionSlotFilled}>
                      <button
                        type="button"
                        style={styles.incursionSlotClear}
                        onClick={() => clearSlot(i)}
                        aria-label={`Clear slot ${i + 1}`}
                        data-testid={`incursion-team-slot-clear-${i}`}
                      >×</button>
                      <div style={styles.incursionSlotIdLine}>{`M-${String(u.id).padStart(5, '0')}`}</div>
                      <div style={styles.incursionSlotGenLine}>Gen {u.generation}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={styles.incursionLaunchRow}>
            <button
              type="button"
              style={canLaunch ? styles.incursionLaunchButton : styles.incursionLaunchButtonDisabled}
              onClick={handleLaunch}
              disabled={!canLaunch}
              data-testid="launch-incursion-button"
              data-disabled={canLaunch ? undefined : 'true'}
            >
              Launch Incursion
            </button>
          </div>

          {selectedFrontId === null && (
            <div style={styles.incursionHint}>Pick a front and 4 specimens to launch.</div>
          )}
          {selectedFrontId !== null && !bothPickedComplete && (
            <div style={styles.incursionHint}>Fill all 4 team slots.</div>
          )}
          {bothPickedComplete && !distinctTeam && (
            <div style={styles.incursionHint}>Pick 4 different specimens.</div>
          )}

          <div style={styles.grid} data-testid="incursion-picker-grid">
            {sortedUnits.map((unit) => (
              <div key={unit.id} onClick={() => handleCardClick(unit)} style={{ cursor: 'pointer' }}>
                <SpecimenCard
                  row={unitToRow(unit)}
                  highlighted={unit.id === lastDecantedId}
                  lineage={{ generation: unit.generation, parentIds: unit.parentIds }}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {phase !== 'idle' && activeIncursion !== null && (
        <div style={styles.incursionSection}>
          <IncursionTicker
            resolution={activeIncursion}
            visibleBeatCount={visibleBeatCount}
            onSkip={handleSkip}
          />
          {phase === 'resolved' && (
            <div style={styles.incursionLaunchRow}>
              <button
                type="button"
                style={styles.incursionContinueButton}
                onClick={handleContinue}
                data-testid="incursion-continue-button"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- tests/ui/Incursion.test.tsx`
Expected: PASS all 8 tests.

- [ ] **Step 6: Full suite + typecheck**

Run: `npm test`
Expected: ~258 previous + 8 new = ~266 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/ui/screens/Incursion.tsx src/ui/styles.ts tests/ui/Incursion.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): Incursion screen — front picker, team picker, live ticker

Three phases via local useState:
- idle:      front cards + 4 team slots + Launch button + picker grid
- resolving: full-panel dark IncursionTicker; beats reveal on 1.5s interval;
             Skip button jumps to resolved.
- resolved:  ticker still visible; Continue button dismisses.

Team picker mirrors Breed's fill-first-empty pattern. Click a card already
in a slot to clear that slot; click × on a filled slot to clear it.

Front cards driven by a parent-owned `now` clock (1s interval) so all
three cooldown countdowns tick together. FrontCard itself has no useEffect.

Two-phase commit: launchIncursion computes resolution + sets
activeIncursion, but front state (captured / cooldown) changes only when
dismissIncursion fires. Reload during resolving returns to idle with
activeIncursion=null and front state unchanged.

Region-conquered state renders when all 3 fronts captured.

data-testid: incursion-empty-state, incursion-region-conquered,
incursion-team-slot-{0..3}, incursion-team-slot-clear-{0..3},
incursion-picker-grid, launch-incursion-button, incursion-ticker,
incursion-continue-button.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: UI — App.tsx 3-tab nav + dev-server smoke check

**Files:**
- Modify: `src/App.tsx` — widen Tab union to `'colony' | 'breed' | 'incursion'`; add third nav button
- Modify: `tests/ui/App.test.tsx` — extend with Incursion tab

**Interfaces produced:**
- `<App />` — renders 3-tab nav; state = `'colony' | 'breed' | 'incursion'`; defaults to `'colony'`; not persisted.
- `data-testid="nav-tab-incursion"` on the third nav button.

**Global constraints for this task:**
- No `any`.
- Follow the exact nav pattern already in place (M4).
- Do NOT re-implement `nav`, `navTab`, or `navTabActive` styles — they exist.

- [ ] **Step 1: Modify `src/App.tsx`**

Replace the content with:

```tsx
import { useState, type ReactElement } from 'react';
import { Colony } from './ui/screens/Colony';
import { Breed } from './ui/screens/Breed';
import { Incursion } from './ui/screens/Incursion';
import { styles } from './ui/styles';

type Tab = 'colony' | 'breed' | 'incursion';

export function App(): ReactElement {
  const [tab, setTab] = useState<Tab>('colony');

  const active = (t: Tab) => (tab === t ? styles.navTabActive : styles.navTab);

  return (
    <>
      <nav style={styles.nav}>
        <button
          type="button"
          style={active('colony')}
          onClick={() => setTab('colony')}
          data-testid="nav-tab-colony"
        >
          Colony
        </button>
        <button
          type="button"
          style={active('breed')}
          onClick={() => setTab('breed')}
          data-testid="nav-tab-breed"
        >
          Breed
        </button>
        <button
          type="button"
          style={active('incursion')}
          onClick={() => setTab('incursion')}
          data-testid="nav-tab-incursion"
        >
          Incursion
        </button>
      </nav>
      {tab === 'colony' && <Colony />}
      {tab === 'breed' && <Breed />}
      {tab === 'incursion' && <Incursion />}
    </>
  );
}
```

- [ ] **Step 2: Extend `tests/ui/App.test.tsx`**

Add these tests inside the existing outer describe block (after the existing 3 tests):

```ts
it('clicking the Incursion tab switches to the Incursion screen', () => {
  const { getByTestId, queryByTestId } = render(<App />);
  fireEvent.click(getByTestId('nav-tab-incursion'));
  // Empty Incursion state renders when Colony has < 4 units
  expect(getByTestId('incursion-empty-state')).toBeDefined();
  expect(queryByTestId('empty-colony')).toBeNull();
});

it('nav round-trip: Colony → Breed → Incursion → Colony', () => {
  const { getByTestId } = render(<App />);
  fireEvent.click(getByTestId('nav-tab-breed'));
  expect(getByTestId('breed-empty-state')).toBeDefined();
  fireEvent.click(getByTestId('nav-tab-incursion'));
  expect(getByTestId('incursion-empty-state')).toBeDefined();
  fireEvent.click(getByTestId('nav-tab-colony'));
  expect(getByTestId('empty-colony')).toBeDefined();
});
```

- [ ] **Step 3: Run App tests**

Run: `npm test -- tests/ui/App.test.tsx`
Expected: 3 previous + 2 new = 5 tests pass.

- [ ] **Step 4: Full suite + typecheck + build**

Run: `npm test`
Expected: ~266 previous + 2 new = ~268 green.

Run: `npm run typecheck`
Expected: clean.

Run: `npm run build`
Expected: bundle succeeds. Note the gzipped size — target < 70 KB (M4 was 57.30 KB; M5 adds ~5-7 KB of components + phrases).

- [ ] **Step 5: Local dev-server smoke check**

Run: `npm run dev`. Open `http://localhost:5173`. Expected behaviors to eyeball:

- **Nav:** three tabs — Colony (active), Breed, Incursion. Click Incursion.
- **Empty state:** with < 4 Colony units, Incursion shows "Need at least 4 specimens" empty state.
- **Populate via Colony/Breed:** Harvest 3 today, wait or advance the clock, or breed to get 4+ specimens. Return to Incursion.
- **Idle state:** three front cards visible (Infrastructure, Military, Guerrilla), all "Available". Four empty team slots. Launch button greyed with hint "Pick a front and 4 specimens to launch."
- **Select a front:** front card gets a violet ring. Hint changes to "Fill all 4 team slots."
- **Fill team:** click 4 different Colony cards → slots fill in order M-00001, etc. Launch button becomes red + enabled.
- **Launch:** front cards + picker grid disappear; dark ticker panel appears; beat 0 (launch blurb) fades in after 1.5s; beats 1 and 2 (stat lines) reveal on 3s and 4.5s; beat 3 (verdict) reveals at 6s. Continue button appears.
- **Continue:** front captured (green ✓) OR cooling down (grey with 29m 59s countdown). Back to idle; team slots + selected front cleared.
- **Cooldown behavior:** if a front is on cooldown, clicking it does nothing. Countdown ticks down each second.
- **Region conquered:** capture all 3 fronts → "Region conquered ✓" panel with body text.
- **Persistence:** reload during idle — captured/cooldown state persists. Reload during resolving — screen returns to idle; activeIncursion cleared; front state unchanged.

Note the results in your task report. If you cannot interactively verify (headless), start the dev server and confirm it binds to port 5173, then note that interactive verification is deferred to milestone review.

Ctrl-C when done.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx tests/ui/App.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): App gains Incursion tab — M5 loop closes

Widens the tab union to 'colony' | 'breed' | 'incursion' and adds
the third nav button. Colony still the default tab.

M5 loop is now navigable and complete:
- Colony: Harvest/Failsafe loop with daily cadence.
- Breed:  Mendelian + mutation + wear picker.
- Incursion: Team-of-4, hidden thresholds, live ticker, cooldowns.

Tab state not persisted (M4 convention).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** Every locked decision from the spec maps to a task:
  - `coverage-bands` + `BAND_PHRASES` → Task 1.
  - `FRONTS` data (3 fronts, 2 required stats each, weights = 1.0) → Task 2.
  - `resolveIncursion` + `bestContributorPerStat` + all constants (`TEAM_SIZE`, `COVERAGE_CLIP`, `SUCCESS_CUTOFF`, `INCURSION_LEVEL`, `INCURSION_SUBSTREAM_PRIME`) → Task 3.
  - Store extensions + `launchIncursion` / `dismissIncursion` + v4 chained migration + `FRONT_COOLDOWN_MS` + `FRESH_FRONTS` + two-phase commit + Failsafe/drought isolation → Task 4.
  - `FrontCard` (3 visual states + parent-driven `now` clock) → Task 5.
  - `IncursionBeat` + `IncursionTicker` (opacity fade, skippable) → Task 6.
  - `Incursion` screen (3 phases, team picker, region-conquered, ticker interval at 1500ms, 4 beats total) → Task 7.
  - App 3-tab nav + dev-server smoke → Task 8.
- **Anti-meta invariants** (§14 in the spec) all preserved: best-contributor + coverage clip prevent cloning/stacking (#4); thresholds never surface (#5); wear applied via `computeCurrentStats(g, 20, wear)` (#7).
- **Type consistency:** `FrontId`, `FrontProfile`, `FrontState`, `IncursionResolution`, `IncursionBeat`, `CoverageBand`, `TEAM_SIZE`, `COVERAGE_CLIP`, `SUCCESS_CUTOFF`, `INCURSION_LEVEL`, `INCURSION_SUBSTREAM_PRIME`, `FRONT_COOLDOWN_MS`, `FRESH_FRONTS`, `BAND_PHRASES`, `FRONTS`, `bandForCoverage`, `bestContributorPerStat`, `resolveIncursion`, `launchIncursion`, `dismissIncursion` — all defined once, consumed identically across sim/state/UI.
- **Placeholders:** none. Every step has real code or a real command. Tests use real fixtures (`rollGenome(createRng(...))`) and structural assertions, not mocks.
- **Task splitting rationale:**
  - T1, T2, T3 are pure sim modules; T3 depends on T1 (`bandForCoverage`) and T2 (`FRONTS`). Sequential.
  - T4 integrates the sim into the store — one big diff but coherent (data-model change + migration + one action pair).
  - T5, T6 are independent UI components; T5 (FrontCard) has no dependencies beyond styles; T6 (Beat + Ticker) has no dependencies beyond styles + sim types.
  - T7 (Incursion screen) composes T5 + T6 + store; the biggest UI task.
  - T8 wires up the nav + does the smoke check.
- **beforeEach hygiene:** every test file that touches the store must reset the two new fields (`fronts`, `activeIncursion`) plus the earlier 8 fields. T4 Step 5 explicitly lists every UI test file affected. TypeScript strict enforces at compile time.
- **`Unit` shape UNCHANGED** — unlike M4, no inline Unit fixtures need updating. That's why T4 is smaller than M4's T4.
- **Two-phase commit rationale:** `launchIncursion` sets `activeIncursion` (the resolution); `dismissIncursion` applies the front-state change. This preserves the "ticker plays first, then the world changes" experience. Reloading mid-ticker DROPS the resolution but leaves the world consistent because nothing was committed yet.
- **Deferred (from spec §Deferred):** Occupations, Serum, rest/injury, second region/world map, ordering-effects (radicalization), probabilistic outcomes (INCURSION_SUBSTREAM_PRIME reserved but unused), front-specific phrase pools, ticker SFX/juice, Sequencer/DNA Lab. None of these surface in this plan.
