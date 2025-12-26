import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-space-grotesk)', 'monospace'],
      },
      colors: {
        spotify: {
          green: '#1DB954',
          'green-light': '#1ed760',
        },
        dark: {
          bg: '#0a0a0f',
          card: '#1a1a2e',
          border: 'rgba(255,255,255,0.08)',
        },
      },
      animation: {
        'pulse-bpm': 'pulse-bpm var(--pulse-duration, 1s) ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'orbit': 'orbit var(--orbit-duration, 20s) linear infinite',
        // Note: float, float-slow, float-slower, and wave are defined in globals.css
      },
      keyframes: {
        'pulse-bpm': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
        },
        glow: {
          '0%, 100%': { 
            textShadow: '0 0 20px rgba(29, 185, 84, 0.5), 0 0 40px rgba(29, 185, 84, 0.3)',
          },
          '50%': { 
            textShadow: '0 0 30px rgba(29, 185, 84, 0.8), 0 0 60px rgba(29, 185, 84, 0.5)',
          },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        // Note: float and wave keyframes are defined in globals.css
      },
    },
  },
  plugins: [],
};

export default config;
