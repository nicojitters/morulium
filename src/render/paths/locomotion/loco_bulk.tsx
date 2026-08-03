import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* massive geometric tread-limbs */}
    <path
      d="M 55 140 L 52 250 L 90 270 L 92 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.8"
    />
    <path
      d="M 145 140 L 148 250 L 110 270 L 108 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.8"
    />
    {/* tread pattern — horizontal bars */}
    <path d="M 55 180 L 90 180 M 55 200 L 90 200 M 55 220 L 90 220 M 55 240 L 90 240"
      stroke={c.dark} strokeWidth="1.2" />
    <path d="M 110 180 L 145 180 M 110 200 L 145 200 M 110 220 L 145 220 M 110 240 L 145 240"
      stroke={c.dark} strokeWidth="1.2" />
  </>
);

export default path;
