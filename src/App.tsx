import { useState, type ReactElement } from 'react';
import type { SurfaceId } from './state/unlocks';
import { useColonyStore } from './state/colony';
import { STORAGE_KEY } from './state/persist';
import { AppShell } from './ui/components/AppShell';
import { AwaySummary } from './ui/components/AwaySummary';
import { IntroModal } from './ui/components/IntroModal';
import { DirectiveBanner } from './ui/components/DirectiveBanner';
import { RewardToast } from './ui/components/RewardToast';
import { UnlockedToast } from './ui/components/UnlockedToast';
import { ActionToast } from './ui/components/ActionToast';
import { directiveById } from './state/directives';
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
  const firstRunComplete = useColonyStore((s) => s.firstRunComplete);
  const markFirstRunComplete = useColonyStore((s) => s.markFirstRunComplete);
  const activeId = useColonyStore((s) => s.activeDirectiveId);
  const directiveText = activeId === null ? null : directiveById(activeId).title;

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
      <AppShell current={current} onNavigate={setCurrent} directiveText={directiveText}>
        <DirectiveBanner />
        {screen}
      </AppShell>
      {!firstRunComplete && <IntroModal onDone={markFirstRunComplete} />}
      <AwaySummary />
      <RewardToast />
      <UnlockedToast />
      <ActionToast />
    </>
  );
}
