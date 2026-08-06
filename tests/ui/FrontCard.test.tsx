// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { FrontCard } from '../../src/ui/components/FrontCard';
import { GARRISON_TARGET, RADICALIZATION_BONUS } from '../../src/state/occupation';

const NOW = new Date(2026, 7, 4, 12, 0, 0).getTime();

describe('FrontCard', () => {
  afterEach(() => cleanup());

  it('renders "Available" status for available fronts', () => {
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 }}
        selected={false}
        now={NOW}
        onClick={() => {}}
      />
    );
    expect(getByTestId('front-card-status-infrastructure').textContent).toBe('Available');
    expect(getByTestId('front-card-infrastructure').getAttribute('data-disabled')).toBeNull();
  });

  it('renders "Captured" and allows clicks for expand/collapse', () => {
    const onClick = vi.fn();
    const { getByTestId } = render(
      <FrontCard
        frontId="military"
        label="Military"
        state={{ captured: true, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 }}
        selected={false}
        now={NOW}
        onClick={onClick}
      />
    );
    expect(getByTestId('front-card-status-military').textContent).toBe('Captured ✓');
    expect(getByTestId('front-card-military').getAttribute('data-disabled')).toBeNull();
    fireEvent.click(getByTestId('front-card-military'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders "Cooling down · Xm Ys" for active cooldown', () => {
    // 7 min 23 sec remaining
    const cooldownUntil = NOW + 7 * 60 * 1000 + 23 * 1000;
    const onClick = vi.fn();
    const { getByTestId } = render(
      <FrontCard
        frontId="guerrilla"
        label="Guerrilla"
        state={{ captured: false, cooldownUntil, garrison: [], flareStartedAt: null, hardening: 0 }}
        selected={false}
        now={NOW}
        onClick={onClick}
      />
    );
    expect(getByTestId('front-card-status-guerrilla').textContent).toContain('7m 23s');
    expect(getByTestId('front-card-guerrilla').getAttribute('data-disabled')).toBe('true');
    fireEvent.click(getByTestId('front-card-guerrilla'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders "Available" when cooldownUntil has passed', () => {
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: false, cooldownUntil: NOW - 1000, garrison: [], flareStartedAt: null, hardening: 0 }}
        selected={false}
        now={NOW}
        onClick={() => {}}
      />
    );
    expect(getByTestId('front-card-status-infrastructure').textContent).toBe('Available');
    expect(getByTestId('front-card-infrastructure').getAttribute('data-disabled')).toBeNull();
  });

  it('applies selected style when selected=true', () => {
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 }}
        selected={true}
        now={NOW}
        onClick={() => {}}
      />
    );
    const card = getByTestId('front-card-infrastructure');
    // Selected border is rust (TOKENS.rust = #7a3419)
    expect(card.style.borderColor).toMatch(/(#7a3419)|(rgb\(122, ?52, ?25\))/i);
  });

  it('calls onClick when available and clicked', () => {
    const onClick = vi.fn();
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 }}
        selected={false}
        now={NOW}
        onClick={onClick}
      />
    );
    fireEvent.click(getByTestId('front-card-infrastructure'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('captured front renders "Garrison: 0/2" sub-line', () => {
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: true, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 }}
        selected={false}
        now={NOW}
        onClick={() => {}}
      />,
    );
    const container = getByTestId('front-card-garrison-infrastructure');
    expect(container.textContent).toContain(`Garrison: 0/${GARRISON_TARGET}`);
  });

  it('captured front with 2 garrison shows "Garrison: 2/2"', () => {
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: true, cooldownUntil: null, garrison: [1, 2], flareStartedAt: null, hardening: 0 }}
        selected={false}
        now={NOW}
        onClick={() => {}}
      />,
    );
    const container = getByTestId('front-card-garrison-infrastructure');
    expect(container.textContent).toContain(`Garrison: 2/${GARRISON_TARGET}`);
  });

  it('captured front with flareStartedAt renders flare countdown', () => {
    // Flare started 5 minutes ago; grace is 30 min → 25 min remaining
    const flareStart = NOW - 5 * 60 * 1000;
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: true, cooldownUntil: null, garrison: [], flareStartedAt: flareStart, hardening: 0 }}
        selected={false}
        now={NOW}
        onClick={() => {}}
      />,
    );
    const flare = getByTestId('front-card-flare-infrastructure');
    expect(flare.textContent).toContain('Flaring in 25m 0s');
  });

  it('un-captured front with hardening > 0 renders "Hardened: +N" warning', () => {
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: RADICALIZATION_BONUS }}
        selected={false}
        now={NOW}
        onClick={() => {}}
      />,
    );
    const hardening = getByTestId('front-card-hardening-infrastructure');
    expect(hardening.textContent).toContain(`Hardened: +${RADICALIZATION_BONUS}`);
  });

  it('un-captured front with hardening === 0 does NOT render hardening warning', () => {
    const { queryByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: false, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 }}
        selected={false}
        now={NOW}
        onClick={() => {}}
      />,
    );
    expect(queryByTestId('front-card-hardening-infrastructure')).toBeNull();
  });

  it('captured front with 2/2 garrison + others un-captured shows radicalization note', () => {
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: true, cooldownUntil: null, garrison: [1, 2], flareStartedAt: null, hardening: 0 }}
        selected={false}
        now={NOW}
        onClick={() => {}}
      />,
    );
    // Radicalization note is only rendered when the front is captured — this test just
    // checks that the note testid exists in captured state. Full "only when others
    // uncaptured" behavior is nuanced; for M6c the simple heuristic is "always show
    // note on captured fronts as an information hint".
    expect(getByTestId('front-card-radicalization-note-infrastructure').textContent)
      .toContain(`+${RADICALIZATION_BONUS} threshold on other fronts`);
  });

  it('captured front with expanded=true renders garrison slot panel', () => {
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: true, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 }}
        selected={false}
        now={NOW}
        onClick={() => {}}
        expanded={true}
        garrisonUnits={[null, null]}
        onGarrisonSlotClick={() => {}}
      />,
    );
    expect(getByTestId('front-card-garrison-slot-infrastructure-0')).toBeDefined();
    expect(getByTestId('front-card-garrison-slot-infrastructure-1')).toBeDefined();
  });

  it('empty garrison slot click calls onGarrisonSlotClick with slot index', () => {
    const onGarrisonSlotClick = vi.fn();
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: true, cooldownUntil: null, garrison: [], flareStartedAt: null, hardening: 0 }}
        selected={false}
        now={NOW}
        onClick={() => {}}
        expanded={true}
        garrisonUnits={[null, null]}
        onGarrisonSlotClick={onGarrisonSlotClick}
      />,
    );
    fireEvent.click(getByTestId('front-card-garrison-slot-infrastructure-0'));
    expect(onGarrisonSlotClick).toHaveBeenCalledWith(0);
  });

  it('filled garrison slot × click calls onGarrisonSlotClear with slot index and unit id', () => {
    const onGarrisonSlotClear = vi.fn();
    const dummyUnit = {
      id: 42, seed: 42, decantedAt: 100,
      genome: { loci: {} },
      generation: 0, parentIds: null, wear: {},
      restCurrent: 100, injuredUntil: null, culled: false,
    };
    const { getByTestId } = render(
      <FrontCard
        frontId="infrastructure"
        label="Infrastructure"
        state={{ captured: true, cooldownUntil: null, garrison: [42], flareStartedAt: null, hardening: 0 }}
        selected={false}
        now={NOW}
        onClick={() => {}}
        expanded={true}
        garrisonUnits={[dummyUnit as any, null]}
        onGarrisonSlotClear={onGarrisonSlotClear}
      />,
    );
    fireEvent.click(getByTestId('front-card-garrison-slot-clear-infrastructure-0'));
    expect(onGarrisonSlotClear).toHaveBeenCalledWith(0, 42);
  });
});
