import { useState, type ReactElement, type ReactNode } from 'react';
import { definitionOf, type TermKey } from '../definitions';
import { styles } from '../styles';

export function TermTooltip(props: { termKey: TermKey; children: ReactNode }): ReactElement {
  const [open, setOpen] = useState(false);
  const def = definitionOf(props.termKey);
  return (
    <span
      style={styles.tooltipTrigger}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      title={def}
    >
      {props.children}
      {open && (
        <span style={styles.tooltipBubble} data-testid={`tooltip-bubble-${props.termKey}`}>
          {def}
        </span>
      )}
    </span>
  );
}
