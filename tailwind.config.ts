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
        // Marvel Studios cinematic dark palette (token names kept for drop-in reskin)
        claude: {
          bg: '#08080A',
          card: '#131318',
          border: '#26262F',
          text: '#F4F4F7',
          muted: '#9A9AA6',
          accent: '#E62429',      // Marvel red
          accentHover: '#FF3B41',
          surface: '#1B1B22',
        },
        marvel: {
          red: '#E62429',
          redDeep: '#A30E13',
          gold: '#F5C518',
          steel: '#3A86FF',
          ink: '#08080A',
          panel: '#131318',
          line: '#26262F',
        },
        bg: '#08080A',
        card: '#131318',
        border: '#26262F',
        primary: '#F4F4F7',
        muted: '#9A9AA6',
        positive: '#2DD4A7',
        neutral: '#9AA0AA',
        negative: '#F0453A',
        accent: '#E62429',
      },
      fontFamily: {
        sans: ['var(--font-display)', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        poster: ['var(--font-poster)', 'var(--font-display)', 'Impact', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        cinematic: '0 24px 60px -12px rgba(0,0,0,0.7)',
        glow: '0 0 0 1px rgba(230,36,41,0.4), 0 0 28px -6px rgba(230,36,41,0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
