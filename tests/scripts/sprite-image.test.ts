import { describe, it, expect } from 'vitest';
import { computeBbox, nearestRampIndex, remapPixel, type RGB } from '../../scripts/lib/sprite-image';

const REF: readonly RGB[] = [
  [0x14, 0x28, 0x2a],
  [0x2f, 0x5a, 0x5a],
  [0x5f, 0x8f, 0x8f],
  [0x4d, 0xff, 0xb0],
];

const ASH: readonly RGB[] = [
  [0x1c, 0x1c, 0x1c],
  [0x3d, 0x3d, 0x3d],
  [0x6e, 0x6e, 0x6e],
  [0xb6, 0xb6, 0xb6],
];

// Small 4x4 RGBA image, one opaque pixel at (1,2). Alpha threshold 32.
function makeSingleOpaquePixel(): Uint8Array {
  const w = 4, h = 4;
  const buf = new Uint8Array(w * h * 4);
  const idx = (2 * w + 1) * 4;
  buf[idx + 0] = 0x4d; buf[idx + 1] = 0xff; buf[idx + 2] = 0xb0; buf[idx + 3] = 255;
  return buf;
}

describe('computeBbox', () => {
  it('returns null when no pixels exceed the alpha threshold', () => {
    const empty = new Uint8Array(16 * 4); // all zeros
    expect(computeBbox(empty, 4, 4, 32)).toBeNull();
  });

  it('finds a single opaque pixel and reports bbox with cx/cy at its center', () => {
    const buf = makeSingleOpaquePixel();
    const bb = computeBbox(buf, 4, 4, 32);
    expect(bb).toEqual({ x: 1, y: 2, w: 1, h: 1, cx: 1.5, cy: 2.5 });
  });

  it('ignores pixels below the alpha threshold', () => {
    const buf = makeSingleOpaquePixel();
    // Add a stray pixel at (3,3) with alpha 20 — under threshold 32.
    const strayIdx = (3 * 4 + 3) * 4;
    buf[strayIdx + 3] = 20;
    const bb = computeBbox(buf, 4, 4, 32);
    expect(bb).toEqual({ x: 1, y: 2, w: 1, h: 1, cx: 1.5, cy: 2.5 });
  });
});

describe('nearestRampIndex', () => {
  it('exact match returns exact index', () => {
    expect(nearestRampIndex(0x14, 0x28, 0x2a, REF)).toBe(0);
    expect(nearestRampIndex(0x4d, 0xff, 0xb0, REF)).toBe(3);
  });

  it('anti-aliased in-between pixel picks nearest by RGB distance', () => {
    // Between REF[1] (#2f5a5a) and REF[2] (#5f8f8f) — closer to REF[1].
    expect(nearestRampIndex(0x40, 0x70, 0x70, REF)).toBe(1);
    // Closer to REF[2].
    expect(nearestRampIndex(0x55, 0x85, 0x85, REF)).toBe(2);
  });
});

describe('remapPixel', () => {
  it('maps each reference-ramp color to the target-ramp color at the same index', () => {
    expect(remapPixel(0x14, 0x28, 0x2a, REF, ASH)).toEqual([0x1c, 0x1c, 0x1c]);
    expect(remapPixel(0x2f, 0x5a, 0x5a, REF, ASH)).toEqual([0x3d, 0x3d, 0x3d]);
    expect(remapPixel(0x5f, 0x8f, 0x8f, REF, ASH)).toEqual([0x6e, 0x6e, 0x6e]);
    expect(remapPixel(0x4d, 0xff, 0xb0, REF, ASH)).toEqual([0xb6, 0xb6, 0xb6]);
  });

  it('an in-between (anti-aliased) pixel maps by nearest-ref match', () => {
    // Closer to REF[2] -> ASH[2]
    expect(remapPixel(0x55, 0x85, 0x85, REF, ASH)).toEqual([0x6e, 0x6e, 0x6e]);
  });
});
