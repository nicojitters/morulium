import type { ReactElement } from 'react';
import { TERMS } from '../terms';
import { styles } from '../styles';
import { TOKENS } from '../tokens';

export function SequencerPlaceholder(): ReactElement {
  return (
    <main style={styles.page} data-register="lab" data-testid="sequencer-screen">
      <h1 className="text-stamp" style={styles.headerTitle}>{TERMS.sequencer}</h1>
      <div className="panel panel--iron" style={{ marginTop: 24 }}>
        <div className="text-stamp" style={{ fontSize: 18, color: TOKENS.signalWarn, marginBottom: 12 }}>
          Under Construction
        </div>
        <p className="text-readout" style={{ color: TOKENS.inkSecondary }}>
          Sequencing subsystem — offline. Deliverable in a later capital cycle.
        </p>
      </div>
    </main>
  );
}
