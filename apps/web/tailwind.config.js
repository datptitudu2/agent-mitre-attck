/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      gridTemplateColumns: {
        15: 'repeat(15, minmax(0, 1fr))',
        16: 'repeat(16, minmax(0, 1fr))',
      },
      fontFamily: {
        display: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        xs: '2px',
        sm: '3px',
        DEFAULT: '3px',
        md: '4px',
        lg: '6px',
        xl: '8px',
      },
      colors: {
        // Semantic Functional Tokens (Light/Dark dùng chung 1 class duy nhất)
        surface: {
          DEFAULT: 'var(--ink-950)',
          elevated: 'var(--ink-900)',
          overlay: 'var(--ink-850)',
          subtle: 'var(--ink-800)',
        },
        ink: {
          950: 'var(--ink-950)',
          900: 'var(--ink-900)',
          850: 'var(--ink-850)',
          800: 'var(--ink-800)',
          700: 'var(--ink-700)',
        },
        paper: {
          950: '#F3EFE6',
          900: '#EEE9DF',
          850: '#E9E3D7',
          800: '#E4DED1',
          700: '#DFD8C8',
        },
        bone: {
          100: 'var(--bone-100)',
          200: 'var(--bone-200)',
          300: 'var(--bone-300)',
          400: 'var(--bone-400)',
          500: 'var(--bone-500)',
        },
        line: {
          subtle: 'var(--line-subtle)',
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        attack: {
          DEFAULT: 'var(--attack)',
          muted: 'var(--attack-muted)',
        },
        defend: {
          DEFAULT: 'var(--defend)',
          muted: 'var(--defend-muted)',
        },
        caution: {
          DEFAULT: 'var(--caution)',
        },
      },
      lineHeight: {
        display: '1.02',
        body: '1.6',
      },
      keyframes: {
        shutter: {
          '0%': { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' },
          '100%': { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' },
        },
      },
      animation: {
        shutter: 'shutter 520ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
}
