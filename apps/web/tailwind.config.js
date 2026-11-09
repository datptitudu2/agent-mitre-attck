/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        cyber: {
          bg: '#060B14',
          surface: '#0B1220',
          panel: '#101A2E',
          cyan: '#06B6D4',
          violet: '#8B5CF6',
          crimson: '#F43F5E',
          emerald: '#10B981',
          amber: '#F59E0B',
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 24px -4px rgba(6, 182, 212, 0.35)',
        'neon-violet': '0 0 24px -4px rgba(139, 92, 246, 0.35)',
        'neon-crimson': '0 0 24px -4px rgba(244, 63, 94, 0.35)',
      },
    },
  },
  plugins: [],
}
