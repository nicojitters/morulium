import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { REGIONS } from '../../sim/data/regions';
import { FRONTS } from '../../sim/data/fronts';
import { TERMS } from '../terms';
import { styles } from '../styles';
import { TOKENS } from '../tokens';
import { FirstVisitCallout } from '../components/FirstVisitCallout';

export function ConquestMap(): ReactElement {
  const fronts = useColonyStore((s) => s.fronts);
  const region = REGIONS['region-1'];
  const held = region.frontIds.filter((fid) => fronts[fid].captured);
  const flaring = region.frontIds.some((fid) => fronts[fid].flareStartedAt !== null);
  const conquered = held.length === region.frontIds.length && !flaring;

  return (
    <main style={styles.page} data-register="conquest" data-testid="conquest-map-screen">
      <FirstVisitCallout
        surface="conquest-map"
        title={TERMS.conquestMap}
        body="See what you hold and what remains."
        action="Launch an Incursion from the Incursion screen."
      />

      <div data-testid="region-header-region-1">
        <h1 className="text-stamp" style={{ fontSize: 28, marginBottom: 4 }}>
          REGION I — {region.label}
        </h1>
        <p style={styles.headerSub}>{region.subtitle}</p>
      </div>

      <img
        src="/assets/pixellab/conquest/region1_map.png"
        alt=""
        style={{ imageRendering: 'pixelated', width: '100%', maxWidth: 800, height: 'auto', display: 'block', margin: '12px 0', borderRadius: 4 }}
        draggable={false}
      />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '16px 0' }}>
        {region.frontIds.map((fid) => {
          const f = fronts[fid];
          const status = f.captured ? 'held' : f.cooldownUntil && f.cooldownUntil > Date.now() ? 'cooling' : 'available';
          const isCaptured = status === 'held';
          return (
            <div
              key={fid}
              data-testid={`map-front-${fid}`}
              className={`panel panel--iron${isCaptured ? ' a-bio-pulse' : ''}`}
              style={isCaptured ? {
                minWidth: 200,
                background: TOKENS.bioGreenDeep,
                border: `2px solid ${TOKENS.bioGreen}`,
              } : {
                minWidth: 200,
              }}
            >
              <div style={{ fontWeight: 600 }}>{FRONTS[fid].label}</div>
              <div style={{ fontSize: 12, color: isCaptured ? TOKENS.bioGreen : TOKENS.inkDim }}>Status: {status}</div>
              {f.captured && (
                <div style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Garrison: {f.garrison.length}</div>
              )}
              {f.hardening > 0 && (
                <div style={{ fontSize: 12, color: TOKENS.rust }}>Hardening: {f.hardening}</div>
              )}
              {f.flareStartedAt !== null && (
                <div style={{ fontSize: 12, color: TOKENS.rust }}>Flaring — reinforce</div>
              )}
            </div>
          );
        })}
      </div>

      {conquered ? (
        <div data-testid="region-progress" style={styles.regionConquered}>
          <div style={styles.regionConqueredTitle}>Region Conquered</div>
          <div style={styles.regionConqueredBody}>{region.label} conquered.</div>
        </div>
      ) : (
        <div data-testid="region-progress" style={{ fontSize: 14, marginTop: 12 }}>
          <div style={{ marginBottom: 8 }}>
            {held.length} of {region.frontIds.length} fronts held.
          </div>
          <div style={{
            height: 6,
            borderRadius: 3,
            background: TOKENS.iron,
            maxWidth: 320,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${region.frontIds.length > 0 ? (held.length / region.frontIds.length) * 100 : 0}%`,
              background: flaring
                ? TOKENS.signalWarn
                : held.length === region.frontIds.length
                  ? TOKENS.bioGreen
                  : TOKENS.rust,
              borderRadius: 3,
              transition: 'width 400ms ease',
            }} />
          </div>
        </div>
      )}

      <p data-testid="region-footer" style={{ marginTop: 24, fontStyle: 'italic', color: TOKENS.inkDim }}>
        {region.label} is the first of many. Take it, hold it — then the next opens.
      </p>
    </main>
  );
}
