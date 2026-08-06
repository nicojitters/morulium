import type { ReactElement } from 'react';
import { styles } from '../styles';
import { TERMS } from '../terms';

export function ConquestMap(): ReactElement {
  return (
    <main style={styles.page} data-testid="conquest-map-screen">
      <h1 style={styles.headerTitle}>{TERMS.conquestMap}</h1>
      <p style={styles.headerSub}>
        The map view of the fronts you can pressure and hold. The full map lands in a later step;
        for now, launch Incursions from the {TERMS.incursion} screen.
      </p>
    </main>
  );
}
