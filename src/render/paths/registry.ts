import type { ReactNode } from 'react';
import type { PaletteColors } from '../colors';

// head
import head_plain from './head/head_plain';
import head_maw from './head/head_maw';
import head_sensor from './head/head_sensor';
import head_mandible from './head/head_mandible';
import head_folded from './head/head_folded';

// eyes
import eyes_plain from './eyes/eyes_plain';
import eyes_bright from './eyes/eyes_bright';
import eyes_multi from './eyes/eyes_multi';
import eyes_singular from './eyes/eyes_singular';

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
export const PATHS: Readonly<Record<string, PathFn>> = Object.freeze({
  head_plain,
  head_maw,
  head_sensor,
  head_mandible,
  head_folded,
  eyes_plain,
  eyes_bright,
  eyes_multi,
  eyes_singular,
});
