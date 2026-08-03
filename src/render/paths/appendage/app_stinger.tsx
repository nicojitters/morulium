import type { PathFn } from '../registry';

/** app_stinger — segmented tail curling up over the back with a stinger tip. */
const path: PathFn = (c) => (
  <>
    {/* base — attached at hip, curling up and to the right */}
    <path
      d="M 100 140 Q 140 130 150 90 Q 155 60 145 45"
      fill="none"
      stroke={c.base}
      strokeWidth="8"
      strokeLinecap="round"
    />
    {/* segment lines */}
    <path
      d="M 100 140 Q 140 130 150 90 Q 155 60 145 45"
      fill="none"
      stroke={c.dark}
      strokeWidth="1.2"
      strokeDasharray="4 3"
    />
    {/* stinger tip */}
    <path d="M 145 45 L 148 32 L 142 40 Z" fill={c.accent} stroke={c.dark} strokeWidth="1" />
  </>
);

export default path;
