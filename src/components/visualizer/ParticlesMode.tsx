'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { interpolateHsl } from 'd3-interpolate';
import { color as d3color } from 'd3-color';
import { useCurrentTrack, useAudioFeatures, useIsPlaying } from '@/stores';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { beatClock } from '@/lib/utils/beatClock';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

const TRAIL_LENGTH = 6;

function toRgba(colorStr: string, alpha: number): string {
  const c = d3color(colorStr);
  if (!c) return `rgba(140, 200, 140, ${alpha})`;
  const { r, g, b } = c.rgb();
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ParticlesMode() {
  const currentTrack = useCurrentTrack();
  const audioFeatures = useAudioFeatures();
  const isPlaying = useIsPlaying();
  const particleCount = useSettingsStore((s) => s.particleCount);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const lastBeatRef = useRef(-1);
  const lastFrameRef = useRef(performance.now());
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const energy = audioFeatures?.energy ?? 0.5;
  const tempo = audioFeatures?.tempo ?? 120;
  const valence = audioFeatures?.valence ?? 0.5;

  // d3-scale for mapping energy to visual params
  const speedScale = scaleLinear().domain([0, 1]).range([0.8, 2.5]).clamp(true);
  const sizeScale = scaleLinear().domain([0, 1]).range([1, 3.5]).clamp(true);
  const glowScale = scaleLinear().domain([0, 1]).range([0.05, 0.2]).clamp(true);

  // d3-interpolate for valence-based color palette
  const paletteBlend = useCallback((v: number, base: number) => {
    const cool = `hsl(${210 + base * 30}, 70%, 60%)`;
    const warm = `hsl(${40 + base * 30}, 80%, 60%)`;
    return interpolateHsl(cool, warm)(v);
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 200,
      });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const createParticle = useCallback((x?: number, y?: number): Particle => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 1.5 * speedScale(energy);

    return {
      x: x ?? centerX + (Math.random() - 0.5) * 120,
      y: y ?? centerY + (Math.random() - 0.5) * 120,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: sizeScale(energy) * (0.5 + Math.random()),
      life: 1,
      maxLife: 120 + Math.random() * 120,
      hue: Math.random(),
      trail: [],
    };
  }, [dimensions, energy, speedScale, sizeScale]);

  useEffect(() => {
    particlesRef.current = Array.from({ length: particleCount }, () => createParticle());
  }, [particleCount, createParticle]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const now = performance.now();
    const dt = Math.min((now - lastFrameRef.current) / 1000, 0.05);
    lastFrameRef.current = now;

    beatClock.tick(dt, isPlaying);

    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    const mouse = mouseRef.current;

    const kick = beatClock.kick(tempo);
    const currentBeat = beatClock.beatIndex(tempo);

    // Beat-scatter: on each new beat, push particles outward
    const isBeatHit = currentBeat !== lastBeatRef.current && isPlaying;
    if (isBeatHit) {
      lastBeatRef.current = currentBeat;
    }

    // Clear with subtle trail fade
    ctx.fillStyle = `rgba(10, 10, 15, ${0.08 + kick * 0.04})`;
    ctx.fillRect(0, 0, width, height);

    particlesRef.current.forEach((particle, index) => {
      // Store trail position
      particle.trail.unshift({ x: particle.x, y: particle.y, alpha: particle.life * 0.5 });
      if (particle.trail.length > TRAIL_LENGTH) particle.trail.pop();

      // Center attraction
      const dxCenter = centerX - particle.x;
      const dyCenter = centerY - particle.y;
      const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter) || 1;

      if (distCenter > 50) {
        particle.vx += (dxCenter / distCenter) * 0.02 * energy;
        particle.vy += (dyCenter / distCenter) * 0.02 * energy;
      }

      // Mouse repulsion
      const dxMouse = particle.x - mouse.x;
      const dyMouse = particle.y - mouse.y;
      const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

      if (distMouse < 120) {
        const force = (120 - distMouse) / 120;
        particle.vx += (dxMouse / distMouse) * force * 0.6;
        particle.vy += (dyMouse / distMouse) * force * 0.6;
      }

      // Beat-scatter: explosive outward push on each beat
      if (isBeatHit) {
        const scatterForce = energy * 3;
        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        particle.vx += (dx / dist) * scatterForce;
        particle.vy += (dy / dist) * scatterForce;
      }

      // Beat-responsive speed boost
      const beatBoost = 1 + kick * 0.4 * energy;

      particle.x += particle.vx * beatBoost;
      particle.y += particle.vy * beatBoost;

      // Damping
      particle.vx *= 0.975;
      particle.vy *= 0.975;

      particle.life -= 1 / particle.maxLife;

      // Reset if dead or out of bounds
      if (particle.life <= 0 ||
        particle.x < -50 || particle.x > width + 50 ||
        particle.y < -50 || particle.y > height + 50) {
        particlesRef.current[index] = createParticle();
        return;
      }

      const alpha = particle.life * (0.4 + energy * 0.5 + kick * 0.2);
      const size = particle.size * (1 + kick * 0.5);
      const color = paletteBlend(valence, particle.hue);

      // Draw trail
      for (let i = particle.trail.length - 1; i >= 0; i--) {
        const t = particle.trail[i];
        const trailAlpha = t.alpha * (1 - i / TRAIL_LENGTH) * 0.3;
        const trailSize = size * (1 - i / TRAIL_LENGTH) * 0.6;
        if (trailAlpha < 0.01) continue;

        ctx.beginPath();
        ctx.arc(t.x, t.y, trailSize, 0, Math.PI * 2);
        ctx.fillStyle = toRgba(color, trailAlpha);
        ctx.fill();
      }

      // Outer glow
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size * 3, 0, Math.PI * 2);
      ctx.fillStyle = toRgba(color, glowScale(energy) * alpha);
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      ctx.fillStyle = toRgba(color, alpha);
      ctx.fill();
    });

    // Center glow — pulses with beat
    const glowR = 80 + energy * 40 + kick * 30;
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowR);
    const glowColor = paletteBlend(valence, 0.5);
    gradient.addColorStop(0, toRgba(glowColor, 0.12));
    gradient.addColorStop(0.6, toRgba(glowColor, 0.03));
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, glowR, 0, Math.PI * 2);
    ctx.fill();

    animationRef.current = requestAnimationFrame(animate);
  }, [dimensions, energy, tempo, valence, isPlaying, createParticle, paletteBlend, glowScale]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  // Always render canvas — idle overlay from VisualizerContainer handles the "no track" state
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0a0a0f]">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
      {/* Hint — only when track is playing */}
      {currentTrack && (
        <div className="absolute bottom-4 right-4 text-[10px] text-zinc-700">
          Move mouse to interact
        </div>
      )}
    </div>
  );
}
