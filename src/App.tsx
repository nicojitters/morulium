import { useState, type ReactElement } from 'react';
import { Colony } from './ui/screens/Colony';
import { Breed } from './ui/screens/Breed';
import { styles } from './ui/styles';

type Tab = 'colony' | 'breed';

export function App(): ReactElement {
  const [tab, setTab] = useState<Tab>('colony');

  return (
    <>
      <nav style={styles.nav}>
        <button
          type="button"
          style={tab === 'colony' ? styles.navTabActive : styles.navTab}
          onClick={() => setTab('colony')}
          data-testid="nav-tab-colony"
        >
          Colony
        </button>
        <button
          type="button"
          style={tab === 'breed' ? styles.navTabActive : styles.navTab}
          onClick={() => setTab('breed')}
          data-testid="nav-tab-breed"
        >
          Breed
        </button>
      </nav>
      {tab === 'colony' ? <Colony /> : <Breed />}
    </>
  );
}
