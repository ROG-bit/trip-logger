/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ceramic: '#FDFBF7',
        'powder-rose': '#F9ECE8',
        'petal-pink': '#FDF5F2',
        taigo: {
          coral: '#FDEAE4',
          peach: '#FEECE2',
          lilac: '#F3ECFA',
          rose: '#FBE8EC',
          mint: '#EBF7F2',
          sky: '#EBF4FB',
        }
      },
      boxShadow: {
        'chic': '0 10px 30px rgba(235,160,170,0.14)',
        'chic-hover': '0 14px 35px rgba(235,160,170,0.22)',
        'chic-sm': '0 4px 15px rgba(235,160,170,0.10)',
        'chic-inner': 'inset 0 2px 4px rgba(235,160,170,0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
        },
        bounceSlight: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        }
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 2.5s ease-in-out infinite',
        'bounce-slight': 'bounceSlight 0.3s ease-out',
      }
    },
  },
  plugins: [],
}

