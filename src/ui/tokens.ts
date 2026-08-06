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
  inkDim:        '#707d8a',
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
  rimInner:    'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
  rimTeal:     '0 0 0 1px rgba(20, 184, 166, 0.35), inset 0 1px 0 rgba(180, 240, 220, 0.08)',
  rimIron:     '0 0 0 1px rgba(180, 180, 190, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  rimBio:      '0 0 0 1px rgba(127, 255, 155, 0.4), 0 0 12px rgba(127, 255, 155, 0.45)',

  radiusXs: 2,
  radiusSm: 4,
  radiusMd: 8,
  radiusLg: 12,
} as const;
