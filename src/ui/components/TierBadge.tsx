import type { ReactElement } from 'react';
import type { Tier } from '../../sim/types';
import { TERMS } from '../terms';
import { TIER_COLORS } from '../styles';

interface Props {
  readonly tier: Tier;
}

export function TierBadge({ tier }: Props): ReactElement {
  return (
    <span
      className="chip"
      style={{ position: 'absolute', top: 6, right: 6, backgroundColor: TIER_COLORS[tier] }}
    >
      {TERMS.tiers[tier]}
    </span>
  );
}
