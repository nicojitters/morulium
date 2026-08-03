// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Sprite } from '../../src/render/sprite';

// One archetype per tier. Genomes are constructed to specifically hit each tier
// under the current tierForScore thresholds (basicMax=2, variantMax=4, adaptedMax=5, evolvedMax=11).
const ARCHETYPES: Array<{ tier: string; phenotype: Record<string, string>; palette: string }> = [
  {
    tier: 'baseline',
    phenotype: {
      head: 'head_plain', carapace: 'cara_bare', locomotion: 'loco_plain',
      appendage: 'app_none', eyes: 'eyes_plain', hide_pattern: 'hide_plain',
      aberration: 'ab_none',
    },
    palette: 'pal_ash',
  },
  {
    tier: 'strain',
    phenotype: {
      head: 'head_mandible', carapace: 'cara_chitin', locomotion: 'loco_plain',
      appendage: 'app_lash', eyes: 'eyes_bright', hide_pattern: 'hide_plain',
      aberration: 'ab_none',
    },
    palette: 'pal_rust',
  },
  {
    tier: 'mutant',
    phenotype: {
      head: 'head_maw', carapace: 'cara_chitin', locomotion: 'loco_sprint',
      appendage: 'app_stinger', eyes: 'eyes_multi', hide_pattern: 'hide_spotted',
      aberration: 'ab_none',
    },
    palette: 'pal_moss',
  },
  {
    tier: 'chimera',
    phenotype: {
      head: 'head_sensor', carapace: 'cara_bone', locomotion: 'loco_burrow',
      appendage: 'app_spinneret', eyes: 'eyes_singular', hide_pattern: 'hide_striped',
      aberration: 'ab_voltaic',
    },
    palette: 'pal_bloom',
  },
  {
    tier: 'progenitor',
    phenotype: {
      head: 'head_maw', carapace: 'cara_bone', locomotion: 'loco_sprint',
      appendage: 'app_stinger', eyes: 'eyes_multi', hide_pattern: 'hide_luminescent',
      aberration: 'ab_corrosive',
    },
    palette: 'pal_bloom',
  },
];

describe('Sprite snapshots (5 tier archetypes)', () => {
  for (const a of ARCHETYPES) {
    it(`renders ${a.tier} archetype`, () => {
      const { container } = render(<Sprite phenotype={a.phenotype} palette={a.palette} />);
      expect(container.innerHTML).toMatchSnapshot();
    });
  }

  it('unknown allele triggers MissingArt fallback', () => {
    const { getByTestId } = render(
      <Sprite phenotype={{ head: 'head_nonexistent' }} palette="pal_ash" />,
    );
    expect(getByTestId('missing-art')).toBeDefined();
  });
});
