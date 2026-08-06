import type { ReactElement } from 'react';
import { styles } from '../styles';
import { TERMS } from '../terms';
import { FirstVisitCallout } from '../components/FirstVisitCallout';

export function ConquestMap(): ReactElement {
  return (
    <main style={styles.page} data-testid="conquest-map-screen">
      <FirstVisitCallout surface="conquest-map" title="Conquest Map" body="See what you hold and what remains." action="Launch an Incursion from the Incursion screen." />
      <h1 style={styles.headerTitle}>{TERMS.conquestMap}</h1>
      <p style={styles.headerSub}>
        The map view of the fronts you can pressure and hold. The full map lands in a later step;
        for now, launch Incursions from the {TERMS.incursion} screen.
      </p>
    </main>
  );
}
