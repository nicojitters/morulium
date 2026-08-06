import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { DEFINITIONS, type TermKey } from '../definitions';
import { TERMS } from '../terms';
import { styles } from '../styles';
import { TOKENS } from '../tokens';
import { FirstVisitCallout } from '../components/FirstVisitCallout';

const VOCAB: readonly TermKey[] = [
  'morula','decant','harvest','incursion','occupation','vat','dnaLab',
  'sequencer','registry','colony','vivarium','serum','freeDecant','generation',
];

const TIERS: readonly TermKey[] = [
  'tier-baseline','tier-strain','tier-mutant','tier-chimera','tier-progenitor',
];

const TERM_LABELS: Readonly<Record<TermKey, string>> = {
  morula:           TERMS.morula,
  decant:           TERMS.decant,
  harvest:          TERMS.harvest,
  incursion:        TERMS.incursion,
  occupation:       TERMS.occupation,
  vat:              TERMS.vat,
  dnaLab:           TERMS.dnaLab,
  sequencer:        TERMS.sequencer,
  registry:         TERMS.registry,
  colony:           TERMS.colony,
  vivarium:         TERMS.vivarium,
  serum:            TERMS.serum,
  freeDecant:       TERMS.freeDecant,
  generation:       TERMS.generation,
  'tier-baseline':  TERMS.tiers.baseline,
  'tier-strain':    TERMS.tiers.strain,
  'tier-mutant':    TERMS.tiers.mutant,
  'tier-chimera':   TERMS.tiers.chimera,
  'tier-progenitor':TERMS.tiers.progenitor,
};

function Row(props: { termKey: TermKey; discovered: boolean }) {
  return (
    <li data-testid={`registry-row-${props.termKey}`} style={{ padding: '6px 0', borderBottom: `1px solid ${TOKENS.tealDeep}`, fontFamily: TOKENS.fontMono, fontSize: 13, color: TOKENS.inkSecondary }}>
      {props.discovered ? (
        <>
          <strong style={{ color: TOKENS.inkLab, fontFamily: TOKENS.fontDisplay, letterSpacing: '0.04em' }}>{TERM_LABELS[props.termKey]}</strong>
          {' — '}
          {DEFINITIONS[props.termKey]}
        </>
      ) : (
        <span style={{ color: TOKENS.inkDim }}>??? — locked</span>
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
    <main style={styles.page} data-register="lab" data-testid="registry-screen">
      <FirstVisitCallout
        surface="registry"
        title={TERMS.registry}
        body="Everything you have met."
        action="Nothing to do here yet."
      />
      <h1 className="text-stamp" style={styles.headerTitle}>{TERMS.registry}</h1>

      <section data-testid="registry-vocab" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 14, fontFamily: TOKENS.fontDisplay, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: TOKENS.inkSecondary, borderBottom: `1px solid ${TOKENS.tealDeep}`, paddingBottom: 6, marginBottom: 4 }}>Vocabulary</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {VOCAB.map((k) => (
            <Row key={k} termKey={k} discovered={discovered[k] === true} />
          ))}
        </ul>
      </section>

      <section data-testid="registry-tiers" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 14, fontFamily: TOKENS.fontDisplay, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: TOKENS.inkSecondary, borderBottom: `1px solid ${TOKENS.tealDeep}`, paddingBottom: 6, marginBottom: 4 }}>Tiers</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {TIERS.map((k) => (
            <Row key={k} termKey={k} discovered={discovered[k] === true} />
          ))}
        </ul>
      </section>

      <section data-testid="registry-stats" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 14, fontFamily: TOKENS.fontDisplay, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: TOKENS.inkSecondary, borderBottom: `1px solid ${TOKENS.tealDeep}`, paddingBottom: 6, marginBottom: 4 }}>Your record</h2>
        <ul style={{ listStyle: 'none', padding: 0, fontFamily: TOKENS.fontMono, fontSize: 13, color: TOKENS.inkSecondary }}>
          <li style={{ padding: '6px 0', borderBottom: `1px solid ${TOKENS.tealDeep}` }}>Specimens Decanted: <span style={{ color: TOKENS.inkLab }}>{decanted}</span></li>
          <li style={{ padding: '6px 0', borderBottom: `1px solid ${TOKENS.tealDeep}` }}>Specimens bred: <span style={{ color: TOKENS.inkLab }}>{bred}</span></li>
          <li style={{ padding: '6px 0', borderBottom: `1px solid ${TOKENS.tealDeep}` }}>Fronts held: <span style={{ color: TOKENS.inkLab }}>{held}</span></li>
          <li style={{ padding: '6px 0' }}>{TERMS.serumAbbr} on hand: <span style={{ color: TOKENS.inkLab }}>{serum}</span></li>
        </ul>
      </section>
    </main>
  );
}
