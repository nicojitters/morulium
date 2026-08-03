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

// carapace
import cara_bare from './carapace/cara_bare';
import cara_chitin from './carapace/cara_chitin';
import cara_bone from './carapace/cara_bone';
import cara_hide from './carapace/cara_hide';

// hide_pattern
import hide_plain from './hide_pattern/hide_plain';
import hide_spotted from './hide_pattern/hide_spotted';
import hide_striped from './hide_pattern/hide_striped';
import hide_luminescent from './hide_pattern/hide_luminescent';

// locomotion
import loco_plain from './locomotion/loco_plain';
import loco_sprint from './locomotion/loco_sprint';
import loco_burrow from './locomotion/loco_burrow';
import loco_bulk from './locomotion/loco_bulk';

// appendage
import app_none from './appendage/app_none';
import app_stinger from './appendage/app_stinger';
import app_lash from './appendage/app_lash';
import app_spinneret from './appendage/app_spinneret';

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
  cara_bare,
  cara_chitin,
  cara_bone,
  cara_hide,
  hide_plain,
  hide_spotted,
  hide_striped,
  hide_luminescent,
  loco_plain,
  loco_sprint,
  loco_burrow,
  loco_bulk,
  app_none,
  app_stinger,
  app_lash,
  app_spinneret,
});
