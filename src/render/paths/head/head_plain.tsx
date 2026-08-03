import type { PathFn } from '../registry';

/**
 * head_plain — rounded, unremarkable dome. Baseline "wild-type" head.
 * Bilateral symmetric across x=100. Anchor: bottom-center at (100, 70).
 * Draws roughly y=15..70, x=70..130.
 */
const path: PathFn = (c) => (
  <>
    {/* main dome, filled base color */}
    <path
      d="M 70 70 Q 70 20 100 15 Q 130 20 130 70 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* subtle shading arc for depth */}
    <path
      d="M 78 68 Q 78 30 100 25 Q 122 30 122 68"
      fill="none"
      stroke={c.dark}
      strokeWidth="1"
      opacity="0.4"
    />
  </>
);

export default path;
