import type { PathFn } from '../registry';

/**
 * ab_corrosive — dripping acid streaks. Rare Chimera/Progenitor "wow" overlay.
 * Vertical drips with pooling drops, using accent color (with slight opacity for wet feel).
 */
const path: PathFn = (c) => (
  <>
    {/* drip 1: from left carapace edge down past hip */}
    <path
      d="M 72 90 Q 70 130 74 165 Q 72 195 76 220"
      fill="none"
      stroke={c.accent}
      strokeWidth="2.5"
      opacity="0.85"
    />
    <circle cx="76" cy="222" r="4" fill={c.accent} opacity="0.85" />
    {/* drip 2: from head down chest */}
    <path
      d="M 100 60 Q 98 110 102 155 Q 100 200 104 235"
      fill="none"
      stroke={c.accent}
      strokeWidth="2.5"
      opacity="0.85"
    />
    <circle cx="104" cy="237" r="4" fill={c.accent} opacity="0.85" />
    {/* drip 3: mirrored on the right */}
    <path
      d="M 128 90 Q 130 130 126 165 Q 128 195 124 220"
      fill="none"
      stroke={c.accent}
      strokeWidth="2.5"
      opacity="0.85"
    />
    <circle cx="124" cy="222" r="4" fill={c.accent} opacity="0.85" />
    {/* eroded patch on carapace — irregular blob */}
    <path
      d="M 82 100 Q 90 95 100 100 Q 95 110 85 108 Z"
      fill={c.accent}
      opacity="0.4"
    />
  </>
);

export default path;
