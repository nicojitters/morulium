export type SurfaceId =
  | 'colony'
  | 'dna-lab'
  | 'breed'
  | 'vat'
  | 'incursion'
  | 'vivarium'
  | 'conquest-map'
  | 'sequencer'
  | 'registry';

export type UnlockStatus = 'unlocked' | 'locked';

export interface UnlockState {
  readonly status: UnlockStatus;
  readonly reason?: string;
}

export type UnlocksMap = Readonly<Record<SurfaceId, UnlockState>>;

const UNLOCKED: UnlockState = { status: 'unlocked' };

export const DEFAULT_UNLOCKS: UnlocksMap = {
  colony:         UNLOCKED,
  'dna-lab':      UNLOCKED,
  breed:          UNLOCKED,
  vat:            UNLOCKED,
  incursion:      UNLOCKED,
  vivarium:       UNLOCKED,
  'conquest-map': UNLOCKED,
  sequencer:      UNLOCKED,
  registry:       UNLOCKED,
};

export function isUnlocked(map: UnlocksMap, id: SurfaceId): boolean {
  return map[id].status === 'unlocked';
}
