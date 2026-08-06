import type { FrontId } from './fronts';

export type RegionId = 'region-1';

export interface RegionProfile {
  readonly id: RegionId;
  readonly label: string;
  readonly subtitle: string;
  readonly frontIds: readonly FrontId[];
}

export const REGIONS: Readonly<Record<RegionId, RegionProfile>> = {
  'region-1': {
    id: 'region-1',
    label: 'Region 1',
    subtitle: 'The first of many',
    frontIds: ['infrastructure', 'military', 'guerrilla'],
  },
};

export const REGION_ORDER: readonly RegionId[] = ['region-1'];

export function regionOf(frontId: FrontId): RegionId {
  for (const r of REGION_ORDER) {
    if (REGIONS[r].frontIds.includes(frontId)) return r;
  }
  throw new Error(`Front ${frontId} not assigned to any region`);
}
