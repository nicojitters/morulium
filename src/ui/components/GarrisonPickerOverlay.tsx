import type { ReactElement } from 'react';
import type { Unit } from '../../state/types';
import type { FrontId } from '../../sim/data/fronts';
import { styles } from '../styles';

interface Props {
  readonly frontId: FrontId;
  readonly eligibleUnits: readonly Unit[];
  readonly onAssign: (unitId: number) => void;
  readonly onDismiss: () => void;
}

export function GarrisonPickerOverlay({ frontId, eligibleUnits, onAssign, onDismiss }: Props): ReactElement {
  return (
    <>
      <div
        style={styles.garrisonPickerBackdrop}
        onClick={onDismiss}
        data-testid={`front-card-garrison-picker-backdrop-${frontId}`}
      />
      <div
        style={styles.garrisonPickerOverlay}
        data-testid={`front-card-garrison-picker-${frontId}`}
      >
        {eligibleUnits.length === 0 ? (
          <div style={styles.garrisonPickerRowEmpty}>No eligible units</div>
        ) : (
          eligibleUnits.map((u) => (
            <div
              key={u.id}
              className="garrison-row"
              style={styles.garrisonPickerRow}
              onClick={() => onAssign(u.id)}
              data-testid={`front-card-garrison-picker-unit-${frontId}-${u.id}`}
            >
              M-{String(u.id).padStart(5, '0')} · Rest {u.restCurrent}
            </div>
          ))
        )}
      </div>
    </>
  );
}
