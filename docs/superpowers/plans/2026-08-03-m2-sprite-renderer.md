# M2 Sprite Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship M2 — turn every rolled genome into a procedural biotech-specimen SVG sprite, and replace the M1 demo table on morulium.com with a Gallery of 50 sprite cards.

**Architecture:** Pure functional pipeline `PhenotypeDescriptor → renderSprite → SVG React element`. All ~30 qualitative alleles get a pre-authored SVG path in `src/render/paths/<slot>/<allele>.ts`; the sprite composes them by looking each up in a central registry and drawing at fixed zone anchors (head/carapace/appendage/locomotion, plus eyes/hide_pattern/aberration overlays). Gallery page + SpecimenCard components live in `src/ui/`. Testing = SVG snapshots for 5 tier archetypes + registry completeness + gallery smoke.

**Tech Stack:** No new runtime deps. Adds `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` (dev-only) for React component tests.

**Source spec:** `docs/superpowers/specs/2026-08-03-m2-sprite-renderer-design.md`.

## Global Constraints

- **Branch:** create and use `m2-sprite-renderer` from `main`. Do NOT commit to main directly.
- **TS strict:** `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any` in `src/render/*` or `src/ui/*`.
- **`src/render/*` and `src/ui/*` are pure** — no `Math.random`, no `Date.now()`, no side effects at module load. Same discipline as `src/sim/*`.
- **Deterministic rendering:** same `(phenotype, palette)` ⇒ same SVG output. No hover/interactive state in M2, no animation.
- **Sprite viewBox is `200 × 280`** (locked). All part paths authored assuming this coordinate space.
- **Bilateral symmetry** for every part path (mirror-symmetric across x=100) unless the allele's design specifically calls for asymmetry (e.g., `head_folded` slightly asymmetric folding is fine).
- **Anchor points (locked):** head at `(100, 70)` (bottom-center), carapace at `(100, 105)` (center), appendage at `(100, 140)` (hip line, top of appendage zone), locomotion at `(100, 175)` (top of legs zone). Eyes anchor at `(100, 40)` (upper head). Hide-pattern applies within the carapace zone (no separate anchor — it's a texture overlay). Aberration overlays span the full viewBox.
- **Layer draw order (bottom→top):** locomotion → carapace → appendage → head → eyes → aberration.
- **Palette usage:** each part path receives `{ base, dark, light, accent }` from `resolvePalette(paletteAlleleId)`. Body silhouette uses `base` (mid-tone), part-slot regions use `dark`, small accents (eye glints, aberration sparks, teeth highlights) use `light` or `accent`. Two-to-three colors per sprite is the aesthetic; do NOT use gradients or full 4-color painterly shading.
- **No `ability` field yet** anywhere in art (that's an M4+ ability system concern).
- **Vitest imports:** `import { describe, it, expect } from 'vitest'`. React component tests get `// @vitest-environment jsdom` at the top of the file.
- **Commits:** Conventional Commits + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` on every commit.

---

### Task 1: Scaffold — .gitignore, test env, and render/UI plumbing

**Files:**
- Modify: `.gitignore` — add `.superpowers/` (project-hygiene hardening from prior review)
- Modify: `package.json` — add dev deps `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- Create: `src/render/layout.ts` — viewBox constant, zone anchor points, layer draw order
- Create: `src/render/colors.ts` — `resolvePalette(alleleId): PaletteColors` helper
- Create: `src/render/paths/registry.ts` — empty `PATHS` object + `PathFn` type
- Create: `src/render/sprite.tsx` — `<Sprite phenotype palette>` React component with missing-art fallback
- Create: `tests/render/layout.test.ts` — asserts constants
- Create: `tests/render/colors.test.ts` — asserts palette resolution

**Interfaces produced:**
- `SPRITE_VIEWBOX = { width: 200, height: 280 }` and matching viewBox string constant `'0 0 200 280'`
- `ANCHORS = { head: { x: 100, y: 70 }, carapace: { x: 100, y: 105 }, appendage: { x: 100, y: 140 }, locomotion: { x: 100, y: 175 }, eyes: { x: 100, y: 40 } }` (all readonly)
- `LAYER_ORDER = ['locomotion', 'carapace', 'appendage', 'head', 'eyes', 'aberration'] as const`
- `type PaletteColors = { base: string; dark: string; light: string; accent: string }`
- `resolvePalette(paletteAlleleId: string): PaletteColors` — reads `PALETTES` (already exists in `src/sim/data/palettes.ts`), maps ramp[0..3] to `{ base: ramp[2], dark: ramp[1], light: ramp[3], accent: ramp[0] }` (mid-tone body from ramp[2], darker shading from ramp[1], highlights from ramp[3], darkest deep contrast from ramp[0])
- `type PathFn = (colors: PaletteColors) => ReactNode`
- `PATHS: Readonly<Record<string, PathFn>>` — empty in Task 1, populated in Tasks 2–5
- `<Sprite phenotype={...} palette={...} />` — composes SVG by iterating LAYER_ORDER and looking up each expressed allele in PATHS; missing-art fallback renders a `<text>?</text>` at the missing zone

**Global constraints for this task:**
- Do NOT author any allele SVG paths (Tasks 2–5)
- Do NOT create Gallery, SpecimenCard, TierBadge (Task 6)
- vitest.config.ts stays with `environment: 'node'` default — React tests use per-file `@vitest-environment jsdom`

- [ ] **Step 1: Add `.superpowers/` to `.gitignore`**

Append one line to `.gitignore`:

```
.superpowers/
```

- [ ] **Step 2: Add React testing deps**

Run: `npm install --save-dev @testing-library/react @testing-library/jest-dom jsdom`

Confirm `package.json` now lists them in `devDependencies`.

- [ ] **Step 3: Create `src/render/layout.ts`**

```ts
export const SPRITE_VIEWBOX = { width: 200, height: 280 } as const;
export const SPRITE_VIEWBOX_STRING = `0 0 ${SPRITE_VIEWBOX.width} ${SPRITE_VIEWBOX.height}`;

export type Point = Readonly<{ x: number; y: number }>;

export const ANCHORS: Readonly<Record<'head' | 'carapace' | 'appendage' | 'locomotion' | 'eyes', Point>> = {
  head:       { x: 100, y: 70 },
  carapace:   { x: 100, y: 105 },
  appendage:  { x: 100, y: 140 },
  locomotion: { x: 100, y: 175 },
  eyes:       { x: 100, y: 40 },
};

// Draw order (bottom of stack to top). hide_pattern draws inside carapace's own
// path composition (as a texture overlay on the torso), so it doesn't get its
// own layer position.
export const LAYER_ORDER = [
  'locomotion',
  'carapace',
  'appendage',
  'head',
  'eyes',
  'aberration',
] as const;

export type Layer = (typeof LAYER_ORDER)[number];
```

- [ ] **Step 4: Create `src/render/colors.ts`**

```ts
import { PALETTES } from '../sim/data/palettes';

export type PaletteColors = {
  readonly base: string;    // mid-tone body silhouette
  readonly dark: string;    // darker shading for part regions
  readonly light: string;   // small highlights
  readonly accent: string;  // deepest contrast / detail
};

/**
 * Map a palette allele id to the 4-color sprite palette.
 * Palette ramp convention: ramp[0]=darkest, ramp[1]=dark, ramp[2]=mid, ramp[3]=light.
 * We remap for sprite purposes: base=mid, dark=dark, light=light, accent=darkest.
 */
export function resolvePalette(paletteAlleleId: string): PaletteColors {
  const p = PALETTES[paletteAlleleId];
  if (!p) throw new Error(`unknown palette: ${paletteAlleleId}`);
  return {
    base:   p.ramp[2]!,
    dark:   p.ramp[1]!,
    light:  p.ramp[3]!,
    accent: p.ramp[0]!,
  };
}
```

- [ ] **Step 5: Create `src/render/paths/registry.ts`**

```ts
import type { ReactNode } from 'react';
import type { PaletteColors } from '../colors';

/**
 * A PathFn draws one allele's contribution to the sprite as a React SVG node.
 * The function receives the resolved palette colors and returns a <g>/<path>/etc.
 * positioned assuming the sprite viewBox is 0 0 200 280 and using the anchor
 * for its slot from src/render/layout.ts.
 */
export type PathFn = (colors: PaletteColors) => ReactNode;

/**
 * The lookup table: allele id → its PathFn.
 * Populated by Tasks 2-5. Empty in Task 1 — the Sprite component's missing-art
 * fallback renders a "?" placeholder for any unregistered allele.
 */
export const PATHS: Readonly<Record<string, PathFn>> = Object.freeze({});
```

- [ ] **Step 6: Create `src/render/sprite.tsx`**

```tsx
import type { ReactElement, ReactNode } from 'react';
import { LAYER_ORDER, SPRITE_VIEWBOX_STRING, ANCHORS, type Layer } from './layout';
import { resolvePalette } from './colors';
import { PATHS } from './paths/registry';

interface SpriteProps {
  readonly phenotype: Readonly<Record<string, string>>;
  readonly palette: string;
}

/**
 * Compose an SVG sprite from a phenotype. Iterates layers in draw order.
 * For hide_pattern, the pattern is passed to the carapace layer implicitly
 * via the phenotype map — carapace path fns may read phenotype.hide_pattern
 * if they want to overlay a pattern. For simplicity in Task 1's stub, we
 * only look up alleles for the layers in LAYER_ORDER.
 */
export function Sprite({ phenotype, palette }: SpriteProps): ReactElement {
  const colors = resolvePalette(palette);
  const layers: ReactNode[] = [];

  for (const layer of LAYER_ORDER) {
    const alleleId = phenotype[layer];
    if (!alleleId) continue; // no phenotype entry for this layer — skip
    const draw = PATHS[alleleId];
    if (!draw) {
      layers.push(<MissingArt key={layer} layer={layer} />);
      if (typeof console !== 'undefined') {
        console.warn(`[Sprite] missing PathFn for allele "${alleleId}" (layer ${layer})`);
      }
      continue;
    }
    layers.push(<g key={layer} data-layer={layer}>{draw(colors)}</g>);
  }

  return (
    <svg viewBox={SPRITE_VIEWBOX_STRING} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {layers}
    </svg>
  );
}

function MissingArt({ layer }: { readonly layer: Layer }): ReactElement {
  const anchor = layer === 'aberration' ? { x: 100, y: 140 } : ANCHORS[layer as keyof typeof ANCHORS];
  return (
    <text x={anchor.x} y={anchor.y} textAnchor="middle" fill="#999" fontSize="24" data-testid="missing-art">
      ?
    </text>
  );
}
```

- [ ] **Step 7: Write layout + colors tests**

Create `tests/render/layout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SPRITE_VIEWBOX, SPRITE_VIEWBOX_STRING, ANCHORS, LAYER_ORDER } from '../../src/render/layout';

describe('sprite layout constants', () => {
  it('viewBox is 200 x 280', () => {
    expect(SPRITE_VIEWBOX.width).toBe(200);
    expect(SPRITE_VIEWBOX.height).toBe(280);
    expect(SPRITE_VIEWBOX_STRING).toBe('0 0 200 280');
  });

  it('anchors are x=100 (centered)', () => {
    for (const a of Object.values(ANCHORS)) {
      expect(a.x).toBe(100);
    }
  });

  it('layer order matches spec (bottom→top: loco→carapace→appendage→head→eyes→aberration)', () => {
    expect([...LAYER_ORDER]).toEqual([
      'locomotion', 'carapace', 'appendage', 'head', 'eyes', 'aberration',
    ]);
  });
});
```

Create `tests/render/colors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolvePalette } from '../../src/render/colors';

describe('resolvePalette', () => {
  it('returns 4 colors for a known palette', () => {
    const c = resolvePalette('pal_ash');
    expect(c.base).toMatch(/^#[0-9a-f]{6}$/i);
    expect(c.dark).toMatch(/^#[0-9a-f]{6}$/i);
    expect(c.light).toMatch(/^#[0-9a-f]{6}$/i);
    expect(c.accent).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('throws on unknown palette id', () => {
    expect(() => resolvePalette('pal_nope')).toThrow(/unknown palette/);
  });
});
```

- [ ] **Step 8: Run tests + typecheck**

Run: `npm test`
Expected: 64 previous + 5 new tests (3 layout + 2 colors) = 69 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add .gitignore package.json package-lock.json src/render/ tests/render/
git commit -m "$(cat <<'EOF'
feat(render): M2 scaffold — layout, colors, empty PATHS registry, Sprite component

Adds the pure-functional rendering plumbing for the sprite renderer:
- src/render/layout.ts: viewBox 200x280, zone anchor points, layer order
- src/render/colors.ts: resolvePalette(paletteAlleleId) → 4-color mapping
- src/render/paths/registry.ts: empty PATHS lookup table + PathFn type
- src/render/sprite.tsx: <Sprite> composes layers via registry lookup,
  falls back to a "?" placeholder + console.warn when a PathFn is missing

Dev deps added: @testing-library/react, @testing-library/jest-dom,
jsdom (for future React component tests; sim tests keep node env).

.gitignore hardened: .superpowers/ now ignored so SDD scratch never
accidentally lands in a commit.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Head + eyes slot art (9 allele paths)

**Files:**
- Create: `src/render/paths/head/head_plain.ts`
- Create: `src/render/paths/head/head_maw.ts`
- Create: `src/render/paths/head/head_sensor.ts`
- Create: `src/render/paths/head/head_mandible.ts`
- Create: `src/render/paths/head/head_folded.ts`
- Create: `src/render/paths/eyes/eyes_plain.ts`
- Create: `src/render/paths/eyes/eyes_bright.ts`
- Create: `src/render/paths/eyes/eyes_multi.ts`
- Create: `src/render/paths/eyes/eyes_singular.ts`
- Modify: `src/render/paths/registry.ts` — register all 9 PathFns

**Interfaces produced:**
- 9 default-exported `PathFn`s per the allele-specific visual intent below
- `PATHS` registry now contains 9 entries (was 0)

**Global constraints for this task:**
- All head paths anchor at `(100, 70)` — that's the bottom-center of the head where it meets the neck. Head drawings extend UPWARD from that point (roughly y=10 to y=70), stay within x=60..140 for silhouette width.
- All eyes paths anchor at `(100, 40)` — upper head. Eyes draw ONTOP OF the head (they render AFTER head in LAYER_ORDER). Stay within x=75..125 for the eye zone.
- Bilateral symmetry required across x=100.
- 2–3 colors per allele (base body, dark shading, light/accent).
- No hover states, no animation, no interactive attributes.

**Visual intent per allele (biotech-specimen aesthetic, standing-bipedal creature):**

- `head_plain` (baseline, dominant, w0, `{PWR: 1}`) — a rounded, unremarkable head. Smooth dome shape ~40px wide, no distinctive features. Ambiguous jawline. This is the "wild-type" head.
- `head_maw` (dominant, w3, `{PWR: 3}`, ability "Rend") — wide, aggressive jaw. Broad lower head with visible tooth/fang line at the mouth. Weighty, bulldog-like.
- `head_sensor` (dominant, w3, `{INT: 3}`, ability "Recon") — a cluster of 3–5 vertical sensor-antenna spikes at the top of the head. Head itself narrower than plain. Reads as "instrument."
- `head_mandible` (dominant, w1, `{PWR: 1}`, ability "Grip") — smaller than plain head, with two lateral mandible extensions curving forward from the sides of the jaw. Insectoid but restrained.
- `head_folded` (recessive, w1, `{GUI: 1}`) — head partially retracted/folded into carapace. Only the top curve is visible above the neckline. Hidden, cautious.
- `eyes_plain` (baseline) — two small circular eye-dots, symmetric. Simple flat circles in `accent`, no glow.
- `eyes_bright` (w1, dominant) — same two-eye layout as plain but larger and with a bright light-color highlight (small dot inside each eye).
- `eyes_multi` (w3, dominant) — 4 or 6 small compound-eye dots in a small cluster on each side of the face (mirror-symmetric). Insectoid multi-facet.
- `eyes_singular` (w3, recessive) — a single large central eye (cyclops-like), positioned at (100, 40). Roughly 20px diameter, prominent pupil, `light` highlight.

- [ ] **Step 1: Author `head_plain`**

Create `src/render/paths/head/head_plain.ts`:

```ts
import type { PathFn } from '../registry';

/**
 * head_plain — rounded, unremarkable dome. Baseline "wild-type" head.
 * Bilateral symmetric across x=100. Anchor: bottom-center at (100, 70).
 * Draws roughly y=15..70, x=70..130.
 */
const path: PathFn = (c) => (
  <>
    {/* main dome, filled base color */}
    <path
      d="M 70 70 Q 70 20 100 15 Q 130 20 130 70 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* subtle shading arc for depth */}
    <path
      d="M 78 68 Q 78 30 100 25 Q 122 30 122 68"
      fill="none"
      stroke={c.dark}
      strokeWidth="1"
      opacity="0.4"
    />
  </>
);

export default path;
```

- [ ] **Step 2: Author `head_maw`**

```ts
import type { PathFn } from '../registry';

/**
 * head_maw — wide, jaw-heavy head with visible teeth. Aggressive.
 * Wider at bottom (jaw), narrower at top.
 */
const path: PathFn = (c) => (
  <>
    {/* head silhouette: wide bulldog jaw */}
    <path
      d="M 60 70 L 68 32 Q 100 15 132 32 L 140 70 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* mouth line + teeth (accent highlights) */}
    <path
      d="M 65 62 L 135 62"
      stroke={c.accent}
      strokeWidth="2"
    />
    <path
      d="M 75 62 L 75 68 M 85 62 L 85 70 M 100 62 L 100 71 M 115 62 L 115 70 M 125 62 L 125 68"
      stroke={c.light}
      strokeWidth="1.2"
    />
  </>
);

export default path;
```

- [ ] **Step 3: Author `head_sensor`**

```ts
import type { PathFn } from '../registry';

/**
 * head_sensor — narrow head with 5 vertical sensor spikes at the crown.
 * Instrument-like, precise.
 */
const path: PathFn = (c) => (
  <>
    {/* narrower dome */}
    <path
      d="M 80 70 Q 80 30 100 22 Q 120 30 120 70 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* 5 vertical sensor spikes */}
    <path
      d="M 88 25 L 88 10 M 94 22 L 94 8 M 100 20 L 100 5 M 106 22 L 106 8 M 112 25 L 112 10"
      stroke={c.accent}
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* spike tips (small dots in light color) */}
    <circle cx="88" cy="10" r="1.8" fill={c.light} />
    <circle cx="94" cy="8"  r="1.8" fill={c.light} />
    <circle cx="100" cy="5" r="2.2" fill={c.light} />
    <circle cx="106" cy="8" r="1.8" fill={c.light} />
    <circle cx="112" cy="10" r="1.8" fill={c.light} />
  </>
);

export default path;
```

- [ ] **Step 4: Author `head_mandible`**

```ts
import type { PathFn } from '../registry';

/**
 * head_mandible — smaller head with lateral curving mandibles. Insectoid.
 */
const path: PathFn = (c) => (
  <>
    {/* smaller central head */}
    <path
      d="M 82 68 Q 82 32 100 25 Q 118 32 118 68 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* left mandible curving forward */}
    <path
      d="M 82 55 Q 65 65 60 78 Q 65 72 75 68"
      fill={c.dark}
      stroke={c.accent}
      strokeWidth="1.2"
    />
    {/* right mandible mirrored */}
    <path
      d="M 118 55 Q 135 65 140 78 Q 135 72 125 68"
      fill={c.dark}
      stroke={c.accent}
      strokeWidth="1.2"
    />
  </>
);

export default path;
```

- [ ] **Step 5: Author `head_folded`**

```ts
import type { PathFn } from '../registry';

/**
 * head_folded — head partially retracted into carapace. Only the crown shows.
 * Recessive baseline of the "hidden" head phenotype.
 */
const path: PathFn = (c) => (
  <>
    {/* only the top arc is visible */}
    <path
      d="M 75 70 Q 78 55 100 50 Q 122 55 125 70 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* fold seams — subtle horizontal lines */}
    <path
      d="M 80 62 L 120 62 M 85 58 L 115 58"
      stroke={c.dark}
      strokeWidth="0.8"
      opacity="0.5"
    />
  </>
);

export default path;
```

- [ ] **Step 6: Author `eyes_plain`**

```ts
import type { PathFn } from '../registry';

/**
 * eyes_plain — two small circular eyes. Baseline.
 * Renders on top of head. Anchor at (100, 40).
 */
const path: PathFn = (c) => (
  <>
    <circle cx="90"  cy="40" r="3" fill={c.accent} />
    <circle cx="110" cy="40" r="3" fill={c.accent} />
  </>
);

export default path;
```

- [ ] **Step 7: Author `eyes_bright`**

```ts
import type { PathFn } from '../registry';

/**
 * eyes_bright — larger eyes with light highlights. INT-leaning variant.
 */
const path: PathFn = (c) => (
  <>
    <circle cx="90"  cy="40" r="4.5" fill={c.accent} />
    <circle cx="110" cy="40" r="4.5" fill={c.accent} />
    <circle cx="91"  cy="39" r="1.5" fill={c.light} />
    <circle cx="111" cy="39" r="1.5" fill={c.light} />
  </>
);

export default path;
```

- [ ] **Step 8: Author `eyes_multi`**

```ts
import type { PathFn } from '../registry';

/**
 * eyes_multi — compound eyes. 5 small dots clustered on each side.
 */
const path: PathFn = (c) => (
  <>
    {/* left cluster (5 dots) */}
    <circle cx="86" cy="38" r="1.6" fill={c.accent} />
    <circle cx="91" cy="37" r="1.6" fill={c.accent} />
    <circle cx="88" cy="42" r="1.6" fill={c.accent} />
    <circle cx="93" cy="41" r="1.6" fill={c.accent} />
    <circle cx="89" cy="45" r="1.6" fill={c.accent} />
    {/* right cluster mirrored */}
    <circle cx="114" cy="38" r="1.6" fill={c.accent} />
    <circle cx="109" cy="37" r="1.6" fill={c.accent} />
    <circle cx="112" cy="42" r="1.6" fill={c.accent} />
    <circle cx="107" cy="41" r="1.6" fill={c.accent} />
    <circle cx="111" cy="45" r="1.6" fill={c.accent} />
  </>
);

export default path;
```

- [ ] **Step 9: Author `eyes_singular`**

```ts
import type { PathFn } from '../registry';

/**
 * eyes_singular — single large central cyclops eye. Rare recessive.
 */
const path: PathFn = (c) => (
  <>
    <circle cx="100" cy="40" r="10" fill={c.accent} stroke={c.dark} strokeWidth="1" />
    <circle cx="100" cy="40" r="5"  fill={c.dark} />
    <circle cx="100" cy="40" r="2.5" fill={c.light} />
  </>
);

export default path;
```

- [ ] **Step 10: Update `src/render/paths/registry.ts` to register all 9**

```ts
import type { ReactNode } from 'react';
import type { PaletteColors } from '../colors';

// head
import head_plain from './head/head_plain';
import head_maw from './head/head_maw';
import head_sensor from './head/head_sensor';
import head_mandible from './head/head_mandible';
import head_folded from './head/head_folded';

// eyes
import eyes_plain from './eyes/eyes_plain';
import eyes_bright from './eyes/eyes_bright';
import eyes_multi from './eyes/eyes_multi';
import eyes_singular from './eyes/eyes_singular';

export type PathFn = (colors: PaletteColors) => ReactNode;

export const PATHS: Readonly<Record<string, PathFn>> = Object.freeze({
  head_plain,
  head_maw,
  head_sensor,
  head_mandible,
  head_folded,
  eyes_plain,
  eyes_bright,
  eyes_multi,
  eyes_singular,
});
```

- [ ] **Step 11: Run tests + typecheck**

Run: `npm test`
Expected: 69 green, no new failures.

Run: `npm run typecheck`
Expected: clean.

The registry-completeness test doesn't exist yet (that lands in the final art task) — head/eyes coverage is verified implicitly by the fact that Sprite doesn't fall through to MissingArt for these ids.

- [ ] **Step 12: Commit**

```bash
git add src/render/paths/head/ src/render/paths/eyes/ src/render/paths/registry.ts
git commit -m "$(cat <<'EOF'
feat(render): head + eyes SVG paths (9 alleles)

Adds visual paths for the 5 head alleles (plain/maw/sensor/mandible/
folded) and 4 eye alleles (plain/bright/multi/singular). Biotech-
specimen aesthetic: bilateral symmetric, 2-3 palette colors,
minimalist flat vector.

Head alleles anchor at (100, 70); eyes overlay at (100, 40) and
render after head so they sit on top.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Carapace + hide_pattern slot art (8 allele paths)

**Files:**
- Create: `src/render/paths/carapace/cara_bare.ts`, `cara_chitin.ts`, `cara_bone.ts`, `cara_hide.ts`
- Create: `src/render/paths/hide_pattern/hide_plain.ts`, `hide_spotted.ts`, `hide_striped.ts`, `hide_luminescent.ts`
- Modify: `src/render/paths/registry.ts` — register the 8 new PathFns
- Modify: `src/render/sprite.tsx` — add hide_pattern render pass immediately after the carapace layer

**Interfaces produced:**
- 8 default-exported `PathFn`s
- `PATHS` registry now contains 17 entries (was 9)

**Global constraints for this task:**
- Carapace paths anchor at `(100, 105)` — center of the torso zone. Extend roughly y=70..140 (the carapace zone), x=65..135 for silhouette width. Include arms/shoulders if the design calls for them.
- Hide-pattern paths draw INSIDE the carapace shape as texture. They anchor conceptually at `(100, 105)` too but should stay within the visible carapace silhouette (no clipping enforced — just author within reason).
- Since hide_pattern is a separate layer name in `phenotype` but NOT in LAYER_ORDER, we need to update `sprite.tsx` slightly to render hide_pattern immediately after carapace. Add this in the same task.
- Bilateral symmetric, 2–3 palette colors.

**Visual intent per allele:**

- `cara_bare` (baseline) — smooth, unarmored torso. Simple rounded rectangle-ish body. VIT+1.
- `cara_chitin` (w1, dominant, `{VIT: 1}`) — visible segmented chitinous plating. Horizontal segment lines across the torso.
- `cara_bone` (w3, dominant, `{VIT: 3, SPD: -1}`, ability "Bulwark") — bulky bone plates. Angular shoulder-armor silhouette. Heavy.
- `cara_hide` (w1, recessive, `{VIT: 1, SPD: 1}`) — hide with subtle bumpy texture. Rounded, animalistic.
- `hide_plain` (baseline) — no visible pattern. Empty render (renders nothing).
- `hide_spotted` (w1, dominant, `{SPD: 1}`) — a few small dark spots scattered on the torso.
- `hide_striped` (w3, dominant, `{GUI: 1, SPD: 1}`) — 3–4 vertical or diagonal stripe lines across the torso.
- `hide_luminescent` (w3, recessive, `{VIT: -1, PWR: 2}`) — bright glowing dots or a bioluminescent stripe pattern using `light` color.

- [ ] **Step 1: Update `src/render/sprite.tsx` to render hide_pattern after carapace**

The current LAYER_ORDER doesn't include `hide_pattern` because it's a texture overlay on the carapace. Modify the Sprite layer loop to render hide_pattern right after carapace:

Find the `for (const layer of LAYER_ORDER)` loop. After the carapace layer renders, also render the hide_pattern layer using the same lookup mechanism. Adjust:

```tsx
for (const layer of LAYER_ORDER) {
  const alleleId = phenotype[layer];
  if (alleleId) {
    const draw = PATHS[alleleId];
    if (!draw) {
      layers.push(<MissingArt key={layer} layer={layer} />);
      if (typeof console !== 'undefined') {
        console.warn(`[Sprite] missing PathFn for allele "${alleleId}" (layer ${layer})`);
      }
    } else {
      layers.push(<g key={layer} data-layer={layer}>{draw(colors)}</g>);
    }
  }
  // Hide pattern is drawn on top of the carapace layer specifically
  if (layer === 'carapace') {
    const hideId = phenotype['hide_pattern'];
    if (hideId) {
      const draw = PATHS[hideId];
      if (!draw) {
        layers.push(<MissingArt key="hide_pattern" layer={'carapace' as Layer} />);
        if (typeof console !== 'undefined') {
          console.warn(`[Sprite] missing PathFn for hide_pattern allele "${hideId}"`);
        }
      } else {
        layers.push(<g key="hide_pattern" data-layer="hide_pattern">{draw(colors)}</g>);
      }
    }
  }
}
```

- [ ] **Step 2: Author `cara_bare`**

```ts
import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* torso: smooth rounded rectangle */}
    <path
      d="M 68 70 Q 68 60 78 60 L 122 60 Q 132 60 132 70 L 135 130 Q 135 140 125 140 L 75 140 Q 65 140 65 130 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* subtle centerline shading */}
    <path d="M 100 68 L 100 138" stroke={c.dark} strokeWidth="0.6" opacity="0.3" />
  </>
);

export default path;
```

- [ ] **Step 3: Author `cara_chitin`**

```ts
import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* torso silhouette same shape as bare */}
    <path
      d="M 68 70 Q 68 60 78 60 L 122 60 Q 132 60 132 70 L 135 130 Q 135 140 125 140 L 75 140 Q 65 140 65 130 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* horizontal chitin segment lines */}
    <path d="M 66 85 Q 100 82 134 85" fill="none" stroke={c.dark} strokeWidth="1.2" />
    <path d="M 66 100 Q 100 97 134 100" fill="none" stroke={c.dark} strokeWidth="1.2" />
    <path d="M 66 115 Q 100 112 134 115" fill="none" stroke={c.dark} strokeWidth="1.2" />
    <path d="M 66 130 Q 100 127 134 130" fill="none" stroke={c.dark} strokeWidth="1.2" />
  </>
);

export default path;
```

- [ ] **Step 4: Author `cara_bone`**

```ts
import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* main torso */}
    <path
      d="M 68 70 Q 68 60 78 60 L 122 60 Q 132 60 132 70 L 135 130 Q 135 140 125 140 L 75 140 Q 65 140 65 130 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* bone shoulder pauldrons — angular blocks over the shoulders */}
    <path d="M 55 70 L 68 62 L 78 78 L 65 90 Z" fill={c.dark} stroke={c.accent} strokeWidth="1.2" />
    <path d="M 145 70 L 132 62 L 122 78 L 135 90 Z" fill={c.dark} stroke={c.accent} strokeWidth="1.2" />
    {/* chest bone plate — central ribcage suggestion */}
    <path d="M 88 80 L 112 80 L 108 130 L 92 130 Z" fill={c.dark} opacity="0.7" />
    <path d="M 92 90 L 108 90 M 92 100 L 108 100 M 92 110 L 108 110 M 92 120 L 108 120" stroke={c.accent} strokeWidth="0.8" />
  </>
);

export default path;
```

- [ ] **Step 5: Author `cara_hide`**

```ts
import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* rounder, more organic torso outline */}
    <path
      d="M 65 75 Q 62 60 80 58 Q 100 55 120 58 Q 138 60 135 75 Q 138 120 130 140 Q 100 145 70 140 Q 62 120 65 75 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* subtle bumpy texture — small dark dots scattered */}
    <circle cx="80" cy="85" r="1.5" fill={c.dark} opacity="0.6" />
    <circle cx="95" cy="90" r="1.5" fill={c.dark} opacity="0.6" />
    <circle cx="110" cy="82" r="1.5" fill={c.dark} opacity="0.6" />
    <circle cx="120" cy="98" r="1.5" fill={c.dark} opacity="0.6" />
    <circle cx="82" cy="110" r="1.5" fill={c.dark} opacity="0.6" />
    <circle cx="100" cy="115" r="1.5" fill={c.dark} opacity="0.6" />
    <circle cx="118" cy="120" r="1.5" fill={c.dark} opacity="0.6" />
    <circle cx="90" cy="128" r="1.5" fill={c.dark} opacity="0.6" />
  </>
);

export default path;
```

- [ ] **Step 6: Author `hide_plain`**

```ts
import type { PathFn } from '../registry';

/**
 * hide_plain — baseline: no pattern. Renders nothing.
 * Kept as a registered PathFn so the registry-completeness test passes.
 */
const path: PathFn = () => null;

export default path;
```

- [ ] **Step 7: Author `hide_spotted`**

```ts
import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    <circle cx="85"  cy="95"  r="3" fill={c.dark} opacity="0.7" />
    <circle cx="110" cy="88"  r="4" fill={c.dark} opacity="0.7" />
    <circle cx="95"  cy="115" r="3" fill={c.dark} opacity="0.7" />
    <circle cx="118" cy="120" r="3.5" fill={c.dark} opacity="0.7" />
    <circle cx="80"  cy="125" r="2.5" fill={c.dark} opacity="0.7" />
  </>
);

export default path;
```

- [ ] **Step 8: Author `hide_striped`**

```ts
import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* 4 diagonal stripes across the torso */}
    <path d="M 70 80  L 90 138" stroke={c.dark} strokeWidth="3" opacity="0.6" />
    <path d="M 88 68  L 108 138" stroke={c.dark} strokeWidth="3" opacity="0.6" />
    <path d="M 108 68 L 128 138" stroke={c.dark} strokeWidth="3" opacity="0.6" />
    <path d="M 128 80 L 130 138" stroke={c.dark} strokeWidth="3" opacity="0.6" />
  </>
);

export default path;
```

- [ ] **Step 9: Author `hide_luminescent`**

```ts
import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* bright bioluminescent dots + glow */}
    <circle cx="85"  cy="90"  r="4" fill={c.light} opacity="0.9" />
    <circle cx="115" cy="90"  r="4" fill={c.light} opacity="0.9" />
    <circle cx="100" cy="105" r="5" fill={c.light} opacity="0.9" />
    <circle cx="85"  cy="120" r="4" fill={c.light} opacity="0.9" />
    <circle cx="115" cy="120" r="4" fill={c.light} opacity="0.9" />
    {/* soft glow rings */}
    <circle cx="100" cy="105" r="8" fill="none" stroke={c.light} strokeWidth="0.8" opacity="0.4" />
  </>
);

export default path;
```

- [ ] **Step 10: Update registry with 8 new imports**

Add to `src/render/paths/registry.ts`:

```ts
// carapace
import cara_bare from './carapace/cara_bare';
import cara_chitin from './carapace/cara_chitin';
import cara_bone from './carapace/cara_bone';
import cara_hide from './carapace/cara_hide';

// hide_pattern
import hide_plain from './hide_pattern/hide_plain';
import hide_spotted from './hide_pattern/hide_spotted';
import hide_striped from './hide_pattern/hide_striped';
import hide_luminescent from './hide_pattern/hide_luminescent';
```

And add all 8 to the `PATHS` object.

- [ ] **Step 11: Run tests + typecheck**

Run: `npm test`
Expected: 69 green (no new tests added yet — registry-completeness comes later).

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 12: Commit**

```bash
git add src/render/paths/carapace/ src/render/paths/hide_pattern/ src/render/paths/registry.ts src/render/sprite.tsx
git commit -m "$(cat <<'EOF'
feat(render): carapace + hide_pattern SVG paths (8 alleles) + Sprite renders hide overlay

4 carapace silhouettes (bare/chitin/bone/hide) anchored at (100, 105),
each roughly 70x80 in the torso zone. Bone gets angular shoulder
pauldrons and central ribcage detail; hide gets a rounder organic
outline; chitin uses horizontal segment lines.

4 hide_pattern overlays (plain=null / spotted / striped / luminescent)
drawn on top of carapace via a new dedicated pass in Sprite that
renders hide_pattern immediately after the carapace layer.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Locomotion + appendage slot art (8 allele paths)

**Files:**
- Create: `src/render/paths/locomotion/loco_plain.ts`, `loco_sprint.ts`, `loco_burrow.ts`, `loco_bulk.ts`
- Create: `src/render/paths/appendage/app_none.ts`, `app_stinger.ts`, `app_lash.ts`, `app_spinneret.ts`
- Modify: `src/render/paths/registry.ts` — register the 8 new PathFns

**Interfaces produced:**
- 8 default-exported `PathFn`s
- `PATHS` registry now contains 25 entries (was 17)

**Global constraints for this task:**
- Locomotion paths anchor at `(100, 175)` — top of the leg zone. Extend y=140..280 (through the appendage zone into legs), stay within x=50..150 for full stance width.
- Appendage paths anchor at `(100, 140)` — hip line. Tails/arms extend downward, sideways, or trail past the leg region. Stay within x=30..170.
- Both slots may overlap the leg zone visually — that's expected (appendage weaves through/behind legs).
- Bilateral symmetric.

**Visual intent per allele:**

- `loco_plain` (baseline) — two simple straight legs, one on each side.
- `loco_sprint` (w3, dominant, `{SPD: 3}`, ability "Sprint") — longer, thinner legs, slightly angled forward for a running stance. Muscular calves.
- `loco_burrow` (w3, dominant, `{GUI: 3}`, ability "Ambush") — thick, claw-tipped digging limbs. Shorter and stouter than plain.
- `loco_bulk` (w1, recessive, `{VIT: 2, SPD: -1}`) — heavy tread-like limbs. Very wide base, geometric.
- `app_none` (baseline recessive) — no appendage. Renders nothing.
- `app_stinger` (w3, dominant, ability "Venom") — segmented tail curling up over the back, ending in a stinger point.
- `app_lash` (w1, dominant, `{PWR: 1}`) — a whip-like tail trailing down and to one side.
- `app_spinneret` (w3, dominant, `{GUI: 2}`, ability "Cloak") — a bulbous spinneret at the tail base with 2 silk-thread lines trailing down.

- [ ] **Step 1: Author `loco_plain`**

```ts
import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* left leg */}
    <path
      d="M 85 140 L 82 260 L 90 265 L 95 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* right leg */}
    <path
      d="M 115 140 L 118 260 L 110 265 L 105 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* simple feet */}
    <ellipse cx="86" cy="268" rx="10" ry="4" fill={c.dark} />
    <ellipse cx="114" cy="268" rx="10" ry="4" fill={c.dark} />
  </>
);

export default path;
```

- [ ] **Step 2: Author `loco_sprint`**

```ts
import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* left leg — longer, angled slightly forward, defined calf */}
    <path
      d="M 88 140 Q 85 200 82 250 L 88 265 L 96 250 Q 95 200 96 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* right leg mirrored */}
    <path
      d="M 112 140 Q 115 200 118 250 L 112 265 L 104 250 Q 105 200 104 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* pointed feet suggestion */}
    <path d="M 82 260 L 92 268 L 88 265 Z" fill={c.dark} />
    <path d="M 118 260 L 108 268 L 112 265 Z" fill={c.dark} />
    {/* calf highlight */}
    <path d="M 85 200 L 87 230" stroke={c.accent} strokeWidth="1" opacity="0.6" />
    <path d="M 115 200 L 113 230" stroke={c.accent} strokeWidth="1" opacity="0.6" />
  </>
);

export default path;
```

- [ ] **Step 3: Author `loco_burrow`**

```ts
import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* left limb — thick, shorter, forward-angled */}
    <path
      d="M 80 140 Q 68 190 65 235 L 80 255 L 100 235 Q 95 190 92 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* right limb mirrored */}
    <path
      d="M 120 140 Q 132 190 135 235 L 120 255 L 100 235 Q 105 190 108 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* claw tips — 3 curved claws per foot */}
    <path d="M 65 240 L 60 255 L 68 250 M 72 240 L 68 258 L 76 250 M 80 240 L 78 258 L 84 252"
      stroke={c.accent} strokeWidth="1.8" fill="none" />
    <path d="M 135 240 L 140 255 L 132 250 M 128 240 L 132 258 L 124 250 M 120 240 L 122 258 L 116 252"
      stroke={c.accent} strokeWidth="1.8" fill="none" />
  </>
);

export default path;
```

- [ ] **Step 4: Author `loco_bulk`**

```ts
import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* massive geometric tread-limbs */}
    <path
      d="M 55 140 L 52 250 L 90 270 L 92 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.8"
    />
    <path
      d="M 145 140 L 148 250 L 110 270 L 108 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.8"
    />
    {/* tread pattern — horizontal bars */}
    <path d="M 55 180 L 90 180 M 55 200 L 90 200 M 55 220 L 90 220 M 55 240 L 90 240"
      stroke={c.dark} strokeWidth="1.2" />
    <path d="M 110 180 L 145 180 M 110 200 L 145 200 M 110 220 L 145 220 M 110 240 L 145 240"
      stroke={c.dark} strokeWidth="1.2" />
  </>
);

export default path;
```

- [ ] **Step 5: Author `app_none`**

```ts
import type { PathFn } from '../registry';

/** app_none — no appendage. Renders nothing. */
const path: PathFn = () => null;

export default path;
```

- [ ] **Step 6: Author `app_stinger`**

```ts
import type { PathFn } from '../registry';

/** app_stinger — segmented tail curling up over the back with a stinger tip. */
const path: PathFn = (c) => (
  <>
    {/* base — attached at hip, curling up and to the right */}
    <path
      d="M 100 140 Q 140 130 150 90 Q 155 60 145 45"
      fill="none"
      stroke={c.base}
      strokeWidth="8"
      strokeLinecap="round"
    />
    {/* segment lines */}
    <path
      d="M 100 140 Q 140 130 150 90 Q 155 60 145 45"
      fill="none"
      stroke={c.dark}
      strokeWidth="1.2"
      strokeDasharray="4 3"
    />
    {/* stinger tip */}
    <path d="M 145 45 L 148 32 L 142 40 Z" fill={c.accent} stroke={c.dark} strokeWidth="1" />
  </>
);

export default path;
```

- [ ] **Step 7: Author `app_lash`**

```ts
import type { PathFn } from '../registry';

/** app_lash — whip-like tail trailing down and to one side. */
const path: PathFn = (c) => (
  <>
    <path
      d="M 100 140 Q 130 170 145 210 Q 155 250 160 275"
      fill="none"
      stroke={c.base}
      strokeWidth="5"
      strokeLinecap="round"
    />
    {/* accent along the whip */}
    <path
      d="M 100 140 Q 130 170 145 210 Q 155 250 160 275"
      fill="none"
      stroke={c.dark}
      strokeWidth="1"
      opacity="0.5"
    />
  </>
);

export default path;
```

- [ ] **Step 8: Author `app_spinneret`**

```ts
import type { PathFn } from '../registry';

/** app_spinneret — bulbous silk gland with two silk-thread lines trailing down. */
const path: PathFn = (c) => (
  <>
    {/* bulb at hip */}
    <ellipse cx="100" cy="150" rx="12" ry="8" fill={c.base} stroke={c.dark} strokeWidth="1.5" />
    <ellipse cx="100" cy="150" rx="6" ry="3" fill={c.dark} />
    {/* silk thread 1 — straight down */}
    <path d="M 95 158 L 88 275" stroke={c.light} strokeWidth="1" opacity="0.8" />
    {/* silk thread 2 — angled */}
    <path d="M 105 158 L 118 275" stroke={c.light} strokeWidth="1" opacity="0.8" />
  </>
);

export default path;
```

- [ ] **Step 9: Update registry with 8 new imports**

Add to `src/render/paths/registry.ts`:

```ts
// locomotion
import loco_plain from './locomotion/loco_plain';
import loco_sprint from './locomotion/loco_sprint';
import loco_burrow from './locomotion/loco_burrow';
import loco_bulk from './locomotion/loco_bulk';

// appendage
import app_none from './appendage/app_none';
import app_stinger from './appendage/app_stinger';
import app_lash from './appendage/app_lash';
import app_spinneret from './appendage/app_spinneret';
```

And add all 8 to the `PATHS` object.

- [ ] **Step 10: Run tests + typecheck**

Run: `npm test`
Expected: 69 green.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 11: Commit**

```bash
git add src/render/paths/locomotion/ src/render/paths/appendage/ src/render/paths/registry.ts
git commit -m "$(cat <<'EOF'
feat(render): locomotion + appendage SVG paths (8 alleles)

4 locomotion silhouettes (plain/sprint/burrow/bulk) anchored at
(100, 175) top of the leg zone, extending down to y=270 with feet.
Sprint gets a slight forward lean; burrow gets 3-claw feet; bulk
gets heavy geometric treads.

4 appendage variants (none / stinger over the back / whip lash /
silk spinneret with threads) anchored at (100, 140) hip line.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Aberration overlay paths (3 alleles)

**Files:**
- Create: `src/render/paths/aberration/ab_none.ts`
- Create: `src/render/paths/aberration/ab_voltaic.ts`
- Create: `src/render/paths/aberration/ab_corrosive.ts`
- Modify: `src/render/paths/registry.ts` — register the 3 new PathFns
- Create: `tests/render/registry.test.ts` — registry completeness (all qualitative alleles registered)
- Create: `tests/render/sprite.test.tsx` — snapshot tests for 5 tier archetypes

**Interfaces produced:**
- 3 aberration overlay PathFns
- `PATHS` registry contains 28 entries (was 25) — complete for all qualitative alleles across head/carapace/locomotion/appendage/eyes/hide_pattern/aberration
- 2 new test files: registry completeness (asserts every non-palette qualitative allele has a PathFn) + sprite snapshots (5 tier archetypes)

**Global constraints for this task:**
- Aberration overlays render on top of everything else. They may span the full viewBox (0..200 x 0..280).
- `ab_none` renders nothing (baseline, most units).
- The two wild aberrations should read as SPECIAL — this is the "wow" moment when a Chimera/Progenitor hatches.

**Visual intent:**

- `ab_none` — nothing. `PathFn` returns null.
- `ab_voltaic` — crackling lightning arcs across the body. 2–3 zig-zag lines in `light` color, with small spark dots. Diagonal, energetic.
- `ab_corrosive` — dripping acid streaks. 3–4 vertical drip lines coming down from the carapace/head area, with small pooling drops at the bottom. Uses `accent` color darkened with slight transparency to feel "wet."

- [ ] **Step 1: Author `ab_none`**

```ts
import type { PathFn } from '../registry';

/** ab_none — no aberration. Renders nothing. Baseline (dominant, most units). */
const path: PathFn = () => null;

export default path;
```

- [ ] **Step 2: Author `ab_voltaic`**

```ts
import type { PathFn } from '../registry';

/**
 * ab_voltaic — crackling electric arcs. Rare Chimera/Progenitor "wow" overlay.
 * Zig-zag lines with spark dots, using light color for visibility on any palette.
 */
const path: PathFn = (c) => (
  <>
    {/* main arc: shoulder to hip diagonal */}
    <path
      d="M 55 75 L 68 90 L 55 110 L 78 128 L 62 145 L 88 155"
      fill="none"
      stroke={c.light}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* secondary arc: mirrored */}
    <path
      d="M 145 75 L 132 90 L 145 110 L 122 128 L 138 145 L 112 155"
      fill="none"
      stroke={c.light}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* tertiary arc across the head */}
    <path
      d="M 72 30 L 85 45 L 68 55 L 100 40 L 132 55 L 115 45 L 128 30"
      fill="none"
      stroke={c.light}
      strokeWidth="1.5"
      opacity="0.9"
    />
    {/* spark dots at arc endpoints */}
    <circle cx="55" cy="75"  r="2" fill={c.light} />
    <circle cx="88" cy="155" r="2" fill={c.light} />
    <circle cx="145" cy="75" r="2" fill={c.light} />
    <circle cx="112" cy="155" r="2" fill={c.light} />
    <circle cx="72"  cy="30"  r="2" fill={c.light} />
    <circle cx="128" cy="30"  r="2" fill={c.light} />
  </>
);

export default path;
```

- [ ] **Step 3: Author `ab_corrosive`**

```ts
import type { PathFn } from '../registry';

/**
 * ab_corrosive — dripping acid streaks. Rare Chimera/Progenitor "wow" overlay.
 * Vertical drips with pooling drops, using accent color (with slight opacity for wet feel).
 */
const path: PathFn = (c) => (
  <>
    {/* drip 1: from left carapace edge down past hip */}
    <path
      d="M 72 90 Q 70 130 74 165 Q 72 195 76 220"
      fill="none"
      stroke={c.accent}
      strokeWidth="2.5"
      opacity="0.85"
    />
    <circle cx="76" cy="222" r="4" fill={c.accent} opacity="0.85" />
    {/* drip 2: from head down chest */}
    <path
      d="M 100 60 Q 98 110 102 155 Q 100 200 104 235"
      fill="none"
      stroke={c.accent}
      strokeWidth="2.5"
      opacity="0.85"
    />
    <circle cx="104" cy="237" r="4" fill={c.accent} opacity="0.85" />
    {/* drip 3: mirrored on the right */}
    <path
      d="M 128 90 Q 130 130 126 165 Q 128 195 124 220"
      fill="none"
      stroke={c.accent}
      strokeWidth="2.5"
      opacity="0.85"
    />
    <circle cx="124" cy="222" r="4" fill={c.accent} opacity="0.85" />
    {/* eroded patch on carapace — irregular blob */}
    <path
      d="M 82 100 Q 90 95 100 100 Q 95 110 85 108 Z"
      fill={c.accent}
      opacity="0.4"
    />
  </>
);

export default path;
```

- [ ] **Step 4: Update registry with 3 new imports**

Add to `src/render/paths/registry.ts`:

```ts
// aberration
import ab_none from './aberration/ab_none';
import ab_voltaic from './aberration/ab_voltaic';
import ab_corrosive from './aberration/ab_corrosive';
```

And add all 3 to the `PATHS` object.

- [ ] **Step 5: Write registry completeness test at `tests/render/registry.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { PATHS } from '../../src/render/paths/registry';
import { LOCI } from '../../src/sim/data/loci';

describe('sprite paths registry — completeness', () => {
  it('every non-palette qualitative allele has a registered PathFn', () => {
    for (const locus of Object.values(LOCI)) {
      if (locus.type !== 'qualitative') continue;
      if (locus.id === 'palette') continue; // palette drives color, not shape
      for (const alleleId of locus.alleles) {
        expect(PATHS[alleleId], `missing PathFn for allele "${alleleId}" (locus ${locus.id})`).toBeDefined();
      }
    }
  });

  it('registry has no orphan entries (every registered id belongs to a qualitative locus)', () => {
    const qualitativeIds = new Set<string>();
    for (const locus of Object.values(LOCI)) {
      if (locus.type !== 'qualitative') continue;
      if (locus.id === 'palette') continue;
      for (const alleleId of locus.alleles) qualitativeIds.add(alleleId);
    }
    for (const registeredId of Object.keys(PATHS)) {
      expect(qualitativeIds.has(registeredId), `orphan PathFn: "${registeredId}"`).toBe(true);
    }
  });
});
```

- [ ] **Step 6: Write sprite snapshot tests at `tests/render/sprite.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Sprite } from '../../src/render/sprite';

// One archetype per tier. Genomes are constructed to specifically hit each tier
// under the current tierForScore thresholds (basicMax=2, variantMax=4, adaptedMax=5, evolvedMax=11).
const ARCHETYPES: Array<{ tier: string; phenotype: Record<string, string>; palette: string }> = [
  {
    tier: 'baseline',
    phenotype: {
      head: 'head_plain', carapace: 'cara_bare', locomotion: 'loco_plain',
      appendage: 'app_none', eyes: 'eyes_plain', hide_pattern: 'hide_plain',
      aberration: 'ab_none',
    },
    palette: 'pal_ash',
  },
  {
    tier: 'strain',
    phenotype: {
      head: 'head_mandible', carapace: 'cara_chitin', locomotion: 'loco_plain',
      appendage: 'app_lash', eyes: 'eyes_bright', hide_pattern: 'hide_plain',
      aberration: 'ab_none',
    },
    palette: 'pal_rust',
  },
  {
    tier: 'mutant',
    phenotype: {
      head: 'head_maw', carapace: 'cara_chitin', locomotion: 'loco_sprint',
      appendage: 'app_stinger', eyes: 'eyes_multi', hide_pattern: 'hide_spotted',
      aberration: 'ab_none',
    },
    palette: 'pal_moss',
  },
  {
    tier: 'chimera',
    phenotype: {
      head: 'head_sensor', carapace: 'cara_bone', locomotion: 'loco_burrow',
      appendage: 'app_spinneret', eyes: 'eyes_singular', hide_pattern: 'hide_striped',
      aberration: 'ab_voltaic',
    },
    palette: 'pal_bloom',
  },
  {
    tier: 'progenitor',
    phenotype: {
      head: 'head_maw', carapace: 'cara_bone', locomotion: 'loco_sprint',
      appendage: 'app_stinger', eyes: 'eyes_multi', hide_pattern: 'hide_luminescent',
      aberration: 'ab_corrosive',
    },
    palette: 'pal_bloom',
  },
];

describe('Sprite snapshots (5 tier archetypes)', () => {
  for (const a of ARCHETYPES) {
    it(`renders ${a.tier} archetype`, () => {
      const { container } = render(<Sprite phenotype={a.phenotype} palette={a.palette} />);
      expect(container.innerHTML).toMatchSnapshot();
    });
  }

  it('unknown allele triggers MissingArt fallback', () => {
    const { getByTestId } = render(
      <Sprite phenotype={{ head: 'head_nonexistent' }} palette="pal_ash" />,
    );
    expect(getByTestId('missing-art')).toBeDefined();
  });
});
```

- [ ] **Step 7: Run tests + typecheck**

Run: `npm test`
Expected: 69 previous + 2 registry tests + 6 sprite tests (5 archetypes + 1 missing-art) = 77 green. Snapshots are freshly generated on first run.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/render/paths/aberration/ src/render/paths/registry.ts tests/render/
git commit -m "$(cat <<'EOF'
feat(render): aberration overlays + snapshot & registry tests

3 aberration overlays:
  - ab_none renders nothing (baseline, ~98% of hatches)
  - ab_voltaic: crackling arc lines with spark endpoints, drawn in
    the palette's light color for visibility on any palette
  - ab_corrosive: 3 vertical drip streams with pooling drops + an
    eroded patch on the carapace, in accent color at 0.85 opacity

Registry now contains 28 PathFns — every non-palette qualitative
allele across head/carapace/locomotion/appendage/eyes/hide_pattern/
aberration is registered. New completeness test in registry.test.ts
tripwires the moment a future allele lands in data without a PathFn.

Sprite snapshot tests for 5 tier archetypes — regressions in path
definitions, layer ordering, or composition trip these.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Gallery page — SpecimenCard, TierBadge, styles, App.tsx wiring

**Files:**
- Create: `src/ui/styles.ts` — shared style objects (page, grid, card, badge, footer)
- Create: `src/ui/components/TierBadge.tsx`
- Create: `src/ui/components/SpecimenCard.tsx`
- Create: `src/ui/screens/Gallery.tsx`
- Modify: `src/App.tsx` — replace demo table rendering with `<Gallery />`
- Create: `tests/ui/gallery.test.tsx` — smoke test: 50 cards render, no throws

**Interfaces produced:**
- `<TierBadge tier />` — small pill with color per tier
- `<SpecimenCard row />` — sprite + tier badge + specimen ID, palette-tinted card
- `<Gallery />` — full M2 review page with header + tier legend + grid of 50 cards
- `src/App.tsx` now renders `<Gallery />` (no longer the demo table)

**Global constraints for this task:**
- No `Math.random`/`Date.now()`/`window`/`document` at module load
- Inline styles + shared style module — no CSS-in-JS library, no Tailwind
- Existing `TERMS.tiers` (already in `src/ui/terms.ts`) provides display strings — reuse it

- [ ] **Step 1: Create `src/ui/styles.ts`**

```ts
import type { CSSProperties } from 'react';
import type { Tier } from '../sim/types';

export const TIER_COLORS: Readonly<Record<Tier, string>> = {
  baseline:   '#94a3b8', // slate
  strain:     '#14b8a6', // teal
  mutant:     '#f59e0b', // amber
  chimera:    '#a855f7', // violet
  progenitor: '#e11d48', // crimson
};

export const styles = {
  page: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: 24,
    maxWidth: 1400,
    margin: '0 auto',
  } as CSSProperties,

  headerTitle: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 4,
  } as CSSProperties,

  headerSub: {
    color: '#666',
    fontSize: 14,
    marginBottom: 16,
  } as CSSProperties,

  legend: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    fontSize: 12,
    color: '#555',
    marginBottom: 24,
    flexWrap: 'wrap',
  } as CSSProperties,

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  } as CSSProperties,

  legendDot: (color: string): CSSProperties => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: color,
  }),

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
  } as CSSProperties,

  card: (bgTint: string): CSSProperties => ({
    position: 'relative',
    aspectRatio: '5 / 7',
    background: bgTint,
    border: `1px solid ${bgTint}`,
    borderRadius: 6,
    padding: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  }),

  cardSprite: {
    width: '100%',
    height: 'calc(100% - 24px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as CSSProperties,

  cardFooter: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
  } as CSSProperties,

  badge: (color: string): CSSProperties => ({
    position: 'absolute',
    top: 6,
    right: 6,
    padding: '2px 6px',
    borderRadius: 8,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#fff',
    backgroundColor: color,
  }),
};
```

- [ ] **Step 2: Create `src/ui/components/TierBadge.tsx`**

```tsx
import type { ReactElement } from 'react';
import type { Tier } from '../../sim/types';
import { TERMS } from '../terms';
import { styles, TIER_COLORS } from '../styles';

interface Props {
  readonly tier: Tier;
}

export function TierBadge({ tier }: Props): ReactElement {
  return <span style={styles.badge(TIER_COLORS[tier])}>{TERMS.tiers[tier]}</span>;
}
```

- [ ] **Step 3: Create `src/ui/components/SpecimenCard.tsx`**

```tsx
import type { ReactElement } from 'react';
import type { DemoRow } from '../../sim/__demo__';
import { Sprite } from '../../render/sprite';
import { resolvePalette } from '../../render/colors';
import { TierBadge } from './TierBadge';
import { styles } from '../styles';

interface Props {
  readonly row: DemoRow;
}

/**
 * A single specimen card: palette-tinted panel with the sprite, tier badge,
 * and a monospace specimen ID footer.
 */
export function SpecimenCard({ row }: Props): ReactElement {
  const colors = resolvePalette(row.palette);
  // Very faint tint of the palette base for the card background
  const bgTint = tintForCard(colors.base);
  const specimenId = `M-${String(row.seed).padStart(5, '0')}`;

  return (
    <div style={styles.card(bgTint)} data-testid="specimen-card">
      <TierBadge tier={row.tier} />
      <div style={styles.cardSprite}>
        <Sprite phenotype={row.expressed} palette={row.palette} />
      </div>
      <div style={styles.cardFooter}>{specimenId}</div>
    </div>
  );
}

/**
 * Convert a palette base color to a very faint background tint by mixing
 * heavily with white. Keeps the biotech "sterile card" feel.
 */
function tintForCard(hex: string): string {
  // hex expected like "#rrggbb"
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // mix 92% white + 8% palette color
  const mix = (c: number) => Math.round(255 * 0.92 + c * 0.08);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}
```

- [ ] **Step 4: Create `src/ui/screens/Gallery.tsx`**

```tsx
import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { runDemo } from '../../sim/__demo__';
import { SpecimenCard } from '../components/SpecimenCard';
import { TERMS } from '../terms';
import { styles, TIER_COLORS } from '../styles';
import type { Tier } from '../../sim/types';

const TIERS: readonly Tier[] = ['baseline', 'strain', 'mutant', 'chimera', 'progenitor'];

/**
 * The M2 review page. Header + tier legend + 50 SpecimenCards in a grid.
 * Data comes from the existing runDemo(seed) — the sim is unchanged.
 */
export function Gallery(): ReactElement {
  const rows = useMemo(() => runDemo(1), []);

  return (
    <main style={styles.page}>
      <h1 style={styles.headerTitle}>Morulium — M2 sprite gallery</h1>
      <p style={styles.headerSub}>
        50 specimens, seed=1. Rarity distribution should be visible at a glance.
      </p>
      <div style={styles.legend} data-testid="tier-legend">
        {TIERS.map((tier) => (
          <span key={tier} style={styles.legendItem}>
            <span style={styles.legendDot(TIER_COLORS[tier])} />
            {TERMS.tiers[tier]}
          </span>
        ))}
      </div>
      <div style={styles.grid} data-testid="gallery-grid">
        {rows.map((row) => (
          <SpecimenCard key={row.seed} row={row} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Modify `src/App.tsx` to render `<Gallery />`**

Replace the current App.tsx content (which imports `formatDemoTable` and renders the demo table) with:

```tsx
import { Gallery } from './ui/screens/Gallery';

export function App() {
  return <Gallery />;
}
```

- [ ] **Step 6: Create `tests/ui/gallery.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Gallery } from '../../src/ui/screens/Gallery';

describe('Gallery smoke', () => {
  it('renders 50 specimen cards without throwing', () => {
    const { getAllByTestId, getByTestId } = render(<Gallery />);
    expect(getAllByTestId('specimen-card').length).toBe(50);
    expect(getByTestId('tier-legend')).toBeDefined();
    expect(getByTestId('gallery-grid')).toBeDefined();
  });

  it('renders a heading with the M2 title', () => {
    const { getByRole } = render(<Gallery />);
    expect(getByRole('heading', { level: 1 }).textContent).toMatch(/M2 sprite gallery/i);
  });
});
```

- [ ] **Step 7: Run tests + typecheck + build**

Run: `npm test`
Expected: 77 previous + 2 new gallery tests = 79 green.

Run: `npm run typecheck`
Expected: clean.

Run: `npm run build`
Expected: production bundle succeeds. Note the new bundle size vs. M1's 49KB gzipped.

- [ ] **Step 8: Local dev-server visual smoke check**

Run: `npm run dev` briefly. Open `http://localhost:5173`. Expected:
- Header reads "Morulium — M2 sprite gallery"
- Tier legend visible with 5 colored dots + labels
- Grid of 50 specimen cards
- Each card has a sprite, a tier badge (top-right), a specimen ID (bottom)
- Sprites are biotech-styled bipedal creatures with visible variety
- Ctrl-C when done. Capture in the report any obvious visual issues (sprite off-center, missing art placeholder anywhere, badge overlap, etc.)

- [ ] **Step 9: Commit**

```bash
git add src/ui/ src/App.tsx tests/ui/
git commit -m "$(cat <<'EOF'
feat(ui): M2 Gallery page — 50 SpecimenCards replacing the demo table

Adds src/ui/styles.ts (shared inline style objects + TIER_COLORS),
TierBadge component (colored pill per tier using TERMS labels),
SpecimenCard component (palette-tinted card with sprite + badge + ID
footer), and Gallery screen (header + tier legend + grid of 50 cards).

App.tsx now renders <Gallery /> instead of the demo table. Sim
unchanged — runDemo(1) still provides the 50 seeded specimens.

Gallery uses CSS Grid auto-fit at minmax(200px, 1fr), so ~4 columns
on desktop / 2 on tablet / 1 on mobile.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** Sprite anatomy → covered by layout.ts + per-slot path tasks (T2-T5). Rendering pipeline → sprite.tsx + registry (T1). Colors → colors.ts (T1). Gallery page → T6. Testing (SVG snapshots + registry + smoke) → T5 + T6. Non-goals honored: no animation, no interaction, no scaling. `.gitignore` hardening → T1.
- **Type consistency:** `PathFn`, `PaletteColors`, `Sprite` props, `TierBadge` props, `SpecimenCard` props all defined once and consumed consistently. Registry is `Readonly<Record<string, PathFn>>` throughout.
- **Placeholders:** none — every step has real code or a real command. SVG paths are hand-authored with specific coordinates, not "TBD."
- **Task splitting rationale:** T1 is foundation (independently reviewable). T2-T5 split by anatomical group (head+eyes, carapace+hide, loco+append, aberration overlays) — each ~7-9 files, cohesive stylistic review per group. T6 is UI shell independent of the sprite internals.
- **Deferred:** favicon (per user), sprite animation, hover states, sprite variation within an allele, background bubbles/schematic overlays, paid avatar layer.
- **Model recommendation for implementers:** T1 is mechanical (cheap model fine). T2-T5 are creative SVG authoring — the plan provides specific coordinates and shapes so cheap model can transcribe; a mid-tier model may produce slightly better visual polish if it iterates on the shapes, but pure transcription works. T6 is React shell composition (cheap model fine).
- **Distribution / visual quality is human-judged at milestone review** — the SDD reviewer checks spec compliance (files exist, tests pass, no broken constraints). Whether the art "holds up" is your call when you open the deployed site.
