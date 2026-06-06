/** @type {import('tailwindcss').Config} */
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
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary:    { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary:  { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive:{ DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted:      { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent:     { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover:    { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card:       { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },

        /* ── Automotive brand palette ── */
        brand: {
          red:     '#cc2118',   /* primary CTA / active states */
          crimson: '#991b1b',   /* deeper red, borders */
          gold:    '#d4a44c',   /* prices, premium */
          silver:  '#94a3b8',   /* secondary labels */
          carbon:  '#1a1a22',   /* surface cards */
        },
        surface: {
          '0':     '#09090f',
          '1':     '#111117',
          '2':     '#1a1a22',
          '3':     '#22222c',
          '4':     '#2d2d3a',
          DEFAULT: '#111117',
          elevated:'#1a1a22',
          overlay: '#22222c',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans:    ['Tajawal', 'Inter', 'system-ui', 'sans-serif'],
        numeric: ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        xs:           '0 1px 2px rgba(0,0,0,0.5)',
        sm:           '0 2px 8px rgba(0,0,0,0.55)',
        md:           '0 4px 18px rgba(0,0,0,0.6)',
        lg:           '0 8px 32px rgba(0,0,0,0.65)',
        xl:           '0 16px 56px rgba(0,0,0,0.7)',
        glass:        '0 4px 24px rgba(0,0,0,0.5)',
        'glass-lg':   '0 8px 48px rgba(0,0,0,0.6)',
        'glow-brand': '0 0 28px rgba(204,33,24,0.42)',
        'glow-gold':  '0 0 24px rgba(212,164,76,0.35)',
        'glow-green': '0 0 22px rgba(16,185,129,0.30)',
        'glow-rose':  '0 0 22px rgba(244,63,94,0.32)',
        'glow-cyan':  '0 0 22px rgba(34,211,238,0.28)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh':
          'radial-gradient(ellipse at 50% -5%, rgba(204,33,24,0.10) 0%, transparent 55%),' +
          'radial-gradient(ellipse at 0% 100%, rgba(212,164,76,0.06) 0%, transparent 50%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        'sidebar-gradient': 'linear-gradient(180deg, rgba(204,33,24,0.06) 0%, rgba(0,0,0,0) 40%)',
      },
      animation: {
        'fade-in':   'fade-in 0.3s ease-out',
        'slide-up':  'slide-up 0.4s cubic-bezier(0.16,1,0.3,1)',
        'pulse-glow':'pulse-glow 2.4s ease-in-out infinite',
        'shimmer':   'shimmer 1.9s linear infinite',
        'live-ping': 'live-ping 1.6s ease-out infinite',
      },
      keyframes: {
        'fade-in':    { '0%': { opacity: '0' },                      '100%': { opacity: '1' } },
        'slide-up':   { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pulse-glow': { '0%, 100%': { opacity: '1' },                '50%': { opacity: '0.55' } },
        'shimmer':    { '0%': { backgroundPosition: '-200% 0' },     '100%': { backgroundPosition: '200% 0' } },
        'live-ping':  { '0%': { transform: 'scale(1)', opacity: '0.8' }, '70%, 100%': { transform: 'scale(2.2)', opacity: '0' } },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
