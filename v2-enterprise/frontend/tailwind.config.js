const colors = require('tailwindcss/colors');

module.exports = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary:     { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary:   { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted:       { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent:      { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover:     { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card:        { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        gold:        'hsl(var(--gold))',

        /* ── SaaS Background Layers ── */
        'bg-page':     'hsl(var(--bg-page))',
        'bg-surface':  'hsl(var(--bg-surface))',
        'bg-elevated': 'hsl(var(--bg-elevated))',
        'bg-overlay':  'hsl(var(--bg-overlay))',

        /* ── Semantic Colors ── */
        success:     { DEFAULT: 'hsl(var(--success))', foreground: '#ffffff' },
        warning:     { DEFAULT: 'hsl(var(--warning))', foreground: '#ffffff' },
        danger:      { DEFAULT: 'hsl(var(--danger))', foreground: '#ffffff' },
        info:        { DEFAULT: 'hsl(var(--info))', foreground: '#ffffff' },

        /* ── Brand colors (restrained compatibility) ── */
        brand: {
          blue:    'hsl(var(--primary))',
          navy:    'hsl(var(--primary))',
          emerald: 'hsl(var(--success))',
          gold:    '#d4a44c',
          silver:  '#94a3b8',
          carbon:  'hsl(var(--bg-surface))',
        },
      },

      borderWidth: {
        'subtle':  'var(--border-subtle)',
        'default': 'var(--border-default)',
        'strong':  'var(--border-strong)',
      },

      borderColor: {
        'subtle':  'var(--border-subtle)',
        'default': 'var(--border-default)',
        'strong':  'var(--border-strong)',
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      fontFamily: {
        sans:    ['var(--font-tajawal)', 'var(--font-inter)', 'sans-serif'],
        arabic:  ['var(--font-tajawal)', 'sans-serif'],
        numeric: ['var(--font-inter)', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },

      fontSize: {
        'xs':   ['11px', { lineHeight: '16px' }],
        'sm':   ['13px', { lineHeight: '18px' }],
        'base': ['15px', { lineHeight: '22px' }],
        'lg':   ['17px', { lineHeight: '24px' }],
        'xl':   ['22px', { lineHeight: '28px' }],
        '2xl':  ['28px', { lineHeight: '36px' }],
        '3xl':  ['36px', { lineHeight: '44px' }],
      },

      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
      },

      boxShadow: {
        xs:           '0 1px 2px rgba(0,0,0,0.05)',
        sm:           '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        md:           '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        lg:           '0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
        xl:           '0 16px 40px rgba(0,0,0,0.16)',
        glass:        '0 4px 20px rgba(0,0,0,0.08)',
        'glass-lg':   '0 8px 32px rgba(0,0,0,0.12)',
        'glow-primary': '0 0 20px rgba(230,57,70,0.15)',
        'glow-gold':  '0 0 20px rgba(244,165,34,0.15)',
        'glow-success': '0 0 16px rgba(16,185,129,0.12)',
      },

      transitionDuration: {
        'fast': 'var(--transition-fast)',
        'base': 'var(--transition-base)',
      },

      animation: {
        'fade-in':    'fade-in 0.15s ease-out',
        'slide-up':   'slide-up 0.2s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer':    'shimmer 1.5s linear infinite',
      },

      keyframes: {
        'fade-in':    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up':   { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pulse-glow': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        'shimmer':    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
