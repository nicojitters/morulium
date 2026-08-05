import { describe, it, expect } from 'vitest';
import {
  COLONY_CAP_BASE,
  COLONY_CAP_BARRACKS,
  BARRACKS_COST_SERUM,
  MEDBAY_COST_SERUM,
  REST_REGEN_PER_HOUR,
  INJURY_DURATION_MEDBAY_MS,
} from '../../src/state/vivarium';
import { INJURY_DURATION_MS } from '../../src/state/rest';

describe('Vivarium constants', () => {
  it('COLONY_CAP_BASE = 20', () => {
    expect(COLONY_CAP_BASE).toBe(20);
  });

  it('COLONY_CAP_BARRACKS = 40', () => {
    expect(COLONY_CAP_BARRACKS).toBe(40);
  });

  it('COLONY_CAP_BARRACKS is exactly double COLONY_CAP_BASE', () => {
    expect(COLONY_CAP_BARRACKS).toBe(COLONY_CAP_BASE * 2);
  });

  it('BARRACKS_COST_SERUM = 500', () => {
    expect(BARRACKS_COST_SERUM).toBe(500);
  });

  it('MEDBAY_COST_SERUM = 300', () => {
    expect(MEDBAY_COST_SERUM).toBe(300);
  });

  it('REST_REGEN_PER_HOUR = 10', () => {
    expect(REST_REGEN_PER_HOUR).toBe(10);
  });

  it('INJURY_DURATION_MEDBAY_MS = 30 minutes', () => {
    expect(INJURY_DURATION_MEDBAY_MS).toBe(30 * 60 * 1000);
  });

  it('INJURY_DURATION_MEDBAY_MS is half of the base INJURY_DURATION_MS', () => {
    expect(INJURY_DURATION_MEDBAY_MS * 2).toBe(INJURY_DURATION_MS);
  });
});
