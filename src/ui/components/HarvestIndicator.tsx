import { useEffect, useState, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import {
  DAILY_HARVEST_LIMIT,
  harvestsRemaining,
  millisUntilLocalMidnight,
} from '../../state/harvest';
import { styles } from '../styles';

const TICK_MS = 60_000;

function formatCountdown(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function HarvestIndicator(): ReactElement {
  const harvestsToday = useColonyStore((s) => s.harvestsToday);
  const harvestDayKey = useColonyStore((s) => s.harvestDayKey);

  // Force re-render every 60s while limit is hit so the countdown ticks
  const [, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const remaining = harvestsRemaining({ harvestsToday, harvestDayKey });
  const label = remaining > 0
    ? `Harvest ${remaining}/${DAILY_HARVEST_LIMIT}`
    : `Next Harvest in ${formatCountdown(millisUntilLocalMidnight(Date.now()))}`;

  return (
    <span style={styles.harvestIndicator} data-testid="harvest-indicator">
      {label}
    </span>
  );
}
