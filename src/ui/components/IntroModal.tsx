import type { ReactElement } from 'react';
import { styles } from '../styles';

export function IntroModal(props: { onDone: () => void }): ReactElement {
  return (
    <div className="modal-backdrop">
      <div className="modal" data-testid="intro-modal">
        <img
          src="/assets/pixellab/overlays/intro_splash.png"
          alt=""
          width={688}
          height={384}
          style={{ imageRendering: 'pixelated', maxWidth: '100%', height: 'auto', display: 'block', marginBottom: 12, borderRadius: 4 }}
          draggable={false}
        />
        <h2 style={styles.modalTitle}>Morulium</h2>
        <div style={styles.modalBody}>
          <p>You are a villain building an army in a vat.</p>
          <p>Grow monsters, one from each Morula. Send them into contested fronts. Hold what you take.</p>
          <p>Eventually, the world.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            style={styles.modalPrimary}
            onClick={props.onDone}
            data-testid="intro-modal-begin"
          >
            Begin
          </button>
          <button
            type="button"
            style={styles.decantButtonDisabled}
            onClick={props.onDone}
            data-testid="intro-modal-skip"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
