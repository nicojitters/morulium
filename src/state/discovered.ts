import type { TermKey } from '../ui/definitions';

const ALL: readonly TermKey[] = [
  'morula','decant','harvest','incursion','occupation','vat','dnaLab','sequencer',
  'registry','colony','vivarium','serum','freeDecant','generation',
  'tier-baseline','tier-strain','tier-mutant','tier-chimera','tier-progenitor',
];

export type DiscoveredMap = Readonly<Record<TermKey, boolean>>;

export const DISCOVERED_INITIAL: DiscoveredMap = Object.fromEntries(
  ALL.map((k) => [k, false] as const),
) as DiscoveredMap;

export function hasDiscovered(map: DiscoveredMap, k: TermKey): boolean {
  return map[k] === true;
}
