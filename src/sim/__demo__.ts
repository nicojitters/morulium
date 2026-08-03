import { STATS, type Stat, type Tier } from './types';
import { createRng } from './rng';
import { rollGenome, expressPhenotype } from './genome';
import { computeRarity } from './rarity';
import { computeBaseStats, computeCurrentStats } from './stats';

export interface DemoRow {
  seed: number;
  tier: Tier;
  base: Record<Stat, number>;
  current: Record<Stat, number>;
  expressed: Record<string, string>;
  palette: string;
}

export function runDemo(seed = 1): DemoRow[] {
  const rows: DemoRow[] = [];
  for (let i = 0; i < 50; i++) {
    const rowSeed = seed * 1000 + i;
    const rng = createRng(rowSeed);
    const genome = rollGenome(rng);
    const phen = expressPhenotype(genome);
    rows.push({
      seed: rowSeed,
      tier: computeRarity(genome),
      base: computeBaseStats(genome),
      current: computeCurrentStats(genome, 20),
      expressed: phen.expressed,
      palette: phen.palette,
    });
  }
  return rows;
}

export function formatDemoTable(rows: DemoRow[]): string {
  const header = ['#', 'seed', 'tier',
    ...STATS.map((s) => `${s}(base)`),
    ...STATS.map((s) => `${s}(L20)`),
    'head', 'appendage', 'aberration', 'palette',
  ];
  const lines: string[] = [header.join('\t')];
  rows.forEach((r, i) => {
    lines.push([
      String(i),
      String(r.seed),
      r.tier,
      ...STATS.map((s) => String(Math.round(r.base[s]))),
      ...STATS.map((s) => r.current[s].toFixed(1)),
      r.expressed['head'] ?? '',
      r.expressed['appendage'] ?? '',
      r.expressed['aberration'] ?? '',
      r.palette,
    ].join('\t'));
  });
  return lines.join('\n');
}

// Direct-invocation entry so `npm run demo` prints to stdout.
// Skipped in the browser (process is undefined) and in Vitest (script path
// does not match the __demo__ suffix).
declare const process: { argv?: readonly string[]; env?: Record<string, string | undefined> };
declare const __filename: string | undefined;
const isDirectInvocation =
  typeof process !== 'undefined' && (
    process.argv?.[1]?.endsWith('__demo__.ts') ||
    (typeof __filename !== 'undefined' && __filename.endsWith('__demo__.ts'))
  );
if (isDirectInvocation) {
  const seed = Number(process.env?.['DEMO_SEED'] ?? '1');
  // eslint-disable-next-line no-console
  console.log(formatDemoTable(runDemo(seed)));
}
