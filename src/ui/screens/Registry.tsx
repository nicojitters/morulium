import type { ReactElement } from 'react';
import { styles } from '../styles';
import { TERMS } from '../terms';

export function Registry(): ReactElement {
  return (
    <main style={styles.page} data-testid="registry-screen">
      <h1 style={styles.headerTitle}>{TERMS.registry}</h1>
      <p style={styles.headerSub}>
        {TERMS.registry} catalogs the vocabulary and history you have encountered so far.
        It will fill in as you play.
      </p>
    </main>
  );
}
