import { useState, type ReactElement } from 'react';
import type { SurfaceId } from './state/unlocks';
import { AppShell } from './ui/components/AppShell';
import { Colony } from './ui/screens/Colony';
import { DNALab } from './ui/screens/DNALab';
import { Breed } from './ui/screens/Breed';
import { Incursion } from './ui/screens/Incursion';
import { ConquestMap } from './ui/screens/ConquestMap';
import { Vivarium } from './ui/screens/Vivarium';
import { Vat } from './ui/screens/Vat';
import { Registry } from './ui/screens/Registry';

export function App(): ReactElement {
  const [current, setCurrent] = useState<SurfaceId>('colony');

  const screen = (() => {
    switch (current) {
      case 'colony':       return <Colony />;
      case 'dna-lab':      return <DNALab />;
      case 'breed':        return <Breed />;
      case 'incursion':    return <Incursion />;
      case 'conquest-map': return <ConquestMap />;
      case 'vivarium':     return <Vivarium />;
      case 'vat':          return <Vat />;
      case 'sequencer':    return <Registry />;   // temporary until deferred model change
      case 'registry':     return <Registry />;
    }
  })();

  return (
    <AppShell current={current} onNavigate={setCurrent} directiveText={null}>
      {screen}
    </AppShell>
  );
}
