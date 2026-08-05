import { rollGenome } from '../src/sim/genome';
import { createRng } from '../src/sim/rng';
import { computeRarity } from '../src/sim/rarity';
import { resolveIncursion } from '../src/sim/incursion';
import { FRONTS } from '../src/sim/data/fronts';
import type { FrontId } from '../src/sim/data/fronts';
import type { Tier } from '../src/sim/types';
import type { Unit } from '../src/state/types';

const N = 1000;
const MAX_REJECTION_ATTEMPTS = 200_000; // safety cap for rare tiers (progenitor ~1.2%)

interface Composition {
  readonly label: string;
  // Tier count in the 4-unit team, in order.
  readonly tiers: readonly [Tier, Tier, Tier, Tier];
}

const COMPOSITIONS: readonly Composition[] = [
  { label: '4× baseline',          tiers: ['baseline', 'baseline', 'baseline', 'baseline'] },
  { label: '4× strain',            tiers: ['strain', 'strain', 'strain', 'strain'] },
  { label: '2×B + 2×M',            tiers: ['baseline', 'baseline', 'mutant', 'mutant'] },
  { label: '4× chimera',           tiers: ['chimera', 'chimera', 'chimera', 'chimera'] },
  { label: '4× progenitor',        tiers: ['progenitor', 'progenitor', 'progenitor', 'progenitor'] },
];

const FRONT_IDS: readonly FrontId[] = ['infrastructure', 'military', 'guerrilla'];

/**
 * Sample the next genome of a specific tier using rejection sampling.
 * Uses a mutable seed counter carried by the caller so consecutive draws differ.
 */
function nextGenomeOfTier(tier: Tier, seedRef: { seed: number }): Unit['genome'] {
  for (let i = 0; i < MAX_REJECTION_ATTEMPTS; i++) {
    seedRef.seed += 1;
    const g = rollGenome(createRng(seedRef.seed));
    if (computeRarity(g).tier === tier) return g;
  }
  throw new Error(`nextGenomeOfTier: exceeded ${MAX_REJECTION_ATTEMPTS} attempts for ${tier}`);
}

function buildTeam(comp: Composition, seedRef: { seed: number }): Unit[] {
  return comp.tiers.map((t, i) => {
    const genome = nextGenomeOfTier(t, seedRef);
    return {
      id: i + 1,
      seed: i + 1,
      decantedAt: 0,
      genome,
      generation: 0,
      parentIds: null,
      wear: {},
      restCurrent: 100,
      injuredUntil: null,
      culled: false,
    } as Unit;
  });
}

function restPenaltiesFor(team: readonly Unit[], rested: boolean): Record<number, number> {
  if (rested) return {};
  const out: Record<number, number> = {};
  for (const u of team) out[u.id] = 0.7; // UNDER_RESTED_PENALTY
  return out;
}

function runCell(frontId: FrontId, comp: Composition, rested: boolean, seedRef: { seed: number }): number {
  let wins = 0;
  for (let n = 0; n < N; n++) {
    const team = buildTeam(comp, seedRef);
    const penalties = restPenaltiesFor(team, rested);
    const res = resolveIncursion(team, FRONTS[frontId], penalties, 0);
    if (res.outcome === 'won') wins++;
  }
  return wins / N;
}

function printTable(restedLabel: string, rested: boolean, seedRef: { seed: number }): void {
  // eslint-disable-next-line no-console
  console.log(`\n=== INCURSION WIN RATES — ${restedLabel} (N=${N} per cell) ===`);
  const header = ' '.repeat(18) + FRONT_IDS.map((f) => f.padEnd(15)).join('');
  // eslint-disable-next-line no-console
  console.log(header);
  for (const comp of COMPOSITIONS) {
    const cells = FRONT_IDS.map((f) => {
      const rate = runCell(f, comp, rested, seedRef);
      return `${(rate * 100).toFixed(1)}%`.padEnd(15);
    }).join('');
    // eslint-disable-next-line no-console
    console.log(comp.label.padEnd(18) + cells);
  }
}

const seedRef = { seed: 0 };
printTable('RESTED', true, seedRef);
printTable('UNDER-RESTED ×0.7', false, seedRef);
