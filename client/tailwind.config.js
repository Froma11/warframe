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
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        base: '#0e0f11',
        surface: {
          1: '#141518',
          2: '#1a1b1f',
          3: '#212226',
        },
        line: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.18)',
        },
        ink: {
          1: '#e9e8e4',
          2: '#a3a29d',
          3: '#6b6a66',
        },
        accent: {
          DEFAULT: '#b9a77a',
          hover: '#c8b991',
        },
        gain: '#7fa88a',
        loss: '#c27c70',
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
