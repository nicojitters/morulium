import type { ReactNode } from 'react';
import type { PaletteColors } from '../colors';

/**
 * A PathFn draws one allele's contribution to the sprite as a React SVG node.
 * The function receives the resolved palette colors and returns a <g>/<path>/etc.
 * positioned assuming the sprite viewBox is 0 0 200 280 and using the anchor
 * for its slot from src/render/layout.ts.
 */
export type PathFn = (colors: PaletteColors) => ReactNode;

/**
 * The lookup table: allele id → its PathFn.
 * Populated by Tasks 2-5. Empty in Task 1 — the Sprite component's missing-art
 * fallback renders a "?" placeholder for any unregistered allele.
 */
export const PATHS: Readonly<Record<string, PathFn>> = Object.freeze({});
