/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#004ac6',
          container: '#2563eb',
          light: '#eff4ff',
          dark: '#003ea8',
        },
        secondary: {
          DEFAULT: '#006c49',
          container: '#6cf8bb',
          light: '#e6f7f0',
        },
        surface: {
          DEFAULT: '#f8f9ff',
          container: '#e5eeff',
          low: '#eff4ff',
          high: '#dce9ff',
          highest: '#d3e4fe',
          lowest: '#ffffff',
          dim: '#cbdbf5',
        },
        on: {
          surface: '#0b1c30',
          'surface-variant': '#434655',
          primary: '#ffffff',
        },
        outline: {
          DEFAULT: '#737686',
          variant: '#c3c6d7',
        },
        alert: {
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
