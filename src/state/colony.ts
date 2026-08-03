import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Unit } from './types';
import { STORAGE_KEY } from './persist';
import { rollGenome } from '../sim/genome';
import { createRng } from '../sim/rng';

interface ColonyStore {
  readonly units: Unit[];
  readonly nextId: number;
  readonly lastDecantedId: number | null;

  decant: () => Unit;
  clearHighlight: () => void;
}

export const useColonyStore = create<ColonyStore>()(
  persist(
    (set, get) => ({
      units: [],
      nextId: 1,
      lastDecantedId: null,

      decant: () => {
        const id = get().nextId;
        const genome = rollGenome(createRng(id));
        const unit: Unit = {
          id,
          seed: id,
          decantedAt: Date.now(),
          genome,
        };
        set((s) => ({
          units: [...s.units, unit],
          nextId: s.nextId + 1,
          lastDecantedId: id,
        }));
        return unit;
      },

      clearHighlight: () => set({ lastDecantedId: null }),
    }),
    {
      name: STORAGE_KEY,
      // Only persist units + nextId. lastDecantedId is transient.
      partialize: (state) => ({ units: state.units, nextId: state.nextId }),
    },
  ),
);

/** Pure selector: find a unit by id. */
export function unitById(state: { units: readonly Unit[] }, id: number): Unit | undefined {
  return state.units.find((u) => u.id === id);
}
