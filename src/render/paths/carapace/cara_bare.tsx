import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* torso: smooth rounded rectangle */}
    <path
      d="M 68 70 Q 68 60 78 60 L 122 60 Q 132 60 132 70 L 135 130 Q 135 140 125 140 L 75 140 Q 65 140 65 130 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* subtle centerline shading */}
    <path d="M 100 68 L 100 138" stroke={c.dark} strokeWidth="0.6" opacity="0.3" />
  </>
);

export default path;
