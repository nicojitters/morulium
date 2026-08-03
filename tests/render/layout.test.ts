import { describe, it, expect } from 'vitest';
import { SPRITE_VIEWBOX, SPRITE_VIEWBOX_STRING, ANCHORS, LAYER_ORDER } from '../../src/render/layout';

describe('sprite layout constants', () => {
  it('viewBox is 200 x 280', () => {
    expect(SPRITE_VIEWBOX.width).toBe(200);
    expect(SPRITE_VIEWBOX.height).toBe(280);
    expect(SPRITE_VIEWBOX_STRING).toBe('0 0 200 280');
  });

  it('anchors are x=100 (centered)', () => {
    for (const a of Object.values(ANCHORS)) {
      expect(a.x).toBe(100);
    }
  });

  it('layer order matches spec (bottom→top: loco→carapace→appendage→head→eyes→aberration)', () => {
    expect([...LAYER_ORDER]).toEqual([
      'locomotion', 'carapace', 'appendage', 'head', 'eyes', 'aberration',
    ]);
  });
});
