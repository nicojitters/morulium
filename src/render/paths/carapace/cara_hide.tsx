import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* rounder, more organic torso outline */}
    <path
      d="M 65 75 Q 62 60 80 58 Q 100 55 120 58 Q 138 60 135 75 Q 138 120 130 140 Q 100 145 70 140 Q 62 120 65 75 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* subtle bumpy texture — small dark dots scattered */}
    <circle cx="80" cy="85" r="1.5" fill={c.dark} opacity="0.6" />
    <circle cx="95" cy="90" r="1.5" fill={c.dark} opacity="0.6" />
    <circle cx="110" cy="82" r="1.5" fill={c.dark} opacity="0.6" />
    <circle cx="120" cy="98" r="1.5" fill={c.dark} opacity="0.6" />
    <circle cx="82" cy="110" r="1.5" fill={c.dark} opacity="0.6" />
    <circle cx="100" cy="115" r="1.5" fill={c.dark} opacity="0.6" />
    <circle cx="118" cy="120" r="1.5" fill={c.dark} opacity="0.6" />
    <circle cx="90" cy="128" r="1.5" fill={c.dark} opacity="0.6" />
  </>
);

export default path;
