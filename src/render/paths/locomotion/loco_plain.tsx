import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* left leg */}
    <path
      d="M 85 140 L 82 260 L 90 265 L 95 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* right leg */}
    <path
      d="M 115 140 L 118 260 L 110 265 L 105 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* simple feet */}
    <ellipse cx="86" cy="268" rx="10" ry="4" fill={c.dark} />
    <ellipse cx="114" cy="268" rx="10" ry="4" fill={c.dark} />
  </>
);

export default path;
