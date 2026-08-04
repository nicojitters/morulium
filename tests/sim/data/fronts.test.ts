import { describe, it, expect } from 'vitest';
import { FRONTS } from '../../../src/sim/data/fronts';
import type { FrontId } from '../../../src/sim/data/fronts';

describe('FRONTS', () => {
  it('has exactly 3 entries with the expected ids', () => {
    const ids = Object.keys(FRONTS).sort();
    expect(ids).toEqual(['guerrilla', 'infrastructure', 'military']);
  });

  it('every front has exactly 2 required stats', () => {
    for (const id of Object.keys(FRONTS) as FrontId[]) {
      const stats = Object.values(FRONTS[id].requirements).filter((r) => r !== undefined);
      expect(stats).toHaveLength(2);
    }
  });

  it('every front has weights summing to 1.0', () => {
    for (const id of Object.keys(FRONTS) as FrontId[]) {
      const reqs = Object.values(FRONTS[id].requirements).filter((r) => r !== undefined);
      const sum = reqs.reduce((acc, r) => acc + r!.weight, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it('every front has non-empty flavor blurbs', () => {
    for (const id of Object.keys(FRONTS) as FrontId[]) {
      const f = FRONTS[id].flavor;
      expect(f.launchBlurb.length).toBeGreaterThan(0);
      expect(f.winBlurb.length).toBeGreaterThan(0);
      expect(f.failBlurb.length).toBeGreaterThan(0);
    }
  });

  it('every front has a label and id that agrees with the map key', () => {
    for (const id of Object.keys(FRONTS) as FrontId[]) {
      expect(FRONTS[id].id).toBe(id);
      expect(FRONTS[id].label.length).toBeGreaterThan(0);
    }
  });

  it('front stats match the spec-locked profile', () => {
    // Spec: Infra=INT/SPD, Mil=PWR/VIT, Guer=GUI/SPD
    expect(FRONTS.infrastructure.requirements.INT).toBeDefined();
    expect(FRONTS.infrastructure.requirements.SPD).toBeDefined();
    expect(FRONTS.military.requirements.PWR).toBeDefined();
    expect(FRONTS.military.requirements.VIT).toBeDefined();
    expect(FRONTS.guerrilla.requirements.GUI).toBeDefined();
    expect(FRONTS.guerrilla.requirements.SPD).toBeDefined();
  });
});
