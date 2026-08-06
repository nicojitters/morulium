import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { TERMS } from '../terms';
import { DecantButton } from './DecantButton';
import { TermTooltip } from './TermTooltip';
import { styles } from '../styles';

export function EmptyColony(): ReactElement {
  const free = useColonyStore((s) => s.freeDecantsRemaining);

  const bodyContent = free > 0
    ? (
      <>
        No specimens yet — {free} free <TermTooltip termKey="decant">{TERMS.decant}</TermTooltip>{free === 1 ? '' : 's'} available.
      </>
    )
    : (
      <>
        No specimens yet — <TermTooltip termKey="decant">{TERMS.decant}</TermTooltip> a <TermTooltip termKey="morula">{TERMS.morula}</TermTooltip> to begin.
      </>
    );

  return (
    <div style={styles.emptyState} data-testid="empty-colony">
      <img
        src="/assets/pixellab/overlays/empty_colony.png"
        alt=""
        width={400}
        height={300}
        style={{ imageRendering: 'pixelated', maxWidth: '100%', height: 'auto', display: 'block', marginBottom: 16 }}
        draggable={false}
      />
      <div className="text-stamp" style={styles.emptyStateTitle}>Your Colony is empty</div>
      <div style={styles.emptyStateBody}>
        {bodyContent}
      </div>
      <DecantButton label="Decant your first Morula" variant="empty-cta" />
    </div>
  );
}
