// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useColonyStore } from '../../src/state/colony';

describe('fastForwardMs', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });

  it('one hour of garrisoned time earns 5 SR per garrisoned unit', () => {
    // seed a garrisoned unit
    useColonyStore.setState({
      units: [{
        id: 1, seed: 1, decantedAt: 0, genome: { loci: {} },
        generation: 0, parentIds: null, wear: {}, restCurrent: 100,
        injuredUntil: null, culled: false,
      }],
      nextId: 2,
      fronts: {
        infrastructure: { captured: true, cooldownUntil: null, garrison: [1], flareStartedAt: null, hardening: 0 },
        military: { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
        guerrilla: { captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 },
      },
    });
    const beforeSerum = useColonyStore.getState().serum;
    useColonyStore.getState().fastForwardMs(3_600_000);
    expect(useColonyStore.getState().serum).toBe(beforeSerum + 5);
  });
});
