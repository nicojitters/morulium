import { useEffect, useState, type ReactElement } from 'react';
import { useColonyStore, capOf } from '../../state/colony';
import {
  DAILY_HARVEST_LIMIT,
  harvestsRemaining,
  millisUntilLocalMidnight,
} from '../../state/harvest';
import { TERMS } from '../terms';
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
  const units = useColonyStore((s) => s.units);
  const buildings = useColonyStore((s) => s.buildings);
  const free = useColonyStore((s) => s.freeDecantsRemaining);

  const [, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const remaining = harvestsRemaining({ harvestsToday, harvestDayKey });
  const atCap = units.length >= capOf({ buildings });
  const disabled = remaining === 0 || atCap;

  const disabledReason: 'limit' | 'cap' | null = remaining === 0
    ? 'limit'
    : atCap ? 'cap' : null;

  const freeTag = free > 0 ? ` (free ×${free})` : '';
  const defaultLabel = variant === 'empty-cta'
    ? `${TERMS.decant} your first ${TERMS.morula}${freeTag} (${remaining}/${DAILY_HARVEST_LIMIT})`
    : `${TERMS.decant} a ${TERMS.morula}${freeTag} (${remaining}/${DAILY_HARVEST_LIMIT})`;

  const enabledLabel = label ?? defaultLabel;
  const displayLabel = disabledReason === 'limit'
    ? `Next Harvest in ${formatCountdown(millisUntilLocalMidnight())}`
    : disabledReason === 'cap'
      ? 'Colony full — Cull or Vat first'
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
      data-disabled-reason={disabledReason ?? undefined}
    >
      {displayLabel}
    </button>
  );
}
