import type { ReactElement } from 'react';
import { styles } from '../styles';
import { TERMS } from '../terms';
import { Wordmark } from '../components/Wordmark';

export function NewGameGate(props: {
  hasExistingSave: boolean;
  onContinue: () => void;
  onNewGame: () => void;
}): ReactElement {
  return (
    <main style={styles.newGameGateRoot} data-testid="new-game-gate" data-register="lab">
      <Wordmark size="hero" />
      <p style={styles.newGameGateTagline}>Specimen management console · v0.0.1</p>
      <div style={styles.newGameGateActions}>
        <button
          type="button"
          style={props.hasExistingSave ? styles.newGameGateGhost : styles.newGameGateGhostDisabled}
          disabled={!props.hasExistingSave}
          onClick={props.onContinue}
          data-testid="new-game-gate-continue"
        >
          {TERMS.continueGame}
        </button>
        <button
          type="button"
          style={styles.newGameGatePrimary}
          onClick={props.onNewGame}
          data-testid="new-game-gate-new-game"
        >
          {TERMS.newGame}
        </button>
      </div>
      <div style={styles.newGameGateFooter}>Cultivate. Conquer.</div>
    </main>
  );
}
