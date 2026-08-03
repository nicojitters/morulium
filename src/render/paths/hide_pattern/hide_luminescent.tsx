import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* bright bioluminescent dots + glow */}
    <circle cx="85"  cy="90"  r="4" fill={c.light} opacity="0.9" />
    <circle cx="115" cy="90"  r="4" fill={c.light} opacity="0.9" />
    <circle cx="100" cy="105" r="5" fill={c.light} opacity="0.9" />
    <circle cx="85"  cy="120" r="4" fill={c.light} opacity="0.9" />
    <circle cx="115" cy="120" r="4" fill={c.light} opacity="0.9" />
    {/* soft glow rings */}
    <circle cx="100" cy="105" r="8" fill="none" stroke={c.light} strokeWidth="0.8" opacity="0.4" />
  </>
);

export default path;
