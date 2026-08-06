import { useState, type ReactElement } from 'react';
import type { SurfaceId } from './state/unlocks';
import { useColonyStore } from './state/colony';
import { STORAGE_KEY } from './state/persist';
import { AppShell } from './ui/components/AppShell';
import { AwaySummary } from './ui/components/AwaySummary';
import { NewGameGate } from './ui/screens/NewGameGate';
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
  const [bootPassed, setBootPassed] = useState<boolean>(false);
  const resetGame = useColonyStore((s) => s.resetGame);

  if (!bootPassed) {
    const hasExistingSave = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== null;
    return (
      <NewGameGate
        hasExistingSave={hasExistingSave}
        onContinue={() => setBootPassed(true)}
        onNewGame={() => { resetGame(); setBootPassed(true); }}
      />
    );
  }

  const screen = (() => {
    switch (current) {
      case 'colony':       return <Colony />;
      case 'dna-lab':      return <DNALab />;
      case 'breed':        return <Breed />;
      case 'incursion':    return <Incursion />;
      case 'conquest-map': return <ConquestMap />;
      case 'vivarium':     return <Vivarium />;
      case 'vat':          return <Vat />;
      case 'sequencer':    return <Registry />;
      case 'registry':     return <Registry />;
    }
  })();

  return (
    <>
      <AppShell current={current} onNavigate={setCurrent} directiveText={null}>
        {screen}
      </AppShell>
      <AwaySummary />
    </>
  );
}
