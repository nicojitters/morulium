# Morulium — MVP Build Design (v0.1)

**Date:** 2026-08-02
**Working directory:** `/Users/cnote/projects/morulium/`
**Remote:** `https://github.com/nicojitters/morulium` (public)
**Game design source:** `~/Downloads/genome-schema-and-mvp-scope (1).md` (v0.1)

## Purpose

This is the **build/execution design** for the MVP slice already specified in the game design source. The game spec covers *what* to build (genome, breeding, missions, economy, seven anti-meta principles). This document covers *how* we build it: project layout, module boundaries, milestones, testing, and which decisions we're deferring to context.

The game spec is the source of truth for gameplay rules. This doc does not restate them.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Vite + React + TypeScript | Menu-heavy sim with a light ticker; React fits list-heavy UI, no game engine needed |
| Rendering | SVG (procedural sprites as React components) | The game spec already commits to SVG (`renderSprite(...): SVG`) |
| State | Zustand | Small, hook-native, no ceremony |
| Test runner | Vitest | Native Vite integration |
| Persistence | localStorage only | Single-browser save, no accounts; "daily login" derived from a stored timestamp |
| Scope | Full MVP — game spec build steps 1–10 | Smallest slice that proves the loop is fun (game spec §13) |
| Team-size cap | 4 | Game spec §6 default; big enough to cover 3 fronts, small enough to force rotation |
| Stat set | 5 (PWR / VIT / SPD / INT / GUI) | Game spec §1; villain fantasy lives in flavor, not a 6th stat |
| Level-cap contribution | ~+40% over base | Keeps genetics king (principle 2) |
| Workflow | Milestone-by-milestone with user review | Playtest-driven; catches drift early on a feel-sensitive game |
| Deferred | Paid avatar pipeline, gear, Egg Scanner, Codex, additional regions, market/multiplayer | Per game spec §13. `PhenotypeDescriptor` shape kept ready for later avatar hookup |

## Project layout

```
morulium/
  src/
    sim/                # pure — no React, no DOM, 100% unit-testable
      types.ts          # Allele, Locus, Genome, Unit, Stat, Front, Outcome
      data/             # allele tables, locus tables, palette ramps (frozen)
      rng.ts            # seeded RNG (mulberry32 or similar)
      genome.ts         # rollGenome, breed, mutate, expressPhenotype
      stats.ts          # computeStats, growth affinity, level scaling
      rarity.ts         # computeRarity
      mission.ts        # resolveMission (best-contributor-per-stat)
      economy.ts        # jobs tick, credits, garrison flare
    render/
      sprite.tsx        # renderSprite(phenotype) → SVG React component
    state/
      store.ts          # Zustand — roster, region, credits, day, current screen
      persist.ts        # localStorage save/load behind a swappable interface
    ui/
      screens/          # Home, Roster, Hatch, Breed, Mission, Grinder
      components/       # UnitCard, StatBar, LiveTicker, TagChip
    App.tsx
    main.tsx
  tests/                # Vitest suites, mirroring src/ layout
```

## Sim module boundaries

Data flows one way; purity increases as you go deeper. Every function is deterministic given an explicit `SeededRng` argument.

- **`types.ts`** — no logic, only shapes.
- **`data/`** — imports types only; exports frozen tables (`as const`), edited by hand for tuning.
- **`rng.ts`** — self-contained; `seed → SeededRng`.
- **`genome.ts`** — uses types + data + rng. **Never touches stats.**
- **`stats.ts`** — uses types + genome only. Derives base stats, growth affinity, level-scaled current stats.
- **`rarity.ts`** — uses types + data. Tier only.
- **`mission.ts`** — uses types + stats. Returns `Outcome` with **qualitative** feedback strings only — numeric thresholds and coverage ratios never leave this module.
- **`economy.ts`** — uses types + state snapshot. Returns credit deltas and garrison-flare state changes.

### Invariants

- **Genome is the only source of truth.** Stats, rarity, sprite, phenotype are all recomputed on demand and memoized in the store. Only genome, level, xp, rest/injury state, and tags are persisted.
- **RNG is always passed in, never global.** Same seed + same actions ⇒ same outcome. Enables replay debugging of weird breeding outcomes.
- **Hidden info is enforced at the module boundary.** Mission thresholds, allele weights, dominance/recessive carriers are never returned to the UI layer — principle 5 becomes a compile-time guarantee, not a discipline.

## Milestone plan

Each milestone leaves the app in a working state and represents a real step change in what the user can see or do. Before handing off any milestone with a UI surface, I run the dev server and sanity-check the feature in the browser (no "done" claims without evidence).

| # | Milestone | Game spec steps | Deliverable for review |
|---|---|---|---|
| **M1** | Sim foundations — genome, stats, rarity | 1–3 | Printed output (via Vitest or a tiny Vite page — decide in M1's implementation plan) of 50 hatched monsters with genomes, stats, tiers. Heavy Vitest coverage on `sim/*`. Review target: does the tradeoff distribution look right? |
| **M2** | Procedural sprite renderer | 4 | Gallery page: 50 sprites on screen. Visual quality gate before UI work. Review target: does the art hold up? |
| **M3** | Roster + hatching UI | 5 | Zustand + localStorage, roster screen, tag/sort/trash, hatch button, daily-pull mechanic. First "playable-shape" milestone. |
| **M4** | Breeding | 6 | Breed screen, Mendelian + mutation + wear + generation, lineage on UnitCard. Review target: does breeding feel meaningful? |
| **M5** | Missions & fronts | 7 | One region, 3 fronts, hidden thresholds, best-contributor resolve, live ticker, qualitative feedback. First real gameplay loop. |
| **M6** | Rest, injury, garrison economy | 8 | Rest state, Stim consumable, injury bench, Jobs income, under-garrison flare. Failure now has teeth. |
| **M7** | Grinder + minimal Home | 9–10 | 10→1 fusion, auto-trash rules, Barracks / Medbay / roster cap. Full MVP + global tuning pass. |

## Testing approach

- **`sim/*`** — Vitest, real coverage. Invariant tests on `breed()` (allele count preserved, generation increments, mutation rate bounded), `computeStats`, rarity thresholds.
- **`render/sprite.tsx`** — SVG snapshot tests over a fixed roster of seeded genomes. Cheap regression catcher.
- **`state/store`** — focused reducer tests on tag/sort/trash/hatch/breed.
- **`ui/*`** — smoke tests only (React Testing Library). Screen renders given a seeded store. No obsessive presentational tests — they slow UI iteration and rarely catch real bugs.
- **No E2E harness for MVP.** Manual playtest at each milestone is faster feedback than Playwright right now.

## Deferred / flagged decisions

These are not designed on paper. They will be resolved in context at the relevant milestone.

1. **Sprite visual style** (M2) — palette ramps, part silhouettes, per-allele variance.
2. **Live ticker feel** (M5) — pacing, SFX, "juice."
3. **Exact tuning numbers** — allele weights, mission thresholds per front, mutation rate, wear rate, level curve, injury durations, credit rates. Game spec explicitly calls these placeholders. Seeded with reasonable defaults; tuned each playtest.
4. **Auto-trash rule UX** (M3) — chip-based filter builder vs. simple predicate list.
5. **Garrison flare trigger** (M6) — time-based vs. mission-based.

Anything else in the game spec is implemented as written. Any ambiguity found mid-milestone that isn't on this list triggers a stop-and-ask, not a guess.

## Open logistics (resolve before M1 starts)

- **Package name** — will be `morulium` in `package.json`, no license header. Repo visibility is already **public** on GitHub — worth noting so we don't put anything genuinely secret (API keys, or later, tuning constants players could reverse-engineer for meta-gaming) in the repo without thought.
