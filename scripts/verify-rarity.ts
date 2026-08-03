import { createRng } from '../src/sim/rng';
import { rollGenome } from '../src/sim/genome';
import { computeRarity } from '../src/sim/rarity';

const N = 10_000;
const tally: Record<string, number> = {};
let scoreSum = 0;
let scoreMax = 0;
let scoreMin = Number.POSITIVE_INFINITY;

for (let i = 0; i < N; i++) {
  const { score, tier } = computeRarity(rollGenome(createRng(i + 1)));
  tally[tier] = (tally[tier] ?? 0) + 1;
  scoreSum += score;
  if (score > scoreMax) scoreMax = score;
  if (score < scoreMin) scoreMin = score;
}

const order = ['Basic', 'Variant', 'Adapted', 'Evolved', 'Apex'];
// eslint-disable-next-line no-console
console.log(`N = ${N}`);
for (const tier of order) {
  const n = tally[tier] ?? 0;
  // eslint-disable-next-line no-console
  console.log(tier.padEnd(8), String(n).padStart(5), `${((100 * n) / N).toFixed(2)}%`);
}
// eslint-disable-next-line no-console
console.log(`\nscore: min=${scoreMin}  avg=${(scoreSum / N).toFixed(2)}  max=${scoreMax}`);
