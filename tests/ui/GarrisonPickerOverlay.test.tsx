// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { GarrisonPickerOverlay } from '../../src/ui/components/GarrisonPickerOverlay';
import type { Unit } from '../../src/state/types';

const stubUnit = (id: number): Unit => ({
  id, seed: id, decantedAt: 100 * id,
  genome: { loci: {} },
  generation: 0, parentIds: null, wear: {},
  restCurrent: 100, injuredUntil: null,
});

describe('GarrisonPickerOverlay', () => {
  afterEach(() => cleanup());

  it('renders one row per eligible unit', () => {
    const { getByTestId } = render(
      <GarrisonPickerOverlay
        frontId="infrastructure"
        eligibleUnits={[stubUnit(1), stubUnit(2)]}
        onAssign={() => {}}
        onDismiss={() => {}}
      />
    );
    expect(getByTestId('front-card-garrison-picker-unit-infrastructure-1')).toBeDefined();
    expect(getByTestId('front-card-garrison-picker-unit-infrastructure-2')).toBeDefined();
  });

  it('renders "No eligible units" when list is empty', () => {
    const { queryByTestId, getByText } = render(
      <GarrisonPickerOverlay
        frontId="infrastructure"
        eligibleUnits={[]}
        onAssign={() => {}}
        onDismiss={() => {}}
      />
    );
    expect(queryByTestId('front-card-garrison-picker-unit-infrastructure-1')).toBeNull();
    expect(getByText(/no eligible units/i)).toBeDefined();
  });

  it('unit row click calls onAssign with the unit id', () => {
    const onAssign = vi.fn();
    const { getByTestId } = render(
      <GarrisonPickerOverlay
        frontId="infrastructure"
        eligibleUnits={[stubUnit(7)]}
        onAssign={onAssign}
        onDismiss={() => {}}
      />
    );
    fireEvent.click(getByTestId('front-card-garrison-picker-unit-infrastructure-7'));
    expect(onAssign).toHaveBeenCalledWith(7);
  });

  it('backdrop click calls onDismiss', () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(
      <GarrisonPickerOverlay
        frontId="infrastructure"
        eligibleUnits={[stubUnit(1)]}
        onAssign={() => {}}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(getByTestId('front-card-garrison-picker-backdrop-infrastructure'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('unit row shows padded id + tier + rest info', () => {
    const { getByTestId } = render(
      <GarrisonPickerOverlay
        frontId="infrastructure"
        eligibleUnits={[stubUnit(42)]}
        onAssign={() => {}}
        onDismiss={() => {}}
      />
    );
    expect(getByTestId('front-card-garrison-picker-unit-infrastructure-42').textContent)
      .toContain('M-00042');
  });
});
