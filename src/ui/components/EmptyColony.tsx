import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { TERMS } from '../terms';
import { DecantButton } from './DecantButton';
import { styles } from '../styles';

export function EmptyColony(): ReactElement {
  const free = useColonyStore((s) => s.freeDecantsRemaining);
  const bodyText = free > 0
    ? `No specimens yet — ${free} free ${TERMS.decant}${free === 1 ? '' : 's'} available.`
    : `No specimens yet — ${TERMS.decant} a ${TERMS.morula} to begin.`;

  return (
    <div style={styles.emptyState} data-testid="empty-colony">
      <div style={styles.emptyStateTitle}>Your Colony is empty</div>
      <div style={styles.emptyStateBody}>
        {bodyText}
      </div>
      <DecantButton label="Decant your first Morula" variant="empty-cta" />
    </div>
  );
}
