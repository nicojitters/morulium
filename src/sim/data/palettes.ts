import type { Palette } from '../types';

export const PALETTES: Readonly<Record<string, Palette>> = Object.freeze({
  pal_ash:   { id: 'pal_ash',   ramp: ['#1c1c1c', '#3d3d3d', '#6e6e6e', '#b6b6b6'] },
  pal_rust:  { id: 'pal_rust',  ramp: ['#2a1108', '#5c1d0e', '#a83c14', '#e28550'] },
  pal_moss:  { id: 'pal_moss',  ramp: ['#0d1a10', '#254a2c', '#4f7c48', '#a6c58a'] },
  pal_bloom: { id: 'pal_bloom', ramp: ['#20081d', '#5a1450', '#a835a1', '#f7a3d7'] },
});
