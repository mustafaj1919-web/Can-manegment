/**
 * Enterprise Design System v1 — Token System
 * TypeScript metadata and CSS variable references.
 * CSS variables in `src/styles/tokens.css` serve as the runtime visual source of truth.
 */

export const COLOR_TOKENS = {
  background: 'var(--ds-background)',
  surface: 'var(--ds-surface)',
  surfaceSubtle: 'var(--ds-surface-subtle)',
  surfaceHover: 'var(--ds-surface-hover)',
  border: 'var(--ds-border)',
  borderStrong: 'var(--ds-border-strong)',

  textPrimary: 'var(--ds-text-primary)',
  textSecondary: 'var(--ds-text-secondary)',
  textMuted: 'var(--ds-text-muted)',
  textInverse: 'var(--ds-text-inverse)',

  primary: 'var(--ds-primary)',
  primaryHover: 'var(--ds-primary-hover)',
  primarySubtle: 'var(--ds-primary-subtle)',

  success: 'var(--ds-success)',
  successSubtle: 'var(--ds-success-subtle)',

  warning: 'var(--ds-warning)',
  warningSubtle: 'var(--ds-warning-subtle)',

  danger: 'var(--ds-danger)',
  dangerSubtle: 'var(--ds-danger-subtle)',

  info: 'var(--ds-info)',
  infoSubtle: 'var(--ds-info-subtle)',

  ring: 'var(--ds-ring)',
  focusRing: 'var(--ds-focus-ring)',
} as const

export const SPACING_SCALE = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const

export const RADIUS_SCALE = {
  sm: 'var(--ds-radius-sm)',
  default: 'var(--ds-radius-md)',
  md: 'var(--ds-radius-lg)',
  lg: 'var(--ds-radius-xl)',
  panel: 'var(--ds-radius-panel)',
  pill: '9999px',
} as const

export const SHADOW_SCALE = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  overlay: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
} as const

export const MOTION_TOKENS = {
  fast: '120ms cubic-bezier(0.4, 0, 0.2, 1)',
  default: '160ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '220ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const
