import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Unit } from './types';
import { STORAGE_KEY } from './persist';
import { rollGenome } from '../sim/genome';
import { createRng } from '../sim/rng';
import { computeRarity } from '../sim/rarity';
import {
  DAILY_HARVEST_LIMIT,
  todayLocalKey,
} from './harvest';
import {
  DROUGHT_THRESHOLD,
  FAILSAFE_MIN_TIER,
  FAILSAFE_SUBSTREAM_PRIME,
  rollGenomeAtLeast,
  tierAtLeast,
} from './failsafe';
import {
  DAILY_BREED_LIMIT,
  BREED_SUBSTREAM_PRIME,
} from './breed';
import { breedGenome, MUTATION_RATE } from '../sim/breed';
import { nextWear } from '../sim/wear';
import type { FrontId } from '../sim/data/fronts';
import { FRONTS } from '../sim/data/fronts';
import { TEAM_SIZE, resolveIncursion } from '../sim/incursion';
import type { IncursionResolution } from '../sim/incursion';
import { FRESH_FRONTS, FRONT_COOLDOWN_MS } from './incursion';
import type { FrontState } from './incursion';
import { SERUM_STARTING_BALANCE, SERUM_DAILY_FAUCET, BREED_COST_SERUM } from './serum';
import {
  REST_MAX,
  REST_DEPLOY_COST,
  UNDER_RESTED_THRESHOLD,
  UNDER_RESTED_PENALTY,
  INJURY_DURATION_MS,
  INJURY_SUBSTREAM_PRIME,
  STIM_COST_SERUM,
} from './rest';
import { rollInjuries } from '../sim/injury';
import {
  GARRISON_TARGET,
  GARRISON_MIN,
  GARRISON_INCOME_PER_UNIT_PER_HOUR,
  GARRISON_GRACE_MS,
  FLARE_COOLDOWN_MS,
  computeGarrisonIncome,
  computeHardeningFor,
} from './occupation';
import { DEFAULT_UNLOCKS, LOCKED_STARTING, UNLOCK_REASONS, type SurfaceId, type UnlocksMap } from './unlocks';
import { SEEN_INITIAL, type SeenMap } from './seen';
import { summarize, isSignificant, type StoreSnapshot } from './session';
import type { AwaySummary } from './session';
import { VAT_INPUT_SIZE } from './vat';
import { resolveVatOperation } from '../sim/vat';
import { STARTER_FREE_DECANTS } from './bootstrap';
import {
  COLONY_CAP_BASE,
  COLONY_CAP_BARRACKS,
  BARRACKS_COST_SERUM,
  MEDBAY_COST_SERUM,
  REST_REGEN_PER_HOUR,
  INJURY_DURATION_MEDBAY_MS,
} from './vivarium';
import type { DirectiveId, DirectiveAction } from './directives';
import { STANDING, nextInChain, completesFrom, directiveById } from './directives';

interface ColonyStore {
  readonly units: Unit[];
  readonly nextId: number;
  readonly lastDecantedId: number | null;
  readonly harvestsToday: number;
  readonly harvestDayKey: string;
  readonly droughtCount: number;
  readonly breedsToday: number;
  readonly breedDayKey: string;
  readonly fronts: Readonly<Record<FrontId, FrontState>>;
  readonly activeIncursion: IncursionResolution | null;
  readonly lastIncursionResolution: IncursionResolution | null;
  clearLastIncursionResolution: () => void;
  readonly serum: number;
  readonly stims: number;
  readonly lastGarrisonTickAt: number;   // NEW
  readonly buildings: {
    readonly barracks: boolean;
    readonly medbay: boolean;
  };
  readonly lastRestTickAt: number;
  readonly unlocks: UnlocksMap;
  readonly pendingAwaySummary: AwaySummary | null;
  readonly freeDecantsRemaining: number;
  readonly firstRunComplete: boolean;
  markFirstRunComplete: () => void;
  readonly activeDirectiveId: DirectiveId | null;
  readonly completedDirectiveIds: readonly DirectiveId[];
  readonly recentReward: { readonly directiveId: DirectiveId; readonly serum: number } | null;
  emitDirectiveAction: (action: DirectiveAction) => void;
  clearRecentReward: () => void;
  readonly recentUnlock: { readonly id: SurfaceId; readonly reason: string } | null;
  unlockSurface: (id: SurfaceId) => void;
  clearRecentUnlock: () => void;
  readonly seenSurfaces: SeenMap;
  markSeen: (id: SurfaceId) => void;
  readonly recentActionMessage: string | null;
  emitActionMessage: (msg: string) => void;
  clearActionMessage: () => void;

  decant: () => Unit;
  breed: (parentAId: number, parentBId: number) => Unit;
  launchIncursion: (
    frontId: FrontId,
    teamIds: readonly [number, number, number, number],
    stimAppliedIds?: readonly number[],
  ) => IncursionResolution;
  dismissIncursion: () => void;
  buyStim: () => void;
  assignToGarrison: (frontId: FrontId, unitId: number) => void;
  removeFromGarrison: (frontId: FrontId, unitId: number) => void;
  clearHighlight: () => void;
  resetGame: () => void;
  clearAwaySummary: () => void;
  runVatOperation: (donorIds: readonly number[]) => Unit;
  toggleCulled: (unitId: number) => void;
  buildBarracks: () => void;
  buildMedbay: () => void;
}

function applyGarrisonTick(state: ColonyStore, now: number): Partial<ColonyStore> {
  const garrisonedCount = (Object.keys(state.fronts) as FrontId[])
    .reduce((n, fid) => n + state.fronts[fid].garrison.length, 0);

  if (garrisonedCount === 0) return { lastGarrisonTickAt: now };

  const incomeEarned = computeGarrisonIncome(garrisonedCount, state.lastGarrisonTickAt, now);
  if (incomeEarned === 0) return {};   // fractional interval — leave lastTickAt alone

  const wholeHoursCredited = incomeEarned / (garrisonedCount * GARRISON_INCOME_PER_UNIT_PER_HOUR);
  const msCredited = wholeHoursCredited * (60 * 60 * 1000);
  return {
    serum: state.serum + incomeEarned,
    lastGarrisonTickAt: state.lastGarrisonTickAt + msCredited,
  };
}

function checkFlareTimers(state: ColonyStore, now: number): Partial<ColonyStore> {
  const nextFronts = { ...state.fronts } as Record<FrontId, FrontState>;
  let anyUncaptured = false;
  for (const fid of Object.keys(nextFronts) as FrontId[]) {
    const front = nextFronts[fid];
    if (!front.captured) continue;
    if (front.flareStartedAt === null) continue;
    if (front.flareStartedAt + GARRISON_GRACE_MS > now) continue;
    // Front un-captures
    nextFronts[fid] = {
      ...front,
      captured: false,
      cooldownUntil: now + FLARE_COOLDOWN_MS,
      garrison: [],
      flareStartedAt: null,
      // hardening will be recomputed below
    };
    anyUncaptured = true;
  }
  if (!anyUncaptured) return {};
  // Recompute hardening on ALL fronts after cascading un-captures
  for (const fid of Object.keys(nextFronts) as FrontId[]) {
    nextFronts[fid] = { ...nextFronts[fid], hardening: computeHardeningFor(fid, nextFronts) };
  }
  return { fronts: nextFronts };
}

function applyRestTick(state: ColonyStore, now: number): Partial<ColonyStore> {
  if (!state.buildings.barracks) return { lastRestTickAt: now };

  const elapsedMs = now - state.lastRestTickAt;
  const hourMs = 60 * 60 * 1000;
  const wholeHours = Math.floor(elapsedMs / hourMs);
  if (wholeHours <= 0) return {};   // fractional interval — retain remainder

  const garrisonedIds = new Set(
    (Object.keys(state.fronts) as FrontId[]).flatMap((fid) => state.fronts[fid].garrison),
  );
  const restGain = wholeHours * REST_REGEN_PER_HOUR;

  const newUnits = state.units.map((u) => {
    const injured = u.injuredUntil !== null && u.injuredUntil > now;
    const garrisoned = garrisonedIds.has(u.id);
    if (injured || garrisoned) return u;
    if (u.restCurrent >= REST_MAX) return u;
    return { ...u, restCurrent: Math.min(REST_MAX, u.restCurrent + restGain) };
  });

  return {
    units: newUnits,
    lastRestTickAt: state.lastRestTickAt + wholeHours * hourMs,
  };
}

const INITIAL_STATE = {
  units: [] as Unit[],
  nextId: 1,
  lastDecantedId: null as number | null,
  harvestsToday: 0,
  harvestDayKey: todayLocalKey(),
  droughtCount: 0,
  breedsToday: 0,
  breedDayKey: todayLocalKey(),
  fronts: FRESH_FRONTS,
  activeIncursion: null as IncursionResolution | null,
  lastIncursionResolution: null as IncursionResolution | null,
  serum: SERUM_STARTING_BALANCE,
  stims: 0,
  lastGarrisonTickAt: Date.now(),
  buildings: { barracks: false, medbay: false },
  lastRestTickAt: Date.now(),
  unlocks: LOCKED_STARTING,
  pendingAwaySummary: null as AwaySummary | null,
  freeDecantsRemaining: STARTER_FREE_DECANTS,
  firstRunComplete: false,
  activeDirectiveId: 'decant-first' as DirectiveId,
  completedDirectiveIds: [] as readonly DirectiveId[],
  recentReward: null as { readonly directiveId: DirectiveId; readonly serum: number } | null,
  recentUnlock: null as { readonly id: SurfaceId; readonly reason: string } | null,
  seenSurfaces: SEEN_INITIAL,
  recentActionMessage: null as string | null,
};

export const useColonyStore = create<ColonyStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      decant: () => {
        const state = get();
        const now = Date.now();
        const flareDelta = checkFlareTimers(state, now);
        const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
        const restDelta = applyRestTick({ ...state, ...flareDelta, ...tickDelta }, now);
        const s = { ...state, ...flareDelta, ...tickDelta, ...restDelta };

        if (s.units.length >= capOf(s)) {
          throw new Error('Colony full — Cull or Vat first');
        }

        // Free-Decant path: consume before hitting the daily limiter or failsafe machinery.
        if (s.freeDecantsRemaining > 0) {
          const seed = s.nextId;
          const rng = createRng(seed);
          const genome = rollGenome(rng);
          const newUnit: Unit = {
            id: s.nextId,
            seed,
            decantedAt: now,
            genome,
            generation: 0,
            parentIds: null,
            wear: {},
            restCurrent: REST_MAX,
            injuredUntil: null,
            culled: false,
          };
          set({
            ...flareDelta, ...tickDelta, ...restDelta,
            units: [...s.units, newUnit],
            nextId: s.nextId + 1,
            lastDecantedId: newUnit.id,
            freeDecantsRemaining: s.freeDecantsRemaining - 1,
          });
          get().emitDirectiveAction({ kind: 'decant' });
          get().emitDirectiveAction({ kind: 'unit-count-changed', count: get().units.length });
          get().emitDirectiveAction({ kind: 'tier-reached', tier: computeRarity(newUnit.genome).tier });
          get().emitActionMessage(`Decanted #${newUnit.id}.`);
          return newUnit;
        }

        const today = todayLocalKey();
        const dayRolledOver = s.harvestDayKey !== today;

        const harvestsUsedToday = dayRolledOver ? 0 : s.harvestsToday;
        if (harvestsUsedToday >= DAILY_HARVEST_LIMIT) {
          throw new Error('daily Harvest limit reached');
        }

        const id = s.nextId;
        const genome = s.droughtCount >= DROUGHT_THRESHOLD
          ? rollGenomeAtLeast(id * FAILSAFE_SUBSTREAM_PRIME, FAILSAFE_MIN_TIER)
          : rollGenome(createRng(id));
        const { tier } = computeRarity(genome);
        const newDrought = tierAtLeast(tier, 'chimera') ? 0 : s.droughtCount + 1;

        const unit: Unit = {
          id, seed: id, decantedAt: now, genome,
          generation: 0, parentIds: null, wear: {},
          restCurrent: REST_MAX, injuredUntil: null,
          culled: false,
        };

        // On day-rollover: refresh rest on all EXISTING units (injuredUntil is
        // NOT reset — injuries expire on their own timer).
        const refreshedUnits = dayRolledOver
          ? s.units.map((u) => ({ ...u, restCurrent: REST_MAX }))
          : s.units;

        set({
          ...flareDelta,
          ...tickDelta,
          ...restDelta,
          units: [...refreshedUnits, unit],
          nextId: id + 1,
          lastDecantedId: id,
          harvestsToday: harvestsUsedToday + 1,
          harvestDayKey: today,
          droughtCount: newDrought,
          ...(dayRolledOver ? { serum: s.serum + SERUM_DAILY_FAUCET } : {}),
        });
        get().emitDirectiveAction({ kind: 'decant' });
        get().emitDirectiveAction({ kind: 'unit-count-changed', count: get().units.length });
        get().emitDirectiveAction({ kind: 'tier-reached', tier: computeRarity(unit.genome).tier });
        get().emitActionMessage(`Decanted #${unit.id}.`);
        return unit;
      },

      breed: (parentAId, parentBId) => {
        if (parentAId === parentBId) {
          throw new Error('breed: cannot breed a specimen with itself');
        }
        const state = get();
        const now = Date.now();
        const flareDelta = checkFlareTimers(state, now);
        const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
        const restDelta = applyRestTick({ ...state, ...flareDelta, ...tickDelta }, now);
        const s = { ...state, ...flareDelta, ...tickDelta, ...restDelta };

        if (s.units.length >= capOf(s)) {
          throw new Error('Colony full — Cull or Vat first');
        }

        const pA = s.units.find((u) => u.id === parentAId);
        const pB = s.units.find((u) => u.id === parentBId);
        if (!pA) throw new Error(`breed: parent ${parentAId} not found`);
        if (!pB) throw new Error(`breed: parent ${parentBId} not found`);
        const today = todayLocalKey();
        const breedsUsedToday = s.breedDayKey === today ? s.breedsToday : 0;
        if (breedsUsedToday >= DAILY_BREED_LIMIT) {
          throw new Error('daily Breed limit reached');
        }
        if (s.serum < BREED_COST_SERUM) {
          throw new Error('breed: insufficient Serum');
        }

        const childId = s.nextId;
        const rng = createRng(childId * BREED_SUBSTREAM_PRIME);
        const { genome, mutatedLoci } = breedGenome(pA.genome, pB.genome, rng, MUTATION_RATE);
        const wear = nextWear(pA, pB, mutatedLoci);
        const generation = Math.max(pA.generation, pB.generation) + 1;

        const child: Unit = {
          id: childId,
          seed: childId,
          decantedAt: now,
          genome,
          generation,
          parentIds: [parentAId, parentBId] as const,
          wear,
          restCurrent: REST_MAX,
          injuredUntil: null,
          culled: false,
        };

        set({
          ...flareDelta,
          ...tickDelta,
          ...restDelta,
          units: [...s.units, child],
          nextId: childId + 1,
          lastDecantedId: childId,
          breedsToday: breedsUsedToday + 1,
          breedDayKey: today,
          serum: s.serum - BREED_COST_SERUM,
        });
        get().emitDirectiveAction({ kind: 'breed' });
        get().emitDirectiveAction({ kind: 'unit-count-changed', count: get().units.length });
        get().emitDirectiveAction({ kind: 'tier-reached', tier: computeRarity(child.genome).tier });
        get().emitActionMessage(`Bred #${child.id} from #${parentAId} × #${parentBId}.`);
        return child;
      },

      launchIncursion: (frontId, teamIds, stimAppliedIds = []) => {
        const state = get();
        const now = Date.now();
        const flareDelta = checkFlareTimers(state, now);
        const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
        const restDelta = applyRestTick({ ...state, ...flareDelta, ...tickDelta }, now);
        const s = { ...state, ...flareDelta, ...tickDelta, ...restDelta };

        const frontState = s.fronts[frontId];
        if (!frontState) throw new Error(`launchIncursion: unknown front ${frontId}`);
        if (frontState.captured) throw new Error(`launchIncursion: front ${frontId} already captured`);
        if (frontState.cooldownUntil !== null && frontState.cooldownUntil > now) {
          throw new Error(`launchIncursion: front ${frontId} on cooldown`);
        }
        if (teamIds.length !== TEAM_SIZE) {
          throw new Error(`launchIncursion: team must have exactly ${TEAM_SIZE} members`);
        }
        const unique = new Set(teamIds);
        if (unique.size !== TEAM_SIZE) {
          throw new Error('launchIncursion: team ids must be distinct');
        }
        const team: Unit[] = [];
        for (const id of teamIds) {
          const u = s.units.find((u) => u.id === id);
          if (!u) throw new Error(`launchIncursion: unit ${id} not found`);
          team.push(u);
        }

        const injuredMembers = team.filter((u) => u.injuredUntil !== null && u.injuredUntil > now);
        if (injuredMembers.length > 0) {
          throw new Error(`launchIncursion: units injured: ${injuredMembers.map((u) => u.id).join(', ')}`);
        }

        for (const id of stimAppliedIds) {
          if (!teamIds.includes(id)) {
            throw new Error(`launchIncursion: cannot apply Stim to non-team unit ${id}`);
          }
        }
        if (s.stims < stimAppliedIds.length) {
          throw new Error(`launchIncursion: need ${stimAppliedIds.length} Stim(s), have ${s.stims}`);
        }

        // NEW: reject garrisoned team members
        const garrisonedIds = new Set(
          (Object.keys(s.fronts) as FrontId[]).flatMap((fid) => s.fronts[fid].garrison),
        );
        const garrisonedPicks = teamIds.filter((id) => garrisonedIds.has(id));
        if (garrisonedPicks.length > 0) {
          throw new Error(`launchIncursion: units garrisoned: ${garrisonedPicks.join(', ')}`);
        }

        // Compute restPenalties: under-rested (< threshold) AND not Stimmed
        const restPenalties: Record<number, number> = {};
        for (const u of team) {
          const isUnderRested = u.restCurrent < UNDER_RESTED_THRESHOLD;
          const isStimmed = stimAppliedIds.includes(u.id);
          if (isUnderRested && !isStimmed) {
            restPenalties[u.id] = UNDER_RESTED_PENALTY;
          }
        }

        // Roll injuries for at-risk units (deterministic given nextId + sorted team)
        const childSeed = s.nextId;
        const injuryRolls = rollInjuries(restPenalties, childSeed * INJURY_SUBSTREAM_PRIME);

        // NEW: compute hardening for this front
        const hardening = computeHardeningFor(frontId, s.fronts);
        const resolution = resolveIncursion(team, FRONTS[frontId], restPenalties, hardening);

        // Deduct rest + apply injuries + deduct stims in ONE atomic set()
        const injuryDuration = s.buildings.medbay ? INJURY_DURATION_MEDBAY_MS : INJURY_DURATION_MS;
        const teamIdSet = new Set(teamIds);
        const newUnits = s.units.map((u) => {
          if (!teamIdSet.has(u.id)) return u;
          const gotInjured = injuryRolls[u.id] === true;
          return {
            ...u,
            restCurrent: Math.max(0, u.restCurrent - REST_DEPLOY_COST),
            injuredUntil: gotInjured ? now + injuryDuration : u.injuredUntil,
          };
        });

        set({
          ...flareDelta,
          ...tickDelta,
          ...restDelta,
          activeIncursion: resolution,
          units: newUnits,
          stims: s.stims - stimAppliedIds.length,
        });
        get().emitDirectiveAction({ kind: 'incursion-launched' });

        return resolution;
      },

      buyStim: () => {
        const state = get();
        const now = Date.now();
        const flareDelta = checkFlareTimers(state, now);
        const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
        const restDelta = applyRestTick({ ...state, ...flareDelta, ...tickDelta }, now);
        const s = { ...state, ...flareDelta, ...tickDelta, ...restDelta };

        if (s.serum < STIM_COST_SERUM) {
          throw new Error('buyStim: insufficient Serum');
        }
        set({
          ...flareDelta,
          ...tickDelta,
          ...restDelta,
          serum: s.serum - STIM_COST_SERUM,
          stims: s.stims + 1,
        });
      },

      assignToGarrison: (frontId, unitId) => {
        const state = get();
        const now = Date.now();
        const flareDelta = checkFlareTimers(state, now);
        const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
        const restDelta = applyRestTick({ ...state, ...flareDelta, ...tickDelta }, now);
        const s = { ...state, ...flareDelta, ...tickDelta, ...restDelta };

        const front = s.fronts[frontId];
        if (!front.captured) {
          throw new Error(`assignToGarrison: front ${frontId} is not captured`);
        }
        if (front.garrison.length >= GARRISON_TARGET) {
          throw new Error(`assignToGarrison: front ${frontId} at target size`);
        }
        if (front.garrison.includes(unitId)) {
          throw new Error(`assignToGarrison: unit ${unitId} already garrisoned here`);
        }
        for (const fid of Object.keys(s.fronts) as FrontId[]) {
          if (s.fronts[fid].garrison.includes(unitId)) {
            throw new Error(`assignToGarrison: unit ${unitId} already garrisoned at ${fid}`);
          }
        }
        const unit = s.units.find((u) => u.id === unitId);
        if (!unit) {
          throw new Error(`assignToGarrison: unit ${unitId} not found`);
        }

        const newGarrison = [...front.garrison, unitId];
        const newFrontState: FrontState = {
          ...front,
          garrison: newGarrison,
          flareStartedAt: newGarrison.length >= GARRISON_MIN ? null : front.flareStartedAt,
        };
        set({
          ...flareDelta,
          ...tickDelta,
          ...restDelta,
          fronts: { ...s.fronts, [frontId]: newFrontState },
        });
        get().emitDirectiveAction({ kind: 'garrison-assigned' });
        if (newFrontState.captured && newFrontState.garrison.length >= GARRISON_TARGET) {
          get().emitDirectiveAction({ kind: 'front-captured' });
        }
        get().emitActionMessage(`Garrisoned #${unitId} on ${FRONTS[frontId].label}.`);
      },

      removeFromGarrison: (frontId, unitId) => {
        const state = get();
        const now = Date.now();
        const flareDelta = checkFlareTimers(state, now);
        const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
        const restDelta = applyRestTick({ ...state, ...flareDelta, ...tickDelta }, now);
        const s = { ...state, ...flareDelta, ...tickDelta, ...restDelta };

        const front = s.fronts[frontId];
        if (!front.garrison.includes(unitId)) {
          throw new Error(`removeFromGarrison: unit ${unitId} not in front ${frontId} garrison`);
        }

        const newGarrison = front.garrison.filter((id) => id !== unitId);
        const newFrontState: FrontState = {
          ...front,
          garrison: newGarrison,
          flareStartedAt: (newGarrison.length < GARRISON_MIN && front.flareStartedAt === null)
            ? now
            : front.flareStartedAt,
        };
        set({
          ...flareDelta,
          ...tickDelta,
          ...restDelta,
          fronts: { ...s.fronts, [frontId]: newFrontState },
        });
      },

      runVatOperation: (donorIds) => {
        const state = get();
        const now = Date.now();
        const flareDelta = checkFlareTimers(state, now);
        const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
        const restDelta = applyRestTick({ ...state, ...flareDelta, ...tickDelta }, now);
        const s = { ...state, ...flareDelta, ...tickDelta, ...restDelta };

        // Guard: batch size
        if (donorIds.length !== VAT_INPUT_SIZE) {
          throw new Error(`runVatOperation: exactly ${VAT_INPUT_SIZE} donors required, got ${donorIds.length}`);
        }
        // Guard: distinct ids
        const uniqueDonors = new Set(donorIds);
        if (uniqueDonors.size !== VAT_INPUT_SIZE) {
          throw new Error('runVatOperation: donor ids must be distinct');
        }
        // Look up donors + validate existence
        const donors: Unit[] = [];
        for (const id of donorIds) {
          const u = s.units.find((u) => u.id === id);
          if (!u) throw new Error(`runVatOperation: donor ${id} not found`);
          donors.push(u);
        }
        // Guard: injured
        for (const u of donors) {
          if (u.injuredUntil !== null && u.injuredUntil > now) {
            throw new Error(`runVatOperation: donor ${u.id} is injured`);
          }
        }
        // Guard: garrisoned
        const garrisonedIds = new Set(
          (Object.keys(s.fronts) as FrontId[]).flatMap((fid) => s.fronts[fid].garrison),
        );
        for (const u of donors) {
          if (garrisonedIds.has(u.id)) {
            throw new Error(`runVatOperation: donor ${u.id} is garrisoned`);
          }
        }
        // Guard: same tier
        const tiers = donors.map((u) => computeRarity(u.genome).tier);
        const inputTier = tiers[0]!;
        if (!tiers.every((t) => t === inputTier)) {
          const uniq = [...new Set(tiers)].join(', ');
          throw new Error(`runVatOperation: donors must share the same tier (got ${uniq})`);
        }

        // Compute resolution
        const outputId = s.nextId;
        const donorTuple = donorIds as readonly [number, number, number, number, number, number, number, number, number, number];
        const resolution = resolveVatOperation(donorTuple, outputId, inputTier);

        // Assemble pristine output
        const output: Unit = {
          id: outputId,
          seed: outputId,
          decantedAt: now,
          genome: resolution.outputGenome,
          generation: 0,
          parentIds: null,
          wear: {},
          restCurrent: REST_MAX,
          injuredUntil: null,
          culled: false,
        };

        // Remove donors + append output atomically
        const donorIdSet = new Set(donorIds);
        const newUnits = s.units.filter((u) => !donorIdSet.has(u.id));
        newUnits.push(output);

        if (newUnits.length > capOf(s)) {
          throw new Error(`runVatOperation: cap exceeded (${newUnits.length} > ${capOf(s)})`);
        }

        set({
          ...flareDelta,
          ...tickDelta,
          ...restDelta,
          units: newUnits,
          nextId: outputId + 1,
          lastDecantedId: outputId,
        });
        get().emitActionMessage(`Vat run complete — #${output.id} produced.`);

        return output;
      },

      toggleCulled: (unitId) => {
        const state = get();
        const now = Date.now();
        const flareDelta = checkFlareTimers(state, now);
        const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
        const restDelta = applyRestTick({ ...state, ...flareDelta, ...tickDelta }, now);
        const s = { ...state, ...flareDelta, ...tickDelta, ...restDelta };

        const unit = s.units.find((u) => u.id === unitId);
        if (!unit) throw new Error(`toggleCulled: unit ${unitId} not found`);

        set({
          ...flareDelta,
          ...tickDelta,
          ...restDelta,
          units: s.units.map((u) => (u.id === unitId ? { ...u, culled: !u.culled } : u)),
        });
      },

      buildBarracks: () => {
        const state = get();
        const now = Date.now();
        const flareDelta = checkFlareTimers(state, now);
        const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
        const restDelta = applyRestTick({ ...state, ...flareDelta, ...tickDelta }, now);
        const s = { ...state, ...flareDelta, ...tickDelta, ...restDelta };

        if (s.buildings.barracks) {
          throw new Error('buildBarracks: already built');
        }
        if (s.serum < BARRACKS_COST_SERUM) {
          throw new Error('buildBarracks: insufficient Serum');
        }
        set({
          ...flareDelta,
          ...tickDelta,
          ...restDelta,
          serum: s.serum - BARRACKS_COST_SERUM,
          buildings: { ...s.buildings, barracks: true },
        });
        get().emitActionMessage(`Barracks built — cap raised.`);
      },

      buildMedbay: () => {
        const state = get();
        const now = Date.now();
        const flareDelta = checkFlareTimers(state, now);
        const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
        const restDelta = applyRestTick({ ...state, ...flareDelta, ...tickDelta }, now);
        const s = { ...state, ...flareDelta, ...tickDelta, ...restDelta };

        if (s.buildings.medbay) {
          throw new Error('buildMedbay: already built');
        }
        if (s.serum < MEDBAY_COST_SERUM) {
          throw new Error('buildMedbay: insufficient Serum');
        }
        set({
          ...flareDelta,
          ...tickDelta,
          ...restDelta,
          serum: s.serum - MEDBAY_COST_SERUM,
          buildings: { ...s.buildings, medbay: true },
        });
        get().emitActionMessage(`Medbay built.`);
      },

      dismissIncursion: () => {
        const state = get();
        const r = state.activeIncursion;
        if (r === null) return;
        const now = Date.now();
        const flareDelta = checkFlareTimers(state, now);
        const tickDelta = applyGarrisonTick({ ...state, ...flareDelta }, now);
        const restDelta = applyRestTick({ ...state, ...flareDelta, ...tickDelta }, now);
        const s = { ...state, ...flareDelta, ...tickDelta, ...restDelta };

        const target: FrontState = { ...s.fronts[r.frontId] };
        const nextFronts = { ...s.fronts } as Record<FrontId, FrontState>;
        if (r.outcome === 'won') {
          nextFronts[r.frontId] = { ...target, captured: true, cooldownUntil: null };
        } else {
          nextFronts[r.frontId] = { ...target, cooldownUntil: now + FRONT_COOLDOWN_MS };
        }
        // NEW: recompute hardening on ALL fronts (captures/failures cascade)
        for (const fid of Object.keys(nextFronts) as FrontId[]) {
          nextFronts[fid] = { ...nextFronts[fid], hardening: computeHardeningFor(fid, nextFronts) };
        }
        set({ ...flareDelta, ...tickDelta, ...restDelta, fronts: nextFronts, activeIncursion: null, lastIncursionResolution: r });
        if (r) get().emitDirectiveAction({ kind: 'incursion-resolved', outcome: r.outcome === 'won' ? 'won' : 'lost', rewardCollected: true });
      },

      emitDirectiveAction: (action) => {
        const s = get();
        if (s.activeDirectiveId === null) return;
        if (!completesFrom(s.activeDirectiveId, action)) return;

        const d = directiveById(s.activeDirectiveId);
        const completed = [...s.completedDirectiveIds, s.activeDirectiveId];

        let nextId: DirectiveId | null = nextInChain(s.activeDirectiveId);
        if (nextId === null) {
          nextId = STANDING.find((sd) => !completed.includes(sd.id))?.id ?? null;
        }

        set({
          serum: s.serum + d.rewardSerum,
          activeDirectiveId: nextId,
          completedDirectiveIds: completed,
          recentReward: { directiveId: d.id, serum: d.rewardSerum },
        });

        // Unlock cascades keyed to directive completions.
        if (d.id === 'collect-first-reward') {
          // Deferred: call inside a queueMicrotask so it runs after the set() above commits.
          queueMicrotask(() => get().unlockSurface('vat'));
        }
      },
      clearLastIncursionResolution: () => set({ lastIncursionResolution: null }),
      clearRecentReward: () => set({ recentReward: null }),

      emitActionMessage: (msg) => set({ recentActionMessage: msg }),
      clearActionMessage: () => set({ recentActionMessage: null }),

      unlockSurface: (id) => {
        const s = get();
        if (s.unlocks[id].status === 'unlocked') return;
        set({
          unlocks: { ...s.unlocks, [id]: { status: 'unlocked' } },
          recentUnlock: { id, reason: UNLOCK_REASONS[id] },
        });
      },
      clearRecentUnlock: () => set({ recentUnlock: null }),

      markSeen: (id) => {
        const s = get();
        if (s.seenSurfaces[id]) return;
        set({ seenSurfaces: { ...s.seenSurfaces, [id]: true } });
      },

      clearHighlight: () => set({ lastDecantedId: null }),

      resetGame: () => {
        set({ ...INITIAL_STATE, lastGarrisonTickAt: Date.now(), lastRestTickAt: Date.now() });
      },

      clearAwaySummary: () => set({ pendingAwaySummary: null }),

      markFirstRunComplete: () => set({ firstRunComplete: true }),
    }),
    {
      name: STORAGE_KEY,
      version: 13,
      migrate: (state, from) => {
        let s = state as ColonyStore;
        if (from < 2) {
          const v1 = s as Partial<ColonyStore> & { units: Unit[]; nextId: number };
          s = {
            ...v1,
            harvestsToday: 0,
            harvestDayKey: todayLocalKey(),
            droughtCount: 0,
          } as ColonyStore;
        }
        if (from < 3) {
          type LegacyUnit = Omit<Unit, 'generation' | 'parentIds' | 'wear' | 'restCurrent' | 'injuredUntil'> & {
            generation?: number;
            parentIds?: readonly [number, number] | null;
            wear?: Readonly<Record<string, number>>;
            restCurrent?: number;
            injuredUntil?: number | null;
          };
          const v2 = s as ColonyStore & { units: LegacyUnit[] };
          s = {
            ...v2,
            breedsToday: 0,
            breedDayKey: todayLocalKey(),
            units: v2.units.map((u) => ({
              id: u.id,
              seed: u.seed,
              decantedAt: u.decantedAt,
              genome: u.genome,
              generation: u.generation ?? 0,
              parentIds: u.parentIds ?? null,
              wear: u.wear ?? {},
              restCurrent: u.restCurrent ?? REST_MAX,
              injuredUntil: u.injuredUntil ?? null,
              culled: false,
            })),
          };
        }
        if (from < 4) {
          s = { ...s, fronts: FRESH_FRONTS };
        }
        if (from < 5) {
          s = { ...s, serum: SERUM_STARTING_BALANCE };
        }
        if (from < 6) {
          s = {
            ...s,
            stims: 0,
            units: s.units.map((u) => ({
              ...u,
              restCurrent: (u as Partial<Unit>).restCurrent ?? REST_MAX,
              injuredUntil: (u as Partial<Unit>).injuredUntil ?? null,
            })),
          };
        }
        if (from < 7) {
          // NEW: backfill 3 FrontState fields + add lastGarrisonTickAt
          const legacyFronts = s.fronts as Record<FrontId, Partial<FrontState> & { captured: boolean; cooldownUntil: number | null }>;
          const nextFronts = { ...legacyFronts } as Record<FrontId, FrontState>;
          for (const fid of Object.keys(nextFronts) as FrontId[]) {
            nextFronts[fid] = {
              ...nextFronts[fid],
              garrison: nextFronts[fid].garrison ?? [],
              flareStartedAt: nextFronts[fid].flareStartedAt ?? null,
              hardening: nextFronts[fid].hardening ?? 0,
            };
          }
          s = { ...s, fronts: nextFronts, lastGarrisonTickAt: Date.now() };
        }
        if (from < 8) {
          s = {
            ...s,
            units: s.units.map((u) => ({
              ...u,
              culled: (u as Partial<Unit>).culled ?? false,
            })),
          };
        }
        if (from < 9) {
          s = {
            ...s,
            buildings: (s as Partial<ColonyStore>).buildings ?? { barracks: false, medbay: false },
            lastRestTickAt: (s as Partial<ColonyStore>).lastRestTickAt ?? Date.now(),
          };
        }
        if (from < 10) {
          s = { ...s, unlocks: (s as Partial<ColonyStore>).unlocks ?? DEFAULT_UNLOCKS };
        }
        if (from < 11) {
          s = {
            ...s,
            freeDecantsRemaining: (s as Partial<ColonyStore>).freeDecantsRemaining ?? STARTER_FREE_DECANTS,
            firstRunComplete: (s as Partial<ColonyStore>).firstRunComplete ?? true,   // existing saves = already played
          };
        }
        if (from < 12) {
          const partial = s as Partial<ColonyStore>;
          s = {
            ...s,
            activeDirectiveId: partial.activeDirectiveId ?? null,       // existing saves = no chain
            completedDirectiveIds: partial.completedDirectiveIds ?? [],
          };
        }
        if (from < 13) {
          s = { ...s, seenSurfaces: (s as Partial<ColonyStore>).seenSurfaces ?? SEEN_INITIAL };
        }
        return s;
      },
      onRehydrateStorage: () => (rehydrated) => {
        if (!rehydrated) return;
        const now = Date.now();
        const snapshotPre: StoreSnapshot = {
          serum: rehydrated.serum,
          units: rehydrated.units.map((u) => ({ id: u.id, restCurrent: u.restCurrent, injuredUntil: u.injuredUntil })),
        };
        const prevNow = rehydrated.lastGarrisonTickAt;
        const flareDelta   = checkFlareTimers(rehydrated as ColonyStore, now);
        const withFlare    = { ...rehydrated, ...flareDelta } as ColonyStore;
        const garrisonDelta = applyGarrisonTick(withFlare, now);
        const withGarrison  = { ...withFlare, ...garrisonDelta } as ColonyStore;
        const restDelta     = applyRestTick(withGarrison, now);
        const nextState = { ...withGarrison, ...restDelta } as ColonyStore;
        const snapshotPost: StoreSnapshot = {
          serum: nextState.serum,
          units: nextState.units.map((u) => ({ id: u.id, restCurrent: u.restCurrent, injuredUntil: u.injuredUntil })),
        };
        const summary = summarize(snapshotPre, snapshotPost, prevNow, now);
        useColonyStore.setState({
          ...flareDelta, ...garrisonDelta, ...restDelta,
          pendingAwaySummary: isSignificant(summary) ? summary : null,
        });
      },
      partialize: (state) => ({
        units: state.units,
        nextId: state.nextId,
        harvestsToday: state.harvestsToday,
        harvestDayKey: state.harvestDayKey,
        droughtCount: state.droughtCount,
        breedsToday: state.breedsToday,
        breedDayKey: state.breedDayKey,
        fronts: state.fronts,
        serum: state.serum,
        stims: state.stims,
        lastGarrisonTickAt: state.lastGarrisonTickAt,   // NEW
        buildings: state.buildings,
        lastRestTickAt: state.lastRestTickAt,
        unlocks: state.unlocks,
        freeDecantsRemaining: state.freeDecantsRemaining,
        firstRunComplete: state.firstRunComplete,
        activeDirectiveId: state.activeDirectiveId,
        completedDirectiveIds: state.completedDirectiveIds,
        seenSurfaces: state.seenSurfaces,
        // activeIncursion excluded (transient — ticker not resumable)
        // recentReward is transient — omit
      }),
    },
  ),
);

/** Pure selector: find a unit by id. */
export function unitById(state: { units: readonly Unit[] }, id: number): Unit | undefined {
  return state.units.find((u) => u.id === id);
}

/** Pure selector: current Colony cap. Base 20; Barracks raises to 40. */
export function capOf(state: { buildings: { barracks: boolean } }): number {
  return state.buildings.barracks ? COLONY_CAP_BARRACKS : COLONY_CAP_BASE;
}
