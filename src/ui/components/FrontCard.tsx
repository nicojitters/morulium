import type { ReactElement } from 'react';
import type { FrontId } from '../../sim/data/fronts';
import type { FrontState } from '../../state/incursion';
import { styles } from '../styles';

interface Props {
  readonly frontId: FrontId;
  readonly label: string;
  readonly state: FrontState;
  readonly selected: boolean;
  readonly now: number;                // parent-driven clock for cooldown countdown
  readonly onClick: () => void;
}

function formatCooldown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function FrontCard({ frontId, label, state, selected, now, onClick }: Props): ReactElement {
  const cooldownActive = state.cooldownUntil !== null && state.cooldownUntil > now;
  const clickable = !state.captured && !cooldownActive;

  let statusText: string;
  if (state.captured) statusText = 'Captured ✓';
  else if (cooldownActive) statusText = `Cooling down · ${formatCooldown(state.cooldownUntil! - now)}`;
  else statusText = 'Available';

  const style = state.captured
    ? styles.frontCardCaptured
    : cooldownActive
      ? styles.frontCardCooldown
      : selected
        ? styles.frontCardSelected
        : styles.frontCard;

  return (
    <div
      style={style}
      onClick={() => { if (clickable) onClick(); }}
      data-testid={`front-card-${frontId}`}
      data-disabled={clickable ? undefined : 'true'}
    >
      <div style={styles.frontCardLabel}>{label}</div>
      <div style={styles.frontCardStatus} data-testid={`front-card-status-${frontId}`}>
        {statusText}
      </div>
    </div>
  );
}
