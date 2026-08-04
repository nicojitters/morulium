import { describe, it, expect } from 'vitest';
import { breedGenome, MUTATION_RATE } from '../../src/sim/breed';
import { rollGenome } from '../../src/sim/genome';
import { createRng } from '../../src/sim/rng';
import { LOCI } from '../../src/sim/data/loci';
import type { Genome } from '../../src/sim/types';

describe('MUTATION_RATE', () => {
  it('is 0.015', () => expect(MUTATION_RATE).toBe(0.015));
});

describe('breedGenome', () => {
  const pA: Genome = rollGenome(createRng(101));
  const pB: Genome = rollGenome(createRng(202));

  it('is deterministic: same seed + rate returns identical result', () => {
    const a = breedGenome(pA, pB, createRng(7), 0.01);
    const b = breedGenome(pA, pB, createRng(7), 0.01);
    expect(a.genome).toEqual(b.genome);
    expect([...a.mutatedLoci].sort()).toEqual([...b.mutatedLoci].sort());
  });

  it('at mutationRate=0, every offspring allele comes from a parent at that locus', () => {
    const { genome, mutatedLoci } = breedGenome(pA, pB, createRng(11), 0);
    expect(mutatedLoci.size).toBe(0);
    for (const locusId of Object.keys(LOCI)) {
      const [childA, childB] = genome.loci[locusId]!;
      const parentAPair = pA.loci[locusId]!;
      const parentBPair = pB.loci[locusId]!;
      // childA came from parent A; childB came from parent B
      expect(parentAPair).toContain(childA);
      expect(parentBPair).toContain(childB);
    }
  });

  it('at mutationRate=1, mutatedLoci covers every locus (both sides mutated)', () => {
    const { mutatedLoci } = breedGenome(pA, pB, createRng(13), 1);
    expect(mutatedLoci.size).toBe(Object.keys(LOCI).length);
  });

  it('homozygous parents produce heterozygous offspring at zero mutation', () => {
    // Build two homozygous parents where every locus is [a, a] for pA, [b, b] for pB
    // using the first two alleles of each locus in the LOCI table.
    const homoA: Genome = { loci: Object.fromEntries(
      Object.values(LOCI).map((l) => [l.id, [l.alleles[0]!, l.alleles[0]!] as const]),
    ) };
    const homoB: Genome = { loci: Object.fromEntries(
      Object.values(LOCI).map((l) => {
        // If the locus has only one allele, both parents collide; skip by using [0,0]
        const b = l.alleles[1] ?? l.alleles[0]!;
        return [l.id, [b, b] as const];
      }),
    ) };
    const { genome } = breedGenome(homoA, homoB, createRng(17), 0);
    for (const [locusId, pair] of Object.entries(genome.loci)) {
      const [a, b] = pair;
      expect(a).toBe(homoA.loci[locusId]![0]);
      expect(b).toBe(homoB.loci[locusId]![0]);
    }
  });

  it('mutatedLoci is empty when mutationRate=0', () => {
    const { mutatedLoci } = breedGenome(pA, pB, createRng(19), 0);
    expect(mutatedLoci.size).toBe(0);
  });

  it('default mutationRate uses MUTATION_RATE (0.015)', () => {
    // Both calls should produce the same result — the default arg is stable
    const a = breedGenome(pA, pB, createRng(23));
    const b = breedGenome(pA, pB, createRng(23), MUTATION_RATE);
    expect(a.genome).toEqual(b.genome);
    expect([...a.mutatedLoci].sort()).toEqual([...b.mutatedLoci].sort());
  });

  it('offspring genome contains exactly the LOCI keys (no more, no less)', () => {
    const { genome } = breedGenome(pA, pB, createRng(29));
    expect(Object.keys(genome.loci).sort()).toEqual(Object.keys(LOCI).sort());
  });
});
