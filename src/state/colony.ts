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

interface ColonyStore {
  readonly units: Unit[];
  readonly nextId: number;
  readonly lastDecantedId: number | null;
  readonly harvestsToday: number;
  readonly harvestDayKey: string;
  readonly droughtCount: number;
  readonly breedsToday: number;
  readonly breedDayKey: string;

  decant: () => Unit;
  breed: (parentAId: number, parentBId: number) => Unit;
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

      decant: () => {
        const state = get();
        const today = todayLocalKey();

        const harvestsUsedToday = state.harvestDayKey === today ? state.harvestsToday : 0;
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
        };

        set({
          units: [...state.units, unit],
          nextId: id + 1,
          lastDecantedId: id,
          harvestsToday: harvestsUsedToday + 1,
          harvestDayKey: today,
          droughtCount: newDrought,
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
        };

        set({
          units: [...state.units, child],
          nextId: childId + 1,
          lastDecantedId: childId,
          breedsToday: breedsUsedToday + 1,
          breedDayKey: today,
        });
        return child;
      },

      clearHighlight: () => set({ lastDecantedId: null }),
    }),
    {
      name: STORAGE_KEY,
      version: 3,
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
          type LegacyUnit = Omit<Unit, 'generation' | 'parentIds' | 'wear'> & {
            generation?: number;
            parentIds?: readonly [number, number] | null;
            wear?: Readonly<Record<string, number>>;
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
      }),
    },
  ),
);

/** Pure selector: find a unit by id. */
export function unitById(state: { units: readonly Unit[] }, id: number): Unit | undefined {
  return state.units.find((u) => u.id === id);
}
