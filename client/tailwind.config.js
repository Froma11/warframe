import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        comfortaa: ['Comfortaa', 'cursive', 'sans-serif'],
        heading: ['Comfortaa', 'cursive', 'sans-serif'],
        onest: ['Onest', 'sans-serif'],
        sans: ['Onest', 'sans-serif'],
        raleway: ['Raleway', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        base: '#0B0C0E',
        surface: {
          1: '#121316',
          2: '#181A1E',
          3: '#24272D',
        },
        line: {
          DEFAULT: 'rgba(255, 255, 255, 0.06)',
          strong: 'rgba(255, 255, 255, 0.14)',
        },
        ink: {
          1: '#F4F4F5',
          2: '#A1A1AA',
          3: '#63666E',
        },
        accent: {
          DEFAULT: '#2DD4BF',
          hover: '#5EEAD4',
        },
        gain: '#4ADE80',
        loss: '#F87171',
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '15px' }],
      },
    },
  },
  plugins: [
    plugin(function({ addVariant }) {
      addVariant('light', ['html.light &', ':root.light &', '.light &']);
    }),
  ],
}
