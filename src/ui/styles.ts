import type { CSSProperties } from 'react';
import type { Tier } from '../sim/types';
import { TOKENS } from './tokens';

export const TIER_COLORS: Readonly<Record<Tier, string>> = {
  baseline:   '#94a3b8', // slate
  strain:     '#14b8a6', // teal
  mutant:     '#f59e0b', // amber
  chimera:    '#a855f7', // violet
  progenitor: '#e11d48', // crimson
};

export const styles = {
  page: {
    fontFamily: TOKENS.fontUi,
    padding: 24,
    maxWidth: 1400,
    margin: '0 auto',
    color: TOKENS.inkPrimary,
  } as CSSProperties,

  headerTitle: {
    fontFamily: TOKENS.fontDisplay,
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: TOKENS.inkPrimary,
    marginBottom: 4,
  } as CSSProperties,

  headerSub: {
    color: TOKENS.inkDim,
    fontFamily: TOKENS.fontMono,
    fontSize: 13,
    letterSpacing: '0.02em',
    marginBottom: 16,
  } as CSSProperties,

  legend: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    fontSize: 12,
    color: TOKENS.inkDim,
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
  } as CSSProperties,

  card: (bgTint: string): CSSProperties => ({
    background: bgTint,   // the ONE parameterized property this function exists for
  }),

  cardSprite: {
    width: '100%',
    height: 'calc(100% - 32px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at center, rgba(127,255,155,0.06) 0%, transparent 60%)',
    borderRadius: 4,
  } as CSSProperties,

  cardFooter: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    right: 8,
    fontFamily: TOKENS.fontMono,
    fontSize: 11,
    letterSpacing: '0.04em',
    color: TOKENS.inkLab,
    textAlign: 'center',
  } as CSSProperties,

  badge: (color: string): CSSProperties => ({
    position: 'absolute',
    top: 6,
    right: 6,
    padding: '2px 6px',
    borderRadius: 2,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontFamily: TOKENS.fontDisplay,
    color: TOKENS.groundVoid,   // dark text on the tier color
    backgroundColor: color,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
  }),

  decantButton: {
    padding: '10px 20px',
  } as CSSProperties,

  emptyState: {
    textAlign: 'center',
    padding: '80px 24px',
    color: TOKENS.inkDim,
    fontFamily: TOKENS.fontMono,
  } as CSSProperties,

  emptyStateTitle: {
    fontSize: 20,
    color: TOKENS.inkLab,
    marginBottom: 8,
  } as CSSProperties,

  emptyStateBody: {
    fontSize: 14,
    color: TOKENS.inkSecondary,
    marginBottom: 32,
  } as CSSProperties,

  tierSectionHeader: (color: string): CSSProperties => ({
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    padding: '8px 0 6px 0',
    borderBottom: `1px solid ${color}`,
    marginBottom: 8,
    marginTop: 16,
  }),

  tierSectionLabel: (color: string): CSSProperties => ({
    fontFamily: TOKENS.fontDisplay,
    fontWeight: 800,
    fontSize: 14,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color,
  }),

  emptyStateCta: {
    padding: '14px 28px',
    fontSize: 15,
  } as CSSProperties,

  decantButtonDisabled: {
    padding: '10px 20px',
    opacity: 0.5,
  } as CSSProperties,

  emptyStateCtaDisabled: {
    padding: '14px 28px',
    fontSize: 15,
    opacity: 0.5,
  } as CSSProperties,

  harvestIndicator: {
    fontSize: 13,
    color: TOKENS.inkLab,
    fontFamily: TOKENS.fontMono,
  } as CSSProperties,

  failsafeIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 500,
    color: TOKENS.signalWarn,
    background: 'rgba(240, 184, 64, 0.1)',
    border: '1px solid ' + TOKENS.signalWarn + '55',
  } as CSSProperties,

  breedIndicator: {
    fontSize: 13,
    color: TOKENS.inkLab,
    fontFamily: TOKENS.fontMono,
  } as CSSProperties,

  breedButton: {
    padding: '10px 20px',
  } as CSSProperties,

  breedButtonDisabled: {
    padding: '10px 20px',
    opacity: 0.5,
  } as CSSProperties,

  parentSlotEmpty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 200,
    borderRadius: 8,
    border: `2px dashed ${TOKENS.tealDeep}`,
    color: TOKENS.inkDim,
    fontSize: 14,
    fontWeight: 500,
    fontFamily: TOKENS.fontMono,
    background: 'transparent',
  } as CSSProperties,

  parentSlotFilled: {
    position: 'relative',
    width: 160,
    padding: 8,
    borderRadius: 8,
    border: `2px solid ${TOKENS.teal}`,
    background: TOKENS.groundPanel,
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
    background: TOKENS.groundRaised,
    color: TOKENS.inkSecondary,
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
    fontFamily: TOKENS.fontMono,
    color: TOKENS.inkLab,
  } as CSSProperties,

  parentSlotGenLine: {
    fontSize: 11,
    color: TOKENS.inkSecondary,
    fontFamily: TOKENS.fontMono,
  } as CSSProperties,

  lineageLine: {
    marginTop: 4,
    fontSize: 11,
    color: TOKENS.inkLab,
    fontFamily: TOKENS.fontMono,
    textAlign: 'center',
  } as CSSProperties,

  restLine: {
    marginTop: 2,
    fontSize: 11,
    color: TOKENS.inkLab,
    fontFamily: TOKENS.fontMono,
    textAlign: 'center',
  } as CSSProperties,

  injuredLine: {
    marginTop: 2,
    fontSize: 11,
    color: TOKENS.signalWarn,
    fontFamily: TOKENS.fontMono,
    textAlign: 'center',
  } as CSSProperties,

  injuredCardOverlay: {
    opacity: 0.55,
    cursor: 'not-allowed',
    filter: 'sepia(0.3) hue-rotate(-20deg)',
  } as CSSProperties,

  nav: {
    display: 'flex',
    gap: 4,
    padding: '12px 24px 0 24px',
    maxWidth: 1400,
    margin: '0 auto',
    borderBottom: `1px solid ${TOKENS.tealDeep}`,
    background: TOKENS.groundDeep,
  } as CSSProperties,

  navTab: {
    padding: '10px 16px',
    borderRadius: '4px 4px 0 0',
    border: 'none',
    background: 'transparent',
    color: TOKENS.inkSecondary,
    fontFamily: TOKENS.fontDisplay,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'color 160ms ease, border-color 160ms ease',
  } as CSSProperties,

  navTabActive: {
    padding: '10px 16px',
    borderRadius: '4px 4px 0 0',
    border: 'none',
    background: 'transparent',
    color: TOKENS.inkPrimary,
    fontFamily: TOKENS.fontDisplay,
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderBottom: `2px solid ${TOKENS.teal}`,
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
    color: TOKENS.inkDim,
  } as CSSProperties,

  breedConfirmRow: {
    display: 'flex',
    justifyContent: 'center',
    padding: '8px 0 24px 0',
  } as CSSProperties,

  breedHint: {
    textAlign: 'center',
    color: TOKENS.inkDim,
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
    border: '2px solid ' + TOKENS.ironLight,
    background: TOKENS.ironPlate,
    color: TOKENS.inkPrimary,
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
    border: '2px solid ' + TOKENS.rust,
    background: TOKENS.ironPlate,
    color: TOKENS.inkPrimary,
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 12,
    boxShadow: '0 0 0 3px rgba(122, 52, 25, 0.35)',
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
    border: '2px solid ' + TOKENS.bioGreenDim,
    background: TOKENS.bioGreenDeep,
    color: TOKENS.bioGreen,
    cursor: 'pointer',
    transform: 'none',             // suppress hover scale without killing pointer events
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
    border: '2px solid ' + TOKENS.iron,
    background: TOKENS.groundPanel,
    color: TOKENS.inkDim,
    cursor: 'not-allowed',
    pointerEvents: 'none',
    fontFamily: 'inherit',
    padding: 12,
    opacity: 0.7,
  } as CSSProperties,

  frontCardLabel: {
    fontSize: 18,
    fontFamily: TOKENS.fontDisplay,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'inherit',
  } as CSSProperties,

  frontCardStatus: {
    fontSize: 13,
    color: TOKENS.inkSecondary,
    fontFamily: TOKENS.fontMono,
  } as CSSProperties,

  frontCardGarrisonRow: {
    marginTop: 4,
    fontSize: 12,
    color: TOKENS.inkSecondary,
    fontFamily: TOKENS.fontMono,
  } as CSSProperties,

  frontCardGarrisonSlotEmpty: {
    padding: '4px 8px',
    margin: '2px 4px',
    border: '1px dashed ' + TOKENS.ironLight,
    borderRadius: 4,
    fontSize: 11,
    color: TOKENS.inkDim,
    cursor: 'pointer',
    fontFamily: TOKENS.fontMono,
    display: 'inline-block',
  } as CSSProperties,

  frontCardGarrisonSlotFilled: {
    position: 'relative',
    padding: '4px 14px 4px 8px',
    margin: '2px 4px',
    border: '1px solid ' + TOKENS.bruiseGlow,
    background: TOKENS.bruise + '33',
    borderRadius: 4,
    fontSize: 11,
    color: TOKENS.inkLab,
    fontFamily: TOKENS.fontMono,
    display: 'inline-block',
  } as CSSProperties,

  frontCardGarrisonSlotClear: {
    position: 'absolute',
    top: 1,
    right: 2,
    border: 'none',
    background: 'transparent',
    color: TOKENS.inkDim,
    fontSize: 12,
    lineHeight: 1,
    cursor: 'pointer',
    padding: '0 2px',
    fontFamily: 'inherit',
  } as CSSProperties,

  frontCardFlareLine: {
    marginTop: 4,
    fontSize: 12,
    color: TOKENS.signalWarn,
    fontFamily: TOKENS.fontMono,
  } as CSSProperties,

  frontCardHardeningLine: {
    marginTop: 4,
    fontSize: 12,
    color: TOKENS.signalWarn,
    fontFamily: TOKENS.fontMono,
  } as CSSProperties,

  frontCardRadicalizationNote: {
    marginTop: 2,
    fontSize: 10,
    color: TOKENS.inkDim,
    fontFamily: TOKENS.fontMono,
    fontStyle: 'italic',
  } as CSSProperties,

  incursionTicker: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 24,
    background: TOKENS.ironPlate,
    color: TOKENS.inkPrimary,
    border: '1px solid ' + TOKENS.ironLight,
    borderRadius: 8,
    minHeight: 220,
    boxShadow: TOKENS.rimIron,
  } as CSSProperties,

  incursionBeat: {
    fontFamily: TOKENS.fontMono,
    fontSize: 14,
    lineHeight: 1.6,
    color: TOKENS.inkPrimary,
    letterSpacing: '0.02em',
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
    borderRadius: TOKENS.radiusSm,
    border: '1px solid ' + TOKENS.ironLight,
    background: 'transparent',
    color: TOKENS.inkSecondary,
    fontFamily: TOKENS.fontDisplay,
    fontSize: 13,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
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
    color: TOKENS.inkDim,
    fontFamily: TOKENS.fontMono,
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
    border: '2px dashed ' + TOKENS.ironLight,
    color: TOKENS.inkDim,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: TOKENS.fontMono,
  } as CSSProperties,

  incursionSlotFilled: {
    position: 'relative',
    width: 120,
    padding: 8,
    borderRadius: 8,
    border: '2px solid ' + TOKENS.rust,
    background: TOKENS.ironPlate,
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
    background: TOKENS.iron,
    color: TOKENS.inkSecondary,
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
    fontFamily: TOKENS.fontMono,
    color: TOKENS.inkPrimary,
  } as CSSProperties,

  incursionSlotGenLine: {
    fontSize: 10,
    color: TOKENS.inkDim,
    fontFamily: TOKENS.fontMono,
  } as CSSProperties,

  incursionLaunchRow: {
    display: 'flex',
    justifyContent: 'center',
    padding: '8px 0 24px 0',
  } as CSSProperties,

  incursionLaunchButton: {
    padding: '14px 32px',
    letterSpacing: '0.1em',
  } as CSSProperties,

  incursionLaunchButtonDisabled: {
    padding: '14px 32px',
    letterSpacing: '0.1em',
    cursor: 'not-allowed',
    opacity: 0.5,
  } as CSSProperties,

  incursionContinueButton: {
    padding: '10px 24px',
    marginTop: 12,
  } as CSSProperties,

  regionConquered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 48,
    background: TOKENS.bioGreenDeep,
    border: '2px solid ' + TOKENS.bioGreenDim,
    borderRadius: 12,
    marginTop: 24,
    color: TOKENS.bioGreen,
  } as CSSProperties,

  regionConqueredTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: TOKENS.bioGreen,
    fontFamily: TOKENS.fontDisplay,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  } as CSSProperties,

  regionConqueredBody: {
    fontSize: 14,
    color: TOKENS.inkLab,
    textAlign: 'center',
  } as CSSProperties,

  serumBadge: {
    marginLeft: 'auto',
    padding: '4px 10px',
    fontSize: 13,
    fontFamily: TOKENS.fontMono,
    fontWeight: 500,
    color: TOKENS.inkLab,
    alignSelf: 'center',
    background: TOKENS.groundRaised,
    border: '1px solid ' + TOKENS.tealDeep,
    borderRadius: 3,
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
    fontFamily: TOKENS.fontMono,
    color: TOKENS.inkLab,
  } as CSSProperties,

  buyStimButton: {
    padding: '6px 14px',
    borderRadius: TOKENS.radiusSm,
    border: `1px solid ${TOKENS.teal}`,
    background: TOKENS.groundPanel,
    color: TOKENS.inkLab,
    fontFamily: TOKENS.fontDisplay,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  } as CSSProperties,

  buyStimButtonDisabled: {
    padding: '6px 14px',
    borderRadius: TOKENS.radiusSm,
    border: `1px solid ${TOKENS.iron}`,
    background: TOKENS.groundPanel,
    color: TOKENS.inkDim,
    fontFamily: TOKENS.fontDisplay,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'not-allowed',
    opacity: 0.5,
  } as CSSProperties,

  slotStimToggle: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid ' + TOKENS.iron,
    background: TOKENS.groundRaised,
    color: TOKENS.inkSecondary,
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
    border: '1px solid ' + TOKENS.bruiseGlow,
    background: TOKENS.bruise,
    color: TOKENS.inkLab,
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
    background: TOKENS.groundRaised,
    border: '1px solid ' + TOKENS.tealDeep,
    borderRadius: 6,
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
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
    fontFamily: TOKENS.fontMono,
    borderRadius: 4,
    color: TOKENS.inkLab,
  } as CSSProperties,

  garrisonPickerRowEmpty: {
    padding: '6px 8px',
    fontSize: 12,
    color: TOKENS.inkDim,
    fontStyle: 'italic',
  } as CSSProperties,

  garrisonBadge: {
    marginTop: 2,
    fontSize: 10,
    color: TOKENS.bruiseGlow,
    fontFamily: TOKENS.fontMono,
  } as CSSProperties,

  culledCardOverlay: {
    boxShadow: `inset 0 0 0 2px ${TOKENS.signalDanger}55`,
  } as CSSProperties,

  culledBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 10,
    color: TOKENS.signalDanger,
    fontWeight: 700,
    pointerEvents: 'none',
  } as CSSProperties,

  cullToggleButton: {
    marginTop: 4,
    padding: '2px 6px',
    fontSize: 10,
    border: '1px solid ' + TOKENS.iron,
    borderRadius: 3,
    background: 'transparent',
    color: TOKENS.inkDim,
    cursor: 'pointer',
    fontFamily: TOKENS.fontMono,
  } as CSSProperties,

  hudRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    padding: '8px 24px',
    borderBottom: `1px solid ${TOKENS.tealDeep}`,
    fontSize: 13,
    fontFamily: TOKENS.fontMono,
    color: TOKENS.inkLab,
    maxWidth: 1400,
    margin: '0 auto',
    background: TOKENS.groundDeep,
  } as CSSProperties,

  hudItem: {
    padding: '3px 10px',
    borderRadius: 3,
    background: TOKENS.groundRaised,
    border: `1px solid ${TOKENS.tealDeep}`,
    color: TOKENS.inkLab,
    letterSpacing: '0.02em',
  } as CSSProperties,

  hudDirectiveEmpty: {
    color: TOKENS.inkDim,
    fontStyle: 'italic',
  } as CSSProperties,

  navTabLocked: {
    padding: '10px 16px',
    borderRadius: '4px 4px 0 0',
    border: 'none',
    background: 'transparent',
    color: TOKENS.inkDim,
    fontFamily: TOKENS.fontDisplay,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'not-allowed',
    opacity: 0.4,
    borderBottom: '2px solid transparent',
  } as CSSProperties,

  modalBackdrop: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(5, 7, 10, 0.8)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  } as CSSProperties,

  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 12,
    fontFamily: TOKENS.fontDisplay,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: TOKENS.inkPrimary,
  } as CSSProperties,

  modalBody: {
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 16,
    fontFamily: TOKENS.fontUi,
    color: TOKENS.inkSecondary,
  } as CSSProperties,

  modalPrimary: {
    padding: '8px 20px',
    borderRadius: TOKENS.radiusSm,
    border: `1px solid ${TOKENS.teal}`,
    background: TOKENS.groundPanel,
    color: TOKENS.inkLab,
    fontFamily: TOKENS.fontDisplay,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  } as CSSProperties,

  directiveBanner: {
    background: TOKENS.ironPlate,
    borderLeft: '4px solid ' + TOKENS.signalWarn,
    padding: '10px 16px',
    margin: '0 auto 16px auto',
    maxWidth: 1400,
    borderRadius: 4,
    color: TOKENS.inkPrimary,
  } as CSSProperties,

  directiveTitle: {
    fontWeight: 600,
    fontSize: 14,
    color: TOKENS.signalWarn,
    fontFamily: TOKENS.fontDisplay,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  } as CSSProperties,

  directiveHint: {
    fontSize: 12,
    color: TOKENS.inkSecondary,
    marginTop: 2,
  } as CSSProperties,

  toast: {
    position: 'fixed',
    bottom: 24, right: 24,
    padding: '10px 16px',
    borderRadius: 6,
    background: TOKENS.groundRaised,
    color: TOKENS.inkPrimary,
    fontSize: 13,
    fontFamily: TOKENS.fontMono,
    border: '1px solid ' + TOKENS.ironLight,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    zIndex: 90,
    maxWidth: 320,
  } as CSSProperties,

  toastBody: { lineHeight: 1.4 } as CSSProperties,

  tooltipTrigger: {
    borderBottom: '1px dotted ' + TOKENS.tealDeep,
    cursor: 'help',
    position: 'relative',
    display: 'inline',
  } as CSSProperties,

  tooltipBubble: {
    position: 'absolute',
    bottom: 'calc(100% + 6px)',
    left: 0,
    zIndex: 50,
    padding: '6px 10px',
    background: TOKENS.groundRaised,
    color: TOKENS.inkLab,
    fontSize: 12,
    lineHeight: 1.4,
    borderRadius: 4,
    maxWidth: 280,
    border: '1px solid ' + TOKENS.tealDeep,
    fontFamily: TOKENS.fontMono,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    whiteSpace: 'normal',
  } as CSSProperties,

  firstVisitCallout: {
    background: TOKENS.groundPanel,
    borderLeft: '4px solid ' + TOKENS.teal,
    padding: '12px 16px',
    margin: '0 auto 16px auto',
    maxWidth: 1400,
    borderRadius: 4,
    position: 'relative',
  } as CSSProperties,

  firstVisitTitle: { fontWeight: 600, fontSize: 14, marginBottom: 4, color: TOKENS.inkLab, fontFamily: TOKENS.fontDisplay, letterSpacing: '0.06em', textTransform: 'uppercase' } as CSSProperties,
  firstVisitBody:  { fontSize: 13, color: TOKENS.inkSecondary, marginBottom: 4 } as CSSProperties,
  firstVisitAction:{ fontSize: 12, color: TOKENS.inkDim, fontStyle: 'italic' } as CSSProperties,
  firstVisitDismiss: {
    position: 'absolute', top: 4, right: 8,
    border: 'none', background: 'transparent', cursor: 'pointer',
    color: TOKENS.inkSecondary, fontSize: 18, lineHeight: 1,
    fontFamily: 'inherit',
  } as CSSProperties,

  newGameGateRoot: {
    minHeight: '100vh',
    background: TOKENS.groundVoid,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    padding: 24,
  } as CSSProperties,

  newGameGateTagline: {
    fontFamily: TOKENS.fontMono,
    fontSize: 13,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: TOKENS.inkDim,
    marginTop: -8,
  } as CSSProperties,

  newGameGateActions: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
  } as CSSProperties,

  newGameGatePrimary: {
    padding: '14px 32px',
    border: `1px solid ${TOKENS.bioGreen}`,
    background: TOKENS.bruiseDeep,
    color: TOKENS.bioGreen,
    fontFamily: TOKENS.fontDisplay,
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderRadius: 4,
    boxShadow: TOKENS.bioGlowHot,
    transition: 'filter 160ms ease, box-shadow 160ms ease',
  } as CSSProperties,

  newGameGateGhost: {
    padding: '14px 32px',
    border: `1px solid ${TOKENS.tealDeep}`,
    background: 'transparent',
    color: TOKENS.inkSecondary,
    fontFamily: TOKENS.fontDisplay,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderRadius: 4,
    transition: 'color 160ms ease, border-color 160ms ease',
  } as CSSProperties,

  newGameGateGhostDisabled: {
    padding: '14px 32px',
    border: `1px solid ${TOKENS.iron}`,
    background: 'transparent',
    color: TOKENS.inkDim,
    fontFamily: TOKENS.fontDisplay,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'not-allowed',
    opacity: 0.5,
    borderRadius: 4,
  } as CSSProperties,

  newGameGateFooter: {
    marginTop: 24,
    fontFamily: TOKENS.fontMono,
    fontSize: 11,
    letterSpacing: '0.1em',
    color: TOKENS.inkDim,
  } as CSSProperties,
};
