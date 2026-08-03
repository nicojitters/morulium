import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { runDemo } from '../../sim/__demo__';
import { SpecimenCard } from '../components/SpecimenCard';
import { TERMS } from '../terms';
import { styles, TIER_COLORS } from '../styles';
import type { Tier } from '../../sim/types';

const TIERS: readonly Tier[] = ['baseline', 'strain', 'mutant', 'chimera', 'progenitor'];

/**
 * The M2 review page. Header + tier legend + 50 SpecimenCards in a grid.
 * Data comes from the existing runDemo(seed) — the sim is unchanged.
 */
export function Gallery(): ReactElement {
  const rows = useMemo(() => runDemo(1), []);

  return (
    <main style={styles.page}>
      <h1 style={styles.headerTitle}>Morulium — M2 sprite gallery</h1>
      <p style={styles.headerSub}>
        50 specimens, seed=1. Rarity distribution should be visible at a glance.
      </p>
      <div style={styles.legend} data-testid="tier-legend">
        {TIERS.map((tier) => (
          <span key={tier} style={styles.legendItem}>
            <span style={styles.legendDot(TIER_COLORS[tier])} />
            {TERMS.tiers[tier]}
          </span>
        ))}
      </div>
      <div style={styles.grid} data-testid="gallery-grid">
        {rows.map((row) => (
          <SpecimenCard key={row.seed} row={row} />
        ))}
      </div>
    </main>
  );
}
