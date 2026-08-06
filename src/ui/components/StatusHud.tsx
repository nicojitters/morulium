import type { ReactElement } from 'react';
import { useColonyStore, capOf } from '../../state/colony';
import { TERMS } from '../terms';
import { styles } from '../styles';

export function StatusHud(props: { directiveText: string | null }): ReactElement {
  const serum = useColonyStore((s) => s.serum);
  const unitCount = useColonyStore((s) => s.units.length);
  const buildings = useColonyStore((s) => s.buildings);
  const cap = capOf({ buildings });

  return (
    <div style={styles.hudRow} data-testid="status-hud">
      <span style={styles.hudItem} data-testid="hud-serum">
        {TERMS.serumAbbr} {serum}
      </span>
      <span style={styles.hudItem} data-testid="hud-colony-cap">
        {TERMS.colony} {unitCount}/{cap}
      </span>
      <span style={styles.hudItem} data-testid="hud-free-decants">
        {TERMS.freeDecant} 0
      </span>
      <span
        style={props.directiveText ? styles.hudItem : { ...styles.hudItem, ...styles.hudDirectiveEmpty }}
        data-testid="hud-directive"
      >
        {TERMS.directive}: {props.directiveText ?? 'No directive'}
      </span>
    </div>
  );
}
