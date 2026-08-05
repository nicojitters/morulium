import { useEffect, useState, type ReactElement } from 'react';
import { useColonyStore, capOf } from '../../state/colony';
import { millisUntilLocalMidnight } from '../../state/harvest';
import { DAILY_BREED_LIMIT, breedsRemaining } from '../../state/breed';
import { BREED_COST_SERUM } from '../../state/serum';
import { styles } from '../styles';

interface Props {
  readonly onClick: () => void;
  readonly disabled?: boolean;
}

const TICK_MS = 60_000;

function formatCountdown(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

type DisabledReason = 'cap' | 'limit' | 'serum' | 'external' | null;

export function BreedButton({ onClick, disabled = false }: Props): ReactElement {
  const breedsToday = useColonyStore((s) => s.breedsToday);
  const breedDayKey = useColonyStore((s) => s.breedDayKey);
  const serum = useColonyStore((s) => s.serum);
  const units = useColonyStore((s) => s.units);
  const buildings = useColonyStore((s) => s.buildings);

  const [, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const remaining = breedsRemaining({ breedsToday, breedDayKey });
  const atCap = units.length >= capOf({ buildings });
  const limitHit = remaining === 0;
  const insufficientSerum = serum < BREED_COST_SERUM;

  // Priority: cap → limit → serum → external → enabled
  let reason: DisabledReason;
  if (atCap) reason = 'cap';
  else if (limitHit) reason = 'limit';
  else if (insufficientSerum) reason = 'serum';
  else if (disabled) reason = 'external';
  else reason = null;

  const isDisabled = reason !== null;

  const label = reason === 'cap'
    ? 'Colony full'
    : reason === 'limit'
      ? `Next Breed in ${formatCountdown(millisUntilLocalMidnight())}`
      : reason === 'serum'
        ? `Breed costs ${BREED_COST_SERUM} SR (have ${serum})`
        : `Confirm Breed (${remaining}/${DAILY_BREED_LIMIT})`;

  const style = isDisabled ? styles.breedButtonDisabled : styles.breedButton;

  return (
    <button
      type="button"
      style={style}
      onClick={() => { if (!isDisabled) onClick(); }}
      disabled={isDisabled}
      data-testid="breed-button"
      data-disabled={isDisabled ? 'true' : undefined}
      data-disabled-reason={reason ?? undefined}
    >
      {label}
    </button>
  );
}
