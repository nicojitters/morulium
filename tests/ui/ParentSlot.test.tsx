// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ParentSlot } from '../../src/ui/components/ParentSlot';
import type { Unit } from '../../src/state/types';

const dummyGenome = { loci: {} } as Unit['genome'];
const fixture: Unit = {
  id: 7,
  seed: 7,
  decantedAt: 100,
  genome: dummyGenome,
  generation: 2,
  parentIds: [1, 2],
  wear: {},
  restCurrent: 100,        // NEW
  injuredUntil: null,      // NEW
  culled: false,
};

describe('ParentSlot', () => {
  afterEach(() => cleanup());

  it('renders "Parent A" label when unit is null (slot A)', () => {
    const { getByTestId } = render(<ParentSlot unit={null} slotLabel="A" onClear={() => {}} />);
    const slot = getByTestId('parent-slot-a');
    expect(slot.textContent).toContain('Parent A');
  });

  it('renders "Parent B" label when unit is null (slot B)', () => {
    const { getByTestId } = render(<ParentSlot unit={null} slotLabel="B" onClear={() => {}} />);
    const slot = getByTestId('parent-slot-b');
    expect(slot.textContent).toContain('Parent B');
  });

  it('renders filled state with padded id when unit is present', () => {
    const { getByTestId } = render(<ParentSlot unit={fixture} slotLabel="A" onClear={() => {}} />);
    const slot = getByTestId('parent-slot-a');
    expect(slot.textContent).toContain('M-00007');
    expect(slot.textContent).toContain('Gen 2');
  });

  it('clicking the × button calls onClear', () => {
    const onClear = vi.fn();
    const { getByTestId } = render(<ParentSlot unit={fixture} slotLabel="A" onClear={onClear} />);
    fireEvent.click(getByTestId('parent-slot-clear-a'));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
