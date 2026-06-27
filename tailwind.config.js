/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // DEPRECATED — kept for unported pages, will be removed in Phase 3
        government: {
          blue: '#003366',
          lightBlue: '#0066cc',
          orange: '#ff6600',
          white: '#ffffff',
          grey: '#f5f5f5',
          darkGrey: '#666666',
        },
        india: {
          saffron: '#FF9933',
          saffronDark: '#E07800',
          navy: '#000080',
          green: '#138808',
          greenDark: '#0A5C04',
          gold: '#C9A84C',
        },
        // SUVIDHA Vertical Kiosk design tokens (source: docs/kiosk-design/tokens.md)
        indigo: {
          100: 'oklch(0.93 0.025 270)',
          300: 'oklch(0.78 0.06 270)',
          500: 'oklch(0.55 0.14 270)',
          700: 'oklch(0.38 0.13 270)',
          900: 'oklch(0.28 0.10 270)',
        },
        saffron: {
          100: 'oklch(0.95 0.04 65)',
          300: 'oklch(0.86 0.09 65)',
          500: 'oklch(0.74 0.15 65)',
          700: 'oklch(0.62 0.15 65)',
        },
        dept: {
          elec:   'oklch(0.74 0.15 75)',
          gas:    'oklch(0.70 0.15 35)',
          water:  'oklch(0.70 0.12 200)',
          waste:  'oklch(0.65 0.13 145)',
          health: 'oklch(0.68 0.14 350)',
          trans:  'oklch(0.66 0.13 230)',
        },
        ink: {
          300: 'oklch(0.78 0.018 280)',
          500: 'oklch(0.58 0.02 280)',
          700: 'oklch(0.40 0.03 280)',
          900: 'oklch(0.22 0.03 280)',
        },
        surface: {
          0: 'oklch(0.99 0.008 80)',
          1: 'oklch(0.975 0.012 75)',
          2: 'oklch(0.95 0.018 70)',
        },
        cream: 'oklch(0.965 0.022 75)',
        line:  'oklch(0.90 0.012 80)',
        ok:    'oklch(0.62 0.13 150)',
        warn:  'oklch(0.74 0.15 75)',
        err:   'oklch(0.58 0.18 25)',
      },
      fontFamily: {
        ui:    ['"Plus Jakarta Sans"', '"Noto Sans"', 'system-ui', 'sans-serif'],
        multi: ['"Noto Sans"', '"Noto Sans Devanagari"', '"Noto Sans Bengali"', '"Noto Sans Tamil"', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'kiosk-sm': 'calc(18px * var(--ui-scale))',
        'kiosk-base': 'calc(20px * var(--ui-scale))',
        'kiosk-lg': 'calc(24px * var(--ui-scale))',
        'kiosk-xl': 'calc(28px * var(--ui-scale))',
        'kiosk-2xl': 'calc(32px * var(--ui-scale))',
        'kiosk-3xl': 'calc(40px * var(--ui-scale))',
        'kiosk-4xl': 'calc(48px * var(--ui-scale))',
      },
      spacing: {
        'kiosk': 'calc(1.5rem * var(--ui-scale))',
        'kiosk-lg': 'calc(2rem * var(--ui-scale))',
        'kiosk-xl': 'calc(3rem * var(--ui-scale))',
      },
      borderRadius: {
        'kiosk': 'calc(12px * var(--ui-scale))',
        'kiosk-lg': 'calc(16px * var(--ui-scale))',
      },
      boxShadow: {
        'kiosk': '0 4px 20px rgba(0, 51, 102, 0.15)',
        'kiosk-hover': '0 8px 30px rgba(0, 51, 102, 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
