/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        background: '#f1f5f9',
        surface: '#ffffff',
        primary: '#3b82f6',
        'surface-alt': '#f8fafc',
        'text-primary': '#1e293b',
        'text-secondary': '#64748b',
        'text-muted': '#94a3b8',
        'border-default': '#e2e8f0',
        'border-light': '#f1f5f9',
        'shadow-sm': 'rgba(0,0,0,0.04)',
        'shadow-md': 'rgba(0,0,0,0.08)',
        'shadow-lg': 'rgba(0,0,0,0.12)',
      }
    },
  },
  plugins: [],
}