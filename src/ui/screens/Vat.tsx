import { useMemo, useState, type ReactElement } from 'react';
import type { Unit } from '../../state/types';
import { useColonyStore } from '../../state/colony';
import { computeRarity } from '../../sim/rarity';
import { unitToRow } from './Colony';
import { SpecimenCard } from '../components/SpecimenCard';
import { VAT_INPUT_SIZE, VAT_MAX_BATCH_SIZE } from '../../state/vat';
import type { Tier } from '../../sim/types';
import type { FrontId } from '../../sim/data/fronts';
import { TERMS } from '../terms';
import { styles, TIER_COLORS } from '../styles';
import { TOKENS } from '../tokens';
import { FirstVisitCallout } from '../components/FirstVisitCallout';

const TIERS: readonly Tier[] = ['baseline', 'strain', 'mutant', 'chimera', 'progenitor'];

interface EligibleBuckets {
  readonly byTier: Readonly<Record<Tier, readonly Unit[]>>;
  readonly ineligibleCount: number;
}

function bucketEligibleUnits(
  units: readonly Unit[],
  garrisonedIds: ReadonlySet<number>,
  now: number,
): EligibleBuckets {
  const byTier: Record<Tier, Unit[]> = {
    baseline: [], strain: [], mutant: [], chimera: [], progenitor: [],
  };
  let ineligible = 0;
  for (const u of units) {
    const injured = u.injuredUntil !== null && u.injuredUntil > now;
    const garrisoned = garrisonedIds.has(u.id);
    if (injured || garrisoned) { ineligible++; continue; }
    const { tier } = computeRarity(u.genome);
    byTier[tier].push(u);
  }
  return { byTier, ineligibleCount: ineligible };
}

export function Vat(): ReactElement {
  const units = useColonyStore((s) => s.units);
  const fronts = useColonyStore((s) => s.fronts);
  const runVatOperation = useColonyStore((s) => s.runVatOperation);

  const [selectionByTier, setSelectionByTier] = useState<Record<Tier, ReadonlySet<number>>>({
    baseline: new Set(), strain: new Set(), mutant: new Set(),
    chimera: new Set(), progenitor: new Set(),
  });

  const garrisonedIds = useMemo(() => {
    const s = new Set<number>();
    for (const fid of Object.keys(fronts) as FrontId[]) {
      for (const id of fronts[fid].garrison) s.add(id);
    }
    return s;
  }, [fronts]);

  // Snapshot injury eligibility at render time; no live countdown needed here.
  const now = useMemo(() => Date.now(), [units]);

  const buckets = useMemo(
    () => bucketEligibleUnits(units, garrisonedIds, now),
    [units, garrisonedIds, now],
  );

  const totalEligible = TIERS.reduce((n, t) => n + buckets.byTier[t].length, 0);

  const cullAllPlan = useMemo(() => {
    const perTier: { tier: Tier; ids: number[] }[] = [];
    for (const tier of TIERS) {
      const culledIds = buckets.byTier[tier].filter((u) => u.culled).map((u) => u.id);
      const fullBatches = Math.floor(culledIds.length / VAT_INPUT_SIZE);
      if (fullBatches > 0) {
        perTier.push({ tier, ids: culledIds.slice(0, fullBatches * VAT_INPUT_SIZE) });
      }
    }
    const rawOps = perTier.reduce((n, b) => n + b.ids.length / VAT_INPUT_SIZE, 0);
    if (rawOps <= VAT_MAX_BATCH_SIZE) {
      return { batches: perTier, totalOps: rawOps };
    }
    let opsRemaining = VAT_MAX_BATCH_SIZE;
    const capped: { tier: Tier; ids: number[] }[] = [];
    for (const { tier, ids } of perTier) {
      const opsHere = Math.min(ids.length / VAT_INPUT_SIZE, opsRemaining);
      if (opsHere > 0) capped.push({ tier, ids: ids.slice(0, opsHere * VAT_INPUT_SIZE) });
      opsRemaining -= opsHere;
      if (opsRemaining <= 0) break;
    }
    return { batches: capped, totalOps: VAT_MAX_BATCH_SIZE };
  }, [buckets]);

  const toggleSelection = (tier: Tier, id: number) => {
    setSelectionByTier((prev) => {
      const next = new Set(prev[tier]);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...prev, [tier]: next };
    });
  };

  const runTier = (tier: Tier) => {
    const ids = [...selectionByTier[tier]];
    if (ids.length !== VAT_INPUT_SIZE) return;
    runVatOperation(ids);
    setSelectionByTier((prev) => ({ ...prev, [tier]: new Set() }));
  };

  const onCullAll = () => {
    for (const { ids } of cullAllPlan.batches) {
      for (let i = 0; i < ids.length; i += VAT_INPUT_SIZE) {
        const chunk = ids.slice(i, i + VAT_INPUT_SIZE);
        runVatOperation(chunk);
      }
    }
  };

  if (totalEligible === 0 && buckets.ineligibleCount === 0) {
    return (
      <main style={styles.page} data-register="lab">
        <FirstVisitCallout surface="vat" title="The Vat" body="Fuse ten same-tier specimens into one, pristine." action="Select ten of one tier and run." />
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="a-vat-bubble" style={{
            position: 'absolute',
            top: 8, left: '30%',
            width: 6, height: 6,
            borderRadius: '50%',
            background: TOKENS.bioGreen,
            opacity: 0.06,
            filter: 'blur(1px)',
          }} />
          <div className="a-vat-bubble" style={{
            position: 'absolute',
            top: 4, left: '55%',
            width: 4, height: 4,
            borderRadius: '50%',
            background: TOKENS.bioGreen,
            opacity: 0.05,
            animationDelay: '1.4s',
            filter: 'blur(1px)',
          }} />
          <h1 className="text-stamp" style={styles.headerTitle} data-testid="vat-header">
            The Vat
          </h1>
        </div>
        <p style={styles.headerSub}>The Vat — 10 same-tier specimens → 1</p>
        <div data-testid="vat-empty-state" style={{ marginTop: 24, color: TOKENS.inkDim }}>
          Your Colony is empty. Harvest or Breed some specimens first.
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page} data-register="lab">
      <FirstVisitCallout surface="vat" title="The Vat" body="Fuse ten same-tier specimens into one, pristine." action="Select ten of one tier and run." />
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="a-vat-bubble" style={{
          position: 'absolute',
          top: 8, left: '30%',
          width: 6, height: 6,
          borderRadius: '50%',
          background: TOKENS.bioGreen,
          opacity: 0.06,
          filter: 'blur(1px)',
        }} />
        <div className="a-vat-bubble" style={{
          position: 'absolute',
          top: 4, left: '55%',
          width: 4, height: 4,
          borderRadius: '50%',
          background: TOKENS.bioGreen,
          opacity: 0.05,
          animationDelay: '1.4s',
          filter: 'blur(1px)',
        }} />
        <h1 className="text-stamp" style={styles.headerTitle} data-testid="vat-header">
          The Vat
        </h1>
      </div>
      <p style={styles.headerSub}>The Vat — 10 same-tier specimens → 1</p>

      <div style={{ margin: '12px 0' }}>
        <button
          type="button"
          className="btn btn--danger"
          data-testid="vat-cull-all-button"
          disabled={cullAllPlan.totalOps === 0}
          onClick={onCullAll}
        >
          {cullAllPlan.totalOps === 0
            ? 'Cull All (no batches ready)'
            : `Cull All (${cullAllPlan.totalOps} ops, ${cullAllPlan.totalOps * VAT_INPUT_SIZE} units)`}
        </button>
      </div>

      {buckets.ineligibleCount > 0 && (
        <div data-testid="vat-ineligible-count" style={{ color: TOKENS.inkDim, fontSize: 12, marginBottom: 8 }}>
          {buckets.ineligibleCount} hidden (garrisoned/injured)
        </div>
      )}

      {TIERS.filter((t) => buckets.byTier[t].length > 0).map((tier) => {
        const groupUnits = buckets.byTier[tier];
        const selection = selectionByTier[tier];
        const culledCount = groupUnits.filter((u) => u.culled).length;
        return (
          <section
            key={tier}
            data-testid={`vat-tier-group-${tier}`}
          >
            <div style={styles.tierSectionHeader(TIER_COLORS[tier])}>
              <h2 style={styles.tierSectionLabel(TIER_COLORS[tier])}>
                {TERMS.tiers[tier]}
              </h2>
              <span data-testid={`vat-tier-count-${tier}`} style={{ color: TOKENS.inkDim, fontFamily: TOKENS.fontMono, fontSize: 12 }}>
                {groupUnits.length} eligible, {culledCount} culled
              </span>
              <button
                type="button"
                className="btn btn--primary"
                data-testid={`vat-tier-run-button-${tier}`}
                disabled={selection.size !== VAT_INPUT_SIZE}
                onClick={() => runTier(tier)}
              >
                Vat these 10 ({selection.size}/{VAT_INPUT_SIZE})
              </button>
            </div>
            <div style={styles.grid}>
              {groupUnits.map((unit) => (
                <div
                  key={unit.id}
                  onClick={() => toggleSelection(tier, unit.id)}
                  className={selection.has(unit.id) ? 'a-bio-pulse' : undefined}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 8,
                  }}
                >
                  <SpecimenCard
                    row={unitToRow(unit)}
                    culled={unit.culled}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
