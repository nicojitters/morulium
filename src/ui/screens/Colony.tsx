import { useEffect, useMemo, type ReactElement } from 'react';
import type { Unit } from '../../state/types';
import { useColonyStore } from '../../state/colony';
import { expressPhenotype } from '../../sim/genome';
import { computeRarity } from '../../sim/rarity';
import { computeBaseStats, computeCurrentStats } from '../../sim/stats';
import type { Tier } from '../../sim/types';
import { TERMS } from '../terms';
import { styles, TIER_COLORS } from '../styles';
import { SpecimenCard } from '../components/SpecimenCard';
import { DecantButton } from '../components/DecantButton';
import { EmptyColony } from '../components/EmptyColony';
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

export function Colony(): ReactElement {
  const units = useColonyStore((s) => s.units);
  const lastDecantedId = useColonyStore((s) => s.lastDecantedId);
  const clearHighlight = useColonyStore((s) => s.clearHighlight);

  // Sort newest-first by decantedAt (stable copy — do not mutate store state)
  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => b.decantedAt - a.decantedAt),
    [units],
  );

  // Auto-clear the highlight 2s after it's set
  useEffect(() => {
    if (lastDecantedId === null) return;
    const t = setTimeout(clearHighlight, HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [lastDecantedId, clearHighlight]);

  if (units.length === 0) {
    return (
      <main style={styles.page}>
        <EmptyColony />
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h1 style={styles.headerTitle}>Morulium</h1>
          <p style={styles.headerSub}>
            Your Colony — {units.length} specimens
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
      <div style={styles.grid} data-testid="colony-grid">
        {sortedUnits.map((unit) => (
          <SpecimenCard
            key={unit.id}
            row={unitToRow(unit)}
            highlighted={unit.id === lastDecantedId}
          />
        ))}
      </div>
    </main>
  );
}
