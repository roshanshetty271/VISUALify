// Color utilities for charts and visualizations

/**
 * Spotify-themed chart colors
 */
export const chartColors = {
  primary: '#1DB954',      // Spotify green
  secondary: '#535353',
  background: '#121212',
  surface: '#181818',
  surfaceHover: '#282828',
  text: '#FFFFFF',
  textMuted: '#B3B3B3',
  grid: '#282828',
};

/**
 * Mood-based color palette
 */
export const moodColors = {
  happy: '#FBBF24',        // Yellow
  calm: '#10B981',         // Green
  energetic: '#EC4899',    // Pink
  melancholy: '#3B82F6',   // Blue
  neutral: '#8B5CF6',      // Purple

  /**
   * Get color from energy and valence values
   */
  fromMood: (energy: number, valence: number): string => {
    if (valence > 0.6 && energy > 0.6) return moodColors.happy;
    if (valence > 0.6) return moodColors.calm;
    if (energy > 0.6) return moodColors.energetic;
    if (valence < 0.4 && energy < 0.4) return moodColors.melancholy;
    return moodColors.neutral;
  },
};

