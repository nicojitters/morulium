// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { DevPanel } from '../../src/ui/components/DevPanel';
import { useColonyStore } from '../../src/state/colony';

describe('DevPanel', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('null when closed', () => {
    const { queryByTestId } = render(<DevPanel open={false} onClose={() => {}} />);
    expect(queryByTestId('dev-panel')).toBeNull();
  });

  it('renders all controls when open', () => {
    const { getByTestId } = render(<DevPanel open={true} onClose={() => {}} />);
    for (const id of ['dev-panel-reset','dev-panel-seed-3-units','dev-panel-ff-1h','dev-panel-ff-8h','dev-panel-mark-seen-all','dev-panel-close']) {
      expect(getByTestId(id)).toBeDefined();
    }
  });

  it('reset clears units', () => {
    useColonyStore.getState().decant();
    const { getByTestId } = render(<DevPanel open={true} onClose={() => {}} />);
    fireEvent.click(getByTestId('dev-panel-reset'));
    expect(useColonyStore.getState().units).toEqual([]);
  });

  it('mark seen all fills seenSurfaces', () => {
    const { getByTestId } = render(<DevPanel open={true} onClose={() => {}} />);
    fireEvent.click(getByTestId('dev-panel-mark-seen-all'));
    for (const v of Object.values(useColonyStore.getState().seenSurfaces)) expect(v).toBe(true);
  });
});
