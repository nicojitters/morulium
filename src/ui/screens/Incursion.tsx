import { useEffect, useMemo, useState, type ReactElement } from 'react';
import type { FrontId } from '../../sim/data/fronts';
import { FRONTS } from '../../sim/data/fronts';
import { useColonyStore } from '../../state/colony';
import type { Unit } from '../../state/types';
import { SpecimenCard } from '../components/SpecimenCard';
import { FrontCard } from '../components/FrontCard';
import { IncursionTicker } from '../components/IncursionTicker';
import { unitToRow } from './Colony';
import { styles } from '../styles';

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

  const [selectedFrontId, setSelectedFrontId] = useState<FrontId | null>(null);
  const [teamIds, setTeamIds] = useState<(number | null)[]>([null, null, null, null]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [visibleBeatCount, setVisibleBeatCount] = useState(0);
  const [now, setNow] = useState<number>(Date.now());

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

  if (allCaptured) {
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

  if (units.length < 4) {
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
  const canLaunch = phase === 'idle' && bothPickedComplete && distinctTeam;

  function handleCardClick(u: Unit): void {
    if (phase !== 'idle') return;
    const idx = teamIds.findIndex((id) => id === u.id);
    if (idx !== -1) {
      const next = [...teamIds]; next[idx] = null; setTeamIds(next); return;
    }
    const emptyIdx = teamIds.findIndex((id) => id === null);
    if (emptyIdx === -1) return;
    const next = [...teamIds]; next[emptyIdx] = u.id; setTeamIds(next);
  }

  function clearSlot(i: number): void {
    if (phase !== 'idle') return;
    const next = [...teamIds]; next[i] = null; setTeamIds(next);
  }

  function handleLaunch(): void {
    if (!canLaunch) return;
    const ids = teamIds as [number, number, number, number];
    launchIncursion(selectedFrontId!, ids);
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
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.headerTitle}>Morulium</h1>
      <p style={styles.headerSub}>Incursion — Region 1</p>

      {/* Front cards row */}
      <div style={styles.incursionFrontsRow}>
        {(['infrastructure', 'military', 'guerrilla'] as FrontId[]).map((fid) => (
          <FrontCard
            key={fid}
            frontId={fid}
            label={FRONTS[fid].label}
            state={fronts[fid]}
            selected={selectedFrontId === fid}
            now={now}
            onClick={() => { if (phase === 'idle') setSelectedFrontId(fid); }}
          />
        ))}
      </div>

      {/* Team picker row (idle only) or Ticker (resolving/resolved) */}
      {phase === 'idle' && (
        <>
          <div style={styles.incursionTeamRow}>
            {teamIds.map((id, i) => {
              const u = id === null ? null : units.find((u) => u.id === id) ?? null;
              return (
                <div key={i} data-testid={`incursion-team-slot-${i}`}>
                  {u === null ? (
                    <div style={styles.incursionSlotEmpty}>Slot {i + 1}</div>
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

          <div style={styles.grid} data-testid="incursion-picker-grid">
            {sortedUnits.map((unit) => (
              <div key={unit.id} onClick={() => handleCardClick(unit)} style={{ cursor: 'pointer' }}>
                <SpecimenCard
                  row={unitToRow(unit)}
                  highlighted={unit.id === lastDecantedId}
                  lineage={{ generation: unit.generation, parentIds: unit.parentIds }}
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
