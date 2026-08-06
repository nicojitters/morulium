import { useEffect, type ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { styles } from '../styles';

export function ActionToast(): ReactElement | null {
  const msg = useColonyStore((s) => s.recentActionMessage);
  const clear = useColonyStore((s) => s.clearActionMessage);

  useEffect(() => {
    if (msg === null) return;
    const t = setTimeout(clear, 2500);
    return () => clearTimeout(t);
  }, [msg, clear]);

  if (msg === null) return null;
  return (
    <div
      className="a-toast-slide"
      style={{ ...styles.toast, bottom: 80 }}
      data-testid="action-toast"
    >
      <div style={styles.toastBody}>{msg}</div>
    </div>
  );
}
