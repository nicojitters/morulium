import type { CSSProperties } from 'react';
import type { Tier } from '../sim/types';

export const TIER_COLORS: Readonly<Record<Tier, string>> = {
  baseline:   '#94a3b8', // slate
  strain:     '#14b8a6', // teal
  mutant:     '#f59e0b', // amber
  chimera:    '#a855f7', // violet
  progenitor: '#e11d48', // crimson
};

export const styles = {
  page: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: 24,
    maxWidth: 1400,
    margin: '0 auto',
  } as CSSProperties,

  headerTitle: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 4,
  } as CSSProperties,

  headerSub: {
    color: '#666',
    fontSize: 14,
    marginBottom: 16,
  } as CSSProperties,

  legend: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    fontSize: 12,
    color: '#555',
    marginBottom: 24,
    flexWrap: 'wrap',
  } as CSSProperties,

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  } as CSSProperties,

  legendDot: (color: string): CSSProperties => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: color,
  }),

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
  } as CSSProperties,

  card: (bgTint: string): CSSProperties => ({
    position: 'relative',
    aspectRatio: '5 / 7',
    background: bgTint,
    border: `1px solid ${bgTint}`,
    borderRadius: 6,
    padding: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  }),

  cardSprite: {
    width: '100%',
    height: 'calc(100% - 24px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as CSSProperties,

  cardFooter: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
  } as CSSProperties,

  badge: (color: string): CSSProperties => ({
    position: 'absolute',
    top: 6,
    right: 6,
    padding: '2px 6px',
    borderRadius: 8,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#fff',
    backgroundColor: color,
  }),

  highlightedCard: {
    outline: '2px solid #f59e0b',    // amber — matches Mutant tier for visibility
    outlineOffset: '2px',
    boxShadow: '0 0 12px 2px rgba(245, 158, 11, 0.6)',
    transition: 'outline-color 0.3s ease, box-shadow 0.3s ease',
  } as CSSProperties,

  decantButton: {
    padding: '10px 20px',
    borderRadius: 6,
    border: '1px solid #14b8a6',
    background: '#14b8a6',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,

  emptyState: {
    textAlign: 'center',
    padding: '80px 24px',
    color: '#666',
  } as CSSProperties,

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#333',
    marginBottom: 8,
  } as CSSProperties,

  emptyStateBody: {
    fontSize: 14,
    marginBottom: 32,
  } as CSSProperties,

  emptyStateCta: {
    padding: '14px 28px',
    borderRadius: 8,
    border: '1px solid #14b8a6',
    background: '#14b8a6',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,

  decantButtonDisabled: {
    padding: '10px 20px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',   // slate-300
    background: '#e2e8f0',          // slate-200
    color: '#64748b',               // slate-500
    fontSize: 14,
    fontWeight: 600,
    cursor: 'not-allowed',
    fontFamily: 'inherit',
  } as CSSProperties,

  emptyStateCtaDisabled: {
    padding: '14px 28px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: '#e2e8f0',
    color: '#64748b',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'not-allowed',
    fontFamily: 'inherit',
  } as CSSProperties,

  harvestIndicator: {
    fontSize: 13,
    color: '#555',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  failsafeIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 500,
    color: '#92400e',           // amber-800
    backgroundColor: '#fef3c7', // amber-100
    border: '1px solid #fde68a',// amber-200
  } as CSSProperties,

  breedIndicator: {
    fontSize: 13,
    color: '#555',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  breedButton: {
    padding: '10px 20px',
    borderRadius: 6,
    border: '1px solid #7c3aed',   // violet-600
    background: '#8b5cf6',          // violet-500
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,

  breedButtonDisabled: {
    padding: '10px 20px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    background: '#e2e8f0',
    color: '#64748b',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'not-allowed',
    fontFamily: 'inherit',
  } as CSSProperties,
};
