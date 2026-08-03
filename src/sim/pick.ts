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
  // fp-safety net: unreachable in normal arithmetic (the walk above always
  // finds an item because total > 0 given items.length > 0), but rounding
  // error on `r` could theoretically leave it at exactly 0 after the last
  // decrement. Returning the last item preserves the pick's shape rather
  // than throwing or returning undefined.
  return items[items.length - 1]!;
}
