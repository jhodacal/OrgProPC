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
          DEFAULT: '#6C63FF',
          light: '#8B85FF',
          dark: '#4B44DB',
        },
        secondary: {
          DEFAULT: '#FF6B6B',
          light: '#FF8E8E',
        },
        accent: {
          DEFAULT: '#4ECDC4',
          light: '#6EE7DE',
        },
        dark: {
          900: '#070913',
          800: '#0F1225',
          700: '#171B38',
          600: '#22284F',
          500: '#323B6D',
        },
        cyber: {
          blue: '#00f0ff',
          neon: '#39ff14',
          purple: '#b026ff',
          yellow: '#ffe600',
          pink: '#ff007f'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(108, 99, 255, 0.6))' },
          '50%': { opacity: '0.7', filter: 'drop-shadow(0 0 5px rgba(108, 99, 255, 0.2))' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
