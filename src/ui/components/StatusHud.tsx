import { useEffect, useRef, useState, type ReactElement } from 'react';
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
      <FlashOnChange value={serum} testid="hud-serum">
        {TERMS.serumAbbr} {serum}
      </FlashOnChange>
      <FlashOnChange value={unitCount} testid="hud-colony-cap">
        {TERMS.colony} {unitCount}/{cap}
      </FlashOnChange>
      <FreeDecantsBadge />
      <span
        style={props.directiveText ? styles.hudItem : { ...styles.hudItem, ...styles.hudDirectiveEmpty }}
        data-testid="hud-directive"
      >
        {TERMS.directive}: {props.directiveText ?? 'No directive'}
      </span>
    </div>
  );
}

function FlashOnChange(props: { value: number; testid: string; children: React.ReactNode }): ReactElement {
  const first = useRef(true);
  const [flashKey, setFlashKey] = useState(0);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setFlashKey((k) => k + 1);
  }, [props.value]);
  return (
    <span
      key={flashKey}
      className={flashKey > 0 ? 'a-flash-number' : undefined}
      style={styles.hudItem}
      data-testid={props.testid}
    >
      {props.children}
    </span>
  );
}

function FreeDecantsBadge(): ReactElement {
  const free = useColonyStore((s) => s.freeDecantsRemaining);
  return (
    <FlashOnChange value={free} testid="hud-free-decants">
      {TERMS.freeDecant}: {free}
    </FlashOnChange>
  );
}
