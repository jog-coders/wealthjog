/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm premium palette
        cream: {
          50:  '#FDFAF5',
          100: '#F7F3EB',
          200: '#EDE8DC',
          300: '#DDD6C6',
          400: '#C8BEAA',
        },
        forest: {
          50:  '#EBF2EE',
          100: '#C8DECE',
          200: '#8FB99A',
          300: '#5A9470',
          400: '#2E7A4F',
          500: '#1A6B4A',
          600: '#155A3E',
          700: '#0F4730',
          800: '#0A3422',
          900: '#062115',
          sidebar: '#1A3A2A',
          'sidebar-dark': '#132B1E',
        },
        gold: {
          50:  '#FDF8EC',
          100: '#FAEFD0',
          200: '#F5DFA1',
          300: '#EEC96A',
          400: '#C9972B',
          500: '#B3821F',
          600: '#9A6D18',
        },
        // Keep primary alias pointing to forest
        primary: {
          50:  '#EBF2EE',
          100: '#C8DECE',
          200: '#8FB99A',
          300: '#5A9470',
          400: '#2E7A4F',
          500: '#1A6B4A',
          600: '#155A3E',
          700: '#0F4730',
          800: '#1A3A2A',
          900: '#062115',
        },
        // Semantic
        success: '#1A6B4A',
        danger:  '#C0392B',
        warning: '#C9972B',
        info:    '#2B6CB0',
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
        'warm-sm': '0 2px 8px rgba(26,58,42,0.07)',
        'warm':    '0 4px 16px rgba(26,58,42,0.10)',
        'warm-lg': '0 8px 32px rgba(26,58,42,0.12)',
        'warm-xl': '0 16px 48px rgba(26,58,42,0.15)',
        'gold':    '0 0 0 3px rgba(201,151,43,0.25)',
      },
    },
  },
  plugins: [],
}
