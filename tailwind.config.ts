import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Daylight intelligence palette (token names kept for drop-in reskin)
        claude: {
          bg: '#F6F4EF',
          card: '#FFFDF8',
          border: '#DED7CA',
          text: '#171713',
          muted: '#6F695F',
          accent: '#0F5BD7',
          accentHover: '#0B49B0',
          surface: '#F0EBE2',
        },
        marvel: {
          red: '#C83B2B',
          redDeep: '#8F261C',
          gold: '#B58417',
          steel: '#0F5BD7',
          ink: '#171713',
          panel: '#FFFDF8',
          line: '#DED7CA',
        },
        bg: '#F6F4EF',
        card: '#FFFDF8',
        border: '#DED7CA',
        primary: '#171713',
        muted: '#6F695F',
        positive: '#2DD4A7',
        neutral: '#8B8F99',
        negative: '#F0453A',
        accent: '#0F5BD7',
      },
      fontFamily: {
        sans: ['var(--font-display)', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        poster: ['var(--font-poster)', 'var(--font-display)', 'Impact', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        cinematic: '0 22px 55px -24px rgba(38,32,23,0.28)',
        glow: '0 0 0 1px rgba(15,91,215,0.28), 0 14px 34px -22px rgba(15,91,215,0.55)',
      },
    },
  },
  plugins: [],
};

export default config;
