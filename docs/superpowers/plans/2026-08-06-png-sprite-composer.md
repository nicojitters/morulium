# PNG Sprite Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SVG-path-based `Sprite` composer with a PNG layer stack driven by the 25 PixelLab traits, keeping the public `<Sprite phenotype palette />` API and all sim/rarity code untouched.

**Architecture:** A Node build script (`vite-node`, `sharp`) reads each source PNG, writes 4 palette-remapped variants per allele to `public/assets/pixellab/traits-computed/`, and emits a `sprite-manifest.generated.ts` with per-allele bbox + `cx`/`cy`. Runtime `<Sprite>` returns an `<svg viewBox="0 0 200 280">` with one `<image>` per layer, translated so each part's bbox center lands on its layer anchor; `hide_pattern` is masked to the carapace alpha and drawn at reduced opacity.

**Tech Stack:** TypeScript · React 18 · SVG · Vite / Vitest · `sharp` (new devDep) · `vite-node` (existing runner for TS scripts).

## Global Constraints

- Public `<Sprite phenotype={Record<string,string>} palette={string} />` shape stays unchanged. Sole caller is `src/ui/components/SpecimenCard.tsx`.
- `LAYER_ORDER` and `ANCHORS` in `src/render/layout.ts` remain source of truth; do not edit.
- No changes to `src/sim/**` (palette locus, rarity, tier scoring stay real).
- Missing-art fallback (`?` glyph via `MissingArt`) is retained for *unexpected* missing entries only. Three alleles are intentionally empty: `app_none`, `hide_plain`, `ab_none` — silent skip.
- Full vitest suite must stay green after each task (except Task 3 during snapshot regeneration, which produces a single expected `-u` regen).
- `imageRendering="pixelated"` on every `<image>` to preserve pixel-art aesthetics.
- Reference ramp (baked into source PNGs): `#14282a`, `#2f5a5a`, `#5f8f8f`, `#4dffb0`. Do not rename or reorder.
- Palettes to iterate: `pal_ash`, `pal_rust`, `pal_moss`, `pal_bloom` — read from `src/sim/data/palettes.ts`, never duplicated.

---

## File Structure

**Add**
- `scripts/lib/sprite-image.ts` — pure helpers (bbox + pixel remap), no I/O; unit-tested.
- `scripts/generate-sprites.ts` — build script; reads traits/, writes traits-computed/ + manifest.
- `src/render/sprite-manifest.generated.ts` — committed generated file, `Object.freeze({...})`.
- `public/assets/pixellab/traits-computed/*.png` — committed generated files (25 alleles × 4 palettes = 100 PNGs).
- `tests/scripts/sprite-image.test.ts` — unit tests for pure helpers.

**Modify**
- `src/render/sprite.tsx` — full rewrite to `<image>`-based composer.
- `tests/render/sprite.test.tsx` — same 5 archetypes + missing-art case; snapshot regenerated.
- `tests/render/__snapshots__/sprite.test.tsx.snap` — regenerated.
- `tests/render/registry.test.ts` — rewrite as manifest-completeness test.
- `package.json` — add `sharp` devDep; add `"generate:sprites": "vite-node scripts/generate-sprites.ts"` script.

**Delete**
- `src/render/paths/` (registry + 27 PathFn files across 6 layer subdirs + hide_pattern subdir).
- `src/render/colors.ts` (only consumers are the deleted PathFns).
- `tests/render/colors.test.ts`.

**Unchanged**
- `src/render/layout.ts`, `src/ui/components/SpecimenCard.tsx`, `src/sim/**`.

---

## Interfaces (referenced across tasks)

```ts
// scripts/lib/sprite-image.ts
export type RGB = readonly [number, number, number];
export type Bbox = { x: number; y: number; w: number; h: number; cx: number; cy: number };

export function computeBbox(
  rgba: Buffer | Uint8Array,
  width: number,
  height: number,
  alphaThreshold: number,
): Bbox | null;

export function nearestRampIndex(r: number, g: number, b: number, ramp: readonly RGB[]): number;

export function remapPixel(
  r: number, g: number, b: number,
  refRamp: readonly RGB[],
  targetRamp: readonly RGB[],
): RGB;
```

```ts
// src/render/sprite-manifest.generated.ts
export type ManifestEntry = {
  readonly bbox: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly cx: number;
  readonly cy: number;
};
export const SPRITE_MANIFEST: Readonly<Record<string, ManifestEntry>>;
export const INTENTIONALLY_EMPTY: ReadonlySet<string>; // app_none, hide_plain, ab_none
```

---

## Task 1: Build script — pure helpers + manifest generation

**Files:**
- Create: `scripts/lib/sprite-image.ts`
- Create: `tests/scripts/sprite-image.test.ts`
- Create: `scripts/generate-sprites.ts`
- Create: `src/render/sprite-manifest.generated.ts` (via running the script)
- Modify: `package.json` (add `sharp` devDep + `generate:sprites` script)

**Interfaces:**
- Consumes: `src/sim/data/palettes.ts` (`PALETTES`), `src/sim/data/alleles.ts` (allele list — to know which ids to expect / cross-check).
- Produces: `SPRITE_MANIFEST`, `INTENTIONALLY_EMPTY` (as documented in the Interfaces block above).

- [ ] **Step 1: Add sharp devDep**

```bash
npm install --save-dev sharp
```

Expected: `sharp` appears under `devDependencies` in `package.json`; `package-lock.json` updated.

- [ ] **Step 2: Write failing tests for pure helpers**

Create `tests/scripts/sprite-image.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeBbox, nearestRampIndex, remapPixel, type RGB } from '../../scripts/lib/sprite-image';

const REF: readonly RGB[] = [
  [0x14, 0x28, 0x2a],
  [0x2f, 0x5a, 0x5a],
  [0x5f, 0x8f, 0x8f],
  [0x4d, 0xff, 0xb0],
];

const ASH: readonly RGB[] = [
  [0x1c, 0x1c, 0x1c],
  [0x3d, 0x3d, 0x3d],
  [0x6e, 0x6e, 0x6e],
  [0xb6, 0xb6, 0xb6],
];

// Small 4x4 RGBA image, one opaque pixel at (1,2). Alpha threshold 32.
function makeSingleOpaquePixel(): Uint8Array {
  const w = 4, h = 4;
  const buf = new Uint8Array(w * h * 4);
  const idx = (2 * w + 1) * 4;
  buf[idx + 0] = 0x4d; buf[idx + 1] = 0xff; buf[idx + 2] = 0xb0; buf[idx + 3] = 255;
  return buf;
}

describe('computeBbox', () => {
  it('returns null when no pixels exceed the alpha threshold', () => {
    const empty = new Uint8Array(16 * 4); // all zeros
    expect(computeBbox(empty, 4, 4, 32)).toBeNull();
  });

  it('finds a single opaque pixel and reports bbox with cx/cy at its center', () => {
    const buf = makeSingleOpaquePixel();
    const bb = computeBbox(buf, 4, 4, 32);
    expect(bb).toEqual({ x: 1, y: 2, w: 1, h: 1, cx: 1.5, cy: 2.5 });
  });

  it('ignores pixels below the alpha threshold', () => {
    const buf = makeSingleOpaquePixel();
    // Add a stray pixel at (3,3) with alpha 20 — under threshold 32.
    const strayIdx = (3 * 4 + 3) * 4;
    buf[strayIdx + 3] = 20;
    const bb = computeBbox(buf, 4, 4, 32);
    expect(bb).toEqual({ x: 1, y: 2, w: 1, h: 1, cx: 1.5, cy: 2.5 });
  });
});

describe('nearestRampIndex', () => {
  it('exact match returns exact index', () => {
    expect(nearestRampIndex(0x14, 0x28, 0x2a, REF)).toBe(0);
    expect(nearestRampIndex(0x4d, 0xff, 0xb0, REF)).toBe(3);
  });

  it('anti-aliased in-between pixel picks nearest by RGB distance', () => {
    // Between REF[1] (#2f5a5a) and REF[2] (#5f8f8f) — closer to REF[1].
    expect(nearestRampIndex(0x40, 0x70, 0x70, REF)).toBe(1);
    // Closer to REF[2].
    expect(nearestRampIndex(0x55, 0x85, 0x85, REF)).toBe(2);
  });
});

describe('remapPixel', () => {
  it('maps each reference-ramp color to the target-ramp color at the same index', () => {
    expect(remapPixel(0x14, 0x28, 0x2a, REF, ASH)).toEqual([0x1c, 0x1c, 0x1c]);
    expect(remapPixel(0x2f, 0x5a, 0x5a, REF, ASH)).toEqual([0x3d, 0x3d, 0x3d]);
    expect(remapPixel(0x5f, 0x8f, 0x8f, REF, ASH)).toEqual([0x6e, 0x6e, 0x6e]);
    expect(remapPixel(0x4d, 0xff, 0xb0, REF, ASH)).toEqual([0xb6, 0xb6, 0xb6]);
  });

  it('an in-between (anti-aliased) pixel maps by nearest-ref match', () => {
    // Closer to REF[2] -> ASH[2]
    expect(remapPixel(0x55, 0x85, 0x85, REF, ASH)).toEqual([0x6e, 0x6e, 0x6e]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- tests/scripts/sprite-image.test.ts`
Expected: FAIL with "Cannot find module ../../scripts/lib/sprite-image" (or ERR_MODULE_NOT_FOUND).

- [ ] **Step 4: Implement the pure helpers**

Create `scripts/lib/sprite-image.ts`:

```ts
export type RGB = readonly [number, number, number];
export type Bbox = { x: number; y: number; w: number; h: number; cx: number; cy: number };

export function computeBbox(
  rgba: Buffer | Uint8Array,
  width: number,
  height: number,
  alphaThreshold: number,
): Bbox | null {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = rgba[(y * width + x) * 4 + 3]!;
      if (a < alphaThreshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  return { x: minX, y: minY, w, h, cx: minX + w / 2, cy: minY + h / 2 };
}

export function nearestRampIndex(r: number, g: number, b: number, ramp: readonly RGB[]): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < ramp.length; i++) {
    const [rr, gg, bb] = ramp[i]!;
    const dr = r - rr, dg = g - gg, db = b - bb;
    const d = dr * dr + dg * dg + db * db;
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

export function remapPixel(
  r: number, g: number, b: number,
  refRamp: readonly RGB[],
  targetRamp: readonly RGB[],
): RGB {
  const i = nearestRampIndex(r, g, b, refRamp);
  return targetRamp[i]!;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/scripts/sprite-image.test.ts`
Expected: PASS, all 7 tests green.

- [ ] **Step 6: Write the build script (manifest-only for now)**

Create `scripts/generate-sprites.ts`:

```ts
/* eslint-disable no-console */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { computeBbox, type RGB } from './lib/sprite-image';
import { PALETTES } from '../src/sim/data/palettes';

const REPO = resolve(process.cwd());
const SRC_DIR = join(REPO, 'public/assets/pixellab/traits');
const OUT_DIR = join(REPO, 'public/assets/pixellab/traits-computed');
const MANIFEST_PATH = join(REPO, 'src/render/sprite-manifest.generated.ts');

const ALPHA_THRESHOLD = 32;

// Baked-in reference ramp (matches the palette given to PixelLab).
const REF: readonly RGB[] = [
  [0x14, 0x28, 0x2a],
  [0x2f, 0x5a, 0x5a],
  [0x5f, 0x8f, 0x8f],
  [0x4d, 0xff, 0xb0],
];

// Three alleles are intentionally "no visible feature" — no source PNG on disk.
const INTENTIONALLY_EMPTY = new Set(['app_none', 'hide_plain', 'ab_none']);

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

async function listSourceAlleles(): Promise<string[]> {
  const files = await readdir(SRC_DIR);
  return files
    .filter((f) => f.endsWith('.png') && !f.startsWith('_'))
    .map((f) => f.replace(/\.png$/, ''))
    .sort();
}

async function main() {
  console.log(`Reading sources from ${SRC_DIR}`);
  const alleles = await listSourceAlleles();
  console.log(`Found ${alleles.length} source PNGs`);

  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  type ManifestEntry = { bbox: { x: number; y: number; w: number; h: number }; cx: number; cy: number };
  const manifest: Record<string, ManifestEntry> = {};

  for (const allele of alleles) {
    const src = join(SRC_DIR, `${allele}.png`);
    const raw = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height } = raw.info;
    const bb = computeBbox(raw.data, width, height, ALPHA_THRESHOLD);
    if (!bb) {
      console.warn(`  ${allele}: no opaque pixels above threshold — skipping`);
      continue;
    }
    manifest[allele] = { bbox: { x: bb.x, y: bb.y, w: bb.w, h: bb.h }, cx: bb.cx, cy: bb.cy };
    console.log(`  ${allele}: bbox=${bb.x},${bb.y} ${bb.w}x${bb.h} c=(${bb.cx},${bb.cy})`);
  }

  // Sanity: unknown palettes / empty palette set would silently produce zero variants.
  const paletteIds = Object.keys(PALETTES).sort();
  if (paletteIds.length === 0) throw new Error('PALETTES is empty');

  const source = renderManifestModule(manifest, INTENTIONALLY_EMPTY);
  await writeFile(MANIFEST_PATH, source, 'utf8');
  console.log(`Wrote ${MANIFEST_PATH} with ${Object.keys(manifest).length} entries`);
}

function renderManifestModule(
  manifest: Record<string, { bbox: { x: number; y: number; w: number; h: number }; cx: number; cy: number }>,
  intentionallyEmpty: ReadonlySet<string>,
): string {
  const header = [
    '// AUTO-GENERATED by scripts/generate-sprites.ts — do not edit by hand.',
    '// Run `npm run generate:sprites` to regenerate.',
    '',
    'export type ManifestEntry = {',
    '  readonly bbox: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };',
    '  readonly cx: number;',
    '  readonly cy: number;',
    '};',
    '',
    'export const SPRITE_MANIFEST: Readonly<Record<string, ManifestEntry>> = Object.freeze({',
  ].join('\n');
  const rows = Object.keys(manifest).sort().map((k) => {
    const e = manifest[k]!;
    return `  ${k}: { bbox: { x: ${e.bbox.x}, y: ${e.bbox.y}, w: ${e.bbox.w}, h: ${e.bbox.h} }, cx: ${e.cx}, cy: ${e.cy} },`;
  }).join('\n');
  const footer = [
    '});',
    '',
    `export const INTENTIONALLY_EMPTY: ReadonlySet<string> = new Set([${[...intentionallyEmpty].map((s) => `'${s}'`).join(', ')}]);`,
    '',
  ].join('\n');
  return `${header}\n${rows}\n${footer}`;
}

await main();
```

- [ ] **Step 7: Wire the npm script**

Modify `package.json` scripts block. Add:

```json
"generate:sprites": "vite-node scripts/generate-sprites.ts"
```

- [ ] **Step 8: Run the script; inspect output**

Run: `npm run generate:sprites`
Expected: Log line per allele with a bbox, and `Wrote .../sprite-manifest.generated.ts with 25 entries`. Open the generated file and confirm it exports `SPRITE_MANIFEST` and `INTENTIONALLY_EMPTY`, both frozen.

- [ ] **Step 9: Typecheck**

Run: `npm run typecheck`
Expected: no errors (new script and generated file compile clean).

- [ ] **Step 10: Full test run**

Run: `npm test`
Expected: All existing tests pass (694 or thereabouts), plus 7 new tests from `sprite-image.test.ts`. Sprite snapshots still match the old SVG — nothing rendering has changed yet.

- [ ] **Step 11: Commit**

```bash
git add scripts/lib/sprite-image.ts scripts/generate-sprites.ts \
        tests/scripts/sprite-image.test.ts \
        src/render/sprite-manifest.generated.ts \
        package.json package-lock.json
git commit -m "feat(render): sprite manifest generator + pure image helpers"
```

---

## Task 2: Build script — palette-remapped variants

**Files:**
- Modify: `scripts/generate-sprites.ts`
- Create: `public/assets/pixellab/traits-computed/*.png` (25 × 4 = 100 files, produced by running the script)

**Interfaces:**
- Consumes: `remapPixel`, `PALETTES` (both already available).
- Produces: One PNG per (allele, palette) at `public/assets/pixellab/traits-computed/{allele}_{palette}.png`. Same 200×280 dimensions as source; pixel-identical to source except for the color remap.

- [ ] **Step 1: Extend the script to write palette variants**

Modify `scripts/generate-sprites.ts`. Add a loop inside `main()` after the manifest is built (before `writeFile`), and add the helper functions. Insert:

```ts
  for (const allele of Object.keys(manifest)) {
    const src = join(SRC_DIR, `${allele}.png`);
    const raw = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height } = raw.info;

    for (const paletteId of paletteIds) {
      const palette = PALETTES[paletteId]!;
      const target: readonly RGB[] = palette.ramp.map(hexToRgb);
      const out = Buffer.from(raw.data); // copy source RGBA
      for (let i = 0; i < out.length; i += 4) {
        const a = out[i + 3]!;
        if (a < ALPHA_THRESHOLD) continue; // preserve near-transparent pixels
        const [nr, ng, nb] = remapPixel(out[i]!, out[i + 1]!, out[i + 2]!, REF, target);
        out[i] = nr; out[i + 1] = ng; out[i + 2] = nb;
      }
      const dst = join(OUT_DIR, `${allele}_${paletteId}.png`);
      await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(dst);
    }
    console.log(`  ${allele}: wrote ${paletteIds.length} palette variants`);
  }
```

Also add `remapPixel` to the top-of-file import:

```ts
import { computeBbox, remapPixel, type RGB } from './lib/sprite-image';
```

- [ ] **Step 2: Run the script; inspect outputs**

Run: `npm run generate:sprites`
Expected: 25 alleles × 4 palettes = 100 lines written; `public/assets/pixellab/traits-computed/` now contains 100 PNGs named `{allele}_{palette}.png`. Manually open `cara_bare_pal_ash.png` and `cara_bare_pal_moss.png` — they should be visibly distinct (grayscale vs green).

- [ ] **Step 3: Sanity-check file count**

Run: `ls public/assets/pixellab/traits-computed/*.png | wc -l`
Expected: `100`

- [ ] **Step 4: Full test run (no rendering changes yet)**

Run: `npm test`
Expected: All tests still green — Sprite hasn't been rewired yet, so old snapshots still match.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-sprites.ts public/assets/pixellab/traits-computed/
git commit -m "feat(render): generate 4 palette variants per allele PNG"
```

---

## Task 3: Rewrite `Sprite` composer over PNGs + regenerate snapshots

**Files:**
- Modify: `src/render/sprite.tsx` (full rewrite)
- Modify: `tests/render/sprite.test.tsx` (unchanged test bodies; snapshots regenerate)
- Modify: `tests/render/__snapshots__/sprite.test.tsx.snap` (auto-regenerated via `vitest -u`)

**Interfaces:**
- Consumes: `SPRITE_MANIFEST`, `INTENTIONALLY_EMPTY` (from Task 1); traits-computed PNGs (from Task 2); `LAYER_ORDER`, `ANCHORS`, `SPRITE_VIEWBOX_STRING` from `src/render/layout.ts`.
- Produces: same `Sprite` component export. `data-layer="{layer}"` attribute is preserved on each `<image>` for test hooks. `data-testid="missing-art"` on the `?` fallback text is preserved.

- [ ] **Step 1: Rewrite `src/render/sprite.tsx`**

Overwrite the entire file with:

```tsx
import { useId, type ReactElement, type ReactNode } from 'react';
import { LAYER_ORDER, SPRITE_VIEWBOX_STRING, SPRITE_VIEWBOX, ANCHORS, type Layer } from './layout';
import { SPRITE_MANIFEST, INTENTIONALLY_EMPTY } from './sprite-manifest.generated';

interface SpriteProps {
  readonly phenotype: Readonly<Record<string, string>>;
  readonly palette: string;
}

const TRAITS_BASE = '/assets/pixellab/traits-computed';

function assetUrl(alleleId: string, paletteId: string): string {
  return `${TRAITS_BASE}/${alleleId}_${paletteId}.png`;
}

function anchorFor(layer: Layer): { x: number; y: number } {
  // 'aberration' has no ANCHORS entry — spec keeps it visually at the appendage anchor.
  if (layer === 'aberration') return { x: 100, y: 140 };
  return ANCHORS[layer as keyof typeof ANCHORS];
}

/**
 * Compose an SVG sprite from PNG parts. Each layer emits an <image> translated
 * so the part's bbox center (per src/render/sprite-manifest.generated.ts) lands
 * on its layer anchor. hide_pattern is drawn masked to the carapace alpha at
 * reduced opacity so it reads as texture on the torso, not full-canvas paint.
 */
export function Sprite({ phenotype, palette }: SpriteProps): ReactElement {
  const maskUid = useId();
  const defs: ReactNode[] = [];
  const layers: ReactNode[] = [];

  let carapaceOffset: { dx: number; dy: number } | null = null;
  let carapaceAllele: string | null = null;

  for (const layer of LAYER_ORDER) {
    const alleleId = phenotype[layer];
    if (!alleleId) continue;

    if (INTENTIONALLY_EMPTY.has(alleleId)) continue;

    const entry = SPRITE_MANIFEST[alleleId];
    if (!entry) {
      layers.push(<MissingArt key={layer} layer={layer} />);
      if (typeof console !== 'undefined') {
        console.warn(`[Sprite] missing manifest entry for allele "${alleleId}" (layer ${layer})`);
      }
      continue;
    }

    const anchor = anchorFor(layer);
    const dx = anchor.x - entry.cx;
    const dy = anchor.y - entry.cy;

    layers.push(
      <image
        key={layer}
        data-layer={layer}
        href={assetUrl(alleleId, palette)}
        x={dx}
        y={dy}
        width={SPRITE_VIEWBOX.width}
        height={SPRITE_VIEWBOX.height}
        style={{ imageRendering: 'pixelated' } as React.CSSProperties}
      />,
    );

    if (layer === 'carapace') {
      carapaceOffset = { dx, dy };
      carapaceAllele = alleleId;

      const hideId = phenotype['hide_pattern'];
      if (!hideId || INTENTIONALLY_EMPTY.has(hideId)) continue;
      const hideEntry = SPRITE_MANIFEST[hideId];
      if (!hideEntry) {
        layers.push(<MissingArt key="hide_pattern" layer={'carapace' as Layer} />);
        if (typeof console !== 'undefined') {
          console.warn(`[Sprite] missing manifest entry for hide_pattern allele "${hideId}"`);
        }
        continue;
      }

      // Position the hide pattern at the SAME offset as the carapace so its
      // canvas aligns with the torso. Mask to the carapace's alpha silhouette.
      const maskId = `${maskUid}-cara`;
      defs.push(
        <mask
          key={maskId}
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={SPRITE_VIEWBOX.width}
          height={SPRITE_VIEWBOX.height}
        >
          <image
            href={assetUrl(carapaceAllele, palette)}
            x={carapaceOffset.dx}
            y={carapaceOffset.dy}
            width={SPRITE_VIEWBOX.width}
            height={SPRITE_VIEWBOX.height}
          />
        </mask>,
      );
      layers.push(
        <image
          key="hide_pattern"
          data-layer="hide_pattern"
          href={assetUrl(hideId, palette)}
          x={carapaceOffset.dx}
          y={carapaceOffset.dy}
          width={SPRITE_VIEWBOX.width}
          height={SPRITE_VIEWBOX.height}
          mask={`url(#${maskId})`}
          opacity={0.6}
          style={{ imageRendering: 'pixelated' } as React.CSSProperties}
        />,
      );
    }
  }

  return (
    <svg viewBox={SPRITE_VIEWBOX_STRING} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {defs.length > 0 && <defs>{defs}</defs>}
      {layers}
    </svg>
  );
}

function MissingArt({ layer }: { readonly layer: Layer }): ReactElement {
  const anchor = anchorFor(layer);
  return (
    <text x={anchor.x} y={anchor.y} textAnchor="middle" fill="#999" fontSize="24" data-testid="missing-art">
      ?
    </text>
  );
}
```

- [ ] **Step 2: Regenerate the snapshot file**

Delete the old snapshot so it doesn't conflict with the new tag structure, then rerun:

```bash
rm tests/render/__snapshots__/sprite.test.tsx.snap
npm test -- tests/render/sprite.test.tsx
```

Expected: 5 snapshots created fresh, 6 tests pass. Open the regenerated `.snap` file and confirm:
- Each archetype snapshot contains 5–7 `<image>` tags with `data-layer` attributes and `href="/assets/pixellab/traits-computed/{allele}_{palette}.png"`.
- `chimera` and `progenitor` (which use `hide_striped` / `hide_luminescent`) contain a `<defs><mask>` block with an inner `<image>` referring to the carapace PNG, plus a `hide_pattern` `<image>` with `opacity="0.6"` and `mask="url(...)"`.
- `strain` and `mutant` use `hide_plain` — INTENTIONALLY_EMPTY, so no hide_pattern `<image>` and no mask.
- Baseline uses `hide_plain` too — no hide_pattern `<image>`, no mask.
- `dx`/`dy` values are small integers around zero and consistent per allele.

If any of those checks fails, don't accept the snapshot — go back and fix `sprite.tsx`.

- [ ] **Step 3: Missing-art fallback still works**

The test `unknown allele triggers MissingArt fallback` uses `head: 'head_nonexistent'`, which is not in `SPRITE_MANIFEST` and not in `INTENTIONALLY_EMPTY` — the new composer should render `<text data-testid="missing-art">?</text>` as before. Vitest run in the previous step should have shown this test passing.

- [ ] **Step 4: Full test suite**

Run: `npm test`
Expected: Everything green. `tests/render/registry.test.ts` and `tests/render/colors.test.ts` still exist and still pass (they don't touch the new composer's internals). If registry.test.ts fails because it imports from `../../src/render/paths/registry` and our sprite.tsx no longer uses it, that's still fine — registry.test.ts imports still resolve because we haven't deleted the paths yet.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Manual visual smoke test**

Run: `npm run dev` and open the app in a browser. Spawn/decant a batch that covers multiple palettes and tiers. Visually confirm:
- Heads sit on necks, not floating; legs sit under torso, no overlap.
- `hide_luminescent` shows as a masked texture on the carapace, not covering the whole 200×280 tile.
- Four palettes render as visually distinct.

If anchor alignment is off for a specific allele, note the allele id — fixing may require adjusting `ALPHA_THRESHOLD` in the script and re-running Task 1/Task 2. Do NOT hand-edit `sprite-manifest.generated.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/render/sprite.tsx tests/render/__snapshots__/sprite.test.tsx.snap
git commit -m "feat(render): compose specimen sprite from PNG parts"
```

---

## Task 4: Manifest-completeness test

**Files:**
- Modify: `tests/render/registry.test.ts` (rewrite)

**Interfaces:**
- Consumes: `SPRITE_MANIFEST`, `INTENTIONALLY_EMPTY`, `ALLELES` from `src/sim/data/alleles.ts`, `PALETTES` from `src/sim/data/palettes.ts`.
- Produces: Test file only — no runtime code.

- [ ] **Step 1: Inspect existing registry.test.ts**

Read `tests/render/registry.test.ts` end-to-end (`Read` tool). Note what it currently asserts — the rewrite must preserve any assertions about allele/registry cross-consistency, translated to the manifest world.

- [ ] **Step 2: Rewrite `tests/render/registry.test.ts`**

Overwrite the file with:

```ts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SPRITE_MANIFEST, INTENTIONALLY_EMPTY } from '../../src/render/sprite-manifest.generated';
import { ALLELES } from '../../src/sim/data/alleles';
import { LOCI } from '../../src/sim/data/loci';
import { PALETTES } from '../../src/sim/data/palettes';

const COMPUTED_DIR = resolve(process.cwd(), 'public/assets/pixellab/traits-computed');

// Loci whose alleles drive the sprite (all qualitative loci except 'palette' —
// the palette locus picks WHICH variant to load, not a layer of its own).
const SPRITE_LOCI = ['head', 'eyes', 'carapace', 'hide_pattern', 'locomotion', 'appendage', 'aberration'];

describe('sprite manifest — completeness', () => {
  it('every sprite-driving allele is either in SPRITE_MANIFEST or INTENTIONALLY_EMPTY', () => {
    const missing: string[] = [];
    for (const allele of ALLELES) {
      const locus = LOCI[allele.locus];
      if (!locus) throw new Error(`unknown locus: ${allele.locus}`);
      if (!SPRITE_LOCI.includes(allele.locus)) continue;
      if (INTENTIONALLY_EMPTY.has(allele.id)) continue;
      if (!SPRITE_MANIFEST[allele.id]) missing.push(`${allele.locus}:${allele.id}`);
    }
    expect(missing).toEqual([]);
  });

  it('every manifest entry has a palette variant PNG on disk for every palette', () => {
    const missing: string[] = [];
    for (const alleleId of Object.keys(SPRITE_MANIFEST)) {
      for (const paletteId of Object.keys(PALETTES)) {
        const path = join(COMPUTED_DIR, `${alleleId}_${paletteId}.png`);
        if (!existsSync(path)) missing.push(`${alleleId}_${paletteId}.png`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('INTENTIONALLY_EMPTY contains only the documented three "no visible feature" alleles', () => {
    expect([...INTENTIONALLY_EMPTY].sort()).toEqual(['ab_none', 'app_none', 'hide_plain']);
  });
});
```

- [ ] **Step 3: Run the rewritten test**

Run: `npm test -- tests/render/registry.test.ts`
Expected: 3 tests, all pass. If test 1 reports missing alleles, either the script skipped them (check `npm run generate:sprites` output) or they're truly missing from `public/assets/pixellab/traits/`. If test 2 fails, re-run `npm run generate:sprites` to (re)generate variants.

- [ ] **Step 4: Full test run**

Run: `npm test`
Expected: All green.

- [ ] **Step 5: Commit**

```bash
git add tests/render/registry.test.ts
git commit -m "test(render): manifest completeness (allele + palette variants)"
```

---

## Task 5: Delete dead code (SVG paths, colors, colors test)

**Files:**
- Delete: `src/render/paths/` (entire directory)
- Delete: `src/render/colors.ts`
- Delete: `tests/render/colors.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing (removal only).

- [ ] **Step 1: Confirm nothing outside `src/render/paths/` still imports from it**

Run: `grep -RIn "src/render/paths\|render/paths\|from '\\./paths\|from '\\./colors\|render/colors" src/ tests/ 2>/dev/null | grep -v "src/render/paths/" | grep -v "tests/render/colors.test.ts"`
Expected: NO output. If anything appears, do NOT delete — investigate first (may indicate a consumer I missed).

- [ ] **Step 2: Delete the files**

```bash
git rm -r src/render/paths
git rm src/render/colors.ts
git rm tests/render/colors.test.ts
```

- [ ] **Step 3: Typecheck (verifies no dangling imports)**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Full test run**

Run: `npm test`
Expected: All tests green. The count should drop by however many tests were in `colors.test.ts` (likely a handful).

- [ ] **Step 5: Commit**

```bash
git commit -m "chore(render): drop obsolete SVG path renderer + colors module"
```

---

## Self-Review

**Spec coverage:**
- Public API preserved → Task 3 keeps `SpriteProps` shape.
- Build-time script (`sharp`, palettes source of truth) → Task 1 + Task 2.
- Manifest with bbox + cx/cy → Task 1.
- 100 palette-variant PNGs committed → Task 2.
- SVG `<image>` composer with per-layer offsets → Task 3.
- `hide_pattern` masked to carapace alpha + opacity 0.6 → Task 3.
- INTENTIONALLY_EMPTY silent skip → Task 3.
- Missing-art fallback for unexpected → Task 3.
- Snapshot regeneration + manual visual check → Task 3.
- Manifest completeness test → Task 4.
- Deletion of paths/ + colors.ts + colors.test.ts → Task 5.
- Full green suite between tasks → verified in every task's test run step.

**Placeholder scan:** none — every step has concrete code or a concrete command.

**Type consistency:** `ManifestEntry`, `SPRITE_MANIFEST`, `INTENTIONALLY_EMPTY`, `RGB`, `Bbox`, `computeBbox`, `nearestRampIndex`, `remapPixel`, `anchorFor` — all referenced with the same names/shapes across Tasks 1–5. `Layer` type from `layout.ts` used consistently.

**Notes for the implementer:**
- The script writes into `src/render/` so its output is picked up by tsc/vite; it's a checked-in generated artifact, not a build-step output. If you decide later to move it out of `src/`, update the import in `sprite.tsx`.
- `tests/scripts/` is a new test directory; vitest's `include: ['tests/**/*.test.ts']` already covers it.
- The mask `<image>` inside `<defs>` is not visible directly — it's applied via `mask="url(#...)"` on the pattern image. Don't be alarmed that the snapshot shows two `<image>` tags for the carapace PNG (one in `<defs>` as the mask source, one at the top level as the visible carapace).
