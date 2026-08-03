import type { PathFn } from '../registry';

/**
 * eyes_bright — larger eyes with light highlights. INT-leaning variant.
 */
const path: PathFn = (c) => (
  <>
    <circle cx="90"  cy="40" r="4.5" fill={c.accent} />
    <circle cx="110" cy="40" r="4.5" fill={c.accent} />
    <circle cx="91"  cy="39" r="1.5" fill={c.light} />
    <circle cx="111" cy="39" r="1.5" fill={c.light} />
  </>
);

export default path;
