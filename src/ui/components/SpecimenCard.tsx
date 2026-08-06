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

const GARRISON_PENNANTS: Readonly<Record<FrontId, string>> = {
  infrastructure: '/assets/pixellab/states/garrison_infrastructure.png',
  military: '/assets/pixellab/states/garrison_military.png',
  guerrilla: '/assets/pixellab/states/garrison_guerrilla.png',
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

  let cardStyle = styles.card(bgTint);
  if (isInjured) {
    cardStyle = { ...cardStyle, ...styles.injuredCardOverlay };
  }
  if (culled) {
    cardStyle = { ...cardStyle, ...styles.culledCardOverlay, position: 'relative' as const };
  }

  return (
    <div
      className={`card card--specimen${highlighted ? ' card--highlighted' : ''}`}
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
          <img
            src="/assets/pixellab/states/culled_badge.png"
            alt="Culled"
            width={40}
            height={40}
            style={{ imageRendering: 'pixelated', display: 'block' }}
            draggable={false}
          />
        </div>
      )}
      {isInjured && (
        <img
          src="/assets/pixellab/states/injured.png"
          alt=""
          width={32}
          height={32}
          style={{ imageRendering: 'pixelated', position: 'absolute', top: 6, left: 6, pointerEvents: 'none' }}
          draggable={false}
          data-testid={`injured-overlay-${row.seed}`}
        />
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
        <div style={{ ...styles.garrisonBadge, display: 'flex', alignItems: 'center', gap: 4 }} data-testid={`garrison-badge-${row.seed}`}>
          <img
            src={GARRISON_PENNANTS[garrisonedAt!]}
            alt=""
            width={16}
            height={22}
            style={{ imageRendering: 'pixelated', display: 'block' }}
            draggable={false}
          />
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

