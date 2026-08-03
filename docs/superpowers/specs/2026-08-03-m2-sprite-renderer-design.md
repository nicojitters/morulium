# Morulium — M2 Sprite Renderer Design (v0.1)

**Date:** 2026-08-03
**Working directory:** `/Users/cnote/projects/morulium/`
**Remote:** `https://github.com/nicojitters/morulium` (public)
**Live:** `https://morulium.com` (Vercel, auto-deploys from main)
**Prior milestone:** M1 sim foundations — merged. This spec covers **M2 procedural sprite renderer** (game-spec §4, MVP build step 4).

## Purpose

Turn the M1 sim's abstract genome+phenotype into a visible creature. Every hatch now produces a **procedural SVG sprite** derived deterministically from its `PhenotypeDescriptor`, and the Gallery page replaces the current M1 demo table so `https://morulium.com` reads as a creature-collection game surface, not a debug dump.

M2 is a **visual quality gate**. It ships when a reasonable human loads the deployed site and says "yes this looks like Morulium creatures I'd want to collect." Sprite variety, tier legibility, and the biotech-specimen aesthetic are the acceptance criteria — not test count or code coverage (though those must remain green).

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Aesthetic tone | **Biotech specimen** | Fits the locked vocab (Vat/Morula/Sequencer/Vivarium). Clinical clarity, catalog-like. |
| Body plan | **Standing bipedal, bilateral symmetric** | Game spec §11 requires bilateral symmetry. Standing gives head/torso/legs anatomy that maps clearly to part slots. |
| Rendering primitive | **Pure SVG paths, pre-authored per allele** | Game spec §11: "code-drawn, unlimited, deterministic." No parametric shape generator (out of budget for M2). |
| Color model | **Balanced 2–3 colors from palette ramp** | Body silhouette mid-tone, part regions darker shade, accents brightest shade. Reads at thumbnail size without muddying. |
| Aberration expression | **Additive overlay effect** | Voltaic = crackling arcs; corrosive = dripping erosion. Baseline creature still visible underneath. One extra SVG layer per aberration; cheap and extensible. |
| Card contents | **Sprite + tier badge + specimen ID** | Focused on the art, minimal chrome. Score/allele codes/stats omitted from M2 (they're for M3+ dossier surfaces). |
| Gallery vs. demo table | **Gallery replaces the demo table** | The Gallery IS what M2 ships. The debug table's job is done — Vitest still exercises the sim. |
| Sprite viewBox | **200 × 280 (5:7 portrait)** | Vertical portrait fits standing bipedal without wasted whitespace. Fixed viewBox so scaling in M3+ contexts (Colony grid, breeding preview) is a container-CSS concern, not per-sprite. |
| Styling approach | **Inline styles + one shared styles module** | Matches existing `App.tsx` pattern. No CSS-in-JS library, no Tailwind. Keeps M2 dependency-flat. |
| Testing | **SVG snapshot tests + registry completeness + Gallery smoke** | Snapshot tests catch structural regressions; registry test catches missing art on new alleles; Gallery smoke confirms composition doesn't crash. No visual regression harness (Playwright/Percy) for M2. |

## Sprite anatomy

Every creature is rendered inside a fixed portrait viewBox of **200 × 280**, standing bipedal, drawn in 5 vertical zones with 2 overlay layers.

```
         viewBox="0 0 200 280"

    ┌─────────────────┐   y = 0..70   HEAD zone      ← head + eyes overlay
    │      HEAD       │
    │─────────────────│   y = 70..140 CARAPACE zone  ← carapace + hide_pattern overlay
    │    CARAPACE     │
    │─────────────────│   y = 140..170 APPENDAGE     ← appendage anchor (top of legs)
    │    APPENDAGE    │       zone (small)
    │─────────────────│   y = 170..280 LOCOMOTION    ← locomotion (2 legs / burrowers / bulk)
    │                 │
    │   LOCOMOTION    │
    │                 │
    └─────────────────┘

    ABERRATION overlay renders on top of all zones (ab_voltaic arcs across the body,
    ab_corrosive drips down from carapace edges).
```

**Anchor rules:**
- Every allele path is authored assuming a **specific anchor point** for its slot. All `head_*` paths anchor at `(100, 70)` (bottom-center of the head zone). All `carapace_*` paths anchor at `(100, 105)` (center of the carapace zone). All `locomotion_*` paths anchor at `(100, 175)` (top-center of the legs zone). All `appendage_*` paths anchor at `(100, 140)` (top-center of the appendage zone, so tails/arms hang down or trail sideways).
- Bilateral symmetry is enforced by drawing one side as `<path>` and mirroring via `transform="scale(-1, 1) translate(-200, 0)"` where useful. Alternatively, paths are authored fully symmetric.
- Anchor consistency = swappable parts. A `head_maw` and a `head_sensor` fit at the same neck position without touching per-part transforms.

**Draw order** (bottom of stack to top): `locomotion → carapace → appendage → head → eyes → aberration`. This is the order layers are rendered so, e.g., the head covers the top of the carapace, and the aberration overlay is visible over everything.

**One deliberate call:** the appendage anchor is at the **hip line (y=140, top of the appendage zone)**, not the middle of the torso, so tails/arms trail downward from the hip rather than out of the ribcage. This gives the standing-bipedal silhouette proper weight distribution. The appendage zone (y=140..170) is only 30px tall because it's an *anchor* region — the actual tail/arm visual extends downward past it, weaving between or behind the locomotion parts as appropriate.

**Quantitative loci contribute nothing visible** (they only change stats). Palette is not a visible zone — it colors every other zone via the ramp.

## Rendering pipeline

Pure functional pipeline: **PhenotypeDescriptor + Palette → renderSprite → SVG React element.**

```
PhenotypeDescriptor
  ↓
For each of head/carapace/locomotion/appendage/eyes/hide_pattern/aberration:
  ↓
Look up allele id in the paths/ registry
  ↓
Call path function with (palette colors) → returns <path> / <g> React node
  ↓
Compose all layer nodes inside <svg viewBox="0 0 200 280"> in draw order
  ↓
Return <svg> React element
```

**Data flow per sprite (in `Gallery.tsx` context):**

1. `App.tsx` calls `runDemo(seed)` (existing) → 50 rows
2. Each row already has `expressed` (map of locus → expressed allele id) and `palette` (palette allele id) from the existing `expressPhenotype`
3. `<SpecimenCard>` reads its row's `expressed` + `palette`
4. `<Sprite phenotype={row.expressed} palette={row.palette} />` composes the SVG
5. `<Gallery>` grids 50 `<SpecimenCard>`s

**Purity rules (mirroring `src/sim/*`):**
- `src/render/*` and `src/ui/*` use **no** `Math.random`, `Date.now()`, `window`, `document` (except React's DOM concerns via JSX)
- No side effects at module load — path registries build via static `import`s
- Every sprite is deterministic given `(expressed, palette)` — same phenotype ⇒ same SVG

**Missing-art fallback:** if a phenotype references an allele id that isn't in the `paths/` registry, `<Sprite>` renders a small "?" placeholder in that slot and calls `console.warn` in dev builds. This surfaces "artist forgot to author X" the moment a new allele lands in `data/alleles.ts`.

## File structure

```
src/
  render/                      # NEW — pure SVG composition, no side effects
    sprite.tsx                 # <Sprite phenotype palette /> React component
    layout.ts                  # zone anchor points, viewBox constant, layer draw order
    colors.ts                  # resolvePalette(paletteId) → { base, dark, light, accent }
    paths/
      registry.ts              # Record<string, PathFn> — the composition lookup table
      head/
        head_plain.ts          # export default: PathFn — draws head_plain SVG path
        head_maw.ts
        head_sensor.ts
        head_mandible.ts
        head_folded.ts
      carapace/
        cara_bare.ts
        cara_chitin.ts
        cara_bone.ts
        cara_hide.ts
      locomotion/
        loco_plain.ts
        loco_sprint.ts
        loco_burrow.ts
        loco_bulk.ts
      appendage/
        app_none.ts            # renders nothing (or a stub) — kept for registry completeness
        app_stinger.ts
        app_lash.ts
        app_spinneret.ts
      eyes/
        eyes_plain.ts
        eyes_bright.ts
        eyes_multi.ts
        eyes_singular.ts
      hide_pattern/
        hide_plain.ts
        hide_spotted.ts
        hide_striped.ts
        hide_luminescent.ts
      aberration/
        ab_none.ts             # renders nothing
        ab_voltaic.ts          # lightning arcs overlay
        ab_corrosive.ts        # drip/erosion overlay
  ui/                          # NEW — presentation components
    styles.ts                  # shared style objects (card, grid, badge, page)
    components/
      SpecimenCard.tsx         # <SpecimenCard row /> — sprite + tier badge + ID
      TierBadge.tsx            # <TierBadge tier /> — the corner pill
    screens/
      Gallery.tsx              # <Gallery /> — the whole M2 review page
  App.tsx                      # MODIFIED — renders <Gallery /> instead of the demo table

tests/
  render/
    sprite.test.tsx            # NEW — snapshot tests for 5 tier archetypes
    registry.test.ts           # NEW — every qualitative allele has a registered PathFn
  ui/
    gallery.test.tsx           # NEW — smoke test: 50 cards render, no throws
```

**Key type contracts:**

```ts
// src/render/paths/registry.ts
type PathFn = (palette: PaletteColors) => ReactNode;
type PaletteColors = { base: string; dark: string; light: string; accent: string };
export const PATHS: Readonly<Record<string, PathFn>>;

// src/render/sprite.tsx
interface SpriteProps {
  phenotype: Record<string, string>;  // from PhenotypeDescriptor.expressed
  palette: string;                    // palette allele id, e.g. 'pal_ash'
}
export function Sprite(props: SpriteProps): ReactElement;

// src/render/colors.ts
export function resolvePalette(paletteAlleleId: string): PaletteColors;
// Maps a palette allele ('pal_ash', etc.) to { base, dark, light, accent }.
// The 4-color ramp already exists in src/sim/data/palettes.ts as Palette.ramp[].
```

## Gallery page

`Gallery.tsx` replaces the demo table entirely. `App.tsx` becomes a thin wrapper that renders `<Gallery />`.

**Header:**
- `<h1>Morulium — M2 sprite gallery</h1>`
- One-line paragraph: `50 specimens, seed=1. Rarity distribution should be visible at a glance.`
- **Tiny inline tier legend:** 5 small colored dots labeled `Baseline / Strain / Mutant / Chimera / Progenitor`, matching the `TierBadge` colors, so a reader can eyeball the rarity spread across the grid.

**Grid:**
- CSS Grid, `repeat(auto-fit, minmax(200px, 1fr))`, gap 16px
- No pagination, no lazy loading — all 50 cards on the page (initial DOM size is fine given tiny inline SVGs)

**Specimen card:**
- Faint vat-panel background: very light tint of `palette.base` (mixed with white for a diagnostic clarity)
- **Border:** 1px, slightly darker palette tint, subtle rounded corners (4px)
- **Contents (top-to-bottom):**
  - `<Sprite>` centered, filling the card horizontally
  - `<TierBadge>` absolute-positioned top-right corner
  - Specimen ID as bottom footer strip: monospace, small, formatted `M-<seed padded to 5 digits>` (e.g., `M-01000` for row 0 at seed=1)

**TierBadge colors** (matches the biotech-specimen tone — cool greys ascending through warm accent):
- `Baseline`: slate grey `#94a3b8`
- `Strain`: teal `#14b8a6`
- `Mutant`: amber `#f59e0b`
- `Chimera`: violet `#a855f7`
- `Progenitor`: crimson `#e11d48`

Badge is a small pill: rounded, ~14px tall, badge color background, white text, uppercased tier name in `~10px` sans.

**Responsive behavior:** grid auto-fits — ~4 columns on desktop, 2 on tablet, 1 on mobile. No mobile-specific styles needed.

## Testing

Testing focuses on regression detection and completeness, not visual quality (which is human-judged at milestone review).

1. **SVG snapshot tests — `tests/render/sprite.test.tsx`**
   - For each of the 5 tier archetypes (a hand-crafted genome per tier that hits the tier's characteristic shape — e.g., all-baseline for Baseline, `ab_voltaic` homozygous for Progenitor), render `<Sprite>` via React Testing Library and Vitest's inline snapshot.
   - Regressions in any allele's path, layer draw order, or composition trip these.

2. **Registry completeness — `tests/render/registry.test.ts`**
   - Iterate `LOCI` for every qualitative locus (`head`, `carapace`, `locomotion`, `appendage`, `eyes`, `hide_pattern`, `aberration`). For each allele id in that locus, assert `PATHS[alleleId]` is defined.
   - `palette` locus is exempt (palette drives color, not shape).
   - Catches "artist forgot to author X" the moment a new allele lands in `data/alleles.ts`. This test is the single tripwire that makes new-allele additions surface visibly.

3. **Gallery smoke test — `tests/ui/gallery.test.tsx`**
   - Mount `<Gallery />`, assert 50 `[data-testid="specimen-card"]` elements exist, assert no thrown errors during render.
   - Not visual — just confirms the composition doesn't crash.

4. **No visual regression harness.** No Playwright screenshot diffs, no Percy, no Chromatic. Snapshot tests catch structural changes; visual quality is human-reviewed at milestone handoff by loading `https://morulium.com` after the auto-deploy.

**Expected test count after M2:** roughly 64 → 70+ (5 snapshot cases + 1 registry test + 1 gallery smoke + any per-allele expected-structure checks I decide to add during implementation).

## Non-goals (deferred to later milestones)

- **Interactive sprites** — no hover states, no click actions, no tooltips. M3 (Colony UI) is when interaction lands.
- **Sprite animation** — no CSS transitions, no SVG `<animate>`, no idle motion. Static SVG only.
- **Sprite scaling for M3+ contexts** — the fixed 200×280 viewBox will be reused, but the container CSS/sizing decisions for Colony grid, breeding preview, mission ticker are M3+/M4+/M5+ concerns.
- **Paid avatar layer** (game spec §11 — "on-demand only") — deferred entirely per that spec.
- **Sprite variation within an allele** — one path per allele, no per-genome jitter. If two units both express `head_maw`, their heads look identical (below the palette-color and neighboring-part-slot differences). Adding per-genome noise is a nice-to-have for M3+.
- **Backgrounds beyond palette-tinted panels** — no vat-fluid bubbles, no lab-schematic overlays, no shadows. The biotech card frame is the environment.

## Open logistics

- **`.superpowers/` gitignore hardening** — from earlier notes, `.superpowers/sdd/` isn't in `.gitignore` but is untracked-by-luck. If any implementer accidentally `git add`s inside it, the whole ledger tree could land in a commit. Not critical for M2 but worth a one-line `.gitignore` addition somewhere in the milestone. (Not folded into the M2 plan tasks — flag it as a Minor observation for a future cleanup.)
- **Favicon** — still 404s on the deployed site. Small nice-to-have; can be included in M2 as a bonus (an SVG "M" glyph or a stylized Morula icon) or deferred. Ask at implementation-planning time.
- **Sprite art authorship model** — this spec assumes I (the model) author all ~30 allele SVG paths during implementation, in the biotech-specimen style, iterating until each reads clearly. If the human wants to hand-author any specific allele's path, they can override at the file level (each allele is one small file, easy to swap).
- **`Sprite` component location** — `src/render/sprite.tsx` is a React component (uses JSX) but the rest of `src/render/` is data (path functions returning ReactNode). This mixes concerns slightly. Keeping them together for M2 to preserve locality; if `src/render/` grows past ~40 files by M5, revisit whether to split.
