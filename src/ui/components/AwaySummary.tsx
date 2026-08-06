import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { TERMS } from '../terms';
import { styles } from '../styles';

function formatElapsed(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'}${minutes > 0 ? ` ${minutes} min` : ''}`;
  return `${Math.max(1, minutes)} minute${minutes === 1 ? '' : 's'}`;
}

export function AwaySummary(): ReactElement | null {
  const summary = useColonyStore((s) => s.pendingAwaySummary);
  const clear = useColonyStore((s) => s.clearAwaySummary);
  if (summary === null) return null;

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalCard} data-testid="away-summary">
        <h2 style={styles.modalTitle}>While you were away…</h2>
        <div style={styles.modalBody}>
          <p>Elapsed: {formatElapsed(summary.elapsedMs)}</p>
          <p>{TERMS.serum} earned: {TERMS.serumAbbr} {summary.serumEarned}</p>
          <p>Rest gained across the {TERMS.colony}: {summary.restGainedTotal}</p>
          <p>Injuries healed: {summary.injuriesHealed}</p>
        </div>
        <button
          type="button"
          style={styles.modalPrimary}
          onClick={clear}
          data-testid="away-summary-dismiss"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
