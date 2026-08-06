import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { SEEN_INITIAL } from '../../state/seen';
import type { SurfaceId } from '../../state/unlocks';
import { styles } from '../styles';

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
      style={{
        position: 'fixed', top: 60, right: 16, zIndex: 200,
        background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 6,
        width: 260, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', fontSize: 13,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <strong>Dev panel</strong>
        <button
          type="button"
          onClick={props.onClose}
          data-testid="dev-panel-close"
          style={{ background: 'transparent', border: 'none', color: '#e2e8f0', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" style={styles.modalPrimary} data-testid="dev-panel-reset"
                onClick={() => { resetGame(); }}>
          Reset to first-run
        </button>
        <button type="button" style={styles.modalPrimary} data-testid="dev-panel-seed-3-units"
                onClick={() => { decant(); decant(); decant(); }}>
          Seed 3 Decants
        </button>
        <button type="button" style={styles.modalPrimary} data-testid="dev-panel-ff-1h"
                onClick={() => fastForwardMs(3_600_000)}>
          Fast-forward 1 hour
        </button>
        <button type="button" style={styles.modalPrimary} data-testid="dev-panel-ff-8h"
                onClick={() => fastForwardMs(8 * 3_600_000)}>
          Fast-forward 8 hours
        </button>
        <button type="button" style={styles.modalPrimary} data-testid="dev-panel-mark-seen-all"
                onClick={() => useColonyStore.setState({ seenSurfaces: ALL_SEEN })}>
          Mark all screens seen
        </button>
      </div>
    </div>
  );
}
