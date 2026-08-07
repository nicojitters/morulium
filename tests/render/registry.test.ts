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
    for (const allele of Object.values(ALLELES)) {
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
