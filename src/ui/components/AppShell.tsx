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
              style={style}
              disabled={!unlocked}
              onClick={() => unlocked && props.onNavigate(id)}
              data-testid={`nav-tab-${id}`}
              title={!unlocked && unlocks[id].reason ? unlocks[id].reason : undefined}
            >
              {LABELS[id]}
            </button>
          );
        })}
      </nav>
      <StatusHud directiveText={props.directiveText} />
      {props.children}
    </>
  );
}
