import { useEffect, useState, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { millisUntilLocalMidnight } from '../../state/harvest';
import { DAILY_BREED_LIMIT, breedsRemaining } from '../../state/breed';
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

export function BreedButton({ onClick, disabled = false }: Props): ReactElement {
  const breedsToday = useColonyStore((s) => s.breedsToday);
  const breedDayKey = useColonyStore((s) => s.breedDayKey);

  const [, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const remaining = breedsRemaining({ breedsToday, breedDayKey });
  const limitHit = remaining === 0;
  const isDisabled = disabled || limitHit;

  const label = limitHit
    ? `Next Breed in ${formatCountdown(millisUntilLocalMidnight())}`
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
    >
      {label}
    </button>
  );
}
