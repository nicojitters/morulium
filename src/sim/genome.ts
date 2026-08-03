import type { Genome, PhenotypeDescriptor, Allele, Locus } from './types';
import { LOCI, ALLELES } from './data/loci';
import type { SeededRng } from './rng';
import { weightedPick } from './pick';

export function rollGenome(rng: SeededRng): Genome {
  const loci: Record<string, readonly [string, string]> = {};
  for (const locus of Object.values(LOCI)) {
    const pool: Allele[] = locus.alleles.map((id) => {
      const a = ALLELES[id];
      if (!a) throw new Error(`unknown allele in locus ${locus.id}: ${id}`);
      return a;
    });
    const a = weightedPick(pool, rng).id;
    const b = weightedPick(pool, rng).id;
    loci[locus.id] = [a, b] as const;
  }
  return { loci };
}

export function resolveExpressed(locus: Locus, pair: readonly [string, string]): Allele {
  const [aId, bId] = pair;
  const a = ALLELES[aId];
  const b = ALLELES[bId];
  if (!a) throw new Error(`unknown allele: ${aId}`);
  if (!b) throw new Error(`unknown allele: ${bId}`);
  if (aId === bId) return a;

  const aDom = a.dominance === 'dominant';
  const bDom = b.dominance === 'dominant';
  if (aDom && !bDom) return a;
  if (bDom && !aDom) return b;

  // same class (both dominant, or compound-het recessive from mutation):
  // tie-break by position in locus.alleles — earlier = more dominant.
  return locus.alleles.indexOf(aId) <= locus.alleles.indexOf(bId) ? a : b;
}

export function expressPhenotype(genome: Genome): PhenotypeDescriptor {
  const expressed: Record<string, string> = {};
  for (const [locusId, pair] of Object.entries(genome.loci)) {
    const locus = LOCI[locusId];
    if (!locus) throw new Error(`unknown locus in genome: ${locusId}`);
    expressed[locusId] = resolveExpressed(locus, pair).id;
  }
  const paletteId = expressed['palette'];
  if (!paletteId) throw new Error('genome has no palette locus');
  return { expressed, palette: paletteId };
}
