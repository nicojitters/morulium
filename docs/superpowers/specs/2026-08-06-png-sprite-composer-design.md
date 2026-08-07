# PNG Sprite Composer

Replace the SVG-path-based specimen sprite composer with a PNG layer stack driven
by the 25 PixelLab assets under `public/assets/pixellab/traits/`. Targeted rework
of `src/render/`; public `Sprite` API stays fixed.

## Motivation

The current `src/render/sprite.tsx` composes each specimen from per-allele
`PathFn` SVGs. Those paths were placeholders while asset generation was in
flight. PNG parts now exist on disk (commit `10a9c22`) — this milestone replaces
the placeholder path renderer with a real composer over those PNGs. Sim, UI, and
tier scoring are unchanged.

## Public API (unchanged)

```ts
<Sprite phenotype={Record<string,string>} palette={string} />
```

`SpecimenCard` is the sole caller. `LAYER_ORDER` stays as
`['locomotion','carapace','appendage','head','eyes','aberration']` with
`hide_pattern` drawn on top of `carapace`. `ANCHORS` and `SPRITE_VIEWBOX` in
`src/render/layout.ts` stay as source of truth for anchor Y positions.

## Architecture

### Render tree

Root remains `<svg viewBox="0 0 200 280">`; each layer emits an
`<image href={url} x={dx} y={dy} width={200} height={280} imageRendering="pixelated" />`
instead of a `<path>`. `hide_pattern` is masked to the carapace alpha and drawn
at reduced opacity.

### Build-time script

Add `scripts/generate-sprites.ts`, invoked via `npm run generate:sprites`,
using `sharp` as the PNG lib. For each source PNG in
`public/assets/pixellab/traits/{alleleId}.png`:

1. Decode to raw RGBA.
2. Compute bbox of opaque pixels (alpha ≥ 32); record `{cx, cy}` = bbox center.
3. For each of the 4 palettes in `src/sim/data/palettes.ts`, emit a
   palette-remapped variant to
   `public/assets/pixellab/traits-computed/{alleleId}_{paletteId}.png`.
   Remap algorithm — brightness-rank match:
   - Reference ramp `REF = [#14282a, #2f5a5a, #5f8f8f, #4dffb0]` is sorted
     ascending by luminance `Y = 0.299R + 0.587G + 0.114B` (already so).
   - Each target palette's `ramp` array is used as-is by index (`ramp[0]`
     darkest → `ramp[3]` lightest by convention in `PALETTES`).
   - For each opaque pixel (alpha ≥ 32), find `i = argmin_j ||pixel - REF[j]||`
     (Euclidean RGB distance — always picks one of the four, including for
     anti-aliased in-between pixels), then set the output pixel to
     `target.ramp[i]`. Alpha is preserved verbatim.
   - Fully-transparent pixels (alpha < 32) are copied through unchanged.
4. Write `src/render/sprite-manifest.generated.ts`:
   ```ts
   export const SPRITE_MANIFEST: Readonly<Record<string, {
     readonly bbox: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
     readonly cx: number;
     readonly cy: number;
   }>> = Object.freeze({
     head_plain: { bbox: { x: 62, y: 18, w: 76, h: 68 }, cx: 100, cy: 52 },
     // ...
   });
   ```
   Alleles with no source PNG (`app_none`, `hide_plain`, `ab_none`) are
   deliberately absent from the manifest.

The script is idempotent, safe to re-run, and its outputs are committed. Both
`public/assets/pixellab/traits-computed/` and
`src/render/sprite-manifest.generated.ts` are tracked in git.

### Runtime

Rewrite `src/render/sprite.tsx`. For each layer in `LAYER_ORDER`:

```ts
const alleleId = phenotype[layer];
if (!alleleId) continue;
const entry = SPRITE_MANIFEST[alleleId];
if (!entry) {
  // Not in manifest at all -> either intentionally empty (app_none, etc.)
  // or unexpectedly missing PNG. Silently skip the intentional-empty set;
  // render MissingArt for anything else.
  if (INTENTIONALLY_EMPTY.has(alleleId)) continue;
  layers.push(<MissingArt key={layer} layer={layer} />);
  continue;
}
const dx = ANCHORS[layer].x - entry.cx;
const dy = ANCHORS[layer].y - entry.cy;
layers.push(
  <image
    key={layer}
    data-layer={layer}
    href={`/assets/pixellab/traits-computed/${alleleId}_${palette}.png`}
    x={dx}
    y={dy}
    width={SPRITE_VIEWBOX.width}
    height={SPRITE_VIEWBOX.height}
    imageRendering="pixelated"
  />
);
```

`hide_pattern` (drawn after carapace) is wrapped in an SVG `<mask>` whose
content is the carapace `<image>`; the pattern `<image>` also gets
`opacity="0.6"` so it reads as texture rather than paint. Mask IDs must be
unique per sprite instance — use `React.useId()`. Snapshot tests will embed
the generated id (deterministic per render) so snapshots stay stable.

### Aberration layer

Same as any other layer — no special handling. If `ab_none` (no PNG), skip.

## Landmine coverage

### 1. Anchor alignment

Build-time bbox computation writes `cx, cy` into the manifest; runtime translates
`<image>` via `x`/`y` so each part's bbox center lands on its layer anchor.
Aligned in both X and Y — all anchors are `x=100` and PixelLab drift is 2-D.
Uses **bbox center**, not centroid, so an asymmetric silhouette (e.g., a
one-sided appendage) doesn't get pulled off-center.

### 2. Overlay density (hide_luminescent, hide_spotted)

SVG `<mask>` using the carapace PNG's alpha channel gates the pattern to the
torso silhouette. `opacity="0.6"` on the pattern image softens density. Native
browser feature, works in jsdom for snapshots, no canvas polyfill needed.

### 3. Palette swap

Build-time pre-generation of 4 variants per allele, brightness-rank remapped
from the baked-in reference ramp `[#14282a, #2f5a5a, #5f8f8f, #4dffb0]` to each
target palette's ramp (`ramp[0]..ramp[3]`, already sorted darkest→lightest).
Runtime picks `{allele}_{palette}.png`. Palette locus stays real; rarity
scoring unchanged.

## Files

**Add**
- `scripts/generate-sprites.ts` — build script (reads traits/, writes
  traits-computed/ and sprite-manifest.generated.ts)
- `src/render/sprite-manifest.generated.ts` — committed generated file
- `public/assets/pixellab/traits-computed/*.png` — committed generated files
  (25 alleles × 4 palettes = 100 PNGs, ≤4 colors each, expected total <2 MB)
- `npm run generate:sprites` script entry in `package.json`
- `sharp` in `devDependencies`

**Rewrite**
- `src/render/sprite.tsx` — SVG `<image>` composer per above
- `tests/render/sprite.test.tsx` — same 5 archetypes + missing-art case;
  snapshots regenerated (will contain `<image>` tags with computed x/y and hrefs)
- `tests/render/registry.test.ts` — rewrite as manifest-completeness test:
  every non-empty allele in `alleles.ts` (excluding `INTENTIONALLY_EMPTY`) has
  a manifest entry AND a `traits-computed/{id}_{palette}.png` file for each
  palette

**Delete**
- `src/render/paths/` (all 27 files: registry.ts + 6 layer dirs of PathFns)
- `src/render/colors.ts` (only consumers were the deleted PathFns)
- `tests/render/colors.test.ts`

**Unchanged**
- `src/render/layout.ts` — LAYER_ORDER, ANCHORS, SPRITE_VIEWBOX all still load-bearing
- `src/ui/components/SpecimenCard.tsx` — Sprite prop shape preserved
- `src/sim/**` — palette locus, rarity, tier scoring, all data untouched

## Testing

**Snapshot regeneration**: `tests/render/sprite.test.tsx` keeps its 5 archetypes
and the missing-art case. Run once with `-u` after implementation, hand-eyeball
the new snapshot values, commit.

**Manifest completeness** (`tests/render/registry.test.ts`, rewritten): for each
qualitative locus in `src/sim/data/alleles.ts`, assert every non-empty allele id
has a manifest entry, and (for browser-loadable assurance) the corresponding
`traits-computed/{id}_pal_ash.png` file exists on disk.

**Non-regression**: full suite must stay at 694 passing (or 693 if
`colors.test.ts` was 1 test — will confirm on delete). Do NOT drop tests just to
hit green.

**Manual visual check**: run `npm run dev`, spawn a batch of specimens across
the four palettes and multiple tiers; verify:
- Heads sit on necks, not floating above/behind
- Legs sit under torso, not overlapping
- Hide_luminescent reads as texture on the carapace, not full-canvas paint
- pal_ash, pal_rust, pal_moss, pal_bloom are visibly distinct

## Non-goals

- Animation, hover states, or per-tier VFX (out of scope; existing sprite has none)
- Any change to sim data, rarity, tier scoring, or breeding rules
- Sprite sheet packing / atlas — 100 individual PNGs is small enough
- Filling in the intentionally-empty alleles (`app_none`, `hide_plain`,
  `ab_none`) with visible art — those alleles are the "no-feature" pick

## Risks

- **Snapshot noise**: five archetype snapshots will change to reference PNG
  hrefs and computed offsets. Reviewer must eyeball once. Mitigation: keep the
  snapshot small (no inline base64), just the tag structure with hrefs and
  offsets.
- **bbox mis-align on outlier assets**: if any single PNG has a stray opaque
  pixel far from the main silhouette (a lone antialiased dot), bbox will jump.
  Mitigation: alpha threshold of 32 in the script, and manual visual check
  during the QA pass; if an outlier is found, add a per-allele override table.
- **`sharp` install size**: adds ~40 MB to devDependencies. Standard for Node
  image work; acceptable one-time cost.
