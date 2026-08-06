import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import type { SurfaceId } from '../../state/unlocks';
import { styles } from '../styles';

export function FirstVisitCallout(props: {
  surface: SurfaceId;
  title: string;
  body: string;
  action: string;
}): ReactElement | null {
  const seen = useColonyStore((s) => s.seenSurfaces[props.surface]);
  const markSeen = useColonyStore((s) => s.markSeen);
  if (seen) return null;
  return (
    <div style={styles.firstVisitCallout} data-testid={`first-visit-${props.surface}`}>
      <div style={styles.firstVisitTitle}>{props.title}</div>
      <div style={styles.firstVisitBody}>{props.body}</div>
      <div style={styles.firstVisitAction}>{props.action}</div>
      <button
        type="button"
        style={styles.firstVisitDismiss}
        onClick={() => markSeen(props.surface)}
        data-testid={`first-visit-${props.surface}-dismiss`}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
