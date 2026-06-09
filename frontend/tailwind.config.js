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
        violet: colors.rose,
        cyan: colors.stone,
        blue: colors.red,
        emerald: colors.emerald,
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

        /* ── Brand palette ── */
        brand: {
          blue:    '#ef1b2d',   /* primary automotive red */
          navy:    '#991b2a',   /* deeper red */
          emerald: '#10b981',   /* accent / success */
          gold:    '#d4a44c',   /* prices, premium */
          silver:  '#94a3b8',   /* secondary labels */
          carbon:  '#111111',   /* surface cards */
        },

        /* ── Surface scale ── */
        surface: {
          '0':     '#070707',
          '1':     '#111111',
          '2':     '#171717',
          '3':     '#202020',
          '4':     '#292929',
          DEFAULT: '#111111',
          elevated:'#171717',
          overlay: '#202020',
        },
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      fontFamily: {
        sans:    ['Cairo', 'IBM Plex Sans Arabic', 'Inter', 'system-ui', 'sans-serif'],
        arabic:  ['Cairo', 'IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        numeric: ['IBM Plex Sans Arabic', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.625rem',  { lineHeight: '0.875rem' }],
        'xs':  ['0.75rem',   { lineHeight: '1rem' }],
        'sm':  ['0.875rem',  { lineHeight: '1.25rem' }],
        'base':['1rem',      { lineHeight: '1.5rem' }],
        'lg':  ['1.125rem',  { lineHeight: '1.75rem' }],
        'xl':  ['1.25rem',   { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem',    { lineHeight: '2rem' }],
        '3xl': ['1.875rem',  { lineHeight: '2.25rem' }],
      },

      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
      },

      boxShadow: {
        xs:           '0 1px 2px rgba(0,0,0,0.40)',
        sm:           '0 1px 3px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.30)',
        md:           '0 4px 14px rgba(0,0,0,0.48), 0 2px 6px rgba(0,0,0,0.32)',
        lg:           '0 8px 30px rgba(0,0,0,0.54), 0 4px 12px rgba(0,0,0,0.36)',
        xl:           '0 16px 56px rgba(0,0,0,0.60)',
        glass:        '0 4px 24px rgba(0,0,0,0.50)',
        'glass-lg':   '0 8px 48px rgba(0,0,0,0.60)',
        'glow-primary': '0 0 24px rgba(239,27,45,0.34)',
        'glow-success': '0 0 24px rgba(16,185,129,0.28)',
        'glow-alert':   '0 0 24px rgba(244,63,94,0.26)',
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh':
          'radial-gradient(ellipse at 50% -5%, rgba(239,27,45,0.08) 0%, transparent 55%),' +
          'radial-gradient(ellipse at 0% 100%, rgba(16,185,129,0.04) 0%, transparent 50%)',
        'card-gradient':
          'linear-gradient(135deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.008) 100%)',
        'sidebar-gradient':
          'linear-gradient(180deg, rgba(239,27,45,0.06) 0%, rgba(0,0,0,0) 40%)',
      },

      animation: {
        'fade-in':    'fade-in 0.25s ease-out',
        'slide-up':   'slide-up 0.35s cubic-bezier(0.16,1,0.3,1)',
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        'shimmer':    'shimmer 1.8s linear infinite',
        'live-ping':  'live-ping 1.6s ease-out infinite',
      },

      keyframes: {
        'fade-in':    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up':   { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pulse-glow': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.55' } },
        'shimmer':    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'live-ping':  { '0%': { transform: 'scale(1)', opacity: '0.8' }, '70%, 100%': { transform: 'scale(2.2)', opacity: '0' } },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
