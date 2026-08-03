import type { PathFn } from '../registry';

/**
 * head_mandible — smaller head with lateral curving mandibles. Insectoid.
 */
const path: PathFn = (c) => (
  <>
    {/* smaller central head */}
    <path
      d="M 82 68 Q 82 32 100 25 Q 118 32 118 68 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* left mandible curving forward */}
    <path
      d="M 82 55 Q 65 65 60 78 Q 65 72 75 68"
      fill={c.dark}
      stroke={c.accent}
      strokeWidth="1.2"
    />
    {/* right mandible mirrored */}
    <path
      d="M 118 55 Q 135 65 140 78 Q 135 72 125 68"
      fill={c.dark}
      stroke={c.accent}
      strokeWidth="1.2"
    />
  </>
);

export default path;
