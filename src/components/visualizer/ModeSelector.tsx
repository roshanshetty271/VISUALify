'use client';

export type VisualizationMode = 'canvas' | 'lyrics' | 'piano';

interface ModeSelectorProps {
  currentMode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
}

const modes: { id: VisualizationMode; label: string; icon: string }[] = [
  { id: 'lyrics', label: 'Lyrics', icon: '¶' },
  { id: 'canvas', label: 'Canvas', icon: '◉' },
  { id: 'piano', label: 'Piano', icon: '🎹' },
];

export function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-white/[0.06] backdrop-blur-md rounded-lg border border-white/[0.08]">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all duration-200 ${currentMode === mode.id
            ? 'bg-[var(--theme-primary)] text-black shadow-[0_0_12px_var(--theme-primary)]'
            : 'text-zinc-500 hover:text-white hover:bg-white/[0.06]'
            }`}
        >
          <span className={`text-[10px] transition-transform duration-200 ${currentMode === mode.id ? 'scale-110' : 'group-hover:scale-110'
            }`}>
            {mode.icon}
          </span>
          <span className="hidden sm:inline">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
