/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
