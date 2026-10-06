/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#070A0F',
        sidebar: '#0A0F17',
        cards: '#0D131C',
        secondary: '#111923',
        borders: '#1D2939',
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          muted: '#1E3A8A',
        },
        cyan: {
          DEFAULT: '#22D3EE',
          muted: '#0E7490',
        },
        success: {
          DEFAULT: '#22C55E',
          muted: '#14532D',
        },
        warning: {
          DEFAULT: '#F59E0B',
          muted: '#78350F',
        },
        critical: {
          DEFAULT: '#EF4444',
          muted: '#7F1D1D',
        },
        text: {
          DEFAULT: '#F8FAFC',
          muted: '#94A3B8',
          dim: '#64748B',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace', 'ui-monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'forensic': '0 0 20px -5px rgba(59, 130, 246, 0.15)',
        'forensic-cyan': '0 0 20px -5px rgba(34, 211, 238, 0.15)',
        'forensic-critical': '0 0 20px -5px rgba(239, 68, 68, 0.2)',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.9' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'scan': 'scanline 8s linear infinite',
        'pulse-slow': 'pulseSlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
