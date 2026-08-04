import { useEffect, useState, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import {
  DAILY_HARVEST_LIMIT,
  harvestsRemaining,
  millisUntilLocalMidnight,
} from '../../state/harvest';
import { styles } from '../styles';

interface Props {
  readonly label?: string;
  readonly variant?: 'header' | 'empty-cta';
}

const TICK_MS = 60_000;

function formatCountdown(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function DecantButton({ label, variant = 'header' }: Props): ReactElement {
  const decant = useColonyStore((s) => s.decant);
  const harvestsToday = useColonyStore((s) => s.harvestsToday);
  const harvestDayKey = useColonyStore((s) => s.harvestDayKey);

  const [, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const remaining = harvestsRemaining({ harvestsToday, harvestDayKey });
  const disabled = remaining === 0;

  const defaultLabel = variant === 'empty-cta'
    ? `Decant your first Morula (${remaining}/${DAILY_HARVEST_LIMIT})`
    : `Decant a Morula (${remaining}/${DAILY_HARVEST_LIMIT})`;

  const enabledLabel = label ?? defaultLabel;
  const displayLabel = disabled
    ? `Next Harvest in ${formatCountdown(millisUntilLocalMidnight())}`
    : enabledLabel;

  const style = disabled
    ? (variant === 'empty-cta' ? styles.emptyStateCtaDisabled : styles.decantButtonDisabled)
    : (variant === 'empty-cta' ? styles.emptyStateCta : styles.decantButton);

  return (
    <button
      type="button"
      style={style}
      onClick={() => { if (!disabled) decant(); }}
      disabled={disabled}
      data-testid="decant-button"
      data-disabled={disabled ? 'true' : undefined}
    >
      {displayLabel}
    </button>
  );
}
