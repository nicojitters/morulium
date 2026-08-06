import type { ReactElement } from 'react';
import { styles } from '../styles';
import { TERMS } from '../terms';

export function NewGameGate(props: {
  hasExistingSave: boolean;
  onContinue: () => void;
  onNewGame: () => void;
}): ReactElement {
  return (
    <main style={styles.page} data-testid="new-game-gate">
      <h1 style={styles.headerTitle}>Morulium</h1>
      <p style={styles.headerSub}>Grow monsters. Take fronts. Rule.</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          type="button"
          style={props.hasExistingSave ? styles.modalPrimary : styles.decantButtonDisabled}
          disabled={!props.hasExistingSave}
          onClick={props.onContinue}
          data-testid="new-game-gate-continue"
        >
          {TERMS.continueGame}
        </button>
        <button
          type="button"
          style={styles.modalPrimary}
          onClick={props.onNewGame}
          data-testid="new-game-gate-new-game"
        >
          {TERMS.newGame}
        </button>
      </div>
    </main>
  );
}
