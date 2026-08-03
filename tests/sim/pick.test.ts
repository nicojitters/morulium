import { describe, it, expect } from 'vitest';
import { weightedPick } from '../../src/sim/pick';
import { createRng } from '../../src/sim/rng';

describe('weightedPick', () => {
  const items = [
    { id: 'a', drawWeight: 200 },
    { id: 'b', drawWeight: 1 },
    { id: 'c', drawWeight: 1 },
  ];

  it('is deterministic under the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 20; i++) expect(weightedPick(items, a)).toEqual(weightedPick(items, b));
  });

  it('does exactly one rng.next() call per pick', () => {
    // Verify by running weightedPick K times and separately advancing rng K times,
    // then confirming both rngs are in the same state (next() returns the same value)
    const via = createRng(7);
    const control = createRng(7);
    for (let i = 0; i < 50; i++) {
      weightedPick(items, via);
      control.next();
    }
    expect(via.next()).toBe(control.next());
  });

  it('distribution roughly matches weights over many rolls', () => {
    const rng = createRng(1);
    const tally: Record<string, number> = { a: 0, b: 0, c: 0 };
    const N = 20_000;
    for (let i = 0; i < N; i++) tally[weightedPick(items, rng).id]!++;
    // a has drawWeight 200 out of 202 total ≈ 99.0%
    expect(tally['a']! / N).toBeGreaterThan(0.98);
    expect(tally['a']! / N).toBeLessThan(0.995);
  });

  it('throws on empty items', () => {
    expect(() => weightedPick([], createRng(1))).toThrow();
  });
});
