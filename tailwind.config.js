/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        atlas: {
          50: '#f3eefb',
          100: '#e4d9f6',
          200: '#c9b3ed',
          300: '#a880df',
          400: '#8b54cf',
          500: '#7c4dca',
          600: '#6639a6',
          700: '#542d88',
          800: '#3d1f6e',
          900: '#261545',
          950: '#1a0e2e',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
