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

interface ColonyStore {
  readonly units: Unit[];
  readonly nextId: number;
  readonly lastDecantedId: number | null;
  readonly harvestsToday: number;
  readonly harvestDayKey: string;
  readonly droughtCount: number;

  decant: () => Unit;
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

      decant: () => {
        const state = get();
        const today = todayLocalKey();

        // Day rollover: if the stored day is stale, treat harvestsToday as 0
        const harvestsUsedToday = state.harvestDayKey === today ? state.harvestsToday : 0;
        if (harvestsUsedToday >= DAILY_HARVEST_LIMIT) {
          throw new Error('daily Harvest limit reached');
        }

        const id = state.nextId;

        // Failsafe: when drought has reached the threshold, roll from the substream
        // until we get a Chimera+ genome. Otherwise, normal roll.
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

      clearHighlight: () => set({ lastDecantedId: null }),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      migrate: (state, from) => {
        // Cast is safe here because Zustand's migrate types are open (unknown-ish);
        // we know the v1 shape from M3a: { units, nextId }
        if (from < 2) {
          const v1 = state as Partial<ColonyStore> & { units: Unit[]; nextId: number };
          return {
            ...v1,
            harvestsToday: 0,
            harvestDayKey: todayLocalKey(),
            droughtCount: 0,
          };
        }
        return state as ColonyStore;
      },
      partialize: (state) => ({
        units: state.units,
        nextId: state.nextId,
        harvestsToday: state.harvestsToday,
        harvestDayKey: state.harvestDayKey,
        droughtCount: state.droughtCount,
      }),
    },
  ),
);

/** Pure selector: find a unit by id. */
export function unitById(state: { units: readonly Unit[] }, id: number): Unit | undefined {
  return state.units.find((u) => u.id === id);
}
