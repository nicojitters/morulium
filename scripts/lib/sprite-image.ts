export type RGB = readonly [number, number, number];
export type Bbox = { x: number; y: number; w: number; h: number; cx: number; cy: number };

export function computeBbox(
  rgba: Buffer | Uint8Array,
  width: number,
  height: number,
  alphaThreshold: number,
): Bbox | null {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = rgba[(y * width + x) * 4 + 3]!;
      if (a < alphaThreshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  return { x: minX, y: minY, w, h, cx: minX + w / 2, cy: minY + h / 2 };
}

export function nearestRampIndex(r: number, g: number, b: number, ramp: readonly RGB[]): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < ramp.length; i++) {
    const [rr, gg, bb] = ramp[i]!;
    const dr = r - rr, dg = g - gg, db = b - bb;
    const d = dr * dr + dg * dg + db * db;
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

export function remapPixel(
  r: number, g: number, b: number,
  refRamp: readonly RGB[],
  targetRamp: readonly RGB[],
): RGB {
  const i = nearestRampIndex(r, g, b, refRamp);
  return targetRamp[i]!;
}
