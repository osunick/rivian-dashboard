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
        claude: {
          bg: '#FDFCFB',
          card: '#FFFFFF',
          border: '#E8E6E1',
          text: '#2B2927',
          muted: '#8A8782',
          accent: '#DA7756', // Claude Peach/Orange
          accentHover: '#C46447',
          surface: '#F5F4F0',
        },
        bg: '#FDFCFB',
        card: '#FFFFFF',
        border: '#E8E6E1',
        primary: '#2B2927',
        muted: '#8A8782',
        positive: '#40806A', // Muted green
        neutral: '#8A8782',
        negative: '#C4554D', // Muted red
        accent: '#DA7756',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
