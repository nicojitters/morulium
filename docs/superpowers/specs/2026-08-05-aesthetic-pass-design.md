# Aesthetic Pass — Design

**Date:** 2026-08-05
**Author:** brainstorm session
**Status:** approved by user, ready for implementation planning
**North-star reference:** `docs/aesthetic-vibe.md` (to be moved in as part of this pass)

---

## 1. North star & scope

**North star:** the game becomes what the aesthetic doc describes — clinical dark-biotech villainy — while preserving every existing gameplay behavior and test assertion. When the player lands on a screen, it should feel like badging into a specimen-management console; when they open the map, like walking into a war room.

**In scope:**

- Global design tokens (palette, type, motion, spacing, elevation, glow)
- Global juice layer (hover, focus-visible, transitions, keyframes, scrollbars, selection)
- Dark ground applied everywhere, with the two-register split (Cultivation / Conquest)
- Wordmark integrated into the app shell and NewGameGate
- Every screen gets a pass: `Colony`, `DNALab`, `Breed`, `Incursion`, `ConquestMap`, `Vivarium`, `Vat`, `Sequencer`, `Registry`, `NewGameGate`
- Every existing component in `src/ui/components/*` gets retokenized; a subset gets bespoke treatment (see §7)
- Favicon (a procedurally-drawn glowing morula cluster SVG — no asset exists yet)
- The aesthetic-vibe doc moves from `~/Downloads` into `docs/`

**Out of scope (YAGNI):**

- Any change to game mechanics, state shape, or test assertion surface
- Sprite renderer changes (its background may be tinted, but sprite logic is untouched)
- Audio (not mentioned in the aesthetic doc; separate axis)
- New screens or new component primitives beyond what juice requires
- A design-system extraction (Storybook, tokens package, etc.)
- Mobile layout pass, dark-mode toggle, third-party UI libraries

---

## 2. Foundation decisions (already resolved)

Locked before design walkthrough:

- **Registers:** full divergence — Cultivation surfaces skew teal-glass + bio-green; Conquest surfaces skew rust/iron/stencil. Same tokens, different role assignments per register. This makes the tension between the two halves of the game tangible.
- **Typography:** Google Fonts webfonts. Display: Big Shoulders Display (with Oswald fallback); UI: Inter; Mono: JetBrains Mono. Loaded via `<link>` in `index.html`.
- **CSS layer:** new `src/ui/theme.css` with CSS custom properties, keyframes, resets, pseudo-state rules. `src/ui/styles.ts` stays as-is structurally; hex codes refactored to `var(--…)` where possible; global classes composed via `className` on components. Minimum churn, maximum leverage.

---

## 3. Design tokens

Lives in `src/ui/theme.css` as CSS custom properties, plus a matching `src/ui/tokens.ts` for anything inline styles need to read as JS strings.

### Palette

```
Grounds (near-black, teal-tinged)
  --ground-void:      #05070a   /* deepest — page bg, behind vats */
  --ground-deep:      #0a1014
  --ground-panel:     #0f1720   /* panel/card fill */
  --ground-raised:    #142130   /* elevated over panel */

Structure (deep teal)
  --teal-abyss:       #0a1e26
  --teal-deep:        #0f3541
  --teal:             #14b8a6   /* narrow structural accents only */

Menace / dread (bruised purple)
  --bruise-deep:      #1a0f2b
  --bruise:           #3d1f56
  --bruise-glow:      #6b3aa0

Hero accent — bio-green glow (SPARINGLY)
  --bio-green:        #7fff9b
  --bio-green-dim:    #46a05e
  --bio-green-deep:   #1a3a24
  --bio-glow:         0 0 12px rgba(127,255,155,0.45)
  --bio-glow-hot:     0 0 20px rgba(127,255,155,0.75), 0 0 4px rgba(127,255,155,1)

Machinery (rust / iron / steel) — Conquest register
  --iron-plate:       #1a1a1c
  --iron:             #2a2a2e
  --iron-light:       #4a4a50
  --rust:             #7a3419
  --rust-hot:         #b8541e
  --steel-cool:       #6b7280

Text / ink
  --ink-primary:      #e6ecec   /* against dark grounds */
  --ink-secondary:    #9aa8b0
  --ink-dim:          #6b7885
  --ink-lab:          #b8f0d0   /* text over teal/lab surfaces */

Signal (small, purposeful)
  --signal-warn:      #f0b840
  --signal-danger:    #e04848
  --signal-good:      var(--bio-green)

Tier ramp (retuned for dark ground)
  --tier-baseline:    #7889a0
  --tier-strain:      #4dd3a8
  --tier-mutant:      #f0b840
  --tier-chimera:     #a86bd8
  --tier-progenitor:  #ff5a68
```

**Discipline:** curated ramps only. Never raw color at call sites. If it isn't a token, it doesn't ship.

**Bio-green discipline (critical):** bio-green is the **hero accent** — it must remain rare enough that every appearance reads as "alive". Practical rule: default primary buttons use **teal borders** and only glow bio-green on hover / press / active-state; solid bio-green rims (`--rim-bio`) are reserved for hero moments and live-state indicators only. Specifically:

- **Solid bio-green rim / glow allowed:** NewGameGate hero CTA, BreedButton when both parents locked, selected-specimen `.bio-pulse`, filled parent-slot pair pulse, decant-emerge flash, captured-territory stamp, toast rim-flash on entry.
- **Bio-green as hover / focus glow only:** all standard `.btn--primary`, focused inputs, `.card:hover`, nav-tab hover.
- **Never:** whole-panel bio-green fills, bio-green body text, bio-green backgrounds outside sprite radial gradients.

When in doubt, the surface is teal / iron and bio-green only lights up on interaction.

### Typography

```
--font-display:   'Big Shoulders Display', 'Oswald', system-ui, sans-serif;
--font-ui:        'Inter', system-ui, -apple-system, sans-serif;
--font-mono:      'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace;
```

Loaded via `<link>` from Google Fonts. Display font is condensed and heavy (stamped-iron). Mono has the instrument-readout feel.

### Type scale

```
--fs-display:     28px / 32px / weight 800 / tracking 0.04em / uppercase
--fs-header:      20px / 24px / weight 700 / uppercase
--fs-subheader:   15px / 20px / weight 600
--fs-body:        14px / 20px / weight 400
--fs-caption:     12px / 16px / weight 400
--fs-data:        13px / mono / weight 500 / tracking 0.02em
--fs-tiny:        10px / mono / weight 500 / tracking 0.08em / uppercase
```

### Motion

```
--ease-lab:    cubic-bezier(0.22, 1, 0.36, 1);        /* wet, settling */
--ease-clinic: cubic-bezier(0.4, 0, 0.2, 1);          /* standard */
--ease-stamp:  cubic-bezier(0.68, -0.15, 0.27, 1.4);  /* iron slam */
--dur-instant: 80ms
--dur-fast:    160ms
--dur-med:     280ms
--dur-slow:    480ms
--dur-slower:  720ms
```

### Elevation, borders, radii

Dark-ground appropriate — drop shadows are invisible on black, so we use inner glow and rim light:

```
--radius-xs: 2px      /* stamped chips */
--radius-sm: 4px      /* buttons, small cards */
--radius-md: 8px      /* cards, panels */
--radius-lg: 12px     /* modals, big surfaces */

--rim-inner: inset 0 1px 0 rgba(255,255,255,0.06);
--rim-teal:  0 0 0 1px rgba(20,184,166,0.35), inset 0 1px 0 rgba(180,240,220,0.08);
--rim-iron:  0 0 0 1px rgba(180,180,190,0.15), inset 0 1px 0 rgba(255,255,255,0.04);
--rim-bio:   0 0 0 1px rgba(127,255,155,0.4), var(--bio-glow);
```

---

## 4. Global juice layer (`src/ui/theme.css`)

The juice that lifts everything without touching component code — because it targets class selectors, pseudo-states, and keyframes that inline styles cannot reach.

### Resets & atmosphere

- `html, body` painted `--ground-void`, `color-scheme: dark`
- Scrollbars restyled: 6px, `--iron` thumb, `--ground-panel` track, no arrows
- `::selection` → `bio-green` on `bruise-deep`
- `:focus-visible` → 2px `bio-green` rim + `--bio-glow`, offset 2px
- Smooth font rendering, `text-rendering: optimizeLegibility`

### Interaction primitives (opt-in via className)

```css
.btn          /* base tokens for padding, radius, uppercase, mono, transition */
.btn--primary /* teal border, bio-green hover glow */
.btn--danger  /* rust border, rust-hot hover — Incursion Launch, Cull */
.btn--ghost   /* transparent, ink-secondary; hover teal border */
.btn--stamp   /* stencil/uppercase, iron plate — Conquest-side actions */
.btn:hover    /* brightness(1.08), rim glow strengthens */
.btn:active   /* brightness(0.95), inset shadow */
.btn:disabled /* opacity 0.4, no cursor */
```

Similar families: `.card`, `.card--specimen`, `.card--front`, `.panel`, `.pill`, `.chip`, `.hud-item`, `.toast`, `.modal`.

### Keyframes library

```
@keyframes bio-pulse         /* selected specimen: rim glow breathes, ~2.4s */
@keyframes vat-bubble        /* subtle rise-and-pop behind Vat title */
@keyframes drip              /* bio-green drop trailing down 3px, fade */
@keyframes flash-number      /* HUD count change: bio-green flash 240ms */
@keyframes stamp-in          /* press: scale 0.94 → 1.02 → 1, 220ms */
@keyframes toast-slide       /* 280ms slide-in with rim glow flash */
@keyframes screen-fade       /* nav switch: 160ms opacity + 4px y-translate */
@keyframes membrane-shimmer  /* diagonal sheen over glass panels, 8s loop */
@keyframes ticker-glitch     /* 1-frame RGB split, 40ms — Incursion beats */
@keyframes decant-emerge     /* new card fade+scale 0.9 → 1, 380ms */
```

### Reduced motion

`@media (prefers-reduced-motion: reduce)` disables all keyframes and reduces all transitions to `1ms`. Non-negotiable.

### Text effects

- `.text-glow-bio` — bio-green text with `text-shadow: 0 0 6px currentColor`
- `.text-stamp` — display font, uppercase, condensed, tiny drop-shadow to fake ink bleed
- `.text-readout` — mono, tracking, `--ink-dim`

---

## 5. Register mapping

The register is applied via a `data-register` attribute on the screen root (`<main>`), which flips the appropriate CSS variables in scope. Same tokens, different role assignments.

| Screen | Register | Signature treatment |
|---|---|---|
| `NewGameGate` | **Lab (menace)** | Full-bleed void, wordmark hero, bio-green CTA, faint bubble bg |
| `Colony` | **Lab** | Panel = glass tank; teal-rim cards; drip motif on section headers |
| `Vat` | **Lab, cold** | Coldest lab; teal-black, bruise accents, bubble-loop bg, red-shift on cull |
| `DNALab` | **Lab, hot** | Bio-green featured; glowing sequencer readouts; mono-heavy |
| `Breed` | **Lab, wet** | Slot borders pulse when both parents locked; bio-drip on breed-ready button |
| `Vivarium` | **Lab** | Grid of glass tanks; capacity gauge in header |
| `Registry` | **Lab, archival** | Colder; deep teal on void; ink-lab body; minimal glow |
| `Sequencer` | **Lab placeholder** | Under-construction plate, stencil-taped |
| `Incursion` | **Conquest** | Iron plate, stencil headers, rust for danger; ticker gains CRT + glitch |
| `ConquestMap` | **Conquest** | Iron/steel; stamped territories; captured = bio-green over iron |

**The register switch is visible.** Navigating Colony → ConquestMap: ground shifts colder, borders sharpen from teal to iron, ink shifts from `--ink-lab` to `--ink-primary`. It should feel like walking from a wet lab into a briefing room.

`AppShell` is register-neutral (hosts both), but the active nav tab picks up a hint of the destination's register: teal underline for Lab tabs, rust underline for Conquest tabs.

---

## 6. Wordmark & branding

### Assets

- `pixellab-Pixel-art-wordmark-reading--MO-1785789971448.png` → `src/assets/wordmark.png`
- `logo-og.png` → `src/assets/og-image.png` (for `<meta property="og:image">`)
- `~/Downloads/morulium-aesthetic-vibe.md` → `docs/aesthetic-vibe.md`
- New: `src/assets/favicon.svg` — procedurally-drawn morula cluster (7 pixel-art bio-green cells packed hex, on `--ground-void`, soft bio-glow)
- Updated `<title>Morulium — Cultivate. Conquer.</title>` and `<meta name="description">`

### Placement

Source wordmark is **344 × 192** pixel art. Pixel art requires **integer scaling** (1×, 2×, 0.5×) to render crisply with `image-rendering: pixelated` — non-integer scale factors reintroduce blur even with nearest-neighbor. All placements below use integer scales.

- **`NewGameGate`** — wordmark is the hero at 344 × 192 (1×), centered with generous whitespace. Below: "New Colony" hero CTA (bio-green rim + `--bio-glow-hot`) and "Continue" ghost button when a save exists. Slow drip animation on one letter (~4s cycle, looping) — reinforces the wordmark's motif.
- **`AppShell` nav** — 172 × 96 (0.5×) at top-left, above the tab row. On hover: single bio-green sheen sweep left-to-right (~600ms), then rests.
- **Elsewhere:** never repeated. The wordmark is a signature, not decoration.

**Pixel-perfect:** `image-rendering: pixelated` on all wordmark placements.

---

## 7. Per-screen pass

For each screen: what the pass changes visually beyond token adoption. Structure and testids are untouched.

- **`NewGameGate`** — Full-bleed void. Wordmark hero at ~340px with slow bio-drip on one letter. Two stacked buttons. Tiny mono caption: "Morulium — v0.0.1 · specimen management console".
- **`Colony`** — Display-font "COLONY" header left, `SerumBadge` right. `SpecimenCard` grid on `--ground-panel`. Section dividers between tier groups: thin teal rule with `.text-stamp` tier label. `EmptyColony` becomes a dashed-teal glass panel with mono hint "Awaiting decant".
- **`Vat`** — Coldest lab. Deep teal-black. "Cull All" uses `.btn--danger`. Header: subtle vat-bubble loop bg (opacity 0.06) behind display-font "THE VAT". Card selection switches from blue outline to `.bio-pulse` rim. Each tier group: stamped label with tier-colored rule.
- **`DNALab`** — Bio-green featured heavily. Sequencer-style readouts (mono, tracking, ink-lab on teal-deep). Genome bars/gauges use bio-green fills.
- **`Breed`** — Empty parent slots: dashed teal outline, mono placeholder. Both filled: slot borders switch to `.bio-pulse` and `BreedButton` becomes primary bio-green with `.bio-glow-hot`. The "×" between parents: stamped mono in `--ink-dim`.
- **`Vivarium`** — Grid of glass-tank cards. Header shows capacity as a horizontal gauge: filled portion bio-green, empty portion teal-deep, iron rim. At cap: gauge tip pulses.
- **`Registry`** — Archival: no glow, restrained. Deep-teal panel on void. Vocabulary entries as stamped mono headers with ink-lab body. New discovery gets one-time `.bio-pulse` rim on first render, then cold.
- **`Sequencer`** (`SequencerPlaceholder`) — Iron plate with stamped diagonal "UNDER CONSTRUCTION" band. Mono body: "Sequencing subsystem — offline. Deliverable in a later capital cycle."
- **`Incursion`** — Full Conquest register. Iron bg, stamped ALL-CAPS headers, rust launch button. `IncursionTicker` keeps dark-slate ticker but gains CRT scanline overlay and per-beat 1-frame RGB-split glitch. Slot selection: `.stamp-in` press. Result summary: big iron plaque, verdict stamped diagonally.
- **`ConquestMap`** — War-room. Iron ground. Regions as stamped territorial panels. Captured = bio-green stamp overlay (organic-overtaking-metal — the wordmark motif applied to gameplay). Progress bars: rust when contested, bio-green as pushed. Region 1 header stamped with roman numerals / military codename.

---

## 8. Per-component pass

Most components just adopt tokens and lose their light palette. These get bespoke treatment beyond that:

- **`AppShell`** — Nav tabs restyled: Lab tabs get teal underline, Conquest tabs get rust underline. Active tab heavier, rim-lit. Locked tabs: iron-stamped, low-opacity, `title` retained.
- **`StatusHud`** — Mono readouts on `--ground-raised`, thin rim. HUD numbers use `.flash-number` when they change (small mount hook keyed on value).
- **`SpecimenCard`** — Fill `--ground-panel` with `--rim-teal`. Sprite bg gets faint radial gradient (bio-green center → teal-deep edges) — light behind glass. Footer uses `.text-readout`. Tier badge: stamped chip with tier color. Injured: warm amber wash. Culled: subtle rust-red diagonal stripe overlay + stamped "CULLED".
- **`FrontCard`** — Iron plate. Selected: `--rim-iron` sharpens + bio-green underline. Captured: bio-green stamp overlay. Cooldown: opacity + slow diagonal barber-pole animation on border.
- **`ParentSlot`** — Empty: dashed teal, mono placeholder. Filled: teal rim, `.bio-pulse` when both parents present.
- **`GarrisonPickerOverlay`** — Instrument panel: dark, mono, thin teal rim. Hover row: teal fill 0.1, bio-green left rule.
- **`IntroModal`** — Iron-plate modal on `--ground-void @ 0.8` + backdrop-filter blur 4px. Stamped title, bio-green primary CTA.
- **`IncursionTicker`** — Keeps theater metaphor. Adds scanline overlay + per-beat glitch. Skip button gets stamped treatment.
- **`RewardToast` / `UnlockedToast` / `ActionToast`** — Slide-in bottom-right on iron rail with bio-green rim-flash on entry (240ms), then rest. Auto-dismiss unchanged.
- **`DirectiveBanner`** — Iron plate with stencil left-band. Amber signal color for active directive.
- **`FirstVisitCallout`** — Iron-plate treatment, teal accent bar (replacing blue).
- **`DevPanel`** — Deliberately utilitarian: iron plate, mono, no glow. Service hatch behind the console.
- **`TermTooltip`** — Dark instrument bubble, mono body, teal rim. Arrow retained.
- **`AwaySummary`** — Full-screen instrument report on void. Stamped "AWAY REPORT" header, mono breakdown rows.
- **`IncursionResultSummary`** — Big iron plaque. Verdict stamped diagonally (using the game's actual verdicts).

---

## 9. Juice moments

The doc says "menacing calm, not busy" — juice is **restrained and satisfying**, not bouncy. Every one below is small; aggregate is what feels alive.

### Hover / focus (everywhere)

- Buttons: brightness +8%, rim glow strengthens (`--dur-fast`)
- Cards: 1px inner-rim brightens, subtle scale 1.005 (`--dur-fast`)
- Nav tabs: underline eases in (`--dur-fast`)

### Selection

- Specimen selected: rim switches to `.bio-pulse` (~2.4s breathing)
- Parent slot filled: rim starts pulsing when the pair is complete
- Front card selected: `.stamp-in` press

### Screen transitions

- Nav → new screen: 160ms opacity + 4px y-slide via `.screen-fade`
- Register switch (Lab ↔ Conquest): 280ms cross-fade of ground color

### Data changes

- HUD count changes (morula, serum, ops): `.flash-number` bio-green flash
- New unit decanted: `.decant-emerge` on the new card
- Term auto-discovered: rim pulse on its Registry entry once

### Feedback moments

- Decant button press: 100ms bio-green rim-flash → new card appears
- Breed button press: heavier `.stamp-in`, then card emerges
- Incursion Launch: `.stamp-in` on the button (rust), ticker begins on `.screen-fade`
- Cull / Vat run: brief opacity dip on the batch cards → they clear
- Toast entry: `.toast-slide` with rim-flash

### Ambient (subtle, restrained)

- Vat header background: `.vat-bubble` loop at opacity 0.06
- Wordmark on hover in shell: 600ms bio-green sheen sweep, once
- Wordmark on NewGameGate: continuous slow drip on one letter (~4s cycle)
- Glass panels: `.membrane-shimmer` diagonal sheen, 8s loop, opacity 0.03
- Incursion ticker: CRT scanlines + 1-frame RGB-split glitch on each new beat

### What we are NOT juicing (guardrails)

- No screen shake
- No particle bursts
- No bouncy easing outside `.stamp-in`
- No sparkle / confetti effects
- No pop / whoosh audio (no audio at all this pass)
- No decorative animations that don't communicate state

---

## 10. Sequencing (10 phases, six blocks)

Each phase ends in a state where `npm run build && npm test` is green and the game is playable — no half-shipped visual states. Each phase = a single commit for bisectability.

### A. Foundation (in order, must land first)

1. **Add `theme.css` + `tokens.ts`** — CSS variables, keyframes, resets, scrollbars, focus rings, `prefers-reduced-motion`. Import into `main.tsx`. Nothing visual changes yet. ~1hr, zero test risk.
2. **Wire fonts** — Google Fonts `<link>` in `index.html`, body font stack, verify one page.
3. **Repaint `<body>` + AppShell + StatusHud** — dark ground global. Nav retokenized. HUD becomes an instrument strip. This is when the game visibly transforms. ~2hr.

### B. Brand + entry

4. **Move assets into repo + wire wordmark + favicon** — `wordmark.png`, `favicon.svg` (procedural morula), OG image; `aesthetic-vibe.md` → `docs/`. Update `index.html` title/meta.
5. **`NewGameGate` full pass** — wordmark hero, drip, dark ground, primary/ghost buttons.

### C. Global juice primitives

6. **Ship `.btn`, `.card`, `.panel`, `.pill`, `.chip`, `.toast`, `.modal` primitives** — global CSS classes. Refactor `styles.ts` entries to compose with these via `className` on components (small pattern shift; one place per component). Hover/focus/press now work everywhere.

### D. Cultivation sweep (biggest chunk)

7. **`Colony`, `Vivarium`, `Registry`, `SpecimenCard`** — apply Lab register.
8. **`Vat`, `DNALab`, `Breed`, `ParentSlot`, `BreedButton`, `DecantButton`** — the wet lab. Bio-pulse selection, breed pair rim-pulse, decant-emerge on new specimens.

### E. Conquest sweep

9. **`Incursion`, `IncursionTicker`, `IncursionBeat`, `IncursionResultSummary`, `FrontCard`, `GarrisonPickerOverlay`** — Conquest register: iron plate, stamp typography, rust-danger, CRT scanlines.
10. **`ConquestMap`** — war-room surface, stamped territories, captured = bio-green over iron. Register switch on nav polished.

### F. Overlays + final polish

- `IntroModal`, `AwaySummary`, `RewardToast`, `UnlockedToast`, `ActionToast`, `DirectiveBanner`, `FirstVisitCallout`, `TermTooltip`, `SequencerPlaceholder`, `DevPanel`, `EmptyColony` — retokenize + juice.
- Final QA: reduced-motion, tab order + focus rings, contrast spot-checks, screen transitions.

### Phasing rationale

- Foundation (1–3) is boring but load-bearing — do first, in isolation, so later phases lean on tokens without local hacks.
- NewGameGate (5) lands the brand statement before interior rework — first impression right even if interior mid-pass.
- Global primitives (6) exist before per-screen work, so screen passes apply classes rather than inventing one-off styles.
- Cultivation (7–8) before Conquest (9–10) because Cultivation is what players see most; if a phase is cut short, most of the game still feels right.
- Overlays last so their tokens are stable.

---

## 11. Non-goals (YAGNI)

Explicit list of things I could be tempted into but will not do this pass:

- No new components.
- No Storybook / design-system extraction. Tokens live in `theme.css`; that is the whole system.
- No refactor of `styles.ts` structure beyond token adoption + composing with global classes. Same file, same shape, same exports.
- No changes to `sim/` or `state/`. Zero game-mechanic touching.
- No changes to sprite renderer. Sprites keep looking the same (though card behind them goes dark).
- No audio.
- No mobile-specific layout pass.
- No dark-mode toggle. The game is dark. There is no light mode.
- No new pages or routes.
- No third-party UI libraries (headlessui, framer-motion, radix). Everything is CSS + React. Framer-motion is tempting for juice but overkill for what we need.
- No animation for its own sake. Every animation must communicate state or reinforce brand.
- No test rewrites. `data-testid` and role queries preserved. If a test breaks because a color or class changed, we fix the test — but the assertion surface does not shift.

---

## 12. Success criteria

- Visiting the game for the first time, a stranger identifies "villain lab / war-room console" as the intended mood without being told.
- Every interactive element responds visibly to hover, focus, and press.
- Nav → new screen, Lab → Conquest, and back all read as intentional transitions, not flickers.
- The wordmark reads as the game's signature; the favicon reads as a small glowing morula at 16×16.
- `npm run build` clean; `npm test` green; existing sprite rendering unchanged.
- `prefers-reduced-motion` disables animation without breaking the visual language.
- No component file grows disproportionately (juice mostly lives in `theme.css`, not scattered inline).
