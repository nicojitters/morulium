// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SpecimenCard } from '../../src/ui/components/SpecimenCard';
import type { DemoRow } from '../../src/sim/__demo__';

const NOW = new Date(2026, 7, 4, 12, 0, 0).getTime();

const stubRow: DemoRow = {
  seed: 42,
  tier: 'baseline',
  score: 0,
  base: { PWR: 10, VIT: 10, SPD: 10, INT: 10, GUI: 10 },
  current: { PWR: 10, VIT: 10, SPD: 10, INT: 10, GUI: 10 },
  expressed: {
    head: 'head_plain',
    carapace: 'cara_bare',
    locomotion: 'loco_plain',
    appendage: 'app_none',
    eyes: 'eyes_plain',
    hide_pattern: 'hide_plain',
    aberration: 'ab_none',
  },
  palette: 'pal_ash',
};

describe('SpecimenCard rest / injury line', () => {
  afterEach(() => cleanup());

  it('does NOT render rest line when restState prop is absent (backwards compat)', () => {
    const { queryByTestId } = render(<SpecimenCard row={stubRow} />);
    expect(queryByTestId(/^rest-line-/)).toBeNull();
  });

  it('renders "Rest 75/100" when healthy', () => {
    const { getByTestId } = render(
      <SpecimenCard
        row={stubRow}
        restState={{ restCurrent: 75, injuredUntil: null, now: NOW }}
      />,
    );
    expect(getByTestId('rest-line-42').textContent).toBe('Rest 75/100');
    // Not injured — no attribute, no overlay
    const card = getByTestId('specimen-card');
    expect(card.getAttribute('data-injured')).toBeNull();
  });

  it('renders injured line + data-injured="true" when injuredUntil > now', () => {
    const injuredUntil = NOW + 7 * 60 * 1000 + 23 * 1000;  // 7m 23s
    const { getByTestId } = render(
      <SpecimenCard
        row={stubRow}
        restState={{ restCurrent: 10, injuredUntil, now: NOW }}
      />,
    );
    expect(getByTestId('rest-line-42').textContent).toContain('7m 23s');
    expect(getByTestId('rest-line-42').textContent).toContain('Injured');
    expect(getByTestId('specimen-card').getAttribute('data-injured')).toBe('true');
  });

  it('renders as healthy when injuredUntil <= now (expired)', () => {
    const { getByTestId } = render(
      <SpecimenCard
        row={stubRow}
        restState={{ restCurrent: 40, injuredUntil: NOW - 1000, now: NOW }}
      />,
    );
    // Expired injury reads as healthy
    expect(getByTestId('rest-line-42').textContent).toBe('Rest 40/100');
    expect(getByTestId('specimen-card').getAttribute('data-injured')).toBeNull();
  });
});
