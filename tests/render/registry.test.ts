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
