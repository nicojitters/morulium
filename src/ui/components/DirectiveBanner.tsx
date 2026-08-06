import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { directiveById } from '../../state/directives';
import { styles } from '../styles';

export function DirectiveBanner(): ReactElement | null {
  const id = useColonyStore((s) => s.activeDirectiveId);
  if (id === null) return null;
  const d = directiveById(id);
  return (
    <div style={styles.directiveBanner} data-testid="directive-banner">
      <div style={styles.directiveTitle}>{d.title}</div>
      <div style={styles.directiveHint}>{d.hint}</div>
    </div>
  );
}
