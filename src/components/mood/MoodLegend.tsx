'use client';

import { moodColors } from '@/lib/utils/colors';

/**
 * Legend showing mood color mappings
 */
export function MoodLegend() {
  const moods = [
    { name: 'Happy & Energetic', color: moodColors.happy, desc: 'High valence, high energy' },
    { name: 'Calm & Peaceful', color: moodColors.calm, desc: 'High valence, low energy' },
    { name: 'Energetic & Intense', color: moodColors.energetic, desc: 'Low valence, high energy' },
    { name: 'Melancholy & Sad', color: moodColors.melancholy, desc: 'Low valence, low energy' },
    { name: 'Neutral', color: moodColors.neutral, desc: 'Medium valence and energy' },
  ];

  return (
    <div className="bg-zinc-900 rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4">Mood Colors</h3>
      <div className="space-y-3">
        {moods.map((mood) => (
          <div key={mood.name} className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: mood.color }}
            />
            <div className="flex-1">
              <div className="text-sm font-medium">{mood.name}</div>
              <div className="text-xs text-zinc-500">{mood.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500">
          Point size represents energy level. Position on Y-axis shows happiness (valence).
        </p>
      </div>
    </div>
  );
}

