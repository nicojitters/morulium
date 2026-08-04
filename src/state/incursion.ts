import type { FrontId } from '../sim/data/fronts';

export const FRONT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

export interface FrontState {
  readonly captured: boolean;
  readonly cooldownUntil: number | null;
  readonly garrison: readonly number[];
  readonly flareStartedAt: number | null;
  readonly hardening: number;
}

export const FRESH_FRONTS: Readonly<Record<FrontId, FrontState>> = {
  infrastructure: { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
  military:       { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
  guerrilla:      { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
};
