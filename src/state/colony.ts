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
  readonly serum: number;
  readonly stims: number;                          // NEW (Task 3; buyStim action lands in Task 4)

  decant: () => Unit;
  breed: (parentAId: number, parentBId: number) => Unit;
  launchIncursion: (
    frontId: FrontId,
    teamIds: readonly [number, number, number, number],
    stimAppliedIds?: readonly number[],
  ) => IncursionResolution;
  dismissIncursion: () => void;
  buyStim: () => void;
  clearHighlight: () => void;
}

export const useColonyStore = create<ColonyStore>()(
  persist(
    (set, get) => ({
      units: [],
      nextId: 1,
      lastDecantedId: null,
      harvestsToday: 0,
      harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0,
      breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS,
      activeIncursion: null,
      serum: SERUM_STARTING_BALANCE,
      stims: 0,

      decant: () => {
        const state = get();
        const today = todayLocalKey();
        const dayRolledOver = state.harvestDayKey !== today;

        const harvestsUsedToday = dayRolledOver ? 0 : state.harvestsToday;
        if (harvestsUsedToday >= DAILY_HARVEST_LIMIT) {
          throw new Error('daily Harvest limit reached');
        }

        const id = state.nextId;
        const genome = state.droughtCount >= DROUGHT_THRESHOLD
          ? rollGenomeAtLeast(id * FAILSAFE_SUBSTREAM_PRIME, FAILSAFE_MIN_TIER)
          : rollGenome(createRng(id));
        const { tier } = computeRarity(genome);
        const newDrought = tierAtLeast(tier, 'chimera') ? 0 : state.droughtCount + 1;

        const unit: Unit = {
          id,
          seed: id,
          decantedAt: Date.now(),
          genome,
          generation: 0,
          parentIds: null,
          wear: {},
          restCurrent: REST_MAX,
          injuredUntil: null,
        };

        // On day-rollover: refresh rest on all EXISTING units (injuredUntil is
        // NOT reset — injuries expire on their own timer).
        const refreshedUnits = dayRolledOver
          ? state.units.map((u) => ({ ...u, restCurrent: REST_MAX }))
          : state.units;

        set({
          units: [...refreshedUnits, unit],
          nextId: id + 1,
          lastDecantedId: id,
          harvestsToday: harvestsUsedToday + 1,
          harvestDayKey: today,
          droughtCount: newDrought,
          ...(dayRolledOver ? { serum: state.serum + SERUM_DAILY_FAUCET } : {}),
        });
        return unit;
      },

      breed: (parentAId, parentBId) => {
        if (parentAId === parentBId) {
          throw new Error('breed: cannot breed a specimen with itself');
        }
        const state = get();
        const pA = state.units.find((u) => u.id === parentAId);
        const pB = state.units.find((u) => u.id === parentBId);
        if (!pA) throw new Error(`breed: parent ${parentAId} not found`);
        if (!pB) throw new Error(`breed: parent ${parentBId} not found`);
        const today = todayLocalKey();
        const breedsUsedToday = state.breedDayKey === today ? state.breedsToday : 0;
        if (breedsUsedToday >= DAILY_BREED_LIMIT) {
          throw new Error('daily Breed limit reached');
        }
        if (state.serum < BREED_COST_SERUM) {
          throw new Error('breed: insufficient Serum');
        }

        const childId = state.nextId;
        const rng = createRng(childId * BREED_SUBSTREAM_PRIME);
        const { genome, mutatedLoci } = breedGenome(pA.genome, pB.genome, rng, MUTATION_RATE);
        const wear = nextWear(pA, pB, mutatedLoci);
        const generation = Math.max(pA.generation, pB.generation) + 1;

        const child: Unit = {
          id: childId,
          seed: childId,
          decantedAt: Date.now(),
          genome,
          generation,
          parentIds: [parentAId, parentBId] as const,
          wear,
          restCurrent: REST_MAX,
          injuredUntil: null,
        };

        set({
          units: [...state.units, child],
          nextId: childId + 1,
          lastDecantedId: childId,
          breedsToday: breedsUsedToday + 1,
          breedDayKey: today,
          serum: state.serum - BREED_COST_SERUM,
        });
        return child;
      },

      launchIncursion: (frontId, teamIds, stimAppliedIds = []) => {
        const state = get();
        const frontState = state.fronts[frontId];
        if (!frontState) throw new Error(`launchIncursion: unknown front ${frontId}`);
        if (frontState.captured) throw new Error(`launchIncursion: front ${frontId} already captured`);
        if (frontState.cooldownUntil !== null && frontState.cooldownUntil > Date.now()) {
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
          const u = state.units.find((u) => u.id === id);
          if (!u) throw new Error(`launchIncursion: unit ${id} not found`);
          team.push(u);
        }

        const now = Date.now();
        const injuredMembers = team.filter((u) => u.injuredUntil !== null && u.injuredUntil > now);
        if (injuredMembers.length > 0) {
          throw new Error(`launchIncursion: units injured: ${injuredMembers.map((u) => u.id).join(', ')}`);
        }

        for (const id of stimAppliedIds) {
          if (!teamIds.includes(id)) {
            throw new Error(`launchIncursion: cannot apply Stim to non-team unit ${id}`);
          }
        }
        if (state.stims < stimAppliedIds.length) {
          throw new Error(`launchIncursion: need ${stimAppliedIds.length} Stim(s), have ${state.stims}`);
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
        const childSeed = state.nextId;
        const injuryRolls = rollInjuries(restPenalties, childSeed * INJURY_SUBSTREAM_PRIME);

        const resolution = resolveIncursion(team, FRONTS[frontId], restPenalties);

        // Deduct rest + apply injuries + deduct stims in ONE atomic set()
        const teamIdSet = new Set(teamIds);
        const newUnits = state.units.map((u) => {
          if (!teamIdSet.has(u.id)) return u;
          const gotInjured = injuryRolls[u.id] === true;
          return {
            ...u,
            restCurrent: Math.max(0, u.restCurrent - REST_DEPLOY_COST),
            injuredUntil: gotInjured ? now + INJURY_DURATION_MS : u.injuredUntil,
          };
        });

        set({
          activeIncursion: resolution,
          units: newUnits,
          stims: state.stims - stimAppliedIds.length,
        });

        return resolution;
      },

      buyStim: () => {
        const state = get();
        if (state.serum < STIM_COST_SERUM) {
          throw new Error('buyStim: insufficient Serum');
        }
        set({
          serum: state.serum - STIM_COST_SERUM,
          stims: state.stims + 1,
        });
      },

      dismissIncursion: () => {
        const state = get();
        const r = state.activeIncursion;
        if (r === null) return;
        const target: FrontState = { ...state.fronts[r.frontId] };
        if (r.outcome === 'won') {
          set({
            fronts: { ...state.fronts, [r.frontId]: { captured: true, cooldownUntil: null } },
            activeIncursion: null,
          });
        } else {
          set({
            fronts: { ...state.fronts, [r.frontId]: { ...target, cooldownUntil: Date.now() + FRONT_COOLDOWN_MS } },
            activeIncursion: null,
          });
        }
      },

      clearHighlight: () => set({ lastDecantedId: null }),
    }),
    {
      name: STORAGE_KEY,
      version: 6,
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
        return s;
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
        stims: state.stims,   // NEW
        // activeIncursion excluded (transient — ticker not resumable)
      }),
    },
  ),
);

/** Pure selector: find a unit by id. */
export function unitById(state: { units: readonly Unit[] }, id: number): Unit | undefined {
  return state.units.find((u) => u.id === id);
}
