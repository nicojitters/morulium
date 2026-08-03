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
