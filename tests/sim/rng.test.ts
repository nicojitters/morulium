import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/sim/rng';

describe('SeededRng', () => {
  it('same seed produces the same next() sequence', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 8 }, () => a.next());
    const seqB = Array.from({ length: 8 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds produce different sequences', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('next() stays in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt returns integers within [min, max] inclusive', () => {
    const rng = createRng(11);
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextInt(3, 7);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it('nextInt hits both boundaries over enough rolls', () => {
    const rng = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.nextInt(0, 3));
    expect(seen).toEqual(new Set([0, 1, 2, 3]));
  });

  it('pick returns an element of the array', () => {
    const rng = createRng(13);
    const arr = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it('pick throws on empty array', () => {
    const rng = createRng(1);
    expect(() => rng.pick([])).toThrow();
  });

  it('fork produces an independent, deterministic stream', () => {
    const parent = createRng(100);
    const childA = parent.fork(1);
    const parent2 = createRng(100);
    const childB = parent2.fork(1);
    // Same seed + same salt → same fork stream
    expect(childA.next()).toBe(childB.next());
    // Different salts → different streams
    const different = createRng(100).fork(2);
    expect(createRng(100).fork(1).next()).not.toBe(different.next());
  });

  it('createRng throws on non-finite seeds', () => {
    expect(() => createRng(NaN)).toThrow(/finite/);
    expect(() => createRng(Infinity)).toThrow(/finite/);
    expect(() => createRng(-Infinity)).toThrow(/finite/);
  });

  it('fork determinism: two forks from equal parents produce identical streams', () => {
    const parent1 = createRng(500);
    const parent2 = createRng(500);
    const child1 = parent1.fork(9);
    const child2 = parent2.fork(9);
    for (let i = 0; i < 10; i++) expect(child1.next()).toBe(child2.next());
  });

  it('fork does not perturb the parent stream beyond the one draw fork consumes', () => {
    const a = createRng(700);
    a.next(); // advance once
    a.fork(1); // fork consumes one draw of the parent
    const afterFork = a.next();

    const b = createRng(700);
    b.next(); // advance once
    b.next(); // fork() would have consumed this
    const afterAdvance = b.next();

    expect(afterFork).toBe(afterAdvance);
  });
});
