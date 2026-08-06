import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { FRONTS } from '../../sim/data/fronts';
import { styles } from '../styles';

export function IncursionResultSummary(): ReactElement | null {
  const r = useColonyStore((s) => s.lastIncursionResolution);
  const clear = useColonyStore((s) => s.clearLastIncursionResolution);
  if (r === null) return null;

  const frontLabel = FRONTS[r.frontId].label;

  let verdict: string;
  if (r.outcome === 'won') {
    verdict = `Your team overwhelmed the ${frontLabel} front.`;
  } else {
    const entries = Object.entries(r.coverage);
    entries.sort((a, b) => a[1] - b[1]);
    const weakest = entries[0]?.[0] ?? '';
    verdict = weakest
      ? `You fell short on ${weakest}. The ${frontLabel} front held.`
      : `The ${frontLabel} front held. Your team fell short.`;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" data-testid="incursion-result">
        <h2 style={styles.modalTitle}>{r.outcome === 'won' ? 'Victory' : 'Defeat'}</h2>
        <div style={styles.modalBody}>
          <p>{verdict}</p>
          <p style={{ fontSize: 12, color: '#64748b' }}>
            Team: {r.teamIds.map((id) => `#${id}`).join(', ')}
          </p>
        </div>
        <button
          type="button"
          style={styles.modalPrimary}
          onClick={clear}
          data-testid="incursion-result-dismiss"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
