# M3a Colony + Decant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the M2 static Gallery into an interactive collector loop — Zustand-backed Colony with on-demand Decant, persisted across page reloads via localStorage, with a 2s highlight on new specimens.

**Architecture:** New `src/state/` layer (Zustand store + persist middleware). `Colony.tsx` replaces `Gallery.tsx` as the app's single screen. `SpecimenCard.tsx` gets an optional `highlighted` prop that reads from the store's `lastDecantedId`. Empty-state CTA shown when no units exist. All existing sim/render layers unchanged.

**Tech Stack:** Adds `zustand` (~1KB gzipped, runtime dep). No other new deps.

**Source spec:** `docs/superpowers/specs/2026-08-04-m3a-colony-decant-design.md`.

## Global Constraints

- **Branch:** work happens on `m3a-colony-decant` (already created from main, plan doc committed there). Do NOT commit to main directly.
- **TS strict:** `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any` in `src/state/*`, `src/render/*`, or `src/ui/*`.
- **`src/sim/*` and `src/render/*` PURE** — unchanged from prior milestones.
- **`src/state/*`** — allowed to touch `localStorage` (via Zustand's persist middleware) and `Date.now()` (in `decant()` for `decantedAt`). NO `Math.random` (rolls use the seeded `SeededRng`). NO module-scope side effects.
- **`src/ui/*`** — no `Math.random`/`Date.now()` at module load. `useEffect` for the highlight timeout is fine (runtime, not module-load).
- **Storage schema key:** exactly `morulium/colony/v1` (locked; changing it later requires a migration).
- **Persist partialize:** only `{ units, nextId }` are persisted. `lastDecantedId` is transient (resets to null on rehydrate).
- **Decant seed:** monotonic counter `nextId` starting at 1, stored alongside units. Each Decant uses `seed = nextId`, rolls via `rollGenome(createRng(nextId))`, increments.
- **Highlight duration:** 2000ms (2s). Implemented via `setTimeout` in a `useEffect` on the highlighted card.
- **Empty state text:** header "Your Colony is empty" / CTA button "Decant your first Morula".
- **Normal header CTA text:** "Decant a Morula".
- **Vitest imports:** `import { describe, it, expect, beforeEach, vi } from 'vitest'`. React component + localStorage tests use `// @vitest-environment jsdom` at file top.
- **Commits:** Conventional Commits + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` on every commit.

---

### Task 1: Install Zustand + scaffold `src/state/` types & persist helpers

**Files:**
- Modify: `package.json` — add `zustand` to `dependencies`
- Create: `src/state/types.ts` — the `Unit` interface (single source of truth for M3a's persisted unit shape)
- Create: `src/state/persist.ts` — shared persistence constants
- Create: `tests/state/types.test.ts` — trivial type-shape smoke test

**Interfaces produced:**
- `interface Unit { readonly id: number; readonly seed: number; readonly decantedAt: number; readonly genome: Genome }`
- `const STORAGE_KEY = 'morulium/colony/v1' as const`
- No functions yet — that's Task 2

**Global constraints for this task:**
- No `any`
- Zustand added as a `dependencies` entry (not devDependencies — it ships in the production bundle)
- Do NOT create `colony.ts` yet (Task 2)
- Do NOT modify `App.tsx` or delete `Gallery.tsx` (later tasks)

- [ ] **Step 1: Install Zustand**

Run: `npm install zustand`
Expected: `zustand` appears in `package.json` `dependencies`.

- [ ] **Step 2: Create `src/state/types.ts`**

```ts
import type { Genome } from '../sim/types';

/**
 * A persisted Colony unit (M3a shape). Level, xp, tags, injury, and rest
 * state are deferred to M3b / M4+.
 *
 * `id` and `seed` are the same value in M3a — they diverge later (breeding /
 * Vat fusion may produce units whose seed is derived, not the id itself).
 */
export interface Unit {
  readonly id: number;
  readonly seed: number;
  readonly decantedAt: number;   // Date.now() at Decant, for sorting
  readonly genome: Genome;
}
```

- [ ] **Step 3: Create `src/state/persist.ts`**

```ts
/**
 * Storage key for the Colony persistence. Bump the /vN stripe when the
 * persisted shape (Unit fields, top-level state) changes in an
 * incompatible way. Persist middleware in colony.ts handles migration.
 */
export const STORAGE_KEY = 'morulium/colony/v1' as const;
```

- [ ] **Step 4: Create `tests/state/types.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { STORAGE_KEY } from '../../src/state/persist';

describe('state/persist', () => {
  it('storage key is exactly morulium/colony/v1 (bumping requires migration)', () => {
    expect(STORAGE_KEY).toBe('morulium/colony/v1');
  });
});
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test`
Expected: 79 previous + 1 new = 80 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/state/ tests/state/
git commit -m "$(cat <<'EOF'
feat(state): add Zustand + M3a Unit type + persist key constant

Adds the runtime dep (zustand ~1KB gzipped), the persisted Unit
interface (id/seed/decantedAt/genome — the M3a shape; tags/level/
injury deferred), and the STORAGE_KEY constant morulium/colony/v1.
Migration bump reserved via the /vN stripe.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Create the Colony Zustand store with persist middleware

**Files:**
- Create: `src/state/colony.ts` — the store + `decant()` + `clearHighlight()`
- Create: `tests/state/colony.test.ts` — store transitions (node env)
- Create: `tests/state/persist.test.ts` — localStorage round-trip (jsdom env)

**Interfaces produced:**
- `useColonyStore` — Zustand hook, callable as `useColonyStore((s) => s.units)` or `useColonyStore.getState()`
- Store shape: `{ units: Unit[]; nextId: number; lastDecantedId: number | null; decant(): Unit; clearHighlight(): void }`
- `decant()` returns the newly-created `Unit` and mutates the store (appends to `units`, increments `nextId`, sets `lastDecantedId`)
- `clearHighlight()` sets `lastDecantedId` to `null`
- `unitById(state, id): Unit | undefined` — pure selector for tests / future callers

**Global constraints for this task:**
- No `any`
- `decant()` uses `Date.now()` (only allowed non-determinism in the code base — tests mock it)
- `rollGenome(createRng(nextId))` from existing `src/sim/*` — no new sim code
- Persist middleware config lives inline in `colony.ts` (matches spec's decision to avoid circular type dependency)
- `partialize` returns `{ units, nextId }` only (excludes `lastDecantedId`)

- [ ] **Step 1: Write failing tests at `tests/state/colony.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useColonyStore } from '../../src/state/colony';

describe('colony store', () => {
  beforeEach(() => {
    useColonyStore.setState({ units: [], nextId: 1, lastDecantedId: null });
  });

  it('starts empty with nextId=1 and no highlight', () => {
    const s = useColonyStore.getState();
    expect(s.units).toEqual([]);
    expect(s.nextId).toBe(1);
    expect(s.lastDecantedId).toBeNull();
  });

  it('decant() appends a Unit with the expected shape and increments nextId', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const unit = useColonyStore.getState().decant();
    expect(unit.id).toBe(1);
    expect(unit.seed).toBe(1);
    expect(unit.decantedAt).toBe(Date.parse('2026-01-01T00:00:00Z'));
    expect(unit.genome).toBeDefined();
    expect(unit.genome.loci).toBeDefined();

    const s = useColonyStore.getState();
    expect(s.units).toHaveLength(1);
    expect(s.units[0]).toEqual(unit);
    expect(s.nextId).toBe(2);
    expect(s.lastDecantedId).toBe(1);

    vi.useRealTimers();
  });

  it('two consecutive decants produce different genomes', () => {
    const a = useColonyStore.getState().decant();
    const b = useColonyStore.getState().decant();
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
    // Genome equality by structural check — different seeds produce different
    // allele picks (via weightedPick), so at least one locus should differ.
    const anyLocusDiffers = Object.keys(a.genome.loci).some(
      (locusId) =>
        JSON.stringify(a.genome.loci[locusId]) !== JSON.stringify(b.genome.loci[locusId]),
    );
    expect(anyLocusDiffers).toBe(true);
  });

  it('clearHighlight() sets lastDecantedId to null', () => {
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().lastDecantedId).toBe(1);
    useColonyStore.getState().clearHighlight();
    expect(useColonyStore.getState().lastDecantedId).toBeNull();
  });
});
```

- [ ] **Step 2: Write failing tests at `tests/state/persist.test.ts`**

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';
import { STORAGE_KEY } from '../../src/state/persist';

describe('colony persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useColonyStore.setState({ units: [], nextId: 1, lastDecantedId: null });
  });

  it('empty localStorage rehydrates to clean initial state', async () => {
    // Trigger rehydration explicitly (Zustand persist middleware fires this on store creation
    // but we clear before each test so we need to ensure state matches expected initial).
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    expect(s.units).toEqual([]);
    expect(s.nextId).toBe(1);
    expect(s.lastDecantedId).toBeNull();
  });

  it('decanting persists units and nextId to localStorage under morulium/colony/v1', () => {
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    // Zustand's persist middleware wraps state under a `state` key
    expect(parsed.state.units).toHaveLength(2);
    expect(parsed.state.nextId).toBe(3);
    // lastDecantedId MUST NOT be persisted (partialize excludes it)
    expect(parsed.state.lastDecantedId).toBeUndefined();
  });

  it('rehydrating a saved state restores units and nextId, but lastDecantedId is null', async () => {
    // Seed localStorage manually to simulate a returning visitor
    const savedShape = {
      state: {
        units: [
          { id: 1, seed: 1, decantedAt: 1_700_000_000_000, genome: { loci: {} } },
          { id: 2, seed: 2, decantedAt: 1_700_000_001_000, genome: { loci: {} } },
        ],
        nextId: 3,
      },
      version: 0,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedShape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    expect(s.units).toHaveLength(2);
    expect(s.nextId).toBe(3);
    expect(s.lastDecantedId).toBeNull();
  });
});
```

- [ ] **Step 3: Run to confirm both test files fail**

Run: `npm test -- tests/state/`
Expected: FAIL — `useColonyStore` doesn't exist yet.

- [ ] **Step 4: Create `src/state/colony.ts`**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Unit } from './types';
import { STORAGE_KEY } from './persist';
import { rollGenome } from '../sim/genome';
import { createRng } from '../sim/rng';

interface ColonyStore {
  readonly units: Unit[];
  readonly nextId: number;
  readonly lastDecantedId: number | null;

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
    {
      name: STORAGE_KEY,
      // Only persist units + nextId. lastDecantedId is transient.
      partialize: (state) => ({ units: state.units, nextId: state.nextId }),
    },
  ),
);

/** Pure selector: find a unit by id. */
export function unitById(state: { units: readonly Unit[] }, id: number): Unit | undefined {
  return state.units.find((u) => u.id === id);
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- tests/state/`
Expected: PASS all colony + persist tests (colony.test.ts has 4 tests, persist.test.ts has 3 = 7 new).

Run: `npm test`
Expected: 80 previous + 7 new = 87 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/state/colony.ts tests/state/
git commit -m "$(cat <<'EOF'
feat(state): Zustand Colony store with persist middleware

Adds useColonyStore with:
- units: Unit[] (persisted)
- nextId: number (persisted, monotonic Decant seed counter)
- lastDecantedId: number | null (transient — resets on rehydrate)
- decant() — rolls a genome via createRng(nextId) + rollGenome,
  appends the unit, increments nextId, sets lastDecantedId
- clearHighlight() — clears the transient highlight marker

Persist middleware writes to localStorage under morulium/colony/v1
with partialize excluding lastDecantedId.

Date.now() enters the code base here for the first time — only in
decantedAt for sort order. Sim/render/ui never branch on real time;
tests mock Date via vi.setSystemTime where needed.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Extend `SpecimenCard` with the `highlighted` prop + shared highlight styles

**Files:**
- Modify: `src/ui/components/SpecimenCard.tsx` — accept optional `highlighted?: boolean` prop; add `data-highlighted` attribute; apply highlight style when true
- Modify: `src/ui/styles.ts` — add `highlightedCard` style (border/box-shadow pulse) + shared `decantButton` and `emptyState` styles Task 5 will use

**Interfaces produced:**
- `<SpecimenCard row highlighted?: boolean />` — backward compatible; when `highlighted === true`, card renders with `data-highlighted="true"` and the pulsed border/box-shadow
- `styles.highlightedCard: CSSProperties` — additive style spread on top of `styles.card(bgTint)`
- `styles.decantButton: CSSProperties` — used by Task 5's DecantButton
- `styles.emptyState: CSSProperties` — used by Task 5's EmptyColony
- No behavior change for non-highlighted usage — M2's Gallery test would still pass if it still existed

**Global constraints for this task:**
- Backward-compatible prop (optional)
- No `useEffect` yet — the timer that clears the highlight lives in `Colony.tsx` (Task 5), not the card, so the card stays presentational
- No new component files (that's Task 5)
- No changes to `Gallery.tsx` or `App.tsx` in this task

- [ ] **Step 1: Modify `src/ui/styles.ts` — add three new style entries**

Add at the bottom of the exported `styles` object (before the closing brace):

```ts
  highlightedCard: {
    outline: '2px solid #f59e0b',    // amber — matches Mutant tier for visibility
    outlineOffset: '2px',
    boxShadow: '0 0 12px 2px rgba(245, 158, 11, 0.6)',
    transition: 'outline-color 0.3s ease, box-shadow 0.3s ease',
  } as CSSProperties,

  decantButton: {
    padding: '10px 20px',
    borderRadius: 6,
    border: '1px solid #14b8a6',
    background: '#14b8a6',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,

  emptyState: {
    textAlign: 'center',
    padding: '80px 24px',
    color: '#666',
  } as CSSProperties,

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#333',
    marginBottom: 8,
  } as CSSProperties,

  emptyStateBody: {
    fontSize: 14,
    marginBottom: 32,
  } as CSSProperties,

  emptyStateCta: {
    padding: '14px 28px',
    borderRadius: 8,
    border: '1px solid #14b8a6',
    background: '#14b8a6',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,
```

- [ ] **Step 2: Modify `src/ui/components/SpecimenCard.tsx` — accept `highlighted` prop**

Change the Props interface and the returned card to spread the highlight style:

```tsx
import type { ReactElement } from 'react';
import type { DemoRow } from '../../sim/__demo__';
import { Sprite } from '../../render/sprite';
import { resolvePalette } from '../../render/colors';
import { TierBadge } from './TierBadge';
import { styles } from '../styles';

interface Props {
  readonly row: DemoRow;
  readonly highlighted?: boolean;
}

export function SpecimenCard({ row, highlighted = false }: Props): ReactElement {
  const colors = resolvePalette(row.palette);
  const bgTint = tintForCard(colors.base);
  const specimenId = `M-${String(row.seed).padStart(5, '0')}`;

  const cardStyle = highlighted
    ? { ...styles.card(bgTint), ...styles.highlightedCard }
    : styles.card(bgTint);

  return (
    <div
      style={cardStyle}
      data-testid="specimen-card"
      data-highlighted={highlighted || undefined}
      data-unit-id={row.seed}
    >
      <TierBadge tier={row.tier} />
      <div style={styles.cardSprite}>
        <Sprite phenotype={row.expressed} palette={row.palette} />
      </div>
      <div style={styles.cardFooter}>{specimenId}</div>
    </div>
  );
}

function tintForCard(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(255 * 0.92 + c * 0.08);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}
```

Notes:
- `data-highlighted={highlighted || undefined}` — when false, the attribute is entirely omitted from the DOM (React idiom). When true, it renders as `data-highlighted="true"`.
- `data-unit-id={row.seed}` — used by Task 5's Colony test to verify sort order.

- [ ] **Step 3: Run tests + typecheck**

Run: `npm test`
Expected: 87 previous, all still green (M2 tests unaffected — the highlighted prop is optional and defaults to false).

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/ui/components/SpecimenCard.tsx src/ui/styles.ts
git commit -m "$(cat <<'EOF'
feat(ui): SpecimenCard accepts optional highlighted prop; add M3a styles

SpecimenCard now takes an optional highlighted?: boolean. When true,
adds an amber outline + box-shadow via new styles.highlightedCard,
and renders data-highlighted="true" for test targeting. Also adds
data-unit-id={row.seed} for M3a Colony ordering assertions.

Adds shared styles for the upcoming DecantButton and EmptyColony
components (decantButton, emptyState, emptyStateTitle,
emptyStateBody, emptyStateCta). No behavior change for existing M2
Gallery usage — highlighted defaults to false.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Create `DecantButton` and `EmptyColony` components

**Files:**
- Create: `src/ui/components/DecantButton.tsx`
- Create: `src/ui/components/EmptyColony.tsx`
- Create: `tests/ui/DecantButton.test.tsx`
- Create: `tests/ui/EmptyColony.test.tsx`

**Interfaces produced:**
- `<DecantButton label?: string />` — reads `useColonyStore((s) => s.decant)`, calls `decant()` on click. Optional `label` prop defaulting to `'Decant a Morula'`. Renders as a `<button>` with `data-testid="decant-button"`.
- `<EmptyColony />` — the first-launch layout: title, body copy, and a large `<DecantButton label="Decant your first Morula" />`. Renders with `data-testid="empty-colony"`.

**Global constraints for this task:**
- Backward-compatible label prop
- Both components read from `useColonyStore` — no props for state
- Test files use `// @vitest-environment jsdom`
- Reset store state in `beforeEach`
- Do NOT create the Colony screen (Task 5)

- [ ] **Step 1: Write failing test at `tests/ui/DecantButton.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DecantButton } from '../../src/ui/components/DecantButton';
import { useColonyStore } from '../../src/state/colony';

describe('DecantButton', () => {
  beforeEach(() => {
    useColonyStore.setState({ units: [], nextId: 1, lastDecantedId: null });
  });

  it('renders with the default label "Decant a Morula"', () => {
    const { getByTestId } = render(<DecantButton />);
    expect(getByTestId('decant-button').textContent).toBe('Decant a Morula');
  });

  it('renders with a custom label when provided', () => {
    const { getByTestId } = render(<DecantButton label="Decant your first Morula" />);
    expect(getByTestId('decant-button').textContent).toBe('Decant your first Morula');
  });

  it('calls decant() on click and adds a unit to the store', () => {
    const { getByTestId } = render(<DecantButton />);
    expect(useColonyStore.getState().units).toHaveLength(0);
    fireEvent.click(getByTestId('decant-button'));
    expect(useColonyStore.getState().units).toHaveLength(1);
    expect(useColonyStore.getState().lastDecantedId).toBe(1);
  });
});
```

- [ ] **Step 2: Write failing test at `tests/ui/EmptyColony.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { EmptyColony } from '../../src/ui/components/EmptyColony';
import { useColonyStore } from '../../src/state/colony';

describe('EmptyColony', () => {
  beforeEach(() => {
    useColonyStore.setState({ units: [], nextId: 1, lastDecantedId: null });
  });

  it('renders the empty-state title and CTA', () => {
    const { getByTestId, getByText } = render(<EmptyColony />);
    expect(getByTestId('empty-colony')).toBeDefined();
    expect(getByText(/your colony is empty/i)).toBeDefined();
    expect(getByTestId('decant-button').textContent).toBe('Decant your first Morula');
  });

  it('clicking the CTA decants the first specimen', () => {
    const { getByTestId } = render(<EmptyColony />);
    fireEvent.click(getByTestId('decant-button'));
    expect(useColonyStore.getState().units).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

Run: `npm test -- tests/ui/DecantButton.test.tsx tests/ui/EmptyColony.test.tsx`
Expected: FAIL — components don't exist yet.

- [ ] **Step 4: Create `src/ui/components/DecantButton.tsx`**

```tsx
import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { styles } from '../styles';

interface Props {
  readonly label?: string;
  readonly variant?: 'header' | 'empty-cta';
}

export function DecantButton({ label = 'Decant a Morula', variant = 'header' }: Props): ReactElement {
  const decant = useColonyStore((s) => s.decant);
  const style = variant === 'empty-cta' ? styles.emptyStateCta : styles.decantButton;
  return (
    <button
      type="button"
      style={style}
      onClick={() => decant()}
      data-testid="decant-button"
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 5: Create `src/ui/components/EmptyColony.tsx`**

```tsx
import type { ReactElement } from 'react';
import { DecantButton } from './DecantButton';
import { styles } from '../styles';

export function EmptyColony(): ReactElement {
  return (
    <div style={styles.emptyState} data-testid="empty-colony">
      <div style={styles.emptyStateTitle}>Your Colony is empty</div>
      <div style={styles.emptyStateBody}>
        Decant your first Morula to seed the collection.
      </div>
      <DecantButton label="Decant your first Morula" variant="empty-cta" />
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify pass**

Run: `npm test -- tests/ui/DecantButton.test.tsx tests/ui/EmptyColony.test.tsx`
Expected: PASS (3 DecantButton + 2 EmptyColony = 5 new).

Run: `npm test`
Expected: 87 previous + 5 = 92 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/ui/components/DecantButton.tsx src/ui/components/EmptyColony.tsx tests/ui/DecantButton.test.tsx tests/ui/EmptyColony.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): DecantButton + EmptyColony components

DecantButton renders a button that calls useColonyStore.decant() on
click. Optional label prop (default "Decant a Morula") + variant
prop for header vs. empty-cta styling. data-testid="decant-button".

EmptyColony renders the first-launch layout: title "Your Colony is
empty" + one-line explanation + a large DecantButton with the label
"Decant your first Morula". data-testid="empty-colony".

Both components read state directly from useColonyStore — no props
threading. Colony (Task 5) will decide which to render based on
units.length.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Create `Colony` screen — wires everything together, replaces Gallery

**Files:**
- Create: `src/ui/screens/Colony.tsx`
- Create: `tests/ui/colony.test.tsx`
- Modify: `src/App.tsx` — render `<Colony />` (was `<Gallery />`)
- Delete: `src/ui/screens/Gallery.tsx`
- Delete: `tests/ui/gallery.test.tsx`

**Interfaces produced:**
- `<Colony />` — the M3a page. Reads `units` + `lastDecantedId` from store. If `units.length === 0`, renders `<EmptyColony />`. Otherwise renders the header (title, count subtitle, tier legend, `<DecantButton />`) + a CSS Grid of `<SpecimenCard>`s sorted newest-first. Passes `highlighted={u.id === lastDecantedId}` to each card. Runs a `setTimeout` in `useEffect` to auto-clear the highlight after 2000ms.
- `<App />` — now just `<Colony />`

**Global constraints for this task:**
- The highlight-clearing `useEffect` uses `setTimeout` + cleanup — no external libs
- `SpecimenCard` still expects a `DemoRow` shape; we adapt `Unit` → `DemoRow-shaped-object` inside Colony (deriving `tier`, `score`, `base`, `current`, `expressed`, `palette` from the persisted `Unit.genome` at render time). This means the derived fields recompute per render but are cheap and stay derived-not-persisted (per M1 architecture rule)
- Sort by `decantedAt` descending (newest first)
- Do NOT persist tier/score in Unit — always derive from genome

- [ ] **Step 1: Delete `src/ui/screens/Gallery.tsx` and `tests/ui/gallery.test.tsx`**

Run: `rm src/ui/screens/Gallery.tsx tests/ui/gallery.test.tsx`

- [ ] **Step 2: Write failing tests at `tests/ui/colony.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { Colony } from '../../src/ui/screens/Colony';
import { useColonyStore } from '../../src/state/colony';

describe('Colony screen', () => {
  beforeEach(() => {
    useColonyStore.setState({ units: [], nextId: 1, lastDecantedId: null });
    vi.useRealTimers();
  });

  it('renders EmptyColony when there are no units', () => {
    const { getByTestId, queryAllByTestId } = render(<Colony />);
    expect(getByTestId('empty-colony')).toBeDefined();
    expect(queryAllByTestId('specimen-card')).toHaveLength(0);
  });

  it('renders SpecimenCards for each unit, newest first', () => {
    // Manually seed the store — three units with ascending decantedAt
    useColonyStore.setState({
      units: [
        { id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome() },
        { id: 2, seed: 2, decantedAt: 200, genome: makeMinimalGenome() },
        { id: 3, seed: 3, decantedAt: 300, genome: makeMinimalGenome() },
      ],
      nextId: 4,
      lastDecantedId: null,
    });
    const { getAllByTestId } = render(<Colony />);
    const cards = getAllByTestId('specimen-card');
    expect(cards).toHaveLength(3);
    // Newest first: id 3 → 2 → 1
    expect(cards[0]!.getAttribute('data-unit-id')).toBe('3');
    expect(cards[1]!.getAttribute('data-unit-id')).toBe('2');
    expect(cards[2]!.getAttribute('data-unit-id')).toBe('1');
  });

  it('shows the specimen count in the subtitle', () => {
    useColonyStore.setState({
      units: [
        { id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome() },
        { id: 2, seed: 2, decantedAt: 200, genome: makeMinimalGenome() },
      ],
      nextId: 3,
      lastDecantedId: null,
    });
    const { getByText } = render(<Colony />);
    expect(getByText(/2 specimens/i)).toBeDefined();
  });

  it('clicking the header DecantButton adds a unit and highlights it', () => {
    // Seed with one unit so the header (not empty state) shows
    useColonyStore.setState({
      units: [{ id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome() }],
      nextId: 2,
      lastDecantedId: null,
    });
    const { getByTestId, getAllByTestId } = render(<Colony />);
    fireEvent.click(getByTestId('decant-button'));
    const cards = getAllByTestId('specimen-card');
    expect(cards).toHaveLength(2);
    // Newest first — id 2 should be highlighted
    expect(cards[0]!.getAttribute('data-highlighted')).toBe('true');
    expect(cards[1]!.getAttribute('data-highlighted')).toBeNull();
  });

  it('highlight auto-clears after 2000ms', async () => {
    vi.useFakeTimers();
    useColonyStore.setState({
      units: [{ id: 1, seed: 1, decantedAt: 100, genome: makeMinimalGenome() }],
      nextId: 2,
      lastDecantedId: 1,
    });
    const { getAllByTestId } = render(<Colony />);
    expect(getAllByTestId('specimen-card')[0]!.getAttribute('data-highlighted')).toBe('true');

    // Advance time past the 2s highlight duration
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(useColonyStore.getState().lastDecantedId).toBeNull();
    vi.useRealTimers();
  });
});

// Helper: a genome shape that resolves through the sim without errors. Uses the
// baseline allele for every locus, giving a deterministic score-0 "Baseline"
// specimen. Enough for Colony rendering assertions.
function makeMinimalGenome() {
  return {
    loci: {
      musculature:      ['mus_neutral', 'mus_neutral'],
      neural_tissue:    ['neu_neutral', 'neu_neutral'],
      predator_drive:   ['prd_neutral', 'prd_neutral'],
      carapace_density: ['car_neutral', 'car_neutral'],
      metabolism:       ['met_neutral', 'met_neutral'],
      sinew:            ['sin_neutral', 'sin_neutral'],
      vigor:            ['vig_neutral', 'vig_neutral'],
      acuity:           ['acu_neutral', 'acu_neutral'],
      head:             ['head_plain', 'head_plain'],
      carapace:         ['cara_bare', 'cara_bare'],
      locomotion:       ['loco_plain', 'loco_plain'],
      appendage:        ['app_none', 'app_none'],
      eyes:             ['eyes_plain', 'eyes_plain'],
      hide_pattern:     ['hide_plain', 'hide_plain'],
      aberration:       ['ab_none', 'ab_none'],
      palette:          ['pal_ash', 'pal_ash'],
    } as const,
  };
}
```

- [ ] **Step 3: Run to confirm the test file fails**

Run: `npm test -- tests/ui/colony.test.tsx`
Expected: FAIL — `Colony` doesn't exist yet.

- [ ] **Step 4: Create `src/ui/screens/Colony.tsx`**

```tsx
import { useEffect, useMemo, type ReactElement } from 'react';
import type { Unit } from '../../state/types';
import { useColonyStore } from '../../state/colony';
import { expressPhenotype } from '../../sim/genome';
import { computeRarity } from '../../sim/rarity';
import { computeBaseStats, computeCurrentStats } from '../../sim/stats';
import { STATS, type Tier } from '../../sim/types';
import { TERMS } from '../terms';
import { styles, TIER_COLORS } from '../styles';
import { SpecimenCard } from '../components/SpecimenCard';
import { DecantButton } from '../components/DecantButton';
import { EmptyColony } from '../components/EmptyColony';
import type { DemoRow } from '../../sim/__demo__';

const TIERS: readonly Tier[] = ['baseline', 'strain', 'mutant', 'chimera', 'progenitor'];
const HIGHLIGHT_MS = 2000;

/**
 * Derive a DemoRow-shaped view of a Unit so SpecimenCard can consume it
 * unchanged. Everything except id/genome is a pure derivation.
 */
function unitToRow(unit: Unit): DemoRow {
  const phen = expressPhenotype(unit.genome);
  const { score, tier } = computeRarity(unit.genome);
  const base = computeBaseStats(unit.genome);
  const current = computeCurrentStats(unit.genome, 20);
  return {
    seed: unit.seed,
    tier,
    score,
    base,
    current,
    expressed: phen.expressed,
    palette: phen.palette,
  };
}

export function Colony(): ReactElement {
  const units = useColonyStore((s) => s.units);
  const lastDecantedId = useColonyStore((s) => s.lastDecantedId);
  const clearHighlight = useColonyStore((s) => s.clearHighlight);

  // Sort newest-first by decantedAt (stable copy — do not mutate store state)
  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => b.decantedAt - a.decantedAt),
    [units],
  );

  // Auto-clear the highlight 2s after it's set
  useEffect(() => {
    if (lastDecantedId === null) return;
    const t = setTimeout(clearHighlight, HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [lastDecantedId, clearHighlight]);

  if (units.length === 0) {
    return (
      <main style={styles.page}>
        <EmptyColony />
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h1 style={styles.headerTitle}>Morulium</h1>
          <p style={styles.headerSub}>Your Colony — {units.length} specimens</p>
        </div>
        <DecantButton />
      </div>
      <div style={styles.legend} data-testid="tier-legend">
        {TIERS.map((tier) => (
          <span key={tier} style={styles.legendItem}>
            <span style={styles.legendDot(TIER_COLORS[tier])} />
            {TERMS.tiers[tier]}
          </span>
        ))}
      </div>
      <div style={styles.grid} data-testid="colony-grid">
        {sortedUnits.map((unit) => (
          <SpecimenCard
            key={unit.id}
            row={unitToRow(unit)}
            highlighted={unit.id === lastDecantedId}
          />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Modify `src/App.tsx` to render `<Colony />`**

Replace file contents with:

```tsx
import { Colony } from './ui/screens/Colony';

export function App() {
  return <Colony />;
}
```

- [ ] **Step 6: Run Colony tests to verify pass**

Run: `npm test -- tests/ui/colony.test.tsx`
Expected: PASS all 5 tests.

- [ ] **Step 7: Run full suite + typecheck + build**

Run: `npm test`
Expected: 92 (from Task 4) − 2 (gallery.test.tsx deletion) + 5 (colony.test.tsx) = 95 green.

Run: `npm run typecheck`
Expected: clean.

Run: `npm run build`
Expected: build succeeds. Note bundle size (aim ≤ ~56 KB gzipped).

- [ ] **Step 8: Local dev-server smoke check**

Run: `npm run dev` briefly. Open `http://localhost:5173`. Expected:
- If your `localStorage` for the site is empty: EmptyColony renders — "Your Colony is empty" + "Decant your first Morula" CTA
- Click the CTA — first specimen appears in grid with amber highlight border, fades after 2s
- Click again — second specimen appears at top-left (newest-first), highlighted
- Refresh the page — Colony rehydrates (all specimens still there, highlight gone)
- Note any obvious visual issues (button placement, empty-state proportions, highlight not visible, etc.)
- Ctrl-C when done

If you want to reset localStorage during testing, open DevTools console and run:
`localStorage.removeItem('morulium/colony/v1'); location.reload();`

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx src/ui/screens/Colony.tsx tests/ui/colony.test.tsx
git rm src/ui/screens/Gallery.tsx tests/ui/gallery.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): Colony screen replaces Gallery — the M3a interactive loop

Colony reads units + lastDecantedId from useColonyStore. Empty state
renders EmptyColony (title + CTA). Otherwise renders header (title,
"Your Colony — N specimens" subtitle, tier legend, DecantButton) +
a CSS Grid of SpecimenCards sorted newest-first. Each card gets
highlighted={unit.id === lastDecantedId}; a 2s setTimeout in a
useEffect auto-clears the highlight via clearHighlight().

SpecimenCard consumes a DemoRow shape, so Colony derives one from
each Unit via unitToRow(): expressPhenotype + computeRarity +
computeBaseStats + computeCurrentStats. All derivations pure; tier/
score/stats never persisted — always regenerated from Unit.genome.

App.tsx renders <Colony /> (was <Gallery />). Gallery.tsx + its
test deleted; the demo function in src/sim/__demo__.ts stays (used
by scripts/verify-rarity.ts).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** Data model → Task 1 (Unit type). Store + persist → Task 2 (colony.ts + tests). SpecimenCard highlight prop → Task 3. DecantButton + EmptyColony → Task 4. Colony screen + App.tsx wiring + Gallery deletion → Task 5. All spec sections covered.
- **Type consistency:** `Unit`, `useColonyStore`, `STORAGE_KEY`, `highlighted`, `data-highlighted`, `HIGHLIGHT_MS` (2000) — same names/values everywhere they appear.
- **Placeholders:** none — every step has real code or a real command. Test genome shape is authored explicitly in the helper.
- **Task splitting rationale:** T1 = types/scaffolding foundation. T2 = state layer + persistence + state tests. T3 = SpecimenCard extension only (backward-compatible, small isolated diff). T4 = new components in isolation with unit tests. T5 = integration: Colony screen wires everything, replaces Gallery, deletes obsolete files. Each task ends with a runnable+testable state.
- **Deliberate deviations from spec:** none. DecantButton gained an optional `variant` prop (header vs. empty-cta) not explicitly in the spec — but it's a small implementation convenience that the spec's per-variant styles anticipated. If reviewer flags it, it's a park-with-ruling.
- **`vi.setSystemTime` reset:** the store tests use `vi.setSystemTime` to make `Date.now()` deterministic. Every test that touches it also calls `vi.useRealTimers()` at the end — the `beforeEach` resets state but doesn't reset time mocks, so leaving fake time active could bleed into other tests. The Colony highlight test does the same.
- **Bundle target:** spec estimates 52.72 → ~56 KB. If it comes in higher (e.g., >60 KB), the implementer should note that in the Task 5 report — probably fine, but worth flagging.
