import type { ReactElement } from 'react';
import { TERMS } from '../terms';
import { styles } from '../styles';

export function SequencerPlaceholder(): ReactElement {
  return (
    <main style={styles.page} data-testid="sequencer-screen">
      <h1 style={styles.headerTitle}>{TERMS.sequencer}</h1>
      <p>Not available yet — this system depends on a future model change.</p>
    </main>
  );
}
