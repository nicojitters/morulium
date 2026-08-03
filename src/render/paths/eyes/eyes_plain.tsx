import type { PathFn } from '../registry';

/**
 * eyes_plain — two small circular eyes. Baseline.
 * Renders on top of head. Anchor at (100, 40).
 */
const path: PathFn = (c) => (
  <>
    <circle cx="90"  cy="40" r="3" fill={c.accent} />
    <circle cx="110" cy="40" r="3" fill={c.accent} />
  </>
);

export default path;
