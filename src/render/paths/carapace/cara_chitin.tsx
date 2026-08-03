import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* torso silhouette same shape as bare */}
    <path
      d="M 68 70 Q 68 60 78 60 L 122 60 Q 132 60 132 70 L 135 130 Q 135 140 125 140 L 75 140 Q 65 140 65 130 Z"
      fill={c.base}
      stroke={c.dark}
      strokeWidth="1.5"
    />
    {/* horizontal chitin segment lines */}
    <path d="M 66 85 Q 100 82 134 85" fill="none" stroke={c.dark} strokeWidth="1.2" />
    <path d="M 66 100 Q 100 97 134 100" fill="none" stroke={c.dark} strokeWidth="1.2" />
    <path d="M 66 115 Q 100 112 134 115" fill="none" stroke={c.dark} strokeWidth="1.2" />
    <path d="M 66 130 Q 100 127 134 130" fill="none" stroke={c.dark} strokeWidth="1.2" />
  </>
);

export default path;
