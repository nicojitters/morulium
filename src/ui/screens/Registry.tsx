import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { DEFINITIONS, type TermKey } from '../definitions';
import { TERMS } from '../terms';
import { styles } from '../styles';
import { FirstVisitCallout } from '../components/FirstVisitCallout';

const VOCAB: readonly TermKey[] = [
  'morula','decant','harvest','incursion','occupation','vat','dnaLab',
  'sequencer','registry','colony','vivarium','serum','freeDecant','generation',
];

const TIERS: readonly TermKey[] = [
  'tier-baseline','tier-strain','tier-mutant','tier-chimera','tier-progenitor',
];

function Row(props: { termKey: TermKey; discovered: boolean }) {
  return (
    <li data-testid={`registry-row-${props.termKey}`} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
      {props.discovered ? (
        <>
          <strong>{props.termKey}</strong> — {DEFINITIONS[props.termKey]}
        </>
      ) : (
        <span style={{ color: '#94a3b8' }}>??? — locked</span>
      )}
    </li>
  );
}

export function Registry(): ReactElement {
  const discovered = useColonyStore((s) => s.discoveredTerms);
  const units = useColonyStore((s) => s.units);
  const fronts = useColonyStore((s) => s.fronts);
  const serum = useColonyStore((s) => s.serum);

  const bred = units.filter((u) => u.parentIds !== null).length;
  const decanted = units.length - bred;
  const held = Object.values(fronts).filter((f) => f.captured).length;

  return (
    <main style={styles.page} data-testid="registry-screen">
      <FirstVisitCallout
        surface="registry"
        title={TERMS.registry}
        body="Everything you have met."
        action="Nothing to do here yet."
      />
      <h1 style={styles.headerTitle}>{TERMS.registry}</h1>

      <section data-testid="registry-vocab" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16 }}>Vocabulary</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {VOCAB.map((k) => (
            <Row key={k} termKey={k} discovered={discovered[k] === true} />
          ))}
        </ul>
      </section>

      <section data-testid="registry-tiers" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Tiers</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {TIERS.map((k) => (
            <Row key={k} termKey={k} discovered={discovered[k] === true} />
          ))}
        </ul>
      </section>

      <section data-testid="registry-stats" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Your record</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>Specimens Decanted: {decanted}</li>
          <li>Specimens bred: {bred}</li>
          <li>Fronts held: {held}</li>
          <li>{TERMS.serumAbbr} on hand: {serum}</li>
        </ul>
      </section>
    </main>
  );
}
