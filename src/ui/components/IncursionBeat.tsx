import type { ReactElement } from 'react';
import type { IncursionBeat as Beat } from '../../sim/incursion';
import { styles } from '../styles';

interface Props {
  readonly beat: Beat;
  readonly visible: boolean;
  readonly index: number;
}

export function IncursionBeat({ beat, visible, index }: Props): ReactElement {
  return (
    <div
      key={index}
      className={visible ? 'a-ticker-glitch' : undefined}
      style={{ ...styles.incursionBeat, ...(visible ? styles.incursionBeatVisible : styles.incursionBeatHidden) }}
      data-testid={`incursion-beat-${index}`}
      data-visible={visible ? 'true' : undefined}
    >
      {beat.text}
    </div>
  );
}
