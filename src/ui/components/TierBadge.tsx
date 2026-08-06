import type { ReactElement } from 'react';
import type { Tier } from '../../sim/types';
import { TERMS } from '../terms';

interface Props {
  readonly tier: Tier;
}

export function TierBadge({ tier }: Props): ReactElement {
  return (
    <span
      style={{ position: 'absolute', top: 6, right: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}
      aria-label={TERMS.tiers[tier]}
    >
      <img
        src={`/assets/pixellab/rarity/${tier}.png`}
        alt=""
        width={24}
        height={24}
        style={{ imageRendering: 'pixelated', display: 'block' }}
        draggable={false}
      />
    </span>
  );
}
