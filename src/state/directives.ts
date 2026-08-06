export type DirectiveId =
  | 'decant-first' | 'inspect-first' | 'decant-second'
  | 'launch-first-incursion' | 'collect-first-reward'
  | 'station-on-occupation' | 'try-a-breed'
  | 'take-a-front' | 'reach-strain' | 'grow-colony-to-five';

export type DirectiveAction =
  | { kind: 'decant' }
  | { kind: 'view-dna-lab-detail'; unitId: number }
  | { kind: 'incursion-launched' }
  | { kind: 'incursion-resolved'; outcome: 'won' | 'lost'; rewardCollected: boolean }
  | { kind: 'garrison-assigned' }
  | { kind: 'breed' }
  | { kind: 'front-captured' }
  | { kind: 'tier-reached'; tier: 'baseline' | 'strain' | 'mutant' | 'chimera' | 'progenitor' }
  | { kind: 'unit-count-changed'; count: number };

export interface Directive {
  readonly id: DirectiveId;
  readonly title: string;
  readonly hint: string;
  readonly rewardSerum: number;
}

export const CHAIN: readonly Directive[] = [
  { id: 'decant-first',           title: 'Decant your first specimen',       hint: 'A Morula holds one unique specimen. Open one.',                       rewardSerum: 10 },
  { id: 'inspect-first',          title: 'Inspect it in the DNA Lab',        hint: 'See what you made — lineage, generation, condition.',                rewardSerum: 10 },
  { id: 'decant-second',          title: 'Decant a second specimen',         hint: 'One is not an army.',                                                 rewardSerum: 10 },
  { id: 'launch-first-incursion', title: 'Launch your first Incursion',      hint: 'Pick a front, field four specimens, push.',                           rewardSerum: 15 },
  { id: 'collect-first-reward',   title: 'Take a front and collect',         hint: 'Win the mission, walk away with the Serum.',                          rewardSerum: 25 },
  { id: 'station-on-occupation',  title: 'Station a specimen on Occupation', hint: 'A held front earns you Serum passively. Assign a garrison.',          rewardSerum: 20 },
  { id: 'try-a-breed',            title: 'Try a breed',                      hint: 'Cross two specimens. The offspring is its own creature.',             rewardSerum: 15 },
];

export const STANDING: readonly Directive[] = [
  { id: 'take-a-front',        title: 'Take another front',             hint: 'The region has more than one weak spot.',               rewardSerum: 30 },
  { id: 'reach-strain',        title: 'Produce a Strain-tier specimen', hint: 'Unusual traits show up when you keep pulling.',         rewardSerum: 40 },
  { id: 'grow-colony-to-five', title: 'Grow the Colony to five',        hint: 'More bodies, more options.',                            rewardSerum: 25 },
];

const BY_ID = new Map<DirectiveId, Directive>([...CHAIN, ...STANDING].map((d) => [d.id, d] as const));

export function directiveById(id: DirectiveId): Directive {
  const d = BY_ID.get(id);
  if (!d) throw new Error(`Unknown directive: ${id}`);
  return d;
}

export function nextInChain(current: DirectiveId | null): DirectiveId | null {
  if (current === null) return CHAIN[0]?.id ?? null;
  const idx = CHAIN.findIndex((d) => d.id === current);
  if (idx < 0) return null;
  return CHAIN[idx + 1]?.id ?? null;
}

export function completesFrom(id: DirectiveId, action: DirectiveAction): boolean {
  switch (id) {
    case 'decant-first':           return action.kind === 'decant';
    case 'inspect-first':          return action.kind === 'view-dna-lab-detail';
    case 'decant-second':          return action.kind === 'decant';
    case 'launch-first-incursion': return action.kind === 'incursion-launched';
    case 'collect-first-reward':
      return action.kind === 'incursion-resolved' && action.outcome === 'won' && action.rewardCollected;
    case 'station-on-occupation':  return action.kind === 'garrison-assigned';
    case 'try-a-breed':            return action.kind === 'breed';
    case 'take-a-front':           return action.kind === 'front-captured';
    case 'reach-strain':
      return action.kind === 'tier-reached' && action.tier !== 'baseline';
    case 'grow-colony-to-five':
      return action.kind === 'unit-count-changed' && action.count >= 5;
  }
}
