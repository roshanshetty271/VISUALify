'use client';

import { useProgress, useDuration } from '@/stores';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface ProgressBarProps {
  compact?: boolean;
}

export function ProgressBar({ compact = false }: ProgressBarProps) {
  const progress = useProgress();
  const duration = useDuration();
  const percentage = duration > 0 ? (progress / duration) * 100 : 0;

  if (compact) {
    return (
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-spotify-green transition-all duration-100 ease-linear"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex items-center gap-3">
      {/* Current time */}
      <span className="text-xs text-gray-500 font-mono w-10 text-right">
        {formatTime(progress)}
      </span>

      {/* Progress bar */}
      <div className="flex-1 group relative">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          {/* Progress fill */}
          <div
            className="h-full bg-gradient-to-r from-spotify-green to-spotify-green-light rounded-full transition-all duration-100 ease-linear relative"
            style={{ width: `${percentage}%` }}
          >
            {/* Glowing edge */}
            <div 
              className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              style={{ boxShadow: '0 0 8px #1DB954' }}
            />
          </div>
        </div>

        {/* Buffered indicator (optional visual) */}
        <div 
          className="absolute top-0 left-0 h-full pointer-events-none"
          style={{ width: `${Math.min(percentage + 5, 100)}%` }}
        >
          <div className="h-1.5 bg-white/5 rounded-full" />
        </div>
      </div>

      {/* Total time */}
      <span className="text-xs text-gray-500 font-mono w-10">
        {formatTime(duration)}
      </span>
    </div>
  );
}

