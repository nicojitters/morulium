import type { PathFn } from '../registry';

/**
 * ab_voltaic — crackling electric arcs. Rare Chimera/Progenitor "wow" overlay.
 * Zig-zag lines with spark dots, using light color for visibility on any palette.
 */
const path: PathFn = (c) => (
  <>
    {/* main arc: shoulder to hip diagonal */}
    <path
      d="M 55 75 L 68 90 L 55 110 L 78 128 L 62 145 L 88 155"
      fill="none"
      stroke={c.light}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* secondary arc: mirrored */}
    <path
      d="M 145 75 L 132 90 L 145 110 L 122 128 L 138 145 L 112 155"
      fill="none"
      stroke={c.light}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* tertiary arc across the head */}
    <path
      d="M 72 30 L 85 45 L 68 55 L 100 40 L 132 55 L 115 45 L 128 30"
      fill="none"
      stroke={c.light}
      strokeWidth="1.5"
      opacity="0.9"
    />
    {/* spark dots at arc endpoints */}
    <circle cx="55" cy="75"  r="2" fill={c.light} />
    <circle cx="88" cy="155" r="2" fill={c.light} />
    <circle cx="145" cy="75" r="2" fill={c.light} />
    <circle cx="112" cy="155" r="2" fill={c.light} />
    <circle cx="72"  cy="30"  r="2" fill={c.light} />
    <circle cx="128" cy="30"  r="2" fill={c.light} />
  </>
);

export default path;
