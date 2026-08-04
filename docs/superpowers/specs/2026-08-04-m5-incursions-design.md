# Morulium — M5 Incursions & Fronts Design (v0.1)

**Date:** 2026-08-04
**Working directory:** `/Users/cnote/projects/morulium/`
**Remote:** `https://github.com/nicojitters/morulium` (public)
**Live:** `https://morulium.com` (Vercel, auto-deploys from main)
**Prior milestone:** M4 Breeding — merged. This spec covers **M5: Incursions & fronts** (game spec §9 + §10 in full for one region): a Team-of-4 combat loop with hidden per-stat thresholds, best-contributor resolve, weighted-geometric-mean coverage, a live-ticker reveal with qualitative bands, and per-front cooldowns on failure.

## Purpose

Open the first real gameplay loop. M1–M4 built the Colony (Harvest → Decant, daily cadence, Failsafe, Breeding with wear). M5 gives the player something to *do* with those units: assemble a team of 4, pick a front, and watch the resolution play out. Success captures the front (permanent for the region); failure locks that front for 30 minutes. When all three fronts are captured, the region is conquered.

M5 ships when: opening morulium.com and navigating to Incursion, picking a front + 4 team members, launching, and watching a 6–8s ticker of qualitative beats deliver a verdict; failing a front shows a live 30-minute cooldown countdown that persists across reloads; capturing all three fronts shows a "Region conquered ✓" state; nothing about Harvest/Failsafe/Breed changes.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | **One region, 3 fronts** (Infrastructure INT/SPD, Military PWR/VIT, Guerrilla GUI/SPD). Team-of-4 pickable from Colony. Deterministic outcome, live-ticker reveal. Failure cools that front for 30 min. | Matches the MVP design's M5 row and game spec §10's example front stat profiles. |
| Team size | **`TEAM_SIZE = 4`** | Game spec §9 `[CALIBRATING]` "cap ≈ 4". Big enough to cover 3 fronts' varied profiles; small enough to force rotation later. |
| Front unlock | **All 3 fronts unlocked from the start; player picks any order** | Simplest UX. Difficulty is shaped by hidden thresholds themselves. Ordering effects (game spec §10: "taking one radicalizes another") land in M6+ when Occupations arrive. |
| Failure teeth | **Per-front 30-min cooldown** — the failed front locks for `FRONT_COOLDOWN_MS`. Player can pivot to the other two fronts. | Real cost the player feels without needing M6 Serum/Injury systems. Persists across reloads. Uses the same date helpers as Harvest countdown. |
| Live ticker pacing | **~6–8s total, 4–6 punchy beats** (one per required stat + a final verdict); skip affordance available | Long enough to feel like drama; short enough to not tedium. Skippable so power-users aren't punished. |
| Front stat profile | **Exactly 2 required stats per front, each with `{ threshold, weight }`** | Matches spec example verbatim (Infra=INT/SPD etc.). Sparse map; non-required stats read as absent. |
| Resolution formula | **Weighted geometric mean of per-stat coverage ratios.** `coverage[s] = min(COVERAGE_CLIP, bestContrib[s] / threshold[s])`; `successP = Π (coverage[s] ^ weight[s])` | Weighted geo-mean naturally drags hard on shortfalls (spec §9: "shortfalls drag it down, a badly-uncovered stat drags hard"). Over-coverage on one stat can't fully compensate for a zero elsewhere. |
| Coverage clip | **`COVERAGE_CLIP = 1.2`** | Prevents monster stats from single-handedly dominating a front. Enforces invariant #4 (missions demand different profiles). |
| Outcome semantics | **Deterministic threshold: `successP >= SUCCESS_CUTOFF` → won, else failed.** `SUCCESS_CUTOFF = 0.85`. | Fully reproducible; hides the exact number from the UI (only qualitative bands surface). No RNG needed at M5. |
| Ticker verdict vocabulary | **Per-required-stat qualitative bands.** Each stat's coverage bucketed into 5 bands (`crushed`/`dangerouslySlow`/`holding`/`strong`/`overwhelming`). Phrases in `BAND_PHRASES: Record<Stat, Record<CoverageBand, string>>` — 25 authored strings total. Final beat = overall verdict. | Systematic, hides thresholds, extensible. Front-agnostic strings at first; per-front variants deferred. |
| Coverage band thresholds | `crushed` c < 0.5 · `dangerouslySlow` 0.5 ≤ c < 0.8 · `holding` 0.8 ≤ c < 1.0 · `strong` 1.0 ≤ c < 1.15 · `overwhelming` c ≥ 1.15 | Bands calibrated so `success_cutoff=0.85` roughly aligns with the `holding` band's upper edge (0.8+ per stat feels defensible). |
| Repeat captures | **One-shot: captured fronts stay captured, cannot be re-launched** | Cleanest M5 shape. Region-conquered state when all 3 done. M6+ Occupation garrisoning revisits this. |
| Team picker UX | **Row of 4 numbered slots + Colony grid below; fill-first-empty on card click; click-to-clear on filled slot's card OR its ×** | Consistent with Breed's ParentSlot pattern; same interaction vocabulary. |
| Region cooldown | **None** — launch back-to-back until region is captured or a specific front cools down | M5 has no rest/injury (M6). Per-front cooldown is the pacing mechanism. |
| Outcome timing | **`launchIncursion` records the resolution in transient `activeIncursion` state; `dismissIncursion` (called after the ticker) commits captured/cooldown state** | State changes land AFTER the reveal, so a captured checkmark doesn't flash the outcome early. Reloading during resolving DROPS the ticker (documented) — no half-transitions. |
| Persistence | **Bump `version: 4`, chain the migrate fn (v1→v2→v3→v4)** | Same convention as M3b, M4. Storage key stays `morulium/colony/v1`. |
| `activeIncursion` persistence | **Transient — omitted from `partialize`** | The ticker isn't resumable; on reload we return to the idle Incursion screen. Front state (captured/cooldown) persists because it was committed by `dismissIncursion`. |
| RNG substream | **Reserved `INCURSION_SUBSTREAM_PRIME = 1_000_099`** but NOT USED in M5 (resolution is deterministic). Ready for M6+ probabilistic elements. | Distinct from FAILSAFE (1_000_003) and BREED (1_000_033). |
| Failsafe / drought interaction | **`launchIncursion` does NOT touch `droughtCount`, `harvestsToday`, or `breedsToday`** | Each loop stays isolated. |
| Nav | **Widen `Tab` to `'colony' \| 'breed' \| 'incursion'`** in `src/App.tsx`; add third nav button | Same in-app tab pattern. React Router still deferred (M6+ can revisit). |

## Anti-meta invariant check (game spec §14)

Every M5 addition preserves the invariants:

1. **Every gain has a cost** — untouched (M5 doesn't touch genome or stats mechanics).
2. **No master stat** — untouched.
3. **Abilities compete** — untouched.
4. **Missions demand different profiles** — **enforced.** Each front has 2 required stats; coverage clipped at 1.2 prevents one monster stat from carrying everything; weighted geo-mean tanks on zero-coverage; and best-contributor-per-stat prevents team-cloning (can't stack four PWR bodies to win Guerrilla).
5. **Information is hidden** — **enforced.** Thresholds live in `FRONTS` data, never returned to the UI. Only qualitative bands ever cross the module boundary into the ticker text.
6. **Rest forces rotation** — untouched (rest is M6). But the per-front cooldown gives a taste of the rotation pressure: failing Guerrilla forces you to attack Infrastructure/Military for the next 30 min.
7. **Convergence is taxed** — M4's wear applies via `computeCurrentStats(unit.genome, 20, unit.wear)` when computing best-contributor stats; heavily-bred units contribute degraded values. Invariant continues to hold.
8. **Rarity ≠ power** — untouched.
9. **The tail is aberration-driven** — untouched.

## Data model

**New types (`src/sim/incursion.ts` unless noted):**

```ts
export type FrontId = 'infrastructure' | 'military' | 'guerrilla';

export type CoverageBand = 'crushed' | 'dangerouslySlow' | 'holding' | 'strong' | 'overwhelming';

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

export interface IncursionBeat {
  readonly kind: 'launch' | 'stat' | 'verdict';
  readonly stat?: Stat;                        // present iff kind === 'stat'
  readonly band?: CoverageBand;                // present iff kind === 'stat'
  readonly text: string;                       // pre-rendered qualitative phrase
}

export interface IncursionResolution {
  readonly frontId: FrontId;
  readonly teamIds: readonly [number, number, number, number];
  readonly coverage: Readonly<Partial<Record<Stat, number>>>;
  readonly bestContributors: Readonly<Partial<Record<Stat, number>>>;
  readonly successP: number;
  readonly outcome: 'won' | 'failed';
  readonly beats: readonly IncursionBeat[];
}

export interface FrontState {
  readonly captured: boolean;
  readonly cooldownUntil: number | null;
}
```

**Colony store shape after M5** (extending M4):

```ts
interface ColonyStore {
  // ... existing (M3a/M3b/M4)

  // NEW in M5 (persisted):
  fronts: Readonly<Record<FrontId, FrontState>>;

  // NEW in M5 (transient):
  activeIncursion: IncursionResolution | null;

  // actions unchanged plus:
  launchIncursion: (frontId: FrontId, teamIds: readonly [number, number, number, number]) => IncursionResolution;
  dismissIncursion: () => void;
}
```

## Sim modules

### `src/sim/incursion.ts`

**Constants:**
```ts
export const TEAM_SIZE = 4 as const;
export const COVERAGE_CLIP = 1.2 as const;
export const SUCCESS_CUTOFF = 0.85 as const;
export const INCURSION_LEVEL = 20 as const;   // fixed level for stat computation in M5
export const INCURSION_SUBSTREAM_PRIME = 1_000_099 as const;   // reserved for M6+
```

**Functions:**

```ts
export function bestContributorPerStat(
  team: readonly Unit[],
  requiredStats: readonly Stat[],
): Readonly<Partial<Record<Stat, { unitId: number; value: number }>>>;
```
For each `s` in `requiredStats`, iterate the team, compute `computeCurrentStats(unit.genome, INCURSION_LEVEL, unit.wear)[s]`, take the max. Return the winner's id + value per stat. Ties break to the earlier team-list index (stable).

```ts
export function resolveIncursion(team: readonly Unit[], front: FrontProfile): IncursionResolution;
```
Steps:
1. Extract `requiredStats` = keys of `front.requirements` where value is defined.
2. Guard: `team.length === TEAM_SIZE` (throw otherwise — defense in depth; UI enforces).
3. `bests = bestContributorPerStat(team, requiredStats)`.
4. For each required stat: `coverage[s] = Math.min(COVERAGE_CLIP, bests[s].value / front.requirements[s].threshold)`. Handle threshold=0 defensively (return coverage=COVERAGE_CLIP if best.value>0, else 0).
5. `successP = requiredStats.reduce((acc, s) => acc * (coverage[s] ** front.requirements[s].weight), 1)`.
6. `outcome = successP >= SUCCESS_CUTOFF ? 'won' : 'failed'`.
7. Build `beats`, in this canonical order:
   - Beat 0: `{ kind: 'launch', text: front.flavor.launchBlurb }` — scene-setter shown first.
   - Beat 1..N: one per required stat, in `Object.keys(front.requirements)` iteration order (stable, deterministic). Each: `{ kind: 'stat', stat, band: bandForCoverage(coverage[s]), text: BAND_PHRASES[s][band] }`.
   - Beat N+1: `{ kind: 'verdict', text: outcome === 'won' ? front.flavor.winBlurb : front.flavor.failBlurb }`.
   For a 2-required-stat front (all three M5 fronts), this yields exactly 4 beats.
8. Return `{ frontId, teamIds, coverage, bestContributors, successP, outcome, beats }`.

Pure and deterministic — same team + same front → identical resolution. No RNG in M5.

### `src/sim/coverage-bands.ts`

```ts
export function bandForCoverage(c: number): CoverageBand {
  if (c < 0.5) return 'crushed';
  if (c < 0.8) return 'dangerouslySlow';
  if (c < 1.0) return 'holding';
  if (c < 1.15) return 'strong';
  return 'overwhelming';
}

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

Copy tone: cultivation/lab vs conquest/military registers per game spec §1. Ticker beats live on the conquest side (villain-invasion voice), sparse and terse.

### `src/sim/data/fronts.ts`

```ts
export const FRONTS: Readonly<Record<FrontId, FrontProfile>> = {
  infrastructure: {
    id: 'infrastructure',
    label: 'Infrastructure',
    // [CALIBRATING] — thresholds tuned by playtest; middling Colony team of 4 should carry ~2 of 3 fronts
    requirements: {
      INT: { threshold: 22, weight: 0.6 },
      SPD: { threshold: 18, weight: 0.4 },
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
      PWR: { threshold: 22, weight: 0.6 },
      VIT: { threshold: 20, weight: 0.4 },
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
      GUI: { threshold: 22, weight: 0.6 },
      SPD: { threshold: 18, weight: 0.4 },
    },
    flavor: {
      launchBlurb: 'A war of alleys and shadows. Reflex and cunning.',
      winBlurb:    'The cells scatter, silent. Guerrilla is ours.',
      failBlurb:   'They know every backstreet. We are pushed back.',
    },
  },
};
```

Threshold numbers seeded from M1 verify-tool distributions (median stat for a level-20 middling-Colony unit is ~18–22 in its favored stat). All marked `[CALIBRATING]`; the M5 tuning pass may retune based on 20-Incursion playtests.

## State module additions

### `src/state/colony.ts` (extensions)

**Initial state additions:**
```ts
fronts: {
  infrastructure: { captured: false, cooldownUntil: null },
  military:       { captured: false, cooldownUntil: null },
  guerrilla:      { captured: false, cooldownUntil: null },
},
activeIncursion: null,
```

**Constants added (in `src/state/incursion.ts`, sibling module for parity with harvest/breed/failsafe):**
```ts
export const FRONT_COOLDOWN_MS = 30 * 60 * 1000;   // 30 minutes
```

**`launchIncursion` logic:**
```ts
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
  const uniqueIds = new Set(teamIds);
  if (uniqueIds.size !== TEAM_SIZE) {
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
```

**`dismissIncursion` logic:**
```ts
dismissIncursion: () => {
  const state = get();
  const r = state.activeIncursion;
  if (r === null) return;
  const nextFronts = { ...state.fronts };
  const target = { ...state.fronts[r.frontId] };
  if (r.outcome === 'won') {
    target.captured = true;
    target.cooldownUntil = null;
  } else {
    target.cooldownUntil = Date.now() + FRONT_COOLDOWN_MS;
  }
  nextFronts[r.frontId] = target;
  set({ fronts: nextFronts, activeIncursion: null });
},
```

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
  // activeIncursion is transient
}),
```

**Migration v4:**
```ts
version: 4,
migrate: (state, from) => {
  let s = state as ColonyStore;
  if (from < 2) { /* M3b branch */ }
  if (from < 3) { /* M4 branch */ }
  if (from < 4) {
    s = {
      ...s,
      fronts: {
        infrastructure: { captured: false, cooldownUntil: null },
        military:       { captured: false, cooldownUntil: null },
        guerrilla:      { captured: false, cooldownUntil: null },
      },
    };
  }
  return s;
},
```

Chained `if`s, not `else if` — a v1 save cascades cleanly through all three branches.

## UI

### `src/ui/screens/Incursion.tsx`

Three visual phases via local `useState`:

- **`idle`** — front cards row + team picker + Launch button.
- **`resolving`** — ticker panel replaces the picker area; beats reveal on a 1500ms interval (4 beats × 1.5s = 6s total for a 2-stat front); Skip button available.
- **`resolved`** — full ticker visible with result; Continue button commits `dismissIncursion` and returns to `idle`.

**Local state** (not persisted):
```ts
const [selectedFrontId, setSelectedFrontId] = useState<FrontId | null>(null);
const [teamIds, setTeamIds] = useState<(number | null)[]>([null, null, null, null]);
const [phase, setPhase] = useState<'idle' | 'resolving' | 'resolved'>('idle');
const [visibleBeatCount, setVisibleBeatCount] = useState(0);
```

**Empty state:** if `units.length < TEAM_SIZE`, render a message ("Need at least 4 specimens for an Incursion. Harvest or Breed to fill the roster.") — no picker.

**Region-conquered state:** if all 3 fronts are `captured`, render a "Region conquered ✓" panel. No launch actions.

**Launch handler:**
```ts
function handleLaunch(): void {
  if (selectedFrontId === null) return;
  if (teamIds.some((id) => id === null)) return;
  const ids = teamIds as [number, number, number, number];
  useColonyStore.getState().launchIncursion(selectedFrontId, ids);
  setPhase('resolving');
  setVisibleBeatCount(0);
}
```

**Ticker interval:**
```ts
useEffect(() => {
  if (phase !== 'resolving') return;
  const active = useColonyStore.getState().activeIncursion;
  if (!active) return;
  const t = setInterval(() => {
    setVisibleBeatCount((n) => {
      const next = n + 1;
      if (next >= active.beats.length) {
        clearInterval(t);
        setPhase('resolved');
      }
      return next;
    });
  }, 1500);
  return () => clearInterval(t);
}, [phase]);
```

**Skip handler:** in `resolving`, sets `visibleBeatCount` to `beats.length` and `phase='resolved'`.

**Continue handler:** in `resolved`, calls `dismissIncursion()`, resets `selectedFrontId=null`, `teamIds=[null,null,null,null]`, `phase='idle'`, `visibleBeatCount=0`.

**Card click → team picker (identical to Breed's pattern):**
```ts
function handleCardClick(unit: Unit): void {
  if (phase !== 'idle') return;
  const idx = teamIds.findIndex((id) => id === unit.id);
  if (idx !== -1) {
    // Already selected → clear that slot
    const next = [...teamIds];
    next[idx] = null;
    setTeamIds(next);
    return;
  }
  const emptyIdx = teamIds.findIndex((id) => id === null);
  if (emptyIdx === -1) return;   // all four slots full
  const next = [...teamIds];
  next[emptyIdx] = unit.id;
  setTeamIds(next);
}
```

### New components

**`src/ui/components/FrontCard.tsx`** — Props: `frontId, state, selected, onClick, cooldownLabel`. Renders label + status pill:
- Available: violet border on hover, click selects.
- Selected: violet ring around the card.
- Cooldown: greyed, shows `"Cooling down · Xm Ys"` (60s tick).
- Captured: green ✓ badge, unclickable.

**`src/ui/components/IncursionBeat.tsx`** — Props: `beat, visible`. Renders `beat.text` with a fade-in when `visible=true`; hidden (opacity 0 or absent from DOM) when false.

**`src/ui/components/IncursionTicker.tsx`** — Props: `resolution, visibleBeatCount, onSkip`. Renders beats up to `visibleBeatCount` via `IncursionBeat`, plus a Skip button.

**`data-testid`s:**
- `incursion-empty-state`
- `incursion-region-conquered`
- `front-card-infrastructure` / `-military` / `-guerrilla`
- `front-card-status-<frontId>` — child span holding the status text (Available/Cooldown/Captured)
- `incursion-team-slot-{0..3}`
- `incursion-team-slot-clear-{0..3}`
- `incursion-picker-grid`
- `launch-incursion-button`
- `incursion-ticker`
- `incursion-beat-{index}`
- `incursion-skip-button`
- `incursion-continue-button`

### `src/App.tsx` nav

Widen the tab union to `'colony' | 'breed' | 'incursion'`. Add a third nav button `data-testid="nav-tab-incursion"` with label "Incursion". Same active-tab underline pattern.

## Testing plan

**Sim:**
- `tests/sim/coverage-bands.test.ts` — band boundaries (0.5/0.8/1.0/1.15); BAND_PHRASES completeness.
- `tests/sim/incursion.test.ts` — `bestContributorPerStat` picks max (not sum, ties stable), `resolveIncursion` determinism, coverage clip at 1.2, `successP` boundary flip at cutoff, zero-coverage → failed, beats canonical order (launch → stats in requirement order → verdict) and length (`1 + requiredStats.length + 1`), only required stats appear in coverage/beats, beats[0].kind === 'launch' and beats.at(-1).kind === 'verdict'.
- `tests/sim/data/fronts.test.ts` — 3 fronts with expected ids, exactly 2 required stats each, weights sum to 1.0 per front.

**State:**
- `tests/state/colony.test.ts` (extend) — `launchIncursion` return shape + `activeIncursion` set + captured/cooldown NOT yet applied; throws on captured / cooldown-active / wrong team size / duplicate ids / missing units; `dismissIncursion` commits captured on win; `dismissIncursion` commits cooldown on loss; `dismissIncursion` clears `activeIncursion`; `launchIncursion` does NOT touch drought/harvest/breed counters; round-trip capture blocks a re-launch.
- `tests/state/persist.test.ts` (extend) — v3→v4 adds `fronts`; v1→v4 chained; `activeIncursion` NOT persisted; reload mid-Incursion returns to idle with `activeIncursion=null` and front state unchanged.

**UI (jsdom):**
- `tests/ui/FrontCard.test.tsx` — available/cooldown/captured/selected renderings; click callback fires only in available state.
- `tests/ui/IncursionBeat.test.tsx` — hidden when visible=false; renders text when true.
- `tests/ui/IncursionTicker.test.tsx` — renders exactly `visibleBeatCount` beats; Skip button fires callback.
- `tests/ui/Incursion.test.tsx` — empty state (<4 units); picker + slot behavior; Launch disabled until front + 4 units selected; Launch transitions to resolving; beats reveal on `vi.advanceTimersByTime(1500)`; Skip jumps to resolved; Continue commits + resets; Region-conquered state.
- `tests/ui/App.test.tsx` (extend) — 3-tab nav (Colony ↔ Breed ↔ Incursion).

**Anti-meta invariant regression:** duplicate team ids rejected at the store layer.

**Expected count:** ~203 + ~40 new = **~243 total**.

**Dev-server smoke:**
- Nav to Incursion; empty state with <4 units.
- After Harvesting 4, picker becomes visible; pick a front + 4 units → Launch.
- Ticker plays ~6–8s; beats visible in order.
- Result renders; Continue commits. Captured checkmark appears; front is unclickable.
- Fail an under-tier front (e.g., all-baseline team on Military); cooldown pill shows 30-minute countdown; re-clicking is blocked.
- Reload during idle → captured/cooldown state persists.
- Reload during resolving → returns to idle; no side effects.
- Capture all 3 fronts → "Region conquered ✓" state.

## Deferred

- **Occupations** — game spec §10 garrison-for-passive-Serum. M6+.
- **Serum reward** — economy is M6.
- **Rest / injury** — game spec §11. M6.
- **Second region / world map** — MVP §7 is one region. M7+.
- **Ordering-effects** — "conquest order authors difficulty" (Guerrilla hardens after taking Military, etc). Real design surface; M6+ (needs occupations to fully bite).
- **Probabilistic outcomes** — deterministic threshold is fine for M5. `INCURSION_SUBSTREAM_PRIME` reserved for M6+ if we want it.
- **Front-specific phrase pools** — current design uses front-agnostic `BAND_PHRASES`. Per-front flavor variants are future polish.
- **Ticker sound / animation juice** — MVP §Deferred item 2 ("Live ticker feel — pacing, SFX, 'juice.'"). M5 lands the mechanic; feel-tuning is a later pass.
- **Sequencer / DNA Lab** — late-unlock per game spec.

## Self-review notes

- **Spec coverage vs game spec §9 + §10:** All §9 elements addressed — hidden per-stat requirements (`FRONTS.requirements`), weighted-stat matters-per-front (weights + geo-mean), team-of-4 (TEAM_SIZE), best-contributor-not-sum (`bestContributorPerStat`), coverage combines to success probability (`successP`), qualitative feedback (`BAND_PHRASES`), hidden thresholds (never surface in UI), live ticker (`Incursion.tsx` resolving phase), failure has teeth (30-min cooldown). §10 elements — region-with-fronts (3 fronts, one region), distinct stat profiles per front (INT/SPD, PWR/VIT, GUI/SPD). §10's "conquest order authors difficulty" via radicalization is deferred to M6+ when Occupations arrive.
- **Type consistency:** `Stat`, `Unit`, `FrontId`, `CoverageBand`, `FrontProfile`, `FrontState`, `IncursionResolution`, `IncursionBeat`, `TEAM_SIZE`, `COVERAGE_CLIP`, `SUCCESS_CUTOFF`, `INCURSION_LEVEL`, `FRONT_COOLDOWN_MS`, `BAND_PHRASES`, `FRONTS`, `resolveIncursion`, `bestContributorPerStat`, `bandForCoverage`, `launchIncursion`, `dismissIncursion` — all defined once, consumed identically across sim/state/UI.
- **Isolation of concerns:** Resolution is pure and deterministic (`src/sim/incursion.ts` returns `IncursionResolution`). State-layer `launchIncursion` orchestrates but doesn't compute. UI ticker is presentation-only — reads pre-computed beats from `activeIncursion` and reveals them on an interval. Front-hardening / ordering effects deliberately absent to keep M5 focused.
- **Anti-meta invariants:** best-contributor + coverage-clip + weighted geo-mean structurally prevent cloning + monster-stat exploits (invariant #4). Thresholds hidden at module boundary (invariant #5). Wear-shaved stats already respected via `computeCurrentStats(g, 20, wear)` (invariant #7).
- **Failsafe / drought isolation:** launch and dismiss both leave `droughtCount`, `harvestsToday`, `breedsToday` untouched. Each loop is its own bookkeeping.
- **Compatibility with M4:** Unit shape unchanged. All existing 203 tests continue to pass because `computeCurrentStats` gets an optional `wear` param already defaulted to `{}`.
- **Storage:** key `morulium/colony/v1` unchanged. v4 migration is chained additive; a legacy v1 save upgrades through all four branches.
