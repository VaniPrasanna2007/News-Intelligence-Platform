/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Graphite palette mapped to slate tokens for full app coverage
        slate: {
          50: '#FAFCFB',
          100: '#F3F7F5', // PRIMARY TEXT
          200: '#E2EAE6',
          300: '#CBD5D0',
          400: '#A7B5AE', // SECONDARY TEXT
          500: '#718079', // MUTED TEXT
          600: '#4E6157',
          700: '#33433C', // BORDER HOVER
          800: '#27342F', // BORDER
          850: '#1A2420', // CARD HOVER
          900: '#151C19', // CARD
          950: '#0B0F0E', // BACKGROUND CANVAS
        },
        // Central graphite design tokens
        graphite: {
          canvas: '#0B0F0E',
          secondary: '#111715',
          card: '#151C19',
          cardHover: '#1A2420',
          border: '#27342F',
          borderHover: '#33433C',
        },
        // Primary Accent: Emerald
        brand: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399', // PRIMARY-HOVER
          500: '#10B981', // PRIMARY
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          950: '#022C22',
        },
        // Secondary Accent: Teal
        teal: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF', // SECONDARY-HOVER
          500: '#14B8A6', // SECONDARY
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        // Supporting Accent: Warm Amber
        amber: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24', // ACCENT-HOVER
          500: '#F59E0B', // ACCENT / WARNING
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
      },
    },
  },
  plugins: [],
}
