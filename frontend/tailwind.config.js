/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f6ff',
          100: '#e0edff',
          500: '#1d4ed8',
          600: '#1e40af',
          700: '#1e3a8a',
          900: '#0f172a',
        },
        accent: {
          400: '#38bdf8',
          500: '#06b6d4',
          600: '#0891b2',
        },
        voice: {
          500: '#ef4444',
          600: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glow': '0 0 20px rgba(56, 189, 248, 0.4)'
      }
    },
  },
  plugins: [],
}
