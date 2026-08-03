import type { PathFn } from '../registry';

/**
 * head_maw — wide, jaw-heavy head with visible teeth. Aggressive.
 * Wider at bottom (jaw), narrower at top.
 */
const path: PathFn = (c) => (
  <>
    {/* head silhouette: wide bulldog jaw */}
    <path
      d="M 60 70 L 68 32 Q 100 15 132 32 L 140 70 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* mouth line + teeth (accent highlights) */}
    <path
      d="M 65 62 L 135 62"
      stroke={c.accent}
      strokeWidth="2"
    />
    <path
      d="M 75 62 L 75 68 M 85 62 L 85 70 M 100 62 L 100 71 M 115 62 L 115 70 M 125 62 L 125 68"
      stroke={c.light}
      strokeWidth="1.2"
    />
  </>
);

export default path;
