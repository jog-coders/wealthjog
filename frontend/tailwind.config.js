/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Coral/orange primary
        coral: {
          50:  '#FFF4F1',
          100: '#FFE5DE',
          200: '#FFCBBF',
          300: '#FFA48E',
          400: '#FF7A5C',
          500: '#FF6548',
          600: '#F04830',
          700: '#C93520',
          800: '#A32918',
          900: '#7A1F12',
        },
        // Page / surface colors
        surface: {
          page:  '#F4F5F7',
          card:  '#FFFFFF',
          alt:   '#F9FAFB',
          hover: '#F3F4F6',
        },
        // Neutral gray scale
        ink: {
          900: '#111827',
          700: '#374151',
          500: '#6B7280',
          400: '#9CA3AF',
          300: '#D1D5DB',
          200: '#E5E7EB',
          100: '#F3F4F6',
        },
        // Keep primary alias
        primary: {
          50:  '#FFF4F1',
          100: '#FFE5DE',
          200: '#FFCBBF',
          300: '#FFA48E',
          400: '#FF7A5C',
          500: '#FF6548',
          600: '#F04830',
          700: '#C93520',
          800: '#A32918',
          900: '#7A1F12',
        },
        // Semantic
        success: '#059669',
        danger:  '#EF4444',
        warning: '#F59E0B',
        info:    '#3B82F6',
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
        'card':    '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        'card-md': '0 4px 12px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.07)',
        'card-lg': '0 8px 24px rgba(0,0,0,0.10), 0 24px 48px rgba(0,0,0,0.08)',
        'coral':   '0 4px 14px rgba(255,101,72,0.35)',
        'nav':     '0 1px 0 rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
