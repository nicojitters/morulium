import type { ReactElement } from 'react';
import type { Unit } from '../../state/types';
import { styles } from '../styles';

interface Props {
  readonly unit: Unit | null;
  readonly slotLabel: 'A' | 'B';
  readonly onClear: () => void;
}

export function ParentSlot({ unit, slotLabel, onClear }: Props): ReactElement {
  const testId = `parent-slot-${slotLabel.toLowerCase()}`;

  if (unit === null) {
    return (
      <div style={styles.parentSlotEmpty} data-testid={testId}>
        Parent {slotLabel}
      </div>
    );
  }

  const paddedId = `M-${String(unit.id).padStart(5, '0')}`;
  return (
    <div style={styles.parentSlotFilled} data-testid={testId}>
      <button
        type="button"
        style={styles.parentSlotClear}
        onClick={onClear}
        aria-label={`Clear parent ${slotLabel}`}
        data-testid={`parent-slot-clear-${slotLabel.toLowerCase()}`}
      >
        ×
      </button>
      <div style={styles.parentSlotIdLine}>{paddedId}</div>
      <div style={styles.parentSlotGenLine}>Gen {unit.generation}</div>
    </div>
  );
}
