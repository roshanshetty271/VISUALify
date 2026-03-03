// Color utilities for charts and visualizations

export const chartColors = {
  primary: '#1DB954',
  secondary: '#535353',
  background: '#121212',
  surface: '#181818',
  surfaceHover: '#282828',
  text: '#FFFFFF',
  textMuted: '#B3B3B3',
  grid: '#282828',
};

export const moodColors = {
  happy: '#FBBF24',        // Yellow - high valence, high energy
  calm: '#10B981',         // Green  - high valence, low energy
  energetic: '#EC4899',    // Pink   - low valence, high energy
  melancholy: '#3B82F6',   // Blue   - low valence, low energy
  neutral: '#8B5CF6',      // Purple - middle ground

  fromMood: (energy: number, valence: number): string => {
    if (valence > 0.6 && energy > 0.6) return moodColors.happy;
    if (valence > 0.6) return moodColors.calm;
    if (energy > 0.6) return moodColors.energetic;
    if (valence < 0.4 && energy < 0.4) return moodColors.melancholy;
    return moodColors.neutral;
  },

  labelFromMood: (energy: number, valence: number): string => {
    if (valence > 0.6 && energy > 0.6) return 'Happy';
    if (valence > 0.6) return 'Calm';
    if (energy > 0.6) return 'Intense';
    if (valence < 0.4 && energy < 0.4) return 'Sad';
    return 'Neutral';
  },

  isDefault: (energy: number, valence: number): boolean => {
    return energy === 0.5 && valence === 0.5;
  },
};

