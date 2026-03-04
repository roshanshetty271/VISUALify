'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { interpolateHsl } from 'd3-interpolate';
import { color as d3color } from 'd3-color';
import { useAudioFeatures, useIsPlaying } from '@/stores';
import { beatClock } from '@/lib/utils/beatClock';

interface Ring {
  birth: number;
  radius: number;
  maxRadius: number;
  color: string;
  width: number;
}

interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hue: number;
}

const DUST_COUNT = 80;

export function PulseMode() {
  const audioFeatures = useAudioFeatures();
  const isPlaying = useIsPlaying();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const ringsRef = useRef<Ring[]>([]);
  const dustRef = useRef<Dust[]>([]);
  const lastBeatRef = useRef(-1);
  const lastFrameRef = useRef(performance.now());
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const energy = audioFeatures?.energy ?? 0.5;
  const tempo = audioFeatures?.tempo ?? 120;
  const valence = audioFeatures?.valence ?? 0.5;

  const ringThickness = scaleLinear().domain([0, 1]).range([1.5, 5]).clamp(true);
  const ringBrightness = scaleLinear().domain([0, 1]).range([0.3, 0.9]).clamp(true);
  const ringSpeed = scaleLinear().domain([0, 1]).range([1.5, 4]).clamp(true);
  const colorBlend = (v: number) => interpolateHsl('#3b82f6', '#fbbf24')(v);

  useEffect(() => {
    const update = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight - 200 });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    dustRef.current = Array.from({ length: DUST_COUNT }, () => createDust(cx, cy, dimensions.width, dimensions.height));
  }, [dimensions]);

  const createDust = (cx: number, cy: number, w: number, h: number): Dust => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * Math.max(w, h) * 0.4;
    return {
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: 0.5 + Math.random() * 1.5,
      alpha: 0.1 + Math.random() * 0.25,
      hue: 140 + Math.random() * 80,
    };
  };

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const now = performance.now();
    const dt = Math.min((now - lastFrameRef.current) / 1000, 0.05);
    lastFrameRef.current = now;

    beatClock.tick(dt, isPlaying);

    const { width: w, height: h } = dimensions;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);

    const kick = beatClock.kick(tempo);
    const currentBeat = beatClock.beatIndex(tempo);

    // Spawn ring on each new beat
    if (currentBeat !== lastBeatRef.current && isPlaying) {
      lastBeatRef.current = currentBeat;
      const baseColor = colorBlend(valence);
      ringsRef.current.push({
        birth: beatClock.now,
        radius: 10 + energy * 20,
        maxRadius: maxR * (0.8 + energy * 0.4),
        color: baseColor,
        width: ringThickness(energy),
      });
    }

    // Clear
    ctx.fillStyle = `rgba(8, 8, 14, ${0.12 + kick * 0.06})`;
    ctx.fillRect(0, 0, w, h);

    // Update and draw dust particles
    const dustPush = kick * energy * 2;
    dustRef.current.forEach((d) => {
      const dx = d.x - cx;
      const dy = d.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      d.vx += (dx / dist) * dustPush * 0.3;
      d.vy += (dy / dist) * dustPush * 0.3;

      // Gentle orbit
      d.vx += (-dy / dist) * 0.05;
      d.vy += (dx / dist) * 0.05;

      // Attraction back to center zone
      if (dist > maxR * 0.5) {
        d.vx -= (dx / dist) * 0.02;
        d.vy -= (dy / dist) * 0.02;
      }

      d.vx *= 0.985;
      d.vy *= 0.985;
      d.x += d.vx;
      d.y += d.vy;

      // Reset if out of bounds
      if (d.x < -20 || d.x > w + 20 || d.y < -20 || d.y > h + 20) {
        Object.assign(d, createDust(cx, cy, w, h));
      }

      const alpha = d.alpha * (0.5 + kick * 0.5);
      const hue = d.hue + valence * 30;

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size * (1 + kick * 0.4), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 60%, 65%, ${alpha})`;
      ctx.fill();
    });

    // Center glow — pulses with beat
    const glowRadius = 40 + energy * 60 + kick * 30;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    const parsed = d3color(colorBlend(valence));
    const r = parsed?.rgb().r ?? 29, g = parsed?.rgb().g ?? 185, b = parsed?.rgb().b ?? 84;
    const centerAlpha = (ringBrightness(energy) * 0.4 + kick * 0.2).toFixed(3);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${centerAlpha})`);
    grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.06)`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Inner core dot
    const coreR = 3 + kick * 4 + energy * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + kick * 0.4})`;
    ctx.fill();

    // Draw expanding rings
    const now2 = beatClock.now;
    ringsRef.current = ringsRef.current.filter((ring) => {
      void (now2 - ring.birth);
      const speed = ringSpeed(energy);
      ring.radius += speed * dt * 200;

      if (ring.radius > ring.maxRadius) return false;

      const life = 1 - ring.radius / ring.maxRadius;
      const alpha = life * life * ringBrightness(energy);

      ctx.beginPath();
      ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.width * life;
      ctx.globalAlpha = alpha;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Secondary faint ring slightly behind
      if (ring.radius > 20) {
        ctx.beginPath();
        ctx.arc(cx, cy, ring.radius * 0.92, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = ring.width * life * 0.3;
        ctx.globalAlpha = alpha * 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      return true;
    });

    // Subtle half-beat ripple
    const halfKick = beatClock.halfBeat(tempo);
    if (halfKick > 0.5) {
      ctx.beginPath();
      ctx.arc(cx, cy, 20 + (1 - halfKick) * 60, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${(halfKick - 0.5) * 0.15})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [dimensions, energy, tempo, valence, isPlaying, colorBlend, ringThickness, ringBrightness, ringSpeed]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  // Idle: still render ambient dust on dark background
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#08080e]">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
    </div>
  );
}
