import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  animationSpeed: number;     // 0.5 to 2.0
  particleCount: number;      // 50 to 200
  showStats: boolean;         // Show energy/tempo overlay
  showTrackLabels: boolean;   // Show track names on visualizer
  glowIntensity: number;      // 0 to 1
  orbitSpeed: number;         // 0.5 to 2.0 for Galaxy mode
  settingsPanelOpen: boolean;
}

interface SettingsActions {
  setAnimationSpeed: (speed: number) => void;
  setParticleCount: (count: number) => void;
  setShowStats: (show: boolean) => void;
  setShowTrackLabels: (show: boolean) => void;
  setGlowIntensity: (intensity: number) => void;
  setOrbitSpeed: (speed: number) => void;
  toggleSettingsPanel: () => void;
  setSettingsPanelOpen: (open: boolean) => void;
  resetToDefaults: () => void;
}

const defaultSettings: SettingsState = {
  animationSpeed: 1.0,
  particleCount: 100,
  showStats: true,
  showTrackLabels: true,
  glowIntensity: 0.7,
  orbitSpeed: 1.0,
  settingsPanelOpen: false,
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setAnimationSpeed: (speed) => set({ animationSpeed: speed }),
      setParticleCount: (count) => set({ particleCount: count }),
      setShowStats: (show) => set({ showStats: show }),
      setShowTrackLabels: (show) => set({ showTrackLabels: show }),
      setGlowIntensity: (intensity) => set({ glowIntensity: intensity }),
      setOrbitSpeed: (speed) => set({ orbitSpeed: speed }),
      toggleSettingsPanel: () => set((state) => ({ settingsPanelOpen: !state.settingsPanelOpen })),
      setSettingsPanelOpen: (open) => set({ settingsPanelOpen: open }),
      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: 'visualify-settings',
      partialize: (state) => ({
        animationSpeed: state.animationSpeed,
        particleCount: state.particleCount,
        showStats: state.showStats,
        showTrackLabels: state.showTrackLabels,
        glowIntensity: state.glowIntensity,
        orbitSpeed: state.orbitSpeed,
      }),
    }
  )
);

// Selector hooks
export const useAnimationSpeed = () => useSettingsStore((s) => s.animationSpeed);
export const useParticleCount = () => useSettingsStore((s) => s.particleCount);
export const useShowStats = () => useSettingsStore((s) => s.showStats);
export const useShowTrackLabels = () => useSettingsStore((s) => s.showTrackLabels);
export const useGlowIntensity = () => useSettingsStore((s) => s.glowIntensity);
export const useOrbitSpeed = () => useSettingsStore((s) => s.orbitSpeed);
export const useSettingsPanelOpen = () => useSettingsStore((s) => s.settingsPanelOpen);

