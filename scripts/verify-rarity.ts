import { createRng } from '../src/sim/rng';
import { rollGenome } from '../src/sim/genome';
import { computeRarity } from '../src/sim/rarity';
import { resolveExpressed } from '../src/sim/genome';
import { LOCI } from '../src/sim/data/loci';
import type { Tier } from '../src/sim/types';
import { TERMS } from '../src/ui/terms';

const N = 20_000;

const tierTally: Record<string, number> = {};
const scoreHist: Record<number, number> = {};
const perLocus: Record<string, { total: number; byWeight: Record<number, number> }> = {};

for (let i = 0; i < N; i++) {
  const g = rollGenome(createRng(i + 1));
  const { score, tier } = computeRarity(g);

  tierTally[tier] = (tierTally[tier] ?? 0) + 1;
  scoreHist[score] = (scoreHist[score] ?? 0) + 1;

  for (const [locusId, pair] of Object.entries(g.loci)) {
    const locus = LOCI[locusId];
    if (!locus) continue;
    if (locus.type !== 'qualitative') continue;
    const w = resolveExpressed(locus, pair).rarityWeight;
    const pl = (perLocus[locusId] ??= { total: 0, byWeight: {} });
    pl.total += w;
    pl.byWeight[w] = (pl.byWeight[w] ?? 0) + 1;
  }
}

const pct = (n: number): string => `${((100 * n) / N).toFixed(2)}%`;

// eslint-disable-next-line no-console
console.log(`\n=== TIER DISTRIBUTION (N=${N}) ===`);
const TIER_ORDER: Tier[] = ['baseline', 'strain', 'mutant', 'chimera', 'progenitor'];
for (const tier of TIER_ORDER) {
  const n = tierTally[tier] ?? 0;
  // eslint-disable-next-line no-console
  console.log(TERMS.tiers[tier].padEnd(11), String(n).padStart(6), pct(n).padStart(8));
}

// eslint-disable-next-line no-console
console.log(`\n=== SCORE HISTOGRAM ===`);
const scoreKeys = Object.keys(scoreHist).map(Number);
const maxScore = scoreKeys.length > 0 ? Math.max(...scoreKeys) : 0;
for (let s = 0; s <= maxScore; s++) {
  const n = scoreHist[s] ?? 0;
  if (!n) continue;
  const bar = '#'.repeat(Math.round((60 * n) / N));
  // eslint-disable-next-line no-console
  console.log(String(s).padStart(3), String(n).padStart(6), pct(n).padStart(8), bar);
}

// eslint-disable-next-line no-console
console.log(`\n=== PER-LOCUS EXPRESSED CONTRIBUTION (qualitative only) ===`);
for (const [locusId, pl] of Object.entries(perLocus)) {
  const mean = (pl.total / N).toFixed(3);
  const breakdown = Object.entries(pl.byWeight)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([w, n]) => `w${w}:${pct(n)}`)
    .join('  ');
  // eslint-disable-next-line no-console
  console.log(locusId.padEnd(12), `mean ${mean}`.padEnd(13), breakdown);
}
