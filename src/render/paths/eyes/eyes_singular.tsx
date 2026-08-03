import type { PathFn } from '../registry';

/**
 * eyes_singular — single large central cyclops eye. Rare recessive.
 */
const path: PathFn = (c) => (
  <>
    <circle cx="100" cy="40" r="10" fill={c.accent} stroke={c.dark} strokeWidth="1" />
    <circle cx="100" cy="40" r="5"  fill={c.dark} />
    <circle cx="100" cy="40" r="2.5" fill={c.light} />
  </>
);

export default path;
