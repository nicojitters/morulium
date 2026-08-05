import type { Genome, Tier } from './types';
import { createRng } from './rng';
import { rollGenome } from './genome';
import { computeRarity } from './rarity';
import { VAT_SUBSTREAM_PRIME, VAT_TIER_BUMP_TABLE } from '../state/vat';

const TIER_LADDER: readonly Tier[] = ['baseline', 'strain', 'mutant', 'chimera', 'progenitor'];
const MAX_ATTEMPTS = 1000;

export interface VatResolution {
  readonly donorIds: readonly [number, number, number, number, number, number, number, number, number, number];
  readonly outputId: number;
  readonly outputGenome: Genome;
  readonly inputTier: Tier;
  readonly outputTier: Tier;
  readonly bumpAmount: 0 | 1 | 2;
}

function rollGenomeOfExactTier(subseedBase: number, targetTier: Tier): Genome {
  for (let offset = 0; offset < MAX_ATTEMPTS; offset++) {
    const g = rollGenome(createRng(subseedBase + offset));
    if (computeRarity(g).tier === targetTier) return g;
  }
  throw new Error(`rollGenomeOfExactTier: exhausted ${MAX_ATTEMPTS} attempts for tier ${targetTier}`);
}

function rollBumpAmount(outputId: number, inputTier: Tier): 0 | 1 | 2 {
  const row = VAT_TIER_BUMP_TABLE[inputTier];
  const rng = createRng(outputId * VAT_SUBSTREAM_PRIME);
  const r = rng.next();
  if (r < row.bump0) return 0;
  if (r < row.bump0 + row.bump1) return 1;
  return 2;
}

export function resolveVatOperation(
  donorIds: readonly [number, number, number, number, number, number, number, number, number, number],
  outputId: number,
  inputTier: Tier,
): VatResolution {
  const bumpAmount = rollBumpAmount(outputId, inputTier);
  const inputIdx = TIER_LADDER.indexOf(inputTier);
  const outputIdx = Math.min(inputIdx + bumpAmount, TIER_LADDER.length - 1);
  const outputTier = TIER_LADDER[outputIdx]!;
  const genomeSeed = outputId * VAT_SUBSTREAM_PRIME + 100;
  const outputGenome = rollGenomeOfExactTier(genomeSeed, outputTier);
  return { donorIds, outputId, outputGenome, inputTier, outputTier, bumpAmount };
}
