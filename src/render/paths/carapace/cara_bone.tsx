import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* main torso */}
    <path
      d="M 68 70 Q 68 60 78 60 L 122 60 Q 132 60 132 70 L 135 130 Q 135 140 125 140 L 75 140 Q 65 140 65 130 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* bone shoulder pauldrons — angular blocks over the shoulders */}
    <path d="M 55 70 L 68 62 L 78 78 L 65 90 Z" fill={c.dark} stroke={c.accent} strokeWidth="1.2" />
    <path d="M 145 70 L 132 62 L 122 78 L 135 90 Z" fill={c.dark} stroke={c.accent} strokeWidth="1.2" />
    {/* chest bone plate — central ribcage suggestion */}
    <path d="M 88 80 L 112 80 L 108 130 L 92 130 Z" fill={c.dark} opacity="0.7" />
    <path d="M 92 90 L 108 90 M 92 100 L 108 100 M 92 110 L 108 110 M 92 120 L 108 120" stroke={c.accent} strokeWidth="0.8" />
  </>
);

export default path;
