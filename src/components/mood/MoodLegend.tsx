'use client';

import { moodColors } from '@/lib/utils/colors';

export function MoodLegend() {
  const moods = [
    { name: 'Happy', color: moodColors.happy, valence: 'High', energy: 'High', example: 'Upbeat pop, dance hits' },
    { name: 'Calm', color: moodColors.calm, valence: 'High', energy: 'Low', example: 'Acoustic, chill vibes' },
    { name: 'Intense', color: moodColors.energetic, valence: 'Low', energy: 'High', example: 'Metal, intense EDM' },
    { name: 'Sad', color: moodColors.melancholy, valence: 'Low', energy: 'Low', example: 'Ballads, slow songs' },
    { name: 'Neutral', color: moodColors.neutral, valence: 'Mid', energy: 'Mid', example: 'Mid-tempo, balanced' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/80 rounded-xl p-5 border border-zinc-800/50">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Mood Colors</h3>
        <div className="space-y-2.5">
          {moods.map((mood) => (
            <div key={mood.name} className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: mood.color }} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-zinc-300">{mood.name}</span>
                <span className="text-[10px] text-zinc-600 ml-1.5">{mood.example}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/80 rounded-xl p-5 border border-zinc-800/50">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">How it works</h3>
        <div className="space-y-2 text-[11px] text-zinc-500 leading-relaxed">
          <p>
            Spotify analyses every track and assigns audio features like{' '}
            <span className="text-zinc-300">valence</span> (how happy it sounds) and{' '}
            <span className="text-zinc-300">energy</span> (how intense it is).
          </p>
          <p>
            We plot <span className="text-zinc-300">valence</span> on the Y-axis. Dot size
            reflects <span className="text-zinc-300">energy</span>. Color comes from combining both.
          </p>
          <div className="pt-2 border-t border-zinc-800/50">
            <p className="text-zinc-600">
              Faded dots at 50% = Spotify has no audio data for that track. Re-import to try fetching again.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
