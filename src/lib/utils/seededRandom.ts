/**
 * Seeded random number generator using mulberry32 algorithm
 * Produces stable, reproducible random numbers given the same seed
 */
export function createSeededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Get a single seeded random value
 */
export function seededRandom(seed: number): number {
  const rng = createSeededRandom(seed);
  return rng();
}

/**
 * Generate an array of seeded random numbers
 */
export function seededRandomArray(seed: number, count: number): number[] {
  const rng = createSeededRandom(seed);
  return Array.from({ length: count }, () => rng());
}

/**
 * Generate stable star positions for visualizations
 */
export function generateStars(
  count: number,
  seed: number = 12345
): Array<{ x: number; y: number; size: number; opacity: number }> {
  const rng = createSeededRandom(seed);
  return Array.from({ length: count }, () => ({
    x: rng() * 100,
    y: rng() * 100,
    size: rng() * 1.5 + 0.5,
    opacity: rng() * 0.5 + 0.2,
  }));
}

/**
 * Generate stable mountain peaks for terrain visualization
 */
export function generateMountainPeaks(
  count: number,
  seed: number = 54321
): Array<{ heightFactor: number; widthFactor: number }> {
  const rng = createSeededRandom(seed);
  return Array.from({ length: count }, () => ({
    heightFactor: rng(),
    widthFactor: rng() * 0.3 + 0.7,
  }));
}

