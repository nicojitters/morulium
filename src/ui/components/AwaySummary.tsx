import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { TERMS } from '../terms';

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
    <div className="modal-backdrop">
      <div className="modal panel--iron" data-testid="away-summary">
        <h2 className="text-stamp" style={{ fontSize: 18, marginBottom: 12 }}>Away Report</h2>
        <div className="text-readout" style={{ marginBottom: 16, lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 4px' }}>Elapsed: {formatElapsed(summary.elapsedMs)}</p>
          <p style={{ margin: '0 0 4px' }}>{TERMS.serum} earned: {TERMS.serumAbbr} {summary.serumEarned}</p>
          <p style={{ margin: '0 0 4px' }}>Rest gained across the {TERMS.colony}: {summary.restGainedTotal}</p>
          <p style={{ margin: 0 }}>Injuries healed: {summary.injuriesHealed}</p>
        </div>
        <button
          type="button"
          className="btn btn--stamp"
          onClick={clear}
          data-testid="away-summary-dismiss"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
