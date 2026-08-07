import { useId, type ReactElement, type ReactNode } from 'react';
import { LAYER_ORDER, SPRITE_VIEWBOX_STRING, SPRITE_VIEWBOX, ANCHORS, type Layer } from './layout';
import { SPRITE_MANIFEST, INTENTIONALLY_EMPTY } from './sprite-manifest.generated';

interface SpriteProps {
  readonly phenotype: Readonly<Record<string, string>>;
  readonly palette: string;
}

const TRAITS_BASE = '/assets/pixellab/traits-computed';

function assetUrl(alleleId: string, paletteId: string): string {
  return `${TRAITS_BASE}/${alleleId}_${paletteId}.png`;
}

function anchorFor(layer: Layer): { x: number; y: number } {
  // 'aberration' has no ANCHORS entry — spec keeps it visually at the appendage anchor.
  if (layer === 'aberration') return { x: 100, y: 140 };
  return ANCHORS[layer as keyof typeof ANCHORS];
}

/**
 * Compose an SVG sprite from PNG parts. Each layer emits an <image> translated
 * so the part's bbox center (per src/render/sprite-manifest.generated.ts) lands
 * on its layer anchor. hide_pattern is drawn masked to the carapace alpha at
 * reduced opacity so it reads as texture on the torso, not full-canvas paint.
 */
export function Sprite({ phenotype, palette }: SpriteProps): ReactElement {
  const maskUid = useId();
  const defs: ReactNode[] = [];
  const layers: ReactNode[] = [];

  let carapaceOffset: { dx: number; dy: number } | null = null;
  let carapaceAllele: string | null = null;

  for (const layer of LAYER_ORDER) {
    const alleleId = phenotype[layer];
    if (!alleleId) continue;

    if (INTENTIONALLY_EMPTY.has(alleleId)) continue;

    const entry = SPRITE_MANIFEST[alleleId];
    if (!entry) {
      layers.push(<MissingArt key={layer} layer={layer} />);
      if (typeof console !== 'undefined') {
        console.warn(`[Sprite] missing manifest entry for allele "${alleleId}" (layer ${layer})`);
      }
      continue;
    }

    const anchor = anchorFor(layer);
    const dx = anchor.x - entry.cx;
    const dy = anchor.y - entry.cy;

    layers.push(
      <image
        key={layer}
        data-layer={layer}
        href={assetUrl(alleleId, palette)}
        x={dx}
        y={dy}
        width={SPRITE_VIEWBOX.width}
        height={SPRITE_VIEWBOX.height}
        style={{ imageRendering: 'pixelated' } as React.CSSProperties}
      />,
    );

    if (layer === 'carapace') {
      carapaceOffset = { dx, dy };
      carapaceAllele = alleleId;

      const hideId = phenotype['hide_pattern'];
      if (!hideId || INTENTIONALLY_EMPTY.has(hideId)) continue;
      const hideEntry = SPRITE_MANIFEST[hideId];
      if (!hideEntry) {
        layers.push(<MissingArt key="hide_pattern" layer={'carapace' as Layer} />);
        if (typeof console !== 'undefined') {
          console.warn(`[Sprite] missing manifest entry for hide_pattern allele "${hideId}"`);
        }
        continue;
      }

      // Position the hide pattern at the SAME offset as the carapace so its
      // canvas aligns with the torso. Mask to the carapace's alpha silhouette.
      const maskId = `${maskUid}-cara`;
      defs.push(
        <mask
          key={maskId}
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={SPRITE_VIEWBOX.width}
          height={SPRITE_VIEWBOX.height}
        >
          <image
            href={assetUrl(carapaceAllele, palette)}
            x={carapaceOffset.dx}
            y={carapaceOffset.dy}
            width={SPRITE_VIEWBOX.width}
            height={SPRITE_VIEWBOX.height}
          />
        </mask>,
      );
      layers.push(
        <image
          key="hide_pattern"
          data-layer="hide_pattern"
          href={assetUrl(hideId, palette)}
          x={carapaceOffset.dx}
          y={carapaceOffset.dy}
          width={SPRITE_VIEWBOX.width}
          height={SPRITE_VIEWBOX.height}
          mask={`url(#${maskId})`}
          opacity={0.6}
          style={{ imageRendering: 'pixelated' } as React.CSSProperties}
        />,
      );
    }
  }

  return (
    <svg viewBox={SPRITE_VIEWBOX_STRING} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {defs.length > 0 && <defs>{defs}</defs>}
      {layers}
    </svg>
  );
}

function MissingArt({ layer }: { readonly layer: Layer }): ReactElement {
  const anchor = anchorFor(layer);
  return (
    <text x={anchor.x} y={anchor.y} textAnchor="middle" fill="#999" fontSize="24" data-testid="missing-art">
      ?
    </text>
  );
}
