'use client';

export type VisualizationMode = 'pulse' | 'orbit' | 'particles';

interface ModeSelectorProps {
  currentMode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
}

const modes: { id: VisualizationMode; label: string }[] = [
  { id: 'pulse', label: 'Pulse' },
  { id: 'orbit', label: 'Orbit' },
  { id: 'particles', label: 'Particles' },
];

export function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-white/[0.06] backdrop-blur-md rounded-lg border border-white/[0.08]">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all duration-200 ${
            currentMode === mode.id
              ? 'bg-[#1DB954] text-black'
              : 'text-zinc-500 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
