'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useCurrentTrack, useAudioFeatures, useIsPlaying } from '@/stores';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useThemeStore } from '@/stores/useThemeStore';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
}

export function ParticlesMode() {
  const currentTrack = useCurrentTrack();
  const audioFeatures = useAudioFeatures();
  const isPlaying = useIsPlaying();
  const particleCount = useSettingsStore((s) => s.particleCount);
  const theme = useThemeStore((s) => s.getTheme());
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const energy = audioFeatures?.energy ?? 0.5;
  const tempo = audioFeatures?.tempo ?? 120;
  const valence = audioFeatures?.valence ?? 0.5;

  // Update dimensions
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

  // Mouse tracking
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

  // Create particle
  const createParticle = useCallback((x?: number, y?: number): Particle => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 2 * energy;
    
    return {
      x: x ?? centerX + (Math.random() - 0.5) * 100,
      y: y ?? centerY + (Math.random() - 0.5) * 100,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      life: 1,
      maxLife: 100 + Math.random() * 100,
      hue: 140 + Math.random() * 40, // Green-ish hues
    };
  }, [dimensions, energy]);

  // Initialize particles
  useEffect(() => {
    particlesRef.current = Array.from({ length: particleCount }, () => createParticle());
  }, [particleCount, createParticle]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    const mouse = mouseRef.current;

    // Clear with fade effect
    ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
    ctx.fillRect(0, 0, width, height);

    // Draw and update particles
    particlesRef.current.forEach((particle, index) => {
      // Attraction to center
      const dxCenter = centerX - particle.x;
      const dyCenter = centerY - particle.y;
      const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);
      
      if (distCenter > 50) {
        particle.vx += (dxCenter / distCenter) * 0.02 * energy;
        particle.vy += (dyCenter / distCenter) * 0.02 * energy;
      }

      // Repulsion from mouse
      const dxMouse = particle.x - mouse.x;
      const dyMouse = particle.y - mouse.y;
      const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
      
      if (distMouse < 100) {
        const force = (100 - distMouse) / 100;
        particle.vx += (dxMouse / distMouse) * force * 0.5;
        particle.vy += (dyMouse / distMouse) * force * 0.5;
      }

      // Apply BPM-based pulsing
      const bpmPulse = Math.sin(Date.now() / (60000 / tempo) * Math.PI * 2) * 0.5 + 0.5;
      
      // Update position
      particle.x += particle.vx * (1 + bpmPulse * 0.3);
      particle.y += particle.vy * (1 + bpmPulse * 0.3);

      // Damping
      particle.vx *= 0.98;
      particle.vy *= 0.98;

      // Life
      particle.life -= 1 / particle.maxLife;

      // Reset if dead or out of bounds
      if (particle.life <= 0 || 
          particle.x < -50 || particle.x > width + 50 || 
          particle.y < -50 || particle.y > height + 50) {
        particlesRef.current[index] = createParticle();
        return;
      }

      // Draw particle
      const alpha = particle.life * (0.5 + energy * 0.5);
      const size = particle.size * (1 + bpmPulse * 0.3);
      
      // Glow
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size * 3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${particle.hue + valence * 40}, 70%, 50%, ${alpha * 0.1})`;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${particle.hue + valence * 40}, 80%, 60%, ${alpha})`;
      ctx.fill();
    });

    // Draw center glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 100 + energy * 50);
    gradient.addColorStop(0, `${theme.primary}33`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(centerX - 150, centerY - 150, 300, 300);

    animationRef.current = requestAnimationFrame(animate);
  }, [dimensions, energy, tempo, valence, createParticle, theme.primary]);

  // Start/stop animation
  useEffect(() => {
    if (isPlaying || currentTrack) {
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTrack, animate]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
        <div className="text-6xl animate-pulse">✨</div>
        <p className="text-lg font-display">Play something on Spotify</p>
        <p className="text-sm text-gray-600">to release the particles</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0a0a0f]">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />

      {/* Track overlay */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center">
        <p className="text-white font-display font-bold text-lg">
          {currentTrack.name}
        </p>
        <p className="text-white/60 text-sm">{currentTrack.artist}</p>
      </div>

      {/* Stats overlay - positioned at bottom-left */}
      <div className="absolute bottom-36 left-4 font-mono text-xs text-[var(--theme-primary)]/70 space-y-1">
        <div>PARTICLES: {particleCount}</div>
        <div>ENERGY: {(energy * 100).toFixed(0)}%</div>
        <div>TEMPO: {tempo.toFixed(0)} BPM</div>
      </div>

      {/* Hint */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-600">
        Move mouse to interact
      </div>
    </div>
  );
}

