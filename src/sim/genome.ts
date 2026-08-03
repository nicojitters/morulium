import type { Genome, PhenotypeDescriptor } from './types';
import { LOCI, ALLELES } from './data/loci';
import type { SeededRng } from './rng';

export function rollGenome(rng: SeededRng): Genome {
  const loci: Record<string, readonly [string, string]> = {};
  for (const locus of Object.values(LOCI)) {
    const a = rng.pick(locus.alleles);
    const b = rng.pick(locus.alleles);
    loci[locus.id] = [a, b] as const;
  }
  return { loci };
}

export function expressPhenotype(genome: Genome): PhenotypeDescriptor {
  const expressed: Record<string, string> = {};

  for (const [locusId, [a, b]] of Object.entries(genome.loci)) {
    expressed[locusId] = pickExpressedAllele(a, b);
  }

  const paletteId = expressed['palette'];
  if (!paletteId) throw new Error('genome has no palette locus');

  return { expressed, palette: paletteId };
}

function pickExpressedAllele(aId: string, bId: string): string {
  if (aId === bId) return aId;
  const a = ALLELES[aId];
  const b = ALLELES[bId];
  if (!a || !b) throw new Error(`unknown allele: ${!a ? aId : bId}`);

  // dominant vs recessive → dominant wins
  if (a.dominance === 'dominant' && b.dominance === 'recessive') return aId;
  if (b.dominance === 'dominant' && a.dominance === 'recessive') return bId;

  // same dominance class (both dominant OR both recessive from mutation) →
  // higher rarityWeight wins; ties break by lexicographic id ascending.
  if (a.rarityWeight !== b.rarityWeight) {
    return a.rarityWeight > b.rarityWeight ? aId : bId;
  }
  return aId < bId ? aId : bId;
}
