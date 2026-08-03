export interface SeededRng {
  next(): number;
  nextInt(min: number, max: number): number;
  pick<T>(arr: readonly T[]): T;
  fork(salt: number): SeededRng;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix32(a: number, b: number): number {
  // xorshift-ish mixer; deterministic combination of two 32-bit values
  let x = ((a >>> 0) ^ Math.imul(b >>> 0, 0x85ebca6b)) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x;
}

export function createRng(seed: number): SeededRng {
  if (!Number.isFinite(seed)) {
    throw new Error(`createRng: seed must be finite, got ${seed}`);
  }
  const src = mulberry32(seed);

  const api: SeededRng = {
    next: () => src(),
    nextInt: (min, max) => {
      if (max < min) throw new Error(`nextInt: max (${max}) < min (${min})`);
      const span = max - min + 1;
      return min + Math.floor(src() * span);
    },
    pick: <T,>(arr: readonly T[]): T => {
      if (arr.length === 0) throw new Error('pick: empty array');
      return arr[Math.floor(src() * arr.length)]!;
    },
    fork: (salt) => {
      const parentState = Math.floor(src() * 4294967296);
      return createRng(mix32(parentState, salt));
    },
  };

  return api;
}
