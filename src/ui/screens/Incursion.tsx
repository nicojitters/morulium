import { useEffect, useMemo, useState, type ReactElement } from 'react';
import type { FrontId } from '../../sim/data/fronts';
import { FRONTS } from '../../sim/data/fronts';
import { useColonyStore } from '../../state/colony';
import type { Unit } from '../../state/types';
import { SpecimenCard } from '../components/SpecimenCard';
import { FrontCard } from '../components/FrontCard';
import { IncursionTicker } from '../components/IncursionTicker';
import { unitToRow, restStateFor, garrisonedAtFor } from './Colony';
import { GarrisonPickerOverlay } from '../components/GarrisonPickerOverlay';
import { styles } from '../styles';
import { UNDER_RESTED_THRESHOLD, STIM_COST_SERUM } from '../../state/rest';
import { GARRISON_TARGET } from '../../state/occupation';

type Phase = 'idle' | 'resolving' | 'resolved';

const TICK_MS = 1500;
const CLOCK_MS = 1000;   // FrontCard cooldown ticks every 1s


export function Incursion(): ReactElement {
  const units = useColonyStore((s) => s.units);
  const fronts = useColonyStore((s) => s.fronts);
  const activeIncursion = useColonyStore((s) => s.activeIncursion);
  const launchIncursion = useColonyStore((s) => s.launchIncursion);
  const dismissIncursion = useColonyStore((s) => s.dismissIncursion);
  const lastDecantedId = useColonyStore((s) => s.lastDecantedId);
  const serum = useColonyStore((s) => s.serum);
  const stims = useColonyStore((s) => s.stims);
  const buyStim = useColonyStore((s) => s.buyStim);

  const [selectedFrontId, setSelectedFrontId] = useState<FrontId | null>(null);
  const [teamIds, setTeamIds] = useState<(number | null)[]>([null, null, null, null]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [visibleBeatCount, setVisibleBeatCount] = useState(0);
  const [now, setNow] = useState<number>(Date.now());
  const [stimApplied, setStimApplied] = useState<Set<number>>(new Set());
  const [expandedFrontId, setExpandedFrontId] = useState<FrontId | null>(null);
  const [pickerOpenFor, setPickerOpenFor] = useState<{ frontId: FrontId; slotIndex: number } | null>(null);

  // Cooldown clock (idle only). Ticks every second so all FrontCards show
  // the same "now" and countdowns update together.
  useEffect(() => {
    if (phase !== 'idle') return;
    const t = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => clearInterval(t);
  }, [phase]);

  // Ticker interval (resolving only). Reveals one beat per TICK_MS; when
  // all beats visible, transition to resolved.
  useEffect(() => {
    if (phase !== 'resolving') return;
    const total = activeIncursion?.beats.length ?? 0;
    if (total === 0) return;
    const t = setInterval(() => {
      setVisibleBeatCount((n) => {
        const next = n + 1;
        if (next >= total) {
          clearInterval(t);
          setPhase('resolved');
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(t);
  }, [phase, activeIncursion]);

  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => b.decantedAt - a.decantedAt || b.id - a.id),
    [units],
  );

  const allCaptured = fronts.infrastructure.captured && fronts.military.captured && fronts.guerrilla.captured;
  const anyFlaring = fronts.infrastructure.flareStartedAt !== null
    || fronts.military.flareStartedAt !== null
    || fronts.guerrilla.flareStartedAt !== null;

  if (allCaptured && !anyFlaring) {
    return (
      <main style={styles.page}>
        <h1 style={styles.headerTitle}>Morulium</h1>
        <p style={styles.headerSub}>Incursion — Region 1</p>
        <div style={styles.regionConquered} data-testid="incursion-region-conquered">
          <div style={styles.regionConqueredTitle}>Region conquered ✓</div>
          <div style={styles.regionConqueredBody}>
            All three fronts held. The region falls silent under your banner.
          </div>
        </div>
      </main>
    );
  }

  const anyCaptured = fronts.infrastructure.captured || fronts.military.captured || fronts.guerrilla.captured;

  if (units.length < 4 && !anyCaptured) {
    return (
      <main style={styles.page}>
        <h1 style={styles.headerTitle}>Morulium</h1>
        <p style={styles.headerSub}>Incursion — Region 1</p>
        <div style={styles.emptyState} data-testid="incursion-empty-state">
          <div style={styles.emptyStateTitle}>Need at least 4 specimens for an Incursion.</div>
          <div style={styles.emptyStateBody}>
            Harvest or Breed to fill the roster.
          </div>
        </div>
      </main>
    );
  }

  const bothPickedComplete =
    selectedFrontId !== null && teamIds.every((id) => id !== null);
  const distinctTeam = new Set(teamIds.filter((id): id is number => id !== null)).size === teamIds.filter((id) => id !== null).length;

  const underRestedCount = teamIds.filter((id) => {
    if (id === null) return false;
    const u = units.find((u) => u.id === id);
    return u !== undefined && u.restCurrent < UNDER_RESTED_THRESHOLD && !stimApplied.has(id);
  }).length;

  const stimsRequired = stimApplied.size;
  const stimsInsufficient = stimsRequired > stims;
  const anyInjured = teamIds.some((id) => {
    if (id === null) return false;
    const u = units.find((u) => u.id === id);
    return u !== undefined && u.injuredUntil !== null && u.injuredUntil > now;
  });

  // Launch button disabled: existing (front + team + distinct) OR any injured OR stims insufficient
  const canLaunch = phase === 'idle' && bothPickedComplete && distinctTeam
    && !anyInjured && !stimsInsufficient;

  function handleFrontCardClick(fid: FrontId): void {
    const front = fronts[fid];
    if (front.captured) {
      // Toggle expand state
      setExpandedFrontId(expandedFrontId === fid ? null : fid);
      // Close picker if open on a different front
      if (pickerOpenFor !== null && pickerOpenFor.frontId !== fid) setPickerOpenFor(null);
    } else {
      // Un-captured (available or cooling down) — select for launch (existing M5 behavior)
      if (phase === 'idle') setSelectedFrontId(fid);
    }
  }

  function handleCardClick(u: Unit): void {
    if (phase !== 'idle') return;
    // Reject injured units
    if (u.injuredUntil !== null && u.injuredUntil > now) return;
    // Reject garrisoned units
    if (garrisonedAtFor(u.id, fronts) !== null) return;
    const idx = teamIds.findIndex((id) => id === u.id);
    if (idx !== -1) {
      const next = [...teamIds]; next[idx] = null; setTeamIds(next);
      // Also clear any Stim toggle on this unit
      setStimApplied((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(u.id);
        return nextSet;
      });
      return;
    }
    const emptyIdx = teamIds.findIndex((id) => id === null);
    if (emptyIdx === -1) return;
    const next = [...teamIds]; next[emptyIdx] = u.id; setTeamIds(next);
  }

  function clearSlot(i: number): void {
    if (phase !== 'idle') return;
    const clearedId = teamIds[i];
    const next = [...teamIds]; next[i] = null; setTeamIds(next);
    if (clearedId != null) {
      const clearedIdNum: number = clearedId;
      setStimApplied((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(clearedIdNum);
        return nextSet;
      });
    }
  }

  function toggleStim(unitId: number): void {
    setStimApplied((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(unitId)) nextSet.delete(unitId);
      else nextSet.add(unitId);
      return nextSet;
    });
  }

  function handleLaunch(): void {
    if (!canLaunch) return;
    const ids = teamIds as [number, number, number, number];
    launchIncursion(selectedFrontId!, ids, [...stimApplied]);
    setVisibleBeatCount(0);
    setPhase('resolving');
  }

  function handleSkip(): void {
    if (phase !== 'resolving') return;
    const total = activeIncursion?.beats.length ?? 0;
    setVisibleBeatCount(total);
    setPhase('resolved');
  }

  function handleContinue(): void {
    dismissIncursion();
    setPhase('idle');
    setVisibleBeatCount(0);
    setSelectedFrontId(null);
    setTeamIds([null, null, null, null]);
    setStimApplied(new Set());
    setExpandedFrontId(null);
    setPickerOpenFor(null);
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.headerTitle}>Morulium</h1>
      <p style={styles.headerSub}>Incursion — Region 1</p>

      {/* Front cards row */}
      <div style={styles.incursionFrontsRow}>
        {(['infrastructure', 'military', 'guerrilla'] as FrontId[]).map((fid) => {
          const front = fronts[fid];
          const garrisonUnits: (Unit | null)[] = Array.from({ length: GARRISON_TARGET }, (_, i) => {
            const uid = front.garrison[i];
            return uid !== undefined ? (units.find((u) => u.id === uid) ?? null) : null;
          });
          return (
            <div key={fid} style={{ position: 'relative' }}>
              <FrontCard
                frontId={fid}
                label={FRONTS[fid].label}
                state={front}
                selected={selectedFrontId === fid}
                now={now}
                onClick={() => handleFrontCardClick(fid)}
                expanded={expandedFrontId === fid}
                garrisonUnits={garrisonUnits}
                onGarrisonSlotClick={(slotIndex) => setPickerOpenFor({ frontId: fid, slotIndex })}
                onGarrisonSlotClear={(_slotIndex, unitId) => {
                  useColonyStore.getState().removeFromGarrison(fid, unitId);
                }}
              />
              {pickerOpenFor !== null && pickerOpenFor.frontId === fid && (
                <GarrisonPickerOverlay
                  frontId={fid}
                  eligibleUnits={units.filter((u) => {
                    if (u.injuredUntil !== null && u.injuredUntil > now) return false;
                    if (garrisonedAtFor(u.id, fronts) !== null) return false;
                    if (teamIds.includes(u.id)) return false;
                    return true;
                  })}
                  onAssign={(unitId) => {
                    useColonyStore.getState().assignToGarrison(fid, unitId);
                    setPickerOpenFor(null);
                  }}
                  onDismiss={() => setPickerOpenFor(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Team picker row (idle only) or Ticker (resolving/resolved) */}
      {phase === 'idle' && (
        <>
          {/* Buy Stim row */}
          <div style={styles.stimShopRow}>
            <span style={styles.stimInventoryLabel} data-testid="stim-inventory-label">
              Stims: {stims}
            </span>
            <button
              type="button"
              style={serum < STIM_COST_SERUM ? styles.buyStimButtonDisabled : styles.buyStimButton}
              onClick={() => { if (serum >= STIM_COST_SERUM) buyStim(); }}
              disabled={serum < STIM_COST_SERUM}
              data-testid="buy-stim-button"
              data-disabled={serum < STIM_COST_SERUM ? 'true' : undefined}
            >
              Buy Stim ({STIM_COST_SERUM} SR)
            </button>
          </div>

          <div style={styles.incursionTeamRow}>
            {teamIds.map((id, i) => {
              const u = id === null ? null : units.find((u) => u.id === id) ?? null;
              return (
                <div key={i} data-testid={`incursion-team-slot-${i}`}>
                  {u === null ? (
                    <div style={styles.incursionSlotEmpty}>
                      Slot {i + 1}
                    </div>
                  ) : (
                    <div style={styles.incursionSlotFilled}>
                      <button
                        type="button"
                        style={styles.incursionSlotClear}
                        onClick={() => clearSlot(i)}
                        aria-label={`Clear slot ${i + 1}`}
                        data-testid={`incursion-team-slot-clear-${i}`}
                      >×</button>
                      <div style={styles.incursionSlotIdLine}>{`M-${String(u.id).padStart(5, '0')}`}</div>
                      <div style={styles.incursionSlotGenLine}>Gen {u.generation}</div>
                      {u.restCurrent < UNDER_RESTED_THRESHOLD && (
                        <button
                          type="button"
                          style={stimApplied.has(u.id) ? styles.slotStimToggleActive : styles.slotStimToggle}
                          onClick={(e) => { e.stopPropagation(); toggleStim(u.id); }}
                          data-testid={`stim-toggle-${i}`}
                        >
                          {stimApplied.has(u.id) ? '✓ Stim' : '+ Stim'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={styles.incursionLaunchRow}>
            <button
              type="button"
              style={canLaunch ? styles.incursionLaunchButton : styles.incursionLaunchButtonDisabled}
              onClick={handleLaunch}
              disabled={!canLaunch}
              data-testid="launch-incursion-button"
              data-disabled={canLaunch ? undefined : 'true'}
            >
              Launch Incursion
            </button>
          </div>

          {selectedFrontId === null && (
            <div style={styles.incursionHint}>Pick a front and 4 specimens to launch.</div>
          )}
          {selectedFrontId !== null && !bothPickedComplete && (
            <div style={styles.incursionHint}>Fill all 4 team slots.</div>
          )}
          {bothPickedComplete && !distinctTeam && (
            <div style={styles.incursionHint}>Pick 4 different specimens.</div>
          )}
          {anyInjured && (
            <div style={styles.incursionHint}>One of your picks is injured — swap them out.</div>
          )}
          {!anyInjured && underRestedCount > 0 && (
            <div style={styles.incursionHint}>
              {underRestedCount} unit(s) still under-rested. Apply Stims or accept the risk (25% injury chance each).
            </div>
          )}
          {stimsInsufficient && (
            <div style={styles.incursionHint}>
              Not enough Stims ({stims} available for {stimsRequired} toggled).
            </div>
          )}

          <div style={styles.grid} data-testid="incursion-picker-grid">
            {sortedUnits.map((unit) => (
              <div key={unit.id} onClick={() => handleCardClick(unit)} style={{ cursor: 'pointer' }}>
                <SpecimenCard
                  row={unitToRow(unit)}
                  highlighted={unit.id === lastDecantedId}
                  lineage={{ generation: unit.generation, parentIds: unit.parentIds }}
                  restState={restStateFor(unit, now)}
                  garrisonedAt={garrisonedAtFor(unit.id, fronts)}
                  culled={unit.culled}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {phase !== 'idle' && activeIncursion !== null && (
        <div style={styles.incursionSection}>
          <IncursionTicker
            resolution={activeIncursion}
            visibleBeatCount={visibleBeatCount}
            onSkip={handleSkip}
          />
          {phase === 'resolved' && (
            <div style={styles.incursionLaunchRow}>
              <button
                type="button"
                style={styles.incursionContinueButton}
                onClick={handleContinue}
                data-testid="incursion-continue-button"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
