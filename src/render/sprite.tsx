import type { ReactElement, ReactNode } from 'react';
import { LAYER_ORDER, SPRITE_VIEWBOX_STRING, ANCHORS, type Layer } from './layout';
import { resolvePalette } from './colors';
import { PATHS } from './paths/registry';

interface SpriteProps {
  readonly phenotype: Readonly<Record<string, string>>;
  readonly palette: string;
}

/**
 * Compose an SVG sprite from a phenotype. Iterates layers in draw order.
 * For hide_pattern, the pattern is passed to the carapace layer implicitly
 * via the phenotype map — carapace path fns may read phenotype.hide_pattern
 * if they want to overlay a pattern. For simplicity in Task 1's stub, we
 * only look up alleles for the layers in LAYER_ORDER.
 */
export function Sprite({ phenotype, palette }: SpriteProps): ReactElement {
  const colors = resolvePalette(palette);
  const layers: ReactNode[] = [];

  for (const layer of LAYER_ORDER) {
    const alleleId = phenotype[layer];
    if (!alleleId) continue; // no phenotype entry for this layer — skip
    const draw = PATHS[alleleId];
    if (!draw) {
      layers.push(<MissingArt key={layer} layer={layer} />);
      if (typeof console !== 'undefined') {
        console.warn(`[Sprite] missing PathFn for allele "${alleleId}" (layer ${layer})`);
      }
      continue;
    }
    layers.push(<g key={layer} data-layer={layer}>{draw(colors)}</g>);
  }

  return (
    <svg viewBox={SPRITE_VIEWBOX_STRING} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {layers}
    </svg>
  );
}

function MissingArt({ layer }: { readonly layer: Layer }): ReactElement {
  const anchor = layer === 'aberration' ? { x: 100, y: 140 } : ANCHORS[layer as keyof typeof ANCHORS];
  return (
    <text x={anchor.x} y={anchor.y} textAnchor="middle" fill="#999" fontSize="24" data-testid="missing-art">
      ?
    </text>
  );
}
