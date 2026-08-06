import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { REGIONS } from '../../sim/data/regions';
import { FRONTS } from '../../sim/data/fronts';
import { TERMS } from '../terms';
import { styles } from '../styles';
import { FirstVisitCallout } from '../components/FirstVisitCallout';

export function ConquestMap(): ReactElement {
  const fronts = useColonyStore((s) => s.fronts);
  const region = REGIONS['region-1'];
  const held = region.frontIds.filter((fid) => fronts[fid].captured);
  const flaring = region.frontIds.some((fid) => fronts[fid].flareStartedAt !== null);
  const conquered = held.length === region.frontIds.length && !flaring;

  return (
    <main style={styles.page} data-testid="conquest-map-screen">
      <FirstVisitCallout
        surface="conquest-map"
        title={TERMS.conquestMap}
        body="See what you hold and what remains."
        action="Launch an Incursion from the Incursion screen."
      />

      <div data-testid="region-header-region-1">
        <h1 style={styles.headerTitle}>{region.label}</h1>
        <p style={styles.headerSub}>{region.subtitle}</p>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '16px 0' }}>
        {region.frontIds.map((fid) => {
          const f = fronts[fid];
          const status = f.captured ? 'held' : f.cooldownUntil && f.cooldownUntil > Date.now() ? 'cooling' : 'available';
          return (
            <div
              key={fid}
              data-testid={`map-front-${fid}`}
              style={{
                minWidth: 200, padding: 12,
                border: `2px solid ${status === 'held' ? '#22c55e' : '#cbd5e1'}`,
                borderRadius: 8,
                background: status === 'held' ? '#f0fdf4' : '#ffffff',
              }}
            >
              <div style={{ fontWeight: 600 }}>{FRONTS[fid].label}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Status: {status}</div>
              {f.captured && (
                <div style={{ fontSize: 12, color: '#64748b' }}>Garrison: {f.garrison.length}</div>
              )}
              {f.hardening > 0 && (
                <div style={{ fontSize: 12, color: '#b45309' }}>Hardening: {f.hardening}</div>
              )}
              {f.flareStartedAt !== null && (
                <div style={{ fontSize: 12, color: '#b45309' }}>Flaring — reinforce</div>
              )}
            </div>
          );
        })}
      </div>

      <div data-testid="region-progress" style={{ fontSize: 14, marginTop: 12 }}>
        {conquered
          ? `${region.label} conquered.`
          : `${held.length} of ${region.frontIds.length} fronts held.`}
      </div>

      <p data-testid="region-footer" style={{ marginTop: 24, fontStyle: 'italic', color: '#64748b' }}>
        {region.label} is the first of many. Take it, hold it — then the next opens.
      </p>
    </main>
  );
}
