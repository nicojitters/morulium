import type { SeededRng } from './rng';

export function weightedPick<T extends { drawWeight: number }>(items: readonly T[], rng: SeededRng): T {
  if (items.length === 0) throw new Error('weightedPick: empty items');
  let total = 0;
  for (const item of items) total += item.drawWeight;
  let r = rng.next() * total;
  for (const item of items) {
    r -= item.drawWeight;
    if (r < 0) return item;
  }
  return items[items.length - 1]!; // fp safety
}
