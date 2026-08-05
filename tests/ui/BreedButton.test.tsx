// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { BreedButton } from '../../src/ui/components/BreedButton';
import { useColonyStore } from '../../src/state/colony';
import { todayLocalKey } from '../../src/state/harvest';
import { FRESH_FRONTS } from '../../src/state/incursion';
import { BREED_COST_SERUM, SERUM_STARTING_BALANCE } from '../../src/state/serum';
import { REST_MAX } from '../../src/state/rest';
import type { Unit } from '../../src/state/types';

describe('BreedButton', () => {
  beforeEach(() => {
    useColonyStore.setState({
      units: [], nextId: 1, lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(),
      droughtCount: 0,
      breedsToday: 0, breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS,
      activeIncursion: null,
      serum: SERUM_STARTING_BALANCE,
      stims: 0,
      lastGarrisonTickAt: Date.now(),   // NEW
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders "Confirm Breed (3/3)" enabled on a fresh day', () => {
    const onClick = vi.fn();
    const { getByTestId } = render(<BreedButton onClick={onClick} />);
    const btn = getByTestId('breed-button');
    expect(btn.textContent).toBe('Confirm Breed (3/3)');
    expect(btn.getAttribute('data-disabled')).toBeNull();
  });

  it('reflects remaining count in the label', () => {
    useColonyStore.setState({ breedsToday: 1, breedDayKey: todayLocalKey() });
    const { getByTestId } = render(<BreedButton onClick={() => {}} />);
    expect(getByTestId('breed-button').textContent).toBe('Confirm Breed (2/3)');
  });

  it('calls onClick when enabled and clicked', () => {
    const onClick = vi.fn();
    const { getByTestId } = render(<BreedButton onClick={onClick} />);
    fireEvent.click(getByTestId('breed-button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disabled=true (external) shows disabled style + does not call onClick', () => {
    const onClick = vi.fn();
    const { getByTestId } = render(<BreedButton onClick={onClick} disabled />);
    const btn = getByTestId('breed-button');
    expect(btn.getAttribute('data-disabled')).toBe('true');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders countdown when the daily limit is hit', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4, 16, 37, 0));
    useColonyStore.setState({ breedsToday: 3, breedDayKey: '2026-08-04' });
    const onClick = vi.fn();
    const { getByTestId } = render(<BreedButton onClick={onClick} />);
    const btn = getByTestId('breed-button');
    expect(btn.textContent).toBe('Next Breed in 7h 23m');
    expect(btn.getAttribute('data-disabled')).toBe('true');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('label reflects insufficient Serum when balance < BREED_COST_SERUM', () => {
    useColonyStore.setState({
      serum: 25,
      breedsToday: 0,
      breedDayKey: todayLocalKey(),
    });
    const onClick = vi.fn();
    const { getByTestId } = render(<BreedButton onClick={onClick} />);
    const btn = getByTestId('breed-button');
    expect(btn.textContent).toBe(`Breed costs ${BREED_COST_SERUM} SR (have 25)`);
    expect(btn.getAttribute('data-disabled')).toBe('true');
    expect(btn.getAttribute('data-disabled-reason')).toBe('serum');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('cap countdown takes priority over insufficient Serum', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4, 16, 37, 0));
    useColonyStore.setState({
      serum: 0,
      breedsToday: 3,
      breedDayKey: '2026-08-04',
    });
    const onClick = vi.fn();
    const { getByTestId } = render(<BreedButton onClick={onClick} />);
    const btn = getByTestId('breed-button');
    expect(btn.textContent).toBe('Next Breed in 7h 23m');
    expect(btn.getAttribute('data-disabled')).toBe('true');
    expect(btn.getAttribute('data-disabled-reason')).toBe('limit');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('external disabled with sufficient Serum and no cap → default label but disabled', () => {
    useColonyStore.setState({
      serum: SERUM_STARTING_BALANCE,
      breedsToday: 0,
      breedDayKey: todayLocalKey(),
    });
    const onClick = vi.fn();
    const { getByTestId } = render(<BreedButton onClick={onClick} disabled />);
    const btn = getByTestId('breed-button');
    expect(btn.textContent).toBe('Confirm Breed (3/3)');
    expect(btn.getAttribute('data-disabled')).toBe('true');
    expect(btn.getAttribute('data-disabled-reason')).toBe('external');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('enabled state — no data-disabled attribute, no reason', () => {
    useColonyStore.setState({
      serum: SERUM_STARTING_BALANCE,
      breedsToday: 0,
      breedDayKey: todayLocalKey(),
    });
    const onClick = vi.fn();
    const { getByTestId } = render(<BreedButton onClick={onClick} />);
    const btn = getByTestId('breed-button');
    expect(btn.getAttribute('data-disabled')).toBeNull();
    expect(btn.getAttribute('data-disabled-reason')).toBeNull();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('BreedButton cap-aware state (M7b)', () => {
  beforeEach(() => {
    localStorage.clear();
    const units: Unit[] = [];
    for (let i = 1; i <= 20; i++) {
      units.push({
        id: i, seed: i, decantedAt: i, genome: { loci: {} },
        generation: 0, parentIds: null, wear: {},
        restCurrent: REST_MAX, injuredUntil: null, culled: false,
      });
    }
    useColonyStore.setState({
      units, nextId: 21,
      lastDecantedId: null,
      harvestsToday: 0, harvestDayKey: todayLocalKey(),
      droughtCount: 0, breedsToday: 0, breedDayKey: todayLocalKey(),
      fronts: FRESH_FRONTS, activeIncursion: null,
      serum: 200, stims: 0, lastGarrisonTickAt: Date.now(),
      buildings: { barracks: false, medbay: false },
      lastRestTickAt: Date.now(),
    });
  });
  afterEach(() => cleanup());

  it('disabled with data-disabled-reason="cap" at cap', () => {
    const { getByTestId } = render(<BreedButton onClick={() => {}} />);
    const btn = getByTestId('breed-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('data-disabled-reason')).toBe('cap');
    expect(btn.textContent).toContain('Colony full');
  });

  it('cap wins over insufficient-SR', () => {
    useColonyStore.setState({ serum: 0 });   // also insufficient
    const { getByTestId } = render(<BreedButton onClick={() => {}} />);
    expect(getByTestId('breed-button').getAttribute('data-disabled-reason')).toBe('cap');
  });
});
