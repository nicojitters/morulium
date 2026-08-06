export interface UnitSnapshot {
  readonly id: number;
  readonly restCurrent: number;
  readonly injuredUntil: number | null;
}

export interface StoreSnapshot {
  readonly serum: number;
  readonly units: readonly UnitSnapshot[];
}

export interface AwaySummary {
  readonly elapsedMs: number;
  readonly serumEarned: number;
  readonly restGainedTotal: number;
  readonly injuriesHealed: number;
}

export function summarize(
  prev: StoreSnapshot,
  next: StoreSnapshot,
  prevNow: number,
  nextNow: number,
): AwaySummary {
  const byId = new Map(prev.units.map((u) => [u.id, u] as const));
  let restGainedTotal = 0;
  let injuriesHealed = 0;
  for (const nu of next.units) {
    const pu = byId.get(nu.id);
    if (!pu) continue;
    if (nu.restCurrent > pu.restCurrent) restGainedTotal += nu.restCurrent - pu.restCurrent;
    const wasInjured = pu.injuredUntil !== null && pu.injuredUntil > prevNow;
    const stillInjured = nu.injuredUntil !== null && nu.injuredUntil > nextNow;
    if (wasInjured && !stillInjured) injuriesHealed += 1;
  }
  return {
    elapsedMs: nextNow - prevNow,
    serumEarned: next.serum - prev.serum,
    restGainedTotal,
    injuriesHealed,
  };
}

export function isSignificant(s: AwaySummary): boolean {
  return s.serumEarned > 0 || s.restGainedTotal > 0 || s.injuriesHealed > 0;
}
