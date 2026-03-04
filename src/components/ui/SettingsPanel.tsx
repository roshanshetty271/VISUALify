'use client';

import { useSettingsStore } from '@/stores/useSettingsStore';
import { useThemeStore, THEMES, ThemeName } from '@/stores/useThemeStore';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
}

function Slider({ label, value, min, max, step, onChange, unit = '' }: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-mono">{value.toFixed(step < 1 ? 1 : 0)}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-[var(--theme-primary)]
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:shadow-lg
                   [&::-webkit-slider-thumb]:transition-transform
                   [&::-webkit-slider-thumb]:hover:scale-110"
      />
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
        {label}
      </span>
      <button
        onClick={() => onChange(!checked)}
        className={`
          relative w-11 h-6 rounded-full transition-colors duration-200
          ${checked ? 'bg-[var(--theme-primary)]' : 'bg-white/20'}
        `}
      >
        <span
          className={`
            absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md
            transition-transform duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </label>
  );
}

function ThemeSelector() {
  const { currentTheme, setTheme } = useThemeStore();

  return (
    <div className="space-y-3">
      <span className="text-sm text-gray-400">Color Theme</span>
      <div className="grid grid-cols-5 gap-2">
        {(Object.keys(THEMES) as ThemeName[]).map((themeName) => {
          const theme = THEMES[themeName];
          const isActive = currentTheme === themeName;
          
          return (
            <button
              key={themeName}
              onClick={() => setTheme(themeName)}
              className={`
                group relative flex flex-col items-center gap-1 p-2 rounded-lg
                transition-all duration-200
                ${isActive ? 'bg-white/10 ring-2 ring-white/30' : 'hover:bg-white/5'}
              `}
              title={theme.label}
            >
              {/* Color swatch */}
              <div 
                className="w-8 h-8 rounded-full shadow-lg transition-transform group-hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                  boxShadow: isActive ? `0 0 12px ${theme.primary}` : undefined,
                }}
              />
              <span className="text-[10px] text-gray-500 group-hover:text-gray-300">
                {theme.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsPanel() {
  const {
    animationSpeed,
    showStats,
    showTrackLabels,
    glowIntensity,
    settingsPanelOpen,
    setAnimationSpeed,
    setShowStats,
    setShowTrackLabels,
    setGlowIntensity,
    setSettingsPanelOpen,
    resetToDefaults,
  } = useSettingsStore();

  if (!settingsPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={() => setSettingsPanelOpen(false)}
      />

      {/* Panel */}
      <div 
        className="fixed right-0 top-0 h-full w-80 bg-[#0f0f18]/95 backdrop-blur-xl 
                   border-l border-white/10 z-50 overflow-y-auto
                   animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0f0f18]/90 backdrop-blur-sm p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white">Settings</h2>
          <button
            onClick={() => setSettingsPanelOpen(false)}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Theme */}
          <section>
            <ThemeSelector />
          </section>

          <hr className="border-white/10" />

          {/* Animation Settings */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Animation</h3>
            
            <Slider
              label="Animation Speed"
              value={animationSpeed}
              min={0.5}
              max={2}
              step={0.1}
              onChange={setAnimationSpeed}
              unit="x"
            />

            <Slider
              label="Glow Intensity"
              value={glowIntensity}
              min={0}
              max={1}
              step={0.1}
              onChange={setGlowIntensity}
            />
          </section>

          <hr className="border-white/10" />

          {/* Display */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Display</h3>
            
            <Toggle
              label="Show Audio Stats"
              checked={showStats}
              onChange={setShowStats}
            />

            <Toggle
              label="Show Track Labels"
              checked={showTrackLabels}
              onChange={setShowTrackLabels}
            />
          </section>

          <hr className="border-white/10" />

          {/* Reset */}
          <button
            onClick={resetToDefaults}
            className="w-full py-2 px-4 rounded-lg border border-white/20 text-gray-400 
                       hover:text-white hover:border-white/40 transition-colors text-sm"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </>
  );
}

