import type { ReactElement } from 'react';
import type { DemoRow } from '../../sim/__demo__';
import { Sprite } from '../../render/sprite';
import { resolvePalette } from '../../render/colors';
import { TierBadge } from './TierBadge';
import { styles } from '../styles';

interface Lineage {
  readonly generation: number;
  readonly parentIds: readonly [number, number] | null;
}

interface Props {
  readonly row: DemoRow;
  readonly highlighted?: boolean;
  readonly lineage?: Lineage;
}

/**
 * A single specimen card: palette-tinted panel with the sprite, tier badge,
 * a monospace specimen ID footer, and (when lineage prop is provided) a
 * small lineage line beneath the footer.
 */
export function SpecimenCard({ row, highlighted = false, lineage }: Props): ReactElement {
  const colors = resolvePalette(row.palette);
  const bgTint = tintForCard(colors.base);
  const specimenId = `M-${String(row.seed).padStart(5, '0')}`;

  const cardStyle = highlighted
    ? { ...styles.card(bgTint), ...styles.highlightedCard }
    : styles.card(bgTint);

  return (
    <div
      style={cardStyle}
      data-testid="specimen-card"
      data-highlighted={highlighted || undefined}
      data-unit-id={row.seed}
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
