import type { PathFn } from '../registry';

/** app_spinneret — bulbous silk gland with two silk-thread lines trailing down. */
const path: PathFn = (c) => (
  <>
    {/* bulb at hip */}
    <ellipse cx="100" cy="150" rx="12" ry="8" fill={c.base} stroke={c.dark} strokeWidth="1.5" />
    <ellipse cx="100" cy="150" rx="6" ry="3" fill={c.dark} />
    {/* silk thread 1 — straight down */}
    <path d="M 95 158 L 88 275" stroke={c.light} strokeWidth="1" opacity="0.8" />
    {/* silk thread 2 — angled */}
    <path d="M 105 158 L 118 275" stroke={c.light} strokeWidth="1" opacity="0.8" />
  </>
);

export default path;
