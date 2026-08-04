import { useEffect, useState, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { millisUntilLocalMidnight } from '../../state/harvest';
import { DAILY_BREED_LIMIT, breedsRemaining } from '../../state/breed';
import { styles } from '../styles';

const TICK_MS = 60_000;

function formatCountdown(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function BreedIndicator(): ReactElement {
  const breedsToday = useColonyStore((s) => s.breedsToday);
  const breedDayKey = useColonyStore((s) => s.breedDayKey);

  const [, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const remaining = breedsRemaining({ breedsToday, breedDayKey });
  const label = remaining > 0
    ? `Breed ${remaining}/${DAILY_BREED_LIMIT}`
    : `Next Breed in ${formatCountdown(millisUntilLocalMidnight())}`;

  return (
    <span style={styles.breedIndicator} data-testid="breed-indicator">
      {label}
    </span>
  );
}
