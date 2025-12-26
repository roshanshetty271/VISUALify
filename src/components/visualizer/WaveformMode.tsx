'use client';

import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { useCurrentTrack, useAudioFeatures, useIsPlaying } from '@/stores';
import { generateStars } from '@/lib/utils/seededRandom';

export function WaveformMode() {
  const currentTrack = useCurrentTrack();
  const audioFeatures = useAudioFeatures();
  const isPlaying = useIsPlaying();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const timeRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const [, forceUpdate] = useState(0);

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

  const animate = useCallback(() => {
    const speedMultiplier = isPlaying ? 1 : 0.1;
    timeRef.current += 0.03 * speedMultiplier;
    forceUpdate((n) => n + 1);
    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying]);

  useEffect(() => {
    // Always animate
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  const { width, height } = dimensions;
  const centerY = height / 2;
  const energy = audioFeatures?.energy ?? 0.5;
  const valence = audioFeatures?.valence ?? 0.5;
  const tempo = audioFeatures?.tempo ?? 120;
  const danceability = audioFeatures?.danceability ?? 0.5;

  // Background particles
  const particles = useMemo(() => generateStars(60, 88888), []);

  // Generate wave paths
  const generateWavePath = (
    amplitude: number,
    frequency: number,
    phase: number,
    yOffset: number = 0
  ): string => {
    const points: string[] = [];
    const segments = 100;
    
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * width;
      const normalizedX = (i / segments) * Math.PI * 2 * frequency;
      const y = centerY + yOffset + 
        Math.sin(normalizedX + timeRef.current * 2 + phase) * amplitude * (1 + energy * 0.5) +
        Math.sin(normalizedX * 2 + timeRef.current * 3) * amplitude * 0.3;
      
      if (i === 0) {
        points.push(`M ${x} ${y}`);
      } else {
        points.push(`L ${x} ${y}`);
      }
    }
    
    return points.join(' ');
  };

  // Generate audio bars for center
  const bars = useMemo(() => {
    const numBars = 40;
    return Array.from({ length: numBars }, (_, i) => ({
      x: (i / numBars) * width * 0.6 + width * 0.2,
      baseHeight: 20 + Math.sin(i * 0.3) * 30,
    }));
  }, [width]);

  // Primary color based on valence
  const primaryHue = 160 + valence * 40;

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
        <div className="text-6xl animate-pulse">🎵</div>
        <p className="text-lg font-display">Play something on Spotify</p>
        <p className="text-sm text-gray-600">to see the waveform</p>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at center, 
          hsl(${primaryHue}, 30%, 10%) 0%, 
          #0a0a0f 70%
        )`,
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          {/* Wave gradients */}
          <linearGradient id="wave1Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={`hsl(${primaryHue}, 70%, 50%)`} stopOpacity="0" />
            <stop offset="30%" stopColor={`hsl(${primaryHue}, 70%, 50%)`} />
            <stop offset="70%" stopColor="var(--theme-primary)" />
            <stop offset="100%" stopColor="var(--theme-primary)" stopOpacity="0" />
          </linearGradient>
          
          <linearGradient id="wave2Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--theme-secondary)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--theme-secondary)" />
            <stop offset="100%" stopColor="var(--theme-secondary)" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="barGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="var(--theme-primary)" />
            <stop offset="100%" stopColor="var(--theme-secondary)" />
          </linearGradient>

          <filter id="waveGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background particles */}
        {particles.map((p, i) => (
          <circle
            key={`particle-${i}`}
            cx={`${p.x}%`}
            cy={`${p.y}%`}
            r={p.size * 0.8}
            fill="white"
            opacity={p.opacity * 0.5 + Math.sin(timeRef.current + i) * 0.1}
          />
        ))}

        {/* Background waves */}
        <path
          d={generateWavePath(40 + energy * 30, 3, 0, -80)}
          fill="none"
          stroke={`hsl(${primaryHue}, 50%, 30%)`}
          strokeWidth="2"
          opacity={0.3}
        />
        <path
          d={generateWavePath(50 + energy * 40, 2.5, Math.PI / 4, 80)}
          fill="none"
          stroke={`hsl(${primaryHue}, 50%, 30%)`}
          strokeWidth="2"
          opacity={0.3}
        />

        {/* Main waves */}
        <path
          d={generateWavePath(60 + energy * 50, 4, 0, -30)}
          fill="none"
          stroke="url(#wave1Gradient)"
          strokeWidth="3"
          filter="url(#waveGlow)"
          opacity={0.8}
        />
        
        <path
          d={generateWavePath(50 + energy * 40, 3, Math.PI / 2, 30)}
          fill="none"
          stroke="url(#wave2Gradient)"
          strokeWidth="2.5"
          filter="url(#waveGlow)"
          opacity={0.7}
        />

        {/* Center line */}
        <line
          x1={0}
          y1={centerY}
          x2={width}
          y2={centerY}
          stroke="var(--theme-primary)"
          strokeWidth="1"
          opacity={0.2}
          strokeDasharray="10,10"
        />

        {/* Audio bars */}
        <g>
          {bars.map((bar, i) => {
            const heightMultiplier = 1 + Math.sin(timeRef.current * (tempo / 60) + i * 0.2) * energy;
            const barHeight = bar.baseHeight * heightMultiplier * (1 + danceability * 0.5);
            
            return (
              <g key={`bar-${i}`}>
                {/* Bar glow */}
                <rect
                  x={bar.x - 4}
                  y={centerY - barHeight}
                  width={8}
                  height={barHeight * 2}
                  fill="var(--theme-primary)"
                  opacity={0.2}
                  rx={4}
                  style={{ filter: 'blur(4px)' }}
                />
                {/* Bar */}
                <rect
                  x={bar.x - 2}
                  y={centerY - barHeight}
                  width={4}
                  height={barHeight * 2}
                  fill="url(#barGradient)"
                  rx={2}
                />
              </g>
            );
          })}
        </g>

        {/* Track info */}
        <text
          x={width / 2}
          y={height - 60}
          textAnchor="middle"
          fill="white"
          fontSize="16"
          fontWeight="bold"
          className="font-display"
        >
          {currentTrack.name}
        </text>
        <text
          x={width / 2}
          y={height - 40}
          textAnchor="middle"
          fill="rgba(255,255,255,0.6)"
          fontSize="13"
        >
          {currentTrack.artist}
        </text>

        {/* Stats overlay - positioned at bottom-left */}
        <g className="font-mono" fontSize="11" fill="rgba(255,255,255,0.6)">
          <text x={20} y={height - 100}>ENERGY {(energy * 100).toFixed(0)}%</text>
          <text x={20} y={height - 82}>DANCE {(danceability * 100).toFixed(0)}%</text>
          <text x={20} y={height - 64}>TEMPO {tempo.toFixed(0)} BPM</text>
        </g>
      </svg>
    </div>
  );
}

