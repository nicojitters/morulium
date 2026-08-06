import { describe, it, expect } from 'vitest';
import { CHAIN, STANDING, nextInChain, completesFrom, directiveById } from '../../src/state/directives';

describe('directives — chain order', () => {
  it('CHAIN has the 7 authored steps in the documented order', () => {
    expect(CHAIN.map((d) => d.id)).toEqual([
      'decant-first', 'inspect-first', 'decant-second',
      'launch-first-incursion', 'collect-first-reward',
      'station-on-occupation', 'try-a-breed',
    ]);
  });

  it('nextInChain walks the chain then falls off', () => {
    expect(nextInChain(null)).toBe('decant-first');
    expect(nextInChain('decant-first')).toBe('inspect-first');
    expect(nextInChain('try-a-breed')).toBeNull();
  });

  it('STANDING is non-empty and disjoint from CHAIN ids', () => {
    expect(STANDING.length).toBeGreaterThan(0);
    const chainIds = new Set(CHAIN.map((d) => d.id));
    for (const s of STANDING) expect(chainIds.has(s.id)).toBe(false);
  });
});

describe('directives — completesFrom matcher', () => {
  it('decant-first completes on decant', () => {
    expect(completesFrom('decant-first', { kind: 'decant' })).toBe(true);
    expect(completesFrom('decant-first', { kind: 'breed' })).toBe(false);
  });

  it('inspect-first completes on any DNA Lab detail view', () => {
    expect(completesFrom('inspect-first', { kind: 'view-dna-lab-detail', unitId: 1 })).toBe(true);
  });

  it('launch-first-incursion completes on incursion-launched', () => {
    expect(completesFrom('launch-first-incursion', { kind: 'incursion-launched' })).toBe(true);
  });

  it('collect-first-reward completes only on a WON resolution with rewardCollected', () => {
    expect(completesFrom('collect-first-reward', { kind: 'incursion-resolved', outcome: 'won', rewardCollected: true })).toBe(true);
    expect(completesFrom('collect-first-reward', { kind: 'incursion-resolved', outcome: 'lost', rewardCollected: true })).toBe(false);
    expect(completesFrom('collect-first-reward', { kind: 'incursion-resolved', outcome: 'won', rewardCollected: false })).toBe(false);
  });

  it('station-on-occupation completes on garrison-assigned', () => {
    expect(completesFrom('station-on-occupation', { kind: 'garrison-assigned' })).toBe(true);
  });

  it('try-a-breed completes on breed', () => {
    expect(completesFrom('try-a-breed', { kind: 'breed' })).toBe(true);
  });

  it('directiveById round-trips both CHAIN and STANDING', () => {
    for (const d of [...CHAIN, ...STANDING]) {
      expect(directiveById(d.id)).toEqual(d);
    }
  });
});
