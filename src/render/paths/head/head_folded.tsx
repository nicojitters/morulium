import type { PathFn } from '../registry';

/**
 * head_folded — head partially retracted into carapace. Only the crown shows.
 * Recessive baseline of the "hidden" head phenotype.
 */
const path: PathFn = (c) => (
  <>
    {/* only the top arc is visible */}
    <path
      d="M 75 70 Q 78 55 100 50 Q 122 55 125 70 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* fold seams — subtle horizontal lines */}
    <path
      d="M 80 62 L 120 62 M 85 58 L 115 58"
      stroke={c.dark}
      strokeWidth="0.8"
      opacity="0.5"
    />
  </>
);

export default path;
