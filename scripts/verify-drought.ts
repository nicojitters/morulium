import { rollGenome } from '../src/sim/genome';
import { createRng } from '../src/sim/rng';
import { computeRarity } from '../src/sim/rarity';
import {
  DROUGHT_THRESHOLD,
  FAILSAFE_MIN_TIER,
  FAILSAFE_SUBSTREAM_PRIME,
  rollGenomeAtLeast,
  tierAtLeast,
} from '../src/state/failsafe';

const N = 1000;
const ID_STRIDE = 100_000; // Per-run ID space; larger than any realistic drought run length

interface RunResult {
  readonly decantsToChimera: number; // 1-indexed: 1 = first decant produced chimera
  readonly firedVia: 'natural' | 'pity';
}

function simulateOneRun(runIndex: number): RunResult {
  const idBase = runIndex * ID_STRIDE + 1;
  let droughtCount = 0;
  for (let step = 0; step < ID_STRIDE - 1; step++) {
    const id = idBase + step;
    if (droughtCount >= DROUGHT_THRESHOLD) {
      // Pity fires — guaranteed chimera+ via the failsafe substream.
      const g = rollGenomeAtLeast(id * FAILSAFE_SUBSTREAM_PRIME, FAILSAFE_MIN_TIER);
      // Sanity: the returned genome must be chimera+ by construction.
      if (!tierAtLeast(computeRarity(g).tier, FAILSAFE_MIN_TIER)) {
        throw new Error(`verify-drought: pity produced sub-chimera genome at run ${runIndex}, step ${step}`);
      }
      return { decantsToChimera: step + 1, firedVia: 'pity' };
    }
    const g = rollGenome(createRng(id));
    const { tier } = computeRarity(g);
    if (tierAtLeast(tier, FAILSAFE_MIN_TIER)) {
      return { decantsToChimera: step + 1, firedVia: 'natural' };
    }
    droughtCount += 1;
  }
  throw new Error(`verify-drought: run ${runIndex} exceeded ID_STRIDE without terminating`);
}

const results: RunResult[] = [];
for (let r = 0; r < N; r++) {
  results.push(simulateOneRun(r));
}

const counts = results.map((r) => r.decantsToChimera).sort((a, b) => a - b);
const sum = counts.reduce((s, n) => s + n, 0);
const mean = sum / N;
const median = N % 2 === 0
  ? (counts[N / 2 - 1]! + counts[N / 2]!) / 2
  : counts[Math.floor(N / 2)]!;
const pityCount = results.filter((r) => r.firedVia === 'pity').length;

// eslint-disable-next-line no-console
console.log(`\n=== DROUGHT SIMULATION (N=${N} runs, DROUGHT_THRESHOLD=${DROUGHT_THRESHOLD}) ===`);
// eslint-disable-next-line no-console
console.log(`mean decants-to-chimera:   ${mean.toFixed(2)}`);
// eslint-disable-next-line no-console
console.log(`median decants-to-chimera: ${median}`);
// eslint-disable-next-line no-console
console.log(`fired via pity:            ${pityCount} / ${N}  (${((100 * pityCount) / N).toFixed(1)}%)`);
// eslint-disable-next-line no-console
console.log(`fired via natural chimera: ${N - pityCount} / ${N}  (${((100 * (N - pityCount)) / N).toFixed(1)}%)`);

// Bucketed histogram (bins of 5).
// eslint-disable-next-line no-console
console.log(`\n=== HISTOGRAM (bin width 5) ===`);
const BIN = 5;
const maxCount = counts[counts.length - 1] ?? 0;
const bins: Record<number, number> = {};
for (const c of counts) {
  const bucket = Math.floor((c - 1) / BIN) * BIN + 1; // 1-5, 6-10, 11-15, ...
  bins[bucket] = (bins[bucket] ?? 0) + 1;
}
for (let b = 1; b <= maxCount; b += BIN) {
  const n = bins[b] ?? 0;
  const bar = '#'.repeat(Math.round((60 * n) / N));
  // eslint-disable-next-line no-console
  console.log(`  ${String(b).padStart(3)}-${String(b + BIN - 1).padStart(3)}   ${String(n).padStart(4)}  ${bar}`);
}
