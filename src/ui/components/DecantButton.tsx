import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { styles } from '../styles';

interface Props {
  readonly label?: string;
  readonly variant?: 'header' | 'empty-cta';
}

export function DecantButton({ label = 'Decant a Morula', variant = 'header' }: Props): ReactElement {
  const decant = useColonyStore((s) => s.decant);
  const style = variant === 'empty-cta' ? styles.emptyStateCta : styles.decantButton;
  return (
    <button
      type="button"
      style={style}
      onClick={() => decant()}
      data-testid="decant-button"
    >
      {label}
    </button>
  );
}
