import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { styles } from '../styles';

export function SerumBadge(): ReactElement {
  const serum = useColonyStore((s) => s.serum);
  return (
    <span style={styles.serumBadge} data-testid="serum-badge">
      SR {serum}
    </span>
  );
}
