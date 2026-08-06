import type { ReactElement, CSSProperties } from 'react';
import wordmarkSrc from '../../assets/wordmark.png';

type WordmarkSize = 'hero' | 'nav';

const SIZES: Readonly<Record<WordmarkSize, { width: number; height: number }>> = {
  hero: { width: 344, height: 192 }, // 1x source — pixel-perfect
  nav:  { width: 172, height: 96  }, // 0.5x — still integer nearest-neighbor
};

const BASE_STYLE: CSSProperties = {
  imageRendering: 'pixelated',
  display: 'block',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

export function Wordmark(props: {
  size: WordmarkSize;
  style?: CSSProperties;
  className?: string;
  alt?: string;
}): ReactElement {
  const dims = SIZES[props.size];
  return (
    <img
      src={wordmarkSrc}
      width={dims.width}
      height={dims.height}
      style={{ ...BASE_STYLE, ...props.style }}
      className={props.className}
      alt={props.alt ?? 'Morulium'}
      draggable={false}
      data-testid="wordmark"
    />
  );
}
