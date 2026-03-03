import { easeExpOut, easeCubicOut } from 'd3-ease';
import { scaleLinear } from 'd3-scale';
import { interpolateHsl } from 'd3-interpolate';

/**
 * BeatClock provides sharp, music-reactive timing values.
 *
 * Instead of smooth sine waves, it produces exponential-decay "kicks"
 * that spike at 1.0 on each beat and decay quickly to 0.
 *
 *   sine:  ~~~∿~~~∿~~~   (smooth, boring)
 *   kick:  |╲_____|╲__   (sharp hit, fast decay — feels musical)
 */
export class BeatClock {
  private time = 0;

  /** Advance the clock. Call once per animation frame. */
  tick(dt: number, isPlaying: boolean) {
    this.time += dt * (isPlaying ? 1 : 0.15);
  }

  /** Raw time value (seconds, always increasing). */
  get now() {
    return this.time;
  }

  /** 0-1 kick envelope for full beats. 1.0 at beat, decays to 0. */
  kick(tempo: number): number {
    if (tempo <= 0) return 0;
    const beatDuration = 60 / tempo;
    const progress = (this.time % beatDuration) / beatDuration;
    return 1 - easeExpOut(progress);
  }

  /** 0-1 kick on half beats (2x frequency). */
  halfBeat(tempo: number): number {
    return this.kick(tempo * 2);
  }

  /** 0-1 kick on quarter beats (4x frequency). */
  quarterBeat(tempo: number): number {
    return this.kick(tempo * 4);
  }

  /** Smooth 0-1 oscillation at beat rate (for gentler effects). */
  pulse(tempo: number): number {
    if (tempo <= 0) return 0.5;
    const beatDuration = 60 / tempo;
    const progress = (this.time % beatDuration) / beatDuration;
    return 1 - easeCubicOut(progress);
  }

  /** Which beat number we're on (integer, wraps every 256 beats). */
  beatIndex(tempo: number): number {
    if (tempo <= 0) return 0;
    return Math.floor(this.time / (60 / tempo)) % 256;
  }
}

/**
 * Map energy (0-1) to a visual scale using d3-scale.
 * Returns a function that converts energy to a sized value.
 */
export function energyScale(min: number, max: number) {
  return scaleLinear().domain([0, 1]).range([min, max]).clamp(true);
}

/**
 * Blend between a "sad" (cool) and "happy" (warm) color based on valence.
 * Uses d3-interpolate for smooth HSL transitions.
 */
export function valenceColor(valence: number, coolColor = '#3b82f6', warmColor = '#fbbf24'): string {
  return interpolateHsl(coolColor, warmColor)(valence);
}

/** Singleton for shared use across modes. */
export const beatClock = new BeatClock();
