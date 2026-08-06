import type { ReactElement, ReactNode } from 'react';
import { useColonyStore } from '../../state/colony';
import { isUnlocked, type SurfaceId } from '../../state/unlocks';
import { TERMS } from '../terms';
import { styles } from '../styles';
import { TOKENS } from '../tokens';
import { StatusHud } from './StatusHud';

const REGISTER_BY_SURFACE: Readonly<Record<SurfaceId, 'lab' | 'conquest'>> = {
  'colony':       'lab',
  'dna-lab':      'lab',
  'breed':        'lab',
  'vivarium':     'lab',
  'vat':          'lab',
  'sequencer':    'lab',
  'registry':     'lab',
  'incursion':    'conquest',
  'conquest-map': 'conquest',
};

const ORDER: readonly SurfaceId[] = [
  'colony', 'dna-lab', 'breed', 'incursion',
  'conquest-map', 'vivarium', 'vat', 'sequencer', 'registry',
];

const LABELS: Readonly<Record<SurfaceId, string>> = {
  'colony':       TERMS.colony,
  'dna-lab':      TERMS.dnaLab,
  'breed':        TERMS.breed,
  'incursion':    TERMS.incursion,
  'conquest-map': TERMS.conquestMap,
  'vivarium':     TERMS.vivarium,
  'vat':          TERMS.vat,
  'sequencer':    TERMS.sequencer,
  'registry':     TERMS.registry,
};

const NAV_ICONS: Readonly<Record<SurfaceId, string>> = {
  'colony':       '/assets/pixellab/nav/colony.png',
  'dna-lab':      '/assets/pixellab/nav/dna_lab.png',
  'breed':        '/assets/pixellab/nav/breed.png',
  'incursion':    '/assets/pixellab/nav/incursion.png',
  'conquest-map': '/assets/pixellab/nav/conquest_map.png',
  'vivarium':     '/assets/pixellab/nav/vivarium.png',
  'vat':          '/assets/pixellab/nav/vat.png',
  'sequencer':    '/assets/pixellab/nav/sequencer.png',
  'registry':     '/assets/pixellab/nav/registry.png',
};

export function AppShell(props: {
  current: SurfaceId;
  onNavigate: (id: SurfaceId) => void;
  directiveText: string | null;
  children: ReactNode;
}): ReactElement {
  const unlocks = useColonyStore((s) => s.unlocks);

  return (
    <>
      <nav style={styles.nav}>
        {ORDER.map((id) => {
          const unlocked = isUnlocked(unlocks, id);
          const isCurrent = props.current === id;
          const style = !unlocked
            ? styles.navTabLocked
            : isCurrent
              ? {
                  ...styles.navTabActive,
                  borderBottomColor: REGISTER_BY_SURFACE[id] === 'conquest' ? TOKENS.rust : TOKENS.teal,
                }
              : styles.navTab;
          return (
            <button
              key={id}
              type="button"
              style={{ ...style, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              disabled={!unlocked}
              onClick={() => unlocked && props.onNavigate(id)}
              data-testid={`nav-tab-${id}`}
              title={!unlocked && unlocks[id].reason ? unlocks[id].reason : undefined}
            >
              <img
                src={NAV_ICONS[id]}
                alt=""
                width={16}
                height={16}
                style={{ imageRendering: 'pixelated', display: 'block', opacity: unlocked ? 1 : 0.4 }}
                draggable={false}
              />
              {LABELS[id]}
              {!unlocked && (
                <img
                  src="/assets/pixellab/nav/locked.png"
                  alt=""
                  width={12}
                  height={12}
                  style={{ imageRendering: 'pixelated', display: 'block' }}
                  draggable={false}
                />
              )}
            </button>
          );
        })}
      </nav>
      <StatusHud directiveText={props.directiveText} />
      {props.children}
    </>
  );
}
