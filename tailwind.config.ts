import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './contexts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
      // Corporate-Identity-Token. Speisen sich aus den CSS-Variablen, die der
      // CiThemeProvider pro Unternehmen setzt (Default = Violett via globals.css).
      // Nutzbar als bg-ci, text-ci, text-ci-on, bg-ci-soft, ring-ci, border-ci.
      colors: {
        ci: {
          DEFAULT: 'var(--ci-primary)',
          hover: 'var(--ci-primary-hover)',
          on: 'var(--ci-on-primary)',
          soft: 'var(--ci-primary-soft)',
          ink: 'var(--ci-ink)',
        },
        // JobQuest-Marken-Palette (Handoff). Eigener Namespace, um Tailwinds
        // eingebaute indigo/slate/sky NICHT zu überschreiben.
        jq: {
          night: { DEFAULT: '#180273', 2: '#23119A' },
          indigo: {
            50: '#EEEBFF', 100: '#DDD6FF', 200: '#BEB0FF', 300: '#9A87FA', 400: '#7A5FF2',
            500: '#5A3FEA', 600: '#3A22E0', 700: '#2A14B8', 800: '#1E0E8C', 900: '#180273',
            DEFAULT: '#3A22E0', deep: '#2A14B8',
          },
          frost: '#CEF2FD', sky: '#62CDF2', cloud: '#EAF6FE',
          coral: { DEFAULT: '#FF6B4A', soft: '#FFE5DD' },
          ink: '#15123A', slate: '#52507A', mist: '#9A99B8',
          line: { DEFAULT: '#E7E6F2', 2: '#F0EFF8' },
          paper: { DEFAULT: '#FFFFFF', 2: '#F7F7FC' },
          success: '#14B87B', warning: '#F5A524', error: '#F0476A', info: '#2BB3E6',
        },
      },
    },
  },
  plugins: [],
};

export default config;
