# Morulium Onboarding Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the working MVP into a game a first-time player can understand and finish the core loop on, by building the connective/onboarding layer described in `morulium-onboarding-build-prompts (2).md`.

**Architecture:** Nine sequenced phases, each mapping 1:1 to a prompt in the source doc. Each phase produces a working, reviewable slice: Phase 1 lays the shell + locks contract; Phase 2 wraps a save/return session; Phase 3 seeds a first-run state; Phase 4 introduces a data-driven directive spine; Phase 5 uses it to gate advanced surfaces; Phase 6 explains every surface; Phase 7 frames the goal; Phase 8 makes actions legible; Phase 9 backs it with a Registry + hidden dev panel. Zustand `persist` middleware carries all new state; each new field ships with a migration bump so existing saves keep loading. React tab-state stays (no router introduced), extracted behind an `AppShell` that reads a `unlocks` map so Phase 5 can gate without re-plumbing.

**Tech Stack:** TypeScript 5.6, React 18, Zustand 5 (`persist` middleware), Vite 5, Vitest 2, `@testing-library/react` 16, jsdom (per-test via `// @vitest-environment jsdom` pragma).

## Global Constraints

Copy verbatim from `morulium-onboarding-build-prompts (2).md` + `GAME-SPEC.md`. Every task's requirements implicitly include this section.

- **GAME-SPEC.md is the source of truth** (`/GAME-SPEC.md` on disk). Never contradict it; preserve the nine anti-meta invariants in §14 on every change.
- **Ignore aesthetics, stay legible.** Placeholder unstyled UI is fine; no theming, colors, or art. Clear labels, readable structure, obvious affordances, no blank mystery screens. A plain button with a clear label is the target.
- **Never reveal hidden mechanics.** Rarity weights, mission thresholds, dominance, recessive carriers, optimal strategy — all stay hidden. Onboarding teaches *how to act* and *what things are*, never the numbers or optimal play. **Route all player-facing strings through the terms map** (`src/ui/terms.ts`).
- **DNA Lab** = inspect a specimen you already own; early, always-available; **a real screen, not a stub**. **Sequencer** = peek inside a Morula before Decant; late-gated; depends on a deferred model change (see bottom of the prompts doc). Never merge the two.
- **Decant/breed are synchronous in the current code model** — do not add timers, do not treat Morulae as persisted entities. Both are tracked as "Deferred model changes" and each needs its own future prompt outside this plan.
- **Code owns the persist version number.** Every schema addition bumps `version:` in `src/state/colony.ts` (currently `9`) by exactly one, adds a migration branch, extends `partialize`, and adds a test in `tests/state/persist.test.ts` covering (a) the new field's round-trip, (b) the immediate previous-version → current-version branch, and (c) an updated `v1 → current` chain assertion.
- **Test co-location:** every new source file has a matching test file at `tests/<same-relative-path>.test.ts(x)`. UI tests use `// @vitest-environment jsdom` on line 1. Store tests seed state via `useColonyStore.setState({...})` in `beforeEach`; persist tests also `localStorage.clear()`.
- **All player-facing strings go through `src/ui/terms.ts`** (extend, don't fork). Component code compares against internal ids (`'decant'`, `'dna-lab'`, etc.), never against display strings.
- **All test selectors use `data-testid`.** No `getByText` for anything a designer might reword.
- **Commit after every task.** Message format matches recent history: `feat(<scope>): <one-liner>` for new features, `chore(<scope>): …` for wiring/refactor. No `Co-Authored-By` line unless the user has that convention (recent commits don't).

---

## File Structure

Every file created or modified across all 9 phases. Sequenced left→right by first-touch phase. Files touched in multiple phases list the phases in `(P#, P#)`.

### Source files (create)

| Path | Phase(s) | Responsibility |
|---|---|---|
| `src/state/unlocks.ts` | P1, P5 | `SurfaceId` union, `UnlockState`, default map (all unlocked in P1; per-surface locks in P5), pure helpers `isUnlocked(surfaceId, state)`. |
| `src/state/session.ts` | P2 | `AwaySummary` type, `resolveElapsedSince(prevSnapshot, now)` pure function returning income earned, rest gained, injuries healed. |
| `src/state/bootstrap.ts` | P3 | `STARTER_FREE_DECANTS = 3`, `STARTER_SERUM = 200`, `isFirstRun(state)` predicate. |
| `src/state/directives.ts` | P4, P5, P9 | `DirectiveId` union, `Directive` interface, `CHAIN` ordered array, `STANDING` open-ended list, `checkCompletion(activeId, action, state)` returning `nextId \| null`. |
| `src/state/seen.ts` | P6 | `SurfaceId → boolean` map helpers; `hasSeen(state, surface)`, `markSeen(state, surface)`. |
| `src/sim/data/regions.ts` | P7 | `RegionId`, `RegionProfile`, `REGIONS` map. Region 1 wraps existing 3 fronts. |
| `src/state/discovered.ts` | P9 | Set-of-term-keys the player has encountered. |
| `src/ui/definitions.ts` | P6, P9 | In-world one-liner per vocabulary term (Morula, Decant, Harvest, Incursion, Occupation, the Vat, the DNA Lab, tier names, generation). Data only. |
| `src/ui/screens/DNALab.tsx` | P1 | Real screen — pick a specimen, inspect its lineage/rest/injury/tier/generation panel. |
| `src/ui/screens/Registry.tsx` | P1, P9 | Stub in P1 ("Coming soon" + labeled). Real build in P9. |
| `src/ui/screens/ConquestMap.tsx` | P1, P7 | Stub in P1. Real build in P7 (regions frame + fronts). |
| `src/ui/screens/NewGameGate.tsx` | P2 | Landing gate: "Continue" / "New Game" split on load. |
| `src/ui/components/AppShell.tsx` | P1, P5 | Layout wrapper: nav (reads unlocks map), HUD slot, screen slot, no dead-ends. |
| `src/ui/components/StatusHud.tsx` | P1, P4 | Persistent header row: Serum, Colony size/cap, free-Decant count, current directive slot. |
| `src/ui/components/AwaySummary.tsx` | P2 | Modal: "While you were away — Y SR earned, N units fully rested, M injuries healed." |
| `src/ui/components/IntroModal.tsx` | P3 | Skippable in-world premise intro (2–3 short screens or a single card + Begin/Skip). |
| `src/ui/components/DirectiveBanner.tsx` | P4 | Persistent surface for the current directive: title + in-world one-liner. |
| `src/ui/components/RewardToast.tsx` | P4 | Dismissable toast on directive completion + reward grant. |
| `src/ui/components/UnlockedToast.tsx` | P5 | "Unlocked: X — <one-line explanation>". |
| `src/ui/components/FirstVisitCallout.tsx` | P6 | Overlay/banner shown once when a screen is first reached; names purpose + single action. |
| `src/ui/components/TermTooltip.tsx` | P6 | Wrap any vocabulary token; hover/tap → definition. |
| `src/ui/components/ActionToast.tsx` | P8 | Generic "X happened" confirmation. |
| `src/ui/components/IncursionResultSummary.tsx` | P8 | Post-Incursion qualitative summary panel. |
| `src/ui/components/DevPanel.tsx` | P9 | Hidden panel; toggle with `Cmd+Shift+D`; reset, seed, fast-forward. |

### Source files (modify)

| Path | Phase(s) | Change |
|---|---|---|
| `src/App.tsx` | P1, P2, P3, P4, P9 | P1: replace tab switch with `<AppShell>`. P2: gate on `NewGameGate` + mount `AwaySummary`. P3: mount `IntroModal` on first run. P4: pass current directive to shell. P9: register dev-panel keybinding. |
| `src/state/colony.ts` | every phase | New field + migration + partialize per phase. See per-phase tasks. |
| `src/state/persist.ts` | none | Do not touch; version stays in `colony.ts`. |
| `src/state/incursion.ts` | P8 | Extend `dismissIncursion` to preserve last resolution for the summary panel (or add sibling field). |
| `src/state/occupation.ts` | P7 | (Only if region-scoped income aggregation is needed — see P7.) |
| `src/sim/data/fronts.ts` | P7 | Add `regionId` field on each `FrontProfile`. |
| `src/ui/terms.ts` | P1, P6, P7 | Add: `dnaLab`, `conquestMap`, `newGame`, `continue`, `unlocked`, `region`, `directive`, `freeDecant`, plus definitions imported by `definitions.ts`. |
| `src/ui/styles.ts` | P1, P4, P5, P6, P8 | Add: `hudRow`, `navTabLocked`, `directiveBanner`, `unlockedToast`, `firstVisitCallout`, `tooltipBubble`, `actionToast`, `resultSummary`, `devPanel`. |
| `src/ui/screens/Colony.tsx` | P3, P6 | Empty state reads `freeDecantsRemaining`; add first-visit callout hook. |
| `src/ui/screens/Vat.tsx` | P6 | First-visit callout hook; empty-state uses tooltip'd terms. |
| `src/ui/screens/Breed.tsx` | P6 | First-visit callout hook; empty-state uses tooltip'd terms. |
| `src/ui/screens/Incursion.tsx` | P6, P7, P8 | First-visit callout; link to ConquestMap for context; render `IncursionResultSummary` after resolve. |
| `src/ui/screens/Vivarium.tsx` | P6 | First-visit callout hook. |
| `src/ui/components/DecantButton.tsx` | P3 | Label distinguishes "Decant (free ×N)" vs "Decant". |
| `src/ui/components/EmptyColony.tsx` | P3, P6 | Copy reflects starter Decants; tooltip terms. |

### Test files (create)

Every source file created above gets a matching test at `tests/<same-relative-path>.test.ts(x)`. Additional cross-cutting test files:

| Path | Phase | Purpose |
|---|---|---|
| `tests/state/persist.migrations-p1-p9.test.ts` | each phase adds cases | Round-trip + previous-version-branch + `v1→current` chain per version bump. Existing `tests/state/persist.test.ts` is the model. |
| `tests/ui/onboarding-flow.test.tsx` | P4, P5, P9 | End-to-end: fresh state → first directive → complete it → unlock fires → reset via dev panel restores fresh state. |

### Deletions

None. Every existing file stays.

---

## Phase 1 — App shell, navigation & persistent status HUD

**Goal:** Every surface reachable from one shell, resources always visible, locks-map contract established (all-unlocked in P1, populated in P5). No dead-ends.

### Task 1.1: `unlocks` state module + first migration (v9 → v10)

**Files:**
- Create: `src/state/unlocks.ts`
- Modify: `src/state/colony.ts` (add `unlocks` field, extend `partialize`, add migration branch `from < 10`, bump `version: 10`)
- Test: `tests/state/unlocks.test.ts` (new); `tests/state/persist.test.ts` (append v9→v10 cases)

**Interfaces:**
- Produces:
  ```ts
  export type SurfaceId =
    | 'colony' | 'dna-lab' | 'breed' | 'vat' | 'incursion'
    | 'vivarium' | 'conquest-map' | 'sequencer' | 'registry';
  export type UnlockStatus = 'unlocked' | 'locked';
  export interface UnlockState { readonly status: UnlockStatus; readonly reason?: string }
  export type UnlocksMap = Readonly<Record<SurfaceId, UnlockState>>;
  export const DEFAULT_UNLOCKS: UnlocksMap;  // every surface 'unlocked' in P1
  export function isUnlocked(map: UnlocksMap, id: SurfaceId): boolean;
  ```
- Store gains: `readonly unlocks: UnlocksMap`.

- [ ] **Step 1.1.1: Write failing test for `DEFAULT_UNLOCKS` shape**

Create `tests/state/unlocks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_UNLOCKS, isUnlocked, type SurfaceId } from '../../src/state/unlocks';

describe('unlocks defaults', () => {
  it('exposes every SurfaceId with status unlocked', () => {
    const ids: readonly SurfaceId[] = [
      'colony', 'dna-lab', 'breed', 'vat', 'incursion',
      'vivarium', 'conquest-map', 'sequencer', 'registry',
    ];
    for (const id of ids) {
      expect(DEFAULT_UNLOCKS[id]).toBeDefined();
      expect(DEFAULT_UNLOCKS[id].status).toBe('unlocked');
    }
  });

  it('isUnlocked returns true for the default map on every surface', () => {
    for (const id of Object.keys(DEFAULT_UNLOCKS) as SurfaceId[]) {
      expect(isUnlocked(DEFAULT_UNLOCKS, id)).toBe(true);
    }
  });
});
```

- [ ] **Step 1.1.2: Run test to verify it fails**

Run: `npx vitest run tests/state/unlocks.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 1.1.3: Create the `unlocks` module**

Create `src/state/unlocks.ts`:

```ts
export type SurfaceId =
  | 'colony'
  | 'dna-lab'
  | 'breed'
  | 'vat'
  | 'incursion'
  | 'vivarium'
  | 'conquest-map'
  | 'sequencer'
  | 'registry';

export type UnlockStatus = 'unlocked' | 'locked';

export interface UnlockState {
  readonly status: UnlockStatus;
  readonly reason?: string;
}

export type UnlocksMap = Readonly<Record<SurfaceId, UnlockState>>;

const UNLOCKED: UnlockState = { status: 'unlocked' };

export const DEFAULT_UNLOCKS: UnlocksMap = {
  colony:         UNLOCKED,
  'dna-lab':      UNLOCKED,
  breed:          UNLOCKED,
  vat:            UNLOCKED,
  incursion:      UNLOCKED,
  vivarium:       UNLOCKED,
  'conquest-map': UNLOCKED,
  sequencer:      UNLOCKED,
  registry:       UNLOCKED,
};

export function isUnlocked(map: UnlocksMap, id: SurfaceId): boolean {
  return map[id].status === 'unlocked';
}
```

- [ ] **Step 1.1.4: Run test to verify it passes**

Run: `npx vitest run tests/state/unlocks.test.ts`
Expected: PASS (both cases).

- [ ] **Step 1.1.5: Wire `unlocks` into the store + persist + migration**

In `src/state/colony.ts`:

1. Add import at top of file (alongside other state imports):
   ```ts
   import { DEFAULT_UNLOCKS, type UnlocksMap } from './unlocks';
   ```
2. Add field to `interface ColonyStore` (after `lastRestTickAt`):
   ```ts
   readonly unlocks: UnlocksMap;
   ```
3. Add initial value in the store factory (mirror the other initial values around line 174–188):
   ```ts
   unlocks: DEFAULT_UNLOCKS,
   ```
4. In `partialize` (around line 759), add `unlocks: state.unlocks,` before the closing `}`.
5. Bump the persist config: change `version: 9,` → `version: 10,`.
6. Append a migration branch (after the `if (from < 9)` block, before `return s;`):
   ```ts
   if (from < 10) {
     s = { ...s, unlocks: (s as Partial<ColonyStore>).unlocks ?? DEFAULT_UNLOCKS };
   }
   ```

- [ ] **Step 1.1.6: Write failing test for the migration**

Append to `tests/state/persist.test.ts`:

```ts
  it('M-onboarding unlocks field persists across a rehydration cycle', () => {
    useColonyStore.setState({ unlocks: DEFAULT_UNLOCKS });
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.state.unlocks).toEqual(DEFAULT_UNLOCKS);
    expect(parsed.version).toBe(10);
  });

  it('migrate v9 → v10 adds DEFAULT_UNLOCKS', async () => {
    const v9Shape = {
      state: {
        units: [], nextId: 1,
        harvestsToday: 0, harvestDayKey: '2026-08-05', droughtCount: 0,
        breedsToday: 0, breedDayKey: '2026-08-05',
        fronts: FRESH_FRONTS,
        serum: 200, stims: 0, lastGarrisonTickAt: 1_700_000_000_000,
        buildings: { barracks: false, medbay: false },
        lastRestTickAt: 1_700_000_000_000,
      },
      version: 9,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v9Shape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    expect(s.unlocks).toEqual(DEFAULT_UNLOCKS);
  });
```

Add the import at the top of `tests/state/persist.test.ts`:

```ts
import { DEFAULT_UNLOCKS } from '../../src/state/unlocks';
```

Also update the existing `parsed.version === 9` assertions in the file: replace every `.toBe(9)` on `parsed.version` (six locations at time of writing) with `.toBe(10)`. Grep the file to confirm.

Also update the `v1 → v9` chain test (line ~592) to `v1 → v10` — rename `it(...)` title and add `expect(s.unlocks).toEqual(DEFAULT_UNLOCKS);` at the bottom.

- [ ] **Step 1.1.7: Run persist tests to verify**

Run: `npx vitest run tests/state/persist.test.ts`
Expected: PASS — all previously-passing tests plus the two new ones.

- [ ] **Step 1.1.8: Run full typecheck + suite**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 1.1.9: Commit**

```bash
git add src/state/unlocks.ts src/state/colony.ts tests/state/unlocks.test.ts tests/state/persist.test.ts
git commit -m "feat(state): unlocks map + persist v10 (P1 Task 1.1)"
```

### Task 1.2: `StatusHud` component (Serum, Colony/cap, freeDecants stub, directive stub)

**Files:**
- Create: `src/ui/components/StatusHud.tsx`, `tests/ui/StatusHud.test.tsx`
- Modify: `src/ui/styles.ts` (add `hudRow`, `hudItem`, `hudDirectiveEmpty`), `src/ui/terms.ts` (add `freeDecant`, `directive`)

**Interfaces:**
- Consumes: `useColonyStore` — reads `serum`, `units.length`, `buildings` (for cap via existing `capOf`).
- Produces:
  ```tsx
  export function StatusHud(props: { directiveText: string | null }): ReactElement;
  ```
  Renders a row with `data-testid="status-hud"` containing four items: `hud-serum`, `hud-colony-cap`, `hud-free-decants`, `hud-directive`.

- [ ] **Step 1.2.1: Extend `TERMS` with `freeDecant` and `directive`**

In `src/ui/terms.ts` (append inside the `as const` object):

```ts
  freeDecant:  'Free Decant',
  directive:   'Directive',
  dnaLab:      'the DNA Lab',
  conquestMap: 'Conquest Map',
  newGame:     'New Game',
  continueGame:'Continue',
  unlocked:    'Unlocked',
  region:      'Region',
```

- [ ] **Step 1.2.2: Add HUD styles**

In `src/ui/styles.ts` (inside the `styles` object, before the closing `}`):

```ts
  hudRow: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    padding: '8px 24px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    color: '#334155',
    maxWidth: 1400,
    margin: '0 auto',
  } as CSSProperties,

  hudItem: {
    padding: '2px 8px',
    borderRadius: 4,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  } as CSSProperties,

  hudDirectiveEmpty: {
    color: '#94a3b8',
    fontStyle: 'italic',
  } as CSSProperties,

  navTabLocked: {
    padding: '10px 16px',
    borderRadius: '6px 6px 0 0',
    border: 'none',
    background: 'transparent',
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'not-allowed',
    fontFamily: 'inherit',
    borderBottom: '2px solid transparent',
  } as CSSProperties,
```

- [ ] **Step 1.2.3: Write failing test for `StatusHud`**

Create `tests/ui/StatusHud.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { StatusHud } from '../../src/ui/components/StatusHud';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { DEFAULT_UNLOCKS } from '../../src/state/unlocks';

function seed(overrides: Partial<Parameters<typeof useColonyStore.setState>[0]> = {}) {
  useColonyStore.setState({
    units: [], nextId: 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0,
    breedsToday: 0, breedDayKey: todayLocalKey(),
    fronts: FRESH_FRONTS, activeIncursion: null,
    serum: 200, stims: 0, lastGarrisonTickAt: Date.now(),
    buildings: { barracks: false, medbay: false },
    lastRestTickAt: Date.now(),
    unlocks: DEFAULT_UNLOCKS,
    ...overrides,
  });
}

describe('StatusHud', () => {
  beforeEach(() => { localStorage.clear(); seed(); });
  afterEach(() => cleanup());

  it('renders the four HUD items', () => {
    const { getByTestId } = render(<StatusHud directiveText={null} />);
    expect(getByTestId('status-hud')).toBeDefined();
    expect(getByTestId('hud-serum').textContent).toContain('200');
    expect(getByTestId('hud-colony-cap').textContent).toContain('0/20');
    expect(getByTestId('hud-free-decants')).toBeDefined();
    expect(getByTestId('hud-directive')).toBeDefined();
  });

  it('shows a placeholder when directiveText is null', () => {
    const { getByTestId } = render(<StatusHud directiveText={null} />);
    expect(getByTestId('hud-directive').textContent).toMatch(/no directive/i);
  });

  it('shows the directive when provided', () => {
    const { getByTestId } = render(<StatusHud directiveText="Decant your first specimen" />);
    expect(getByTestId('hud-directive').textContent).toContain('Decant your first specimen');
  });

  it('reflects Barracks-raised cap', () => {
    seed({ buildings: { barracks: true, medbay: false } });
    const { getByTestId } = render(<StatusHud directiveText={null} />);
    expect(getByTestId('hud-colony-cap').textContent).toContain('0/40');
  });
});
```

- [ ] **Step 1.2.4: Run test to verify it fails**

Run: `npx vitest run tests/ui/StatusHud.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 1.2.5: Implement `StatusHud`**

Create `src/ui/components/StatusHud.tsx`:

```tsx
import type { ReactElement } from 'react';
import { useColonyStore, capOf } from '../../state/colony';
import { TERMS } from '../terms';
import { styles } from '../styles';

export function StatusHud(props: { directiveText: string | null }): ReactElement {
  const serum = useColonyStore((s) => s.serum);
  const unitCount = useColonyStore((s) => s.units.length);
  const buildings = useColonyStore((s) => s.buildings);
  const cap = capOf({ buildings });

  return (
    <div style={styles.hudRow} data-testid="status-hud">
      <span style={styles.hudItem} data-testid="hud-serum">
        {TERMS.serumAbbr} {serum}
      </span>
      <span style={styles.hudItem} data-testid="hud-colony-cap">
        {TERMS.colony} {unitCount}/{cap}
      </span>
      <span style={styles.hudItem} data-testid="hud-free-decants">
        {TERMS.freeDecant} 0
      </span>
      <span
        style={props.directiveText ? styles.hudItem : { ...styles.hudItem, ...styles.hudDirectiveEmpty }}
        data-testid="hud-directive"
      >
        {TERMS.directive}: {props.directiveText ?? 'No directive'}
      </span>
    </div>
  );
}
```

(Task 3.x will replace the hardcoded `0` with `useColonyStore(s => s.freeDecantsRemaining)`.)

- [ ] **Step 1.2.6: Run test to verify it passes**

Run: `npx vitest run tests/ui/StatusHud.test.tsx`
Expected: PASS (four cases).

- [ ] **Step 1.2.7: Commit**

```bash
git add src/ui/components/StatusHud.tsx tests/ui/StatusHud.test.tsx src/ui/styles.ts src/ui/terms.ts
git commit -m "feat(ui): StatusHud component with serum/cap/free-decant/directive slots (P1 Task 1.2)"
```

### Task 1.3: Registry stub screen

**Files:**
- Create: `src/ui/screens/Registry.tsx`, `tests/ui/Registry.test.tsx`

**Interfaces:**
- Produces: `export function Registry(): ReactElement;` renders `data-testid="registry-screen"` and an explanatory placeholder.

- [ ] **Step 1.3.1: Write failing test**

Create `tests/ui/Registry.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Registry } from '../../src/ui/screens/Registry';

describe('Registry (stub)', () => {
  afterEach(() => cleanup());

  it('renders the stub screen with a testid', () => {
    const { getByTestId } = render(<Registry />);
    expect(getByTestId('registry-screen')).toBeDefined();
  });

  it('names what the Registry is, not just "coming soon"', () => {
    const { getByTestId } = render(<Registry />);
    const text = getByTestId('registry-screen').textContent ?? '';
    expect(text.toLowerCase()).toContain('registry');
    expect(text.length).toBeGreaterThan(20);
  });
});
```

- [ ] **Step 1.3.2: Run test to verify it fails**

Run: `npx vitest run tests/ui/Registry.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 1.3.3: Implement the stub**

Create `src/ui/screens/Registry.tsx`:

```tsx
import type { ReactElement } from 'react';
import { styles } from '../styles';
import { TERMS } from '../terms';

export function Registry(): ReactElement {
  return (
    <main style={styles.page} data-testid="registry-screen">
      <h1 style={styles.headerTitle}>{TERMS.registry}</h1>
      <p style={styles.headerSub}>
        {TERMS.registry} catalogs the vocabulary and history you have encountered so far.
        It will fill in as you play.
      </p>
    </main>
  );
}
```

- [ ] **Step 1.3.4: Run test to verify it passes**

Run: `npx vitest run tests/ui/Registry.test.tsx`
Expected: PASS.

- [ ] **Step 1.3.5: Commit**

```bash
git add src/ui/screens/Registry.tsx tests/ui/Registry.test.tsx
git commit -m "feat(ui): Registry stub screen (P1 Task 1.3)"
```

### Task 1.4: ConquestMap stub screen

**Files:**
- Create: `src/ui/screens/ConquestMap.tsx`, `tests/ui/ConquestMap.test.tsx`

**Interfaces:**
- Produces: `export function ConquestMap(): ReactElement;` renders `data-testid="conquest-map-screen"`.

- [ ] **Step 1.4.1: Write failing test**

Create `tests/ui/ConquestMap.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ConquestMap } from '../../src/ui/screens/ConquestMap';

describe('ConquestMap (stub)', () => {
  afterEach(() => cleanup());

  it('renders the stub with a testid', () => {
    const { getByTestId } = render(<ConquestMap />);
    expect(getByTestId('conquest-map-screen')).toBeDefined();
  });

  it('mentions conquest and hints the map is coming', () => {
    const { getByTestId } = render(<ConquestMap />);
    const text = getByTestId('conquest-map-screen').textContent ?? '';
    expect(text.toLowerCase()).toMatch(/conquest|region|map/);
  });
});
```

- [ ] **Step 1.4.2: Run test to verify it fails**

Run: `npx vitest run tests/ui/ConquestMap.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 1.4.3: Implement the stub**

Create `src/ui/screens/ConquestMap.tsx`:

```tsx
import type { ReactElement } from 'react';
import { styles } from '../styles';
import { TERMS } from '../terms';

export function ConquestMap(): ReactElement {
  return (
    <main style={styles.page} data-testid="conquest-map-screen">
      <h1 style={styles.headerTitle}>{TERMS.conquestMap}</h1>
      <p style={styles.headerSub}>
        The map view of the fronts you can pressure and hold. The full map lands in a later step;
        for now, launch Incursions from the {TERMS.incursion} screen.
      </p>
    </main>
  );
}
```

- [ ] **Step 1.4.4: Run test to verify it passes**

Run: `npx vitest run tests/ui/ConquestMap.test.tsx`
Expected: PASS.

- [ ] **Step 1.4.5: Commit**

```bash
git add src/ui/screens/ConquestMap.tsx tests/ui/ConquestMap.test.tsx
git commit -m "feat(ui): ConquestMap stub screen (P1 Task 1.4)"
```

### Task 1.5: DNA Lab screen (real inspection view)

**Files:**
- Create: `src/ui/screens/DNALab.tsx`, `tests/ui/DNALab.test.tsx`

**Interfaces:**
- Consumes: `useColonyStore` — `units`, `fronts` (via existing `garrisonedAtFor`).
- Produces: `export function DNALab(): ReactElement;`
- Behavior: renders `data-testid="dna-lab-screen"`. If no units, renders `data-testid="dna-lab-empty"` with a hint. If units exist, renders a picker (`data-testid="dna-lab-picker"`) with one row per unit (`data-testid="dna-lab-row-<id>"`). Clicking a row selects it; a detail panel (`data-testid="dna-lab-detail"`) shows the picked unit's id, tier, generation, lineage (`pristine` vs `bred from <a>×<b>`), rest state, and injury state. **No stats numbers, no rarity score, no allele weights** — tier name yes, tier score no.

- [ ] **Step 1.5.1: Write failing test**

Create `tests/ui/DNALab.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { DNALab } from '../../src/ui/screens/DNALab';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { DEFAULT_UNLOCKS } from '../../src/state/unlocks';
import { REST_MAX } from '../../src/state/rest';

function seed(units = [] as Parameters<typeof useColonyStore.setState>[0]['units']) {
  useColonyStore.setState({
    units, nextId: (units?.length ?? 0) + 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0,
    breedsToday: 0, breedDayKey: todayLocalKey(),
    fronts: FRESH_FRONTS, activeIncursion: null,
    serum: 0, stims: 0, lastGarrisonTickAt: Date.now(),
    buildings: { barracks: false, medbay: false },
    lastRestTickAt: Date.now(),
    unlocks: DEFAULT_UNLOCKS,
  });
}

describe('DNA Lab', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => cleanup());

  it('shows empty state when there are no units', () => {
    seed([]);
    const { getByTestId, queryByTestId } = render(<DNALab />);
    expect(getByTestId('dna-lab-screen')).toBeDefined();
    expect(getByTestId('dna-lab-empty')).toBeDefined();
    expect(queryByTestId('dna-lab-picker')).toBeNull();
  });

  it('lists units in the picker and shows detail when a row is clicked', () => {
    useColonyStore.setState({
      units: [{
        id: 7, seed: 7, decantedAt: 100, genome: { loci: {} },
        generation: 0, parentIds: null, wear: {},
        restCurrent: REST_MAX, injuredUntil: null, culled: false,
      }],
      nextId: 8, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS, activeIncursion: null,
      serum: 0, stims: 0, lastGarrisonTickAt: Date.now(),
      buildings: { barracks: false, medbay: false },
      lastRestTickAt: Date.now(),
      unlocks: DEFAULT_UNLOCKS,
    });
    const { getByTestId } = render(<DNALab />);
    expect(getByTestId('dna-lab-picker')).toBeDefined();
    fireEvent.click(getByTestId('dna-lab-row-7'));
    const detail = getByTestId('dna-lab-detail');
    expect(detail.textContent).toContain('7');           // id
    expect(detail.textContent?.toLowerCase()).toContain('pristine');
    expect(detail.textContent?.toLowerCase()).toContain('generation');
  });

  it('does not expose numeric rarity score or stat numbers', () => {
    useColonyStore.setState({
      units: [{
        id: 1, seed: 1, decantedAt: 1, genome: { loci: {} },
        generation: 0, parentIds: null, wear: {},
        restCurrent: REST_MAX, injuredUntil: null, culled: false,
      }],
      nextId: 2, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS, activeIncursion: null,
      serum: 0, stims: 0, lastGarrisonTickAt: Date.now(),
      buildings: { barracks: false, medbay: false },
      lastRestTickAt: Date.now(),
      unlocks: DEFAULT_UNLOCKS,
    });
    const { getByTestId } = render(<DNALab />);
    fireEvent.click(getByTestId('dna-lab-row-1'));
    const text = getByTestId('dna-lab-detail').textContent ?? '';
    expect(text).not.toMatch(/score[:\s]+\d/i);
    expect(text).not.toMatch(/\bPWR[:\s]+\d/);
    expect(text).not.toMatch(/\bINT[:\s]+\d/);
  });
});
```

- [ ] **Step 1.5.2: Run test to verify it fails**

Run: `npx vitest run tests/ui/DNALab.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 1.5.3: Implement the DNA Lab**

Create `src/ui/screens/DNALab.tsx`:

```tsx
import { useState, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { computeRarity } from '../../sim/rarity';
import { TERMS } from '../terms';
import { styles } from '../styles';

export function DNALab(): ReactElement {
  const units = useColonyStore((s) => s.units);
  const [pickedId, setPickedId] = useState<number | null>(null);

  if (units.length === 0) {
    return (
      <main style={styles.page} data-testid="dna-lab-screen">
        <h1 style={styles.headerTitle}>{TERMS.dnaLab}</h1>
        <div style={styles.emptyState} data-testid="dna-lab-empty">
          <p style={styles.emptyStateTitle}>No specimens to inspect yet</p>
          <p style={styles.emptyStateBody}>
            {TERMS.decant} a {TERMS.morula} on the {TERMS.colony} screen, then come back here.
          </p>
        </div>
      </main>
    );
  }

  const picked = pickedId === null ? null : units.find((u) => u.id === pickedId) ?? null;

  return (
    <main style={styles.page} data-testid="dna-lab-screen">
      <h1 style={styles.headerTitle}>{TERMS.dnaLab}</h1>
      <p style={styles.headerSub}>Inspect a specimen you already own.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
        <ul
          data-testid="dna-lab-picker"
          style={{ listStyle: 'none', padding: 0, margin: 0, borderRight: '1px solid #e2e8f0' }}
        >
          {[...units].sort((a, b) => b.decantedAt - a.decantedAt || b.id - a.id).map((u) => (
            <li key={u.id}>
              <button
                type="button"
                data-testid={`dna-lab-row-${u.id}`}
                onClick={() => setPickedId(u.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  background: pickedId === u.id ? '#f1f5f9' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  fontSize: 13,
                }}
              >
                #{u.id} · {TERMS.tiers[computeRarity(u.genome).tier]}
              </button>
            </li>
          ))}
        </ul>

        <div data-testid="dna-lab-detail">
          {picked === null ? (
            <p style={{ color: '#94a3b8' }}>Select a specimen from the list.</p>
          ) : (
            <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 6 }}>
              <dt>ID</dt><dd>#{picked.id}</dd>
              <dt>Tier</dt><dd>{TERMS.tiers[computeRarity(picked.genome).tier]}</dd>
              <dt>Generation</dt><dd>{picked.generation}</dd>
              <dt>Lineage</dt>
              <dd>
                {picked.parentIds === null
                  ? 'pristine'
                  : `bred from #${picked.parentIds[0]} × #${picked.parentIds[1]}`}
              </dd>
              <dt>Rest</dt><dd>{Math.floor(picked.restCurrent)}</dd>
              <dt>Status</dt>
              <dd>
                {picked.injuredUntil !== null && picked.injuredUntil > Date.now()
                  ? 'injured — benched'
                  : 'ready'}
              </dd>
            </dl>
          )}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 1.5.4: Run test to verify it passes**

Run: `npx vitest run tests/ui/DNALab.test.tsx`
Expected: PASS (three cases).

- [ ] **Step 1.5.5: Commit**

```bash
git add src/ui/screens/DNALab.tsx tests/ui/DNALab.test.tsx
git commit -m "feat(ui): DNA Lab specimen inspection screen (P1 Task 1.5)"
```

### Task 1.6: `AppShell` — nav reads unlocks, HUD always visible

**Files:**
- Create: `src/ui/components/AppShell.tsx`, `tests/ui/AppShell.test.tsx`
- Modify: `src/App.tsx` (replace tab switcher with AppShell + all 7 destinations)

**Interfaces:**
- Consumes: `useColonyStore` — reads `unlocks`; `StatusHud` component.
- Produces: `export function AppShell(props: { current: SurfaceId; onNavigate: (id: SurfaceId) => void; directiveText: string | null; children: React.ReactNode }): ReactElement;`
- Nav: `data-testid="nav-tab-<surfaceId>"` for every surface. `disabled` + `styles.navTabLocked` when `isUnlocked(unlocks, surfaceId)` is false. Clicking a locked tab does nothing.

- [ ] **Step 1.6.1: Write failing test**

Create `tests/ui/AppShell.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { AppShell } from '../../src/ui/components/AppShell';
import { useColonyStore } from '../../src/state/colony';
import { DEFAULT_UNLOCKS, type SurfaceId } from '../../src/state/unlocks';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';

const ALL_SURFACES: readonly SurfaceId[] = [
  'colony', 'dna-lab', 'breed', 'vat', 'incursion',
  'vivarium', 'conquest-map', 'sequencer', 'registry',
];

function seed(unlocks = DEFAULT_UNLOCKS) {
  useColonyStore.setState({
    units: [], nextId: 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0,
    breedsToday: 0, breedDayKey: todayLocalKey(),
    fronts: FRESH_FRONTS, activeIncursion: null,
    serum: 200, stims: 0, lastGarrisonTickAt: Date.now(),
    buildings: { barracks: false, medbay: false },
    lastRestTickAt: Date.now(),
    unlocks,
  });
}

describe('AppShell', () => {
  beforeEach(() => { localStorage.clear(); seed(); });
  afterEach(() => cleanup());

  it('renders a nav tab for every surface', () => {
    const { getByTestId } = render(
      <AppShell current="colony" onNavigate={() => {}} directiveText={null}>
        <div data-testid="child" />
      </AppShell>,
    );
    for (const id of ALL_SURFACES) {
      expect(getByTestId(`nav-tab-${id}`)).toBeDefined();
    }
    expect(getByTestId('status-hud')).toBeDefined();
    expect(getByTestId('child')).toBeDefined();
  });

  it('calls onNavigate when an unlocked tab is clicked', () => {
    const spy = vi.fn();
    const { getByTestId } = render(
      <AppShell current="colony" onNavigate={spy} directiveText={null}>
        <div />
      </AppShell>,
    );
    fireEvent.click(getByTestId('nav-tab-dna-lab'));
    expect(spy).toHaveBeenCalledWith('dna-lab');
  });

  it('renders locked tabs with disabled state and does not fire onNavigate', () => {
    seed({
      ...DEFAULT_UNLOCKS,
      vat: { status: 'locked', reason: 'complete an Incursion first' },
    });
    const spy = vi.fn();
    const { getByTestId } = render(
      <AppShell current="colony" onNavigate={spy} directiveText={null}>
        <div />
      </AppShell>,
    );
    const vatTab = getByTestId('nav-tab-vat') as HTMLButtonElement;
    expect(vatTab.disabled).toBe(true);
    fireEvent.click(vatTab);
    expect(spy).not.toHaveBeenCalled();
  });

  it('forwards directiveText to the HUD', () => {
    const { getByTestId } = render(
      <AppShell current="colony" onNavigate={() => {}} directiveText="Decant your first specimen">
        <div />
      </AppShell>,
    );
    expect(getByTestId('hud-directive').textContent).toContain('Decant your first specimen');
  });
});
```

- [ ] **Step 1.6.2: Run test to verify it fails**

Run: `npx vitest run tests/ui/AppShell.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 1.6.3: Implement `AppShell`**

Create `src/ui/components/AppShell.tsx`:

```tsx
import type { ReactElement, ReactNode } from 'react';
import { useColonyStore } from '../../state/colony';
import { isUnlocked, type SurfaceId } from '../../state/unlocks';
import { TERMS } from '../terms';
import { styles } from '../styles';
import { StatusHud } from './StatusHud';

const ORDER: readonly SurfaceId[] = [
  'colony', 'dna-lab', 'breed', 'incursion',
  'conquest-map', 'vivarium', 'vat', 'sequencer', 'registry',
];

const LABELS: Readonly<Record<SurfaceId, string>> = {
  'colony':       TERMS.colony,
  'dna-lab':      TERMS.dnaLab,
  'breed':        'Breed',
  'incursion':    TERMS.incursion,
  'conquest-map': TERMS.conquestMap,
  'vivarium':     TERMS.vivarium,
  'vat':          TERMS.vat,
  'sequencer':    TERMS.sequencer,
  'registry':     TERMS.registry,
};

export function AppShell(props: {
  current: SurfaceId;
  onNavigate: (id: SurfaceId) => void;
  directiveText: string | null;
  children: ReactNode;
}): ReactElement {
  const unlocks = useColonyStore((s) => s.unlocks);

  return (
    <>
      <nav style={styles.nav}>
        {ORDER.map((id) => {
          const unlocked = isUnlocked(unlocks, id);
          const isCurrent = props.current === id;
          const style = !unlocked
            ? styles.navTabLocked
            : isCurrent
              ? styles.navTabActive
              : styles.navTab;
          return (
            <button
              key={id}
              type="button"
              style={style}
              disabled={!unlocked}
              onClick={() => unlocked && props.onNavigate(id)}
              data-testid={`nav-tab-${id}`}
              title={!unlocked && unlocks[id].reason ? unlocks[id].reason : undefined}
            >
              {LABELS[id]}
            </button>
          );
        })}
      </nav>
      <StatusHud directiveText={props.directiveText} />
      {props.children}
    </>
  );
}
```

- [ ] **Step 1.6.4: Run test to verify it passes**

Run: `npx vitest run tests/ui/AppShell.test.tsx`
Expected: PASS (four cases).

- [ ] **Step 1.6.5: Rewrite `src/App.tsx` to use `AppShell`**

Replace the entire contents of `src/App.tsx`:

```tsx
import { useState, type ReactElement } from 'react';
import type { SurfaceId } from './state/unlocks';
import { AppShell } from './ui/components/AppShell';
import { Colony } from './ui/screens/Colony';
import { DNALab } from './ui/screens/DNALab';
import { Breed } from './ui/screens/Breed';
import { Incursion } from './ui/screens/Incursion';
import { ConquestMap } from './ui/screens/ConquestMap';
import { Vivarium } from './ui/screens/Vivarium';
import { Vat } from './ui/screens/Vat';
import { Registry } from './ui/screens/Registry';

export function App(): ReactElement {
  const [current, setCurrent] = useState<SurfaceId>('colony');

  const screen = (() => {
    switch (current) {
      case 'colony':       return <Colony />;
      case 'dna-lab':      return <DNALab />;
      case 'breed':        return <Breed />;
      case 'incursion':    return <Incursion />;
      case 'conquest-map': return <ConquestMap />;
      case 'vivarium':     return <Vivarium />;
      case 'vat':          return <Vat />;
      case 'sequencer':    return <Registry />;   // temporary until deferred model change
      case 'registry':     return <Registry />;
    }
  })();

  return (
    <AppShell current={current} onNavigate={setCurrent} directiveText={null}>
      {screen}
    </AppShell>
  );
}
```

(`sequencer` reuses `<Registry />` intentionally — the real Sequencer needs the deferred Morula-as-entity model change; the nav entry exists so the shell contract is complete.)

- [ ] **Step 1.6.6: Update existing `tests/ui/App.test.tsx`**

The existing test file uses old testids like `nav-tab-colony` (still valid) but assumes only 5 tabs and no HUD. Update:

1. Change any `expect(getByTestId('serum-badge')).toBeDefined()` etc. to use the new `hud-serum` testid, matching the copy shape `'SR 200'`.
2. Add assertions for the new nav tabs: `dna-lab`, `conquest-map`, `sequencer`, `registry`.
3. The three test-setups (`beforeEach`) already seed store state — add `unlocks: DEFAULT_UNLOCKS` to each and import it: `import { DEFAULT_UNLOCKS } from '../../src/state/unlocks';`.
4. Add a new `it()`: "renders every nav tab" that loops the 9 surface ids and asserts each testid exists.

Concrete patch — apply to the existing `beforeEach` calls (there are three):

```ts
// Add DEFAULT_UNLOCKS import at top
import { DEFAULT_UNLOCKS } from '../../src/state/unlocks';

// Inside each beforeEach's setState, add:
      unlocks: DEFAULT_UNLOCKS,

// Replace this old test:
  it('renders SerumBadge in the nav on default state', () => { ... });

// with:
  it('renders StatusHud with serum in the header', () => {
    const { getByTestId } = render(<App />);
    const item = getByTestId('hud-serum');
    expect(item.textContent).toContain('200');
  });

// Add a new test:
  it('renders every nav tab (9 surfaces)', () => {
    const { getByTestId } = render(<App />);
    for (const id of [
      'colony','dna-lab','breed','incursion',
      'conquest-map','vivarium','vat','sequencer','registry',
    ]) {
      expect(getByTestId(`nav-tab-${id}`)).toBeDefined();
    }
  });
```

- [ ] **Step 1.6.7: Run full test suite**

Run: `npm run typecheck && npm test`
Expected: PASS. `tests/ui/App.test.tsx` and everything downstream still green.

- [ ] **Step 1.6.8: Commit**

```bash
git add src/App.tsx src/ui/components/AppShell.tsx tests/ui/AppShell.test.tsx tests/ui/App.test.tsx
git commit -m "feat(ui): AppShell with locks-driven nav + integrated HUD (P1 Task 1.6)"
```

### Phase 1 done-when check

Manual verification (run once at end of phase, before starting Phase 2):

- [ ] `npm run dev` opens the app; you land on Colony.
- [ ] Every nav tab is visible and clickable. Every click lands on a real screen (Registry/Conquest Map show stub copy — that's expected).
- [ ] The HUD row appears above the screen and shows `SR 200` and `the Colony 0/20` on a fresh load.
- [ ] `localStorage.clear()` in DevTools → reload → same clean state.
- [ ] `npm test` green; `npm run typecheck` green; `npm run build` green.


## Phase 2 — Persistence & session lifecycle

**Goal:** New Game / Continue on load; on return, elapsed-time yield (Occupation), rest, injury already resolve — surface a "while you were away" summary of what changed. **Do not** add Decant/breed timers (deferred model change).

### Task 2.1: `session.ts` module — pure elapsed-time summary

**Files:**
- Create: `src/state/session.ts`, `tests/state/session.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface StoreSnapshot {
    readonly serum: number;
    readonly units: readonly { id: number; restCurrent: number; injuredUntil: number | null }[];
  }
  export interface AwaySummary {
    readonly elapsedMs: number;
    readonly serumEarned: number;      // post − pre
    readonly restGainedTotal: number;  // sum across units
    readonly injuriesHealed: number;   // count where prev.injuredUntil > now-old and new.injuredUntil <= now
  }
  export function summarize(prev: StoreSnapshot, next: StoreSnapshot, prevNow: number, nextNow: number): AwaySummary;
  export function isSignificant(s: AwaySummary): boolean;   // gate for showing the modal
  ```

- [ ] **Step 2.1.1: Write failing test**

Create `tests/state/session.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { summarize, isSignificant } from '../../src/state/session';

describe('summarize', () => {
  it('reports Serum earned as post − pre', () => {
    const prev = { serum: 100, units: [] };
    const next = { serum: 250, units: [] };
    const s = summarize(prev, next, 0, 3_600_000);
    expect(s.elapsedMs).toBe(3_600_000);
    expect(s.serumEarned).toBe(150);
  });

  it('sums per-unit rest gain and counts injuries healed', () => {
    const prev = {
      serum: 0,
      units: [
        { id: 1, restCurrent: 40, injuredUntil: 500 },   // was injured
        { id: 2, restCurrent: 80, injuredUntil: null },
      ],
    };
    const next = {
      serum: 0,
      units: [
        { id: 1, restCurrent: 100, injuredUntil: null }, // healed + rested
        { id: 2, restCurrent: 100, injuredUntil: null }, // rested
      ],
    };
    const s = summarize(prev, next, 0, 1000);
    expect(s.restGainedTotal).toBe(60 + 20);
    expect(s.injuriesHealed).toBe(1);
  });

  it('isSignificant is false when nothing meaningful changed', () => {
    expect(isSignificant({ elapsedMs: 10_000, serumEarned: 0, restGainedTotal: 0, injuriesHealed: 0 })).toBe(false);
  });

  it('isSignificant is true when any of serum/rest/heals moved', () => {
    expect(isSignificant({ elapsedMs: 10_000, serumEarned: 5, restGainedTotal: 0, injuriesHealed: 0 })).toBe(true);
    expect(isSignificant({ elapsedMs: 10_000, serumEarned: 0, restGainedTotal: 10, injuriesHealed: 0 })).toBe(true);
    expect(isSignificant({ elapsedMs: 10_000, serumEarned: 0, restGainedTotal: 0, injuriesHealed: 1 })).toBe(true);
  });
});
```

- [ ] **Step 2.1.2: Run test to verify it fails**

Run: `npx vitest run tests/state/session.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2.1.3: Implement `session.ts`**

Create `src/state/session.ts`:

```ts
export interface UnitSnapshot {
  readonly id: number;
  readonly restCurrent: number;
  readonly injuredUntil: number | null;
}

export interface StoreSnapshot {
  readonly serum: number;
  readonly units: readonly UnitSnapshot[];
}

export interface AwaySummary {
  readonly elapsedMs: number;
  readonly serumEarned: number;
  readonly restGainedTotal: number;
  readonly injuriesHealed: number;
}

export function summarize(
  prev: StoreSnapshot,
  next: StoreSnapshot,
  prevNow: number,
  nextNow: number,
): AwaySummary {
  const byId = new Map(prev.units.map((u) => [u.id, u] as const));
  let restGainedTotal = 0;
  let injuriesHealed = 0;
  for (const nu of next.units) {
    const pu = byId.get(nu.id);
    if (!pu) continue;
    if (nu.restCurrent > pu.restCurrent) restGainedTotal += nu.restCurrent - pu.restCurrent;
    const wasInjured = pu.injuredUntil !== null && pu.injuredUntil > prevNow;
    const stillInjured = nu.injuredUntil !== null && nu.injuredUntil > nextNow;
    if (wasInjured && !stillInjured) injuriesHealed += 1;
  }
  return {
    elapsedMs: nextNow - prevNow,
    serumEarned: next.serum - prev.serum,
    restGainedTotal,
    injuriesHealed,
  };
}

export function isSignificant(s: AwaySummary): boolean {
  return s.serumEarned > 0 || s.restGainedTotal > 0 || s.injuriesHealed > 0;
}
```

- [ ] **Step 2.1.4: Run test to verify it passes**

Run: `npx vitest run tests/state/session.test.ts`
Expected: PASS (four cases).

- [ ] **Step 2.1.5: Commit**

```bash
git add src/state/session.ts tests/state/session.test.ts
git commit -m "feat(state): session summarize() for while-you-were-away deltas (P2 Task 2.1)"
```

### Task 2.2: Store: `resetGame()` action + capture `pendingAwaySummary` on rehydrate

**Files:**
- Modify: `src/state/colony.ts` (add `pendingAwaySummary: AwaySummary | null` transient field + `resetGame` action + `onRehydrateStorage` hook)
- Test: `tests/state/colony.reset.test.ts` (new); extend `tests/state/persist.test.ts`

**Interfaces:**
- Store adds: `readonly pendingAwaySummary: AwaySummary | null; resetGame: () => void; clearAwaySummary: () => void;`
- `pendingAwaySummary` is **transient** — excluded from `partialize` so it never persists.
- `resetGame()` wipes localStorage under `STORAGE_KEY` and resets in-memory store to the initial values (same defaults as the store factory).

- [ ] **Step 2.2.1: Write failing test for `resetGame`**

Create `tests/state/colony.reset.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';
import { STORAGE_KEY } from '../../src/state/persist';
import { SERUM_STARTING_BALANCE } from '../../src/state/serum';
import { DEFAULT_UNLOCKS } from '../../src/state/unlocks';

describe('resetGame', () => {
  beforeEach(() => { localStorage.clear(); });

  it('clears units, restores starting Serum, and empties localStorage snapshot', () => {
    useColonyStore.getState().decant();
    useColonyStore.setState({ serum: 999 });
    expect(useColonyStore.getState().units).toHaveLength(1);

    useColonyStore.getState().resetGame();

    const s = useColonyStore.getState();
    expect(s.units).toEqual([]);
    expect(s.nextId).toBe(1);
    expect(s.serum).toBe(SERUM_STARTING_BALANCE);
    expect(s.unlocks).toEqual(DEFAULT_UNLOCKS);
    // localStorage was refreshed to a new starting shape (not stale from before reset)
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed.state.units).toEqual([]);
  });

  it('clears pendingAwaySummary via clearAwaySummary', () => {
    useColonyStore.setState({
      pendingAwaySummary: { elapsedMs: 1, serumEarned: 5, restGainedTotal: 0, injuriesHealed: 0 },
    });
    useColonyStore.getState().clearAwaySummary();
    expect(useColonyStore.getState().pendingAwaySummary).toBeNull();
  });
});
```

- [ ] **Step 2.2.2: Run test to verify it fails**

Run: `npx vitest run tests/state/colony.reset.test.ts`
Expected: FAIL — `resetGame` not a function.

- [ ] **Step 2.2.3: Add `pendingAwaySummary`, `resetGame`, `clearAwaySummary`, and rehydrate hook**

In `src/state/colony.ts`:

1. Add import: `import type { AwaySummary } from './session';`
2. In `interface ColonyStore` (after `unlocks`):
   ```ts
   readonly pendingAwaySummary: AwaySummary | null;
   resetGame: () => void;
   clearAwaySummary: () => void;
   ```
3. In the store factory initial values (after `unlocks: DEFAULT_UNLOCKS,`):
   ```ts
   pendingAwaySummary: null,
   ```
4. Extract the initial-values block into a named constant `INITIAL_STATE` at module scope so `resetGame` can reuse it (put it just above `export const useColonyStore = create<...`):
   ```ts
   const INITIAL_STATE = {
     units: [] as Unit[],
     nextId: 1,
     lastDecantedId: null as number | null,
     harvestsToday: 0,
     harvestDayKey: todayLocalKey(),
     droughtCount: 0,
     breedsToday: 0,
     breedDayKey: todayLocalKey(),
     fronts: FRESH_FRONTS,
     activeIncursion: null as IncursionResolution | null,
     serum: SERUM_STARTING_BALANCE,
     stims: 0,
     lastGarrisonTickAt: Date.now(),
     buildings: { barracks: false, medbay: false },
     lastRestTickAt: Date.now(),
     unlocks: DEFAULT_UNLOCKS,
     pendingAwaySummary: null as AwaySummary | null,
   } as const;
   ```
   Then reference `...INITIAL_STATE` inside the store factory instead of listing each field again.
5. Add the two actions inside the store factory (near `clearHighlight`):
   ```ts
   resetGame: () => {
     set({ ...INITIAL_STATE, lastGarrisonTickAt: Date.now(), lastRestTickAt: Date.now() });
   },
   clearAwaySummary: () => set({ pendingAwaySummary: null }),
   ```
6. Add an `onRehydrateStorage` hook next to `migrate:` in the persist config:
   ```ts
   onRehydrateStorage: () => (rehydrated) => {
     if (!rehydrated) return;
     // Elapsed-time ticks already run inside decant/breed/launch when the player next acts,
     // but the summary needs to be captured against the pre-tick snapshot. Compute here.
     const now = Date.now();
     const snapshotPre: StoreSnapshot = {
       serum: rehydrated.serum,
       units: rehydrated.units.map((u) => ({ id: u.id, restCurrent: u.restCurrent, injuredUntil: u.injuredUntil })),
     };
     const prevNow = rehydrated.lastGarrisonTickAt;
     const flareDelta   = checkFlareTimers(rehydrated as ColonyStore, now);
     const withFlare    = { ...rehydrated, ...flareDelta } as ColonyStore;
     const garrisonDelta = applyGarrisonTick(withFlare, now);
     const withGarrison  = { ...withFlare, ...garrisonDelta } as ColonyStore;
     const restDelta     = applyRestTick(withGarrison, now);
     const nextState = { ...withGarrison, ...restDelta } as ColonyStore;
     const snapshotPost: StoreSnapshot = {
       serum: nextState.serum,
       units: nextState.units.map((u) => ({ id: u.id, restCurrent: u.restCurrent, injuredUntil: u.injuredUntil })),
     };
     const summary = summarize(snapshotPre, snapshotPost, prevNow, now);
     useColonyStore.setState({
       ...flareDelta, ...garrisonDelta, ...restDelta,
       pendingAwaySummary: isSignificant(summary) ? summary : null,
     });
   },
   ```
   Add the required imports at the top:
   ```ts
   import { summarize, isSignificant, type StoreSnapshot } from './session';
   ```
7. Extend `partialize` to NOT include `pendingAwaySummary` (it's transient — leave the object as-is; the omission is what excludes it).

**Note:** No persist version bump. `pendingAwaySummary` is transient and never persisted. The migration `if (from < 10)` still applies from Task 1.1.

- [ ] **Step 2.2.4: Run test to verify it passes**

Run: `npx vitest run tests/state/colony.reset.test.ts`
Expected: PASS.

- [ ] **Step 2.2.5: Assert `pendingAwaySummary` is NOT in localStorage**

Append to `tests/state/persist.test.ts`:

```ts
  it('pendingAwaySummary is transient — never appears in localStorage', () => {
    useColonyStore.setState({
      pendingAwaySummary: { elapsedMs: 1000, serumEarned: 5, restGainedTotal: 0, injuriesHealed: 0 },
    });
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed.state.pendingAwaySummary).toBeUndefined();
  });
```

Run: `npx vitest run tests/state/persist.test.ts`
Expected: PASS.

- [ ] **Step 2.2.6: Commit**

```bash
git add src/state/colony.ts tests/state/colony.reset.test.ts tests/state/persist.test.ts
git commit -m "feat(state): resetGame() + pendingAwaySummary on rehydrate (P2 Task 2.2)"
```

### Task 2.3: `AwaySummary` modal component

**Files:**
- Create: `src/ui/components/AwaySummary.tsx`, `tests/ui/AwaySummary.test.tsx`
- Modify: `src/ui/styles.ts` (add `modalBackdrop`, `modalCard`)

**Interfaces:**
- Produces: `export function AwaySummary(): ReactElement | null;`
- Behavior: reads `pendingAwaySummary` from the store. Returns `null` when it's null. Otherwise renders a modal (`data-testid="away-summary"`) with lines for elapsed time (human-formatted), Serum earned, units rested, injuries healed. Dismiss button (`data-testid="away-summary-dismiss"`) calls `clearAwaySummary()`.

- [ ] **Step 2.3.1: Add modal styles**

In `src/ui/styles.ts`:

```ts
  modalBackdrop: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  } as CSSProperties,

  modalCard: {
    background: '#ffffff',
    borderRadius: 8,
    padding: 24,
    minWidth: 320,
    maxWidth: 480,
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  } as CSSProperties,

  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 12,
  } as CSSProperties,

  modalBody: {
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 16,
  } as CSSProperties,

  modalPrimary: {
    padding: '8px 20px',
    borderRadius: 6,
    border: '1px solid #14b8a6',
    background: '#14b8a6',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,
```

- [ ] **Step 2.3.2: Write failing test**

Create `tests/ui/AwaySummary.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { AwaySummary } from '../../src/ui/components/AwaySummary';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { DEFAULT_UNLOCKS } from '../../src/state/unlocks';

function baseSeed() {
  useColonyStore.setState({
    units: [], nextId: 1, lastDecantedId: null,
    harvestsToday: 0, harvestDayKey: todayLocalKey(), droughtCount: 0,
    breedsToday: 0, breedDayKey: todayLocalKey(),
    fronts: FRESH_FRONTS, activeIncursion: null,
    serum: 0, stims: 0, lastGarrisonTickAt: Date.now(),
    buildings: { barracks: false, medbay: false },
    lastRestTickAt: Date.now(),
    unlocks: DEFAULT_UNLOCKS,
    pendingAwaySummary: null,
  });
}

describe('AwaySummary', () => {
  beforeEach(() => { localStorage.clear(); baseSeed(); });
  afterEach(() => cleanup());

  it('renders nothing when pendingAwaySummary is null', () => {
    const { queryByTestId } = render(<AwaySummary />);
    expect(queryByTestId('away-summary')).toBeNull();
  });

  it('renders the modal with all four lines when summary is set', () => {
    useColonyStore.setState({
      pendingAwaySummary: { elapsedMs: 3_600_000, serumEarned: 25, restGainedTotal: 40, injuriesHealed: 1 },
    });
    const { getByTestId } = render(<AwaySummary />);
    const modal = getByTestId('away-summary');
    expect(modal.textContent).toContain('25');
    expect(modal.textContent).toMatch(/40/);
    expect(modal.textContent).toMatch(/1/);
    expect(modal.textContent?.toLowerCase()).toContain('hour');
  });

  it('dismiss button clears the summary', () => {
    useColonyStore.setState({
      pendingAwaySummary: { elapsedMs: 10, serumEarned: 5, restGainedTotal: 0, injuriesHealed: 0 },
    });
    const { getByTestId, queryByTestId } = render(<AwaySummary />);
    fireEvent.click(getByTestId('away-summary-dismiss'));
    expect(queryByTestId('away-summary')).toBeNull();
    expect(useColonyStore.getState().pendingAwaySummary).toBeNull();
  });
});
```

- [ ] **Step 2.3.3: Run test to verify it fails**

Run: `npx vitest run tests/ui/AwaySummary.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 2.3.4: Implement `AwaySummary`**

Create `src/ui/components/AwaySummary.tsx`:

```tsx
import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { TERMS } from '../terms';
import { styles } from '../styles';

function formatElapsed(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'}${minutes > 0 ? ` ${minutes} min` : ''}`;
  return `${Math.max(1, minutes)} minute${minutes === 1 ? '' : 's'}`;
}

export function AwaySummary(): ReactElement | null {
  const summary = useColonyStore((s) => s.pendingAwaySummary);
  const clear = useColonyStore((s) => s.clearAwaySummary);
  if (summary === null) return null;

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalCard} data-testid="away-summary">
        <h2 style={styles.modalTitle}>While you were away…</h2>
        <div style={styles.modalBody}>
          <p>Elapsed: {formatElapsed(summary.elapsedMs)}</p>
          <p>{TERMS.serum} earned: {TERMS.serumAbbr} {summary.serumEarned}</p>
          <p>Rest gained across the {TERMS.colony}: {summary.restGainedTotal}</p>
          <p>Injuries healed: {summary.injuriesHealed}</p>
        </div>
        <button
          type="button"
          style={styles.modalPrimary}
          onClick={clear}
          data-testid="away-summary-dismiss"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2.3.5: Run test to verify it passes**

Run: `npx vitest run tests/ui/AwaySummary.test.tsx`
Expected: PASS.

- [ ] **Step 2.3.6: Commit**

```bash
git add src/ui/components/AwaySummary.tsx tests/ui/AwaySummary.test.tsx src/ui/styles.ts
git commit -m "feat(ui): AwaySummary modal for while-you-were-away deltas (P2 Task 2.3)"
```

### Task 2.4: `NewGameGate` — Continue vs New Game on load

**Files:**
- Create: `src/ui/screens/NewGameGate.tsx`, `tests/ui/NewGameGate.test.tsx`

**Interfaces:**
- Produces: `export function NewGameGate(props: { hasExistingSave: boolean; onContinue: () => void; onNewGame: () => void }): ReactElement;`
- Testids: `new-game-gate`, `new-game-gate-continue`, `new-game-gate-new-game`.
- When `hasExistingSave` is false, the Continue button is `disabled`.

- [ ] **Step 2.4.1: Write failing test**

Create `tests/ui/NewGameGate.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { NewGameGate } from '../../src/ui/screens/NewGameGate';

describe('NewGameGate', () => {
  afterEach(() => cleanup());

  it('renders both buttons', () => {
    const { getByTestId } = render(
      <NewGameGate hasExistingSave={true} onContinue={() => {}} onNewGame={() => {}} />,
    );
    expect(getByTestId('new-game-gate')).toBeDefined();
    expect(getByTestId('new-game-gate-continue')).toBeDefined();
    expect(getByTestId('new-game-gate-new-game')).toBeDefined();
  });

  it('disables Continue when no save exists', () => {
    const { getByTestId } = render(
      <NewGameGate hasExistingSave={false} onContinue={() => {}} onNewGame={() => {}} />,
    );
    expect((getByTestId('new-game-gate-continue') as HTMLButtonElement).disabled).toBe(true);
  });

  it('fires the callbacks on click', () => {
    const onContinue = vi.fn();
    const onNewGame = vi.fn();
    const { getByTestId } = render(
      <NewGameGate hasExistingSave={true} onContinue={onContinue} onNewGame={onNewGame} />,
    );
    fireEvent.click(getByTestId('new-game-gate-continue'));
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onNewGame).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2.4.2: Run test to verify it fails**

Run: `npx vitest run tests/ui/NewGameGate.test.tsx`
Expected: FAIL.

- [ ] **Step 2.4.3: Implement `NewGameGate`**

Create `src/ui/screens/NewGameGate.tsx`:

```tsx
import type { ReactElement } from 'react';
import { styles } from '../styles';
import { TERMS } from '../terms';

export function NewGameGate(props: {
  hasExistingSave: boolean;
  onContinue: () => void;
  onNewGame: () => void;
}): ReactElement {
  return (
    <main style={styles.page} data-testid="new-game-gate">
      <h1 style={styles.headerTitle}>Morulium</h1>
      <p style={styles.headerSub}>Grow monsters. Take fronts. Rule.</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          type="button"
          style={props.hasExistingSave ? styles.modalPrimary : styles.decantButtonDisabled}
          disabled={!props.hasExistingSave}
          onClick={props.onContinue}
          data-testid="new-game-gate-continue"
        >
          {TERMS.continueGame}
        </button>
        <button
          type="button"
          style={styles.modalPrimary}
          onClick={props.onNewGame}
          data-testid="new-game-gate-new-game"
        >
          {TERMS.newGame}
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2.4.4: Run test to verify it passes**

Run: `npx vitest run tests/ui/NewGameGate.test.tsx`
Expected: PASS.

- [ ] **Step 2.4.5: Commit**

```bash
git add src/ui/screens/NewGameGate.tsx tests/ui/NewGameGate.test.tsx
git commit -m "feat(ui): NewGameGate for Continue/New Game landing (P2 Task 2.4)"
```

### Task 2.5: Wire `NewGameGate` + `AwaySummary` into `App.tsx`

**Files:**
- Modify: `src/App.tsx`
- Test: extend `tests/ui/App.test.tsx`

**Interfaces:**
- `App` now boots into `NewGameGate` when no save exists (localStorage has no `STORAGE_KEY` entry when the component first mounts), or when the user hasn't cleared the gate this session. Store a session-local flag `bootPassed` in local component state.

- [ ] **Step 2.5.1: Update `App.tsx`**

Replace `src/App.tsx` with:

```tsx
import { useState, type ReactElement } from 'react';
import type { SurfaceId } from './state/unlocks';
import { useColonyStore } from './state/colony';
import { STORAGE_KEY } from './state/persist';
import { AppShell } from './ui/components/AppShell';
import { AwaySummary } from './ui/components/AwaySummary';
import { NewGameGate } from './ui/screens/NewGameGate';
import { Colony } from './ui/screens/Colony';
import { DNALab } from './ui/screens/DNALab';
import { Breed } from './ui/screens/Breed';
import { Incursion } from './ui/screens/Incursion';
import { ConquestMap } from './ui/screens/ConquestMap';
import { Vivarium } from './ui/screens/Vivarium';
import { Vat } from './ui/screens/Vat';
import { Registry } from './ui/screens/Registry';

export function App(): ReactElement {
  const [current, setCurrent] = useState<SurfaceId>('colony');
  const [bootPassed, setBootPassed] = useState<boolean>(false);
  const resetGame = useColonyStore((s) => s.resetGame);

  if (!bootPassed) {
    const hasExistingSave = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== null;
    return (
      <NewGameGate
        hasExistingSave={hasExistingSave}
        onContinue={() => setBootPassed(true)}
        onNewGame={() => { resetGame(); setBootPassed(true); }}
      />
    );
  }

  const screen = (() => {
    switch (current) {
      case 'colony':       return <Colony />;
      case 'dna-lab':      return <DNALab />;
      case 'breed':        return <Breed />;
      case 'incursion':    return <Incursion />;
      case 'conquest-map': return <ConquestMap />;
      case 'vivarium':     return <Vivarium />;
      case 'vat':          return <Vat />;
      case 'sequencer':    return <Registry />;
      case 'registry':     return <Registry />;
    }
  })();

  return (
    <>
      <AppShell current={current} onNavigate={setCurrent} directiveText={null}>
        {screen}
      </AppShell>
      <AwaySummary />
    </>
  );
}
```

- [ ] **Step 2.5.2: Update `tests/ui/App.test.tsx` to click through the gate**

Every existing test that renders `<App />` needs to first click the New Game button (or Continue, but New Game is safer since it resets state) before asserting. Add a helper at the top of the file:

```ts
function bootIntoApp(getByTestId: (id: string) => HTMLElement) {
  // NewGameGate always mounts first; click New Game to enter the shell.
  fireEvent.click(getByTestId('new-game-gate-new-game'));
}
```

Then for each `it('...', () => { const { getByTestId } = render(<App />); … })`, insert `bootIntoApp(getByTestId);` immediately after the render.

Also add a fresh test:

```ts
  it('shows NewGameGate on first load with no localStorage', () => {
    localStorage.clear();
    const { getByTestId } = render(<App />);
    expect(getByTestId('new-game-gate')).toBeDefined();
  });

  it('New Game button resets state and enters the shell', () => {
    useColonyStore.setState({ serum: 999 });
    const { getByTestId } = render(<App />);
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    expect(getByTestId('status-hud')).toBeDefined();
    expect(useColonyStore.getState().serum).toBe(SERUM_STARTING_BALANCE);
  });
```

Import `SERUM_STARTING_BALANCE` at the top of the file.

- [ ] **Step 2.5.3: Run the full suite**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 2.5.4: Commit**

```bash
git add src/App.tsx tests/ui/App.test.tsx
git commit -m "chore(ui): boot App via NewGameGate + mount AwaySummary (P2 Task 2.5)"
```

### Phase 2 done-when check

- [ ] `localStorage.clear()` → reload → NewGameGate shows, Continue disabled.
- [ ] Click "New Game" → shell renders with clean state.
- [ ] Reload → NewGameGate shows again, Continue enabled → clicking Continue enters the shell with prior state.
- [ ] Manually seed elapsed time (`useColonyStore.setState({ lastGarrisonTickAt: Date.now() - 3_600_000, fronts: ...withGarrison })`), reload → AwaySummary modal appears.
- [ ] `npm test` green, `npm run build` green.


## Phase 3 — New-game bootstrap & first-run state

**Goal:** Fresh player lands with 3 free Decants + starter Serum, empty Colony, one available Incursion front, advanced systems locked (populated in P5), skippable intro. First-run vs continue distinguishable.

### Task 3.1: `bootstrap.ts` — starter constants + `isFirstRun`

**Files:**
- Create: `src/state/bootstrap.ts`, `tests/state/bootstrap.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const STARTER_FREE_DECANTS = 3;
  export interface FirstRunProbe {
    readonly firstRunComplete: boolean;
    readonly units: readonly unknown[];
    readonly serum: number;
  }
  export function isFirstRun(s: FirstRunProbe): boolean;
  ```
- `isFirstRun` returns true iff `!firstRunComplete`. (A separate flag, not derived from state, because a player can legitimately reach zero units/zero Serum later and that isn't first-run.)

- [ ] **Step 3.1.1: Write failing test**

Create `tests/state/bootstrap.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isFirstRun, STARTER_FREE_DECANTS } from '../../src/state/bootstrap';

describe('bootstrap', () => {
  it('STARTER_FREE_DECANTS is 3', () => {
    expect(STARTER_FREE_DECANTS).toBe(3);
  });

  it('isFirstRun returns true iff !firstRunComplete', () => {
    expect(isFirstRun({ firstRunComplete: false, units: [], serum: 200 })).toBe(true);
    expect(isFirstRun({ firstRunComplete: true, units: [], serum: 0 })).toBe(false);
    expect(isFirstRun({ firstRunComplete: true, units: [{}], serum: 200 })).toBe(false);
  });
});
```

- [ ] **Step 3.1.2: Run test to verify it fails**

Run: `npx vitest run tests/state/bootstrap.test.ts`
Expected: FAIL.

- [ ] **Step 3.1.3: Implement `bootstrap.ts`**

Create `src/state/bootstrap.ts`:

```ts
export const STARTER_FREE_DECANTS = 3;

export interface FirstRunProbe {
  readonly firstRunComplete: boolean;
  readonly units: readonly unknown[];
  readonly serum: number;
}

export function isFirstRun(s: FirstRunProbe): boolean {
  return !s.firstRunComplete;
}
```

- [ ] **Step 3.1.4: Run test to verify it passes**

Run: `npx vitest run tests/state/bootstrap.test.ts`
Expected: PASS.

- [ ] **Step 3.1.5: Commit**

```bash
git add src/state/bootstrap.ts tests/state/bootstrap.test.ts
git commit -m "feat(state): bootstrap constants + isFirstRun predicate (P3 Task 3.1)"
```

### Task 3.2: Store: `freeDecantsRemaining` + `firstRunComplete` + persist v10 → v11

**Files:**
- Modify: `src/state/colony.ts`
- Test: append to `tests/state/persist.test.ts`

**Interfaces:**
- Store adds:
  ```ts
  readonly freeDecantsRemaining: number;
  readonly firstRunComplete: boolean;
  markFirstRunComplete: () => void;
  ```
- Initial values: `freeDecantsRemaining: STARTER_FREE_DECANTS`, `firstRunComplete: false`.
- `resetGame()` (from Task 2.2) already re-uses `INITIAL_STATE` — the new fields need to be added there too.

- [ ] **Step 3.2.1: Add fields to `INITIAL_STATE` + `ColonyStore` + partialize + migration**

In `src/state/colony.ts`:

1. Import: `import { STARTER_FREE_DECANTS } from './bootstrap';`
2. Add to `interface ColonyStore` (after `pendingAwaySummary`):
   ```ts
   readonly freeDecantsRemaining: number;
   readonly firstRunComplete: boolean;
   markFirstRunComplete: () => void;
   ```
3. Add to `INITIAL_STATE`:
   ```ts
   freeDecantsRemaining: STARTER_FREE_DECANTS,
   firstRunComplete: false,
   ```
4. Add action in the store factory:
   ```ts
   markFirstRunComplete: () => set({ firstRunComplete: true }),
   ```
5. In `partialize`, add:
   ```ts
   freeDecantsRemaining: state.freeDecantsRemaining,
   firstRunComplete: state.firstRunComplete,
   ```
6. Bump `version: 10` → `version: 11`.
7. Add migration branch after `if (from < 10) { ... }`:
   ```ts
   if (from < 11) {
     s = {
       ...s,
       freeDecantsRemaining: (s as Partial<ColonyStore>).freeDecantsRemaining ?? STARTER_FREE_DECANTS,
       firstRunComplete: (s as Partial<ColonyStore>).firstRunComplete ?? true,   // existing saves = already played
     };
   }
   ```
   The default `firstRunComplete: true` for migrating saves is deliberate — anyone with a pre-existing save has already played, so they should not see the intro on their next load.

- [ ] **Step 3.2.2: Add persist tests**

Append to `tests/state/persist.test.ts`:

```ts
  it('freeDecantsRemaining + firstRunComplete persist across rehydration', () => {
    useColonyStore.setState({ freeDecantsRemaining: 1, firstRunComplete: true });
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed.state.freeDecantsRemaining).toBe(1);
    expect(parsed.state.firstRunComplete).toBe(true);
    expect(parsed.version).toBe(11);
  });

  it('migrate v10 → v11: existing saves default firstRunComplete=true and get 3 free Decants', async () => {
    const v10Shape = {
      state: {
        units: [], nextId: 1,
        harvestsToday: 0, harvestDayKey: '2026-08-05', droughtCount: 0,
        breedsToday: 0, breedDayKey: '2026-08-05',
        fronts: FRESH_FRONTS,
        serum: 200, stims: 0, lastGarrisonTickAt: 1_700_000_000_000,
        buildings: { barracks: false, medbay: false },
        lastRestTickAt: 1_700_000_000_000,
        unlocks: DEFAULT_UNLOCKS,
      },
      version: 10,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v10Shape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    expect(s.firstRunComplete).toBe(true);          // migrated save — not first-run
    expect(s.freeDecantsRemaining).toBe(3);
  });
```

Update the six earlier `.toBe(10)` assertions on `parsed.version` (from Task 1.1) to `.toBe(11)`. Update the `v1 → v10` chain test to `v1 → v11` and add:
```ts
expect(s.freeDecantsRemaining).toBe(3);
expect(s.firstRunComplete).toBe(true);
```

- [ ] **Step 3.2.3: Run persist tests**

Run: `npx vitest run tests/state/persist.test.ts`
Expected: PASS.

- [ ] **Step 3.2.4: Commit**

```bash
git add src/state/colony.ts tests/state/persist.test.ts
git commit -m "feat(state): freeDecantsRemaining + firstRunComplete + persist v11 (P3 Task 3.2)"
```

### Task 3.3: Rework `decant()` — consume free Decant before daily counter

**Files:**
- Modify: `src/state/colony.ts` (the `decant:` action, around line 190–240)
- Test: `tests/state/colony.freeDecants.test.ts` (new)

**Interfaces:**
- Behavior: when `freeDecantsRemaining > 0`, the action decrements that counter and DOES NOT touch `harvestsToday` / `harvestDayKey` / `droughtCount`. It still creates a unit, still respects the Colony cap. When `freeDecantsRemaining === 0`, the existing daily-limit path runs unchanged.
- Failsafe (drought) tracking only advances on paid Decants (daily-limit path), not free ones.

- [ ] **Step 3.3.1: Write failing test**

Create `tests/state/colony.freeDecants.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';
import { STARTER_FREE_DECANTS } from '../../src/state/bootstrap';

describe('decant — free-Decant path', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });

  it('first 3 Decants consume freeDecantsRemaining and do not tick harvestsToday', () => {
    expect(useColonyStore.getState().freeDecantsRemaining).toBe(STARTER_FREE_DECANTS);
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    const s = useColonyStore.getState();
    expect(s.freeDecantsRemaining).toBe(0);
    expect(s.units).toHaveLength(3);
    expect(s.harvestsToday).toBe(0);
  });

  it('4th Decant enters the paid path and ticks harvestsToday', () => {
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    useColonyStore.getState().decant();
    const s = useColonyStore.getState();
    expect(s.freeDecantsRemaining).toBe(0);
    expect(s.harvestsToday).toBe(1);
    expect(s.units).toHaveLength(4);
  });

  it('free Decants still respect the Colony cap', () => {
    // Fill to cap (20 for no Barracks). Skip the free path to test cap check.
    useColonyStore.setState({ freeDecantsRemaining: 30 });
    let ok = true;
    try {
      for (let i = 0; i < 30; i++) useColonyStore.getState().decant();
    } catch {
      ok = false;
    }
    expect(ok).toBe(false);
    expect(useColonyStore.getState().units.length).toBeLessThanOrEqual(20);
  });
});
```

- [ ] **Step 3.3.2: Run test to verify it fails**

Run: `npx vitest run tests/state/colony.freeDecants.test.ts`
Expected: FAIL — freeDecantsRemaining does not decrement.

- [ ] **Step 3.3.3: Update the `decant` action**

In `src/state/colony.ts`, inside the `decant:` action (currently around line 190). Immediately after the elapsed-time tick blocks (`flareDelta`, `tickDelta`, `restDelta`) and the cap check (`if (s.units.length >= capOf(s))`) but BEFORE the daily-limit / failsafe / genome-roll path, insert:

```ts
        // Free-Decant path: consume before hitting the daily limiter or failsafe machinery.
        if (s.freeDecantsRemaining > 0) {
          const seed = s.nextId;
          const rng = createRng(seed);
          const genome = rollGenome(rng);
          const newUnit: Unit = {
            id: s.nextId,
            seed,
            decantedAt: now,
            genome,
            generation: 0,
            parentIds: null,
            wear: {},
            restCurrent: REST_MAX,
            injuredUntil: null,
            culled: false,
          };
          set({
            ...flareDelta, ...tickDelta, ...restDelta,
            units: [...s.units, newUnit],
            nextId: s.nextId + 1,
            lastDecantedId: newUnit.id,
            freeDecantsRemaining: s.freeDecantsRemaining - 1,
          });
          return newUnit;
        }
```

Add the `REST_MAX` import if not already present.

- [ ] **Step 3.3.4: Run test to verify it passes**

Run: `npx vitest run tests/state/colony.freeDecants.test.ts`
Expected: PASS.

- [ ] **Step 3.3.5: Run full suite**

Run: `npm test`
Expected: PASS. (Existing `colony.test.ts` tests may pass or fail depending on whether they seeded `freeDecantsRemaining`. If any fail, update their `useColonyStore.setState({...})` seed blocks to include `freeDecantsRemaining: 0` so they exercise the paid path unchanged.)

- [ ] **Step 3.3.6: Commit**

```bash
git add src/state/colony.ts tests/state/colony.freeDecants.test.ts
git commit -m "feat(state): decant() consumes freeDecantsRemaining before daily-limit path (P3 Task 3.3)"
```

### Task 3.4: Colony/DecantButton copy reflects free-Decant count

**Files:**
- Modify: `src/ui/components/DecantButton.tsx`, `src/ui/components/EmptyColony.tsx`, `src/ui/components/StatusHud.tsx`
- Test: extend `tests/ui/StatusHud.test.tsx`, add tests for DecantButton/EmptyColony copy

**Interfaces:**
- `DecantButton` labels itself `"Decant (free ×N)"` when `freeDecantsRemaining > 0`, `"Decant"` otherwise.
- `EmptyColony` shows: "No specimens yet — 3 free Decants available."
- `StatusHud`'s `hud-free-decants` reads `freeDecantsRemaining` (replaces the hardcoded `0` from Task 1.2).

- [ ] **Step 3.4.1: Update `StatusHud.tsx` to read the store**

In `src/ui/components/StatusHud.tsx`:

Replace the `<span … data-testid="hud-free-decants">` block with:

```tsx
      <FreeDecantsBadge />
```

And add the local component at module bottom:

```tsx
function FreeDecantsBadge() {
  const free = useColonyStore((s) => s.freeDecantsRemaining);
  return (
    <span style={styles.hudItem} data-testid="hud-free-decants">
      {TERMS.freeDecant}: {free}
    </span>
  );
}
```

Update `tests/ui/StatusHud.test.tsx` to add a case:

```ts
  it('reflects freeDecantsRemaining from the store', () => {
    seed({ freeDecantsRemaining: 3 });
    const { getByTestId } = render(<StatusHud directiveText={null} />);
    expect(getByTestId('hud-free-decants').textContent).toContain('3');
  });
```

Also add `freeDecantsRemaining: 3, firstRunComplete: false,` to the `seed()` helper's `setState({...})` default object in every existing test's `beforeEach` where relevant. If a test explicitly wants the paid path, it can override.

- [ ] **Step 3.4.2: Update `DecantButton`**

Read `src/ui/components/DecantButton.tsx` first; then patch its label to read `freeDecantsRemaining` from the store and switch text.

Add near the top:

```tsx
const free = useColonyStore((s) => s.freeDecantsRemaining);
```

Replace the button's label to:

```tsx
{free > 0 ? `${TERMS.decant} (free ×${free})` : TERMS.decant}
```

Add a test in `tests/ui/DecantButton.test.tsx` (if it exists — otherwise create a small one):

```tsx
  it('shows free count in label when freeDecantsRemaining > 0', () => {
    seed({ freeDecantsRemaining: 3 });
    const { getByTestId } = render(<DecantButton />);
    expect(getByTestId('decant-button').textContent).toContain('free ×3');
  });
```

- [ ] **Step 3.4.3: Update `EmptyColony`**

Read `src/ui/components/EmptyColony.tsx`; patch its body copy to read `freeDecantsRemaining`:

```tsx
const free = useColonyStore((s) => s.freeDecantsRemaining);
```

And its body text:

```tsx
{free > 0
  ? `No specimens yet — ${free} free ${TERMS.decant}${free === 1 ? '' : 's'} available.`
  : `No specimens yet — ${TERMS.decant} a ${TERMS.morula} to begin.`}
```

- [ ] **Step 3.4.4: Run full suite**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 3.4.5: Commit**

```bash
git add src/ui/components/DecantButton.tsx src/ui/components/EmptyColony.tsx src/ui/components/StatusHud.tsx tests/ui/StatusHud.test.tsx tests/ui/DecantButton.test.tsx
git commit -m "feat(ui): free-Decant badges in HUD/button/empty state (P3 Task 3.4)"
```

### Task 3.5: `IntroModal` — skippable in-world premise

**Files:**
- Create: `src/ui/components/IntroModal.tsx`, `tests/ui/IntroModal.test.tsx`

**Interfaces:**
- Produces: `export function IntroModal(props: { onDone: () => void }): ReactElement;`
- Testids: `intro-modal`, `intro-modal-begin`, `intro-modal-skip`. Both buttons call `onDone`.
- Body copy: 3–4 short in-world sentences establishing the premise (you're a villain growing monsters, take fronts, rule). Never explains mechanics.

- [ ] **Step 3.5.1: Write failing test**

Create `tests/ui/IntroModal.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { IntroModal } from '../../src/ui/components/IntroModal';

describe('IntroModal', () => {
  afterEach(() => cleanup());

  it('renders the modal with Begin and Skip', () => {
    const { getByTestId } = render(<IntroModal onDone={() => {}} />);
    expect(getByTestId('intro-modal')).toBeDefined();
    expect(getByTestId('intro-modal-begin')).toBeDefined();
    expect(getByTestId('intro-modal-skip')).toBeDefined();
  });

  it('Begin and Skip both call onDone', () => {
    const onDone = vi.fn();
    const { getByTestId } = render(<IntroModal onDone={onDone} />);
    fireEvent.click(getByTestId('intro-modal-begin'));
    fireEvent.click(getByTestId('intro-modal-skip'));
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it('body does not mention mechanics like thresholds, weights, or scores', () => {
    const { getByTestId } = render(<IntroModal onDone={() => {}} />);
    const text = (getByTestId('intro-modal').textContent ?? '').toLowerCase();
    expect(text).not.toMatch(/threshold|weight|score|percent|probability/);
  });
});
```

- [ ] **Step 3.5.2: Run test to verify it fails**

Run: `npx vitest run tests/ui/IntroModal.test.tsx`
Expected: FAIL.

- [ ] **Step 3.5.3: Implement `IntroModal`**

Create `src/ui/components/IntroModal.tsx`:

```tsx
import type { ReactElement } from 'react';
import { styles } from '../styles';

export function IntroModal(props: { onDone: () => void }): ReactElement {
  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalCard} data-testid="intro-modal">
        <h2 style={styles.modalTitle}>Morulium</h2>
        <div style={styles.modalBody}>
          <p>You are a villain building an army in a vat.</p>
          <p>Grow monsters, one from each Morula. Send them into contested fronts. Hold what you take.</p>
          <p>Eventually, the world.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            style={styles.modalPrimary}
            onClick={props.onDone}
            data-testid="intro-modal-begin"
          >
            Begin
          </button>
          <button
            type="button"
            style={styles.decantButtonDisabled}
            onClick={props.onDone}
            data-testid="intro-modal-skip"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3.5.4: Run test to verify it passes**

Run: `npx vitest run tests/ui/IntroModal.test.tsx`
Expected: PASS.

- [ ] **Step 3.5.5: Commit**

```bash
git add src/ui/components/IntroModal.tsx tests/ui/IntroModal.test.tsx
git commit -m "feat(ui): IntroModal for first-run premise (P3 Task 3.5)"
```

### Task 3.6: Wire `IntroModal` into `App.tsx`

**Files:**
- Modify: `src/App.tsx`
- Test: extend `tests/ui/App.test.tsx`

- [ ] **Step 3.6.1: Update `App.tsx`**

Replace the body of the App component with:

```tsx
export function App(): ReactElement {
  const [current, setCurrent] = useState<SurfaceId>('colony');
  const [bootPassed, setBootPassed] = useState<boolean>(false);
  const resetGame = useColonyStore((s) => s.resetGame);
  const firstRunComplete = useColonyStore((s) => s.firstRunComplete);
  const markFirstRunComplete = useColonyStore((s) => s.markFirstRunComplete);

  if (!bootPassed) {
    const hasExistingSave = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== null;
    return (
      <NewGameGate
        hasExistingSave={hasExistingSave}
        onContinue={() => setBootPassed(true)}
        onNewGame={() => { resetGame(); setBootPassed(true); }}
      />
    );
  }

  const screen = (() => {
    switch (current) {
      case 'colony':       return <Colony />;
      case 'dna-lab':      return <DNALab />;
      case 'breed':        return <Breed />;
      case 'incursion':    return <Incursion />;
      case 'conquest-map': return <ConquestMap />;
      case 'vivarium':     return <Vivarium />;
      case 'vat':          return <Vat />;
      case 'sequencer':    return <Registry />;
      case 'registry':     return <Registry />;
    }
  })();

  return (
    <>
      <AppShell current={current} onNavigate={setCurrent} directiveText={null}>
        {screen}
      </AppShell>
      {!firstRunComplete && <IntroModal onDone={markFirstRunComplete} />}
      <AwaySummary />
    </>
  );
}
```

Add import: `import { IntroModal } from './ui/components/IntroModal';`

- [ ] **Step 3.6.2: Extend `tests/ui/App.test.tsx`**

Add a test after the existing gate cases:

```ts
  it('shows IntroModal on first run after boot', () => {
    localStorage.clear();
    useColonyStore.setState({ firstRunComplete: false });
    const { getByTestId } = render(<App />);
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    expect(getByTestId('intro-modal')).toBeDefined();
  });

  it('Begin dismisses the intro and marks first-run complete', () => {
    localStorage.clear();
    useColonyStore.setState({ firstRunComplete: false });
    const { getByTestId, queryByTestId } = render(<App />);
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    fireEvent.click(getByTestId('intro-modal-begin'));
    expect(queryByTestId('intro-modal')).toBeNull();
    expect(useColonyStore.getState().firstRunComplete).toBe(true);
  });
```

- [ ] **Step 3.6.3: Run full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3.6.4: Commit**

```bash
git add src/App.tsx tests/ui/App.test.tsx
git commit -m "chore(ui): mount IntroModal when firstRunComplete=false (P3 Task 3.6)"
```

### Phase 3 done-when check

- [ ] `localStorage.clear()` → reload → NewGameGate → click New Game → shell shows with IntroModal.
- [ ] HUD shows `Free Decant: 3`, `the Colony 0/20`, `SR 200`.
- [ ] EmptyColony reads "No specimens yet — 3 free Decants available."
- [ ] Click Begin → intro dismisses. Click Decant three times → free counter goes to 0, Colony has 3 units, `harvestsToday` still 0.
- [ ] 4th Decant increments `harvestsToday` (verify via DevTools).
- [ ] Reload → NewGameGate → Continue → shell shows with 3 units and no intro modal.


## Phase 4 — Directive system (the orientation spine)

**Goal:** Data-driven directive chain that walks the core loop by doing. Persistent surface always shows the current directive. Each step completes on the real game action and grants a small reward. After the scripted chain, transition to open-ended standing directives.

### Task 4.1: `directives.ts` — data model + CHAIN + STANDING + `checkCompletion`

**Files:**
- Create: `src/state/directives.ts`, `tests/state/directives.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type DirectiveId =
    | 'decant-first' | 'inspect-first' | 'decant-second'
    | 'launch-first-incursion' | 'collect-first-reward'
    | 'station-on-occupation' | 'try-a-breed'
    | 'take-a-front' | 'reach-strain' | 'grow-colony-to-five';
  export type DirectiveAction =
    | { kind: 'decant' }
    | { kind: 'view-dna-lab-detail'; unitId: number }
    | { kind: 'incursion-launched' }
    | { kind: 'incursion-resolved'; outcome: 'won' | 'lost'; rewardCollected: boolean }
    | { kind: 'garrison-assigned' }
    | { kind: 'breed' }
    | { kind: 'front-captured' }
    | { kind: 'tier-reached'; tier: 'baseline'|'strain'|'mutant'|'chimera'|'progenitor' }
    | { kind: 'unit-count-changed'; count: number };
  export interface Directive {
    readonly id: DirectiveId;
    readonly title: string;         // player-facing (in-world)
    readonly hint: string;          // one-line in-world nudge
    readonly rewardSerum: number;
  }
  export const CHAIN: readonly Directive[];
  export const STANDING: readonly Directive[];
  export function nextInChain(current: DirectiveId | null): DirectiveId | null;
  export function completesFrom(id: DirectiveId, action: DirectiveAction): boolean;
  export function directiveById(id: DirectiveId): Directive;
  ```

- [ ] **Step 4.1.1: Write failing test**

Create `tests/state/directives.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CHAIN, STANDING, nextInChain, completesFrom, directiveById } from '../../src/state/directives';

describe('directives — chain order', () => {
  it('CHAIN has the 7 authored steps in the documented order', () => {
    expect(CHAIN.map((d) => d.id)).toEqual([
      'decant-first', 'inspect-first', 'decant-second',
      'launch-first-incursion', 'collect-first-reward',
      'station-on-occupation', 'try-a-breed',
    ]);
  });

  it('nextInChain walks the chain then falls off', () => {
    expect(nextInChain(null)).toBe('decant-first');
    expect(nextInChain('decant-first')).toBe('inspect-first');
    expect(nextInChain('try-a-breed')).toBeNull();
  });

  it('STANDING is non-empty and disjoint from CHAIN ids', () => {
    expect(STANDING.length).toBeGreaterThan(0);
    const chainIds = new Set(CHAIN.map((d) => d.id));
    for (const s of STANDING) expect(chainIds.has(s.id)).toBe(false);
  });
});

describe('directives — completesFrom matcher', () => {
  it('decant-first completes on decant', () => {
    expect(completesFrom('decant-first', { kind: 'decant' })).toBe(true);
    expect(completesFrom('decant-first', { kind: 'breed' })).toBe(false);
  });

  it('inspect-first completes on any DNA Lab detail view', () => {
    expect(completesFrom('inspect-first', { kind: 'view-dna-lab-detail', unitId: 1 })).toBe(true);
  });

  it('launch-first-incursion completes on incursion-launched', () => {
    expect(completesFrom('launch-first-incursion', { kind: 'incursion-launched' })).toBe(true);
  });

  it('collect-first-reward completes only on a WON resolution with rewardCollected', () => {
    expect(completesFrom('collect-first-reward', { kind: 'incursion-resolved', outcome: 'won', rewardCollected: true })).toBe(true);
    expect(completesFrom('collect-first-reward', { kind: 'incursion-resolved', outcome: 'lost', rewardCollected: true })).toBe(false);
    expect(completesFrom('collect-first-reward', { kind: 'incursion-resolved', outcome: 'won', rewardCollected: false })).toBe(false);
  });

  it('station-on-occupation completes on garrison-assigned', () => {
    expect(completesFrom('station-on-occupation', { kind: 'garrison-assigned' })).toBe(true);
  });

  it('try-a-breed completes on breed', () => {
    expect(completesFrom('try-a-breed', { kind: 'breed' })).toBe(true);
  });

  it('directiveById round-trips both CHAIN and STANDING', () => {
    for (const d of [...CHAIN, ...STANDING]) {
      expect(directiveById(d.id)).toEqual(d);
    }
  });
});
```

- [ ] **Step 4.1.2: Run test to verify it fails**

Run: `npx vitest run tests/state/directives.test.ts`
Expected: FAIL.

- [ ] **Step 4.1.3: Implement `directives.ts`**

Create `src/state/directives.ts`:

```ts
export type DirectiveId =
  | 'decant-first' | 'inspect-first' | 'decant-second'
  | 'launch-first-incursion' | 'collect-first-reward'
  | 'station-on-occupation' | 'try-a-breed'
  | 'take-a-front' | 'reach-strain' | 'grow-colony-to-five';

export type DirectiveAction =
  | { kind: 'decant' }
  | { kind: 'view-dna-lab-detail'; unitId: number }
  | { kind: 'incursion-launched' }
  | { kind: 'incursion-resolved'; outcome: 'won' | 'lost'; rewardCollected: boolean }
  | { kind: 'garrison-assigned' }
  | { kind: 'breed' }
  | { kind: 'front-captured' }
  | { kind: 'tier-reached'; tier: 'baseline' | 'strain' | 'mutant' | 'chimera' | 'progenitor' }
  | { kind: 'unit-count-changed'; count: number };

export interface Directive {
  readonly id: DirectiveId;
  readonly title: string;
  readonly hint: string;
  readonly rewardSerum: number;
}

export const CHAIN: readonly Directive[] = [
  { id: 'decant-first',           title: 'Decant your first specimen',      hint: 'A Morula holds one unique specimen. Open one.',                       rewardSerum: 10 },
  { id: 'inspect-first',          title: 'Inspect it in the DNA Lab',       hint: 'See what you made — lineage, generation, condition.',                rewardSerum: 10 },
  { id: 'decant-second',          title: 'Decant a second specimen',        hint: 'One is not an army.',                                                 rewardSerum: 10 },
  { id: 'launch-first-incursion', title: 'Launch your first Incursion',     hint: 'Pick a front, field four specimens, push.',                           rewardSerum: 15 },
  { id: 'collect-first-reward',   title: 'Take a front and collect',        hint: 'Win the mission, walk away with the Serum.',                          rewardSerum: 25 },
  { id: 'station-on-occupation',  title: 'Station a specimen on Occupation',hint: 'A held front earns you Serum passively. Assign a garrison.',          rewardSerum: 20 },
  { id: 'try-a-breed',            title: 'Try a breed',                     hint: 'Cross two specimens. The offspring is its own creature.',             rewardSerum: 15 },
];

export const STANDING: readonly Directive[] = [
  { id: 'take-a-front',           title: 'Take another front',              hint: 'The region has more than one weak spot.',                             rewardSerum: 30 },
  { id: 'reach-strain',           title: 'Produce a Strain-tier specimen',  hint: 'Unusual traits show up when you keep pulling.',                       rewardSerum: 40 },
  { id: 'grow-colony-to-five',    title: 'Grow the Colony to five',         hint: 'More bodies, more options.',                                          rewardSerum: 25 },
];

const BY_ID = new Map<DirectiveId, Directive>([...CHAIN, ...STANDING].map((d) => [d.id, d] as const));

export function directiveById(id: DirectiveId): Directive {
  const d = BY_ID.get(id);
  if (!d) throw new Error(`Unknown directive: ${id}`);
  return d;
}

export function nextInChain(current: DirectiveId | null): DirectiveId | null {
  if (current === null) return CHAIN[0]?.id ?? null;
  const idx = CHAIN.findIndex((d) => d.id === current);
  if (idx < 0) return null;
  return CHAIN[idx + 1]?.id ?? null;
}

export function completesFrom(id: DirectiveId, action: DirectiveAction): boolean {
  switch (id) {
    case 'decant-first':           return action.kind === 'decant';
    case 'inspect-first':          return action.kind === 'view-dna-lab-detail';
    case 'decant-second':          return action.kind === 'decant';
    case 'launch-first-incursion': return action.kind === 'incursion-launched';
    case 'collect-first-reward':
      return action.kind === 'incursion-resolved' && action.outcome === 'won' && action.rewardCollected;
    case 'station-on-occupation':  return action.kind === 'garrison-assigned';
    case 'try-a-breed':            return action.kind === 'breed';
    case 'take-a-front':           return action.kind === 'front-captured';
    case 'reach-strain':
      return action.kind === 'tier-reached' && action.tier !== 'baseline';
    case 'grow-colony-to-five':
      return action.kind === 'unit-count-changed' && action.count >= 5;
  }
}
```

- [ ] **Step 4.1.4: Run test to verify it passes**

Run: `npx vitest run tests/state/directives.test.ts`
Expected: PASS.

- [ ] **Step 4.1.5: Commit**

```bash
git add src/state/directives.ts tests/state/directives.test.ts
git commit -m "feat(state): directives model + CHAIN + STANDING + matchers (P4 Task 4.1)"
```

### Task 4.2: Store: `activeDirectiveId` + `completedDirectiveIds` + `emitDirectiveAction` + persist v11 → v12

**Files:**
- Modify: `src/state/colony.ts`
- Test: `tests/state/colony.directives.test.ts` (new); extend `tests/state/persist.test.ts`

**Interfaces:**
- Store adds:
  ```ts
  readonly activeDirectiveId: DirectiveId | null;
  readonly completedDirectiveIds: readonly DirectiveId[];
  readonly recentReward: { readonly directiveId: DirectiveId; readonly serum: number } | null;  // transient
  emitDirectiveAction: (action: DirectiveAction) => void;
  clearRecentReward: () => void;
  ```
- Behavior: `emitDirectiveAction(action)` — if `activeDirectiveId !== null` and `completesFrom(activeDirectiveId, action)`: grant the reward, push to `completedDirectiveIds`, advance to `nextInChain(activeDirectiveId)`. If the chain ends and any STANDING directive isn't yet completed, activate the first uncompleted STANDING.
- `recentReward` is transient (excluded from partialize) — a UI toast reads it and clears it.

- [ ] **Step 4.2.1: Wire into store**

In `src/state/colony.ts`:

1. Imports:
   ```ts
   import type { DirectiveId, DirectiveAction } from './directives';
   import { CHAIN, STANDING, nextInChain, completesFrom, directiveById } from './directives';
   ```
2. Extend `interface ColonyStore`:
   ```ts
   readonly activeDirectiveId: DirectiveId | null;
   readonly completedDirectiveIds: readonly DirectiveId[];
   readonly recentReward: { readonly directiveId: DirectiveId; readonly serum: number } | null;
   emitDirectiveAction: (action: DirectiveAction) => void;
   clearRecentReward: () => void;
   ```
3. Extend `INITIAL_STATE`:
   ```ts
   activeDirectiveId: 'decant-first' as DirectiveId,
   completedDirectiveIds: [] as readonly DirectiveId[],
   recentReward: null as { readonly directiveId: DirectiveId; readonly serum: number } | null,
   ```
4. Add the action inside the store factory:
   ```ts
   emitDirectiveAction: (action) => {
     const s = get();
     if (s.activeDirectiveId === null) return;
     if (!completesFrom(s.activeDirectiveId, action)) return;

     const d = directiveById(s.activeDirectiveId);
     const completed = [...s.completedDirectiveIds, s.activeDirectiveId];

     let nextId: DirectiveId | null = nextInChain(s.activeDirectiveId);
     if (nextId === null) {
       nextId = STANDING.find((sd) => !completed.includes(sd.id))?.id ?? null;
     }

     set({
       serum: s.serum + d.rewardSerum,
       activeDirectiveId: nextId,
       completedDirectiveIds: completed,
       recentReward: { directiveId: d.id, serum: d.rewardSerum },
     });
   },
   clearRecentReward: () => set({ recentReward: null }),
   ```
5. Extend `partialize`:
   ```ts
   activeDirectiveId: state.activeDirectiveId,
   completedDirectiveIds: state.completedDirectiveIds,
   // recentReward is transient — omit
   ```
6. Bump `version: 11` → `version: 12`.
7. Add migration branch:
   ```ts
   if (from < 12) {
     const partial = s as Partial<ColonyStore>;
     s = {
       ...s,
       activeDirectiveId: partial.activeDirectiveId ?? null,       // existing saves = no chain
       completedDirectiveIds: partial.completedDirectiveIds ?? [],
     };
   }
   ```

- [ ] **Step 4.2.2: Write failing test for the store action**

Create `tests/state/colony.directives.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';

describe('emitDirectiveAction', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });

  it('completes decant-first on a decant action and advances to inspect-first', () => {
    expect(useColonyStore.getState().activeDirectiveId).toBe('decant-first');
    useColonyStore.getState().emitDirectiveAction({ kind: 'decant' });
    const s = useColonyStore.getState();
    expect(s.completedDirectiveIds).toContain('decant-first');
    expect(s.activeDirectiveId).toBe('inspect-first');
    expect(s.recentReward?.directiveId).toBe('decant-first');
    expect(s.recentReward?.serum).toBe(10);
    expect(s.serum).toBe(200 + 10);
  });

  it('does nothing when the action does not match the active directive', () => {
    useColonyStore.getState().emitDirectiveAction({ kind: 'breed' });
    expect(useColonyStore.getState().activeDirectiveId).toBe('decant-first');
    expect(useColonyStore.getState().recentReward).toBeNull();
  });

  it('after the chain ends, activates a STANDING directive', () => {
    // Fast-forward the chain by seeding completed state.
    useColonyStore.setState({
      activeDirectiveId: 'try-a-breed',
      completedDirectiveIds: [
        'decant-first','inspect-first','decant-second',
        'launch-first-incursion','collect-first-reward','station-on-occupation',
      ],
    });
    useColonyStore.getState().emitDirectiveAction({ kind: 'breed' });
    const nextId = useColonyStore.getState().activeDirectiveId;
    expect(['take-a-front','reach-strain','grow-colony-to-five']).toContain(nextId);
  });

  it('clearRecentReward nulls the transient reward field', () => {
    useColonyStore.getState().emitDirectiveAction({ kind: 'decant' });
    useColonyStore.getState().clearRecentReward();
    expect(useColonyStore.getState().recentReward).toBeNull();
  });
});
```

- [ ] **Step 4.2.3: Add persist tests**

Append to `tests/state/persist.test.ts`:

```ts
  it('activeDirectiveId + completedDirectiveIds persist across rehydration', () => {
    useColonyStore.setState({
      activeDirectiveId: 'inspect-first',
      completedDirectiveIds: ['decant-first'],
    });
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed.state.activeDirectiveId).toBe('inspect-first');
    expect(parsed.state.completedDirectiveIds).toEqual(['decant-first']);
    expect(parsed.state.recentReward).toBeUndefined();
    expect(parsed.version).toBe(12);
  });

  it('migrate v11 → v12: existing saves default to null active directive', async () => {
    const v11Shape = {
      state: {
        units: [], nextId: 1,
        harvestsToday: 0, harvestDayKey: '2026-08-05', droughtCount: 0,
        breedsToday: 0, breedDayKey: '2026-08-05',
        fronts: FRESH_FRONTS,
        serum: 200, stims: 0, lastGarrisonTickAt: 1_700_000_000_000,
        buildings: { barracks: false, medbay: false },
        lastRestTickAt: 1_700_000_000_000,
        unlocks: DEFAULT_UNLOCKS,
        freeDecantsRemaining: 0, firstRunComplete: true,
      },
      version: 11,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v11Shape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    expect(s.activeDirectiveId).toBeNull();
    expect(s.completedDirectiveIds).toEqual([]);
  });
```

Update the six earlier `.toBe(11)` assertions on `parsed.version` (from Task 3.2) to `.toBe(12)`. Update the `v1 → v11` chain test to `v1 → v12` with:
```ts
expect(s.activeDirectiveId).toBeNull();
```

- [ ] **Step 4.2.4: Run tests**

Run: `npx vitest run tests/state/colony.directives.test.ts tests/state/persist.test.ts`
Expected: PASS.

- [ ] **Step 4.2.5: Commit**

```bash
git add src/state/colony.ts tests/state/colony.directives.test.ts tests/state/persist.test.ts
git commit -m "feat(state): active/completed directives + emit action + persist v12 (P4 Task 4.2)"
```

### Task 4.3: Hook directive events into existing store actions

**Files:**
- Modify: `src/state/colony.ts`

**Interfaces:**
- After each mutation in the following actions, if the transition warrants it, call `emitDirectiveAction` inline:
  - `decant()` — emit `{ kind: 'decant' }` and then `{ kind: 'tier-reached', tier: computeRarity(newUnit.genome).tier }` and `{ kind: 'unit-count-changed', count: newUnits.length }`.
  - `breed()` — emit `{ kind: 'breed' }` and same tier/count events.
  - `launchIncursion()` — emit `{ kind: 'incursion-launched' }`.
  - `dismissIncursion()` — emit `{ kind: 'incursion-resolved', outcome, rewardCollected: true }` when the ticker resolves with `activeIncursion?.outcome`.
  - `assignToGarrison()` — emit `{ kind: 'garrison-assigned' }` and additionally, if the assigned front is now captured with garrison meeting the target, emit `{ kind: 'front-captured' }`.

Concrete: after each `set({...})` in the listed actions, add:

```ts
get().emitDirectiveAction({ kind: 'decant' });
// ... other action-specific emits as listed above.
```

**Constraint:** the emit calls must be *after* `set(...)` so `emitDirectiveAction` reads the post-mutation state.

- [ ] **Step 4.3.1: Add integration test**

Create `tests/state/colony.directive-integration.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';

describe('directives — integration with real store actions', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });

  it('calling decant() advances the chain from decant-first', () => {
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().activeDirectiveId).toBe('inspect-first');
  });

  it('a second decant() advances from decant-second (after DNA Lab view)', () => {
    useColonyStore.getState().decant();
    useColonyStore.getState().emitDirectiveAction({ kind: 'view-dna-lab-detail', unitId: 1 });
    useColonyStore.getState().decant();
    expect(useColonyStore.getState().activeDirectiveId).toBe('launch-first-incursion');
  });
});
```

- [ ] **Step 4.3.2: Wire the emits in `colony.ts`**

For each action, find its `set({...})` calls and add the emits immediately after:

```ts
// end of decant() action, after the primary set(...)
get().emitDirectiveAction({ kind: 'decant' });
const nextUnits = get().units;
get().emitDirectiveAction({ kind: 'unit-count-changed', count: nextUnits.length });
if (newUnit) {
  const { tier } = computeRarity(newUnit.genome);
  get().emitDirectiveAction({ kind: 'tier-reached', tier });
}

// end of breed() action
get().emitDirectiveAction({ kind: 'breed' });
get().emitDirectiveAction({ kind: 'unit-count-changed', count: get().units.length });
const t = computeRarity(newUnit.genome).tier;
get().emitDirectiveAction({ kind: 'tier-reached', tier: t });

// end of launchIncursion() action, after set(...)
get().emitDirectiveAction({ kind: 'incursion-launched' });

// end of dismissIncursion() (or wherever activeIncursion → null triggers)
if (r) get().emitDirectiveAction({ kind: 'incursion-resolved', outcome: r.outcome, rewardCollected: true });

// end of assignToGarrison() action
get().emitDirectiveAction({ kind: 'garrison-assigned' });
if (nextFronts[frontId].captured && nextFronts[frontId].garrison.length >= GARRISON_TARGET) {
  get().emitDirectiveAction({ kind: 'front-captured' });
}
```

(The exact variable names — `newUnit`, `r`, `nextFronts` — depend on the local names in each action; consult the file.)

- [ ] **Step 4.3.3: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4.3.4: Commit**

```bash
git add src/state/colony.ts tests/state/colony.directive-integration.test.ts
git commit -m "feat(state): emit directive actions from real store mutations (P4 Task 4.3)"
```

### Task 4.4: `DirectiveBanner` component

**Files:**
- Create: `src/ui/components/DirectiveBanner.tsx`, `tests/ui/DirectiveBanner.test.tsx`
- Modify: `src/ui/styles.ts` (add `directiveBanner`, `directiveTitle`, `directiveHint`)

**Interfaces:**
- Produces: `export function DirectiveBanner(): ReactElement | null;`
- Reads `activeDirectiveId` from store, resolves via `directiveById`, renders `data-testid="directive-banner"` with title + hint. Returns `null` when active is `null`.

- [ ] **Step 4.4.1: Styles**

In `src/ui/styles.ts`:

```ts
  directiveBanner: {
    background: '#fef3c7',
    borderLeft: '4px solid #f59e0b',
    padding: '10px 16px',
    margin: '0 auto 16px auto',
    maxWidth: 1400,
    borderRadius: 4,
  } as CSSProperties,

  directiveTitle: {
    fontWeight: 600,
    fontSize: 14,
    color: '#78350f',
  } as CSSProperties,

  directiveHint: {
    fontSize: 12,
    color: '#92400e',
    marginTop: 2,
  } as CSSProperties,
```

- [ ] **Step 4.4.2: Write failing test**

Create `tests/ui/DirectiveBanner.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DirectiveBanner } from '../../src/ui/components/DirectiveBanner';
import { useColonyStore } from '../../src/state/colony';

describe('DirectiveBanner', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('renders the title + hint for the active directive', () => {
    const { getByTestId } = render(<DirectiveBanner />);
    expect(getByTestId('directive-banner').textContent).toContain('Decant your first specimen');
    expect(getByTestId('directive-banner').textContent).toContain('Morula');
  });

  it('returns null when no directive is active', () => {
    useColonyStore.setState({ activeDirectiveId: null });
    const { queryByTestId } = render(<DirectiveBanner />);
    expect(queryByTestId('directive-banner')).toBeNull();
  });
});
```

- [ ] **Step 4.4.3: Implement**

Create `src/ui/components/DirectiveBanner.tsx`:

```tsx
import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { directiveById } from '../../state/directives';
import { styles } from '../styles';

export function DirectiveBanner(): ReactElement | null {
  const id = useColonyStore((s) => s.activeDirectiveId);
  if (id === null) return null;
  const d = directiveById(id);
  return (
    <div style={styles.directiveBanner} data-testid="directive-banner">
      <div style={styles.directiveTitle}>{d.title}</div>
      <div style={styles.directiveHint}>{d.hint}</div>
    </div>
  );
}
```

- [ ] **Step 4.4.4: Run tests**

Run: `npx vitest run tests/ui/DirectiveBanner.test.tsx`
Expected: PASS.

- [ ] **Step 4.4.5: Commit**

```bash
git add src/ui/components/DirectiveBanner.tsx tests/ui/DirectiveBanner.test.tsx src/ui/styles.ts
git commit -m "feat(ui): DirectiveBanner (P4 Task 4.4)"
```

### Task 4.5: `RewardToast` component

**Files:**
- Create: `src/ui/components/RewardToast.tsx`, `tests/ui/RewardToast.test.tsx`
- Modify: `src/ui/styles.ts` (add `toast`, `toastBody`)

**Interfaces:**
- Produces: `export function RewardToast(): ReactElement | null;`
- Reads `recentReward` from store. Renders `data-testid="reward-toast"` with `+{serum} SR` and the directive's title. Auto-dismisses after 3s via `setTimeout` + `clearRecentReward`.

- [ ] **Step 4.5.1: Styles**

In `src/ui/styles.ts`:

```ts
  toast: {
    position: 'fixed',
    bottom: 24, right: 24,
    padding: '10px 16px',
    borderRadius: 6,
    background: '#0f172a',
    color: '#e2e8f0',
    fontSize: 13,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    zIndex: 90,
    maxWidth: 320,
  } as CSSProperties,

  toastBody: { lineHeight: 1.4 } as CSSProperties,
```

- [ ] **Step 4.5.2: Test**

Create `tests/ui/RewardToast.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { RewardToast } from '../../src/ui/components/RewardToast';
import { useColonyStore } from '../../src/state/colony';

describe('RewardToast', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('renders nothing when recentReward is null', () => {
    const { queryByTestId } = render(<RewardToast />);
    expect(queryByTestId('reward-toast')).toBeNull();
  });

  it('renders when recentReward is set and includes the SR gain', () => {
    useColonyStore.setState({ recentReward: { directiveId: 'decant-first', serum: 10 } });
    const { getByTestId } = render(<RewardToast />);
    expect(getByTestId('reward-toast').textContent).toContain('10');
  });

  it('auto-dismisses after 3 seconds', () => {
    vi.useFakeTimers();
    useColonyStore.setState({ recentReward: { directiveId: 'decant-first', serum: 10 } });
    const { queryByTestId } = render(<RewardToast />);
    expect(queryByTestId('reward-toast')).not.toBeNull();
    act(() => { vi.advanceTimersByTime(3100); });
    expect(useColonyStore.getState().recentReward).toBeNull();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 4.5.3: Implement**

Create `src/ui/components/RewardToast.tsx`:

```tsx
import { useEffect, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { directiveById } from '../../state/directives';
import { TERMS } from '../terms';
import { styles } from '../styles';

export function RewardToast(): ReactElement | null {
  const reward = useColonyStore((s) => s.recentReward);
  const clear = useColonyStore((s) => s.clearRecentReward);

  useEffect(() => {
    if (reward === null) return;
    const t = setTimeout(clear, 3000);
    return () => clearTimeout(t);
  }, [reward, clear]);

  if (reward === null) return null;
  const d = directiveById(reward.directiveId);
  return (
    <div style={styles.toast} data-testid="reward-toast">
      <div style={styles.toastBody}>
        <strong>+{reward.serum} {TERMS.serumAbbr}</strong> — {d.title} complete
      </div>
    </div>
  );
}
```

- [ ] **Step 4.5.4: Run tests + commit**

```bash
npx vitest run tests/ui/RewardToast.test.tsx
git add src/ui/components/RewardToast.tsx tests/ui/RewardToast.test.tsx src/ui/styles.ts
git commit -m "feat(ui): RewardToast (P4 Task 4.5)"
```

### Task 4.6: Mount `DirectiveBanner`, `RewardToast`, and wire directive text into HUD

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/ui/components/StatusHud.tsx` (already accepts directiveText — feed it the active directive's title)

**Interfaces:**
- `App.tsx` reads `activeDirectiveId` and computes `directiveText` via `directiveById(...).title`, passes to `AppShell`. Also mounts `<DirectiveBanner />` inside the shell children (above each screen) and `<RewardToast />` at the App root.

- [ ] **Step 4.6.1: Update `App.tsx`**

Add imports:
```ts
import { DirectiveBanner } from './ui/components/DirectiveBanner';
import { RewardToast } from './ui/components/RewardToast';
import { directiveById } from './state/directives';
```

Inside the body (post-boot branch), before the `screen` const, compute:

```ts
const activeId = useColonyStore((s) => s.activeDirectiveId);
const directiveText = activeId === null ? null : directiveById(activeId).title;
```

Wrap the `screen` in a fragment with the banner:

```tsx
<AppShell current={current} onNavigate={setCurrent} directiveText={directiveText}>
  <DirectiveBanner />
  {screen}
</AppShell>
{!firstRunComplete && <IntroModal onDone={markFirstRunComplete} />}
<AwaySummary />
<RewardToast />
```

- [ ] **Step 4.6.2: Also emit `view-dna-lab-detail` from `DNALab` on row click**

In `src/ui/screens/DNALab.tsx`, extend the `onClick` handler:

```tsx
onClick={() => {
  setPickedId(u.id);
  useColonyStore.getState().emitDirectiveAction({ kind: 'view-dna-lab-detail', unitId: u.id });
}}
```

Add a test to `tests/ui/DNALab.test.tsx`:

```ts
  it('clicking a row emits view-dna-lab-detail', () => {
    useColonyStore.setState({ activeDirectiveId: 'inspect-first' });
    // seed one unit ...
    // ... after clicking dna-lab-row-N:
    expect(useColonyStore.getState().activeDirectiveId).toBe('decant-second');
  });
```

(Full test setup mirrors the existing DNALab tests.)

- [ ] **Step 4.6.3: Run full suite**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 4.6.4: Commit**

```bash
git add src/App.tsx src/ui/screens/DNALab.tsx tests/ui/DNALab.test.tsx
git commit -m "chore(ui): mount DirectiveBanner + RewardToast and pipe directive text into HUD (P4 Task 4.6)"
```

### Phase 4 done-when check

- [ ] Fresh run: HUD shows "Directive: Decant your first specimen"; a yellow banner below the nav shows the title + hint.
- [ ] Click Decant: banner + HUD change to "Inspect it in the DNA Lab"; a dark reward toast appears with `+10 SR`.
- [ ] Navigate to DNA Lab, pick the unit → banner advances to "Decant a second specimen".
- [ ] Complete the whole chain manually — after the 7th completion, a STANDING directive activates.
- [ ] Reload → active directive persists.


## Phase 5 — Progressive disclosure / unlocks

**Goal:** Fresh player sees only the starting systems (Colony, DNA Lab, Breed, Incursion, Conquest Map stub, Vivarium, Registry stub). The Vat, the Sequencer, and additional-fronts machinery start **locked** with a clear reason. Each unlock fires with a distinct toast.

### Task 5.1: Author locked defaults + `unlockSurface` action

**Files:**
- Modify: `src/state/unlocks.ts` (rewrite `DEFAULT_UNLOCKS`; add `LOCKED_STARTING` and `UNLOCK_REASONS`)
- Modify: `src/state/colony.ts` (add `unlockSurface` action + transient `recentUnlock` field)
- Test: extend `tests/state/unlocks.test.ts`; add `tests/state/colony.unlocks.test.ts`

**Interfaces:**
- `unlocks.ts` now exports:
  ```ts
  export const LOCKED_STARTING: UnlocksMap;                     // Vat + Sequencer locked
  export const UNLOCK_REASONS: Readonly<Record<SurfaceId, string>>;
  ```
- `DEFAULT_UNLOCKS` becomes an alias for `LOCKED_STARTING` (new-game starts locked, not unlocked). Existing migrations keep their `?? DEFAULT_UNLOCKS` — post-migration everything defaults to the locked baseline; the migration `if (from < 10)` fallback keeps behavior for existing saves.
- **Migration adjustment:** rewrite the P1 `if (from < 10)` migration so existing v9 saves get `LOCKED_STARTING` too — but immediately unlock any surface the player has *already used*. Detect "used" heuristically: `serum > SERUM_STARTING_BALANCE * 2` OR `units.length > 3` ⇒ unlock everything except `sequencer`. This means an existing-save player doesn't get regressed to "locked" screens they've already been using.

Actually — simpler and safer: **do not backfill locks for existing saves**. Existing saves keep `DEFAULT_UNLOCKS` (everything unlocked) from Task 1.1's migration. New games use `LOCKED_STARTING`. This means fresh saves see the locked flow; migrating saves stay ungated. Reset via `resetGame()` uses `LOCKED_STARTING`.

Rewrite Task 5.1 with that decision:

- Add `LOCKED_STARTING` and `UNLOCK_REASONS` to `unlocks.ts`; keep `DEFAULT_UNLOCKS` as all-unlocked (do not break the migration).
- In `INITIAL_STATE` in `colony.ts`, change `unlocks: DEFAULT_UNLOCKS,` → `unlocks: LOCKED_STARTING,`. This affects `resetGame()` and fresh boots.
- Store gains `unlockSurface(id, reason?)` and transient `recentUnlock: { id, reason } | null` + `clearRecentUnlock()`.

- [ ] **Step 5.1.1: Extend `unlocks.ts`**

Replace `src/state/unlocks.ts` with:

```ts
export type SurfaceId =
  | 'colony' | 'dna-lab' | 'breed' | 'vat' | 'incursion'
  | 'vivarium' | 'conquest-map' | 'sequencer' | 'registry';

export type UnlockStatus = 'unlocked' | 'locked';

export interface UnlockState {
  readonly status: UnlockStatus;
  readonly reason?: string;
}

export type UnlocksMap = Readonly<Record<SurfaceId, UnlockState>>;

const U: UnlockState = { status: 'unlocked' };

/** Everything unlocked. Used as the migration fallback for existing saves. */
export const DEFAULT_UNLOCKS: UnlocksMap = {
  colony: U, 'dna-lab': U, breed: U, vat: U, incursion: U,
  vivarium: U, 'conquest-map': U, sequencer: U, registry: U,
};

/** New-game starting locks: Vat + Sequencer hidden behind directive progress. */
export const LOCKED_STARTING: UnlocksMap = {
  colony:         U,
  'dna-lab':      U,
  breed:          U,
  incursion:      U,
  vivarium:       U,
  'conquest-map': U,
  registry:       U,
  vat:            { status: 'locked', reason: 'Take your first front to unlock the Vat.' },
  sequencer:      { status: 'locked', reason: 'A deferred model change. Not yet available.' },
};

export const UNLOCK_REASONS: Readonly<Record<SurfaceId, string>> = {
  colony:         'Your creations.',
  'dna-lab':      'Inspect any specimen you own.',
  breed:          'Cross two specimens.',
  vat:            'Fuse ten same-tier specimens into one, pristine.',
  incursion:      'Contest a front.',
  vivarium:       'Build living quarters and infirmary.',
  'conquest-map': 'See the region you are pressuring.',
  sequencer:      'Peek at a Morula before you Decant it.',
  registry:       'Look up anything you have met.',
};

export function isUnlocked(map: UnlocksMap, id: SurfaceId): boolean {
  return map[id].status === 'unlocked';
}
```

Update `tests/state/unlocks.test.ts`:

```ts
import { DEFAULT_UNLOCKS, LOCKED_STARTING, isUnlocked, UNLOCK_REASONS, type SurfaceId } from '../../src/state/unlocks';

describe('LOCKED_STARTING', () => {
  it('locks Vat and Sequencer, unlocks everything else', () => {
    expect(LOCKED_STARTING.vat.status).toBe('locked');
    expect(LOCKED_STARTING.sequencer.status).toBe('locked');
    for (const id of ['colony','dna-lab','breed','incursion','vivarium','conquest-map','registry'] as SurfaceId[]) {
      expect(LOCKED_STARTING[id].status).toBe('unlocked');
    }
  });

  it('UNLOCK_REASONS has an entry for every surface', () => {
    const ids: SurfaceId[] = ['colony','dna-lab','breed','vat','incursion','vivarium','conquest-map','sequencer','registry'];
    for (const id of ids) expect(UNLOCK_REASONS[id]).toBeTruthy();
  });
});
```

- [ ] **Step 5.1.2: Wire `unlockSurface` + `recentUnlock` into the store**

In `src/state/colony.ts`:

1. Import: `import { LOCKED_STARTING, UNLOCK_REASONS, type SurfaceId } from './unlocks';`
2. Change `INITIAL_STATE.unlocks` from `DEFAULT_UNLOCKS` to `LOCKED_STARTING`.
3. Add fields to `ColonyStore`:
   ```ts
   readonly recentUnlock: { readonly id: SurfaceId; readonly reason: string } | null;
   unlockSurface: (id: SurfaceId) => void;
   clearRecentUnlock: () => void;
   ```
4. Add to `INITIAL_STATE`:
   ```ts
   recentUnlock: null as { readonly id: SurfaceId; readonly reason: string } | null,
   ```
5. Actions:
   ```ts
   unlockSurface: (id) => {
     const s = get();
     if (s.unlocks[id].status === 'unlocked') return;
     set({
       unlocks: { ...s.unlocks, [id]: { status: 'unlocked' } },
       recentUnlock: { id, reason: UNLOCK_REASONS[id] },
     });
   },
   clearRecentUnlock: () => set({ recentUnlock: null }),
   ```
6. `partialize` — add `unlocks: state.unlocks,` is already there from Task 1.1; do NOT add `recentUnlock` (transient).

No version bump — the `unlocks` field already persists; only its default value changed for new games. Existing saves are unaffected because `if (from < 10)` uses `?? DEFAULT_UNLOCKS`.

- [ ] **Step 5.1.3: Test `unlockSurface`**

Create `tests/state/colony.unlocks.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';
import { LOCKED_STARTING } from '../../src/state/unlocks';

describe('unlockSurface', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });

  it('resetGame starts with Vat and Sequencer locked', () => {
    const s = useColonyStore.getState();
    expect(s.unlocks.vat.status).toBe('locked');
    expect(s.unlocks.sequencer.status).toBe('locked');
  });

  it('unlockSurface flips status and sets recentUnlock', () => {
    useColonyStore.getState().unlockSurface('vat');
    const s = useColonyStore.getState();
    expect(s.unlocks.vat.status).toBe('unlocked');
    expect(s.recentUnlock?.id).toBe('vat');
    expect(s.recentUnlock?.reason).toBeTruthy();
  });

  it('unlockSurface on an already-unlocked surface is a no-op', () => {
    useColonyStore.getState().unlockSurface('colony');
    expect(useColonyStore.getState().recentUnlock).toBeNull();
  });

  it('clearRecentUnlock nulls the transient field', () => {
    useColonyStore.getState().unlockSurface('vat');
    useColonyStore.getState().clearRecentUnlock();
    expect(useColonyStore.getState().recentUnlock).toBeNull();
  });
});
```

- [ ] **Step 5.1.4: Persist test for `recentUnlock` transience**

Append to `tests/state/persist.test.ts`:

```ts
  it('recentUnlock is transient — never in localStorage', () => {
    useColonyStore.setState({ recentUnlock: { id: 'vat', reason: 'test' } });
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed.state.recentUnlock).toBeUndefined();
  });
```

- [ ] **Step 5.1.5: Run tests + commit**

```bash
npx vitest run tests/state/unlocks.test.ts tests/state/colony.unlocks.test.ts tests/state/persist.test.ts
git add src/state/unlocks.ts src/state/colony.ts tests/state/unlocks.test.ts tests/state/colony.unlocks.test.ts tests/state/persist.test.ts
git commit -m "feat(state): LOCKED_STARTING defaults + unlockSurface action (P5 Task 5.1)"
```

### Task 5.2: Trigger unlocks from directive completions

**Files:**
- Modify: `src/state/colony.ts` (extend `emitDirectiveAction` to call `unlockSurface` after certain completions)

**Interfaces:**
- After a directive completes, if it's `'collect-first-reward'`, unlock `'vat'`.
- The `sequencer` stays locked in this plan — it depends on the deferred Morula-as-entity model change; a separate future prompt unlocks it.

- [ ] **Step 5.2.1: Extend `emitDirectiveAction`**

In `emitDirectiveAction`, after the `set({...})` that advances the directive, add:

```ts
// Unlock cascades keyed to directive completions.
if (d.id === 'collect-first-reward') {
  // Deferred: call inside a queueMicrotask so it runs after the set() above commits.
  queueMicrotask(() => get().unlockSurface('vat'));
}
```

(Using `queueMicrotask` so the unlock's `set()` doesn't race the directive-advance `set()`.)

- [ ] **Step 5.2.2: Test the cascade**

Append to `tests/state/colony.unlocks.test.ts`:

```ts
  it('completing collect-first-reward unlocks the Vat', async () => {
    useColonyStore.setState({
      activeDirectiveId: 'collect-first-reward',
      completedDirectiveIds: ['decant-first','inspect-first','decant-second','launch-first-incursion'],
    });
    useColonyStore.getState().emitDirectiveAction({
      kind: 'incursion-resolved', outcome: 'won', rewardCollected: true,
    });
    // queueMicrotask flush
    await Promise.resolve();
    expect(useColonyStore.getState().unlocks.vat.status).toBe('unlocked');
    expect(useColonyStore.getState().recentUnlock?.id).toBe('vat');
  });
```

- [ ] **Step 5.2.3: Run + commit**

```bash
npx vitest run tests/state/colony.unlocks.test.ts
git add src/state/colony.ts tests/state/colony.unlocks.test.ts
git commit -m "feat(state): unlock Vat on collect-first-reward (P5 Task 5.2)"
```

### Task 5.3: `UnlockedToast` component + mount

**Files:**
- Create: `src/ui/components/UnlockedToast.tsx`, `tests/ui/UnlockedToast.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `export function UnlockedToast(): ReactElement | null;`
- Reads `recentUnlock`; renders `data-testid="unlocked-toast"` with "Unlocked: {label} — {reason}"; auto-dismisses after 4s via `clearRecentUnlock`.

- [ ] **Step 5.3.1: Test**

Create `tests/ui/UnlockedToast.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { UnlockedToast } from '../../src/ui/components/UnlockedToast';
import { useColonyStore } from '../../src/state/colony';

describe('UnlockedToast', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('null when recentUnlock is null', () => {
    const { queryByTestId } = render(<UnlockedToast />);
    expect(queryByTestId('unlocked-toast')).toBeNull();
  });

  it('renders label + reason for the Vat', () => {
    useColonyStore.setState({ recentUnlock: { id: 'vat', reason: 'Fuse ten same-tier specimens into one, pristine.' } });
    const { getByTestId } = render(<UnlockedToast />);
    const text = getByTestId('unlocked-toast').textContent ?? '';
    expect(text).toContain('Unlocked');
    expect(text).toContain('Vat');
    expect(text).toContain('Fuse');
  });

  it('auto-dismisses after 4s', () => {
    vi.useFakeTimers();
    useColonyStore.setState({ recentUnlock: { id: 'vat', reason: 'x' } });
    render(<UnlockedToast />);
    act(() => { vi.advanceTimersByTime(4100); });
    expect(useColonyStore.getState().recentUnlock).toBeNull();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 5.3.2: Implement**

Create `src/ui/components/UnlockedToast.tsx`:

```tsx
import { useEffect, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { TERMS } from '../terms';
import { styles } from '../styles';

const LABELS: Record<string, string> = {
  colony: TERMS.colony,
  'dna-lab': TERMS.dnaLab,
  breed: 'Breed',
  vat: TERMS.vat,
  incursion: TERMS.incursion,
  vivarium: TERMS.vivarium,
  'conquest-map': TERMS.conquestMap,
  sequencer: TERMS.sequencer,
  registry: TERMS.registry,
};

export function UnlockedToast(): ReactElement | null {
  const recent = useColonyStore((s) => s.recentUnlock);
  const clear = useColonyStore((s) => s.clearRecentUnlock);

  useEffect(() => {
    if (recent === null) return;
    const t = setTimeout(clear, 4000);
    return () => clearTimeout(t);
  }, [recent, clear]);

  if (recent === null) return null;
  return (
    <div style={styles.toast} data-testid="unlocked-toast">
      <div style={styles.toastBody}>
        <strong>{TERMS.unlocked}:</strong> {LABELS[recent.id]} — {recent.reason}
      </div>
    </div>
  );
}
```

- [ ] **Step 5.3.3: Mount in `App.tsx`**

In `src/App.tsx`:

Add import: `import { UnlockedToast } from './ui/components/UnlockedToast';`

Add to the return (after `<RewardToast />`):

```tsx
<UnlockedToast />
```

- [ ] **Step 5.3.4: Run tests + commit**

```bash
npx vitest run tests/ui/UnlockedToast.test.tsx
git add src/ui/components/UnlockedToast.tsx tests/ui/UnlockedToast.test.tsx src/App.tsx
git commit -m "feat(ui): UnlockedToast + mount (P5 Task 5.3)"
```

### Task 5.4: Locked-tab UX confirmation

**Files:** none new — verify existing AppShell behavior against `LOCKED_STARTING`.

- [ ] **Step 5.4.1: Add integration test**

Create `tests/ui/onboarding-flow.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { App } from '../../src/App';
import { useColonyStore } from '../../src/state/colony';

describe('onboarding — locked → unlocked flow', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('fresh state: Vat + Sequencer tabs are disabled', () => {
    const { getByTestId } = render(<App />);
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    fireEvent.click(getByTestId('intro-modal-skip'));
    expect((getByTestId('nav-tab-vat') as HTMLButtonElement).disabled).toBe(true);
    expect((getByTestId('nav-tab-sequencer') as HTMLButtonElement).disabled).toBe(true);
    expect((getByTestId('nav-tab-colony') as HTMLButtonElement).disabled).toBe(false);
  });

  it('after unlockSurface("vat"), the Vat tab becomes enabled and toast fires', () => {
    const { getByTestId } = render(<App />);
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    fireEvent.click(getByTestId('intro-modal-skip'));
    useColonyStore.getState().unlockSurface('vat');
    expect((getByTestId('nav-tab-vat') as HTMLButtonElement).disabled).toBe(false);
    expect(getByTestId('unlocked-toast')).toBeDefined();
  });
});
```

- [ ] **Step 5.4.2: Run + commit**

```bash
npx vitest run tests/ui/onboarding-flow.test.tsx
git add tests/ui/onboarding-flow.test.tsx
git commit -m "test(ui): integration — locked→unlocked onboarding flow (P5 Task 5.4)"
```

### Phase 5 done-when check

- [ ] Fresh New Game: nav shows Vat and Sequencer tabs disabled, cursor `not-allowed`, tooltip explains why.
- [ ] Complete the chain through "collect-first-reward" (win an Incursion). Immediately after, an "Unlocked: the Vat — …" toast appears and the Vat tab becomes enabled.
- [ ] Reload → Vat stays unlocked. Sequencer stays locked.


## Phase 6 — Contextual guidance: empty states, first-visit callouts, term tooltips

**Goal:** Every surface explains itself. Every screen has a real empty state naming the single next action. Every unfamiliar term is hoverable. Definitions explain *what a thing is and does* — never hidden mechanics. **Omit `pristine`/`degraded` for now** — wear function is `[OPEN]` in spec §6.

### Task 6.1: `definitions.ts` — one-liner per term

**Files:**
- Create: `src/ui/definitions.ts`, `tests/ui/definitions.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type TermKey =
    | 'morula' | 'decant' | 'harvest' | 'incursion' | 'occupation' | 'vat' | 'dnaLab'
    | 'sequencer' | 'registry' | 'colony' | 'vivarium' | 'serum' | 'freeDecant'
    | 'generation' | 'tier-baseline' | 'tier-strain' | 'tier-mutant' | 'tier-chimera' | 'tier-progenitor';
  export const DEFINITIONS: Readonly<Record<TermKey, string>>;
  export function definitionOf(k: TermKey): string;
  ```
- Each definition is a single sentence in-world, ≤ 140 chars, no numbers, no thresholds, no probabilities.

- [ ] **Step 6.1.1: Test**

Create `tests/ui/definitions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DEFINITIONS, definitionOf, type TermKey } from '../../src/ui/definitions';

const ALL: TermKey[] = [
  'morula','decant','harvest','incursion','occupation','vat','dnaLab','sequencer',
  'registry','colony','vivarium','serum','freeDecant','generation',
  'tier-baseline','tier-strain','tier-mutant','tier-chimera','tier-progenitor',
];

describe('DEFINITIONS', () => {
  it('has an entry for every TermKey', () => {
    for (const k of ALL) expect(DEFINITIONS[k]).toBeTruthy();
  });

  it('every definition is ≤ 140 chars and free of numeric leakage', () => {
    for (const k of ALL) {
      const d = DEFINITIONS[k];
      expect(d.length).toBeLessThanOrEqual(140);
      expect(d).not.toMatch(/\b\d+\s*%|\b0\.\d|\bthreshold\b|\bprobability\b|\bweight\b|\brecessive\b|\bdominance\b|\bdominant\b|\bstack\b|\btail\b|\baberration\b/i);
    }
  });

  it('does not define pristine or degraded (deferred)', () => {
    expect((DEFINITIONS as unknown as Record<string, string>).pristine).toBeUndefined();
    expect((DEFINITIONS as unknown as Record<string, string>).degraded).toBeUndefined();
  });

  it('definitionOf throws on unknown key', () => {
    expect(() => definitionOf('bogus' as TermKey)).toThrow();
  });
});
```

- [ ] **Step 6.1.2: Implement**

Create `src/ui/definitions.ts`:

```ts
export type TermKey =
  | 'morula' | 'decant' | 'harvest' | 'incursion' | 'occupation' | 'vat' | 'dnaLab'
  | 'sequencer' | 'registry' | 'colony' | 'vivarium' | 'serum' | 'freeDecant'
  | 'generation' | 'tier-baseline' | 'tier-strain' | 'tier-mutant' | 'tier-chimera' | 'tier-progenitor';

export const DEFINITIONS: Readonly<Record<TermKey, string>> = {
  morula:      'An unopened vat-embryo. Decant one to reveal the specimen inside.',
  decant:      'Open a Morula and grow the specimen inside into your Colony.',
  harvest:     'Draw a fresh Morula from the vat pipeline.',
  incursion:   'Push against a contested front with a team of four specimens.',
  occupation:  'Garrison a held front so it stays yours and earns you Serum.',
  vat:         'Fuse ten same-tier specimens into one, pristine.',
  dnaLab:      'Inspect a specimen you already own — lineage, condition, tier.',
  sequencer:   'Peek at what is inside a Morula before you Decant it.',
  registry:    'A reference of everything you have met.',
  colony:      'Every specimen you have Decanted and kept.',
  vivarium:    'Buildings that shape your Colony: Barracks raise the cap, Medbay speeds recovery.',
  serum:       'The currency the operation runs on. You earn it and spend it on Morulae, breeding, and gear.',
  freeDecant:  'A Decant that costs no daily-Harvest slot.',
  generation:  'How many breeding steps deep a specimen sits — pure lineage depth, not a stat.',
  'tier-baseline':   'An ordinary specimen. Common but never worthless.',
  'tier-strain':     'A specimen with an unusual trait or two.',
  'tier-mutant':     'A specimen with several unusual traits.',
  'tier-chimera':    'A specimen with an uncommon trait fully showing.',
  'tier-progenitor': 'The rarest expression, seldom seen.',
};

export function definitionOf(k: TermKey): string {
  const d = DEFINITIONS[k];
  if (!d) throw new Error(`Unknown TermKey: ${k}`);
  return d;
}
```

- [ ] **Step 6.1.3: Run + commit**

```bash
npx vitest run tests/ui/definitions.test.ts
git add src/ui/definitions.ts tests/ui/definitions.test.ts
git commit -m "feat(ui): term definitions (P6 Task 6.1)"
```

### Task 6.2: `TermTooltip` component

**Files:**
- Create: `src/ui/components/TermTooltip.tsx`, `tests/ui/TermTooltip.test.tsx`
- Modify: `src/ui/styles.ts` (add `tooltipBubble`, `tooltipTrigger`)

**Interfaces:**
- Produces: `export function TermTooltip(props: { termKey: TermKey; children: ReactNode }): ReactElement;`
- Behavior: wraps children in a `<span>` with a subtle underline (`styles.tooltipTrigger`). On hover/focus, shows a bubble with the definition (`data-testid="tooltip-bubble-{termKey}"`). Uses native `title` attribute as the accessible fallback; the styled bubble is CSS-only via `:hover`.

Simplest implementation for a testable, jsdom-friendly component: use React state for hover open/close (a fake `mouseenter`/`mouseleave` handler pair) rather than CSS `:hover` (which jsdom does not paint but does dispatch events).

- [ ] **Step 6.2.1: Styles**

In `src/ui/styles.ts`:

```ts
  tooltipTrigger: {
    borderBottom: '1px dotted #64748b',
    cursor: 'help',
    position: 'relative',
    display: 'inline',
  } as CSSProperties,

  tooltipBubble: {
    position: 'absolute',
    bottom: 'calc(100% + 6px)',
    left: 0,
    zIndex: 50,
    padding: '6px 10px',
    background: '#0f172a',
    color: '#e2e8f0',
    fontSize: 12,
    lineHeight: 1.4,
    borderRadius: 4,
    maxWidth: 280,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    whiteSpace: 'normal',
  } as CSSProperties,
```

- [ ] **Step 6.2.2: Test**

Create `tests/ui/TermTooltip.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { TermTooltip } from '../../src/ui/components/TermTooltip';

describe('TermTooltip', () => {
  afterEach(() => cleanup());

  it('renders the child inline', () => {
    const { getByText } = render(<TermTooltip termKey="morula">Morula</TermTooltip>);
    expect(getByText('Morula')).toBeDefined();
  });

  it('reveals the bubble on mouseenter and hides on mouseleave', () => {
    const { getByText, queryByTestId, getByTestId } = render(
      <TermTooltip termKey="morula">Morula</TermTooltip>,
    );
    const trigger = getByText('Morula').closest('span')!;
    expect(queryByTestId('tooltip-bubble-morula')).toBeNull();
    fireEvent.mouseEnter(trigger);
    expect(getByTestId('tooltip-bubble-morula').textContent).toContain('vat-embryo');
    fireEvent.mouseLeave(trigger);
    expect(queryByTestId('tooltip-bubble-morula')).toBeNull();
  });
});
```

- [ ] **Step 6.2.3: Implement**

Create `src/ui/components/TermTooltip.tsx`:

```tsx
import { useState, type ReactElement, type ReactNode } from 'react';
import { definitionOf, type TermKey } from '../definitions';
import { styles } from '../styles';

export function TermTooltip(props: { termKey: TermKey; children: ReactNode }): ReactElement {
  const [open, setOpen] = useState(false);
  const def = definitionOf(props.termKey);
  return (
    <span
      style={styles.tooltipTrigger}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      title={def}
    >
      {props.children}
      {open && (
        <span style={styles.tooltipBubble} data-testid={`tooltip-bubble-${props.termKey}`}>
          {def}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 6.2.4: Run + commit**

```bash
npx vitest run tests/ui/TermTooltip.test.tsx
git add src/ui/components/TermTooltip.tsx tests/ui/TermTooltip.test.tsx src/ui/styles.ts
git commit -m "feat(ui): TermTooltip primitive (P6 Task 6.2)"
```

### Task 6.3: `seen.ts` — first-visit tracking + persist v12 → v13

**Files:**
- Create: `src/state/seen.ts`, `tests/state/seen.test.ts`
- Modify: `src/state/colony.ts` (add `seenSurfaces` field + `markSeen` action + persist v12 → v13)

**Interfaces:**
- `seen.ts` exports:
  ```ts
  export type SeenMap = Readonly<Record<import('./unlocks').SurfaceId, boolean>>;
  export const SEEN_INITIAL: SeenMap;   // all false
  export function hasSeen(map: SeenMap, id: SurfaceId): boolean;
  ```
- Store gains: `readonly seenSurfaces: SeenMap; markSeen: (id: SurfaceId) => void;`

- [ ] **Step 6.3.1: `seen.ts` + test**

Create `src/state/seen.ts`:

```ts
import type { SurfaceId } from './unlocks';

export type SeenMap = Readonly<Record<SurfaceId, boolean>>;

export const SEEN_INITIAL: SeenMap = {
  colony: false, 'dna-lab': false, breed: false, vat: false, incursion: false,
  vivarium: false, 'conquest-map': false, sequencer: false, registry: false,
};

export function hasSeen(map: SeenMap, id: SurfaceId): boolean {
  return map[id] === true;
}
```

Create `tests/state/seen.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SEEN_INITIAL, hasSeen } from '../../src/state/seen';

describe('seen', () => {
  it('SEEN_INITIAL is all false', () => {
    for (const v of Object.values(SEEN_INITIAL)) expect(v).toBe(false);
  });
  it('hasSeen reflects the map', () => {
    expect(hasSeen(SEEN_INITIAL, 'colony')).toBe(false);
    expect(hasSeen({ ...SEEN_INITIAL, colony: true }, 'colony')).toBe(true);
  });
});
```

- [ ] **Step 6.3.2: Wire into store + persist**

In `src/state/colony.ts`:

1. Import: `import { SEEN_INITIAL, type SeenMap } from './seen';`
2. Add `readonly seenSurfaces: SeenMap; markSeen: (id: SurfaceId) => void;` to `ColonyStore`.
3. Add `seenSurfaces: SEEN_INITIAL,` to `INITIAL_STATE`.
4. Add action:
   ```ts
   markSeen: (id) => {
     const s = get();
     if (s.seenSurfaces[id]) return;
     set({ seenSurfaces: { ...s.seenSurfaces, [id]: true } });
   },
   ```
5. `partialize`: add `seenSurfaces: state.seenSurfaces,`.
6. `version: 12` → `version: 13`.
7. Migration:
   ```ts
   if (from < 13) {
     s = { ...s, seenSurfaces: (s as Partial<ColonyStore>).seenSurfaces ?? SEEN_INITIAL };
   }
   ```

- [ ] **Step 6.3.3: Persist test**

Append to `tests/state/persist.test.ts`:

```ts
  it('seenSurfaces persists across rehydration', () => {
    useColonyStore.setState({ seenSurfaces: { ...SEEN_INITIAL, colony: true } });
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed.state.seenSurfaces.colony).toBe(true);
    expect(parsed.version).toBe(13);
  });

  it('migrate v12 → v13 backfills SEEN_INITIAL', async () => {
    const v12Shape = {
      state: {
        units: [], nextId: 1,
        harvestsToday: 0, harvestDayKey: '2026-08-05', droughtCount: 0,
        breedsToday: 0, breedDayKey: '2026-08-05',
        fronts: FRESH_FRONTS,
        serum: 200, stims: 0, lastGarrisonTickAt: 1,
        buildings: { barracks: false, medbay: false },
        lastRestTickAt: 1, unlocks: DEFAULT_UNLOCKS,
        freeDecantsRemaining: 0, firstRunComplete: true,
        activeDirectiveId: null, completedDirectiveIds: [],
      },
      version: 12,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v12Shape));
    await useColonyStore.persist.rehydrate();
    const s = useColonyStore.getState();
    expect(s.seenSurfaces).toEqual(SEEN_INITIAL);
  });
```

Add import: `import { SEEN_INITIAL } from '../../src/state/seen';`. Update version-check assertions from `12` → `13` in existing tests. Update the `v1→v12` chain test to `v1→v13` with `expect(s.seenSurfaces).toEqual(SEEN_INITIAL);`.

- [ ] **Step 6.3.4: Run + commit**

```bash
npx vitest run tests/state/seen.test.ts tests/state/persist.test.ts
git add src/state/seen.ts src/state/colony.ts tests/state/seen.test.ts tests/state/persist.test.ts
git commit -m "feat(state): seenSurfaces tracking + persist v13 (P6 Task 6.3)"
```

### Task 6.4: `FirstVisitCallout` component

**Files:**
- Create: `src/ui/components/FirstVisitCallout.tsx`, `tests/ui/FirstVisitCallout.test.tsx`
- Modify: `src/ui/styles.ts` (add `firstVisitCallout`)

**Interfaces:**
- Produces: `export function FirstVisitCallout(props: { surface: SurfaceId; title: string; body: string; action: string }): ReactElement | null;`
- Reads `seenSurfaces` from store. If `hasSeen(seen, surface)`, returns null. Otherwise renders `data-testid="first-visit-{surface}"` with a Dismiss button that calls `markSeen(surface)`.

- [ ] **Step 6.4.1: Style + test**

Style additions:

```ts
  firstVisitCallout: {
    background: '#eff6ff',
    borderLeft: '4px solid #3b82f6',
    padding: '12px 16px',
    margin: '0 auto 16px auto',
    maxWidth: 1400,
    borderRadius: 4,
    position: 'relative',
  } as CSSProperties,

  firstVisitTitle: { fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#1e3a8a' } as CSSProperties,
  firstVisitBody:  { fontSize: 13, color: '#1e40af', marginBottom: 4 } as CSSProperties,
  firstVisitAction:{ fontSize: 12, color: '#1e40af', fontStyle: 'italic' } as CSSProperties,
  firstVisitDismiss: {
    position: 'absolute', top: 4, right: 8,
    border: 'none', background: 'transparent', cursor: 'pointer',
    color: '#1e40af', fontSize: 18, lineHeight: 1,
    fontFamily: 'inherit',
  } as CSSProperties,
```

Create `tests/ui/FirstVisitCallout.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { FirstVisitCallout } from '../../src/ui/components/FirstVisitCallout';
import { useColonyStore } from '../../src/state/colony';

describe('FirstVisitCallout', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('renders when surface not yet seen', () => {
    const { getByTestId } = render(
      <FirstVisitCallout surface="colony" title="Your Colony" body="Every specimen you Decant lives here." action="Decant a Morula." />,
    );
    expect(getByTestId('first-visit-colony')).toBeDefined();
  });

  it('null when already seen', () => {
    useColonyStore.getState().markSeen('colony');
    const { queryByTestId } = render(
      <FirstVisitCallout surface="colony" title="x" body="y" action="z" />,
    );
    expect(queryByTestId('first-visit-colony')).toBeNull();
  });

  it('Dismiss marks the surface seen and hides itself', () => {
    const { getByTestId, queryByTestId } = render(
      <FirstVisitCallout surface="colony" title="x" body="y" action="z" />,
    );
    fireEvent.click(getByTestId('first-visit-colony-dismiss'));
    expect(useColonyStore.getState().seenSurfaces.colony).toBe(true);
    expect(queryByTestId('first-visit-colony')).toBeNull();
  });
});
```

- [ ] **Step 6.4.2: Implement**

Create `src/ui/components/FirstVisitCallout.tsx`:

```tsx
import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import type { SurfaceId } from '../../state/unlocks';
import { styles } from '../styles';

export function FirstVisitCallout(props: {
  surface: SurfaceId;
  title: string;
  body: string;
  action: string;
}): ReactElement | null {
  const seen = useColonyStore((s) => s.seenSurfaces[props.surface]);
  const markSeen = useColonyStore((s) => s.markSeen);
  if (seen) return null;
  return (
    <div style={styles.firstVisitCallout} data-testid={`first-visit-${props.surface}`}>
      <div style={styles.firstVisitTitle}>{props.title}</div>
      <div style={styles.firstVisitBody}>{props.body}</div>
      <div style={styles.firstVisitAction}>{props.action}</div>
      <button
        type="button"
        style={styles.firstVisitDismiss}
        onClick={() => markSeen(props.surface)}
        data-testid={`first-visit-${props.surface}-dismiss`}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
```

- [ ] **Step 6.4.3: Run + commit**

```bash
npx vitest run tests/ui/FirstVisitCallout.test.tsx
git add src/ui/components/FirstVisitCallout.tsx tests/ui/FirstVisitCallout.test.tsx src/ui/styles.ts
git commit -m "feat(ui): FirstVisitCallout (P6 Task 6.4)"
```

### Task 6.5: Wire callouts into every screen + empty-state copy pass

**Files:**
- Modify: every screen — `Colony.tsx`, `DNALab.tsx`, `Breed.tsx`, `Incursion.tsx`, `Vat.tsx`, `Vivarium.tsx`, `ConquestMap.tsx`, `Registry.tsx`.

**Interfaces:**
- Each screen mounts `<FirstVisitCallout surface="..." title="..." body="..." action="..." />` as the first child inside its `<main>`. Content in-world; **no numbers, no thresholds**.
- Each screen's existing empty state passes vocabulary tokens through `<TermTooltip>`.

For each screen, the callout content:

| Surface | Title | Body | Action |
|---|---|---|---|
| `colony` | Your Colony | Every specimen you Decant lives here. | Decant a Morula. |
| `dna-lab` | The DNA Lab | Inspect any specimen you already own — lineage, generation, condition. | Pick a specimen from the list. |
| `breed` | Breeding | Cross two specimens to produce a new one. | Pick two parents. |
| `incursion` | Incursion | Push against a contested front with four specimens. | Pick a front and fill your team. |
| `vat` | The Vat | Fuse ten same-tier specimens into one, pristine. | Select ten of one tier and run. |
| `vivarium` | Vivarium | Buildings shape your Colony. | Build the Barracks first. |
| `conquest-map` | Conquest Map | See what you hold and what remains. | Launch an Incursion from the Incursion screen. |
| `registry` | The Registry | Everything you have met. | Nothing to do here yet. |

Concrete change (repeat for each screen — do NOT skip, engineer may read tasks out of order):

**Colony:** In `src/ui/screens/Colony.tsx`, add `import { FirstVisitCallout } from '../components/FirstVisitCallout';` and insert `<FirstVisitCallout surface="colony" title="Your Colony" body="Every specimen you Decant lives here." action="Decant a Morula." />` as the first child of the outer `<main>` in **both** the empty-state return and the populated return.

**DNALab:** In `src/ui/screens/DNALab.tsx`, add the same import and insert `<FirstVisitCallout surface="dna-lab" title="The DNA Lab" body="Inspect any specimen you already own — lineage, generation, condition." action="Pick a specimen from the list." />` as the first child of `<main>`.

**Breed:** In `src/ui/screens/Breed.tsx`, add the import and insert `<FirstVisitCallout surface="breed" title="Breeding" body="Cross two specimens to produce a new one." action="Pick two parents." />` as the first child.

**Incursion:** In `src/ui/screens/Incursion.tsx`, add the import and insert `<FirstVisitCallout surface="incursion" title="Incursion" body="Push against a contested front with four specimens." action="Pick a front and fill your team." />` as the first child.

**Vat:** In `src/ui/screens/Vat.tsx`, add the import and insert `<FirstVisitCallout surface="vat" title="The Vat" body="Fuse ten same-tier specimens into one, pristine." action="Select ten of one tier and run." />` as the first child.

**Vivarium:** In `src/ui/screens/Vivarium.tsx`, add the import and insert `<FirstVisitCallout surface="vivarium" title="Vivarium" body="Buildings shape your Colony." action="Build the Barracks first." />` as the first child.

**ConquestMap:** In `src/ui/screens/ConquestMap.tsx`, add the import and insert `<FirstVisitCallout surface="conquest-map" title="Conquest Map" body="See what you hold and what remains." action="Launch an Incursion from the Incursion screen." />` as the first child.

**Registry:** In `src/ui/screens/Registry.tsx`, add the import and insert `<FirstVisitCallout surface="registry" title="The Registry" body="Everything you have met." action="Nothing to do here yet." />` as the first child.

- [ ] **Step 6.5.1: For each screen above, add the callout**

For each of the 8 screens listed, apply the concrete change described in the interface block. (Skipping the individual repetition — the interface block has the concrete text per screen.)

- [ ] **Step 6.5.2: Add a per-screen test that the callout appears once**

Append to each screen's test file (or create a small one where missing) a case like:

```tsx
  it('mounts the first-visit callout when unseen', () => {
    useColonyStore.getState().resetGame();
    const { getByTestId } = render(<Colony />);
    expect(getByTestId('first-visit-colony')).toBeDefined();
  });

  it('hides the callout after markSeen', () => {
    useColonyStore.getState().resetGame();
    useColonyStore.getState().markSeen('colony');
    const { queryByTestId } = render(<Colony />);
    expect(queryByTestId('first-visit-colony')).toBeNull();
  });
```

(Adjust `Colony` and `colony` per screen.)

- [ ] **Step 6.5.3: Wrap vocabulary in `TermTooltip` in empty states**

Update `src/ui/components/EmptyColony.tsx` to wrap "Morula", "Decant" in `<TermTooltip termKey="morula">Morula</TermTooltip>` etc. Same for Breed/Incursion/Vat/DNALab empty states.

Add a test that the tooltip trigger exists in the empty state:

```tsx
  it('empty state includes hoverable term tooltips', () => {
    // seed empty
    const { getByText } = render(<EmptyColony />);
    // trigger a hover to reveal
    fireEvent.mouseEnter(getByText('Morula').closest('span')!);
    // definition text appears
    // ...
  });
```

- [ ] **Step 6.5.4: Run + commit**

```bash
npm test
git add src/ui/screens/*.tsx src/ui/components/EmptyColony.tsx tests/ui/
git commit -m "feat(ui): first-visit callouts + tooltipped empty states across all screens (P6 Task 6.5)"
```

### Phase 6 done-when check

- [ ] Every screen shows a blue callout on first visit. Dismissing it never shows it again for that surface (persists across reload).
- [ ] Hovering "Morula" anywhere reveals the definition bubble; hovering "Decant" reveals its.
- [ ] No definition mentions numbers, thresholds, or probabilities. No definitions for `pristine`/`degraded`.


## Phase 7 — Conquest map & the overarching goal

**Goal:** Make the point of the game visible. Reuse the 3 existing fronts as Region 1's playable content. **Make the data model multi-region-capable** but do not author additional-region content. Frame Region 1 as "the first of many"; show progress toward global domination.

### Task 7.1: `regions.ts` — data model + REGION_1 + REGIONS map

**Files:**
- Create: `src/sim/data/regions.ts`, `tests/sim/data/regions.test.ts`
- Modify: `src/sim/data/fronts.ts` (add `regionId: RegionId` to each FrontProfile)

**Interfaces:**
- Produces:
  ```ts
  export type RegionId = 'region-1';
  export interface RegionProfile {
    readonly id: RegionId;
    readonly label: string;         // "Region 1"
    readonly subtitle: string;      // "The first of many"
    readonly frontIds: readonly FrontId[];
  }
  export const REGIONS: Readonly<Record<RegionId, RegionProfile>>;
  export const REGION_ORDER: readonly RegionId[];   // ['region-1'] for now — future regions append here
  export function regionOf(frontId: FrontId): RegionId;
  ```
- `FrontProfile` gains `regionId: RegionId` (all three are `'region-1'`).

- [ ] **Step 7.1.1: Test**

Create `tests/sim/data/regions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { REGIONS, REGION_ORDER, regionOf } from '../../../src/sim/data/regions';
import { FRONTS } from '../../../src/sim/data/fronts';

describe('regions', () => {
  it('REGION_ORDER has region-1 first', () => {
    expect(REGION_ORDER[0]).toBe('region-1');
  });

  it('Region 1 wraps all three existing fronts', () => {
    expect(REGIONS['region-1'].frontIds).toEqual(['infrastructure','military','guerrilla']);
  });

  it('regionOf returns region-1 for every front', () => {
    for (const fid of Object.keys(FRONTS)) {
      expect(regionOf(fid as keyof typeof FRONTS)).toBe('region-1');
    }
  });

  it('every FrontProfile carries a regionId', () => {
    for (const p of Object.values(FRONTS)) {
      expect(p.regionId).toBe('region-1');
    }
  });
});
```

- [ ] **Step 7.1.2: Implement `regions.ts`**

Create `src/sim/data/regions.ts`:

```ts
import type { FrontId } from './fronts';

export type RegionId = 'region-1';

export interface RegionProfile {
  readonly id: RegionId;
  readonly label: string;
  readonly subtitle: string;
  readonly frontIds: readonly FrontId[];
}

export const REGIONS: Readonly<Record<RegionId, RegionProfile>> = {
  'region-1': {
    id: 'region-1',
    label: 'Region 1',
    subtitle: 'The first of many',
    frontIds: ['infrastructure', 'military', 'guerrilla'],
  },
};

export const REGION_ORDER: readonly RegionId[] = ['region-1'];

export function regionOf(frontId: FrontId): RegionId {
  for (const r of REGION_ORDER) {
    if (REGIONS[r].frontIds.includes(frontId)) return r;
  }
  throw new Error(`Front ${frontId} not assigned to any region`);
}
```

- [ ] **Step 7.1.3: Update `fronts.ts` to include `regionId`**

In `src/sim/data/fronts.ts`:

1. Add to `interface FrontProfile`:
   ```ts
   readonly regionId: 'region-1';   // widen later when multi-region content ships
   ```
2. Add `regionId: 'region-1',` to each of the three FrontProfile entries.

- [ ] **Step 7.1.4: Run + commit**

```bash
npx vitest run tests/sim/data/regions.test.ts
git add src/sim/data/regions.ts src/sim/data/fronts.ts tests/sim/data/regions.test.ts
git commit -m "feat(sim): regions data model + Region 1 wraps existing fronts (P7 Task 7.1)"
```

### Task 7.2: ConquestMap real screen (replace P1 stub)

**Files:**
- Modify: `src/ui/screens/ConquestMap.tsx` (rewrite)
- Extend: `tests/ui/ConquestMap.test.tsx`

**Interfaces:**
- `ConquestMap` renders:
  - Region 1 header (label + subtitle from `REGIONS['region-1']`), `data-testid="region-header-region-1"`.
  - A row of front cards (one per `frontIds`) each `data-testid="map-front-<frontId>"`, each showing: label, status ("held", "cooling", "available"), hardening if any, and (for held) garrison count.
  - "Region progress" line: "N of 3 fronts held" — `data-testid="region-progress"`. When all three held with no active flares: "Region 1 conquered."
  - A "More regions coming" footer, `data-testid="region-footer"`: "Region 1 is the first of many. Take it, hold it — then the next opens."

- [ ] **Step 7.2.1: Extend test**

Append to `tests/ui/ConquestMap.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, cleanup } from '@testing-library/react';
import { useColonyStore } from '../../src/state/colony';

describe('ConquestMap — real', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('renders the Region 1 header + three front cards', () => {
    const { getByTestId } = render(<ConquestMap />);
    expect(getByTestId('region-header-region-1').textContent).toContain('Region 1');
    expect(getByTestId('map-front-infrastructure')).toBeDefined();
    expect(getByTestId('map-front-military')).toBeDefined();
    expect(getByTestId('map-front-guerrilla')).toBeDefined();
  });

  it('shows region progress 0 of 3 on fresh state', () => {
    const { getByTestId } = render(<ConquestMap />);
    expect(getByTestId('region-progress').textContent).toContain('0 of 3');
  });

  it('shows conquest banner when all three held with no flares', () => {
    useColonyStore.setState({
      fronts: {
        infrastructure: { captured: true, cooldownUntil: null, garrison: [1], flareStartedAt: null, hardening: 0 },
        military:       { captured: true, cooldownUntil: null, garrison: [2], flareStartedAt: null, hardening: 0 },
        guerrilla:      { captured: true, cooldownUntil: null, garrison: [3], flareStartedAt: null, hardening: 0 },
      },
    });
    const { getByTestId } = render(<ConquestMap />);
    expect(getByTestId('region-progress').textContent?.toLowerCase()).toContain('conquered');
  });

  it('renders the multi-region footer promise', () => {
    const { getByTestId } = render(<ConquestMap />);
    expect(getByTestId('region-footer').textContent?.toLowerCase()).toContain('first of many');
  });
});
```

- [ ] **Step 7.2.2: Implement**

Replace `src/ui/screens/ConquestMap.tsx`:

```tsx
import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { REGIONS } from '../../sim/data/regions';
import { FRONTS } from '../../sim/data/fronts';
import { TERMS } from '../terms';
import { styles } from '../styles';
import { FirstVisitCallout } from '../components/FirstVisitCallout';

export function ConquestMap(): ReactElement {
  const fronts = useColonyStore((s) => s.fronts);
  const region = REGIONS['region-1'];
  const held = region.frontIds.filter((fid) => fronts[fid].captured);
  const flaring = region.frontIds.some((fid) => fronts[fid].flareStartedAt !== null);
  const conquered = held.length === region.frontIds.length && !flaring;

  return (
    <main style={styles.page} data-testid="conquest-map-screen">
      <FirstVisitCallout
        surface="conquest-map"
        title={TERMS.conquestMap}
        body="See what you hold and what remains."
        action="Launch an Incursion from the Incursion screen."
      />

      <div data-testid="region-header-region-1">
        <h1 style={styles.headerTitle}>{region.label}</h1>
        <p style={styles.headerSub}>{region.subtitle}</p>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '16px 0' }}>
        {region.frontIds.map((fid) => {
          const f = fronts[fid];
          const status = f.captured ? 'held' : f.cooldownUntil && f.cooldownUntil > Date.now() ? 'cooling' : 'available';
          return (
            <div
              key={fid}
              data-testid={`map-front-${fid}`}
              style={{
                minWidth: 200, padding: 12,
                border: `2px solid ${status === 'held' ? '#22c55e' : '#cbd5e1'}`,
                borderRadius: 8,
                background: status === 'held' ? '#f0fdf4' : '#ffffff',
              }}
            >
              <div style={{ fontWeight: 600 }}>{FRONTS[fid].label}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Status: {status}</div>
              {f.captured && (
                <div style={{ fontSize: 12, color: '#64748b' }}>Garrison: {f.garrison.length}</div>
              )}
              {f.hardening > 0 && (
                <div style={{ fontSize: 12, color: '#b45309' }}>Hardening: {f.hardening}</div>
              )}
              {f.flareStartedAt !== null && (
                <div style={{ fontSize: 12, color: '#b45309' }}>Flaring — reinforce</div>
              )}
            </div>
          );
        })}
      </div>

      <div data-testid="region-progress" style={{ fontSize: 14, marginTop: 12 }}>
        {conquered
          ? `${region.label} conquered.`
          : `${held.length} of ${region.frontIds.length} fronts held.`}
      </div>

      <p data-testid="region-footer" style={{ marginTop: 24, fontStyle: 'italic', color: '#64748b' }}>
        {region.label} is the first of many. Take it, hold it — then the next opens.
      </p>
    </main>
  );
}
```

- [ ] **Step 7.2.3: Run + commit**

```bash
npx vitest run tests/ui/ConquestMap.test.tsx
git add src/ui/screens/ConquestMap.tsx tests/ui/ConquestMap.test.tsx
git commit -m "feat(ui): real ConquestMap with Region 1 + progress + multi-region promise (P7 Task 7.2)"
```

### Phase 7 done-when check

- [ ] ConquestMap tab shows Region 1 header, three front cards, "0 of 3 fronts held," and the "first of many" footer.
- [ ] Capture all three fronts → "Region 1 conquered." appears.
- [ ] `FRONTS` still has three entries; no additional-region content authored.

---

## Phase 8 — Action feedback & results legibility (functional, not juice)

**Goal:** After any action the player can tell what happened and roughly why. Qualitative feedback only — never hidden numbers.

### Task 8.1: `ActionToast` — generic confirmation surface

**Files:**
- Create: `src/ui/components/ActionToast.tsx`, `tests/ui/ActionToast.test.tsx`
- Modify: `src/state/colony.ts` (add `recentActionMessage: string | null` transient + `emitActionMessage`, `clearActionMessage`)

**Interfaces:**
- Store: `readonly recentActionMessage: string | null; emitActionMessage: (msg: string) => void; clearActionMessage: () => void;`
- Component: renders `data-testid="action-toast"` with the message; auto-dismisses after 2.5s; stacks are last-write-wins (single slot, no queue) — the KISS choice.
- Emit calls from real actions: `decant`, `breed`, `assignToGarrison`, `buildBarracks`, `buildMedbay`, `runVatOperation`. Wording is short + player-facing: e.g. `"Decanted #{id}."`, `"Bred #{id} from #A × #B."`, `"Garrisoned #{id} on {front}."`, `"Barracks built — cap raised."`.

- [ ] **Step 8.1.1: Store field + emits**

In `src/state/colony.ts`:

1. Extend `ColonyStore` with `recentActionMessage`, `emitActionMessage`, `clearActionMessage`.
2. Extend `INITIAL_STATE`: `recentActionMessage: null as string | null,`.
3. Actions:
   ```ts
   emitActionMessage: (msg) => set({ recentActionMessage: msg }),
   clearActionMessage: () => set({ recentActionMessage: null }),
   ```
4. Do NOT partialize (transient).
5. In each real action (`decant`, `breed`, `assignToGarrison`, `buildBarracks`, `buildMedbay`, `runVatOperation`), after the `set({...})`, call `get().emitActionMessage(...)` with a short string as specified above.

- [ ] **Step 8.1.2: Component + test**

Create `tests/ui/ActionToast.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { ActionToast } from '../../src/ui/components/ActionToast';
import { useColonyStore } from '../../src/state/colony';

describe('ActionToast', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('null when no message', () => {
    const { queryByTestId } = render(<ActionToast />);
    expect(queryByTestId('action-toast')).toBeNull();
  });

  it('shows the message when set', () => {
    useColonyStore.setState({ recentActionMessage: 'Decanted #1.' });
    const { getByTestId } = render(<ActionToast />);
    expect(getByTestId('action-toast').textContent).toContain('Decanted #1');
  });

  it('auto-dismisses after 2.5s', () => {
    vi.useFakeTimers();
    useColonyStore.setState({ recentActionMessage: 'x' });
    render(<ActionToast />);
    act(() => { vi.advanceTimersByTime(2600); });
    expect(useColonyStore.getState().recentActionMessage).toBeNull();
    vi.useRealTimers();
  });
});
```

Create `src/ui/components/ActionToast.tsx`:

```tsx
import { useEffect, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { styles } from '../styles';

export function ActionToast(): ReactElement | null {
  const msg = useColonyStore((s) => s.recentActionMessage);
  const clear = useColonyStore((s) => s.clearActionMessage);

  useEffect(() => {
    if (msg === null) return;
    const t = setTimeout(clear, 2500);
    return () => clearTimeout(t);
  }, [msg, clear]);

  if (msg === null) return null;
  return (
    <div
      style={{ ...styles.toast, bottom: 80 }}
      data-testid="action-toast"
    >
      <div style={styles.toastBody}>{msg}</div>
    </div>
  );
}
```

Mount in `src/App.tsx` alongside the other toasts:

```tsx
import { ActionToast } from './ui/components/ActionToast';
// ...
<ActionToast />
```

- [ ] **Step 8.1.3: Persist test for transience**

Append to `tests/state/persist.test.ts`:

```ts
  it('recentActionMessage is transient', () => {
    useColonyStore.setState({ recentActionMessage: 'x' });
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed.state.recentActionMessage).toBeUndefined();
  });
```

- [ ] **Step 8.1.4: Run + commit**

```bash
npm test
git add src/state/colony.ts src/ui/components/ActionToast.tsx tests/ui/ActionToast.test.tsx tests/state/persist.test.ts src/App.tsx
git commit -m "feat(ui): ActionToast + action confirmations from real store mutations (P8 Task 8.1)"
```

### Task 8.2: `IncursionResultSummary` — post-Incursion qualitative panel

**Files:**
- Create: `src/ui/components/IncursionResultSummary.tsx`, `tests/ui/IncursionResultSummary.test.tsx`
- Modify: `src/state/colony.ts` (preserve last resolution as `lastIncursionResolution: IncursionResolution | null` — transient), `src/ui/screens/Incursion.tsx` (render summary when present after continue)

**Interfaces:**
- The current `dismissIncursion` sets `activeIncursion: null` and forgets the resolution. Add `lastIncursionResolution` (transient, not persisted) that captures the resolution on dismiss so a summary panel can read it. Add `clearLastIncursionResolution`.
- Summary component: `export function IncursionResultSummary(): ReactElement | null;` — reads `lastIncursionResolution`. Renders `data-testid="incursion-result"` with:
  - Verdict line: qualitative — "Your team overwhelmed the {front}." (won) or "You fell short on {stat with lowest coverage}." (lost). **Do not** display the numeric `successP` or coverage ratios.
  - Team roster (unit ids).
  - Dismiss button `data-testid="incursion-result-dismiss"` calls `clearLastIncursionResolution()`.

- [ ] **Step 8.2.1: Store field + dismiss wiring**

In `src/state/colony.ts`:

1. Add `readonly lastIncursionResolution: IncursionResolution | null;` and `clearLastIncursionResolution: () => void;`.
2. `INITIAL_STATE`: `lastIncursionResolution: null as IncursionResolution | null,`.
3. In `dismissIncursion`, capture the current `activeIncursion` before nulling it:
   ```ts
   dismissIncursion: () => {
     const s = get();
     const r = s.activeIncursion;
     if (!r) return;
     // (existing side-effects unchanged) ...
     set({ ..., lastIncursionResolution: r, activeIncursion: null });
   },
   ```
4. `clearLastIncursionResolution: () => set({ lastIncursionResolution: null }),`
5. Do NOT partialize `lastIncursionResolution`.

- [ ] **Step 8.2.2: Component + test**

Create `tests/ui/IncursionResultSummary.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { IncursionResultSummary } from '../../src/ui/components/IncursionResultSummary';
import { useColonyStore } from '../../src/state/colony';

describe('IncursionResultSummary', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('null when no last resolution', () => {
    const { queryByTestId } = render(<IncursionResultSummary />);
    expect(queryByTestId('incursion-result')).toBeNull();
  });

  it('renders qualitative won verdict', () => {
    useColonyStore.setState({
      lastIncursionResolution: {
        frontId: 'infrastructure', teamIds: [1,2,3,4] as const,
        coverage: { INT: 1.0, SPD: 0.9 },
        bestContributors: { INT: 1, SPD: 2 },
        successP: 0.95, outcome: 'won',
        beats: [{ kind: 'verdict', text: 'x' }],
      },
    });
    const { getByTestId } = render(<IncursionResultSummary />);
    const text = getByTestId('incursion-result').textContent ?? '';
    expect(text.toLowerCase()).toContain('overwhelmed');
    expect(text).not.toMatch(/\b0\.9\b/);
    expect(text).not.toMatch(/\b95\s*%/);
  });

  it('lost verdict names the weakest stat qualitatively', () => {
    useColonyStore.setState({
      lastIncursionResolution: {
        frontId: 'infrastructure', teamIds: [1,2,3,4] as const,
        coverage: { INT: 0.3, SPD: 0.9 },
        bestContributors: { INT: 1, SPD: 2 },
        successP: 0.15, outcome: 'lost',
        beats: [{ kind: 'verdict', text: 'x' }],
      },
    });
    const { getByTestId } = render(<IncursionResultSummary />);
    const text = getByTestId('incursion-result').textContent ?? '';
    expect(text.toLowerCase()).toContain('short');
    expect(text).toMatch(/INT/);
  });

  it('dismiss clears the resolution', () => {
    useColonyStore.setState({
      lastIncursionResolution: {
        frontId: 'infrastructure', teamIds: [1,2,3,4] as const,
        coverage: { INT: 1.0 }, bestContributors: { INT: 1 },
        successP: 0.9, outcome: 'won', beats: [],
      },
    });
    const { getByTestId, queryByTestId } = render(<IncursionResultSummary />);
    fireEvent.click(getByTestId('incursion-result-dismiss'));
    expect(queryByTestId('incursion-result')).toBeNull();
  });
});
```

Create `src/ui/components/IncursionResultSummary.tsx`:

```tsx
import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { FRONTS } from '../../sim/data/fronts';
import { styles } from '../styles';

export function IncursionResultSummary(): ReactElement | null {
  const r = useColonyStore((s) => s.lastIncursionResolution);
  const clear = useColonyStore((s) => s.clearLastIncursionResolution);
  if (r === null) return null;

  const frontLabel = FRONTS[r.frontId].label;

  let verdict: string;
  if (r.outcome === 'won') {
    verdict = `Your team overwhelmed the ${frontLabel} front.`;
  } else {
    const entries = Object.entries(r.coverage);
    entries.sort((a, b) => a[1] - b[1]);
    const weakest = entries[0]?.[0] ?? '';
    verdict = weakest
      ? `You fell short on ${weakest}. The ${frontLabel} front held.`
      : `The ${frontLabel} front held. Your team fell short.`;
  }

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalCard} data-testid="incursion-result">
        <h2 style={styles.modalTitle}>{r.outcome === 'won' ? 'Victory' : 'Defeat'}</h2>
        <div style={styles.modalBody}>
          <p>{verdict}</p>
          <p style={{ fontSize: 12, color: '#64748b' }}>
            Team: {r.teamIds.map((id) => `#${id}`).join(', ')}
          </p>
        </div>
        <button
          type="button"
          style={styles.modalPrimary}
          onClick={clear}
          data-testid="incursion-result-dismiss"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 8.2.3: Mount in App**

In `src/App.tsx`:

```tsx
import { IncursionResultSummary } from './ui/components/IncursionResultSummary';
// ...
<IncursionResultSummary />
```

- [ ] **Step 8.2.4: Ensure timer/cooldown/status already visible on cards**

Read `src/ui/components/SpecimenCard.tsx`; verify it already shows generation, tier, rest state, injury state, garrisoned-at. If any of those aren't rendered, add them — but based on Task 1.5's inspection, all five appear. If a check finds a gap, patch it here with a concrete test:

```tsx
  it('SpecimenCard shows generation, tier, rest, and injury status', () => {
    // seed a unit, render, assert testids
  });
```

- [ ] **Step 8.2.5: Run + commit**

```bash
npm test
git add src/state/colony.ts src/ui/components/IncursionResultSummary.tsx tests/ui/IncursionResultSummary.test.tsx src/App.tsx
git commit -m "feat(ui): IncursionResultSummary with qualitative verdicts (P8 Task 8.2)"
```

### Phase 8 done-when check

- [ ] Every player action fires a bottom-right ActionToast with a plain-English confirmation ("Decanted #7").
- [ ] After finishing an Incursion, a modal explains why in words, never numbers. Won → "overwhelmed the {front}"; lost → "fell short on {stat}".
- [ ] SpecimenCard shows rested/fatigued/injured, generation, rarity tier.


## Phase 9 — Registry (reference) + hidden dev/reset panel

**Goal:** A player can look up any term or action they've *met*. A hidden dev panel lets the developer replay the new-player experience without touching DevTools.

### Task 9.1: `discovered.ts` — discovered-terms tracking + persist v13 → v14

**Files:**
- Create: `src/state/discovered.ts`, `tests/state/discovered.test.ts`
- Modify: `src/state/colony.ts` (add `discoveredTerms` field + `discoverTerm` action + persist)

**Interfaces:**
- `discovered.ts`:
  ```ts
  import type { TermKey } from '../ui/definitions';
  export type DiscoveredMap = Readonly<Record<TermKey, boolean>>;
  export const DISCOVERED_INITIAL: DiscoveredMap;
  export function hasDiscovered(map: DiscoveredMap, k: TermKey): boolean;
  ```
- Store: `readonly discoveredTerms: DiscoveredMap; discoverTerm: (k: TermKey) => void;`
- Auto-discover: when the store performs an action that "meets" a term (e.g. `decant` → `'morula'` and `'decant'`; first `computeRarity` producing tier T → `'tier-T'` etc.), call `discoverTerm`.

- [ ] **Step 9.1.1: `discovered.ts` + test**

Create `src/state/discovered.ts`:

```ts
import type { TermKey } from '../ui/definitions';

const ALL: readonly TermKey[] = [
  'morula','decant','harvest','incursion','occupation','vat','dnaLab','sequencer',
  'registry','colony','vivarium','serum','freeDecant','generation',
  'tier-baseline','tier-strain','tier-mutant','tier-chimera','tier-progenitor',
];

export type DiscoveredMap = Readonly<Record<TermKey, boolean>>;

export const DISCOVERED_INITIAL: DiscoveredMap = Object.fromEntries(
  ALL.map((k) => [k, false] as const),
) as DiscoveredMap;

export function hasDiscovered(map: DiscoveredMap, k: TermKey): boolean {
  return map[k] === true;
}
```

Create `tests/state/discovered.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DISCOVERED_INITIAL, hasDiscovered } from '../../src/state/discovered';

describe('discovered', () => {
  it('starts with every term undiscovered', () => {
    for (const v of Object.values(DISCOVERED_INITIAL)) expect(v).toBe(false);
  });
  it('hasDiscovered returns the map value', () => {
    expect(hasDiscovered(DISCOVERED_INITIAL, 'morula')).toBe(false);
    expect(hasDiscovered({ ...DISCOVERED_INITIAL, morula: true }, 'morula')).toBe(true);
  });
});
```

- [ ] **Step 9.1.2: Store field + action + persist v14**

In `src/state/colony.ts`:

1. Import: `import { DISCOVERED_INITIAL, type DiscoveredMap } from './discovered'; import type { TermKey } from '../ui/definitions';`
2. Extend `ColonyStore`: `readonly discoveredTerms: DiscoveredMap; discoverTerm: (k: TermKey) => void;`
3. `INITIAL_STATE`: `discoveredTerms: DISCOVERED_INITIAL,`
4. Action:
   ```ts
   discoverTerm: (k) => {
     const s = get();
     if (s.discoveredTerms[k]) return;
     set({ discoveredTerms: { ...s.discoveredTerms, [k]: true } });
   },
   ```
5. `partialize`: add `discoveredTerms: state.discoveredTerms,`.
6. `version: 13` → `version: 14`.
7. Migration:
   ```ts
   if (from < 14) {
     s = { ...s, discoveredTerms: (s as Partial<ColonyStore>).discoveredTerms ?? DISCOVERED_INITIAL };
   }
   ```
8. Auto-discover hooks in real actions:
   - `decant`: `get().discoverTerm('morula'); get().discoverTerm('decant'); get().discoverTerm(`tier-${tier}` as TermKey);`
   - `breed`: `get().discoverTerm('generation');` (bred units carry a real generation now).
   - `launchIncursion`: `get().discoverTerm('incursion');`
   - `assignToGarrison`: `get().discoverTerm('occupation');`
   - `runVatOperation`: `get().discoverTerm('vat');`
   - `buildBarracks` / `buildMedbay`: `get().discoverTerm('vivarium');`

- [ ] **Step 9.1.3: Persist tests**

Append to `tests/state/persist.test.ts`:

```ts
  it('discoveredTerms persists across rehydration', () => {
    useColonyStore.setState({ discoveredTerms: { ...DISCOVERED_INITIAL, morula: true } });
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed.state.discoveredTerms.morula).toBe(true);
    expect(parsed.version).toBe(14);
  });

  it('migrate v13 → v14 backfills DISCOVERED_INITIAL', async () => {
    const v13Shape = {
      state: {
        units: [], nextId: 1,
        harvestsToday: 0, harvestDayKey: '2026-08-05', droughtCount: 0,
        breedsToday: 0, breedDayKey: '2026-08-05',
        fronts: FRESH_FRONTS,
        serum: 200, stims: 0, lastGarrisonTickAt: 1,
        buildings: { barracks: false, medbay: false },
        lastRestTickAt: 1, unlocks: DEFAULT_UNLOCKS,
        freeDecantsRemaining: 0, firstRunComplete: true,
        activeDirectiveId: null, completedDirectiveIds: [],
        seenSurfaces: SEEN_INITIAL,
      },
      version: 13,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v13Shape));
    await useColonyStore.persist.rehydrate();
    expect(useColonyStore.getState().discoveredTerms).toEqual(DISCOVERED_INITIAL);
  });
```

Add imports and update earlier `.toBe(13)` → `.toBe(14)`. Update `v1→v13` chain test → `v1→v14` and add `expect(s.discoveredTerms).toEqual(DISCOVERED_INITIAL);`.

- [ ] **Step 9.1.4: Run + commit**

```bash
npx vitest run tests/state/discovered.test.ts tests/state/persist.test.ts
git add src/state/discovered.ts src/state/colony.ts tests/state/discovered.test.ts tests/state/persist.test.ts
git commit -m "feat(state): discoveredTerms tracking + auto-discover hooks + persist v14 (P9 Task 9.1)"
```

### Task 9.2: Registry real screen (replace P1 stub)

**Files:**
- Modify: `src/ui/screens/Registry.tsx` (rewrite)
- Extend: `tests/ui/Registry.test.tsx`

**Interfaces:**
- Registry lists every discovered term with its definition. Groups:
  - **Vocabulary** — Morula, Decant, Harvest, Incursion, Occupation, Vat, DNA Lab, Sequencer, Registry, Colony, Vivarium, Serum, Free Decant, Generation.
  - **Tiers** — Baseline / Strain / Mutant / Chimera / Progenitor.
- Undiscovered entries appear as `???` with a locked-lock label — visible but not readable. This keeps the *shape* of the reference visible (you know how much there is) without revealing content early.
- Player stats section: units decanted, units bred, fronts held, Serum earned, current rarity best. All are derived — no new state. `data-testid="registry-stats"`.

- [ ] **Step 9.2.1: Test**

Replace `tests/ui/Registry.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Registry } from '../../src/ui/screens/Registry';
import { useColonyStore } from '../../src/state/colony';

describe('Registry (real)', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('renders the two group headers and stats', () => {
    const { getByTestId } = render(<Registry />);
    expect(getByTestId('registry-screen')).toBeDefined();
    expect(getByTestId('registry-vocab')).toBeDefined();
    expect(getByTestId('registry-tiers')).toBeDefined();
    expect(getByTestId('registry-stats')).toBeDefined();
  });

  it('shows undiscovered terms as ???', () => {
    const { getByTestId } = render(<Registry />);
    // "morula" not discovered on a fresh reset — should render its row as locked
    const row = getByTestId('registry-row-morula');
    expect(row.textContent).toContain('???');
  });

  it('shows the definition once discovered', () => {
    useColonyStore.getState().discoverTerm('morula');
    const { getByTestId } = render(<Registry />);
    const row = getByTestId('registry-row-morula');
    expect(row.textContent?.toLowerCase()).toContain('vat-embryo');
  });
});
```

- [ ] **Step 9.2.2: Implement**

Replace `src/ui/screens/Registry.tsx`:

```tsx
import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { DEFINITIONS, type TermKey } from '../definitions';
import { TERMS } from '../terms';
import { styles } from '../styles';
import { FirstVisitCallout } from '../components/FirstVisitCallout';

const VOCAB: readonly TermKey[] = [
  'morula','decant','harvest','incursion','occupation','vat','dnaLab',
  'sequencer','registry','colony','vivarium','serum','freeDecant','generation',
];

const TIERS: readonly TermKey[] = [
  'tier-baseline','tier-strain','tier-mutant','tier-chimera','tier-progenitor',
];

function Row(props: { termKey: TermKey; discovered: boolean }) {
  return (
    <li data-testid={`registry-row-${props.termKey}`} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
      {props.discovered ? (
        <>
          <strong>{props.termKey}</strong> — {DEFINITIONS[props.termKey]}
        </>
      ) : (
        <span style={{ color: '#94a3b8' }}>??? — locked</span>
      )}
    </li>
  );
}

export function Registry(): ReactElement {
  const discovered = useColonyStore((s) => s.discoveredTerms);
  const units = useColonyStore((s) => s.units);
  const fronts = useColonyStore((s) => s.fronts);
  const serum = useColonyStore((s) => s.serum);

  const bred = units.filter((u) => u.parentIds !== null).length;
  const decanted = units.length - bred;
  const held = Object.values(fronts).filter((f) => f.captured).length;

  return (
    <main style={styles.page} data-testid="registry-screen">
      <FirstVisitCallout
        surface="registry"
        title={TERMS.registry}
        body="Everything you have met."
        action="Nothing to do here yet."
      />
      <h1 style={styles.headerTitle}>{TERMS.registry}</h1>

      <section data-testid="registry-vocab" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16 }}>Vocabulary</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {VOCAB.map((k) => (
            <Row key={k} termKey={k} discovered={discovered[k] === true} />
          ))}
        </ul>
      </section>

      <section data-testid="registry-tiers" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Tiers</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {TIERS.map((k) => (
            <Row key={k} termKey={k} discovered={discovered[k] === true} />
          ))}
        </ul>
      </section>

      <section data-testid="registry-stats" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Your record</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>Specimens Decanted: {decanted}</li>
          <li>Specimens bred: {bred}</li>
          <li>Fronts held: {held}</li>
          <li>{TERMS.serumAbbr} on hand: {serum}</li>
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 9.2.3: Run + commit**

```bash
npx vitest run tests/ui/Registry.test.tsx
git add src/ui/screens/Registry.tsx tests/ui/Registry.test.tsx
git commit -m "feat(ui): real Registry with vocab/tiers/stats (P9 Task 9.2)"
```

### Task 9.3: `DevPanel` — hidden, keyboard-toggled reset + fast-forward

**Files:**
- Create: `src/ui/components/DevPanel.tsx`, `tests/ui/DevPanel.test.tsx`
- Modify: `src/App.tsx` (register Cmd+Shift+D toggle)
- Modify: `src/state/colony.ts` (add `fastForwardMs(ms: number)` action that shifts `lastGarrisonTickAt` and `lastRestTickAt` backward by `ms`, then re-runs the tick logic)

**Interfaces:**
- `fastForwardMs`:
  ```ts
  fastForwardMs: (ms: number) => void;   // rewinds tick anchors by `ms`, then triggers a decant-style tick cascade
  ```
- `DevPanel`:
  ```tsx
  export function DevPanel(props: { open: boolean; onClose: () => void }): ReactElement | null;
  ```
  Buttons (all `data-testid`):
  - `dev-panel-reset` → `resetGame()`
  - `dev-panel-seed-3-units` → seeds 3 Decanted units so downstream flows can be tested without repeated Decanting.
  - `dev-panel-ff-1h` → `fastForwardMs(3_600_000)`
  - `dev-panel-ff-8h` → `fastForwardMs(8 * 3_600_000)`
  - `dev-panel-mark-seen-all` → sets every `seenSurfaces` entry to true so first-visit callouts are hidden.
  - `dev-panel-close`

- [ ] **Step 9.3.1: Store `fastForwardMs`**

In `src/state/colony.ts`:

```ts
fastForwardMs: (ms: number) => {
  const s = get();
  set({
    lastGarrisonTickAt: s.lastGarrisonTickAt - ms,
    lastRestTickAt: s.lastRestTickAt - ms,
  });
  // Trigger the tick cascade the way decant() does, but without creating a unit:
  const state = get();
  const now = Date.now();
  const flareDelta = checkFlareTimers(state, now);
  const tickDelta  = applyGarrisonTick({ ...state, ...flareDelta }, now);
  const restDelta  = applyRestTick({ ...state, ...flareDelta, ...tickDelta }, now);
  set({ ...flareDelta, ...tickDelta, ...restDelta });
},
```

Add to `ColonyStore` interface: `fastForwardMs: (ms: number) => void;`

Test: `tests/state/colony.fastForward.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';

describe('fastForwardMs', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });

  it('one hour of garrisoned time earns 5 SR per garrisoned unit', () => {
    // seed a garrisoned unit
    useColonyStore.setState({
      units: [{
        id: 1, seed: 1, decantedAt: 0, genome: { loci: {} },
        generation: 0, parentIds: null, wear: {}, restCurrent: 100,
        injuredUntil: null, culled: false,
      }],
      nextId: 2,
      fronts: {
        infrastructure: { captured: true, cooldownUntil: null, garrison: [1], flareStartedAt: null, hardening: 0 },
        military: { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
        guerrilla: { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
      },
    });
    const beforeSerum = useColonyStore.getState().serum;
    useColonyStore.getState().fastForwardMs(3_600_000);
    expect(useColonyStore.getState().serum).toBe(beforeSerum + 5);
  });
});
```

- [ ] **Step 9.3.2: Component + test**

Create `tests/ui/DevPanel.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { DevPanel } from '../../src/ui/components/DevPanel';
import { useColonyStore } from '../../src/state/colony';

describe('DevPanel', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('null when closed', () => {
    const { queryByTestId } = render(<DevPanel open={false} onClose={() => {}} />);
    expect(queryByTestId('dev-panel')).toBeNull();
  });

  it('renders all controls when open', () => {
    const { getByTestId } = render(<DevPanel open={true} onClose={() => {}} />);
    for (const id of ['dev-panel-reset','dev-panel-seed-3-units','dev-panel-ff-1h','dev-panel-ff-8h','dev-panel-mark-seen-all','dev-panel-close']) {
      expect(getByTestId(id)).toBeDefined();
    }
  });

  it('reset clears units', () => {
    useColonyStore.getState().decant();
    const { getByTestId } = render(<DevPanel open={true} onClose={() => {}} />);
    fireEvent.click(getByTestId('dev-panel-reset'));
    expect(useColonyStore.getState().units).toEqual([]);
  });

  it('mark seen all fills seenSurfaces', () => {
    const { getByTestId } = render(<DevPanel open={true} onClose={() => {}} />);
    fireEvent.click(getByTestId('dev-panel-mark-seen-all'));
    for (const v of Object.values(useColonyStore.getState().seenSurfaces)) expect(v).toBe(true);
  });
});
```

Create `src/ui/components/DevPanel.tsx`:

```tsx
import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { SEEN_INITIAL } from '../../state/seen';
import type { SurfaceId } from '../../state/unlocks';
import { styles } from '../styles';

const ALL_SEEN: Record<SurfaceId, boolean> = Object.fromEntries(
  (Object.keys(SEEN_INITIAL) as SurfaceId[]).map((k) => [k, true]),
) as Record<SurfaceId, boolean>;

export function DevPanel(props: { open: boolean; onClose: () => void }): ReactElement | null {
  const resetGame = useColonyStore((s) => s.resetGame);
  const fastForwardMs = useColonyStore((s) => s.fastForwardMs);
  const decant = useColonyStore((s) => s.decant);

  if (!props.open) return null;

  return (
    <div
      data-testid="dev-panel"
      style={{
        position: 'fixed', top: 60, right: 16, zIndex: 200,
        background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 6,
        width: 260, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', fontSize: 13,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <strong>Dev panel</strong>
        <button
          type="button"
          onClick={props.onClose}
          data-testid="dev-panel-close"
          style={{ background: 'transparent', border: 'none', color: '#e2e8f0', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" style={styles.modalPrimary} data-testid="dev-panel-reset"
                onClick={() => { resetGame(); }}>
          Reset to first-run
        </button>
        <button type="button" style={styles.modalPrimary} data-testid="dev-panel-seed-3-units"
                onClick={() => { decant(); decant(); decant(); }}>
          Seed 3 Decants
        </button>
        <button type="button" style={styles.modalPrimary} data-testid="dev-panel-ff-1h"
                onClick={() => fastForwardMs(3_600_000)}>
          Fast-forward 1 hour
        </button>
        <button type="button" style={styles.modalPrimary} data-testid="dev-panel-ff-8h"
                onClick={() => fastForwardMs(8 * 3_600_000)}>
          Fast-forward 8 hours
        </button>
        <button type="button" style={styles.modalPrimary} data-testid="dev-panel-mark-seen-all"
                onClick={() => useColonyStore.setState({ seenSurfaces: ALL_SEEN })}>
          Mark all screens seen
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 9.3.3: Register the keybinding in `App.tsx`**

In `src/App.tsx`:

```tsx
import { useEffect } from 'react';
import { DevPanel } from './ui/components/DevPanel';
// ...

// Inside App():
const [devOpen, setDevOpen] = useState(false);

useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.metaKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      setDevOpen((v) => !v);
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);

// ... in the returned JSX (post-boot branch), add:
<DevPanel open={devOpen} onClose={() => setDevOpen(false)} />
```

- [ ] **Step 9.3.4: Run + commit**

```bash
npm test
git add src/state/colony.ts src/ui/components/DevPanel.tsx tests/ui/DevPanel.test.tsx tests/state/colony.fastForward.test.ts src/App.tsx
git commit -m "feat(ui): DevPanel with reset/seed/fast-forward + Cmd+Shift+D toggle (P9 Task 9.3)"
```

### Task 9.4: End-to-end integration test

**Files:**
- Extend: `tests/ui/onboarding-flow.test.tsx`

- [ ] **Step 9.4.1: Add "full loop" test**

Append to `tests/ui/onboarding-flow.test.tsx`:

```tsx
  it('full onboarding: gate → intro → directive → decant → registry discovers', () => {
    const { getByTestId } = render(<App />);
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    fireEvent.click(getByTestId('intro-modal-begin'));
    expect(getByTestId('directive-banner').textContent).toContain('Decant your first specimen');
    // navigate to Colony and Decant
    fireEvent.click(getByTestId('nav-tab-colony'));
    fireEvent.click(getByTestId('decant-button'));
    // directive advanced, reward toast fired, term discovered
    expect(getByTestId('directive-banner').textContent).toContain('DNA Lab');
    expect(useColonyStore.getState().discoveredTerms.morula).toBe(true);
    expect(useColonyStore.getState().discoveredTerms.decant).toBe(true);
    // navigate to Registry — morula row shows definition, not ???
    fireEvent.click(getByTestId('nav-tab-registry'));
    expect(getByTestId('registry-row-morula').textContent?.toLowerCase()).toContain('vat-embryo');
  });

  it('dev panel reset returns to first-run', () => {
    const { getByTestId } = render(<App />);
    fireEvent.click(getByTestId('new-game-gate-new-game'));
    fireEvent.click(getByTestId('intro-modal-skip'));
    fireEvent.click(getByTestId('decant-button'));
    expect(useColonyStore.getState().units).toHaveLength(1);
    // open dev panel via keyboard
    fireEvent.keyDown(window, { key: 'D', shiftKey: true, metaKey: true });
    fireEvent.click(getByTestId('dev-panel-reset'));
    expect(useColonyStore.getState().units).toEqual([]);
    expect(useColonyStore.getState().firstRunComplete).toBe(false);
  });
```

- [ ] **Step 9.4.2: Run + commit**

```bash
npm test
git add tests/ui/onboarding-flow.test.tsx
git commit -m "test(ui): end-to-end onboarding flow + dev panel reset (P9 Task 9.4)"
```

### Phase 9 done-when check

- [ ] Registry tab shows Vocabulary + Tiers + Your record sections.
- [ ] Fresh save: every row shows `???`. Decant once → the Morula and Decant rows unlock; the tier row for the produced unit unlocks.
- [ ] Cmd+Shift+D opens the dev panel from anywhere. Reset returns to NewGameGate on next reload.
- [ ] `npm test` green; `npm run build` green.

---

## Self-Review

Ran the checklist per the writing-plans skill.

**1. Spec coverage:** every prompt in `morulium-onboarding-build-prompts (2).md` maps to a phase:
- Prompt 1 → Phase 1 (shell, nav, HUD, locks contract).
- Prompt 2 → Phase 2 (persist, New Game / Continue, AwaySummary).
- Prompt 3 → Phase 3 (free Decants, empty Colony, IntroModal, first-run flag).
- Prompt 4 → Phase 4 (directive data model + CHAIN + STANDING + banner + reward toast + emits from real actions).
- Prompt 5 → Phase 5 (LOCKED_STARTING + unlockSurface + UnlockedToast + Vat unlock cascade).
- Prompt 6 → Phase 6 (definitions + TermTooltip + FirstVisitCallout + per-screen callouts).
- Prompt 7 → Phase 7 (regions data model + Region 1 wrapper + real ConquestMap with progress + multi-region promise).
- Prompt 8 → Phase 8 (ActionToast + IncursionResultSummary + qualitative verdicts).
- Prompt 9 → Phase 9 (discoveredTerms + real Registry + DevPanel + keybinding + end-to-end tests).

Deferred model changes are called out in the plan header (Global Constraints) and *not* smuggled into any phase.

**2. Placeholder scan:** no `TBD`, `implement later`, `similar to Task N`, or `add appropriate error handling` phrases. Every code step includes concrete code. Where a task repeats a pattern (e.g. per-screen callout insertion), the exact per-screen wording is enumerated in the interface block.

**3. Type consistency:**
- `SurfaceId` union is fixed at `unlocks.ts` and reused everywhere.
- `DirectiveId` and `DirectiveAction` are stable across `directives.ts`, store hooks, and tests.
- `TermKey` matches between `definitions.ts` and `discovered.ts`.
- Store action names are stable: `resetGame`, `clearAwaySummary`, `markFirstRunComplete`, `emitDirectiveAction`, `clearRecentReward`, `unlockSurface`, `clearRecentUnlock`, `markSeen`, `discoverTerm`, `emitActionMessage`, `clearActionMessage`, `clearLastIncursionResolution`, `fastForwardMs`.
- Persist version bumps are strictly sequential: v9 (existing) → v10 (P1 unlocks) → v11 (P3 freeDecants + firstRun) → v12 (P4 directives) → v13 (P6 seenSurfaces) → v14 (P9 discoveredTerms). Phases 2, 5, 7, 8 add transient state only (no version bump).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-05-onboarding-layer.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for a 9-phase plan because each task's context stays clean and phase-level checkpoints catch regressions early.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

Which approach?
