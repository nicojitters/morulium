import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    <circle cx="85"  cy="95"  r="3" fill={c.dark} opacity="0.7" />
    <circle cx="110" cy="88"  r="4" fill={c.dark} opacity="0.7" />
    <circle cx="95"  cy="115" r="3" fill={c.dark} opacity="0.7" />
    <circle cx="118" cy="120" r="3.5" fill={c.dark} opacity="0.7" />
    <circle cx="80"  cy="125" r="2.5" fill={c.dark} opacity="0.7" />
  </>
);

export default path;
