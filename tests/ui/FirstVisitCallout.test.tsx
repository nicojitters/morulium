// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { FirstVisitCallout } from '../../src/ui/components/FirstVisitCallout';
import { useColonyStore } from '../../src/state/colony';

describe('FirstVisitCallout', () => {
  beforeEach(() => { localStorage.clear(); useColonyStore.getState().resetGame(); });
  afterEach(() => cleanup());

  it('renders when surface not yet seen', () => {
    const { getByTestId } = render(
      <FirstVisitCallout surface="colony" title="Your Colony" body="Every specimen you Decant lives here." action="Decant a Morula." />,
    );
    expect(getByTestId('first-visit-colony')).toBeDefined();
  });

  it('null when already seen', () => {
    useColonyStore.getState().markSeen('colony');
    const { queryByTestId } = render(
      <FirstVisitCallout surface="colony" title="x" body="y" action="z" />,
    );
    expect(queryByTestId('first-visit-colony')).toBeNull();
  });

  it('Dismiss marks the surface seen and hides itself', () => {
    const { getByTestId, queryByTestId } = render(
      <FirstVisitCallout surface="colony" title="x" body="y" action="z" />,
    );
    fireEvent.click(getByTestId('first-visit-colony-dismiss'));
    expect(useColonyStore.getState().seenSurfaces.colony).toBe(true);
    expect(queryByTestId('first-visit-colony')).toBeNull();
  });
});
