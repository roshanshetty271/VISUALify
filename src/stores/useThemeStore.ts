import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeName = 'spotify' | 'neon' | 'sunset' | 'ocean' | 'midnight';

export interface Theme {
  name: ThemeName;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
  bgStart: string;
  bgEnd: string;
}

export const THEMES: Record<ThemeName, Theme> = {
  spotify: {
    name: 'spotify',
    label: 'Spotify',
    primary: '#1DB954',
    secondary: '#1ed760',
    accent: '#22c55e',
    bgStart: '#0a0a0f',
    bgEnd: '#1a1a2e',
  },
  neon: {
    name: 'neon',
    label: 'Neon',
    primary: '#ff00ff',
    secondary: '#00ffff',
    accent: '#ff00aa',
    bgStart: '#0a0010',
    bgEnd: '#1a0030',
  },
  sunset: {
    name: 'sunset',
    label: 'Sunset',
    primary: '#ff6b35',
    secondary: '#f7931e',
    accent: '#ffcc00',
    bgStart: '#1a0a0a',
    bgEnd: '#2a1510',
  },
  ocean: {
    name: 'ocean',
    label: 'Ocean',
    primary: '#0077b6',
    secondary: '#00b4d8',
    accent: '#48cae4',
    bgStart: '#0a0a1a',
    bgEnd: '#0a1a2a',
  },
  midnight: {
    name: 'midnight',
    label: 'Midnight',
    primary: '#7c3aed',
    secondary: '#a78bfa',
    accent: '#c4b5fd',
    bgStart: '#0a0a15',
    bgEnd: '#1a1a35',
  },
};

interface ThemeState {
  currentTheme: ThemeName;
}

interface ThemeActions {
  setTheme: (theme: ThemeName) => void;
  getTheme: () => Theme;
}

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set, get) => ({
      currentTheme: 'spotify',

      setTheme: (theme) => {
        set({ currentTheme: theme });
        // Apply CSS variables
        const themeData = THEMES[theme];
        document.documentElement.style.setProperty('--theme-primary', themeData.primary);
        document.documentElement.style.setProperty('--theme-secondary', themeData.secondary);
        document.documentElement.style.setProperty('--theme-accent', themeData.accent);
        document.documentElement.style.setProperty('--theme-bg-start', themeData.bgStart);
        document.documentElement.style.setProperty('--theme-bg-end', themeData.bgEnd);
      },

      getTheme: () => THEMES[get().currentTheme],
    }),
    {
      name: 'visualify-theme',
      onRehydrateStorage: () => (state) => {
        // Re-apply theme on hydration
        if (state) {
          const themeData = THEMES[state.currentTheme];
          document.documentElement.style.setProperty('--theme-primary', themeData.primary);
          document.documentElement.style.setProperty('--theme-secondary', themeData.secondary);
          document.documentElement.style.setProperty('--theme-accent', themeData.accent);
          document.documentElement.style.setProperty('--theme-bg-start', themeData.bgStart);
          document.documentElement.style.setProperty('--theme-bg-end', themeData.bgEnd);
        }
      },
    }
  )
);

// Selector hooks
export const useCurrentTheme = () => useThemeStore((s) => s.currentTheme);
export const useThemeData = () => useThemeStore((s) => THEMES[s.currentTheme]);

