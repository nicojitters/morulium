export const SPRITE_VIEWBOX = { width: 200, height: 280 } as const;
export const SPRITE_VIEWBOX_STRING = `0 0 ${SPRITE_VIEWBOX.width} ${SPRITE_VIEWBOX.height}`;

export type Point = Readonly<{ x: number; y: number }>;

export const ANCHORS: Readonly<Record<'head' | 'carapace' | 'appendage' | 'locomotion' | 'eyes', Point>> = {
  head:       { x: 100, y: 70 },
  carapace:   { x: 100, y: 105 },
  appendage:  { x: 100, y: 140 },
  locomotion: { x: 100, y: 175 },
  eyes:       { x: 100, y: 40 },
};

// Draw order (bottom of stack to top). hide_pattern draws inside carapace's own
// path composition (as a texture overlay on the torso), so it doesn't get its
// own layer position.
export const LAYER_ORDER = [
  'locomotion',
  'carapace',
  'appendage',
  'head',
  'eyes',
  'aberration',
] as const;

export type Layer = (typeof LAYER_ORDER)[number];
