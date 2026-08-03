# Morulium — M3a Colony + Decant UI Design (v0.1)

**Date:** 2026-08-04
**Working directory:** `/Users/cnote/projects/morulium/`
**Remote:** `https://github.com/nicojitters/morulium` (public)
**Live:** `https://morulium.com` (Vercel, auto-deploys from main)
**Prior milestone:** M2 sprite renderer — merged. This spec covers **M3a: Colony + on-demand Decant** (the first half of the design-spec's M3 milestone; the second half — M3b — covers daily Harvest, Failsafe pity, and tag/sort/Cull actions).

## Purpose

Turn the M2 static Gallery into an interactive collector loop: user clicks **Decant a Morula**, a new specimen appears in their **Colony**, and their Colony persists across page reloads via localStorage.

M3a is the first milestone with **user actions**, **persistent state**, and a **stateful UI shell**. Every M4+ system (breeding, incursions, rest/economy, Vat fusion) will read from and write to the same Zustand store scaffolded here.

M3a ships when: opening morulium.com shows an empty-Colony CTA on first visit; clicking Decant adds a new specimen with a brief highlight; reloading the page shows the same Colony; and 5–10 rapid clicks feel snappy with no jank.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | **M3a slim** — persistence + Colony + on-demand Decant | M3 spec bundles too much (also Harvest/Failsafe/Cull); split lets us playtest the base loop before layering constraints. Harvest/Failsafe/Cull ship as M3b. |
| State library | **Zustand + persist middleware** | Design spec §M3 mandates it. Small (~1KB gzipped), hook-native, zero ceremony. Persist middleware handles localStorage. |
| Persistence storage | **localStorage** | Design-spec-locked; browser-only, single-save-per-browser, no accounts. |
| Persistence schema key | **`morulium/colony/v1`** | `/v1` stripe reserves migration space. If Unit shape changes, we bump to `/v2` with a migration function. |
| Unit persisted shape | **`{ id, seed, decantedAt, genome }`** | Full genome, not just seed — future sim changes won't retroactively alter saves. Level/xp/tags/injury deferred (M3b/M4+). |
| Decant seed source | **Monotonic counter `nextId`, starting at 1** | Fully deterministic and replayable. Persisted alongside `units`. Distinct from the demo's seed range (1000+) so no confusion. |
| Screen structure | **Single-screen, Decant button in header** | Minimal navigation friction. Matches the "click, see result" collector loop. Extends M2's page layout. |
| Decant reveal | **Instant + subtle highlight (~2s border-pulse)** | Fast, satisfying, minimal UI noise. Ceremony for rare hatches is deferred to M3b when Failsafe/Harvest give it narrative weight. |
| Empty state | **Explicit CTA: "Your Colony is empty — Decant your first specimen"** | Clean intro, teaches the primary action. Chosen over auto-seed because we want first Decant to be the user's action, not a fait accompli. |
| Colony sort | **Newest first** (`decantedAt` descending) | Natural for "let me see what I just Decanted." No sort controls needed in M3a. |
| Colony scale | **No cap, no virtualization** | If a playtester gets to 500 units, we add virtualization then. Not now. |
| Gallery replacement | **DELETE `Gallery.tsx` + its test** | Colony fully supersedes it. Sim demo (`runDemo`/`formatDemoTable`) stays for `verify:rarity` script + sim tests. |
| Testing | **Vitest with jsdom for React/localStorage tests** | Established pattern from M2. New: store unit tests, persistence round-trip tests, Colony rendering smoke test, highlight lifecycle test. |

## Data model

**Unit (M3a shape):**
```ts
export interface Unit {
  readonly id: number;              // monotonic, starts at 1
  readonly seed: number;            // rng seed used to roll .genome (same as id in M3a)
  readonly decantedAt: number;      // Date.now() at Decant, for sorting
  readonly genome: Genome;          // full genome persisted (not just seed)
}
```

`id` and `seed` are the same value in M3a. They're separate fields so future events (breeding, Vat fusion) can produce units whose seed diverges from their id.

**Persisted state shape:**
```ts
interface ColonyPersistShape {
  readonly units: Unit[];
  readonly nextId: number;
}
```

`lastDecantedId` (used for the highlight) is transient — NOT persisted. Rehydrating from a saved Colony always starts with `lastDecantedId: null`.

## State + persistence

**One Zustand store, one slice for M3a:**

```ts
// src/state/colony.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Unit } from './types';
import { rollGenome } from '../sim/genome';
import { createRng } from '../sim/rng';
import { colonyStorage } from './persist';

interface ColonyStore {
  units: Unit[];
  nextId: number;
  lastDecantedId: number | null;

  decant: () => Unit;
  clearHighlight: () => void;
}

export const useColonyStore = create<ColonyStore>()(
  persist(
    (set, get) => ({
      units: [],
      nextId: 1,
      lastDecantedId: null,

      decant: () => {
        const id = get().nextId;
        const genome = rollGenome(createRng(id));
        const unit: Unit = {
          id,
          seed: id,
          decantedAt: Date.now(),
          genome,
        };
        set((s) => ({
          units: [...s.units, unit],
          nextId: s.nextId + 1,
          lastDecantedId: id,
        }));
        return unit;
      },

      clearHighlight: () => set({ lastDecantedId: null }),
    }),
    colonyStorage,
  ),
);
```

**Persist configuration:** the `persist()` options object is defined inline in `colony.ts` (where `ColonyStore` is in scope), and `src/state/persist.ts` exports only shared constants (the storage-key prefix, a schema version constant) — this avoids a circular type dependency and keeps the store's persistence rules co-located with the store itself.

```ts
// src/state/persist.ts
export const STORAGE_KEY = 'morulium/colony/v1' as const;

// src/state/colony.ts (excerpt inside the create<ColonyStore>() call)
persist(
  (set, get) => ({ /* store body from above */ }),
  {
    name: STORAGE_KEY,
    // Only persist units + nextId. lastDecantedId is transient.
    partialize: (state) => ({ units: state.units, nextId: state.nextId }),
  },
)
```

**Rehydration behavior:**
- On first visit (nothing at `morulium/colony/v1`): initial state applies (`units: []`, `nextId: 1`, `lastDecantedId: null`).
- On subsequent visits: Zustand's `persist` middleware auto-rehydrates. `lastDecantedId` is always `null` after rehydration (transient).

**Determinism note:**
`Date.now()` enters the codebase for the first time here in `decant()`. This is expected — it only feeds `decantedAt` for sort order. Sim/render/ui NEVER branch on real time. Tests mock `Date.now` where sort-order determinism matters.

## UI shell

**Layout (single-screen, top-to-bottom):**

```
┌──────────────────────────────────────────────────────────────────┐
│  Morulium                                 [ Decant a Morula ]    │  header row
│  Your Colony — 12 specimens                                      │  count subtitle
│  ● Baseline  ● Strain  ● Mutant  ● Chimera  ● Progenitor         │  tier legend
├──────────────────────────────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                                     │
│  │ ★  │ │    │ │    │ │    │  ...                                │  newest first,
│  │    │ │    │ │    │ │    │                                     │  ~4 columns on desktop,
│  └────┘ └────┘ └────┘ └────┘                                     │  1–2 on mobile
└──────────────────────────────────────────────────────────────────┘
```

`★` illustrates the highlight — the newly-Decanted card has a soft glow / border pulse for ~2 seconds, driven by `lastDecantedId`.

**Empty-Colony state** (when `units.length === 0`):
```
┌──────────────────────────────────────────────────────────────────┐
│  Morulium                                                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    Your Colony is empty                          │
│                                                                  │
│              [    Decant your first Morula    ]                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Large centered CTA. Same Decant action, just visually prominent.

## Component structure

```
src/
  state/                              # NEW
    types.ts                          # Unit interface (single source)
    colony.ts                         # Zustand store + decant/clearHighlight
    persist.ts                        # storage key + partialize helper
  ui/
    screens/
      Colony.tsx                      # NEW — replaces Gallery.tsx
    components/
      DecantButton.tsx                # NEW — header CTA + empty-state CTA
      EmptyColony.tsx                 # NEW — empty-state layout
      SpecimenCard.tsx                # MODIFIED — accepts optional `highlighted` prop
      TierBadge.tsx                   # unchanged
    styles.ts                         # MODIFIED — add button, empty-state, highlight styles
  App.tsx                             # MODIFIED — renders <Colony /> (was <Gallery />)
  render/                             # unchanged
  sim/                                # unchanged

tests/
  state/                              # NEW
    colony.test.ts                    # store transitions (node env)
    persist.test.ts                   # localStorage round-trip (jsdom)
  ui/
    colony.test.tsx                   # rendering + highlight lifecycle (jsdom)
    gallery.test.tsx                  # DELETED — Colony subsumes it
  render/                             # unchanged (M2 tests still pass)
  sim/                                # unchanged
```

**Files DELETED:**
- `src/ui/screens/Gallery.tsx`
- `tests/ui/gallery.test.tsx`

The demo function (`src/sim/__demo__.ts` — `runDemo`, `formatDemoTable`, `DemoRow`) STAYS. It's still used by `scripts/verify-rarity.ts` and by future debug/tuning work. Only the UI screen that consumed it goes away.

## Interaction details

**Decant flow:**
1. User clicks the header Decant button (or the empty-state CTA)
2. `useColonyStore.getState().decant()` runs synchronously
3. New Unit appears in `units` array (append); `nextId` increments; `lastDecantedId` = new unit's id
4. Colony re-renders (Zustand triggers)
5. The newly-Decanted SpecimenCard reads `lastDecantedId === myId` → renders with `highlighted` prop
6. A `useEffect` in the highlighted card starts a 2s `setTimeout` → calls `clearHighlight()` after 2s → highlight fades

**Highlight implementation:**
```tsx
// inside SpecimenCard
useEffect(() => {
  if (!highlighted) return;
  const t = setTimeout(() => clearHighlight(), 2000);
  return () => clearTimeout(t);
}, [highlighted, clearHighlight]);
```

CSS class `highlighted` adds a 2s border-color transition or box-shadow pulse. Kept in the shared styles module. No external animation library.

**Decant button state:**
- Always enabled in M3a (no daily limit — that lands in M3b)
- No loading state (synchronous, sub-millisecond)
- Label: **"Decant a Morula"** in the header, **"Decant your first Morula"** in the empty state
- Uses the biotech-specimen tone from M2 styles

## Testing approach

### 1. Store unit tests — `tests/state/colony.test.ts` (node env)

Assertions:
- `decant()` returns a Unit with the expected shape (id, seed, decantedAt as number, genome as Genome)
- After `decant()`, `units.length` increases by 1 and `nextId` increments by 1
- After `decant()`, `lastDecantedId` equals the new unit's id
- Consecutive Decants produce Units with different genomes (via the deterministic counter)
- `clearHighlight()` sets `lastDecantedId` to `null`

Test isolation: reset the store via `useColonyStore.setState({ units: [], nextId: 1, lastDecantedId: null })` in `beforeEach`.

### 2. Persistence round-trip — `tests/state/persist.test.ts` (jsdom env for `localStorage`)

Assertions:
- Storage key is exactly `morulium/colony/v1` (regression tripwire for accidental key changes)
- Empty `localStorage` → rehydrated store has `{ units: [], nextId: 1, lastDecantedId: null }`
- Decant 3 units → serialize to localStorage → clear the store → rehydrate → all 3 units present with correct shape, `nextId === 4`
- `lastDecantedId` is NOT persisted (partialize excludes it) — after a rehydration cycle, it's `null` even if the pre-serialization state had a value

### 3. Colony rendering + highlight lifecycle — `tests/ui/colony.test.tsx` (jsdom env, `@testing-library/react`)

Assertions:
- Empty store → `<EmptyColony>` renders (assertable via `data-testid="empty-colony"` or role query for the CTA)
- Store with 3 units → 3 SpecimenCards render (existing `data-testid="specimen-card"`)
- Cards render newest-first (assert `data-unit-id` order matches `units` sorted by `decantedAt` desc)
- Clicking `<DecantButton>` calls `decant()` (mock the store or assert against real state)
- After Decant, the new card has `data-highlighted="true"` (or equivalent CSS class marker)
- After 2s (vitest fake timers), `data-highlighted` clears

### 4. Existing M2 tests keep passing

- SVG snapshot tests (5 tier archetypes) — SpecimenCard's SVG output unchanged
- Registry completeness — no change
- Layout / colors — no change
- Delete `tests/ui/gallery.test.tsx` — Colony fully subsumes it; no content worth refactoring in

**Expected test count after M3a:** current 79 → ~87 (add ~10 new state/persist/colony tests, minus ~2 from deleted gallery test).

## Non-goals (deferred)

**M3b (next milestone):**
- Daily Harvest cadence (limited free Decants per day; timer UI)
- Failsafe / pity guarantee (drought streak → guaranteed Adapted+)
- Tag/sort/Cull actions (mark units, filter by tag, Cull All bulk action)
- Auto-cull rules (user-defined predicates)

**M4+ and beyond:**
- Sprite reveal animation beyond the border-pulse (M4+ if rare hatches feel underweighted)
- Serum currency + cost per Decant beyond Harvest freebies
- Undo / soft-delete
- Colony pagination or virtualization (deferred until playtest surfaces a scale need)
- Import / export of the save (M7 or later utility work)
- Cross-device sync (backend rewrite; explicitly deferred per M1 design spec)
- Colony sort controls (only newest-first in M3a; tier/id sort options if M3b playtest wants them)

## Open logistics

- **Zustand install:** `npm install zustand` (production dep, ~1KB gzipped)
- **Bundle size expectation:** 52.72 KB → ~56 KB gzipped (~+3 KB for Zustand + our state files)
- **Vercel auto-deploy:** M3a lands on main → morulium.com auto-updates. First-time visitors see EmptyColony; returning visitors see their persisted Colony.
- **Analytics / privacy:** none added in M3a. localStorage is local-only, no data leaves the browser. Nothing to disclose or opt-in-to.
- **Migration story for M3b:** when M3b adds `tags` to the Unit shape, we bump `morulium/colony/v1` → `morulium/colony/v2` with a Zustand migration function that adds `tags: []` to each unit. Design spec's `v1` prefix reserves this space intentionally.
- **`clearHighlight` timer edge case:** if the user Decants rapidly (< 2s apart), each new Decant overwrites `lastDecantedId` — the previous card's timer fires and clears the (now-different) id anyway, which is fine because the new card owns the id. Behavior is: "only the most recent Decant is highlighted; multiple rapid Decants show only the latest as highlighted." Acceptable.
