import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* left limb — thick, shorter, forward-angled */}
    <path
      d="M 80 140 Q 68 190 65 235 L 80 255 L 100 235 Q 95 190 92 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* right limb mirrored */}
    <path
      d="M 120 140 Q 132 190 135 235 L 120 255 L 100 235 Q 105 190 108 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* claw tips — 3 curved claws per foot */}
    <path d="M 65 240 L 60 255 L 68 250 M 72 240 L 68 258 L 76 250 M 80 240 L 78 258 L 84 252"
      stroke={c.accent} strokeWidth="1.8" fill="none" />
    <path d="M 135 240 L 140 255 L 132 250 M 128 240 L 132 258 L 124 250 M 120 240 L 122 258 L 116 252"
      stroke={c.accent} strokeWidth="1.8" fill="none" />
  </>
);

export default path;
