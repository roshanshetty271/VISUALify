'use client';

export type VisualizationMode = 'galaxy' | 'terrain' | 'neural' | 'river' | 'waveform' | 'particles';

interface ModeSelectorProps {
  currentMode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
}

const modes: { id: VisualizationMode; label: string; icon: string }[] = [
  { id: 'galaxy', label: 'Galaxy', icon: '🌌' },
  { id: 'terrain', label: 'Terrain', icon: '🏔️' },
  { id: 'neural', label: 'Neural', icon: '🧠' },
  { id: 'river', label: 'River', icon: '🌊' },
  { id: 'waveform', label: 'Wave', icon: '🎵' },
  { id: 'particles', label: 'Particles', icon: '✨' },
];

export function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-xl">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`
            relative px-3 py-2 rounded-full text-sm font-medium transition-all duration-300
            ${currentMode === mode.id 
              ? 'bg-[var(--theme-primary)] text-black shadow-lg' 
              : 'text-gray-400 hover:text-white hover:bg-white/10'
            }
          `}
          title={mode.label}
        >
          <span className="mr-1.5">{mode.icon}</span>
          <span className="hidden md:inline">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
