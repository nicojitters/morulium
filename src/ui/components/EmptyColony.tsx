import type { ReactElement } from 'react';
import { DecantButton } from './DecantButton';
import { styles } from '../styles';

export function EmptyColony(): ReactElement {
  return (
    <div style={styles.emptyState} data-testid="empty-colony">
      <div style={styles.emptyStateTitle}>Your Colony is empty</div>
      <div style={styles.emptyStateBody}>
        Decant a Morula to seed the collection. You get 3 free Harvests each day.
      </div>
      <DecantButton label="Decant your first Morula" variant="empty-cta" />
    </div>
  );
}
