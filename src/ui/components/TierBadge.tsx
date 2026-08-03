import type { ReactElement } from 'react';
import type { Tier } from '../../sim/types';
import { TERMS } from '../terms';
import { styles, TIER_COLORS } from '../styles';

interface Props {
  readonly tier: Tier;
}

export function TierBadge({ tier }: Props): ReactElement {
  return <span style={styles.badge(TIER_COLORS[tier])}>{TERMS.tiers[tier]}</span>;
}
