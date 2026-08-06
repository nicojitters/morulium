import { useEffect, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { TERMS } from '../terms';
import { styles } from '../styles';

const LABELS: Record<string, string> = {
  colony: TERMS.colony,
  'dna-lab': TERMS.dnaLab,
  breed: 'Breed',
  vat: TERMS.vat,
  incursion: TERMS.incursion,
  vivarium: TERMS.vivarium,
  'conquest-map': TERMS.conquestMap,
  sequencer: TERMS.sequencer,
  registry: TERMS.registry,
};

export function UnlockedToast(): ReactElement | null {
  const recent = useColonyStore((s) => s.recentUnlock);
  const clear = useColonyStore((s) => s.clearRecentUnlock);

  useEffect(() => {
    if (recent === null) return;
    const t = setTimeout(clear, 4000);
    return () => clearTimeout(t);
  }, [recent, clear]);

  if (recent === null) return null;
  return (
    <div style={styles.toast} data-testid="unlocked-toast">
      <div style={styles.toastBody}>
        <strong>{TERMS.unlocked}:</strong> {LABELS[recent.id]} — {recent.reason}
      </div>
    </div>
  );
}
