// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { FrontCard } from '../../src/ui/components/FrontCard';

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

  it('renders "Captured" and disables clicks for captured fronts', () => {
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
    expect(getByTestId('front-card-military').getAttribute('data-disabled')).toBe('true');
    fireEvent.click(getByTestId('front-card-military'));
    expect(onClick).not.toHaveBeenCalled();
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
    // Selected border is violet 8b5cf6
    expect(card.style.borderColor).toMatch(/(#8b5cf6)|(rgb\(139, ?92, ?246\))/i);
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
});
