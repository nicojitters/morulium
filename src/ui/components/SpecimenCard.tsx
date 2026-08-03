import type { ReactElement } from 'react';
import type { DemoRow } from '../../sim/__demo__';
import { Sprite } from '../../render/sprite';
import { resolvePalette } from '../../render/colors';
import { TierBadge } from './TierBadge';
import { styles } from '../styles';

interface Props {
  readonly row: DemoRow;
  readonly highlighted?: boolean;
}

/**
 * A single specimen card: palette-tinted panel with the sprite, tier badge,
 * and a monospace specimen ID footer.
 */
export function SpecimenCard({ row, highlighted = false }: Props): ReactElement {
  const colors = resolvePalette(row.palette);
  // Very faint tint of the palette base for the card background
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
    </div>
  );
}

/**
 * Convert a palette base color to a very faint background tint by mixing
 * heavily with white. Keeps the biotech "sterile card" feel.
 */
function tintForCard(hex: string): string {
  // hex expected like "#rrggbb"
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // mix 92% white + 8% palette color
  const mix = (c: number) => Math.round(255 * 0.92 + c * 0.08);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}
