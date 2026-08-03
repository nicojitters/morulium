import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { DROUGHT_THRESHOLD, FAILSAFE_INDICATOR_APPEARS_AT } from '../../state/failsafe';
import { styles } from '../styles';

export function FailsafeIndicator(): ReactElement | null {
  const droughtCount = useColonyStore((s) => s.droughtCount);
  if (droughtCount < FAILSAFE_INDICATOR_APPEARS_AT) return null;

  const label = droughtCount >= DROUGHT_THRESHOLD
    ? 'Failsafe next'
    : `Failsafe in ${DROUGHT_THRESHOLD - droughtCount}`;

  return (
    <span style={styles.failsafeIndicator} data-testid="failsafe-indicator">
      <span aria-hidden="true">⚠️</span> {label}
    </span>
  );
}
