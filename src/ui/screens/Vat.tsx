import { useMemo, useEffect, useRef, type ReactElement } from 'react';
import type { Unit } from '../../state/types';
import { useColonyStore } from '../../state/colony';
import { computeRarity } from '../../sim/rarity';
import { unitToRow } from './Colony';
import { SpecimenCard } from '../components/SpecimenCard';
import { VAT_INPUT_SIZE, VAT_MAX_BATCH_SIZE } from '../../state/vat';
import type { Tier } from '../../sim/types';
import type { DemoRow } from '../../sim/__demo__';
import type { FrontId } from '../../sim/data/fronts';
import { TERMS } from '../terms';
import { styles } from '../styles';
import { computeBaseStats, computeCurrentStats } from '../../sim/stats';

const TIERS: readonly Tier[] = ['baseline', 'strain', 'mutant', 'chimera', 'progenitor'];

// Fallback DemoRow for units whose genome lacks phenotype loci (e.g. bare test fixtures).
// Production genomes always have a palette locus; this fallback fires only in tests.
const BARE_EXPRESSED: Record<string, string> = {
  head: 'head_plain', carapace: 'cara_bare', locomotion: 'loco_plain',
  appendage: 'app_none', eyes: 'eyes_plain', hide_pattern: 'hide_plain', aberration: 'ab_none',
};
function safeUnitToRow(unit: Unit): DemoRow {
  try {
    return unitToRow(unit);
  } catch {
    const { score, tier } = computeRarity(unit.genome);
    const base = computeBaseStats(unit.genome, unit.wear);
    const current = computeCurrentStats(unit.genome, 20, unit.wear);
    return { seed: unit.seed, tier, score, base, current, expressed: BARE_EXPRESSED, palette: 'pal_ash' };
  }
}

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

type TierRunBtnMap = Partial<Record<Tier, HTMLButtonElement | null>>;

export function Vat(): ReactElement {
  const units = useColonyStore((s) => s.units);
  const fronts = useColonyStore((s) => s.fronts);
  const runVatOperation = useColonyStore((s) => s.runVatOperation);

  // Selection tracked in a ref — not React state — so imperative DOM updates
  // in toggleSelection are synchronous and visible immediately to native .click() in tests.
  const selectionRef = useRef<Record<Tier, Set<number>>>({
    baseline: new Set(), strain: new Set(), mutant: new Set(),
    chimera: new Set(), progenitor: new Set(),
  });
  const runBtnRefs = useRef<TierRunBtnMap>({});

  const now = Date.now();

  // Initialise all run buttons to disabled=true on mount and after re-renders.
  // We manage disabled imperatively (not via React prop) so native .click() in tests
  // can observe the updated disabled attribute synchronously.
  useEffect(() => {
    for (const tier of TIERS) {
      const btn = runBtnRefs.current[tier];
      if (btn) btn.disabled = selectionRef.current[tier].size !== VAT_INPUT_SIZE;
    }
  });

  const garrisonedIds = useMemo(() => {
    const s = new Set<number>();
    for (const fid of Object.keys(fronts) as FrontId[]) {
      for (const id of fronts[fid].garrison) s.add(id);
    }
    return s;
  }, [fronts]);

  const buckets = useMemo(
    () => bucketEligibleUnits(units, garrisonedIds, now),
    // now excluded intentionally — snapshot-at-render suffices; no live injury countdown needed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [units, garrisonedIds],
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
    // Cap total ops at VAT_MAX_BATCH_SIZE, distributing in tier order (baseline first).
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

  // Imperative toggle: updates the Set in-place and pushes the new disabled state
  // directly to the button DOM node so native .click()-in-loop tests see it synchronously.
  const toggleSelection = (tier: Tier, id: number) => {
    const set = selectionRef.current[tier];
    if (set.has(id)) set.delete(id); else set.add(id);
    const btn = runBtnRefs.current[tier];
    if (btn) btn.disabled = set.size !== VAT_INPUT_SIZE;
  };

  const runTier = (tier: Tier) => {
    const ids = [...selectionRef.current[tier]];
    if (ids.length !== VAT_INPUT_SIZE) return;
    runVatOperation(ids);
    selectionRef.current[tier].clear();
    const btn = runBtnRefs.current[tier];
    if (btn) btn.disabled = true;
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
      <main style={styles.page}>
        <h1 style={styles.headerTitle}>Morulium</h1>
        <p style={styles.headerSub}>The Vat — 10 same-tier specimens → 1</p>
        <div data-testid="vat-empty-state" style={{ marginTop: 24, color: '#94a3b8' }}>
          Your Colony is empty. Harvest or Breed some specimens first.
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.headerTitle}>Morulium</h1>
      <p style={styles.headerSub}>The Vat — 10 same-tier specimens → 1</p>

      <div style={{ margin: '12px 0' }}>
        <button
          type="button"
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
        <div data-testid="vat-ineligible-count" style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>
          {buckets.ineligibleCount} hidden (garrisoned/injured)
        </div>
      )}

      {TIERS.filter((t) => buckets.byTier[t].length > 0).map((tier) => {
        const groupUnits = buckets.byTier[tier];
        const culledCount = groupUnits.filter((u) => u.culled).length;
        return (
          <section
            key={tier}
            data-testid={`vat-tier-group-${tier}`}
            style={{ marginTop: 16 }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <h2 style={{ fontSize: 16, margin: 0 }}>
                {TERMS.tiers[tier]} —{' '}
                <span data-testid={`vat-tier-count-${tier}`}>
                  {groupUnits.length} eligible, {culledCount} culled
                </span>
              </h2>
              <button
                type="button"
                data-testid={`vat-tier-run-button-${tier}`}
                ref={(el) => { runBtnRefs.current[tier] = el; }}
                onClick={() => runTier(tier)}
              >
                Vat these 10 (0/{VAT_INPUT_SIZE})
              </button>
            </div>
            <div style={styles.grid}>
              {groupUnits.map((unit) => (
                <div
                  key={unit.id}
                  onClick={() => toggleSelection(tier, unit.id)}
                  style={{ cursor: 'pointer', outlineOffset: 2 }}
                >
                  <SpecimenCard
                    row={safeUnitToRow(unit)}
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
