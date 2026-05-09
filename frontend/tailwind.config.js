/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark premium backgrounds
        dark: {
          900: '#070B14',  // deepest bg
          800: '#0A0E1A',  // main bg
          700: '#0F1629',  // sidebar / card bg
          600: '#151E35',  // card hover / elevated
          500: '#1C2640',  // borders / dividers
          400: '#253050',  // subtle borders
          300: '#3D4E6B',  // muted elements
        },
        // Emerald accent (primary)
        accent: {
          DEFAULT: '#00D4A8',
          50:  'rgba(0,212,168,0.08)',
          100: 'rgba(0,212,168,0.15)',
          200: 'rgba(0,212,168,0.25)',
          300: '#00BF97',
          400: '#00D4A8',
          500: '#00E8B8',
          glow: '0 0 20px rgba(0,212,168,0.35)',
        },
        // Legacy primary kept for backward compat
        primary: {
          50:  '#EBF7F3',
          100: '#D6EFE7',
          200: '#AEDFD0',
          300: '#5DCAA5',
          400: '#2DB88A',
          500: '#1D9E75',
          600: '#17816A',
          700: '#11614A',
          800: '#085041',
          900: '#053529',
        },
        // Text scale
        text: {
          primary:   '#F0F4FF',
          secondary: '#8892A4',
          muted:     '#4D5870',
          accent:    '#00D4A8',
        },
        // Status colors (dark-optimised)
        success: '#00D4A8',
        danger:  '#FF4D6A',
        warning: '#FFB547',
        info:    '#4D9FFF',
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl:  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'glow-sm':  '0 0 12px rgba(0,212,168,0.2)',
        'glow':     '0 0 20px rgba(0,212,168,0.35)',
        'glow-lg':  '0 0 40px rgba(0,212,168,0.25)',
        'card':     '0 4px 24px rgba(0,0,0,0.35)',
        'card-lg':  '0 8px 40px rgba(0,0,0,0.45)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
      },
    },
  },
  plugins: [],
}
