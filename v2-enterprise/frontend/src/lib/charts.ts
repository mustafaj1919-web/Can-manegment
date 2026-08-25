// Chart color palette — uses CSS variable tokens for dark/light consistency
export const CHART_COLORS = {
  primary:  'hsl(var(--primary))',
  emerald:  '#10b981',
  amber:    '#f59e0b',
  sky:      '#0ea5e9',
  rose:     '#f43f5e',
  violet:   '#8b5cf6',
  orange:   '#f97316',
  teal:     '#14b8a6',
  indigo:   '#6366f1',
  pink:     '#ec4899',
}

export const PALETTE = Object.values(CHART_COLORS)

export function shortenIQD(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return `${value}`
}

export function percent(value: number, total: number): string {
  if (!total) return '0%'
  return `${((value / total) * 100).toFixed(1)}%`
}
