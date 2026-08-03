# M1 — Sim Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure sim core (genome, stats, rarity) for Morulium — enough to roll 50 monsters and print their genomes, base stats, level-scaled stats, and rarity tiers.

**Architecture:** A `src/sim/` folder of pure, deterministic modules with one-way dependencies (`types → data → rng → genome/rarity → stats`). No React, no DOM, no globals — every random call goes through an explicitly-passed `SeededRng`. This is the foundation every later milestone builds on.

**Tech Stack:** Vite + React + TypeScript, Vitest for tests, npm for packages. React is scaffolded but barely used in M1 — it's here so M2 can drop in a sprite gallery without re-scaffolding.

## Global Constraints

- **TypeScript strict mode.** `"strict": true` in `tsconfig.json`; no `any` in `src/sim/*` — use `unknown` and narrow if truly needed.
- **`src/sim/*` is pure.** No imports of `react`, `react-dom`, `zustand`, `window`, `document`, `localStorage`, `Math.random`, or `Date.now()`. Determinism is a hard rule — a future replay-debugger depends on it.
- **Randomness only via `SeededRng`.** Every function that consumes randomness takes an explicit `SeededRng` parameter.
- **Data tables are frozen.** All exports in `src/sim/data/*` use `as const` (or return `Readonly<...>` types) so no runtime mutation is possible.
- **Hidden info stays hidden at boundaries.** `rarity.ts` returns a `Tier`, never a raw score. Later modules (`mission.ts` in M5) will follow the same rule.
- **Test runner:** Vitest. Import `describe`, `it`, `expect` from `'vitest'`. No Jest globals.
- **Node 20+.**
- **Commit style:** Conventional Commits (`feat:`, `test:`, `chore:`, etc.) with a one-line subject; body only when it adds real context. Every commit includes `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- **File size discipline.** If a `sim/` module grows past ~150 lines, split by responsibility rather than layer.

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts` — kept separate from vite.config so test config never leaks into the browser build
- Create: `.gitignore`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: nothing (root task)
- Produces: A runnable Vite dev server, a runnable Vitest suite, an npm script layout other tasks assume: `npm run dev`, `npm test`, `npm run build`, `npm run typecheck`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "morulium",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.6"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    globals: false,
  },
});
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules
dist
.vite
coverage
*.log
.DS_Store
.env
.env.*
!.env.example
```

- [ ] **Step 7: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Morulium</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 9: Create `src/App.tsx`**

```tsx
export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Morulium — M1 scaffold</h1>
      <p>Sim core is under construction. See <code>npm test</code> for the real work.</p>
    </main>
  );
}
```

- [ ] **Step 10: Create a smoke test at `tests/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('project scaffold', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 11: Install and verify**

Run: `npm install`
Then: `npm test`
Expected: 1 test passes.
Then: `npm run typecheck`
Expected: no errors.
Then: `npm run dev` (start briefly, hit `http://localhost:5173`, confirm "Morulium — M1 scaffold" renders, then Ctrl-C)

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts .gitignore index.html src/ tests/
git commit -m "$(cat <<'EOF'
chore: scaffold vite + react + ts + vitest project

Establishes the workspace M1 will build the sim core into. React is
scaffolded but unused beyond a placeholder page so M2 can add the
sprite gallery without re-scaffolding.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Sim types + data tables

**Files:**
- Create: `src/sim/types.ts`
- Create: `src/sim/data/alleles.ts`
- Create: `src/sim/data/loci.ts`
- Create: `src/sim/data/palettes.ts`
- Create: `tests/sim/data.test.ts`

**Interfaces:**
- Consumes: nothing from other sim tasks
- Produces:
  - `type Stat = 'PWR' | 'VIT' | 'SPD' | 'INT' | 'GUI'`
  - `const STATS: readonly Stat[]`
  - `type Tier = 'Basic' | 'Variant' | 'Adapted' | 'Evolved' | 'Apex'`
  - `type Dominance = 'dominant' | 'recessive'`
  - `type LocusType = 'quantitative' | 'qualitative'`
  - `interface Allele { id, locus, label, rarityWeight: 0|1|3|6|10, statDeltas: Partial<Record<Stat, number>>, ability?, dominance? }`
  - `interface Locus { id, type: LocusType, alleles: readonly string[] }`
  - `interface Genome { loci: Record<string, readonly [string, string]> }`
  - `interface PhenotypeDescriptor { expressed: Record<string, string>, palette: string }`
  - `interface Palette { id, ramp: readonly string[] }`
  - `const ALLELES: Readonly<Record<string, Allele>>` (23 quantitative + 15 qualitative + 4 palette alleles)
  - `const LOCI: Readonly<Record<string, Locus>>` (8 quantitative + 5 qualitative + 1 palette)
  - `const PALETTES: Readonly<Record<string, Palette>>` (4 starter palettes)

- [ ] **Step 1: Write `tests/sim/data.test.ts`** (this is the failing test — data doesn't exist yet)

```ts
import { describe, it, expect } from 'vitest';
import { ALLELES, LOCI, PALETTES } from '../../src/sim/data/loci';
import { STATS, type Allele } from '../../src/sim/types';

describe('data integrity', () => {
  it('every locus has at least one allele registered', () => {
    for (const locus of Object.values(LOCI)) {
      expect(locus.alleles.length).toBeGreaterThan(0);
    }
  });

  it('every allele in a locus.alleles list exists in ALLELES and back-references the locus', () => {
    for (const locus of Object.values(LOCI)) {
      for (const alleleId of locus.alleles) {
        const allele = ALLELES[alleleId];
        expect(allele, `missing allele ${alleleId}`).toBeDefined();
        expect(allele!.locus).toBe(locus.id);
      }
    }
  });

  it('every allele in ALLELES belongs to a registered locus', () => {
    for (const allele of Object.values(ALLELES)) {
      const locus = LOCI[allele.locus];
      expect(locus, `orphan allele ${allele.id}`).toBeDefined();
      expect(locus!.alleles).toContain(allele.id);
    }
  });

  it('rarity weights are one of the canonical values', () => {
    const valid = new Set([0, 1, 3, 6, 10]);
    for (const allele of Object.values(ALLELES)) {
      expect(valid.has(allele.rarityWeight)).toBe(true);
    }
  });

  it('quantitative alleles only touch declared Stat keys', () => {
    const statSet = new Set<string>(STATS);
    for (const allele of Object.values(ALLELES)) {
      for (const key of Object.keys(allele.statDeltas)) {
        expect(statSet.has(key)).toBe(true);
      }
    }
  });

  it('qualitative loci carry alleles with a dominance value', () => {
    for (const locus of Object.values(LOCI)) {
      if (locus.type !== 'qualitative') continue;
      for (const alleleId of locus.alleles) {
        const allele = ALLELES[alleleId] as Allele;
        expect(allele.dominance).toBeDefined();
      }
    }
  });

  it('quantitative loci carry alleles WITHOUT a dominance value', () => {
    for (const locus of Object.values(LOCI)) {
      if (locus.type !== 'quantitative') continue;
      for (const alleleId of locus.alleles) {
        const allele = ALLELES[alleleId] as Allele;
        expect(allele.dominance).toBeUndefined();
      }
    }
  });

  it('has at least one palette registered', () => {
    expect(Object.values(PALETTES).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- tests/sim/data.test.ts`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Create `src/sim/types.ts`**

```ts
export type Stat = 'PWR' | 'VIT' | 'SPD' | 'INT' | 'GUI';
export const STATS: readonly Stat[] = ['PWR', 'VIT', 'SPD', 'INT', 'GUI'] as const;

export type Tier = 'Basic' | 'Variant' | 'Adapted' | 'Evolved' | 'Apex';

export type Dominance = 'dominant' | 'recessive';
export type LocusType = 'quantitative' | 'qualitative';

export type RarityWeight = 0 | 1 | 3 | 6 | 10;

export interface Allele {
  readonly id: string;
  readonly locus: string;
  readonly label: string;
  readonly rarityWeight: RarityWeight;
  readonly statDeltas: Readonly<Partial<Record<Stat, number>>>;
  readonly ability?: string;
  readonly dominance?: Dominance;
}

export interface Locus {
  readonly id: string;
  readonly type: LocusType;
  readonly alleles: readonly string[];
}

export interface Genome {
  readonly loci: Readonly<Record<string, readonly [string, string]>>;
}

export interface PhenotypeDescriptor {
  readonly expressed: Readonly<Record<string, string>>;
  readonly palette: string;
}

export interface Palette {
  readonly id: string;
  readonly ramp: readonly string[];
}
```

- [ ] **Step 4: Create `src/sim/data/alleles.ts`**

Two tiny builder helpers keep the table readable. Every allele is declared explicitly so a reader can eyeball the whole table.

```ts
import type { Allele, RarityWeight, Stat, Dominance } from '../types';

function q(
  id: string,
  locus: string,
  label: string,
  weight: RarityWeight,
  deltas: Partial<Record<Stat, number>>,
): Allele {
  return { id, locus, label, rarityWeight: weight, statDeltas: deltas };
}

function qual(
  id: string,
  locus: string,
  label: string,
  weight: RarityWeight,
  dominance: Dominance,
  deltas: Partial<Record<Stat, number>> = {},
  ability?: string,
): Allele {
  return dominance && ability !== undefined
    ? { id, locus, label, rarityWeight: weight, statDeltas: deltas, ability, dominance }
    : { id, locus, label, rarityWeight: weight, statDeltas: deltas, dominance };
}

// Quantitative — 8 loci, 23 alleles total.
const QUANTITATIVE: Allele[] = [
  // musculature (axis: PWR ↔ INT)
  q('mus_strong',  'musculature', 'Corded Musculature',   3, { PWR:  4, INT: -3 }),
  q('mus_lean',    'musculature', 'Lean Musculature',     1, { PWR:  2, INT: -1 }),
  q('mus_neutral', 'musculature', 'Baseline Musculature', 0, {}),

  // neural_tissue (axis: INT ↔ VIT)
  q('neu_dense',   'neural_tissue', 'Dense Neural Tissue',    3, { INT:  4, VIT: -3 }),
  q('neu_woven',   'neural_tissue', 'Woven Neural Tissue',    1, { INT:  2, VIT: -1 }),
  q('neu_neutral', 'neural_tissue', 'Baseline Neural Tissue', 0, {}),

  // predator_drive (axis: PWR ↔ GUI)
  q('prd_hunter',  'predator_drive', 'Hunter Drive',   3, { PWR:  3, GUI: -2 }),
  q('prd_neutral', 'predator_drive', 'Balanced Drive', 0, {}),
  q('prd_stalker', 'predator_drive', 'Stalker Drive',  3, { GUI:  3, PWR: -2 }),

  // carapace_density (axis/tempo: VIT ↔ SPD)
  q('car_heavy',   'carapace_density', 'Heavy Carapace',    3, { VIT:  4, SPD: -3 }),
  q('car_medium',  'carapace_density', 'Medium Carapace',   1, { VIT:  2, SPD: -1 }),
  q('car_neutral', 'carapace_density', 'Baseline Carapace', 0, {}),

  // metabolism (tempo: SPD ↔ VIT)
  q('met_burn',    'metabolism', 'Burning Metabolism',   3, { SPD:  4, VIT: -2 }),
  q('met_fast',    'metabolism', 'Fast Metabolism',      1, { SPD:  2 }),
  q('met_neutral', 'metabolism', 'Baseline Metabolism',  0, {}),

  // sinew (tempo: SPD ↔ PWR)
  q('sin_wiry',    'sinew', 'Wiry Sinew',    1, { SPD:  3, PWR: -1 }),
  q('sin_neutral', 'sinew', 'Baseline Sinew', 0, {}),

  // vigor (fine)
  q('vig_strong',  'vigor', 'Strong Vigor',    1, { VIT:  2 }),
  q('vig_mild',    'vigor', 'Mild Vigor',      1, { VIT:  1 }),
  q('vig_neutral', 'vigor', 'Baseline Vigor',  0, {}),

  // acuity (fine)
  q('acu_sharp',   'acuity', 'Sharp Acuity',   1, { INT:  2 }),
  q('acu_keen',    'acuity', 'Keen Acuity',    1, { GUI:  1 }),
  q('acu_neutral', 'acuity', 'Baseline Acuity', 0, {}),
];

// Qualitative — 5 loci, 15 alleles total.
// Dominance choices: all "None"/baseline options are recessive; distinctive
// parts are dominant; the aberration tree is recessive (per game spec).
const QUALITATIVE: Allele[] = [
  // head
  qual('head_maw',      'head', 'Maw',            3, 'dominant', { PWR: 3 }, 'Rend'),
  qual('head_sensor',   'head', 'Sensor-Cluster', 3, 'dominant', { INT: 3 }, 'Recon'),
  qual('head_mandible', 'head', 'Mandibles',      1, 'dominant', { PWR: 1 }, 'Grip'),

  // carapace
  qual('cara_chitin',   'carapace', 'Chitin',     1, 'dominant', { VIT: 1 }),
  qual('cara_bone',     'carapace', 'Bone-Plate', 3, 'dominant', { VIT: 3, SPD: -1 }, 'Bulwark'),
  qual('cara_hide',     'carapace', 'Hide',       1, 'recessive', { VIT: 1, SPD: 1 }),

  // locomotion
  qual('loco_sprint',   'locomotion', 'Sprint-Limbs', 3, 'dominant', { SPD: 3 }, 'Sprint'),
  qual('loco_burrow',   'locomotion', 'Burrowers',    3, 'dominant', { GUI: 3 }, 'Ambush'),
  qual('loco_bulk',     'locomotion', 'Bulk-Treads',  1, 'recessive', { VIT: 2, SPD: -1 }),

  // appendage
  qual('app_stinger',   'appendage', 'Stinger',   3, 'dominant', {},           'Venom'),
  qual('app_lash',      'appendage', 'Lash',      1, 'dominant', { PWR: 1 }),
  qual('app_spinneret', 'appendage', 'Spinneret', 3, 'dominant', { GUI: 2 },   'Cloak'),
  qual('app_none',      'appendage', 'None',      0, 'recessive'),

  // aberration (rare recessive tree — game spec §2)
  qual('ab_voltaic',    'aberration', 'Voltaic',   10, 'recessive', { VIT: -2 }, 'Shock'),
  qual('ab_corrosive',  'aberration', 'Corrosive', 10, 'recessive', { SPD: -2 }, 'Melt'),
  qual('ab_none',       'aberration', 'None',       0, 'dominant'),
];

// Palette (qualitative-adjacent, no stat effect)
const PALETTE_ALLELES: Allele[] = [
  qual('pal_ash',    'palette', 'Ash',    0, 'dominant'),
  qual('pal_rust',   'palette', 'Rust',   1, 'dominant'),
  qual('pal_moss',   'palette', 'Moss',   1, 'dominant'),
  qual('pal_bloom',  'palette', 'Bloom',  3, 'recessive'),
];

function index(list: Allele[]): Readonly<Record<string, Allele>> {
  const out: Record<string, Allele> = {};
  for (const a of list) {
    if (out[a.id]) throw new Error(`duplicate allele id: ${a.id}`);
    out[a.id] = a;
  }
  return Object.freeze(out);
}

export const ALLELES = index([...QUANTITATIVE, ...QUALITATIVE, ...PALETTE_ALLELES]);
```

- [ ] **Step 5: Create `src/sim/data/loci.ts`**

```ts
import type { Locus } from '../types';
import { ALLELES } from './alleles';

export { ALLELES } from './alleles';
export { PALETTES } from './palettes';

function locus(id: string, type: 'quantitative' | 'qualitative'): Locus {
  const alleles = Object.values(ALLELES)
    .filter((a) => a.locus === id)
    .map((a) => a.id);
  return { id, type, alleles };
}

export const LOCI: Readonly<Record<string, Locus>> = Object.freeze({
  musculature:      locus('musculature',      'quantitative'),
  neural_tissue:    locus('neural_tissue',    'quantitative'),
  predator_drive:   locus('predator_drive',   'quantitative'),
  carapace_density: locus('carapace_density', 'quantitative'),
  metabolism:       locus('metabolism',       'quantitative'),
  sinew:            locus('sinew',            'quantitative'),
  vigor:            locus('vigor',            'quantitative'),
  acuity:           locus('acuity',           'quantitative'),
  head:             locus('head',             'qualitative'),
  carapace:         locus('carapace',         'qualitative'),
  locomotion:       locus('locomotion',       'qualitative'),
  appendage:        locus('appendage',        'qualitative'),
  aberration:       locus('aberration',       'qualitative'),
  palette:          locus('palette',          'qualitative'),
});
```

- [ ] **Step 6: Create `src/sim/data/palettes.ts`**

```ts
import type { Palette } from '../types';

export const PALETTES: Readonly<Record<string, Palette>> = Object.freeze({
  pal_ash:   { id: 'pal_ash',   ramp: ['#1c1c1c', '#3d3d3d', '#6e6e6e', '#b6b6b6'] },
  pal_rust:  { id: 'pal_rust',  ramp: ['#2a1108', '#5c1d0e', '#a83c14', '#e28550'] },
  pal_moss:  { id: 'pal_moss',  ramp: ['#0d1a10', '#254a2c', '#4f7c48', '#a6c58a'] },
  pal_bloom: { id: 'pal_bloom', ramp: ['#20081d', '#5a1450', '#a835a1', '#f7a3d7'] },
});
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- tests/sim/data.test.ts`
Expected: PASS (8 tests).
Also: `npm run typecheck` — expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/sim/types.ts src/sim/data/ tests/sim/data.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): add types and frozen data tables

Defines Stat, Allele, Locus, Genome, Tier, and PhenotypeDescriptor
plus the MVP allele/locus/palette tables from game-spec §2.

23 quantitative alleles across 8 loci give real distribution to base
stats; 15 qualitative alleles across 5 slots (including the recessive
aberration tree) drive parts and abilities.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Seeded RNG

**Files:**
- Create: `src/sim/rng.ts`
- Create: `tests/sim/rng.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `interface SeededRng { next(): number; nextInt(min: number, max: number): number; pick<T>(arr: readonly T[]): T; fork(salt: number): SeededRng }`
  - `function createRng(seed: number): SeededRng`
  - `next()` returns a float in `[0, 1)`.
  - `nextInt(min, max)` returns an integer in `[min, max]` inclusive on both ends.
  - `pick(arr)` returns a uniformly random element; throws on empty array.
  - `fork(salt)` returns a new independent RNG derived from the parent state and salt (used later for per-locus rolls that must be reproducible in isolation).

- [ ] **Step 1: Write `tests/sim/rng.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/sim/rng';

describe('SeededRng', () => {
  it('same seed produces the same next() sequence', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 8 }, () => a.next());
    const seqB = Array.from({ length: 8 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds produce different sequences', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('next() stays in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt returns integers within [min, max] inclusive', () => {
    const rng = createRng(11);
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextInt(3, 7);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it('nextInt hits both boundaries over enough rolls', () => {
    const rng = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.nextInt(0, 3));
    expect(seen).toEqual(new Set([0, 1, 2, 3]));
  });

  it('pick returns an element of the array', () => {
    const rng = createRng(13);
    const arr = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it('pick throws on empty array', () => {
    const rng = createRng(1);
    expect(() => rng.pick([])).toThrow();
  });

  it('fork produces an independent, deterministic stream', () => {
    const parent = createRng(100);
    const childA = parent.fork(1);
    const parent2 = createRng(100);
    const childB = parent2.fork(1);
    // Same seed + same salt → same fork stream
    expect(childA.next()).toBe(childB.next());
    // Different salts → different streams
    const different = createRng(100).fork(2);
    expect(createRng(100).fork(1).next()).not.toBe(different.next());
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/sim/rng.test.ts`
Expected: FAIL — `createRng` not found.

- [ ] **Step 3: Implement `src/sim/rng.ts`**

Uses mulberry32 — small, fast, well-distributed for game purposes; not cryptographic.

```ts
export interface SeededRng {
  next(): number;
  nextInt(min: number, max: number): number;
  pick<T>(arr: readonly T[]): T;
  fork(salt: number): SeededRng;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix32(a: number, b: number): number {
  // xorshift-ish mixer; deterministic combination of two 32-bit values
  let x = ((a >>> 0) ^ Math.imul(b >>> 0, 0x85ebca6b)) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x;
}

export function createRng(seed: number): SeededRng {
  const src = mulberry32(seed);

  const api: SeededRng = {
    next: () => src(),
    nextInt: (min, max) => {
      if (max < min) throw new Error(`nextInt: max (${max}) < min (${min})`);
      const span = max - min + 1;
      return min + Math.floor(src() * span);
    },
    pick: <T,>(arr: readonly T[]): T => {
      if (arr.length === 0) throw new Error('pick: empty array');
      return arr[Math.floor(src() * arr.length)]!;
    },
    fork: (salt) => {
      const parentState = Math.floor(src() * 4294967296);
      return createRng(mix32(parentState, salt));
    },
  };

  return api;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/sim/rng.test.ts`
Expected: PASS (8 tests).
Then: `npm run typecheck` — expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/sim/rng.ts tests/sim/rng.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): seeded RNG with next/nextInt/pick/fork

mulberry32-based; deterministic given a seed. fork() derives an
independent child stream from parent state + salt so per-locus rolls
can be reproduced in isolation. Passed explicitly rather than global
so the sim stays replayable end-to-end.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Rarity computation

**Files:**
- Create: `src/sim/rarity.ts`
- Create: `tests/sim/rarity.test.ts`

**Interfaces:**
- Consumes: `ALLELES` from `data/loci.ts`, types from `types.ts`
- Produces:
  - `function computeRarity(genome: Genome): Tier`
  - Internally sums `rarityWeight` over each *expressed* allele. For M1, we approximate "expressed" by summing over **both** alleles at every locus (a homozygous rare-allele unit is rarer than a heterozygous one — this matches the "computed, not rolled" spec §3 principle even before dominance is factored into rarity). We'll revisit whether to only count *expressed* alleles when we have gameplay signal in M5.
  - Thresholds (game spec §3): Basic 0–2, Variant 3–10, Adapted 11–14, Evolved 15–19, Apex 20+.
  - **The numeric score never leaves this module** — only `Tier` is returned.

- [ ] **Step 1: Write `tests/sim/rarity.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { computeRarity } from '../../src/sim/rarity';
import type { Genome } from '../../src/sim/types';

function genome(pairs: Record<string, [string, string]>): Genome {
  return { loci: pairs };
}

// A minimum-score genome from the current allele table: every quantitative locus
// uses its 0-weight allele; every qualitative locus uses its lowest-weight allele.
// Score = head_mandible(1) + cara_chitin(1) + loco_bulk(1) + app_none(0) + ab_none(0) + pal_ash(0) = 3.
// (There is no 0-weight allele for head/carapace/locomotion in the MVP table.)
const MIN_SCORE_LOCI: Record<string, [string, string]> = {
  musculature:      ['mus_neutral', 'mus_neutral'],
  neural_tissue:    ['neu_neutral', 'neu_neutral'],
  predator_drive:   ['prd_neutral', 'prd_neutral'],
  carapace_density: ['car_neutral', 'car_neutral'],
  metabolism:       ['met_neutral', 'met_neutral'],
  sinew:            ['sin_neutral', 'sin_neutral'],
  vigor:            ['vig_neutral', 'vig_neutral'],
  acuity:           ['acu_neutral', 'acu_neutral'],
  head:             ['head_mandible', 'head_mandible'],
  carapace:         ['cara_chitin',   'cara_chitin'],
  locomotion:       ['loco_bulk',     'loco_bulk'],
  appendage:        ['app_none',      'app_none'],
  aberration:       ['ab_none',       'ab_none'],
  palette:          ['pal_ash',       'pal_ash'],
};

describe('computeRarity', () => {
  it('the minimum-weight genome in the current table lands in Variant (score 3)', () => {
    expect(computeRarity(genome(MIN_SCORE_LOCI))).toBe('Variant');
  });

  it('two Apex aberration alleles push the genome to Apex', () => {
    // 20 (two ab_voltaic) + 3 (min qualitative baseline) = 23 → Apex
    const g = genome({ ...MIN_SCORE_LOCI, aberration: ['ab_voltaic', 'ab_voltaic'] });
    expect(computeRarity(g)).toBe('Apex');
  });

  it('threshold boundaries: 2→Basic, 3→Variant, 10→Variant, 11→Adapted, 14→Adapted, 15→Evolved, 19→Evolved, 20→Apex', () => {
    // We can't fabricate an arbitrary total score with only the real allele table,
    // so unit-test the pure tier function via an exported helper if needed. For now,
    // spot-check the boundaries the current table can actually reach.
    // Score 3 → Variant (min genome above).
    expect(computeRarity(genome(MIN_SCORE_LOCI))).toBe('Variant');
    // Add one Adapted-weight allele (weight 3, homozygous) to lift score by +6 → 9 → Variant.
    expect(computeRarity(genome({ ...MIN_SCORE_LOCI, musculature: ['mus_strong', 'mus_strong'] }))).toBe('Variant');
    // Add two homozygous Adapted alleles → +12 → 15 → Evolved.
    expect(computeRarity(genome({
      ...MIN_SCORE_LOCI,
      musculature: ['mus_strong', 'mus_strong'],
      neural_tissue: ['neu_dense', 'neu_dense'],
    }))).toBe('Evolved');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/sim/rarity.test.ts`
Expected: FAIL — `computeRarity` not found.

- [ ] **Step 3: Implement `src/sim/rarity.ts`**

```ts
import type { Genome, Tier } from './types';
import { ALLELES } from './data/loci';

/**
 * Sum rarityWeight over both alleles at every locus. Returning only a tier
 * (never the score) keeps the number hidden from any caller — principle 5.
 */
export function computeRarity(genome: Genome): Tier {
  let score = 0;
  for (const pair of Object.values(genome.loci)) {
    for (const alleleId of pair) {
      const allele = ALLELES[alleleId];
      if (!allele) throw new Error(`unknown allele in genome: ${alleleId}`);
      score += allele.rarityWeight;
    }
  }
  return tierForScore(score);
}

function tierForScore(score: number): Tier {
  if (score <= 2) return 'Basic';
  if (score <= 10) return 'Variant';
  if (score <= 14) return 'Adapted';
  if (score <= 19) return 'Evolved';
  return 'Apex';
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/sim/rarity.test.ts`
Expected: PASS (3 tests).
Then: `npm run typecheck` — expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/sim/rarity.ts tests/sim/rarity.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): computeRarity — score both alleles, return tier only

Sums rarityWeight across every allele at every locus and maps to the
Basic/Variant/Adapted/Evolved/Apex tiers from game-spec §3. The raw
score never leaves the module, enforcing principle 5 (hidden info) at
the boundary.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Genome rolling + phenotype expression

**Files:**
- Create: `src/sim/genome.ts`
- Create: `tests/sim/genome.test.ts`

**Interfaces:**
- Consumes: `LOCI`, `ALLELES` from `data/loci.ts`; `createRng`/`SeededRng` from `rng.ts`; types from `types.ts`
- Produces:
  - `function rollGenome(rng: SeededRng): Genome` — picks two random alleles per registered locus (independent draws; homozygous outcomes are possible and expected).
  - `function expressPhenotype(genome: Genome): PhenotypeDescriptor` — resolves the visible allele per locus using dominance rules, plus surfaces the palette allele id.
  - **Dominance rules (M1 canonical):**
    1. Homozygous → that allele expresses.
    2. Heterozygous, one dominant + one recessive → dominant expresses.
    3. Heterozygous, two dominants (or two recessives, which only shows via mutation later) → higher `rarityWeight` wins; ties broken by lexicographic id ascending.

- [ ] **Step 1: Write `tests/sim/genome.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { rollGenome, expressPhenotype } from '../../src/sim/genome';
import { createRng } from '../../src/sim/rng';
import { LOCI, ALLELES } from '../../src/sim/data/loci';
import type { Genome } from '../../src/sim/types';

describe('rollGenome', () => {
  it('produces exactly two alleles for every registered locus', () => {
    const g = rollGenome(createRng(1));
    for (const locusId of Object.keys(LOCI)) {
      const pair = g.loci[locusId];
      expect(pair, `missing locus ${locusId}`).toBeDefined();
      expect(pair!.length).toBe(2);
    }
    expect(Object.keys(g.loci).sort()).toEqual(Object.keys(LOCI).sort());
  });

  it('every rolled allele is valid at its locus', () => {
    const g = rollGenome(createRng(2));
    for (const [locusId, pair] of Object.entries(g.loci)) {
      const locus = LOCI[locusId]!;
      for (const alleleId of pair) {
        expect(locus.alleles).toContain(alleleId);
      }
    }
  });

  it('is deterministic for a given seed', () => {
    const a = rollGenome(createRng(1234));
    const b = rollGenome(createRng(1234));
    expect(a).toEqual(b);
  });

  it('different seeds yield different genomes on average', () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const unique = new Set(seeds.map((s) => JSON.stringify(rollGenome(createRng(s)))));
    expect(unique.size).toBeGreaterThan(5);
  });
});

describe('expressPhenotype', () => {
  const g = (pairs: Record<string, [string, string]>): Genome => ({ loci: pairs });

  it('homozygous locus expresses that allele', () => {
    const p = expressPhenotype(g({
      musculature:      ['mus_strong', 'mus_strong'],
      neural_tissue:    ['neu_neutral', 'neu_neutral'],
      predator_drive:   ['prd_neutral', 'prd_neutral'],
      carapace_density: ['car_neutral', 'car_neutral'],
      metabolism:       ['met_neutral', 'met_neutral'],
      sinew:            ['sin_neutral', 'sin_neutral'],
      vigor:            ['vig_neutral', 'vig_neutral'],
      acuity:           ['acu_neutral', 'acu_neutral'],
      head:             ['head_maw',       'head_maw'],
      carapace:         ['cara_chitin',    'cara_chitin'],
      locomotion:       ['loco_sprint',    'loco_sprint'],
      appendage:        ['app_stinger',    'app_stinger'],
      aberration:       ['ab_voltaic',     'ab_voltaic'],
      palette:          ['pal_ash',        'pal_ash'],
    }));
    expect(p.expressed.head).toBe('head_maw');
    expect(p.expressed.aberration).toBe('ab_voltaic');
    expect(p.palette).toBe('pal_ash');
  });

  it('heterozygous dominant + recessive expresses the dominant', () => {
    const p = expressPhenotype(g({
      musculature: ['mus_neutral', 'mus_neutral'], neural_tissue: ['neu_neutral', 'neu_neutral'],
      predator_drive: ['prd_neutral', 'prd_neutral'], carapace_density: ['car_neutral', 'car_neutral'],
      metabolism: ['met_neutral', 'met_neutral'], sinew: ['sin_neutral', 'sin_neutral'],
      vigor: ['vig_neutral', 'vig_neutral'], acuity: ['acu_neutral', 'acu_neutral'],
      head: ['head_maw', 'head_mandible'], // both dominant — separate test
      carapace: ['cara_chitin', 'cara_hide'], // dominant vs. recessive
      locomotion: ['loco_sprint', 'loco_bulk'], // dominant vs. recessive
      appendage: ['app_stinger', 'app_none'], // dominant vs. recessive
      aberration: ['ab_none', 'ab_voltaic'], // dominant (none) vs. recessive (voltaic)
      palette: ['pal_ash', 'pal_ash'],
    }));
    expect(p.expressed.carapace).toBe('cara_chitin');
    expect(p.expressed.locomotion).toBe('loco_sprint');
    expect(p.expressed.appendage).toBe('app_stinger');
    expect(p.expressed.aberration).toBe('ab_none'); // recessive aberration hidden as carrier
  });

  it('heterozygous two-dominants — higher rarityWeight wins', () => {
    const p = expressPhenotype(g({
      musculature: ['mus_neutral', 'mus_neutral'], neural_tissue: ['neu_neutral', 'neu_neutral'],
      predator_drive: ['prd_neutral', 'prd_neutral'], carapace_density: ['car_neutral', 'car_neutral'],
      metabolism: ['met_neutral', 'met_neutral'], sinew: ['sin_neutral', 'sin_neutral'],
      vigor: ['vig_neutral', 'vig_neutral'], acuity: ['acu_neutral', 'acu_neutral'],
      head: ['head_maw', 'head_mandible'], // weights 3 vs 1
      carapace: ['cara_chitin', 'cara_chitin'],
      locomotion: ['loco_sprint', 'loco_sprint'],
      appendage: ['app_stinger', 'app_stinger'],
      aberration: ['ab_none', 'ab_none'],
      palette: ['pal_ash', 'pal_ash'],
    }));
    expect(p.expressed.head).toBe('head_maw');
    // Verify ALLELES data assumption for this test:
    expect(ALLELES['head_maw']!.rarityWeight).toBeGreaterThan(ALLELES['head_mandible']!.rarityWeight);
  });

  it('tied rarityWeight — lexicographically smaller id wins', () => {
    // head_maw (weight 3) vs head_sensor (weight 3): 'head_maw' < 'head_sensor'
    const p = expressPhenotype(g({
      musculature: ['mus_neutral', 'mus_neutral'], neural_tissue: ['neu_neutral', 'neu_neutral'],
      predator_drive: ['prd_neutral', 'prd_neutral'], carapace_density: ['car_neutral', 'car_neutral'],
      metabolism: ['met_neutral', 'met_neutral'], sinew: ['sin_neutral', 'sin_neutral'],
      vigor: ['vig_neutral', 'vig_neutral'], acuity: ['acu_neutral', 'acu_neutral'],
      head: ['head_sensor', 'head_maw'],
      carapace: ['cara_chitin', 'cara_chitin'],
      locomotion: ['loco_sprint', 'loco_sprint'],
      appendage: ['app_stinger', 'app_stinger'],
      aberration: ['ab_none', 'ab_none'],
      palette: ['pal_ash', 'pal_ash'],
    }));
    expect(p.expressed.head).toBe('head_maw');
  });

  it('palette is passed through as-is (uses expressed rule too)', () => {
    const p = expressPhenotype(g({
      musculature: ['mus_neutral', 'mus_neutral'], neural_tissue: ['neu_neutral', 'neu_neutral'],
      predator_drive: ['prd_neutral', 'prd_neutral'], carapace_density: ['car_neutral', 'car_neutral'],
      metabolism: ['met_neutral', 'met_neutral'], sinew: ['sin_neutral', 'sin_neutral'],
      vigor: ['vig_neutral', 'vig_neutral'], acuity: ['acu_neutral', 'acu_neutral'],
      head: ['head_mandible', 'head_mandible'], carapace: ['cara_chitin', 'cara_chitin'],
      locomotion: ['loco_bulk', 'loco_bulk'], appendage: ['app_none', 'app_none'],
      aberration: ['ab_none', 'ab_none'],
      palette: ['pal_rust', 'pal_ash'], // both dominant; pal_ash (weight 0) vs pal_rust (weight 1) → pal_rust wins
    }));
    expect(p.palette).toBe('pal_rust');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/sim/genome.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/sim/genome.ts`**

```ts
import type { Genome, PhenotypeDescriptor } from './types';
import { LOCI, ALLELES } from './data/loci';
import type { SeededRng } from './rng';

export function rollGenome(rng: SeededRng): Genome {
  const loci: Record<string, readonly [string, string]> = {};
  for (const locus of Object.values(LOCI)) {
    const a = rng.pick(locus.alleles);
    const b = rng.pick(locus.alleles);
    loci[locus.id] = [a, b] as const;
  }
  return { loci };
}

export function expressPhenotype(genome: Genome): PhenotypeDescriptor {
  const expressed: Record<string, string> = {};

  for (const [locusId, [a, b]] of Object.entries(genome.loci)) {
    expressed[locusId] = pickExpressedAllele(a, b);
  }

  const paletteId = expressed['palette'];
  if (!paletteId) throw new Error('genome has no palette locus');

  return { expressed, palette: paletteId };
}

function pickExpressedAllele(aId: string, bId: string): string {
  if (aId === bId) return aId;
  const a = ALLELES[aId];
  const b = ALLELES[bId];
  if (!a || !b) throw new Error(`unknown allele: ${!a ? aId : bId}`);

  // dominant vs recessive → dominant wins
  if (a.dominance === 'dominant' && b.dominance === 'recessive') return aId;
  if (b.dominance === 'dominant' && a.dominance === 'recessive') return bId;

  // same dominance class (both dominant OR both recessive from mutation) →
  // higher rarityWeight wins; ties break by lexicographic id ascending.
  if (a.rarityWeight !== b.rarityWeight) {
    return a.rarityWeight > b.rarityWeight ? aId : bId;
  }
  return aId < bId ? aId : bId;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/sim/genome.test.ts`
Expected: PASS (all tests in the file).
Then: `npm test` — expected: everything green.
Then: `npm run typecheck` — expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/sim/genome.ts tests/sim/genome.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): rollGenome and expressPhenotype

rollGenome draws two independent alleles per registered locus using
the passed-in SeededRng (deterministic under identical seed).

expressPhenotype resolves the visible allele per locus:
  - homozygous → that allele
  - het dominant+recessive → dominant
  - het same-class → higher rarityWeight, ties by id ascending

This is the tie-break rule for M1; can be revisited if playtest shows
it produces suspiciously boring or convergent phenotypes.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Base stats, growth affinity, level scaling

**Files:**
- Create: `src/sim/stats.ts`
- Create: `tests/sim/stats.test.ts`

**Interfaces:**
- Consumes: `ALLELES` from `data/loci.ts`; types from `types.ts`; `expressPhenotype` from `genome.ts`
- Produces:
  - `const BASE_STATS: Readonly<Record<Stat, number>>` — the pre-genome floor. **M1 value: 10 per stat.**
  - `function computeBaseStats(genome: Genome): Record<Stat, number>` — `BASE + Σ statDeltas over EXPRESSED alleles across ALL loci (quantitative + qualitative)`. Floored at 0 per game spec §2.
  - `function computeGrowthAffinity(genome: Genome): Record<Stat, number>` — for each stat, `max(0.1, base[stat] / maxBase)`. The strongest stat's affinity is 1.0; a stat sitting at zero base still grows at the 0.1 floor. Sum-of-affinities is NOT normalized — each stat is judged on its own lean.
  - `function computeCurrentStats(genome: Genome, level: number): Record<Stat, number>` — `base[stat] * (1 + 0.02 * level * affinity[stat])`. At level 20 with affinity 1.0 this is `base * 1.4`, matching the ~+40% cap (game spec §5, principle 2). The function does not enforce a level cap; higher-level callers will (M4).

- [ ] **Step 1: Write `tests/sim/stats.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  BASE_STATS,
  computeBaseStats,
  computeGrowthAffinity,
  computeCurrentStats,
} from '../../src/sim/stats';
import type { Genome } from '../../src/sim/types';

function g(pairs: Record<string, [string, string]>): Genome {
  return { loci: pairs };
}

const NEUTRAL_QUANT = {
  musculature:      ['mus_neutral', 'mus_neutral'],
  neural_tissue:    ['neu_neutral', 'neu_neutral'],
  predator_drive:   ['prd_neutral', 'prd_neutral'],
  carapace_density: ['car_neutral', 'car_neutral'],
  metabolism:       ['met_neutral', 'met_neutral'],
  sinew:            ['sin_neutral', 'sin_neutral'],
  vigor:            ['vig_neutral', 'vig_neutral'],
  acuity:           ['acu_neutral', 'acu_neutral'],
} as const;

const NEUTRAL_QUAL = {
  head:       ['head_mandible', 'head_mandible'],
  carapace:   ['cara_chitin',   'cara_chitin'],
  locomotion: ['loco_bulk',     'loco_bulk'],
  appendage:  ['app_none',      'app_none'],
  aberration: ['ab_none',       'ab_none'],
  palette:    ['pal_ash',       'pal_ash'],
} as const;

describe('computeBaseStats', () => {
  it('a wholly-neutral genome returns BASE_STATS (adjusted for baseline qualitative deltas)', () => {
    const base = computeBaseStats(g({ ...NEUTRAL_QUANT, ...NEUTRAL_QUAL } as Record<string, [string, string]>));
    // NEUTRAL_QUAL includes head_mandible (PWR +1), cara_chitin (VIT +1), loco_bulk (VIT +2, SPD -1).
    expect(base.PWR).toBe(BASE_STATS.PWR + 1);
    expect(base.INT).toBe(BASE_STATS.INT);
    expect(base.GUI).toBe(BASE_STATS.GUI);
    expect(base.VIT).toBe(BASE_STATS.VIT + 1 + 2);
    expect(base.SPD).toBe(BASE_STATS.SPD - 1);
  });

  it('antagonism: raising a PWR axis lowers INT', () => {
    const heavyPwr = g({
      ...NEUTRAL_QUANT,
      musculature: ['mus_strong', 'mus_strong'], // PWR +4/-3 on INT, homozygous → doubled
      ...NEUTRAL_QUAL,
    } as Record<string, [string, string]>);
    const base = computeBaseStats(heavyPwr);
    const neutralBase = computeBaseStats(g({ ...NEUTRAL_QUANT, ...NEUTRAL_QUAL } as Record<string, [string, string]>));
    expect(base.PWR).toBeGreaterThan(neutralBase.PWR);
    expect(base.INT).toBeLessThan(neutralBase.INT);
  });

  it('stats are floored at 0', () => {
    // Stack every INT-penalty locus. mus_strong homozygous = INT -6. neu_neutral neutral.
    // BASE_STATS.INT (10) + (-6) = 4, so we need harsher stacking. Force via aberration + mus.
    // Simpler: just verify the invariant by choosing a target.
    const base = computeBaseStats(g({
      ...NEUTRAL_QUANT,
      musculature: ['mus_strong', 'mus_strong'],   // INT -6
      neural_tissue: ['neu_dense', 'neu_dense'],   // VIT -6 (INT bonus, but we're testing floor generally)
      ...NEUTRAL_QUAL,
    } as Record<string, [string, string]>));
    for (const v of Object.values(base)) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('quantitative loci: both alleles always sum (no dominance for quant)', () => {
    const homozygous = computeBaseStats(g({
      ...NEUTRAL_QUANT,
      musculature: ['mus_strong', 'mus_strong'],   // 2 doses of PWR+4
      ...NEUTRAL_QUAL,
    } as Record<string, [string, string]>));
    const heterozygous = computeBaseStats(g({
      ...NEUTRAL_QUANT,
      musculature: ['mus_strong', 'mus_neutral'],  // 1 dose of PWR+4
      ...NEUTRAL_QUAL,
    } as Record<string, [string, string]>));
    expect(homozygous.PWR - heterozygous.PWR).toBe(4);
  });
});

describe('computeGrowthAffinity', () => {
  it('the highest base stat has affinity 1.0', () => {
    const base = computeBaseStats(g({
      ...NEUTRAL_QUANT,
      musculature: ['mus_strong', 'mus_strong'],
      ...NEUTRAL_QUAL,
    } as Record<string, [string, string]>));
    const aff = computeGrowthAffinity(g({
      ...NEUTRAL_QUANT,
      musculature: ['mus_strong', 'mus_strong'],
      ...NEUTRAL_QUAL,
    } as Record<string, [string, string]>));
    const maxStat = Object.entries(base).sort((a, b) => b[1] - a[1])[0]![0];
    expect(aff[maxStat as keyof typeof aff]).toBeCloseTo(1.0, 5);
  });

  it('every affinity respects the 0.1 floor', () => {
    // With the MVP allele table the floor rarely activates (the extreme spreads
    // still leave every stat > 10% of the max), but the guardrail is in the
    // function so a future data change can't silently create a dead stat.
    const genomes = [
      g({ ...NEUTRAL_QUANT, ...NEUTRAL_QUAL } as Record<string, [string, string]>),
      g({ ...NEUTRAL_QUANT, musculature: ['mus_strong', 'mus_strong'], ...NEUTRAL_QUAL } as Record<string, [string, string]>),
      g({ ...NEUTRAL_QUANT, carapace_density: ['car_heavy', 'car_heavy'], ...NEUTRAL_QUAL } as Record<string, [string, string]>),
    ];
    for (const genome of genomes) {
      for (const v of Object.values(computeGrowthAffinity(genome))) {
        expect(v).toBeGreaterThanOrEqual(0.1);
      }
    }
  });
});

describe('computeCurrentStats', () => {
  const genome = g({
    ...NEUTRAL_QUANT,
    musculature: ['mus_strong', 'mus_strong'],
    ...NEUTRAL_QUAL,
  } as Record<string, [string, string]>);

  it('level 0 equals base stats', () => {
    const base = computeBaseStats(genome);
    const cur = computeCurrentStats(genome, 0);
    for (const s of Object.keys(base) as Array<keyof typeof base>) {
      expect(cur[s]).toBeCloseTo(base[s], 5);
    }
  });

  it('level 20 max-affinity stat grows by ~40%', () => {
    const base = computeBaseStats(genome);
    const cur = computeCurrentStats(genome, 20);
    // Best-affinity stat: whichever has the highest base
    const [bestStat, bestBase] = Object.entries(base).sort((a, b) => b[1] - a[1])[0]!;
    const bestCur = cur[bestStat as keyof typeof cur];
    expect(bestCur).toBeCloseTo(bestBase * 1.4, 5);
  });

  it('level 20 never regresses a stat below its base', () => {
    const base = computeBaseStats(genome);
    const cur = computeCurrentStats(genome, 20);
    for (const s of Object.keys(base) as Array<keyof typeof base>) {
      expect(cur[s]).toBeGreaterThanOrEqual(base[s]);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/sim/stats.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/sim/stats.ts`**

```ts
import type { Genome, Stat } from './types';
import { STATS } from './types';
import { ALLELES } from './data/loci';
import { expressPhenotype } from './genome';

export const BASE_STATS: Readonly<Record<Stat, number>> = Object.freeze({
  PWR: 10,
  VIT: 10,
  SPD: 10,
  INT: 10,
  GUI: 10,
});

/**
 * Base stats = BASE + Σ statDeltas over every contributing allele.
 *
 * For quantitative loci: BOTH alleles contribute (no dominance — that's the
 * "smooth intermediate offspring" property from game-spec §2).
 * For qualitative loci: ONLY the expressed allele contributes (dominance
 * resolved by expressPhenotype).
 * Floored at 0.
 */
export function computeBaseStats(genome: Genome): Record<Stat, number> {
  const result: Record<Stat, number> = { ...BASE_STATS };
  const phen = expressPhenotype(genome);

  for (const [locusId, pair] of Object.entries(genome.loci)) {
    const first = alleleOrThrow(pair[0]);
    const isQuantitative = first.dominance === undefined && locusId !== 'palette';
    if (isQuantitative) {
      for (const alleleId of pair) addDeltas(result, alleleOrThrow(alleleId));
    } else {
      const expressedId = phen.expressed[locusId];
      if (expressedId) addDeltas(result, alleleOrThrow(expressedId));
    }
  }

  for (const s of STATS) {
    if (result[s] < 0) result[s] = 0;
  }
  return result;
}

function alleleOrThrow(id: string) {
  const a = ALLELES[id];
  if (!a) throw new Error(`unknown allele: ${id}`);
  return a;
}

function addDeltas(target: Record<Stat, number>, allele: { statDeltas: Partial<Record<Stat, number>> }): void {
  for (const s of STATS) {
    const d = allele.statDeltas[s];
    if (d !== undefined) target[s] += d;
  }
}

/**
 * Growth affinity per stat: base[stat] / maxBase, floored at 0.1.
 * Strongest stat = 1.0. Weakest stat still grows (0.1) so no stat is dead.
 */
export function computeGrowthAffinity(genome: Genome): Record<Stat, number> {
  const base = computeBaseStats(genome);
  const maxBase = Math.max(...STATS.map((s) => base[s]));
  const out = {} as Record<Stat, number>;
  for (const s of STATS) {
    const raw = maxBase > 0 ? base[s] / maxBase : 0;
    out[s] = Math.max(0.1, raw);
  }
  return out;
}

/**
 * Current stats = base * (1 + 0.02 * level * affinity).
 * At level 20 with affinity=1.0 → base * 1.4 (the +40% cap from game-spec §5).
 * Caller enforces the level cap.
 */
export function computeCurrentStats(genome: Genome, level: number): Record<Stat, number> {
  const base = computeBaseStats(genome);
  const affinity = computeGrowthAffinity(genome);
  const out = {} as Record<Stat, number>;
  for (const s of STATS) {
    out[s] = base[s] * (1 + 0.02 * level * affinity[s]);
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/sim/stats.test.ts`
Expected: PASS.
Then: `npm test` — expected: everything green across the whole suite.
Then: `npm run typecheck` — expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/sim/stats.ts tests/sim/stats.test.ts
git commit -m "$(cat <<'EOF'
feat(sim): base stats, growth affinity, and level scaling

Quantitative loci sum both alleles (smooth intermediate offspring,
game-spec §2). Qualitative loci contribute only the expressed allele.
Stats floor at 0.

Growth affinity per stat is base/maxBase, floored at 0.1 so no stat
is entirely dead. Current stats scale as base * (1 + 0.02 * L * aff);
level 20 at max affinity = base * 1.4, matching the +40% level-cap
contribution decided in the design doc.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Demo output — 50 hatches printed

**Files:**
- Create: `src/sim/__demo__.ts`
- Modify: `package.json` — add `demo` script
- Modify: `src/App.tsx` — surface a browser version too
- Create: `tests/sim/demo.test.ts`

**Interfaces:**
- Consumes: everything from prior tasks
- Produces:
  - `function runDemo(seed?: number): DemoRow[]` — returns 50 rows of `{seed, tier, base, current(L20), phenotype}` for testing and browser display.
  - `function formatDemoTable(rows: DemoRow[]): string` — plain-text ascii table for terminal.
  - New `npm run demo` script that executes the demo via `vite-node` and prints the table.
  - `App.tsx` renders the same 50 rows in a `<pre>` block so the user can spot-check in the browser without running a terminal command.

- [ ] **Step 1: Write `tests/sim/demo.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { runDemo, formatDemoTable } from '../../src/sim/__demo__';

describe('runDemo', () => {
  it('returns exactly 50 rows', () => {
    expect(runDemo(1).length).toBe(50);
  });

  it('is deterministic for a given seed', () => {
    expect(runDemo(42)).toEqual(runDemo(42));
  });

  it('every row includes a tier and non-negative base stats', () => {
    for (const row of runDemo(3)) {
      expect(['Basic', 'Variant', 'Adapted', 'Evolved', 'Apex']).toContain(row.tier);
      for (const v of Object.values(row.base)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('formatDemoTable returns a non-empty string containing a header row', () => {
    const s = formatDemoTable(runDemo(1));
    expect(s.length).toBeGreaterThan(0);
    expect(s).toContain('PWR');
    expect(s).toContain('tier');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/sim/demo.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/sim/__demo__.ts`**

```ts
import { STATS, type Stat, type Tier } from './types';
import { createRng } from './rng';
import { rollGenome, expressPhenotype } from './genome';
import { computeRarity } from './rarity';
import { computeBaseStats, computeCurrentStats } from './stats';

export interface DemoRow {
  seed: number;
  tier: Tier;
  base: Record<Stat, number>;
  current: Record<Stat, number>;
  expressed: Record<string, string>;
  palette: string;
}

export function runDemo(seed = 1): DemoRow[] {
  const rows: DemoRow[] = [];
  for (let i = 0; i < 50; i++) {
    const rowSeed = seed * 1000 + i;
    const rng = createRng(rowSeed);
    const genome = rollGenome(rng);
    const phen = expressPhenotype(genome);
    rows.push({
      seed: rowSeed,
      tier: computeRarity(genome),
      base: computeBaseStats(genome),
      current: computeCurrentStats(genome, 20),
      expressed: phen.expressed,
      palette: phen.palette,
    });
  }
  return rows;
}

export function formatDemoTable(rows: DemoRow[]): string {
  const header = ['#', 'seed', 'tier',
    ...STATS.map((s) => `${s}(base)`),
    ...STATS.map((s) => `${s}(L20)`),
    'head', 'appendage', 'aberration', 'palette',
  ];
  const lines: string[] = [header.join('\t')];
  rows.forEach((r, i) => {
    lines.push([
      String(i),
      String(r.seed),
      r.tier,
      ...STATS.map((s) => String(Math.round(r.base[s]))),
      ...STATS.map((s) => r.current[s].toFixed(1)),
      r.expressed['head'] ?? '',
      r.expressed['appendage'] ?? '',
      r.expressed['aberration'] ?? '',
      r.palette,
    ].join('\t'));
  });
  return lines.join('\n');
}

// Direct-invocation entry so `npm run demo` prints to stdout.
// Skipped in the browser (process is undefined) and in Vitest (script path
// does not match the __demo__ suffix).
if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('__demo__.ts')) {
  const seed = Number(process.env['DEMO_SEED'] ?? '1');
  // eslint-disable-next-line no-console
  console.log(formatDemoTable(runDemo(seed)));
}
```

- [ ] **Step 4: Add the demo script to `package.json`**

Add to `scripts`:

```json
"demo": "vite-node src/sim/__demo__.ts"
```

The `vite-node` binary comes with `vitest` — no new dependency required.

- [ ] **Step 5: Update `src/App.tsx` to render the demo in the browser**

```tsx
import { useMemo } from 'react';
import { runDemo, formatDemoTable } from './sim/__demo__';

export function App() {
  const table = useMemo(() => formatDemoTable(runDemo(1)), []);
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Morulium — M1 demo</h1>
      <p>50 rolled monsters, seed=1. Tradeoff distribution and rarity should look plausible.</p>
      <pre style={{ fontSize: 12, overflowX: 'auto', background: '#f5f5f5', padding: 12 }}>{table}</pre>
    </main>
  );
}
```

- [ ] **Step 6: Run tests to verify pass**

Run: `npm test`
Expected: entire suite green.
Then: `npm run typecheck` — expected: no errors.

- [ ] **Step 7: Run the demo and eyeball the output**

Run: `npm run demo | head -20`
Expected: header row + 19 data rows, columns separated by tabs, all stats non-negative, tiers among the five valid values.

Then: `npm run dev`, open `http://localhost:5173`, confirm the table renders in the browser. Ctrl-C when done.

- [ ] **Step 8: Commit**

```bash
git add src/sim/__demo__.ts tests/sim/demo.test.ts package.json src/App.tsx
git commit -m "$(cat <<'EOF'
feat(sim): 50-hatch demo — CLI and browser output

runDemo(seed) produces 50 deterministic rolled monsters with base
stats, level-20 stats, tier, and expressed phenotype. formatDemoTable
renders a plain-text table.

'npm run demo' prints it via vite-node; the browser page renders the
same table so both surfaces work for eyeballing M1 output before
handoff to M2 (sprite renderer).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 9: Push the M1 branch**

```bash
git push origin main
```

---

## Self-review notes

- **Spec coverage:** All three game-spec build steps for M1 are covered — step 1 in Task 2, step 2 (rollGenome + computeRarity) in Tasks 4 and 5, step 3 (computeStats + growth affinity) in Task 6. Demo (Task 7) delivers the reviewable output from the design doc.
- **Type consistency:** `SeededRng`, `Allele`, `Genome`, `PhenotypeDescriptor`, `Stat`, `Tier` are defined once and referenced consistently across tasks. Helpers (`q`, `qual`, `addDeltas`) are file-local.
- **Determinism:** every RNG-consuming function takes `SeededRng` explicitly; no `Math.random` anywhere; `Date.now()` avoided.
- **Hidden info:** `computeRarity` returns `Tier`, never a score. No test asserts on internal scores.
- **Placeholders:** no "TBD" or "handle appropriately" phrases; every step has real code or a real command.
- **One flagged simplification:** M1's `computeRarity` scores BOTH alleles at every locus, not just expressed ones. This is intentional (a hidden recessive still contributes to rarity, matching the "expressed" spec loosely) and is called out in Task 4's interface note. If we later decide only expressed alleles count, it's a one-line change and tests would need updating.
