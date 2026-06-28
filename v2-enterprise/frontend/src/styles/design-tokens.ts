// Design Tokens for Friends Showroom Enterprise (RTL Premium Light ERP System)
export const DESIGN_TOKENS = {
  colors: {
    background: '#F6F8FB',        // Calm canvas background
    foreground: '#1E293B',        // Slate 800 (no pure black)
    card: '#FFFFFF',              // Pure White Cards
    cardForeground: '#1E293B',
    border: '#E5E7EB',            // Very subtle border
    input: '#F9FAFB',             // Clean light inputs
    ring: '#10B981',              // Emerald focus ring
    primary: '#10B981',           // Emerald Brand Primary accent
    primaryForeground: '#FFFFFF',
    secondary: '#F1F5F9',         // Slate 100
    secondaryForeground: '#1E293B',
    muted: '#F9FAFB',             // Secondary background
    mutedForeground: '#64748B',   // Slate 500
    accent: '#2563EB',            // Blue secondary accent
    accentForeground: '#FFFFFF',
    destructive: '#E11D48',       // Rose danger/alert
    destructiveForeground: '#FFFFFF',
  },
  statusColors: {
    Available: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', dot: 'bg-emerald-600' },
    Sold: { bg: 'bg-rose-50 text-rose-700 border-rose-200/60', dot: 'bg-rose-600' },
    Reserved: { bg: 'bg-amber-50 text-amber-700 border-amber-200/60', dot: 'bg-amber-600' },
    Active: { bg: 'bg-sky-50 text-sky-700 border-sky-200/60', dot: 'bg-sky-600' },
    Cancelled: { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500' },
    Pending: { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500' },
    Paid: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', dot: 'bg-emerald-600' },
    Overdue: { bg: 'bg-rose-50 text-rose-700 border-rose-200/60', dot: 'bg-rose-600' },
    Partial: { bg: 'bg-orange-50 text-orange-700 border-orange-200/60', dot: 'bg-orange-600' },
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },
  radius: {
    xs: '0.125rem',  // 2px
    sm: '0.25rem',   // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
  },
  shadows: {
    xs: '0 1px 2px rgba(15, 23, 42, 0.05)',
    sm: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
    md: '0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)',
    lg: '0 10px 24px rgba(15, 23, 42, 0.10), 0 4px 8px rgba(15, 23, 42, 0.04)',
    xl: '0 20px 48px rgba(15, 23, 42, 0.12), 0 8px 16px rgba(15, 23, 42, 0.06)',
    glow: '0 0 20px rgba(239, 27, 45, 0.12)',
  },
  typography: {
    fontSans: "'Cairo', 'IBM Plex Sans Arabic', 'Inter', sans-serif",
    fontArabic: "'Cairo', 'IBM Plex Sans Arabic', sans-serif",
    fontNumeric: "'IBM Plex Sans Arabic', 'Inter', sans-serif",
  }
};
