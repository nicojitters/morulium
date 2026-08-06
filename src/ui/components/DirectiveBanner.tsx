import type { ReactElement } from 'react';
import { useColonyStore } from '../../state/colony';
import { directiveById } from '../../state/directives';

export function DirectiveBanner(): ReactElement | null {
  const id = useColonyStore((s) => s.activeDirectiveId);
  if (id === null) return null;
  const d = directiveById(id);
  return (
    <div className="panel panel--iron" data-testid="directive-banner" style={{ borderLeft: '4px solid var(--signal-warn)', margin: '0 auto 16px auto', maxWidth: 1400, display: 'flex', alignItems: 'center', gap: 12 }}>
      <img
        src="/assets/pixellab/resources/directive.png"
        alt=""
        width={24}
        height={24}
        style={{ imageRendering: 'pixelated', display: 'block', flexShrink: 0 }}
        draggable={false}
      />
      <div>
        <div className="text-stamp" style={{ fontSize: 14, color: 'var(--signal-warn)' }}>{d.title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 2 }}>{d.hint}</div>
      </div>
    </div>
  );
}
