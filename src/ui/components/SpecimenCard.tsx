import type { ReactElement } from 'react';
import type { DemoRow } from '../../sim/__demo__';
import type { FrontId } from '../../sim/data/fronts';
import { Sprite } from '../../render/sprite';
import { resolvePalette } from '../../render/colors';
import { TierBadge } from './TierBadge';
import { styles } from '../styles';

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

export function SpecimenCard({ row, highlighted = false, lineage, restState, garrisonedAt }: Props): ReactElement {
  const colors = resolvePalette(row.palette);
  const bgTint = tintForCard(colors.base);
  const specimenId = `M-${String(row.seed).padStart(5, '0')}`;

  const isInjured = restState !== undefined
    && restState.injuredUntil !== null
    && restState.injuredUntil > restState.now;
  const isGarrisoned = garrisonedAt !== undefined && garrisonedAt !== null;

  let cardStyle = highlighted
    ? { ...styles.card(bgTint), ...styles.highlightedCard }
    : styles.card(bgTint);
  if (isInjured) {
    cardStyle = { ...cardStyle, ...styles.injuredCardOverlay };
  }

  return (
    <div
      style={cardStyle}
      data-testid="specimen-card"
      data-highlighted={highlighted || undefined}
      data-unit-id={row.seed}
      data-injured={isInjured ? 'true' : undefined}
      data-garrisoned={isGarrisoned ? 'true' : undefined}
    >
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
    </div>
  );
}

function tintForCard(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(255 * 0.92 + c * 0.08);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}
