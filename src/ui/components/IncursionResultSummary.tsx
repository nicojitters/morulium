import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { FRONTS } from '../../sim/data/fronts';
import { styles } from '../styles';
import { TOKENS } from '../tokens';

export function IncursionResultSummary(): ReactElement | null {
  const r = useColonyStore((s) => s.lastIncursionResolution);
  const clear = useColonyStore((s) => s.clearLastIncursionResolution);
  if (r === null) return null;

  const frontLabel = FRONTS[r.frontId].label;

  const verdictLabel = r.outcome === 'won' ? 'Victory' : 'Defeat';

  let verdictBody: string;
  if (r.outcome === 'won') {
    verdictBody = `Your team overwhelmed the ${frontLabel} front.`;
  } else {
    const entries = Object.entries(r.coverage);
    entries.sort((a, b) => a[1] - b[1]);
    const weakest = entries[0]?.[0] ?? '';
    verdictBody = weakest
      ? `You fell short on ${weakest}. The ${frontLabel} front held.`
      : `The ${frontLabel} front held. Your team fell short.`;
  }

  const verdictColor = r.outcome === 'won' ? TOKENS.bioGreen : TOKENS.signalDanger;

  return (
    <div className="modal-backdrop">
      <div className="modal panel--iron" data-testid="incursion-result">
        <img
          src={r.outcome === 'won' ? '/assets/pixellab/conquest/banner_win.png' : '/assets/pixellab/conquest/banner_fail.png'}
          alt=""
          style={{ imageRendering: 'pixelated', width: '100%', maxWidth: 400, height: 'auto', display: 'block', margin: '0 auto 8px auto' }}
          draggable={false}
        />
        <div className="text-stamp" style={{
          fontSize: 36,
          color: verdictColor,
          transform: 'rotate(-4deg)',
          textAlign: 'center',
          margin: '16px 0',
          letterSpacing: '0.1em',
        }}>
          {verdictLabel}
        </div>
        <div style={styles.modalBody}>
          <p>{verdictBody}</p>
          <p style={{ fontSize: 12, color: TOKENS.inkSecondary }}>
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
