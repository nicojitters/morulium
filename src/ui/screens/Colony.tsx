import { useEffect, useMemo, useState, type ReactElement } from 'react';
import type { Unit } from '../../state/types';
import { useColonyStore, capOf } from '../../state/colony';
import { expressPhenotype } from '../../sim/genome';
import { computeRarity } from '../../sim/rarity';
import { computeBaseStats, computeCurrentStats } from '../../sim/stats';
import type { Tier } from '../../sim/types';
import type { FrontId } from '../../sim/data/fronts';
import type { FrontState } from '../../state/incursion';
import { TERMS } from '../terms';
import { styles, TIER_COLORS } from '../styles';
import { TOKENS } from '../tokens';
import { SpecimenCard } from '../components/SpecimenCard';
import { DecantButton } from '../components/DecantButton';
import { EmptyColony } from '../components/EmptyColony';
import { FirstVisitCallout } from '../components/FirstVisitCallout';
import { HarvestIndicator } from '../components/HarvestIndicator';
import { FailsafeIndicator } from '../components/FailsafeIndicator';
import type { DemoRow } from '../../sim/__demo__';

const TIERS: readonly Tier[] = ['baseline', 'strain', 'mutant', 'chimera', 'progenitor'];
const HIGHLIGHT_MS = 2000;

/**
 * Derive a DemoRow-shaped view of a Unit so SpecimenCard can consume it
 * unchanged. Everything except id/genome is a pure derivation.
 */
export function unitToRow(unit: Unit): DemoRow {
  const phen = expressPhenotype(unit.genome);
  const { score, tier } = computeRarity(unit.genome);
  const base = computeBaseStats(unit.genome, unit.wear);
  const current = computeCurrentStats(unit.genome, 20, unit.wear);
  return {
    seed: unit.seed,
    tier,
    score,
    base,
    current,
    expressed: phen.expressed,
    palette: phen.palette,
  };
}

export function restStateFor(unit: Unit, now: number) {
  return {
    restCurrent: unit.restCurrent,
    injuredUntil: unit.injuredUntil,
    now,
  };
}

export function garrisonedAtFor(unitId: number, fronts: Readonly<Record<FrontId, FrontState>>): FrontId | null {
  for (const fid of Object.keys(fronts) as FrontId[]) {
    if (fronts[fid].garrison.includes(unitId)) return fid;
  }
  return null;
}

export function Colony(): ReactElement {
  const units = useColonyStore((s) => s.units);
  const lastDecantedId = useColonyStore((s) => s.lastDecantedId);
  const clearHighlight = useColonyStore((s) => s.clearHighlight);
  const fronts = useColonyStore((s) => s.fronts);
  const buildings = useColonyStore((s) => s.buildings);
  const cap = capOf({ buildings });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Sort newest-first by decantedAt (stable copy — do not mutate store state).
  // id tiebreaker matches Breed screen: same-timestamp decants (fake-timer tests)
  // stay deterministic across both screens.
  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => b.decantedAt - a.decantedAt || b.id - a.id),
    [units],
  );

  // Auto-clear the highlight 2s after it's set
  useEffect(() => {
    if (lastDecantedId === null) return;
    const t = setTimeout(clearHighlight, HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [lastDecantedId, clearHighlight]);

  // Group units by tier for stamped section headers
  const unitsByTier = useMemo(() => {
    const groups: Partial<Record<Tier, typeof sortedUnits>> = {};
    for (const unit of sortedUnits) {
      const { tier } = computeRarity(unit.genome);
      if (!groups[tier]) groups[tier] = [];
      groups[tier]!.push(unit);
    }
    return groups;
  }, [sortedUnits]);

  if (units.length === 0) {
    return (
      <main style={styles.page} data-register="lab">
        <FirstVisitCallout surface="colony" title="Your Colony" body="Every specimen you Decant lives here." action="Decant a Morula." />
        <EmptyColony />
      </main>
    );
  }

  return (
    <main style={styles.page} data-register="lab">
      <FirstVisitCallout surface="colony" title="Your Colony" body="Every specimen you Decant lives here." action="Decant a Morula." />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h1 style={styles.headerTitle}>Morulium</h1>
          <p style={styles.headerSub}>
            Your Colony — <span data-testid="colony-cap-header">{units.length}/{cap}</span> specimens
            {' · '}<HarvestIndicator />
            {' '}<FailsafeIndicator />
          </p>
        </div>
        <DecantButton />
      </div>
      <div style={styles.legend} data-testid="tier-legend">
        {TIERS.map((tier) => (
          <span key={tier} style={styles.legendItem}>
            <span style={styles.legendDot(TIER_COLORS[tier])} />
            {TERMS.tiers[tier]}
          </span>
        ))}
      </div>
      <div data-testid="colony-grid">
        {TIERS.filter((tier) => (unitsByTier[tier]?.length ?? 0) > 0).map((tier) => {
          const groupUnits = unitsByTier[tier]!;
          return (
            <div key={tier}>
              <div style={styles.tierSectionHeader(TIER_COLORS[tier])}>
                <h2 style={styles.tierSectionLabel(TIER_COLORS[tier])} data-testid={`colony-tier-header-${tier}`}>
                  {TERMS.tiers[tier]}
                </h2>
                <span style={{ color: TOKENS.inkDim, fontFamily: TOKENS.fontMono, fontSize: 12 }}>
                  {groupUnits.length} on ice
                </span>
              </div>
              <div style={styles.grid}>
                {groupUnits.map((unit) => (
                  <SpecimenCard
                    key={unit.id}
                    row={unitToRow(unit)}
                    highlighted={unit.id === lastDecantedId}
                    lineage={{ generation: unit.generation, parentIds: unit.parentIds }}
                    restState={restStateFor(unit, now)}
                    garrisonedAt={garrisonedAtFor(unit.id, fronts)}
                    culled={unit.culled}
                    onToggleCull={() => useColonyStore.getState().toggleCulled(unit.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
