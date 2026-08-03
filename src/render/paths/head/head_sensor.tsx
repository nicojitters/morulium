import type { PathFn } from '../registry';

/**
 * head_sensor — narrow head with 5 vertical sensor spikes at the crown.
 * Instrument-like, precise.
 */
const path: PathFn = (c) => (
  <>
    {/* narrower dome */}
    <path
      d="M 80 70 Q 80 30 100 22 Q 120 30 120 70 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* 5 vertical sensor spikes */}
    <path
      d="M 88 25 L 88 10 M 94 22 L 94 8 M 100 20 L 100 5 M 106 22 L 106 8 M 112 25 L 112 10"
      stroke={c.accent}
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* spike tips (small dots in light color) */}
    <circle cx="88" cy="10" r="1.8" fill={c.light} />
    <circle cx="94" cy="8"  r="1.8" fill={c.light} />
    <circle cx="100" cy="5" r="2.2" fill={c.light} />
    <circle cx="106" cy="8" r="1.8" fill={c.light} />
    <circle cx="112" cy="10" r="1.8" fill={c.light} />
  </>
);

export default path;
