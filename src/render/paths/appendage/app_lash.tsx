import type { PathFn } from '../registry';

/** app_lash — whip-like tail trailing down and to one side. */
const path: PathFn = (c) => (
  <>
    <path
      d="M 100 140 Q 130 170 145 210 Q 155 250 160 275"
      fill="none"
      stroke={c.base}
      strokeWidth="5"
      strokeLinecap="round"
    />
    {/* accent along the whip */}
    <path
      d="M 100 140 Q 130 170 145 210 Q 155 250 160 275"
      fill="none"
      stroke={c.dark}
      strokeWidth="1"
      opacity="0.5"
    />
  </>
);

export default path;
