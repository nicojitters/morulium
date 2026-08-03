import type { PathFn } from '../registry';

const path: PathFn = (c) => (
  <>
    {/* 4 diagonal stripes across the torso */}
    <path d="M 70 80  L 90 138" stroke={c.dark} strokeWidth="3" opacity="0.6" />
    <path d="M 88 68  L 108 138" stroke={c.dark} strokeWidth="3" opacity="0.6" />
    <path d="M 108 68 L 128 138" stroke={c.dark} strokeWidth="3" opacity="0.6" />
    <path d="M 128 80 L 130 138" stroke={c.dark} strokeWidth="3" opacity="0.6" />
  </>
);

export default path;
