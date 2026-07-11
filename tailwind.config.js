/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: '#0E0E0D',
        neonGreen: '#4ade80',
      }
    },
  },
  plugins: [],
}