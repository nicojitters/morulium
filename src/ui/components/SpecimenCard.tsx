import type { ReactElement } from 'react';
import type { DemoRow } from '../../sim/__demo__';
import type { FrontId } from '../../sim/data/fronts';
import { Sprite } from '../../render/sprite';
import { TierBadge } from './TierBadge';
import { styles } from '../styles';
import { TOKENS } from '../tokens';

interface Lineage {
  readonly generation: number;
  readonly parentIds: readonly [number, number] | null;
}

interface RestState {
  readonly restCurrent: number;
  readonly injuredUntil: number | null;
  readonly now: number;
}

interface Props {
  readonly row: DemoRow;
  readonly highlighted?: boolean;
  readonly lineage?: Lineage;
  readonly restState?: RestState;
  readonly garrisonedAt?: FrontId | null;
  readonly culled?: boolean;
  readonly onToggleCull?: () => void;
}

const GARRISON_LABELS: Readonly<Record<FrontId, string>> = {
  infrastructure: 'Infra',
  military: 'Mil',
  guerrilla: 'Guer',
};

function formatInjuryCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function SpecimenCard({
  row,
  highlighted = false,
  lineage,
  restState,
  garrisonedAt,
  culled = false,
  onToggleCull,
}: Props): ReactElement {
  const specimenId = `M-${String(row.seed).padStart(5, '0')}`;

  const isInjured = restState !== undefined
    && restState.injuredUntil !== null
    && restState.injuredUntil > restState.now;
  const isGarrisoned = garrisonedAt !== undefined && garrisonedAt !== null;

  const bgTint = isInjured ? TOKENS.tealAbyss : TOKENS.groundPanel;

  let cardStyle = highlighted
    ? { ...styles.card(bgTint), ...styles.highlightedCard }
    : styles.card(bgTint);
  if (isInjured) {
    cardStyle = { ...cardStyle, ...styles.injuredCardOverlay };
  }
  if (culled) {
    cardStyle = { ...cardStyle, ...styles.culledCardOverlay, position: 'relative' as const };
  }

  return (
    <div
      className="card card--specimen"
      style={cardStyle}
      data-testid="specimen-card"
      data-highlighted={highlighted || undefined}
      data-unit-id={row.seed}
      data-injured={isInjured ? 'true' : undefined}
      data-garrisoned={isGarrisoned ? 'true' : undefined}
      data-culled={culled ? 'true' : undefined}
    >
      {culled && (
        <div style={styles.culledBadge} data-testid={`culled-badge-${row.seed}`}>
          ✗
        </div>
      )}
      <TierBadge tier={row.tier} />
      <div style={styles.cardSprite}>
        <Sprite phenotype={row.expressed} palette={row.palette} />
      </div>
      <div style={styles.cardFooter}>{specimenId}</div>
      {lineage !== undefined && (
        <div style={styles.lineageLine} data-testid="lineage-line">
          {lineage.parentIds
            ? `Gen ${lineage.generation} · from #${lineage.parentIds[0]} × #${lineage.parentIds[1]}`
            : `Gen ${lineage.generation} · Harvested`}
        </div>
      )}
      {restState !== undefined && (
        <div
          style={isInjured ? styles.injuredLine : styles.restLine}
          data-testid={`rest-line-${row.seed}`}
        >
          {isInjured
            ? `Injured, ready in ${formatInjuryCountdown(restState.injuredUntil! - restState.now)}`
            : `Rest ${restState.restCurrent}/100`}
        </div>
      )}
      {isGarrisoned && (
        <div style={styles.garrisonBadge} data-testid={`garrison-badge-${row.seed}`}>
          Garrison: {GARRISON_LABELS[garrisonedAt!]}
        </div>
      )}
      {onToggleCull !== undefined && (
        <button
          type="button"
          style={styles.cullToggleButton}
          data-testid={`cull-toggle-${row.seed}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCull();
          }}
        >
          {culled ? 'Uncull' : 'Cull'}
        </button>
      )}
    </div>
  );
}

