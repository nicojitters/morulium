import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* left leg — longer, angled slightly forward, defined calf */}
    <path
      d="M 88 140 Q 85 200 82 250 L 88 265 L 96 250 Q 95 200 96 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* right leg mirrored */}
    <path
      d="M 112 140 Q 115 200 118 250 L 112 265 L 104 250 Q 105 200 104 140 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* pointed feet suggestion */}
    <path d="M 82 260 L 92 268 L 88 265 Z" fill={c.dark} />
    <path d="M 118 260 L 108 268 L 112 265 Z" fill={c.dark} />
    {/* calf highlight */}
    <path d="M 85 200 L 87 230" stroke={c.accent} strokeWidth="1" opacity="0.6" />
    <path d="M 115 200 L 113 230" stroke={c.accent} strokeWidth="1" opacity="0.6" />
  </>
);

export default path;
