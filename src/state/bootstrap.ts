export const STARTER_FREE_DECANTS = 3;

export interface FirstRunProbe {
  readonly firstRunComplete: boolean;
  readonly units: readonly unknown[];
  readonly serum: number;
}

export function isFirstRun(s: FirstRunProbe): boolean {
  return !s.firstRunComplete;
}
