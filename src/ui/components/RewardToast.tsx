import { useEffect, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { directiveById } from '../../state/directives';
import { TERMS } from '../terms';
import { styles } from '../styles';

export function RewardToast(): ReactElement | null {
  const reward = useColonyStore((s) => s.recentReward);
  const clear = useColonyStore((s) => s.clearRecentReward);

  useEffect(() => {
    if (reward === null) return;
    const t = setTimeout(clear, 3000);
    return () => clearTimeout(t);
  }, [reward, clear]);

  if (reward === null) return null;
  const d = directiveById(reward.directiveId);
  return (
    <div style={styles.toast} data-testid="reward-toast">
      <div style={styles.toastBody}>
        <strong>+{reward.serum} {TERMS.serumAbbr}</strong> — {d.title} complete
      </div>
    </div>
  );
}
