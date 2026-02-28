/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          700: '#1F3864',
          800: '#162848',
        },
      },
    },
  },
  plugins: [],
}
