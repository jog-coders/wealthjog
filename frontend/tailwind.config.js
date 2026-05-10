/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Dark mode backgrounds ──────────────────────────
        navy: {
          950: '#070D1A',
          900: '#0F172A',   // main page bg
          800: '#1E293B',   // card bg
          750: '#243347',   // card hover / elevated
          700: '#334155',   // border
          600: '#475569',   // muted border
        },
        // ── Primary: Vibrant Green ─────────────────────────
        green: {
          DEFAULT: '#00D28E',
          50:  'rgba(0,210,142,0.05)',
          100: 'rgba(0,210,142,0.10)',
          200: 'rgba(0,210,142,0.18)',
          300: 'rgba(0,210,142,0.30)',
          glow: 'rgba(0,210,142,0.20)',
          500: '#00D28E',
          600: '#00B87D',
          700: '#009E6C',
        },
        // ── Secondary: Action Orange ───────────────────────
        orange: {
          DEFAULT: '#FF6C00',
          100: 'rgba(255,108,0,0.10)',
          200: 'rgba(255,108,0,0.18)',
          500: '#FF6C00',
          600: '#E06000',
        },
        // ── Semantic ──────────────────────────────────────
        danger:  '#EF4444',
        warning: '#FF6C00',
        success: '#00D28E',
        info:    '#38BDF8',

        // ── Text ──────────────────────────────────────────
        text: {
          1: '#F8FAFC',   // white headers
          2: '#94A3B8',   // slate-400 secondary
          3: '#64748B',   // slate-500 muted
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl:   '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        pill: '9999px',
      },
      boxShadow: {
        'card':      '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
        'card-md':   '0 4px 16px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.4)',
        'green-glow':'0 0 20px rgba(0,210,142,0.18), 0 0 40px rgba(0,210,142,0.10)',
        'orange-glow':'0 0 20px rgba(255,108,0,0.18)',
        'glass':     '0 8px 32px rgba(0,0,0,0.3)',
        'sidebar':   '4px 0 24px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
}
