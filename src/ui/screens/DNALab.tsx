import { useState, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { computeRarity } from '../../sim/rarity';
import { TERMS } from '../terms';
import { styles } from '../styles';

export function DNALab(): ReactElement {
  const units = useColonyStore((s) => s.units);
  const [pickedId, setPickedId] = useState<number | null>(null);

  if (units.length === 0) {
    return (
      <main style={styles.page} data-testid="dna-lab-screen">
        <h1 style={styles.headerTitle}>{TERMS.dnaLab}</h1>
        <div style={styles.emptyState} data-testid="dna-lab-empty">
          <p style={styles.emptyStateTitle}>No specimens to inspect yet</p>
          <p style={styles.emptyStateBody}>
            {TERMS.decant} a {TERMS.morula} on the {TERMS.colony} screen, then come back here.
          </p>
        </div>
      </main>
    );
  }

  const picked = pickedId === null ? null : units.find((u) => u.id === pickedId) ?? null;

  return (
    <main style={styles.page} data-testid="dna-lab-screen">
      <h1 style={styles.headerTitle}>{TERMS.dnaLab}</h1>
      <p style={styles.headerSub}>Inspect a specimen you already own.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
        <ul
          data-testid="dna-lab-picker"
          style={{ listStyle: 'none', padding: 0, margin: 0, borderRight: '1px solid #e2e8f0' }}
        >
          {[...units].sort((a, b) => b.decantedAt - a.decantedAt || b.id - a.id).map((u) => (
            <li key={u.id}>
              <button
                type="button"
                data-testid={`dna-lab-row-${u.id}`}
                onClick={() => {
                  setPickedId(u.id);
                  useColonyStore.getState().emitDirectiveAction({ kind: 'view-dna-lab-detail', unitId: u.id });
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  background: pickedId === u.id ? '#f1f5f9' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  fontSize: 13,
                }}
              >
                #{u.id} · {TERMS.tiers[computeRarity(u.genome).tier]}
              </button>
            </li>
          ))}
        </ul>

        <div data-testid="dna-lab-detail">
          {picked === null ? (
            <p style={{ color: '#94a3b8' }}>Select a specimen from the list.</p>
          ) : (
            <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 6 }}>
              <dt>ID</dt><dd>#{picked.id}</dd>
              <dt>Tier</dt><dd>{TERMS.tiers[computeRarity(picked.genome).tier]}</dd>
              <dt>Generation</dt><dd>{picked.generation}</dd>
              <dt>Lineage</dt>
              <dd>
                {picked.parentIds === null
                  ? 'pristine'
                  : `bred from #${picked.parentIds[0]} × #${picked.parentIds[1]}`}
              </dd>
              <dt>Rest</dt><dd>{Math.floor(picked.restCurrent)}</dd>
              <dt>Status</dt>
              <dd>
                {picked.injuredUntil !== null && picked.injuredUntil > Date.now()
                  ? 'injured — benched'
                  : 'ready'}
              </dd>
            </dl>
          )}
        </div>
      </div>
    </main>
  );
}
