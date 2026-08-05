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

  it('does NOT render garrison badge when garrisonedAt is absent', () => {
    const { queryByTestId } = render(<SpecimenCard row={stubRow} />);
    expect(queryByTestId(/^garrison-badge-/)).toBeNull();
  });

  it('renders "Garrison: Infra" when garrisonedAt is "infrastructure"', () => {
    const { getByTestId } = render(<SpecimenCard row={stubRow} garrisonedAt="infrastructure" />);
    expect(getByTestId('garrison-badge-42').textContent).toBe('Garrison: Infra');
    expect(getByTestId('specimen-card').getAttribute('data-garrisoned')).toBe('true');
  });

  it('does NOT render garrison badge when garrisonedAt is null', () => {
    const { queryByTestId, getByTestId } = render(<SpecimenCard row={stubRow} garrisonedAt={null} />);
    expect(queryByTestId(/^garrison-badge-/)).toBeNull();
    expect(getByTestId('specimen-card').getAttribute('data-garrisoned')).toBeNull();
  });
});

describe('SpecimenCard culled visual (M7a)', () => {
  afterEach(() => cleanup());

  it('does NOT render culled visual when culled prop absent', () => {
    const { getByTestId } = render(<SpecimenCard row={stubRow} />);
    expect(getByTestId('specimen-card').getAttribute('data-culled')).toBeNull();
    expect(getByTestId('specimen-card').querySelector('[data-testid^="culled-badge"]')).toBeNull();
  });

  it('does NOT render culled visual when culled=false', () => {
    const { getByTestId } = render(<SpecimenCard row={stubRow} culled={false} />);
    expect(getByTestId('specimen-card').getAttribute('data-culled')).toBeNull();
  });

  it('renders red badge + data-culled="true" when culled=true', () => {
    const { getByTestId } = render(<SpecimenCard row={stubRow} culled={true} />);
    expect(getByTestId('specimen-card').getAttribute('data-culled')).toBe('true');
    expect(getByTestId('culled-badge-42')).not.toBeNull();
  });

  it('does NOT render toggle button when onToggleCull absent', () => {
    const { queryByTestId } = render(<SpecimenCard row={stubRow} culled={true} />);
    expect(queryByTestId('cull-toggle-42')).toBeNull();
  });

  it('renders "Cull" button when onToggleCull provided and culled=false', () => {
    const handler = () => {};
    const { getByTestId } = render(<SpecimenCard row={stubRow} culled={false} onToggleCull={handler} />);
    expect(getByTestId('cull-toggle-42').textContent).toBe('Cull');
  });

  it('renders "Uncull" button when onToggleCull provided and culled=true', () => {
    const handler = () => {};
    const { getByTestId } = render(<SpecimenCard row={stubRow} culled={true} onToggleCull={handler} />);
    expect(getByTestId('cull-toggle-42').textContent).toBe('Uncull');
  });

  it('clicking the toggle button calls onToggleCull', () => {
    let calls = 0;
    const handler = () => { calls++; };
    const { getByTestId } = render(<SpecimenCard row={stubRow} onToggleCull={handler} />);
    getByTestId('cull-toggle-42').click();
    expect(calls).toBe(1);
  });
});
