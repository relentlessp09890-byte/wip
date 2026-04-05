import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0a0a',
          surface: '#0f0f0f',
          elevated: '#141414',
          border: '#1e1e1e',
          muted: '#2a2a2a',
        },
        brand: {
          gold: '#e0b84a',
          'gold-dim': '#8a6e2a',
        },
        risk: {
          safe: '#4ade80',
          warning: '#e0b84a',
          danger: '#f87171',
          critical: '#ef4444',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs: ['11px', '16px'],
        sm: ['12px', '18px'],
        base: ['13px', '20px'],
        md: ['14px', '20px'],
      },
    },
  },
  plugins: [],
}
export default config
