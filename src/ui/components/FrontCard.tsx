import { type ReactElement, useRef, useEffect } from 'react';
import type { FrontId } from '../../sim/data/fronts';
import type { FrontState } from '../../state/incursion';
import type { Unit } from '../../state/types';
import { GARRISON_TARGET, GARRISON_GRACE_MS } from '../../state/occupation';
import { styles } from '../styles';

interface Props {
  readonly frontId: FrontId;
  readonly label: string;
  readonly state: FrontState;
  readonly selected: boolean;
  readonly now: number;
  readonly onClick: () => void;
  // NEW (M6c) — all optional so legacy callers work
  readonly expanded?: boolean;
  readonly garrisonUnits?: readonly (Unit | null)[];
  readonly onGarrisonSlotClick?: (slotIndex: number) => void;
  readonly onGarrisonSlotClear?: (slotIndex: number, unitId: number) => void;
}

function formatCooldown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function FrontCard({
  frontId, label, state, selected, now, onClick,
  expanded = false, garrisonUnits, onGarrisonSlotClick, onGarrisonSlotClear,
}: Props): ReactElement {
  const cardRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    if (!selected || !cardRef.current) return;
    const el = cardRef.current;
    el.classList.remove('a-stamp-in');
    void el.offsetWidth; // trigger reflow so re-add fires the animation
    el.classList.add('a-stamp-in');
  }, [selected]);

  const cooldownActive = state.cooldownUntil !== null && state.cooldownUntil > now;
  const clickable = !cooldownActive;   // Captured fronts are clickable for expand/collapse

  let statusText: string;
  if (state.captured) statusText = 'Captured ✓';
  else if (cooldownActive) statusText = `Cooling down · ${formatCooldown(state.cooldownUntil! - now)}`;
  else statusText = 'Available';

  const style = state.captured
    ? styles.frontCardCaptured
    : cooldownActive
      ? styles.frontCardCooldown
      : selected
        ? styles.frontCardSelected
        : styles.frontCard;

  const flareRemaining = state.flareStartedAt !== null
    ? (state.flareStartedAt + GARRISON_GRACE_MS) - now
    : 0;
  const flareActive = state.captured && state.flareStartedAt !== null && flareRemaining > 0;

  return (
    <div
      ref={cardRef}
      className="card card--front"
      style={style}
      onClick={() => { if (clickable) onClick(); }}
      data-testid={`front-card-${frontId}`}
      data-disabled={clickable ? undefined : 'true'}
    >
      <img
        src={`/assets/pixellab/conquest/front_${frontId}.png`}
        alt=""
        style={{
          imageRendering: 'pixelated',
          width: '100%',
          height: 120,
          objectFit: 'cover',
          borderRadius: 4,
          marginBottom: 6,
          filter: cooldownActive ? 'saturate(0.4) brightness(0.7)' : undefined,
        }}
        draggable={false}
      />
      <div style={styles.frontCardLabel}>{label}</div>
      <div style={styles.frontCardStatus} data-testid={`front-card-status-${frontId}`}>
        {statusText}
      </div>

      {/* Captured: garrison sub-line + flare + radicalization note */}
      {state.captured && !flareActive && (
        <div style={styles.frontCardGarrisonRow} data-testid={`front-card-garrison-${frontId}`}>
          Garrison: {state.garrison.length}/{GARRISON_TARGET}
        </div>
      )}
      {flareActive && (
        <div style={styles.frontCardFlareLine} data-testid={`front-card-flare-${frontId}`}>
          ⚠ Flaring in {formatCooldown(flareRemaining)}
        </div>
      )}
      {state.captured && (
        <div style={styles.frontCardRadicalizationNote} data-testid={`front-card-radicalization-note-${frontId}`}>
          → +{state.hardening === 0 ? 4 : 4} threshold on other fronts
        </div>
      )}

      {/* Un-captured: hardening warning */}
      {!state.captured && state.hardening > 0 && (
        <div style={styles.frontCardHardeningLine} data-testid={`front-card-hardening-${frontId}`}>
          ⚠ Hardened: +{state.hardening}
        </div>
      )}

      {/* Garrison sub-panel (only when expanded) */}
      {state.captured && expanded && garrisonUnits && (
        <div style={{ marginTop: 6 }}>
          {garrisonUnits.map((u, i) => {
            if (u === null) {
              return (
                <div
                  key={i}
                  style={styles.frontCardGarrisonSlotEmpty}
                  data-testid={`front-card-garrison-slot-${frontId}-${i}`}
                  onClick={(e) => { e.stopPropagation(); onGarrisonSlotClick?.(i); }}
                >
                  Empty
                </div>
              );
            }
            return (
              <div
                key={i}
                style={styles.frontCardGarrisonSlotFilled}
                data-testid={`front-card-garrison-slot-${frontId}-${i}`}
              >
                M-{String(u.id).padStart(5, '0')}
                <button
                  type="button"
                  style={styles.frontCardGarrisonSlotClear}
                  onClick={(e) => { e.stopPropagation(); onGarrisonSlotClear?.(i, u.id); }}
                  data-testid={`front-card-garrison-slot-clear-${frontId}-${i}`}
                  aria-label="Remove from garrison"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
