/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070F1E',
          900: '#0A192F',
          850: '#0D213A',
          800: '#102A43',
          750: '#153658',
          700: '#1A365D',
          600: '#234E70',
          500: '#2A6F97',
        },
        gold: {
          300: '#FDE68A',
          400: '#F2D06B',
          500: '#D4AF37',
          600: '#B8860B',
          700: '#92640A',
        },
        champagne: {
          50: '#FDFBF7',
          100: '#FAF7EE',
          200: '#F3EDDA',
          500: '#E5D4A8',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 25px -5px rgba(212, 175, 55, 0.3)',
        'navy-card': '0 10px 30px -5px rgba(3, 8, 18, 0.6)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'marquee': 'marquee 25s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      }
    },
  },
  plugins: [],
}
