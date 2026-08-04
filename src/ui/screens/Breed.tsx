import { useMemo, useState, type ReactElement } from 'react';
import type { Unit } from '../../state/types';
import { useColonyStore } from '../../state/colony';
import { BreedButton } from '../components/BreedButton';
import { BreedIndicator } from '../components/BreedIndicator';
import { ParentSlot } from '../components/ParentSlot';
import { SpecimenCard } from '../components/SpecimenCard';
import { unitToRow } from './Colony';
import { styles } from '../styles';

export function Breed(): ReactElement {
  const units = useColonyStore((s) => s.units);
  const breed = useColonyStore((s) => s.breed);
  const lastDecantedId = useColonyStore((s) => s.lastDecantedId);

  const [parentAId, setParentAId] = useState<number | null>(null);
  const [parentBId, setParentBId] = useState<number | null>(null);

  const parentA = useMemo(
    () => (parentAId === null ? null : units.find((u) => u.id === parentAId) ?? null),
    [parentAId, units],
  );
  const parentB = useMemo(
    () => (parentBId === null ? null : units.find((u) => u.id === parentBId) ?? null),
    [parentBId, units],
  );

  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => b.decantedAt - a.decantedAt || b.id - a.id),
    [units],
  );

  if (units.length < 2) {
    return (
      <main style={styles.page}>
        <h1 style={styles.headerTitle}>Morulium</h1>
        <p style={styles.headerSub}>Breed a Morula from two parents · <BreedIndicator /></p>
        <div style={styles.emptyState} data-testid="breed-empty-state">
          <div style={styles.emptyStateTitle}>Need at least two specimens to breed</div>
          <div style={styles.emptyStateBody}>
            Harvest more Morulae from the Colony screen, then come back to breed them.
          </div>
        </div>
      </main>
    );
  }

  const bothPicked = parentAId !== null && parentBId !== null;
  const distinct = parentAId !== parentBId;
  const canConfirm = bothPicked && distinct;

  const handleCardClick = (unit: Unit): void => {
    // Clicking a card already in a slot → clear that slot
    if (unit.id === parentAId) { setParentAId(null); return; }
    if (unit.id === parentBId) { setParentBId(null); return; }
    // Fill first empty slot
    if (parentAId === null) { setParentAId(unit.id); return; }
    if (parentBId === null) { setParentBId(unit.id); return; }
    // Both full — ignore
  };

  const handleConfirm = (): void => {
    if (!canConfirm) return;
    // parentAId/parentBId are guaranteed non-null under canConfirm
    breed(parentAId!, parentBId!);
    setParentAId(null);
    setParentBId(null);
  };

  return (
    <main style={styles.page}>
      <h1 style={styles.headerTitle}>Morulium</h1>
      <p style={styles.headerSub}>Breed a Morula from two parents · <BreedIndicator /></p>

      <div style={styles.breedSection}>
        <div style={styles.breedParentsRow}>
          <ParentSlot unit={parentA} slotLabel="A" onClear={() => setParentAId(null)} />
          <div style={styles.breedTimesX} aria-hidden="true">×</div>
          <ParentSlot unit={parentB} slotLabel="B" onClear={() => setParentBId(null)} />
        </div>
        <div style={styles.breedConfirmRow}>
          <BreedButton onClick={handleConfirm} disabled={!canConfirm} />
        </div>
        {!bothPicked && (
          <div style={styles.breedHint}>Click two specimens below to pick parents.</div>
        )}
        {bothPicked && !distinct && (
          <div style={styles.breedHint}>Pick two different specimens.</div>
        )}
      </div>

      <div style={styles.grid} data-testid="breed-picker-grid">
        {sortedUnits.map((unit) => (
          <div
            key={unit.id}
            onClick={() => handleCardClick(unit)}
            style={{ cursor: 'pointer' }}
          >
            <SpecimenCard
              row={unitToRow(unit)}
              highlighted={unit.id === lastDecantedId}
              lineage={{ generation: unit.generation, parentIds: unit.parentIds }}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
