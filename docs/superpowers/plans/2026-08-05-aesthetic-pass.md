# Aesthetic Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Morulium from a light generic web-app aesthetic into a clinical dark-biotech villainy console with restrained, meaningful juice — while preserving every existing gameplay behavior and test.

**Architecture:** A new `src/ui/theme.css` holds all design tokens as CSS custom properties, plus global classes for buttons/cards/panels/toasts/modals and named keyframes for the juice layer. A companion `src/ui/tokens.ts` re-exports the same tokens as TS strings for use inside inline styles. The existing `src/ui/styles.ts` structure is preserved but every hex code is replaced with `var(--…)`, and components adopt global `className` values where global classes replace inline styling. Each screen root gets a `data-register="lab" | "conquest"` attribute that flips role-assignment CSS variables in scope — same tokens, different palette per screen. The wordmark PNG lives in `src/assets/` and a procedurally-drawn morula SVG serves as the favicon.

**Tech Stack:** React 18, TypeScript, Vite 5, Vitest, Zustand — no new runtime dependencies. Google Fonts webfonts loaded via `<link>`.

**North-star reference (READ FIRST):** `docs/superpowers/specs/2026-08-05-aesthetic-pass-design.md`. This plan implements that spec. When any task feels ambiguous, the spec is authoritative.

## Global Constraints

- **No test rewrites of assertion surface.** Existing `data-testid`, `getByRole`, and behavioral assertions must keep passing. If a color/class change breaks a test, update the test's *color/class matcher* only. Never change what the test is asserting about behavior.
- **No changes to `src/sim/**` or `src/state/**`.** Zero game-mechanic touching. Any such change means the task boundary is wrong.
- **No changes to `src/render/**` sprite logic.** Card backgrounds change, but sprite rendering must produce identical pixels.
- **No third-party UI libraries.** No headlessui, radix, framer-motion, tailwind, etc. Pure CSS + React.
- **No inline hex codes after retokenization.** Every color in `src/ui/styles.ts` reads via `var(--…)` or the matching `TOKENS.*` from `src/ui/tokens.ts`. Grep-checked in the final task.
- **`prefers-reduced-motion: reduce` is non-negotiable.** All keyframes and transitions collapse to `1ms` under this media query.
- **Pixel art scales at integer factors only.** The wordmark (344 × 192) renders at 344×192 (1×) in NewGameGate and 172×96 (0.5×) in AppShell. `image-rendering: pixelated` on every wordmark `<img>`.
- **After every task, `npm run typecheck && npm test && npm run build` all pass.** No half-shipped phases.
- **Commit boundaries = task boundaries.** One commit per task for bisectability.
- **Bio-green is the hero accent.** Solid bio-green rims/glows are reserved for hero moments and live-state indicators. Default primary buttons use teal borders and only light bio-green on hover / press. See spec §3 "Bio-green discipline" — this rule is load-bearing for the whole aesthetic.

---

## File Structure

**New files:**
- `src/ui/theme.css` — CSS custom properties, resets, focus rings, scrollbars, keyframes, global classes for buttons/cards/panels/pills/chips/toasts/modals, text-effect classes, `prefers-reduced-motion` block
- `src/ui/tokens.ts` — TS `const TOKENS = { … }` mirroring the CSS variables as JS strings, plus a `REGISTER` type
- `src/assets/wordmark.png` — moved from `~/Downloads/pixellab-Pixel-art-wordmark-reading--MO-1785789971448.png`
- `src/assets/og-image.png` — moved from `~/Downloads/logo-og.png`
- `src/assets/favicon.svg` — procedurally-drawn morula cluster
- `src/ui/components/Wordmark.tsx` — reusable pixel-perfect wordmark `<img>` with size variants
- `docs/aesthetic-vibe.md` — moved from `~/Downloads/morulium-aesthetic-vibe.md`

**Modified files (heavy):**
- `index.html` — title, meta description, OG image, favicon, Google Fonts `<link>`
- `src/main.tsx` — one-line `import './ui/theme.css'`
- `src/ui/styles.ts` — every hex code retokenized to `var(--…)`; several entries deleted in favor of global classes; a handful of new entries added for register-specific looks
- `src/ui/components/AppShell.tsx` — wordmark slot, register-aware nav tabs
- `src/ui/components/StatusHud.tsx` — instrument-strip look, `.flash-number` on count changes
- `src/ui/components/SpecimenCard.tsx` — dark card + sprite radial + tier chip + injured/culled overlays
- `src/ui/components/FrontCard.tsx` — iron plate + captured stamp
- `src/ui/components/IncursionTicker.tsx` — CRT scanline + per-beat glitch
- `src/ui/components/IntroModal.tsx` — iron-plate modal on blurred void backdrop
- Every remaining component in `src/ui/components/*.tsx` — className adoption + token references
- Every screen in `src/ui/screens/*.tsx` — `data-register` attribute, dark ground, retokenized

**Untouched:**
- `src/sim/**`, `src/state/**`, `src/render/**`, all tests' behavioral assertions

---

## Task 1: Design tokens — `theme.css` skeleton + `tokens.ts`

**Files:**
- Create: `src/ui/theme.css`
- Create: `src/ui/tokens.ts`
- Modify: `src/main.tsx` (add `import './ui/theme.css';` after the react imports)

**Interfaces:**
- Consumes: nothing (foundation)
- Produces: CSS custom properties `--ground-void`, `--ground-deep`, `--ground-panel`, `--ground-raised`, `--teal-abyss`, `--teal-deep`, `--teal`, `--bruise-deep`, `--bruise`, `--bruise-glow`, `--bio-green`, `--bio-green-dim`, `--bio-green-deep`, `--bio-glow`, `--bio-glow-hot`, `--iron-plate`, `--iron`, `--iron-light`, `--rust`, `--rust-hot`, `--steel-cool`, `--ink-primary`, `--ink-secondary`, `--ink-dim`, `--ink-lab`, `--signal-warn`, `--signal-danger`, `--signal-good`, `--tier-baseline`, `--tier-strain`, `--tier-mutant`, `--tier-chimera`, `--tier-progenitor`, `--font-display`, `--font-ui`, `--font-mono`, `--ease-lab`, `--ease-clinic`, `--ease-stamp`, `--dur-instant`, `--dur-fast`, `--dur-med`, `--dur-slow`, `--dur-slower`, `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--rim-inner`, `--rim-teal`, `--rim-iron`, `--rim-bio`, and TS export `TOKENS` mirroring these + a `Register = 'lab' | 'conquest'` type.

- [ ] **Step 1: Baseline verify — current tests green**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass. Nothing to fix here — this is the "before" state.

- [ ] **Step 2: Create `src/ui/theme.css` with all design tokens**

Write this exact content:

```css
/* ================================================================
   Morulium — theme.css
   All design tokens, resets, focus rings, scrollbars, keyframes,
   and global juice classes. Component styles compose with these.
   ================================================================ */

:root {
  /* Grounds (near-black, teal-tinged) */
  --ground-void:      #05070a;
  --ground-deep:      #0a1014;
  --ground-panel:     #0f1720;
  --ground-raised:    #142130;

  /* Structure (deep teal) */
  --teal-abyss:       #0a1e26;
  --teal-deep:        #0f3541;
  --teal:             #14b8a6;

  /* Menace / dread (bruised purple) */
  --bruise-deep:      #1a0f2b;
  --bruise:           #3d1f56;
  --bruise-glow:      #6b3aa0;

  /* Hero accent — bio-green (SPARINGLY) */
  --bio-green:        #7fff9b;
  --bio-green-dim:    #46a05e;
  --bio-green-deep:   #1a3a24;
  --bio-glow:         0 0 12px rgba(127, 255, 155, 0.45);
  --bio-glow-hot:     0 0 20px rgba(127, 255, 155, 0.75), 0 0 4px rgba(127, 255, 155, 1);

  /* Machinery — Conquest register */
  --iron-plate:       #1a1a1c;
  --iron:             #2a2a2e;
  --iron-light:       #4a4a50;
  --rust:             #7a3419;
  --rust-hot:         #b8541e;
  --steel-cool:       #6b7280;

  /* Text / ink */
  --ink-primary:      #e6ecec;
  --ink-secondary:    #9aa8b0;
  --ink-dim:          #6b7885;
  --ink-lab:          #b8f0d0;

  /* Signal */
  --signal-warn:      #f0b840;
  --signal-danger:    #e04848;
  --signal-good:      var(--bio-green);

  /* Tier ramp (retuned for dark ground) */
  --tier-baseline:    #7889a0;
  --tier-strain:      #4dd3a8;
  --tier-mutant:      #f0b840;
  --tier-chimera:     #a86bd8;
  --tier-progenitor:  #ff5a68;

  /* Typography */
  --font-display: 'Big Shoulders Display', 'Oswald', system-ui, sans-serif;
  --font-ui:      'Inter', system-ui, -apple-system, sans-serif;
  --font-mono:    'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;

  /* Motion */
  --ease-lab:    cubic-bezier(0.22, 1, 0.36, 1);
  --ease-clinic: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-stamp:  cubic-bezier(0.68, -0.15, 0.27, 1.4);
  --dur-instant: 80ms;
  --dur-fast:    160ms;
  --dur-med:     280ms;
  --dur-slow:    480ms;
  --dur-slower:  720ms;

  /* Radii */
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Rim treatments (drop shadows are invisible on black; use inner glow + rim light) */
  --rim-inner: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  --rim-teal:  0 0 0 1px rgba(20, 184, 166, 0.35), inset 0 1px 0 rgba(180, 240, 220, 0.08);
  --rim-iron:  0 0 0 1px rgba(180, 180, 190, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  --rim-bio:   0 0 0 1px rgba(127, 255, 155, 0.4), var(--bio-glow);
}

/* Register role assignments — screens set data-register to flip these */
[data-register='lab'] {
  --register-ground:     var(--ground-void);
  --register-panel:      var(--ground-panel);
  --register-raised:     var(--ground-raised);
  --register-rim:        var(--rim-teal);
  --register-ink:        var(--ink-lab);
  --register-accent:     var(--teal);
  --register-hover-glow: var(--bio-glow);
}

[data-register='conquest'] {
  --register-ground:     var(--iron-plate);
  --register-panel:      var(--iron);
  --register-raised:     var(--iron-light);
  --register-rim:        var(--rim-iron);
  --register-ink:        var(--ink-primary);
  --register-accent:     var(--rust);
  --register-hover-glow: 0 0 10px rgba(184, 84, 30, 0.5);
}

/* ---------- Global reset + atmosphere ---------- */

html, body {
  background: var(--ground-void);
  color: var(--ink-primary);
  color-scheme: dark;
  margin: 0;
  padding: 0;
  min-height: 100vh;
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

*, *::before, *::after { box-sizing: border-box; }

::selection {
  background: var(--bio-green);
  color: var(--bruise-deep);
}

/* Scrollbars — dark, thin, unobtrusive */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--ground-panel); }
::-webkit-scrollbar-thumb { background: var(--iron); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--iron-light); }

* {
  scrollbar-width: thin;
  scrollbar-color: var(--iron) var(--ground-panel);
}

/* Focus rings — bio-green everywhere */
:focus-visible {
  outline: 2px solid var(--bio-green);
  outline-offset: 2px;
  box-shadow: var(--bio-glow);
}
:focus:not(:focus-visible) { outline: none; }

/* Kill the ugly default button appearance so components can style freely */
button {
  font-family: inherit;
  color: inherit;
}
```

- [ ] **Step 3: Create `src/ui/tokens.ts` mirror**

Write this exact content:

```ts
/**
 * TS mirror of the CSS custom properties in theme.css.
 * Use inside inline styles where `var(--…)` isn't accepted or is awkward.
 * If you add a token to theme.css, add it here too — grep-checked in the
 * final task.
 */

export type Register = 'lab' | 'conquest';

export const TOKENS = {
  groundVoid:    '#05070a',
  groundDeep:    '#0a1014',
  groundPanel:   '#0f1720',
  groundRaised:  '#142130',

  tealAbyss:     '#0a1e26',
  tealDeep:      '#0f3541',
  teal:          '#14b8a6',

  bruiseDeep:    '#1a0f2b',
  bruise:        '#3d1f56',
  bruiseGlow:    '#6b3aa0',

  bioGreen:      '#7fff9b',
  bioGreenDim:   '#46a05e',
  bioGreenDeep:  '#1a3a24',

  ironPlate:     '#1a1a1c',
  iron:          '#2a2a2e',
  ironLight:     '#4a4a50',
  rust:          '#7a3419',
  rustHot:       '#b8541e',
  steelCool:     '#6b7280',

  inkPrimary:    '#e6ecec',
  inkSecondary:  '#9aa8b0',
  inkDim:        '#6b7885',
  inkLab:        '#b8f0d0',

  signalWarn:    '#f0b840',
  signalDanger:  '#e04848',
  signalGood:    '#7fff9b',

  tierBaseline:   '#7889a0',
  tierStrain:     '#4dd3a8',
  tierMutant:     '#f0b840',
  tierChimera:    '#a86bd8',
  tierProgenitor: '#ff5a68',

  fontDisplay: "'Big Shoulders Display', 'Oswald', system-ui, sans-serif",
  fontUi:      "'Inter', system-ui, -apple-system, sans-serif",
  fontMono:    "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace",

  bioGlow:     '0 0 12px rgba(127, 255, 155, 0.45)',
  bioGlowHot:  '0 0 20px rgba(127, 255, 155, 0.75), 0 0 4px rgba(127, 255, 155, 1)',
  rimTeal:     '0 0 0 1px rgba(20, 184, 166, 0.35), inset 0 1px 0 rgba(180, 240, 220, 0.08)',
  rimIron:     '0 0 0 1px rgba(180, 180, 190, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  rimBio:      '0 0 0 1px rgba(127, 255, 155, 0.4), 0 0 12px rgba(127, 255, 155, 0.45)',

  radiusXs: 2,
  radiusSm: 4,
  radiusMd: 8,
  radiusLg: 12,
} as const;
```

- [ ] **Step 4: Wire theme.css into `main.tsx`**

Modify `src/main.tsx` by adding one import line **before** `import { App } from './App'`:

```ts
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/theme.css';
import { App } from './App';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: Verify no test regression**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass. The visual will now have a dark body background because `html, body` are painted `--ground-void`, but nothing else changes. Tests should still pass because no component-level markup changed and jsdom doesn't render CSS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/theme.css src/ui/tokens.ts src/main.tsx
git commit -m "feat(ui): design tokens + theme.css foundation (aesthetic pass phase A/1)"
```

---

## Task 2: Keyframes, text-effects, and reduced-motion in `theme.css`

**Files:**
- Modify: `src/ui/theme.css` (append sections)

**Interfaces:**
- Consumes: CSS variables from Task 1
- Produces: keyframe names `bio-pulse`, `vat-bubble`, `drip`, `flash-number`, `stamp-in`, `toast-slide`, `screen-fade`, `membrane-shimmer`, `ticker-glitch`, `decant-emerge`; class selectors `.text-glow-bio`, `.text-stamp`, `.text-readout`, `.a-bio-pulse`, `.a-flash-number`, `.a-stamp-in`, `.a-toast-slide`, `.a-screen-fade`, `.a-decant-emerge`, `.a-membrane-shimmer`, `.a-ticker-glitch`, `.a-drip`, `.a-vat-bubble`.

- [ ] **Step 1: Baseline verify**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass.

- [ ] **Step 2: Append keyframes + reduced-motion + text effects to `theme.css`**

Append to the end of `src/ui/theme.css`:

```css
/* ---------- Keyframes (juice library) ---------- */

@keyframes bio-pulse {
  0%, 100% { box-shadow: 0 0 0 1px rgba(127, 255, 155, 0.4), 0 0 8px rgba(127, 255, 155, 0.35); }
  50%      { box-shadow: 0 0 0 1px rgba(127, 255, 155, 0.7), 0 0 18px rgba(127, 255, 155, 0.65); }
}

@keyframes vat-bubble {
  0%   { transform: translateY(0) scale(0.9); opacity: 0; }
  30%  { opacity: 0.35; }
  100% { transform: translateY(-14px) scale(1.05); opacity: 0; }
}

@keyframes drip {
  0%   { transform: translateY(0); opacity: 0.8; }
  100% { transform: translateY(6px); opacity: 0; }
}

@keyframes flash-number {
  0%   { color: var(--bio-green); text-shadow: 0 0 8px rgba(127, 255, 155, 0.7); }
  100% { color: inherit; text-shadow: none; }
}

@keyframes stamp-in {
  0%   { transform: scale(0.94); }
  60%  { transform: scale(1.02); }
  100% { transform: scale(1.00); }
}

@keyframes toast-slide {
  0%   { transform: translateY(12px); opacity: 0; box-shadow: 0 0 0 0 rgba(127, 255, 155, 0); }
  60%  { transform: translateY(0);    opacity: 1; box-shadow: 0 0 18px 0 rgba(127, 255, 155, 0.55); }
  100% { transform: translateY(0);    opacity: 1; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); }
}

@keyframes screen-fade {
  0%   { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes membrane-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes ticker-glitch {
  0%   { text-shadow: -1px 0 rgba(255, 0, 60, 0.6), 1px 0 rgba(0, 255, 200, 0.6); }
  100% { text-shadow: none; }
}

@keyframes decant-emerge {
  0%   { transform: scale(0.9); opacity: 0; filter: brightness(1.6) blur(2px); }
  100% { transform: scale(1);   opacity: 1; filter: brightness(1) blur(0); }
}

/* ---------- Animation utility classes ---------- */

.a-bio-pulse       { animation: bio-pulse       2.4s ease-in-out infinite; }
.a-flash-number    { animation: flash-number    240ms var(--ease-clinic) 1; }
.a-stamp-in        { animation: stamp-in        220ms var(--ease-stamp) 1; }
.a-toast-slide     { animation: toast-slide     280ms var(--ease-lab) 1; }
.a-screen-fade     { animation: screen-fade     160ms var(--ease-clinic) 1; }
.a-decant-emerge   { animation: decant-emerge   380ms var(--ease-lab) 1; }
.a-membrane-shimmer{
  background-image: linear-gradient(120deg,
    transparent 30%,
    rgba(184, 240, 208, 0.03) 50%,
    transparent 70%);
  background-size: 200% 100%;
  animation: membrane-shimmer 8s linear infinite;
}
.a-ticker-glitch   { animation: ticker-glitch   40ms linear 1; }
.a-drip            { animation: drip            4s ease-in infinite; }
.a-vat-bubble      { animation: vat-bubble      3s ease-out infinite; }

/* ---------- Text effect utilities ---------- */

.text-glow-bio {
  color: var(--bio-green);
  text-shadow: 0 0 6px currentColor;
}

.text-stamp {
  font-family: var(--font-display);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-primary);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.6);
}

.text-readout {
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--ink-dim);
}

/* ---------- Reduced motion — non-negotiable ---------- */

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/ui/theme.css
git commit -m "feat(ui): keyframes, text-effects, reduced-motion (aesthetic pass phase A/2)"
```

---

## Task 3: Fonts + `<html>` typography wiring

**Files:**
- Modify: `index.html` (add Google Fonts `<link>`, dark meta color)

**Interfaces:**
- Consumes: font-family CSS variables from Task 1 (already declared)
- Produces: Google Fonts loaded and available to `--font-display`, `--font-ui`, `--font-mono`

- [ ] **Step 1: Baseline verify**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass.

- [ ] **Step 2: Rewrite `index.html`**

Overwrite `index.html` with this exact content (favicon + title are updated in Task 5; leave those for now to keep this task focused):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#05070a" />
    <meta name="color-scheme" content="dark" />
    <title>Morulium</title>

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Verify — build serves the page and fonts load**

Run: `npm run build && npm run preview -- --port 4173 &`
Then open `http://localhost:4173` in a browser, confirm no console errors and that headings visibly use a heavier/condensed face after Task 4 lands.
Then kill preview: `lsof -ti :4173 | xargs kill`
Run: `npm run typecheck && npm test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(ui): wire Google Fonts + dark meta (aesthetic pass phase A/3)"
```

---

## Task 4: Repaint AppShell + StatusHud + nav — the visible transformation

**Files:**
- Modify: `src/ui/styles.ts` (retokenize `nav`, `navTab`, `navTabActive`, `navTabLocked`, `hudRow`, `hudItem`, `hudDirectiveEmpty`, `page`, `headerTitle`, `headerSub` — replace hex codes with `TOKENS.*` references, and update visual language per spec)
- Modify: `src/ui/components/AppShell.tsx` (dark ground on the shell root; `main` element with `data-register` set by children later)
- Modify: `src/ui/components/StatusHud.tsx` (instrument-strip look; `.flash-number` on serum change)

**Interfaces:**
- Consumes: `TOKENS.*` from `src/ui/tokens.ts`; CSS variables from `theme.css`
- Produces: `styles.nav` / `styles.navTab*` / `styles.hudRow` / `styles.hudItem` retokenized. `AppShell` still exports the same props signature. `StatusHud` still exports the same props signature.

- [ ] **Step 1: Baseline verify**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass.

- [ ] **Step 2: Retokenize `styles.ts` entries used by shell + HUD**

Open `src/ui/styles.ts`. Add `import { TOKENS } from './tokens';` under the existing `import type { Tier } from '../sim/types';` line. Replace the following entries (find each and swap the entire object literal):

`page`:
```ts
page: {
  fontFamily: TOKENS.fontUi,
  padding: 24,
  maxWidth: 1400,
  margin: '0 auto',
  color: TOKENS.inkPrimary,
} as CSSProperties,
```

`headerTitle`:
```ts
headerTitle: {
  fontFamily: TOKENS.fontDisplay,
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: TOKENS.inkPrimary,
  marginBottom: 4,
} as CSSProperties,
```

`headerSub`:
```ts
headerSub: {
  color: TOKENS.inkDim,
  fontFamily: TOKENS.fontMono,
  fontSize: 13,
  letterSpacing: '0.02em',
  marginBottom: 16,
} as CSSProperties,
```

`nav`:
```ts
nav: {
  display: 'flex',
  gap: 4,
  padding: '12px 24px 0 24px',
  maxWidth: 1400,
  margin: '0 auto',
  borderBottom: `1px solid ${TOKENS.tealDeep}`,
  background: TOKENS.groundDeep,
} as CSSProperties,
```

`navTab`:
```ts
navTab: {
  padding: '10px 16px',
  borderRadius: '4px 4px 0 0',
  border: 'none',
  background: 'transparent',
  color: TOKENS.inkSecondary,
  fontFamily: TOKENS.fontDisplay,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  borderBottom: '2px solid transparent',
  transition: 'color 160ms ease, border-color 160ms ease',
} as CSSProperties,
```

`navTabActive`:
```ts
navTabActive: {
  padding: '10px 16px',
  borderRadius: '4px 4px 0 0',
  border: 'none',
  background: 'transparent',
  color: TOKENS.inkPrimary,
  fontFamily: TOKENS.fontDisplay,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  borderBottom: `2px solid ${TOKENS.teal}`,
} as CSSProperties,
```

`navTabLocked`:
```ts
navTabLocked: {
  padding: '10px 16px',
  borderRadius: '4px 4px 0 0',
  border: 'none',
  background: 'transparent',
  color: TOKENS.inkDim,
  fontFamily: TOKENS.fontDisplay,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'not-allowed',
  opacity: 0.4,
  borderBottom: '2px solid transparent',
} as CSSProperties,
```

`hudRow`:
```ts
hudRow: {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  padding: '8px 24px',
  borderBottom: `1px solid ${TOKENS.tealDeep}`,
  fontSize: 13,
  fontFamily: TOKENS.fontMono,
  color: TOKENS.inkLab,
  maxWidth: 1400,
  margin: '0 auto',
  background: TOKENS.groundDeep,
} as CSSProperties,
```

`hudItem`:
```ts
hudItem: {
  padding: '3px 10px',
  borderRadius: 3,
  background: TOKENS.groundRaised,
  border: `1px solid ${TOKENS.tealDeep}`,
  color: TOKENS.inkLab,
  letterSpacing: '0.02em',
} as CSSProperties,
```

`hudDirectiveEmpty`:
```ts
hudDirectiveEmpty: {
  color: TOKENS.inkDim,
  fontStyle: 'italic',
} as CSSProperties,
```

- [ ] **Step 3: Add `.flash-number` on serum change in `StatusHud.tsx`**

Rewrite `src/ui/components/StatusHud.tsx` to trigger the flash-number animation whenever `serum` changes:

```tsx
import { useEffect, useRef, useState, type ReactElement } from 'react';
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
      <FlashOnChange value={serum} testid="hud-serum">
        {TERMS.serumAbbr} {serum}
      </FlashOnChange>
      <FlashOnChange value={unitCount} testid="hud-colony-cap">
        {TERMS.colony} {unitCount}/{cap}
      </FlashOnChange>
      <FreeDecantsBadge />
      <span
        style={props.directiveText ? styles.hudItem : { ...styles.hudItem, ...styles.hudDirectiveEmpty }}
        data-testid="hud-directive"
      >
        {TERMS.directive}: {props.directiveText ?? 'No directive'}
      </span>
    </div>
  );
}

function FlashOnChange(props: { value: number; testid: string; children: React.ReactNode }): ReactElement {
  const first = useRef(true);
  const [flashKey, setFlashKey] = useState(0);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setFlashKey((k) => k + 1);
  }, [props.value]);
  return (
    <span
      key={flashKey}
      className={flashKey > 0 ? 'a-flash-number' : undefined}
      style={styles.hudItem}
      data-testid={props.testid}
    >
      {props.children}
    </span>
  );
}

function FreeDecantsBadge(): ReactElement {
  const free = useColonyStore((s) => s.freeDecantsRemaining);
  return (
    <FlashOnChange value={free} testid="hud-free-decants">
      {TERMS.freeDecant}: {free}
    </FlashOnChange>
  );
}
```

Note: `data-testid` values on the HUD items are preserved exactly (`hud-serum`, `hud-colony-cap`, `hud-free-decants`, `hud-directive`).

- [ ] **Step 4: Verify all tests still pass**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass. If any test breaks because of the FlashOnChange wrapper changing DOM structure (e.g. an extra element), inspect the failing test — the `data-testid` is preserved so `getByTestId` still works. If a test asserts a specific parent-child relationship that we broke, fix the test to match the new (still-correct) structure.

- [ ] **Step 5: Commit**

```bash
git add src/ui/styles.ts src/ui/components/AppShell.tsx src/ui/components/StatusHud.tsx
git commit -m "feat(ui): dark AppShell + instrument HUD + display-font nav (aesthetic pass phase A/3)"
```

---

## Task 5: Assets — wordmark, favicon, OG image, aesthetic-vibe doc, `<Wordmark>` component

**Files:**
- Create: `src/assets/wordmark.png` (copy of `~/Downloads/pixellab-Pixel-art-wordmark-reading--MO-1785789971448.png`) — imported from TS, so lives under `src/`
- Create: `public/og-image.png` (copy of `~/Downloads/logo-og.png`) — referenced by URL from `index.html`, so lives in `public/`
- Create: `public/favicon.svg` (procedural morula) — referenced by URL from `index.html`, so lives in `public/`
- Create: `docs/aesthetic-vibe.md` (copy of `~/Downloads/morulium-aesthetic-vibe.md`)
- Create: `src/ui/components/Wordmark.tsx`
- Modify: `index.html` (favicon + title + description + OG meta)

**Why the split:** Vite processes files under `src/` through the module graph (hashed filenames in build, imported via TS). Files in `public/` are copied verbatim to the build root and referenced by absolute URL — the correct place for anything `index.html` links to directly.

**Interfaces:**
- Produces: `<Wordmark size="hero" | "nav" />` component; `wordmark.png` at import path `../../assets/wordmark.png` from `src/ui/components/`.

- [ ] **Step 1: Baseline verify**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass.

- [ ] **Step 2: Copy asset files into repo**

Run:
```bash
mkdir -p src/assets public
cp "$HOME/Downloads/pixellab-Pixel-art-wordmark-reading--MO-1785789971448.png" src/assets/wordmark.png
cp "$HOME/Downloads/logo-og.png" public/og-image.png
cp "$HOME/Downloads/morulium-aesthetic-vibe.md" docs/aesthetic-vibe.md
```

- [ ] **Step 3: Create `public/favicon.svg`**

Write this exact content:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="cell" cx="50%" cy="40%">
      <stop offset="0%" stop-color="#c8ffd6" />
      <stop offset="55%" stop-color="#7fff9b" />
      <stop offset="100%" stop-color="#46a05e" />
    </radialGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="1.6" />
    </filter>
  </defs>
  <rect width="64" height="64" rx="8" fill="#05070a" />
  <g filter="url(#glow)" opacity="0.7">
    <circle cx="32" cy="32" r="7" fill="#7fff9b" />
    <circle cx="32" cy="20" r="6" fill="#7fff9b" />
    <circle cx="32" cy="44" r="6" fill="#7fff9b" />
    <circle cx="22" cy="26" r="6" fill="#7fff9b" />
    <circle cx="22" cy="38" r="6" fill="#7fff9b" />
    <circle cx="42" cy="26" r="6" fill="#7fff9b" />
    <circle cx="42" cy="38" r="6" fill="#7fff9b" />
  </g>
  <g stroke="#1a3a24" stroke-width="0.6">
    <circle cx="32" cy="32" r="7" fill="url(#cell)" />
    <circle cx="32" cy="20" r="6" fill="url(#cell)" />
    <circle cx="32" cy="44" r="6" fill="url(#cell)" />
    <circle cx="22" cy="26" r="6" fill="url(#cell)" />
    <circle cx="22" cy="38" r="6" fill="url(#cell)" />
    <circle cx="42" cy="26" r="6" fill="url(#cell)" />
    <circle cx="42" cy="38" r="6" fill="url(#cell)" />
  </g>
</svg>
```

- [ ] **Step 4: Update `index.html` with favicon, title, description, OG meta**

Overwrite `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#05070a" />
    <meta name="color-scheme" content="dark" />
    <title>Morulium — Cultivate. Conquer.</title>
    <meta name="description" content="A geneticist-warlord grows monsters in vats to conquer the world. Clinical dark-biotech specimen-management console." />

    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

    <meta property="og:title" content="Morulium" />
    <meta property="og:description" content="Cultivate. Conquer." />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="/og-image.png" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create the `<Wordmark>` component**

Write `src/ui/components/Wordmark.tsx`:

```tsx
import type { ReactElement, CSSProperties } from 'react';
import wordmarkSrc from '../../assets/wordmark.png';

type WordmarkSize = 'hero' | 'nav';

const SIZES: Readonly<Record<WordmarkSize, { width: number; height: number }>> = {
  hero: { width: 344, height: 192 }, // 1x source — pixel-perfect
  nav:  { width: 172, height: 96  }, // 0.5x — still integer nearest-neighbor
};

const BASE_STYLE: CSSProperties = {
  imageRendering: 'pixelated',
  display: 'block',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

export function Wordmark(props: {
  size: WordmarkSize;
  style?: CSSProperties;
  className?: string;
  alt?: string;
}): ReactElement {
  const dims = SIZES[props.size];
  return (
    <img
      src={wordmarkSrc}
      width={dims.width}
      height={dims.height}
      style={{ ...BASE_STYLE, ...props.style }}
      className={props.className}
      alt={props.alt ?? 'Morulium'}
      draggable={false}
      data-testid="wordmark"
    />
  );
}
```

- [ ] **Step 6: Verify — assets bundle and typecheck passes**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass. TS may complain that `import wordmarkSrc from '../../assets/wordmark.png'` has no type declaration. If so, create `src/vite-env.d.ts` (or extend the existing one — check first) with:

```ts
/// <reference types="vite/client" />
```

If that file exists, ensure it contains this triple-slash reference. `vite/client` provides ambient declarations for `.png`, `.svg`, `.gif`, etc.

- [ ] **Step 7: Commit**

```bash
git add src/assets/ public/ docs/aesthetic-vibe.md src/ui/components/Wordmark.tsx index.html
# only add src/vite-env.d.ts if you created or modified it
git status --short  # sanity check before commit
git commit -m "feat(assets): wordmark + favicon + og image + Wordmark component (aesthetic pass phase B/4)"
```

---

## Task 6: NewGameGate — the hero surface

**Files:**
- Modify: `src/ui/screens/NewGameGate.tsx`
- Modify: `src/ui/styles.ts` (add `newGameGate` entry group)
- Modify: `tests/ui/NewGameGate.test.tsx` if any assertion is color/class based (behavior assertions must not change)

**Interfaces:**
- Consumes: `<Wordmark>` from Task 5; `TOKENS.*`; global juice classes from Task 2.
- Produces: NewGameGate rendered with wordmark hero, dark ground, primary + ghost CTAs. Same testids preserved: `new-game-gate`, `new-game-gate-continue`, `new-game-gate-new-game`.

- [ ] **Step 1: Baseline verify + read the existing NewGameGate test**

Run: `npm run typecheck && npm test && npm run build && cat tests/ui/NewGameGate.test.tsx`
Expected: all tests pass. Understand what the test asserts so we know what must remain true.

- [ ] **Step 2: Add `newGameGate` style entries to `src/ui/styles.ts`**

Add these to the styles object (anywhere in it):

```ts
newGameGateRoot: {
  minHeight: '100vh',
  background: TOKENS.groundVoid,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 32,
  padding: 24,
} as CSSProperties,

newGameGateTagline: {
  fontFamily: TOKENS.fontMono,
  fontSize: 13,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: TOKENS.inkDim,
  marginTop: -8,
} as CSSProperties,

newGameGateActions: {
  display: 'flex',
  gap: 12,
  marginTop: 8,
} as CSSProperties,

newGameGatePrimary: {
  padding: '14px 32px',
  border: `1px solid ${TOKENS.bioGreen}`,
  background: TOKENS.bruiseDeep,
  color: TOKENS.bioGreen,
  fontFamily: TOKENS.fontDisplay,
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  borderRadius: 4,
  boxShadow: TOKENS.bioGlowHot,
  transition: 'filter 160ms ease, box-shadow 160ms ease',
} as CSSProperties,

newGameGateGhost: {
  padding: '14px 32px',
  border: `1px solid ${TOKENS.tealDeep}`,
  background: 'transparent',
  color: TOKENS.inkSecondary,
  fontFamily: TOKENS.fontDisplay,
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  borderRadius: 4,
  transition: 'color 160ms ease, border-color 160ms ease',
} as CSSProperties,

newGameGateGhostDisabled: {
  padding: '14px 32px',
  border: `1px solid ${TOKENS.iron}`,
  background: 'transparent',
  color: TOKENS.inkDim,
  fontFamily: TOKENS.fontDisplay,
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'not-allowed',
  opacity: 0.5,
  borderRadius: 4,
} as CSSProperties,

newGameGateFooter: {
  marginTop: 24,
  fontFamily: TOKENS.fontMono,
  fontSize: 11,
  letterSpacing: '0.1em',
  color: TOKENS.inkDim,
} as CSSProperties,
```

- [ ] **Step 3: Rewrite `src/ui/screens/NewGameGate.tsx`**

Overwrite with:

```tsx
import type { ReactElement } from 'react';
import { styles } from '../styles';
import { TERMS } from '../terms';
import { Wordmark } from '../components/Wordmark';

export function NewGameGate(props: {
  hasExistingSave: boolean;
  onContinue: () => void;
  onNewGame: () => void;
}): ReactElement {
  return (
    <main style={styles.newGameGateRoot} data-testid="new-game-gate" data-register="lab">
      <Wordmark size="hero" />
      <p style={styles.newGameGateTagline}>Specimen management console · v0.0.1</p>
      <div style={styles.newGameGateActions}>
        <button
          type="button"
          style={props.hasExistingSave ? styles.newGameGateGhost : styles.newGameGateGhostDisabled}
          disabled={!props.hasExistingSave}
          onClick={props.onContinue}
          data-testid="new-game-gate-continue"
        >
          {TERMS.continueGame}
        </button>
        <button
          type="button"
          style={styles.newGameGatePrimary}
          onClick={props.onNewGame}
          data-testid="new-game-gate-new-game"
        >
          {TERMS.newGame}
        </button>
      </div>
      <div style={styles.newGameGateFooter}>Cultivate. Conquer.</div>
    </main>
  );
}
```

- [ ] **Step 4: Verify tests pass**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass. The behavior surface is identical: same testids, same button props, same `onContinue`/`onNewGame` wiring, same disabled logic. If a test asserts a specific inline style value (e.g. old teal `#14b8a6`), update the matcher to match the new token — the *behavior* being asserted stays. If a test asserts the presence of text `"Grow monsters. Take fronts. Rule."` that's been removed, update the assertion to the new tagline `"Specimen management console · v0.0.1"`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/NewGameGate.tsx src/ui/styles.ts tests/ui/NewGameGate.test.tsx
git commit -m "feat(ui): NewGameGate wordmark hero + dark ground (aesthetic pass phase B/5)"
```

---

## Task 7: Global juice primitives — buttons + cards

**Files:**
- Modify: `src/ui/theme.css` (append `.btn*` and `.card*` global classes)
- Modify: `src/ui/styles.ts` (retokenize existing button entries; introduce shared button base object)
- Modify: `src/ui/components/DecantButton.tsx`, `BreedButton.tsx`, `SpecimenCard.tsx`, `FrontCard.tsx` (adopt `className` for global classes)

**Interfaces:**
- Consumes: CSS variables + keyframes from Tasks 1–2
- Produces: global classes `.btn`, `.btn--primary`, `.btn--danger`, `.btn--ghost`, `.btn--stamp`, `.card`, `.card--specimen`, `.card--front`. Any component can adopt these via `className`.

- [ ] **Step 1: Baseline verify**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass.

- [ ] **Step 2: Append button + card primitives to `theme.css`**

Append to the end of `src/ui/theme.css`:

```css
/* ---------- Button primitives ---------- */

.btn {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 10px 18px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--teal-deep);
  background: var(--ground-panel);
  color: var(--ink-primary);
  cursor: pointer;
  transition:
    filter var(--dur-fast) var(--ease-clinic),
    box-shadow var(--dur-fast) var(--ease-clinic),
    border-color var(--dur-fast) var(--ease-clinic);
  box-shadow: var(--rim-inner);
}
.btn:hover:not(:disabled) {
  filter: brightness(1.08);
  border-color: var(--teal);
  box-shadow: var(--rim-inner), var(--bio-glow);
}
.btn:active:not(:disabled) {
  filter: brightness(0.95);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(0.4);
}

.btn--primary {
  border-color: var(--teal);
  color: var(--ink-lab);
}
.btn--primary:hover:not(:disabled) {
  border-color: var(--bio-green);
  color: var(--bio-green);
  box-shadow: var(--rim-inner), var(--bio-glow);
}

.btn--danger {
  border-color: var(--rust);
  color: var(--rust-hot);
}
.btn--danger:hover:not(:disabled) {
  border-color: var(--rust-hot);
  color: var(--signal-danger);
  box-shadow: var(--rim-inner), 0 0 12px rgba(224, 72, 72, 0.45);
}

.btn--ghost {
  background: transparent;
  border-color: transparent;
  color: var(--ink-secondary);
}
.btn--ghost:hover:not(:disabled) {
  border-color: var(--teal-deep);
  color: var(--ink-primary);
  box-shadow: none;
}

.btn--stamp {
  background: var(--iron-plate);
  border-color: var(--iron-light);
  color: var(--ink-primary);
  border-radius: var(--radius-xs);
  box-shadow: var(--rim-iron);
}
.btn--stamp:hover:not(:disabled) {
  filter: brightness(1.12);
  border-color: var(--rust);
  box-shadow: var(--rim-iron), 0 0 10px rgba(184, 84, 30, 0.4);
}

/* ---------- Card primitives ---------- */

.card {
  background: var(--ground-panel);
  border-radius: var(--radius-md);
  box-shadow: var(--rim-teal), var(--rim-inner);
  transition:
    box-shadow var(--dur-fast) var(--ease-clinic),
    transform var(--dur-fast) var(--ease-clinic);
  color: var(--ink-primary);
}
.card:hover {
  box-shadow: var(--rim-teal), var(--rim-inner), var(--bio-glow);
  transform: scale(1.005);
}

.card--specimen {
  position: relative;
  aspect-ratio: 5 / 7;
  padding: 8px;
  overflow: hidden;
}

.card--front {
  background: var(--iron-plate);
  box-shadow: var(--rim-iron), var(--rim-inner);
  color: var(--ink-primary);
}
.card--front:hover {
  box-shadow: var(--rim-iron), var(--rim-inner), 0 0 12px rgba(184, 84, 30, 0.35);
}
```

- [ ] **Step 3: Retokenize existing button entries in `src/ui/styles.ts`**

Replace the following entries with these values (they retain their existing shapes so consumers keep working, but reference tokens and adopt the display font):

`decantButton`:
```ts
decantButton: {
  padding: '10px 20px',
  borderRadius: TOKENS.radiusSm,
  border: `1px solid ${TOKENS.teal}`,
  background: TOKENS.groundPanel,
  color: TOKENS.inkLab,
  fontFamily: TOKENS.fontDisplay,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
} as CSSProperties,
```

`decantButtonDisabled`:
```ts
decantButtonDisabled: {
  padding: '10px 20px',
  borderRadius: TOKENS.radiusSm,
  border: `1px solid ${TOKENS.iron}`,
  background: TOKENS.groundPanel,
  color: TOKENS.inkDim,
  fontFamily: TOKENS.fontDisplay,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'not-allowed',
  opacity: 0.5,
} as CSSProperties,
```

Repeat the same retokenizing pattern for: `emptyStateCta`, `emptyStateCtaDisabled`, `breedButton`, `breedButtonDisabled`, `incursionLaunchButton`, `incursionLaunchButtonDisabled`, `incursionContinueButton`, `buyStimButton`, `buyStimButtonDisabled`, `modalPrimary`, `incursionSkipButton`.

For each: swap hex codes to `TOKENS.*`, swap `fontFamily: 'inherit'` to `TOKENS.fontDisplay` for CTAs and `TOKENS.fontUi` for utilities, add `letterSpacing: '0.08em'` and `textTransform: 'uppercase'` for stamped feel.

**Coloring guide (per bio-green discipline):**
- Default primary CTAs (Decant, Breed, buy stim, modal primary) → teal border, ink-lab text.
- Danger CTAs (Incursion Launch, Cull All) → rust border, rust-hot text. Change `incursionLaunchButton` accordingly.
- Ghost / utility (skip, continue, close) → transparent bg, ink-secondary text, no border on rest.
- Hero (only NewGameGate primary — handled in Task 6) → bio-green rim + hot glow.

- [ ] **Step 4: Adopt `.btn` classes on the four biggest consumers**

Update these four components to compose class names with existing inline styles:

`src/ui/components/DecantButton.tsx` — find the `<button>` and add `className="btn btn--primary"`:
```tsx
<button
  type="button"
  className="btn btn--primary"
  style={disabled ? styles.decantButtonDisabled : styles.decantButton}
  disabled={disabled}
  onClick={onClick}
  data-testid="decant-button"
>
  {label}
</button>
```
(Adjust to whatever the current props destructuring is — read the file first.)

`src/ui/components/BreedButton.tsx` — same treatment, `className="btn btn--primary"`.

`src/ui/components/SpecimenCard.tsx` — wrap the outer `<div style={styles.card(...)}>` element with `className="card card--specimen"`. Read the current file first; keep the existing style-function-generated inline styles (they carry per-tier tint that must remain).

`src/ui/components/FrontCard.tsx` — `className="card card--front"` on the outer element. Adjust based on current file structure.

- [ ] **Step 5: Verify all tests still pass**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass. If a test asserts on className presence (rare), verify it and update if needed. If a test asserts on button text or role, unaffected.

- [ ] **Step 6: Commit**

```bash
git add src/ui/theme.css src/ui/styles.ts src/ui/components/DecantButton.tsx src/ui/components/BreedButton.tsx src/ui/components/SpecimenCard.tsx src/ui/components/FrontCard.tsx
git commit -m "feat(ui): global .btn + .card primitives, retokenize buttons (aesthetic pass phase C/6a)"
```

---

## Task 8: Global juice primitives — panels, pills, chips, toasts, modals

**Files:**
- Modify: `src/ui/theme.css` (append `.panel`, `.pill`, `.chip`, `.toast`, `.modal`, `.modal-backdrop`)
- Modify: `src/ui/styles.ts` (retokenize `modalBackdrop`, `modalCard`, `modalTitle`, `modalBody`, `toast`, `toastBody`, `tooltipTrigger`, `tooltipBubble`, `directiveBanner`, `directiveTitle`, `directiveHint`, `firstVisitCallout`, `firstVisit*`, `serumBadge`, `garrisonBadge`, `garrisonPickerOverlay`, `garrisonPickerBackdrop`, `garrisonPickerRow*`, `culledBadge`, `cullToggleButton`, `slotStim*`, `stimShopRow`, `stimInventoryLabel`, `regionConquered*`)
- Modify: components that consume these (ActionToast, RewardToast, UnlockedToast, IntroModal, DirectiveBanner, FirstVisitCallout, TermTooltip, SerumBadge, GarrisonPickerOverlay)

**Interfaces:**
- Consumes: keyframes + tokens from earlier tasks
- Produces: global classes `.panel`, `.pill`, `.chip`, `.toast`, `.modal`, `.modal-backdrop`

- [ ] **Step 1: Baseline verify**

Run: `npm run typecheck && npm test && npm run build`

- [ ] **Step 2: Append panel/pill/chip/toast/modal to `theme.css`**

```css
/* ---------- Panel primitive ---------- */

.panel {
  background: var(--ground-panel);
  border-radius: var(--radius-md);
  box-shadow: var(--rim-teal), var(--rim-inner);
  padding: 16px;
  color: var(--ink-primary);
}

.panel--iron {
  background: var(--iron-plate);
  box-shadow: var(--rim-iron), var(--rim-inner);
}

/* ---------- Pill + chip primitives (small labels) ---------- */

.pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: var(--ground-raised);
  color: var(--ink-secondary);
  border: 1px solid var(--teal-deep);
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ground-void);
  box-shadow: var(--rim-inner);
}

/* ---------- Toast primitive ---------- */

.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 18px;
  border-radius: var(--radius-sm);
  background: var(--ground-raised);
  color: var(--ink-primary);
  font-family: var(--font-mono);
  font-size: 13px;
  border: 1px solid var(--iron-light);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  z-index: 90;
  max-width: 340px;
}

/* ---------- Modal primitives ---------- */

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 10, 0.8);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--iron-plate);
  border-radius: var(--radius-lg);
  padding: 24px;
  min-width: 320px;
  max-width: 480px;
  box-shadow: var(--rim-iron), var(--rim-inner), 0 20px 60px rgba(0, 0, 0, 0.7);
  color: var(--ink-primary);
}
```

- [ ] **Step 3: Retokenize the modal/toast/tooltip/banner/callout entries in `src/ui/styles.ts`**

For each of these entries, swap hex to `TOKENS.*`. Keep the same object shape; only the values change. Guidelines per entry:

- `modalBackdrop` → `background: 'rgba(5, 7, 10, 0.8)'`, add `backdropFilter: 'blur(4px)'` and `WebkitBackdropFilter: 'blur(4px)'`.
- `modalCard` → `background: TOKENS.ironPlate`, `border-radius: 12`, `color: TOKENS.inkPrimary`, add subtle iron rim via `boxShadow: '0 20px 60px rgba(0,0,0,0.7)'`.
- `modalTitle` → `fontFamily: TOKENS.fontDisplay`, `letterSpacing: '0.06em'`, `textTransform: 'uppercase'`, `color: TOKENS.inkPrimary`.
- `modalBody` → `fontFamily: TOKENS.fontUi`, `color: TOKENS.inkSecondary`.
- `toast` → `background: TOKENS.groundRaised`, `color: TOKENS.inkPrimary`, `border: '1px solid ' + TOKENS.ironLight`, `fontFamily: TOKENS.fontMono`.
- `tooltipTrigger` → `borderBottom: '1px dotted ' + TOKENS.tealDeep`.
- `tooltipBubble` → `background: TOKENS.groundRaised`, `color: TOKENS.inkLab`, `border: '1px solid ' + TOKENS.tealDeep`, `fontFamily: TOKENS.fontMono`.
- `directiveBanner` → `background: TOKENS.ironPlate`, `borderLeft: '4px solid ' + TOKENS.signalWarn`, `color: TOKENS.inkPrimary`.
- `directiveTitle` → `color: TOKENS.signalWarn`, `fontFamily: TOKENS.fontDisplay`, `letterSpacing: '0.06em'`, `textTransform: 'uppercase'`.
- `directiveHint` → `color: TOKENS.inkSecondary`.
- `firstVisitCallout` → `background: TOKENS.groundPanel`, `borderLeft: '4px solid ' + TOKENS.teal`.
- `firstVisitTitle` → `color: TOKENS.inkLab`, `fontFamily: TOKENS.fontDisplay`, `letterSpacing: '0.06em'`, `textTransform: 'uppercase'`.
- `firstVisitBody` → `color: TOKENS.inkSecondary`.
- `firstVisitAction` → `color: TOKENS.inkDim`.
- `firstVisitDismiss` → `color: TOKENS.inkSecondary`.
- `serumBadge` → `color: TOKENS.inkLab`, `background: TOKENS.groundRaised`, `border: '1px solid ' + TOKENS.tealDeep`, `borderRadius: 3`, keep `fontFamily: TOKENS.fontMono`, `padding: '4px 10px'`.
- `garrisonBadge` → `color: TOKENS.bruiseGlow`, keep `fontFamily: TOKENS.fontMono`.
- `garrisonPickerOverlay` → `background: TOKENS.groundRaised`, `border: '1px solid ' + TOKENS.tealDeep`, `boxShadow: '0 4px 12px rgba(0,0,0,0.4)'`.
- `garrisonPickerRow` → `color: TOKENS.inkLab`.
- `garrisonPickerRowEmpty` → `color: TOKENS.inkDim`.
- `culledBadge` → `color: TOKENS.signalDanger`.
- `cullToggleButton` → `border: '1px solid ' + TOKENS.iron`, `color: TOKENS.inkDim`, keep `fontFamily: TOKENS.fontMono`.
- `slotStimToggle` → `background: TOKENS.groundRaised`, `border: '1px solid ' + TOKENS.iron`, `color: TOKENS.inkSecondary`.
- `slotStimToggleActive` → `background: TOKENS.bruise`, `border: '1px solid ' + TOKENS.bruiseGlow`, `color: TOKENS.inkLab`.
- `stimShopRow` — no color changes needed; kept for layout.
- `stimInventoryLabel` → `color: TOKENS.inkLab`, `fontFamily: TOKENS.fontMono`.
- `regionConquered` → `background: TOKENS.bioGreenDeep`, `border: '2px solid ' + TOKENS.bioGreenDim`, `color: TOKENS.bioGreen`.
- `regionConqueredTitle` → `color: TOKENS.bioGreen`, `fontFamily: TOKENS.fontDisplay`, `letterSpacing: '0.06em'`, `textTransform: 'uppercase'`.
- `regionConqueredBody` → `color: TOKENS.inkLab`.

- [ ] **Step 4: Toast components — add `a-toast-slide` on mount**

For each of `ActionToast.tsx`, `RewardToast.tsx`, `UnlockedToast.tsx`, `IncursionResultSummary.tsx`, `AwaySummary.tsx`, add `className="a-toast-slide"` (or the ambient panel class where more appropriate) to the outer visible element. Read each file first — they use different local patterns. The rule: whichever outermost element renders when the toast is visible, add the animation class.

Example for a toast:
```tsx
<div className="a-toast-slide" style={styles.toast} data-testid="reward-toast">
  ...
</div>
```

- [ ] **Step 5: IntroModal — iron-plate on blurred void backdrop**

Read `src/ui/components/IntroModal.tsx`. Change the backdrop and card wrappers to use `className="modal-backdrop"` and `className="modal"` (drop the inline styles for those, keep inline for children). Preserve all testids and button handlers exactly.

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass. Toast tests may need color-value updates; fix matchers, not assertions.

- [ ] **Step 7: Commit**

```bash
git add src/ui/theme.css src/ui/styles.ts src/ui/components/*.tsx
git commit -m "feat(ui): panels/pills/toasts/modals + retokenize overlays (aesthetic pass phase C/6b)"
```

---

## Task 9: Cultivation sweep — Colony, Vivarium, Registry, SpecimenCard

**Files:**
- Modify: `src/ui/screens/Colony.tsx`, `Vivarium.tsx`, `Registry.tsx`, `SequencerPlaceholder.tsx`
- Modify: `src/ui/components/SpecimenCard.tsx`, `EmptyColony.tsx`, `TierBadge.tsx`
- Modify: `src/ui/styles.ts` — retokenize `grid`, `card`, `cardSprite`, `cardFooter`, `badge`, `highlightedCard`, `emptyState`, `emptyStateTitle`, `emptyStateBody`, `injuredCardOverlay`, `culledCardOverlay`, `lineageLine`, `restLine`, `injuredLine`, `parentSlot*`; add a couple new tier-section-header styles

**Interfaces:**
- Consumes: everything from Tasks 1–8
- Produces: Colony/Vivarium/Registry rendered with Lab register, dark ground, stamped section headers, retokenized cards.

- [ ] **Step 1: Baseline verify**

Run: `npm run typecheck && npm test && npm run build`

- [ ] **Step 2: Retokenize card + grid entries in `styles.ts`**

Replace these entries:

`grid`:
```ts
grid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
} as CSSProperties,
```

`card` (function returning CSSProperties — retain tint parameter):
```ts
card: (bgTint: string): CSSProperties => ({
  position: 'relative',
  aspectRatio: '5 / 7',
  background: bgTint,   // caller passes tint, still valid — but tints should be dark
  border: `1px solid ${TOKENS.tealDeep}`,
  borderRadius: 8,
  padding: 8,
  boxShadow: TOKENS.rimTeal,
  overflow: 'hidden',
  color: TOKENS.inkPrimary,
}),
```

Callers of `styles.card(bgTint)` currently pass light Tailwind-style tint values. Grep for `styles.card(` and audit — every caller should pass a dark token: `TOKENS.groundPanel` for default cards, `TOKENS.tealAbyss` for injured, etc. Update caller sites accordingly.

`cardSprite`:
```ts
cardSprite: {
  width: '100%',
  height: 'calc(100% - 32px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(circle at center, rgba(127,255,155,0.06) 0%, transparent 60%)',
  borderRadius: 4,
} as CSSProperties,
```

`cardFooter`:
```ts
cardFooter: {
  position: 'absolute',
  bottom: 6,
  left: 8,
  right: 8,
  fontFamily: TOKENS.fontMono,
  fontSize: 11,
  letterSpacing: '0.04em',
  color: TOKENS.inkLab,
  textAlign: 'center',
} as CSSProperties,
```

`badge` (tier badge — a stamped chip):
```ts
badge: (color: string): CSSProperties => ({
  position: 'absolute',
  top: 6,
  right: 6,
  padding: '2px 6px',
  borderRadius: 2,
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  fontFamily: TOKENS.fontDisplay,
  color: TOKENS.groundVoid,   // dark text on the tier color
  backgroundColor: color,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
}),
```

`highlightedCard`:
```ts
highlightedCard: {
  boxShadow: TOKENS.rimBio,
  transition: 'box-shadow 240ms ease',
} as CSSProperties,
```

`injuredCardOverlay`:
```ts
injuredCardOverlay: {
  opacity: 0.55,
  cursor: 'not-allowed',
  filter: 'sepia(0.3) hue-rotate(-20deg)',
} as CSSProperties,
```

`culledCardOverlay`:
```ts
culledCardOverlay: {
  boxShadow: `inset 0 0 0 2px ${TOKENS.signalDanger}55`,
} as CSSProperties,
```

`emptyState`:
```ts
emptyState: {
  textAlign: 'center',
  padding: '80px 24px',
  color: TOKENS.inkDim,
  fontFamily: TOKENS.fontMono,
} as CSSProperties,
```

`emptyStateTitle`:
```ts
emptyStateTitle: {
  fontSize: 20,
  fontFamily: TOKENS.fontDisplay,
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: TOKENS.inkLab,
  marginBottom: 8,
} as CSSProperties,
```

`emptyStateBody`:
```ts
emptyStateBody: {
  fontSize: 14,
  color: TOKENS.inkSecondary,
  marginBottom: 32,
} as CSSProperties,
```

`lineageLine`, `restLine`, `injuredLine` — all get `color: TOKENS.inkLab` (last one keeps `TOKENS.signalWarn`), `fontFamily: TOKENS.fontMono`.

`parentSlotEmpty`, `parentSlotFilled`, `parentSlotClear`, `parentSlotIdLine`, `parentSlotGenLine` — retokenize:
- Empty: dashed `TOKENS.tealDeep`, color `TOKENS.inkDim`, background `transparent`.
- Filled: solid `TOKENS.teal`, background `TOKENS.groundPanel`, color `TOKENS.inkLab`. Add `className="a-bio-pulse"` conditionally when both parents are set (this hook lives in Task 10).
- Clear: `TOKENS.groundRaised` background, `TOKENS.inkSecondary` color.

- [ ] **Step 3: Add a `tierSectionHeader` helper style**

Add to `styles.ts`:
```ts
tierSectionHeader: (color: string): CSSProperties => ({
  display: 'flex',
  alignItems: 'baseline',
  gap: 12,
  padding: '8px 0 6px 0',
  borderBottom: `1px solid ${color}`,
  marginBottom: 8,
  marginTop: 16,
}),

tierSectionLabel: (color: string): CSSProperties => ({
  fontFamily: TOKENS.fontDisplay,
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color,
}),
```

- [ ] **Step 4: Wire `data-register="lab"` on Colony, Vivarium, Registry, SequencerPlaceholder**

For each screen, ensure the outer `<main>` element carries `data-register="lab"`. Example on `Colony.tsx`:
```tsx
<main style={styles.page} data-register="lab">
  ...
</main>
```

Do the same for `Vivarium.tsx`, `Registry.tsx`, `SequencerPlaceholder.tsx`.

- [ ] **Step 5: Apply stamped section headers on Colony (per-tier groups)**

Read `src/ui/screens/Colony.tsx`. Find where tier groups are rendered (mapping over `TIERS.filter(...)`). Wrap each group's header in the new style:

```tsx
<div style={styles.tierSectionHeader(TIER_COLORS[tier])}>
  <h2 style={styles.tierSectionLabel(TIER_COLORS[tier])} data-testid={`colony-tier-header-${tier}`}>
    {TERMS.tiers[tier]}
  </h2>
  <span style={{ color: TOKENS.inkDim, fontFamily: TOKENS.fontMono, fontSize: 12 }}>
    {groupUnits.length} on ice
  </span>
</div>
```

If a `data-testid="colony-tier-header-${tier}"` didn't previously exist, this addition is fine (adding testids is never a breaking change). If it did exist under a different name, preserve the original.

Apply the same pattern to `Vat.tsx` in Task 10 (don't touch it yet).

- [ ] **Step 6: Apply Registry archival treatment**

Read `src/ui/screens/Registry.tsx`. The Registry should feel colder — deep teal on void, mono body, no glow. Replace section headers with stamped display font, entries with mono body. Registry's structure varies; preserve testids and behavior; adjust visual tokens only.

- [ ] **Step 7: SequencerPlaceholder — iron plate with stencil**

Read `src/ui/screens/SequencerPlaceholder.tsx`. Rewrite the body area to wear a `.panel--iron` class and stamped title. Keep the placeholder message intent but rephrase to spec: "Sequencing subsystem — offline. Deliverable in a later capital cycle." Preserve testids.

Example structure:
```tsx
<main style={styles.page} data-register="lab" data-testid="sequencer-placeholder">
  <h1 className="text-stamp" style={styles.headerTitle}>{TERMS.sequencer}</h1>
  <div className="panel panel--iron" style={{ marginTop: 24 }}>
    <div className="text-stamp" style={{ fontSize: 18, color: TOKENS.signalWarn, marginBottom: 12 }}>
      Under Construction
    </div>
    <p className="text-readout" style={{ color: TOKENS.inkSecondary }}>
      Sequencing subsystem — offline. Deliverable in a later capital cycle.
    </p>
  </div>
</main>
```

- [ ] **Step 8: EmptyColony visual pass**

Read `src/ui/components/EmptyColony.tsx`. Ensure it wraps in `styles.emptyState` (already retokenized) and picks up the `.text-stamp` on the title.

- [ ] **Step 9: Verify**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass. If tests break on card background colors or callers passing old tints, fix the caller sites to pass token values.

- [ ] **Step 10: Commit**

```bash
git add src/ui/screens/Colony.tsx src/ui/screens/Vivarium.tsx src/ui/screens/Registry.tsx src/ui/screens/SequencerPlaceholder.tsx src/ui/components/SpecimenCard.tsx src/ui/components/EmptyColony.tsx src/ui/components/TierBadge.tsx src/ui/styles.ts
git commit -m "feat(ui): Cultivation sweep — Colony/Vivarium/Registry/SpecimenCard (aesthetic pass phase D/7)"
```

---

## Task 10: Cultivation sweep — Vat, DNALab, Breed, ParentSlot, breed/decant buttons

**Files:**
- Modify: `src/ui/screens/Vat.tsx`, `DNALab.tsx`, `Breed.tsx`
- Modify: `src/ui/components/ParentSlot.tsx`, `BreedButton.tsx`, `DecantButton.tsx`, `BreedIndicator.tsx`, `HarvestIndicator.tsx`, `FailsafeIndicator.tsx`
- Modify: `src/ui/styles.ts` — retokenize `breedSection`, `breedParentsRow`, `breedTimesX`, `breedConfirmRow`, `breedHint`, `harvestIndicator`, `breedIndicator`, `failsafeIndicator`

**Interfaces:**
- Consumes: everything from Tasks 1–9
- Produces: Vat/DNALab/Breed on Lab register; bio-pulse selection on Vat specimen selection; bio-pulse on parent slot pair when both filled; `.a-decant-emerge` on newly-created specimen cards (identified by mount time)

- [ ] **Step 1: Baseline verify**

Run: `npm run typecheck && npm test && npm run build`

- [ ] **Step 2: Retokenize Breed and indicator styles**

`breedSection`, `breedConfirmRow`, `breedParentsRow` — no color changes (layout). `breedTimesX` → `color: TOKENS.inkDim`, keep mono font. `breedHint` → `color: TOKENS.inkDim`, keep font-size.

`harvestIndicator` → `color: TOKENS.inkLab`, `fontFamily: TOKENS.fontMono`.
`breedIndicator` → same.
`failsafeIndicator` → `color: TOKENS.signalWarn`, `background: 'rgba(240, 184, 64, 0.1)'`, `border: '1px solid ' + TOKENS.signalWarn + '55'`.

- [ ] **Step 3: Wire `data-register="lab"` on Vat, DNALab, Breed**

Add `data-register="lab"` to the outer `<main>` of each.

- [ ] **Step 4: Vat — cull button is danger, selection uses bio-pulse, add bubble bg**

Read `src/ui/screens/Vat.tsx`. Update:

1. Cull All button — pass `className="btn btn--danger"` in addition to existing style. The `<button data-testid="vat-cull-all-button">` should have `className="btn btn--danger"`.

2. Selection outline — the current code does:
```tsx
style={{
  cursor: 'pointer',
  outline: selection.has(unit.id) ? '2px solid #2563eb' : 'none',
  outlineOffset: 2,
}}
```
Change to:
```tsx
className={selection.has(unit.id) ? 'a-bio-pulse' : undefined}
style={{
  cursor: 'pointer',
  borderRadius: 8,
}}
```
The `.a-bio-pulse` class provides the breathing rim; drop the hard outline.

3. Tier section headers use `styles.tierSectionHeader(TIER_COLORS[tier])` + `styles.tierSectionLabel(TIER_COLORS[tier])` — same pattern as Colony Task 9 Step 5.

4. "Vat these 10" per-tier button — `className="btn btn--primary"`.

5. Add subtle bubble background behind the header only. Above the `<h1>`:
```tsx
<div style={{ position: 'relative', overflow: 'hidden' }}>
  <div className="a-vat-bubble" style={{
    position: 'absolute',
    top: 8, left: '30%',
    width: 6, height: 6,
    borderRadius: '50%',
    background: TOKENS.bioGreen,
    opacity: 0.06,
    filter: 'blur(1px)',
  }} />
  <div className="a-vat-bubble" style={{
    position: 'absolute',
    top: 4, left: '55%',
    width: 4, height: 4,
    borderRadius: '50%',
    background: TOKENS.bioGreen,
    opacity: 0.05,
    animationDelay: '1.4s',
    filter: 'blur(1px)',
  }} />
  <h1 className="text-stamp" style={styles.headerTitle} data-testid="vat-header">
    The Vat
  </h1>
</div>
```
Preserve any pre-existing `data-testid` — if there wasn't one, this is an addition.

- [ ] **Step 5: Breed — bio-pulse on parent-pair, hero breed button, stamped times-x**

Read `src/ui/screens/Breed.tsx`. Locate the section that renders the two `ParentSlot` components. When both parents are set (`parentA && parentB`), wrap the row (or each ParentSlot) with `className="a-bio-pulse"`.

For the BreedButton, when ready (both parents present, cost payable, etc.), the button should render `className="btn btn--primary"` and inline-style `boxShadow: TOKENS.bioGlowHot`. Read the current ready-detection logic and mirror it.

For the `×` character between parents, use `.text-stamp` and `TOKENS.inkDim`.

- [ ] **Step 6: DNALab — sequencer readouts, bio-green gauges**

Read `src/ui/screens/DNALab.tsx`. Wherever numeric genome data is rendered, ensure it uses `className="text-readout"` with `color: TOKENS.inkLab`. Any bar/gauge fills should use `TOKENS.bioGreen` (this is the one Lab screen where bio-green is featured heavily). If the current DNALab renders as simple text (no bars), just retokenize colors — do not invent new UI elements.

- [ ] **Step 7: Decant emerge — brief animation on newly-decanted card**

In `src/state/colony.ts` there's a decant/breed reducer that creates new units. We are NOT changing state. Instead, in `Colony.tsx` (or wherever the units are rendered), detect the newest unit by max ID and apply `className="a-decant-emerge"` for a single render:

```tsx
// Near the top of the render:
const newestId = units.length > 0 ? Math.max(...units.map(u => u.id)) : -1;
const [lastSeenNewest, setLastSeenNewest] = useState(newestId);
useEffect(() => { setLastSeenNewest(newestId); }, [newestId]);
const justArrivedId = newestId !== lastSeenNewest ? newestId : -1;

// When rendering each card:
<div key={u.id} className={u.id === justArrivedId ? 'a-decant-emerge' : undefined}>
  <SpecimenCard row={unitToRow(u)} culled={u.culled} />
</div>
```

Add `useState`, `useEffect` to imports if not already present. Never mutate state; this is a pure render-side effect.

- [ ] **Step 8: Verify**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass. If Vat tests assert on the blue outline color, update matchers.

- [ ] **Step 9: Commit**

```bash
git add src/ui/screens/Vat.tsx src/ui/screens/DNALab.tsx src/ui/screens/Breed.tsx src/ui/screens/Colony.tsx src/ui/components/ParentSlot.tsx src/ui/components/BreedButton.tsx src/ui/components/DecantButton.tsx src/ui/components/BreedIndicator.tsx src/ui/components/HarvestIndicator.tsx src/ui/components/FailsafeIndicator.tsx src/ui/styles.ts
git commit -m "feat(ui): Cultivation sweep — Vat/DNALab/Breed + bio-pulse + decant-emerge (aesthetic pass phase D/8)"
```

---

## Task 11: Conquest sweep — Incursion, ticker, front cards, garrison overlay, result summary

**Files:**
- Modify: `src/ui/screens/Incursion.tsx`
- Modify: `src/ui/components/IncursionTicker.tsx`, `IncursionBeat.tsx`, `IncursionResultSummary.tsx`, `FrontCard.tsx`, `GarrisonPickerOverlay.tsx`, `IncursionIndicator.tsx` (if it exists)
- Modify: `src/ui/styles.ts` — retokenize `incursionTicker`, `incursionBeat*`, `incursionSkipButton`, `incursionSection`, `incursionFrontsRow`, `incursionTeamRow`, `incursionHint`, `incursionSlot*`, `incursionLaunchRow`, `incursionLaunchButton*`, `incursionContinueButton`, `frontCard*`
- Modify: `src/ui/theme.css` — append `.scanline-overlay` utility

**Interfaces:**
- Consumes: everything from Tasks 1–10
- Produces: Incursion screen on `data-register="conquest"`, iron plate throughout, rust-colored launch button, CRT scanline overlay on ticker, per-beat glitch animation, `.a-stamp-in` on front-card selection.

- [ ] **Step 1: Baseline verify**

Run: `npm run typecheck && npm test && npm run build`

- [ ] **Step 2: Append scanline overlay utility to `theme.css`**

```css
/* CRT scanline overlay — apply as a positioned pseudo via className */
.scanline-overlay {
  position: relative;
  isolation: isolate;
}
.scanline-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 2px,
    rgba(255, 255, 255, 0.02) 3px,
    rgba(255, 255, 255, 0.02) 4px
  );
  pointer-events: none;
  z-index: 1;
}
```

- [ ] **Step 3: Retokenize incursion styles in `styles.ts`**

- `incursionTicker` → `background: TOKENS.ironPlate`, `color: TOKENS.inkPrimary`, `border: '1px solid ' + TOKENS.ironLight`, `borderRadius: 8`, `padding: 24`, `minHeight: 220`, add `boxShadow: TOKENS.rimIron`. Keep `display: 'flex', flexDirection: 'column', gap: 12`.
- `incursionBeat` → `fontFamily: TOKENS.fontMono`, `fontSize: 14`, `lineHeight: 1.6`, `color: TOKENS.inkPrimary`, `letterSpacing: '0.02em'`.
- `incursionBeatVisible`, `incursionBeatHidden` — unchanged (opacity toggles).
- `incursionSkipButton` — apply `.btn.btn--ghost.btn--stamp` at the component level; retokenize style to `background: 'transparent', border: '1px solid ' + TOKENS.ironLight, color: TOKENS.inkSecondary, fontFamily: TOKENS.fontDisplay, letterSpacing: '0.08em', textTransform: 'uppercase'`.
- `incursionSection` — no color, layout only.
- `incursionHint` → `color: TOKENS.inkDim`, `fontFamily: TOKENS.fontMono`.
- `incursionSlotEmpty` → dashed `TOKENS.ironLight`, color `TOKENS.inkDim`, `fontFamily: TOKENS.fontMono`.
- `incursionSlotFilled` → solid `TOKENS.rust`, `background: TOKENS.ironPlate`, color `TOKENS.inkPrimary`.
- `incursionSlotClear` → `background: TOKENS.iron`, color `TOKENS.inkSecondary`.
- `incursionSlotIdLine`, `incursionSlotGenLine` — `color: TOKENS.inkPrimary` and `TOKENS.inkDim`, `fontFamily: TOKENS.fontMono`.
- `incursionLaunchButton` → `background: TOKENS.ironPlate`, `border: '1px solid ' + TOKENS.rust`, `color: TOKENS.rustHot`, `fontFamily: TOKENS.fontDisplay`, `letterSpacing: '0.1em'`, `textTransform: 'uppercase'`, `padding: '14px 32px'`. Apply `className="btn btn--danger btn--stamp"` on the button element.
- `incursionLaunchButtonDisabled` → similar shape but `border: '1px solid ' + TOKENS.iron`, `color: TOKENS.inkDim`, `opacity: 0.5`, `cursor: 'not-allowed'`.
- `incursionContinueButton` → apply `className="btn btn--ghost btn--stamp"`, style with `border: '1px solid ' + TOKENS.ironLight`, `color: TOKENS.inkPrimary`.
- `frontCard` / `frontCardSelected` / `frontCardCaptured` / `frontCardCooldown` — swap to iron backgrounds:
  - Base: `background: TOKENS.ironPlate`, `border: '2px solid ' + TOKENS.ironLight`, `color: TOKENS.inkPrimary`, drop the light backgrounds.
  - Selected: `border: '2px solid ' + TOKENS.rust`, add `boxShadow: '0 0 0 3px rgba(122, 52, 25, 0.35)'`.
  - Captured: `border: '2px solid ' + TOKENS.bioGreenDim`, `background: TOKENS.bioGreenDeep`, `color: TOKENS.bioGreen`. This is the "bio-green stamp overtaking iron" moment — allowed usage of bio-green as fill because it's a hero moment (territory captured).
  - Cooldown: `border: '2px solid ' + TOKENS.iron`, `background: TOKENS.groundPanel`, `color: TOKENS.inkDim`, `opacity: 0.7`.
- `frontCardLabel` → `fontFamily: TOKENS.fontDisplay`, `letterSpacing: '0.06em'`, `textTransform: 'uppercase'`, `color: 'inherit'`.
- `frontCardStatus`, `frontCardGarrisonRow` → `fontFamily: TOKENS.fontMono`, `color: TOKENS.inkSecondary`.
- `frontCardGarrisonSlotEmpty` → dashed `TOKENS.ironLight`, `color: TOKENS.inkDim`.
- `frontCardGarrisonSlotFilled` → `border: '1px solid ' + TOKENS.bruiseGlow`, `background: TOKENS.bruise + '33'`, `color: TOKENS.inkLab`.
- `frontCardGarrisonSlotClear` → `color: TOKENS.inkDim`.
- `frontCardFlareLine`, `frontCardHardeningLine` → `color: TOKENS.signalWarn`, `fontFamily: TOKENS.fontMono`.
- `frontCardRadicalizationNote` → `color: TOKENS.inkDim`, italic, `fontFamily: TOKENS.fontMono`.

- [ ] **Step 4: Incursion screen — Conquest register + scanline ticker**

Read `src/ui/screens/Incursion.tsx`. Add `data-register="conquest"` to `<main>`. Wrap the `IncursionTicker` render in `className="scanline-overlay"`. Ensure the launch button element has `className="btn btn--danger btn--stamp"`.

- [ ] **Step 5: IncursionBeat — glitch on entry**

Read `src/ui/components/IncursionBeat.tsx`. When a new beat mounts (or transitions to visible), apply `className="a-ticker-glitch"` for one animation cycle. Simplest approach: give the beat element `className={visible ? 'a-ticker-glitch' : undefined}` re-keyed by the beat index so React remounts:

```tsx
<div
  key={beatIndex}
  className={visible ? 'a-ticker-glitch' : undefined}
  style={{ ...styles.incursionBeat, ...(visible ? styles.incursionBeatVisible : styles.incursionBeatHidden) }}
  data-testid={`incursion-beat-${beatIndex}`}
>
  {text}
</div>
```
Preserve original testid naming.

- [ ] **Step 6: FrontCard — stamp-in on selection**

Read `src/ui/components/FrontCard.tsx`. When a card's state transitions from unselected → selected (or first render if already selected), apply `className="a-stamp-in"` for one cycle. Track via `useEffect` + a `stampKey` state, similar to the FlashOnChange pattern from Task 4.

- [ ] **Step 7: IncursionResultSummary — iron plaque with verdict stamped diagonally**

Read `src/ui/components/IncursionResultSummary.tsx`. Wrap the visible summary in `className="modal-backdrop"` (assuming it's already an overlay) with a `className="modal panel--iron"` card. The verdict text should render in `.text-stamp` at a larger size, rotated:

```tsx
<div className="text-stamp" style={{
  fontSize: 36,
  color: verdict === 'VICTORY' ? TOKENS.bioGreen : verdict === 'ROUTED' ? TOKENS.signalDanger : TOKENS.signalWarn,
  transform: 'rotate(-4deg)',
  textAlign: 'center',
  margin: '16px 0',
  letterSpacing: '0.1em',
}}>
  {verdictText}
</div>
```
Match the exact verdict strings the store already emits — read the current component to find them; do not invent new ones.

- [ ] **Step 8: GarrisonPickerOverlay — instrument panel**

Read `src/ui/components/GarrisonPickerOverlay.tsx`. Ensure the overlay uses the retokenized `garrisonPickerOverlay` style (already done in Task 8, but verify) and rows use hover states (add `:hover` via className `.garrison-row`, or inline `onMouseEnter/Leave`). Simplest: add a small CSS rule to theme.css:

```css
.garrison-row {
  transition: background var(--dur-fast) var(--ease-clinic);
}
.garrison-row:hover {
  background: rgba(20, 184, 166, 0.1);
  border-left: 2px solid var(--bio-green);
}
```

Then add `className="garrison-row"` on each row in the component.

- [ ] **Step 9: Verify**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass. Tests may assert on incursion element styles; update matchers to new tokens.

- [ ] **Step 10: Commit**

```bash
git add src/ui/screens/Incursion.tsx src/ui/components/IncursionTicker.tsx src/ui/components/IncursionBeat.tsx src/ui/components/IncursionResultSummary.tsx src/ui/components/FrontCard.tsx src/ui/components/GarrisonPickerOverlay.tsx src/ui/styles.ts src/ui/theme.css
git commit -m "feat(ui): Conquest sweep — Incursion + ticker CRT + front cards (aesthetic pass phase E/9)"
```

---

## Task 12: Conquest sweep — ConquestMap + register-aware nav underline

**Files:**
- Modify: `src/ui/screens/ConquestMap.tsx`
- Modify: `src/ui/components/AppShell.tsx` (register-aware active nav underline)
- Modify: `src/ui/styles.ts` — add `conquestMap*` styles

**Interfaces:**
- Consumes: everything from Tasks 1–11
- Produces: ConquestMap rendered on `data-register="conquest"`, iron ground, stamped territorial panels, captured overlay. AppShell tabs know which register each destination belongs to.

- [ ] **Step 1: Baseline verify**

Run: `npm run typecheck && npm test && npm run build && cat src/ui/screens/ConquestMap.tsx`

- [ ] **Step 2: Add register mapping in AppShell**

Modify `src/ui/components/AppShell.tsx` to know each surface's register:

Add near the top:
```ts
const REGISTER_BY_SURFACE: Readonly<Record<SurfaceId, 'lab' | 'conquest'>> = {
  'colony':       'lab',
  'dna-lab':      'lab',
  'breed':        'lab',
  'vivarium':     'lab',
  'vat':          'lab',
  'sequencer':    'lab',
  'registry':     'lab',
  'incursion':    'conquest',
  'conquest-map': 'conquest',
};
```

When rendering the active nav tab, override its border-bottom color based on register:
```tsx
const style = !unlocked
  ? styles.navTabLocked
  : isCurrent
    ? {
        ...styles.navTabActive,
        borderBottomColor: REGISTER_BY_SURFACE[id] === 'conquest' ? TOKENS.rust : TOKENS.teal,
      }
    : styles.navTab;
```

Import `TOKENS` at the top if not already.

- [ ] **Step 3: Retokenize + rewrite ConquestMap**

Read `src/ui/screens/ConquestMap.tsx`. Update:

1. `<main>` gets `data-register="conquest"`.
2. Header uses `.text-stamp` at display size, with something like "REGION I — [region name]" (read the current header to see what strings the store provides; preserve the data source).
3. The region-panel/territory-panel containers use `className="panel panel--iron"`.
4. Captured territories overlay `className="a-bio-pulse"` and use `TOKENS.bioGreenDeep` background + `TOKENS.bioGreen` border — the "organic overtaking iron" moment.
5. Progress bars (if any): use `TOKENS.rust` for contested fill, `TOKENS.bioGreen` for owned fill.
6. Region-conquered state uses the retokenized `regionConquered*` styles from Task 8.

Preserve all testids, props, and behavior.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass. AppShell test may assert on nav-tab-active border color; update matcher to accept either teal or rust based on register.

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/ConquestMap.tsx src/ui/components/AppShell.tsx src/ui/styles.ts
git commit -m "feat(ui): Conquest sweep — ConquestMap + register-aware nav (aesthetic pass phase E/10)"
```

---

## Task 13: Overlays polish — banners, callouts, tooltips, dev panel, away summary

**Files:**
- Modify: `src/ui/components/DirectiveBanner.tsx`, `FirstVisitCallout.tsx`, `TermTooltip.tsx`, `DevPanel.tsx`, `AwaySummary.tsx`, `IntroModal.tsx` (verify Task 8 changes stuck)
- Verify all remaining components: `RewardToast`, `UnlockedToast`, `ActionToast`, `TierBadge`, `SerumBadge` — retokenized correctly

**Interfaces:**
- Consumes: everything from Tasks 1–12
- Produces: all overlays wearing the new aesthetic

- [ ] **Step 1: Baseline verify**

Run: `npm run typecheck && npm test && npm run build`

- [ ] **Step 2: DirectiveBanner — iron plate with stencil left band**

Read `src/ui/components/DirectiveBanner.tsx`. The style is already retokenized in Task 8. Ensure the title uses `className="text-stamp"` and the container wears `className="panel panel--iron"` (drop the inline `background`/`borderLeft` if the class replaces them; adjust as needed).

- [ ] **Step 3: FirstVisitCallout — teal-accent iron plate**

Read `src/ui/components/FirstVisitCallout.tsx`. Similar treatment: `className="panel"` with left-band teal. Title uses `.text-stamp`, body uses `.text-readout`. Dismiss button uses `.btn.btn--ghost`.

- [ ] **Step 4: TermTooltip — dark instrument bubble**

Read `src/ui/components/TermTooltip.tsx`. Verify the retokenized `tooltipTrigger` and `tooltipBubble` are applied. If the tooltip mounts on hover, add `className="a-toast-slide"` — no, that's too much for a tooltip. Skip animation; the plain fade of `opacity` transition is enough.

- [ ] **Step 5: DevPanel — utilitarian iron plate**

Read `src/ui/components/DevPanel.tsx`. Deliberately no glow. Wrap the panel in `className="modal panel--iron"` on top of the existing structure. Buttons inside use `className="btn btn--ghost btn--stamp"`. Preserve every testid and handler.

- [ ] **Step 6: AwaySummary — full-screen instrument report**

Read `src/ui/components/AwaySummary.tsx`. Wrap in `className="modal-backdrop"` with body `className="modal panel--iron"`. Title uses `.text-stamp` "AWAY REPORT". Body rows use `.text-readout`. Preserve testids and dismiss behavior.

- [ ] **Step 7: RewardToast / UnlockedToast / ActionToast — verify Task 8 slide-in stuck**

Read each. Confirm each renders `className="a-toast-slide"` on mount and uses the retokenized `toast` style. Add if missing.

- [ ] **Step 8: SerumBadge + TierBadge**

Read `src/ui/components/SerumBadge.tsx` and `TierBadge.tsx`. Verify they use retokenized styles. TierBadge should render via `className="chip"` with tier color as inline `backgroundColor`.

- [ ] **Step 9: Verify**

Run: `npm run typecheck && npm test && npm run build`

- [ ] **Step 10: Commit**

```bash
git add src/ui/components/DirectiveBanner.tsx src/ui/components/FirstVisitCallout.tsx src/ui/components/TermTooltip.tsx src/ui/components/DevPanel.tsx src/ui/components/AwaySummary.tsx src/ui/components/RewardToast.tsx src/ui/components/UnlockedToast.tsx src/ui/components/ActionToast.tsx src/ui/components/SerumBadge.tsx src/ui/components/TierBadge.tsx
git commit -m "feat(ui): overlays + toasts + panels polish (aesthetic pass phase F/pre)"
```

---

## Task 14: Screen transitions + final polish + QA sweep

**Files:**
- Modify: `src/App.tsx` (apply `.a-screen-fade` on screen change keyed by `current`)
- Grep: `src/ui/styles.ts` (final check — no raw `#`-prefixed hex codes remaining outside `tokens.ts`)

**Interfaces:**
- Consumes: everything
- Produces: screen-nav feels intentional (fade + slide), all tokens verified, contrast + reduced-motion + focus rings sanity-checked

- [ ] **Step 1: Add screen-fade on nav change in `App.tsx`**

Modify the render of the screen switch. Wrap the `screen` in a keyed container so React remounts on each nav change and re-plays the `.a-screen-fade` animation:

```tsx
<AppShell current={current} onNavigate={setCurrent} directiveText={directiveText}>
  <DirectiveBanner />
  <div key={current} className="a-screen-fade">
    {screen}
  </div>
</AppShell>
```

Test that navigation still works and that focus doesn't get lost — the keyed wrapper does remount the whole tree, so any focus inside is dropped on nav. That's acceptable for this game since nav is user-driven.

- [ ] **Step 2: Grep for lingering hex codes outside tokens**

Run:
```bash
grep -nE "#[0-9a-fA-F]{3,8}\b" src/ui/styles.ts | grep -v '// ' || echo "clean"
```

Anything that shows up is a leaked hex code that should be a `TOKENS.*` reference. Fix any that remain.

Also grep the components:
```bash
grep -rnE "#[0-9a-fA-F]{3,8}\b" src/ui/components src/ui/screens | grep -vE "TOKENS\.|/\*|//"
```

Any raw hex in a component file is a leak (tokens should route through styles.ts or the CSS class). Investigate each and either move to `styles.ts` (referencing `TOKENS.*`) or replace with an existing class.

- [ ] **Step 3: Manual visual QA — start dev server and walk each surface**

Run: `npm run dev`
Open the game in a browser and click through:
- NewGameGate → wordmark visible pixel-perfect, hero button glows, ghost button muted
- Colony → dark ground, stamped section headers, cards have teal rim
- Vat → coldest surface, cull button rust, subtle bubbles, bio-pulse on selected specimens
- DNALab → bio-green readouts featured
- Breed → parent slots pulse when both filled, breed button glows when ready
- Vivarium → capacity readout
- Registry → archival cold, minimal glow
- Sequencer → iron placeholder plate
- Incursion → Conquest register, iron plate, ticker with scanlines, rust launch button
- ConquestMap → war-room, stamped territories

Then hover every button, focus with Tab (bio-green ring should be visible everywhere), open Cmd+Shift+D for DevPanel (should be utilitarian iron), open a term tooltip, trigger a toast (via any real action), navigate between screens (should fade).

Note any surfaces that look wrong. Fix inline.

- [ ] **Step 4: Reduced-motion check**

In the browser's dev tools, emulate `prefers-reduced-motion: reduce` (Chrome: Rendering panel → Emulate CSS media feature `prefers-reduced-motion`). Confirm:
- Screen transitions are instant (no fade)
- Toasts appear without slide
- Bio-pulse is off
- Vat bubbles are off

- [ ] **Step 5: Contrast spot-check**

Use the browser's built-in accessibility tools (or [WebAIM contrast checker](https://webaim.org/resources/contrastchecker/)) on:
- Body text (`--ink-primary` on `--ground-void`) — should be ≥ 7:1 (AAA)
- Secondary text (`--ink-secondary` on `--ground-void`) — should be ≥ 4.5:1 (AA)
- Nav tabs, HUD readouts
- Button text on button backgrounds
Log any failing contrast pair and adjust the offending token by lightening `--ink-*` slightly.

- [ ] **Step 6: Full test suite + build**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/ui/styles.ts src/ui/components/*.tsx src/ui/screens/*.tsx src/ui/theme.css
git commit -m "feat(ui): screen-fade transitions + final QA polish (aesthetic pass phase F/final)"
```

---

## Post-plan hygiene

- [ ] **Step 1: Verify no untracked files remain that should be committed**

```bash
git status
```
Expected: clean (or only files intentionally left untracked).

- [ ] **Step 2: Skim the log**

```bash
git log --oneline -20
```
Expected: 14 commits, one per task, each labelled with its phase (A–F) and task number.

- [ ] **Step 3: Push and open a PR (optional — user decides)**

Ask the user whether to push. Do not push without explicit confirmation.

---

## Notes on aesthetics-as-tests

This plan does not add new unit tests because the pass changes appearance and interaction feel, not behavior. Every existing test — behavior assertions — must keep passing. When a test breaks because a color or class changed, update the *matcher* (the color/class value the test expects), never the *assertion surface* (the behavior being verified).

The pragmatic quality gate is: after every task, `npm run typecheck && npm test && npm run build` all pass. That's the "test" for aesthetic work in a typed codebase without a visual-regression harness.

If a visual-regression harness is desired later (e.g. Percy, Chromatic, Playwright screenshots), that's a separate project and out of scope here.
