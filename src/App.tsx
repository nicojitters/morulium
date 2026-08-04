import { useState, type ReactElement } from 'react';
import { Colony } from './ui/screens/Colony';
import { Breed } from './ui/screens/Breed';
import { Incursion } from './ui/screens/Incursion';
import { SerumBadge } from './ui/components/SerumBadge';
import { styles } from './ui/styles';

type Tab = 'colony' | 'breed' | 'incursion';

export function App(): ReactElement {
  const [tab, setTab] = useState<Tab>('colony');

  const active = (t: Tab) => (tab === t ? styles.navTabActive : styles.navTab);

  return (
    <>
      <nav style={styles.nav}>
        <button
          type="button"
          style={active('colony')}
          onClick={() => setTab('colony')}
          data-testid="nav-tab-colony"
        >
          Colony
        </button>
        <button
          type="button"
          style={active('breed')}
          onClick={() => setTab('breed')}
          data-testid="nav-tab-breed"
        >
          Breed
        </button>
        <button
          type="button"
          style={active('incursion')}
          onClick={() => setTab('incursion')}
          data-testid="nav-tab-incursion"
        >
          Incursion
        </button>
        <SerumBadge />
      </nav>
      {tab === 'colony' && <Colony />}
      {tab === 'breed' && <Breed />}
      {tab === 'incursion' && <Incursion />}
    </>
  );
}
