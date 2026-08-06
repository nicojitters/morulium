import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import type { SurfaceId } from '../../state/unlocks';

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
    <div
      className="panel"
      data-testid={`first-visit-${props.surface}`}
      style={{ borderLeft: '4px solid var(--teal)', margin: '0 auto 16px auto', maxWidth: 1400, position: 'relative' }}
    >
      <div className="text-stamp" style={{ fontSize: 14, marginBottom: 4 }}>{props.title}</div>
      <div className="text-readout" style={{ marginBottom: 4 }}>{props.body}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-dim)', fontStyle: 'italic' }}>{props.action}</div>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => markSeen(props.surface)}
        data-testid={`first-visit-${props.surface}-dismiss`}
        aria-label="Dismiss"
        style={{ position: 'absolute', top: 4, right: 8, fontSize: 18, lineHeight: 1, padding: '2px 6px' }}
      >
        ×
      </button>
    </div>
  );
}
