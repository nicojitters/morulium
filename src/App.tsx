import { useMemo } from 'react';
import { runDemo, formatDemoTable } from './sim/__demo__';

export function App() {
  const table = useMemo(() => formatDemoTable(runDemo(1)), []);
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Morulium — M1 demo</h1>
      <p>50 rolled monsters, seed=1. Tradeoff distribution and rarity should look plausible.</p>
      <pre style={{ fontSize: 12, overflowX: 'auto', background: '#f5f5f5', padding: 12 }}>{table}</pre>
    </main>
  );
}
