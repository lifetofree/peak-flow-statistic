/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sarabun', 'sans-serif'],
      },
      colors: {
        zone: {
          green: '#22c55e',
          orange: '#f97316',
          yellow: '#eab308',
          red: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};
