import type { PathFn } from '../registry';

/**
 * eyes_multi — compound eyes. 5 small dots clustered on each side.
 */
const path: PathFn = (c) => (
  <>
    {/* left cluster (5 dots) */}
    <circle cx="86" cy="38" r="1.6" fill={c.accent} />
    <circle cx="91" cy="37" r="1.6" fill={c.accent} />
    <circle cx="88" cy="42" r="1.6" fill={c.accent} />
    <circle cx="93" cy="41" r="1.6" fill={c.accent} />
    <circle cx="89" cy="45" r="1.6" fill={c.accent} />
    {/* right cluster mirrored */}
    <circle cx="114" cy="38" r="1.6" fill={c.accent} />
    <circle cx="109" cy="37" r="1.6" fill={c.accent} />
    <circle cx="112" cy="42" r="1.6" fill={c.accent} />
    <circle cx="107" cy="41" r="1.6" fill={c.accent} />
    <circle cx="111" cy="45" r="1.6" fill={c.accent} />
  </>
);

export default path;
