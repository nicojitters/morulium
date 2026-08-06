import { type ReactElement } from 'react';
import { useColonyStore, capOf } from '../../state/colony';
import {
  BARRACKS_COST_SERUM,
  MEDBAY_COST_SERUM,
} from '../../state/vivarium';
import { FirstVisitCallout } from '../components/FirstVisitCallout';
import { styles } from '../styles';

interface BuildingPanelProps {
  readonly id: 'barracks' | 'medbay';
  readonly label: string;
  readonly cost: number;
  readonly effects: readonly string[];
  readonly built: boolean;
  readonly canAfford: boolean;
  readonly onBuild: () => void;
}

function BuildingPanel({ id, label, cost, effects, built, canAfford, onBuild }: BuildingPanelProps): ReactElement {
  return (
    <section
      data-testid={`${id}-panel`}
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        padding: 12,
        marginTop: 12,
        maxWidth: 600,
      }}
    >
      <h2 style={{ fontSize: 16, margin: '0 0 6px 0' }}>{label} — {cost} SR</h2>
      <ul style={{ margin: '6px 0', paddingLeft: 20, color: '#475569', fontSize: 13 }}>
        {effects.map((e, i) => <li key={i}>{e}</li>)}
      </ul>
      {built ? (
        <div data-testid={`${id}-status`} style={{ color: '#16a34a', fontWeight: 600 }}>
          Built ✓
        </div>
      ) : (
        <button
          type="button"
          data-testid={`${id}-build-button`}
          disabled={!canAfford}
          onClick={onBuild}
          style={{ padding: '6px 12px', cursor: canAfford ? 'pointer' : 'not-allowed' }}
        >
          {canAfford ? `Build (${cost} SR)` : `Build (${cost} SR — need more SR)`}
        </button>
      )}
    </section>
  );
}

export function Vivarium(): ReactElement {
  const units = useColonyStore((s) => s.units);
  const serum = useColonyStore((s) => s.serum);
  const buildings = useColonyStore((s) => s.buildings);
  const buildBarracks = useColonyStore((s) => s.buildBarracks);
  const buildMedbay = useColonyStore((s) => s.buildMedbay);

  const cap = capOf({ buildings });

  return (
    <main style={styles.page}>
      <FirstVisitCallout surface="vivarium" title="Vivarium" body="Buildings shape your Colony." action="Build the Barracks first." />
      <h1 style={styles.headerTitle}>Morulium — Vivarium</h1>
      <p style={styles.headerSub}>
        Colony <span data-testid="vivarium-cap-counter">{units.length}/{cap}</span>
        {' · '}SR {serum}
        {' · '}Barracks {buildings.barracks ? 'built' : 'not built'}
        {' · '}Medbay {buildings.medbay ? 'built' : 'not built'}
      </p>

      <BuildingPanel
        id="barracks"
        label="Barracks"
        cost={BARRACKS_COST_SERUM}
        effects={['Raises Colony cap 20 → 40', '+10 rest/hour for non-garrisoned units']}
        built={buildings.barracks}
        canAfford={serum >= BARRACKS_COST_SERUM}
        onBuild={buildBarracks}
      />

      <BuildingPanel
        id="medbay"
        label="Medbay"
        cost={MEDBAY_COST_SERUM}
        effects={['Halves injury bench (60 → 30 min)', 'Applies to injuries suffered after purchase']}
        built={buildings.medbay}
        canAfford={serum >= MEDBAY_COST_SERUM}
        onBuild={buildMedbay}
      />
    </main>
  );
}
