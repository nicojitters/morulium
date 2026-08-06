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

  parentSlotEmpty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 200,
    borderRadius: 8,
    border: '2px dashed #cbd5e1',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  parentSlotFilled: {
    position: 'relative',
    width: 160,
    padding: 8,
    borderRadius: 8,
    border: '2px solid #8b5cf6',
    background: '#faf5ff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  } as CSSProperties,

  parentSlotClear: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: 'none',
    background: '#f1f5f9',
    color: '#475569',
    fontSize: 14,
    lineHeight: 1,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as CSSProperties,

  parentSlotIdLine: {
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    color: '#475569',
  } as CSSProperties,

  parentSlotGenLine: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  lineageLine: {
    marginTop: 4,
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    textAlign: 'center',
  } as CSSProperties,

  restLine: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    textAlign: 'center',
  } as CSSProperties,

  injuredLine: {
    marginTop: 2,
    fontSize: 11,
    color: '#b45309',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    textAlign: 'center',
  } as CSSProperties,

  injuredCardOverlay: {
    opacity: 0.55,
    cursor: 'not-allowed',
  } as CSSProperties,

  nav: {
    display: 'flex',
    gap: 4,
    padding: '12px 24px 0 24px',
    maxWidth: 1400,
    margin: '0 auto',
    borderBottom: '1px solid #e2e8f0',
  } as CSSProperties,

  navTab: {
    padding: '10px 16px',
    borderRadius: '6px 6px 0 0',
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    borderBottom: '2px solid transparent',
  } as CSSProperties,

  navTabActive: {
    padding: '10px 16px',
    borderRadius: '6px 6px 0 0',
    border: 'none',
    background: 'transparent',
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    borderBottom: '2px solid #8b5cf6',
  } as CSSProperties,

  breedSection: {
    marginBottom: 24,
  } as CSSProperties,

  breedParentsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: '16px 0',
  } as CSSProperties,

  breedTimesX: {
    fontSize: 24,
    fontWeight: 600,
    color: '#94a3b8',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  breedConfirmRow: {
    display: 'flex',
    justifyContent: 'center',
    padding: '8px 0 24px 0',
  } as CSSProperties,

  breedHint: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 12,
  } as CSSProperties,

  frontCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 220,
    height: 140,
    borderRadius: 10,
    border: '2px solid #cbd5e1',
    background: '#ffffff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 12,
    transition: 'border-color 120ms ease',
  } as CSSProperties,

  frontCardSelected: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 220,
    height: 140,
    borderRadius: 10,
    border: '2px solid #8b5cf6',   // violet
    background: '#faf5ff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 12,
    boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.25)',
  } as CSSProperties,

  frontCardCaptured: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 220,
    height: 140,
    borderRadius: 10,
    border: '2px solid #22c55e',   // green
    background: '#f0fdf4',
    cursor: 'not-allowed',
    fontFamily: 'inherit',
    padding: 12,
  } as CSSProperties,

  frontCardCooldown: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 220,
    height: 140,
    borderRadius: 10,
    border: '2px solid #cbd5e1',
    background: '#f1f5f9',
    color: '#94a3b8',
    cursor: 'not-allowed',
    fontFamily: 'inherit',
    padding: 12,
  } as CSSProperties,

  frontCardLabel: {
    fontSize: 18,
    fontWeight: 600,
    color: '#0f172a',
  } as CSSProperties,

  frontCardStatus: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  frontCardGarrisonRow: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  frontCardGarrisonSlotEmpty: {
    padding: '4px 8px',
    margin: '2px 4px',
    border: '1px dashed #cbd5e1',
    borderRadius: 4,
    fontSize: 11,
    color: '#94a3b8',
    cursor: 'pointer',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    display: 'inline-block',
  } as CSSProperties,

  frontCardGarrisonSlotFilled: {
    position: 'relative',
    padding: '4px 14px 4px 8px',
    margin: '2px 4px',
    border: '1px solid #7c3aed',
    background: '#f5f3ff',
    borderRadius: 4,
    fontSize: 11,
    color: '#475569',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    display: 'inline-block',
  } as CSSProperties,

  frontCardGarrisonSlotClear: {
    position: 'absolute',
    top: 1,
    right: 2,
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 1,
    cursor: 'pointer',
    padding: '0 2px',
    fontFamily: 'inherit',
  } as CSSProperties,

  frontCardFlareLine: {
    marginTop: 4,
    fontSize: 12,
    color: '#b45309',    // amber-700
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  frontCardHardeningLine: {
    marginTop: 4,
    fontSize: 12,
    color: '#b45309',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  frontCardRadicalizationNote: {
    marginTop: 2,
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    fontStyle: 'italic',
  } as CSSProperties,

  incursionTicker: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 24,
    background: '#0f172a',                 // slate-900 — dark theater
    color: '#e2e8f0',                       // slate-200
    borderRadius: 12,
    minHeight: 220,
  } as CSSProperties,

  incursionBeat: {
    fontSize: 15,
    lineHeight: 1.5,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'opacity 400ms ease',
  } as CSSProperties,

  incursionBeatVisible: {
    opacity: 1,
  } as CSSProperties,

  incursionBeatHidden: {
    opacity: 0,
  } as CSSProperties,

  incursionSkipButton: {
    alignSelf: 'flex-end',
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid #475569',
    background: 'transparent',
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 8,
  } as CSSProperties,

  incursionSection: {
    marginBottom: 24,
  } as CSSProperties,

  incursionFrontsRow: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    padding: '16px 0',
    flexWrap: 'wrap',
  } as CSSProperties,

  incursionTeamRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    padding: '16px 0',
    flexWrap: 'wrap',
  } as CSSProperties,

  incursionHint: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 12,
  } as CSSProperties,

  incursionSlotEmpty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 150,
    borderRadius: 8,
    border: '2px dashed #cbd5e1',
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  incursionSlotFilled: {
    position: 'relative',
    width: 120,
    padding: 8,
    borderRadius: 8,
    border: '2px solid #8b5cf6',
    background: '#faf5ff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  } as CSSProperties,

  incursionSlotClear: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: 'none',
    background: '#f1f5f9',
    color: '#475569',
    fontSize: 12,
    lineHeight: 1,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as CSSProperties,

  incursionSlotIdLine: {
    fontSize: 12,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    color: '#475569',
  } as CSSProperties,

  incursionSlotGenLine: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  incursionLaunchRow: {
    display: 'flex',
    justifyContent: 'center',
    padding: '8px 0 24px 0',
  } as CSSProperties,

  incursionLaunchButton: {
    padding: '12px 28px',
    borderRadius: 6,
    border: '1px solid #dc2626',   // red-600
    background: '#ef4444',          // red-500
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,

  incursionLaunchButtonDisabled: {
    padding: '12px 28px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    background: '#e2e8f0',
    color: '#64748b',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'not-allowed',
    fontFamily: 'inherit',
  } as CSSProperties,

  incursionContinueButton: {
    padding: '10px 24px',
    borderRadius: 6,
    border: '1px solid #0f172a',
    background: '#1e293b',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 12,
  } as CSSProperties,

  regionConquered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 48,
    background: '#f0fdf4',
    border: '2px solid #22c55e',
    borderRadius: 12,
    marginTop: 24,
  } as CSSProperties,

  regionConqueredTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#166534',
  } as CSSProperties,

  regionConqueredBody: {
    fontSize: 14,
    color: '#166534',
    textAlign: 'center',
  } as CSSProperties,

  serumBadge: {
    marginLeft: 'auto',
    padding: '6px 12px',
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    fontWeight: 500,
    color: '#334155',   // slate-700
    alignSelf: 'center',
  } as CSSProperties,

  stimShopRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 0',
    marginBottom: 8,
  } as CSSProperties,

  stimInventoryLabel: {
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    color: '#475569',
  } as CSSProperties,

  buyStimButton: {
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid #7c3aed',
    background: '#8b5cf6',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,

  buyStimButtonDisabled: {
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    background: '#e2e8f0',
    color: '#64748b',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'not-allowed',
    fontFamily: 'inherit',
  } as CSSProperties,

  slotStimToggle: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#475569',
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,

  slotStimToggleActive: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid #7c3aed',
    background: '#8b5cf6',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,

  garrisonPickerOverlay: {
    position: 'absolute',
    top: '100%',
    left: 0,
    zIndex: 10,
    marginTop: 4,
    padding: 8,
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    minWidth: 180,
    maxHeight: 240,
    overflowY: 'auto',
  } as CSSProperties,

  garrisonPickerBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    background: 'transparent',
  } as CSSProperties,

  garrisonPickerRow: {
    padding: '6px 8px',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    borderRadius: 4,
    color: '#0f172a',
  } as CSSProperties,

  garrisonPickerRowEmpty: {
    padding: '6px 8px',
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  } as CSSProperties,

  garrisonBadge: {
    marginTop: 2,
    fontSize: 10,
    color: '#7c3aed',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  culledCardOverlay: {
    boxShadow: 'inset 0 0 0 2px rgba(220, 38, 38, 0.35)',
  } as CSSProperties,

  culledBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 10,
    color: '#dc2626',
    fontWeight: 700,
    pointerEvents: 'none',
  } as CSSProperties,

  cullToggleButton: {
    marginTop: 4,
    padding: '2px 6px',
    fontSize: 10,
    border: '1px solid #cbd5e1',
    borderRadius: 3,
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  } as CSSProperties,

  hudRow: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    padding: '8px 24px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    color: '#334155',
    maxWidth: 1400,
    margin: '0 auto',
  } as CSSProperties,

  hudItem: {
    padding: '2px 8px',
    borderRadius: 4,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  } as CSSProperties,

  hudDirectiveEmpty: {
    color: '#94a3b8',
    fontStyle: 'italic',
  } as CSSProperties,

  navTabLocked: {
    padding: '10px 16px',
    borderRadius: '6px 6px 0 0',
    border: 'none',
    background: 'transparent',
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'not-allowed',
    fontFamily: 'inherit',
    borderBottom: '2px solid transparent',
  } as CSSProperties,

  modalBackdrop: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  } as CSSProperties,

  modalCard: {
    background: '#ffffff',
    borderRadius: 8,
    padding: 24,
    minWidth: 320,
    maxWidth: 480,
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  } as CSSProperties,

  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 12,
  } as CSSProperties,

  modalBody: {
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 16,
  } as CSSProperties,

  modalPrimary: {
    padding: '8px 20px',
    borderRadius: 6,
    border: '1px solid #14b8a6',
    background: '#14b8a6',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,
};
