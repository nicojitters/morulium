import type { ReactElement } from 'react';
import type { IncursionResolution } from '../../sim/incursion';
import { IncursionBeat } from './IncursionBeat';
import { styles } from '../styles';

interface Props {
  readonly resolution: IncursionResolution;
  readonly visibleBeatCount: number;
  readonly onSkip: () => void;
}

export function IncursionTicker({ resolution, visibleBeatCount, onSkip }: Props): ReactElement {
  return (
    <div style={styles.incursionTicker} data-testid="incursion-ticker">
      {resolution.beats.map((beat, i) => (
        <IncursionBeat key={i} beat={beat} visible={i < visibleBeatCount} index={i} />
      ))}
      <button
        type="button"
        style={styles.incursionSkipButton}
        onClick={onSkip}
        data-testid="incursion-skip-button"
      >
        Skip →
      </button>
    </div>
  );
}
