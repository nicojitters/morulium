import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { SEEN_INITIAL } from '../../state/seen';
import type { SurfaceId } from '../../state/unlocks';

const ALL_SEEN: Record<SurfaceId, boolean> = Object.fromEntries(
  (Object.keys(SEEN_INITIAL) as SurfaceId[]).map((k) => [k, true]),
) as Record<SurfaceId, boolean>;

export function DevPanel(props: { open: boolean; onClose: () => void }): ReactElement | null {
  const resetGame = useColonyStore((s) => s.resetGame);
  const fastForwardMs = useColonyStore((s) => s.fastForwardMs);
  const decant = useColonyStore((s) => s.decant);

  if (!props.open) return null;

  return (
    <div
      data-testid="dev-panel"
      className="panel panel--iron"
      style={{ position: 'fixed', top: 60, right: 16, zIndex: 200, width: 260, fontSize: 13 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <strong>Dev panel</strong>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={props.onClose}
          data-testid="dev-panel-close"
          style={{ padding: '2px 6px', fontSize: 16, lineHeight: 1 }}
        >
          ×
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" className="btn btn--ghost btn--stamp" data-testid="dev-panel-reset"
                onClick={() => { resetGame(); }}>
          Reset to first-run
        </button>
        <button type="button" className="btn btn--ghost btn--stamp" data-testid="dev-panel-seed-3-units"
                onClick={() => { decant(); decant(); decant(); }}>
          Seed 3 Decants
        </button>
        <button type="button" className="btn btn--ghost btn--stamp" data-testid="dev-panel-ff-1h"
                onClick={() => fastForwardMs(3_600_000)}>
          Fast-forward 1 hour
        </button>
        <button type="button" className="btn btn--ghost btn--stamp" data-testid="dev-panel-ff-8h"
                onClick={() => fastForwardMs(8 * 3_600_000)}>
          Fast-forward 8 hours
        </button>
        <button type="button" className="btn btn--ghost btn--stamp" data-testid="dev-panel-mark-seen-all"
                onClick={() => useColonyStore.setState({ seenSurfaces: ALL_SEEN })}>
          Mark all screens seen
        </button>
      </div>
    </div>
  );
}
