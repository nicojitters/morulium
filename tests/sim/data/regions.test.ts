import { describe, it, expect } from 'vitest';
import { REGIONS, REGION_ORDER, regionOf } from '../../../src/sim/data/regions';
import { FRONTS } from '../../../src/sim/data/fronts';

describe('regions', () => {
  it('REGION_ORDER has region-1 first', () => {
    expect(REGION_ORDER[0]).toBe('region-1');
  });

  it('Region 1 wraps all three existing fronts', () => {
    expect(REGIONS['region-1'].frontIds).toEqual(['infrastructure','military','guerrilla']);
  });

  it('regionOf returns region-1 for every front', () => {
    for (const fid of Object.keys(FRONTS)) {
      expect(regionOf(fid as keyof typeof FRONTS)).toBe('region-1');
    }
  });

  it('every FrontProfile carries a regionId', () => {
    for (const p of Object.values(FRONTS)) {
      expect(p.regionId).toBe('region-1');
    }
  });
});
