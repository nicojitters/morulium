import type { PathFn } from '../registry';

/**
 * hide_plain — baseline: no pattern. Renders nothing.
 * Kept as a registered PathFn so the registry-completeness test passes.
 */
const path: PathFn = () => null;

export default path;
