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
        background: '#000000',
        canvas: '#000000',
        surface: {
          DEFAULT: '#0a0a0a',
          subtle: '#121212',
          elevated: '#171717',
          hover: '#1f1f1f',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.1)',
          subtle: 'rgba(255, 255, 255, 0.06)',
          strong: 'rgba(255, 255, 255, 0.2)',
        },
        ink: {
          DEFAULT: '#ededed',
          primary: '#ffffff',
          secondary: '#a1a1aa',
          muted: '#71717a',
        },
        accent: {
          DEFAULT: '#ffffff',
          dark: '#e4e4e7',
          subtle: 'rgba(255, 255, 255, 0.05)',
        },
        status: {
          success: '#10b981',
          'success-subtle': 'rgba(16, 185, 129, 0.1)',
          warning: '#f59e0b',
          'warning-subtle': 'rgba(245, 158, 11, 0.1)',
          error: '#ef4444',
          'error-subtle': 'rgba(239, 68, 68, 0.1)',
          info: '#3b82f6',
          'info-subtle': 'rgba(59, 130, 246, 0.1)',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'Fira Code', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'vercel-subtle': '0 0 0 1px rgba(255, 255, 255, 0.1)',
        'vercel-card': '0 0 0 1px rgba(255, 255, 255, 0.1), 0 4px 14px 0 rgba(0, 0, 0, 0.4)',
        'vercel-elevated': '0 0 0 1px rgba(255, 255, 255, 0.14), 0 8px 30px rgba(0, 0, 0, 0.6)',
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '10px',
      }
    },
  },
  plugins: [],
}
