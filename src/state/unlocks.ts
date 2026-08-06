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

const U: UnlockState = { status: 'unlocked' };

/** Everything unlocked. Used as the migration fallback for existing saves. */
export const DEFAULT_UNLOCKS: UnlocksMap = {
  colony:         U,
  'dna-lab':      U,
  breed:          U,
  vat:            U,
  incursion:      U,
  vivarium:       U,
  'conquest-map': U,
  sequencer:      U,
  registry:       U,
};

/** New-game starting locks: Vat + Sequencer hidden behind directive progress. */
export const LOCKED_STARTING: UnlocksMap = {
  colony:         U,
  'dna-lab':      U,
  breed:          U,
  incursion:      U,
  vivarium:       U,
  'conquest-map': U,
  registry:       U,
  vat:            { status: 'locked', reason: 'Take your first front to unlock the Vat.' },
  sequencer:      { status: 'locked', reason: 'A deferred model change. Not yet available.' },
};

export const UNLOCK_REASONS: Readonly<Record<SurfaceId, string>> = {
  colony:         'Your creations.',
  'dna-lab':      'Inspect any specimen you own.',
  breed:          'Cross two specimens.',
  vat:            'Fuse ten same-tier specimens into one, pristine.',
  incursion:      'Contest a front.',
  vivarium:       'Build living quarters and infirmary.',
  'conquest-map': 'See the region you are pressuring.',
  sequencer:      'Peek at a Morula before you Decant it.',
  registry:       'Look up anything you have met.',
};

export function isUnlocked(map: UnlocksMap, id: SurfaceId): boolean {
  return map[id].status === 'unlocked';
}
