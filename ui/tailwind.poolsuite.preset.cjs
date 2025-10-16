/**
 * Poolsuite-inspired Tailwind preset (no dark mode)
 * Reference: https://poolsuite.net/
 */

const plugin = require('tailwindcss/plugin')

// Approximate Poolsuite palette
const colors = {
  sand: {
    50: '#fbfaf7',
    100: '#f6f1e6',
    200: '#efe4cd',
    300: '#e6d2ab',
    400: '#ddbf88',
    500: '#d3ab64',
    600: '#ba9350',
    700: '#92723e',
    800: '#66502b',
    900: '#3b301a',
  },
  ink: {
    50: '#f5f6f6',
    100: '#e6e8ea',
    200: '#c9ced3',
    300: '#a5adb6',
    400: '#7e8794',
    500: '#5c6673',
    600: '#48515c',
    700: '#38414a',
    800: '#262c33',
    900: '#14181c',
  },
  pool: {
    50: '#e6fbff',
    100: '#cbf4fb',
    200: '#99e6f5',
    300: '#66d6ee',
    400: '#2cc3e6',
    500: '#00b0db',
    600: '#0698c0',
    700: '#08789b',
    800: '#0b5b79',
    900: '#0b3e53',
  },
  peach: {
    50: '#fff6f0',
    100: '#ffe7d8',
    200: '#ffd0b3',
    300: '#ffb182',
    400: '#ff8f4d',
    500: '#ff7026',
    600: '#f0551a',
    700: '#c74216',
    800: '#9a3314',
    900: '#6b240e',
  },
  palm: {
    50: '#eefbf3',
    100: '#d6f6e1',
    200: '#aeeec5',
    300: '#7fe3a6',
    400: '#4ed585',
    500: '#2ec66b',
    600: '#22a757',
    700: '#1e8448',
    800: '#17663a',
    900: '#114a2b',
  },
  lilac: {
    50: '#f6f3ff',
    100: '#ece6ff',
    200: '#d7ccff',
    300: '#b8a4ff',
    400: '#9b7dff',
    500: '#7f59ff',
    600: '#653ee6',
    700: '#4f2fba',
    800: '#3c258f',
    900: '#2b1b66',
  },
  graphite: {
    50: '#f6f7f8',
    100: '#eceff2',
    200: '#d9dee4',
    300: '#bbc4cf',
    400: '#94a1b0',
    500: '#748093',
    600: '#5b6676',
    700: '#464e5b',
    800: '#303741',
    900: '#1d2229',
  },
}

module.exports = {
  theme: {
    extend: {
      colors: {
        ...colors,
        primary: colors.pool,
        accent: colors.peach,
        ink: colors.ink,
        surface: colors.sand,
        border: colors.graphite,
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "Times New Roman", "serif"],
        sans: [
          "Space Grotesk",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "sans-serif",
        ],
        mono: [
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        soft: '0 1px 0 rgba(20, 24, 28, 0.05), 0 8px 20px rgba(20, 24, 28, 0.06)',
        card: '0 1px 0 rgba(20, 24, 28, 0.04), 0 12px 30px rgba(20, 24, 28, 0.08)',
        press: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 6px rgba(20,24,28,0.12)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '250ms',
        slow: '400ms',
      },
      spacing: {
        15: '3.75rem',
        18: '4.5rem',
        22: '5.5rem',
      },
    },
  },
  plugins: [
    plugin(function ({ addBase, addComponents, addUtilities, theme }) {
      // Base styles (global application)
      addBase({
        'html, body': {
          backgroundColor: theme('colors.surface.50'),
          color: theme('colors.ink.900'),
          fontFamily: theme('fontFamily.sans').join(','),
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        h1: { fontFamily: theme('fontFamily.display').join(','), letterSpacing: '-0.01em' },
        h2: { fontFamily: theme('fontFamily.display').join(','), letterSpacing: '-0.005em' },
        h3: { fontFamily: theme('fontFamily.display').join(','), letterSpacing: '0' },
        a: {
          color: theme('colors.primary.700'),
          textDecoration: 'none',
        },
        'a:hover': {
          color: theme('colors.primary.800'),
        },
        '::selection': {
          backgroundColor: theme('colors.primary.200'),
        },
        // Scrollbar styling
        '*, *::before, *::after': {
          scrollbarWidth: 'thin',
          scrollbarColor: `${theme('colors.primary.300')} ${theme('colors.surface.100')}`,
        },
        '::-webkit-scrollbar': { width: '10px', height: '10px' },
        '::-webkit-scrollbar-track': { background: theme('colors.surface.100') },
        '::-webkit-scrollbar-thumb': {
          backgroundColor: theme('colors.primary.300'),
          borderRadius: '9999px',
          border: `2px solid ${theme('colors.surface.100')}`,
        },
      })

      // Components
      addComponents({
        '.btn': {
          '@apply inline-flex items-center justify-center rounded shadow-soft border border-border-200 text-ink-900 bg-white px-4 py-2 text-sm font-medium transition-all duration-normal ease-smooth': {},
          minHeight: '40px',
        },
        '.btn:hover': { '@apply shadow-card translate-y-[-1px]': {} },
        '.btn:active': { '@apply shadow-press translate-y-0': {} },
        '.btn:disabled': { '@apply opacity-60 cursor-not-allowed': {} },

        '.btn-primary': {
          '@apply bg-primary-500 text-white border-primary-600': {},
        },
        '.btn-primary:hover': { '@apply bg-primary-600': {} },
        '.btn-outline': {
          '@apply bg-transparent text-ink-900 border-border-300': {},
        },
        '.btn-outline:hover': { '@apply bg-surface-50': {} },
        '.btn-ghost': {
          '@apply bg-transparent text-ink-900 border-transparent shadow-none': {},
        },
        '.btn-link': {
          '@apply bg-transparent text-primary-700 border-transparent underline underline-offset-4': {},
        },

        '.btn-sm': { '@apply h-9 px-3 text-xs': {} },
        '.btn-md': { '@apply h-10 px-4 text-sm': {} },
        '.btn-lg': { '@apply h-12 px-5 text-base': {} },

        '.card': {
          '@apply bg-white rounded-lg shadow-card border border-border-200': {},
        },

        '.input': {
          '@apply w-full rounded border border-border-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder-ink-400 outline-none shadow-soft transition-all': {},
        },
        '.input:focus': { '@apply ring-2 ring-primary-300 border-primary-400': {} },
        '.input:disabled': { '@apply bg-surface-100 text-ink-400 cursor-not-allowed': {} },
        '.input-invalid': { '@apply border-accent-400 ring-2 ring-accent-200': {} },

        '.select': { '@apply input appearance-none pr-9 bg-no-repeat bg-right': {} },
        '.textarea': { '@apply input min-h-[120px] resize-y align-top': {} },

        '.badge': {
          '@apply inline-flex items-center rounded-full border border-border-200 bg-surface-100 text-ink-700 px-2.5 py-1 text-xs font-medium': {},
        },
        '.badge-accent': { '@apply bg-accent-100 text-accent-800 border-accent-200': {} },

        '.modal': { '@apply fixed inset-0 z-50 flex items-center justify-center': {} },
        '.modal-backdrop': { '@apply absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]': {} },
        '.modal-window': { '@apply relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-card border border-border-200': {} },
        '.modal-titlebar': { '@apply mb-4 text-lg font-semibold text-ink-900': {} },
        '.modal-actions': { '@apply mt-6 flex justify-end gap-2': {} },

        '.toast': {
          '@apply pointer-events-auto inline-flex items-center gap-3 rounded-md border px-4 py-2 shadow-soft': {},
        },
        '.toast-info': { '@apply bg-primary-50 text-ink-900 border-primary-200': {} },
        '.toast-success': { '@apply bg-palm-50 text-ink-900 border-palm-200': {} },
        '.toast-warn': { '@apply bg-peach-50 text-ink-900 border-peach-200': {} },
        '.toast-error': { '@apply bg-lilac-50 text-ink-900 border-lilac-200': {} },
      })

      // Icon utilities
      addUtilities(
        {
          '.icon': {
            stroke: 'currentColor',
            fill: 'none',
            strokeWidth: '1.5',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            width: '1.25rem',
            height: '1.25rem',
          },
          '.icon-sm': { width: '1rem', height: '1rem' },
          '.icon-lg': { width: '1.5rem', height: '1.5rem' },
        },
        { variants: ['responsive'] }
      )
    }),
  ],
}


