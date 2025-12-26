'use client';

import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { useAudioFeatures, useIsPlaying, useCurrentTrack } from '@/stores';
import { generateStars, generateMountainPeaks } from '@/lib/utils/seededRandom';

// Catmull-Rom spline interpolation for smooth curves
function catmullRomSpline(
  points: Array<{ x: number; y: number }>,
  tension: number = 0.5
): string {
  if (points.length < 2) return '';
  
  const path: string[] = [`M ${points[0].x} ${points[0].y}`];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    
    const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 6;
    
    path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  
  return path.join(' ');
}

export function TerrainMode() {
  const audioFeatures = useAudioFeatures();
  const isPlaying = useIsPlaying();
  const currentTrack = useCurrentTrack();
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

  // Smooth animation loop - ALWAYS runs, slower when paused
  const animate = useCallback(() => {
    const speedMultiplier = isPlaying ? 1 : 0.1;
    timeRef.current += 0.02 * speedMultiplier;
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
  
  const energy = audioFeatures?.energy ?? 0.5;
  const tempo = audioFeatures?.tempo ?? 120;
  const valence = audioFeatures?.valence ?? 0.5;

  // Stable stars
  const stars = useMemo(() => generateStars(80, 99999), []);
  
  // Stable mountain peak factors
  const peakFactors = useMemo(() => ({
    back: generateMountainPeaks(16, 11111),
    mid: generateMountainPeaks(14, 22222),
    front: generateMountainPeaks(12, 33333),
  }), []);

  // Color based on valence
  const baseHue = 280 + valence * 60;
  const sunColor = valence > 0.5 ? '#ff6b6b' : '#a0a0ff';

  // Generate mountain points for a layer
  const generateMountainPoints = (
    layerIndex: number,
    peakData: Array<{ heightFactor: number; widthFactor: number }>,
    baseHeight: number,
    heightMultiplier: number
  ) => {
    const numPeaks = peakData.length;
    const points: Array<{ x: number; y: number }> = [];
    
    for (let i = 0; i <= numPeaks; i++) {
      const x = (i / numPeaks) * width;
      const peak = peakData[i % numPeaks];
      const waveOffset = Math.sin(timeRef.current * 0.5 + i * 0.3 + layerIndex) * 10 * energy;
      const peakHeight = baseHeight + peak.heightFactor * heightMultiplier * (1 + energy * 0.5) + waveOffset;
      
      points.push({ x, y: height - peakHeight });
    }
    
    return points;
  };

  // Mountain layers (back, mid, front)
  const mountainLayers = useMemo(() => {
    return [
      {
        points: generateMountainPoints(0, peakFactors.back, 80, 180),
        color: `hsl(${baseHue}, 50%, 25%)`,
        opacity: 0.6,
      },
      {
        points: generateMountainPoints(1, peakFactors.mid, 60, 220),
        color: `hsl(${baseHue}, 60%, 35%)`,
        opacity: 0.8,
      },
      {
        points: generateMountainPoints(2, peakFactors.front, 40, 280),
        color: `hsl(${baseHue}, 70%, 45%)`,
        opacity: 1,
      },
    ];
  }, [peakFactors, baseHue, width, height, energy]);

  // Grid animation offset
  const gridOffset = timeRef.current * 30;

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
        <div className="text-6xl animate-pulse">🏔️</div>
        <p className="text-lg font-display">Play something on Spotify</p>
        <p className="text-sm text-gray-600">to summon the peaks</p>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full relative overflow-hidden"
      style={{
        background: `linear-gradient(to bottom, 
          hsl(${baseHue - 20}, 30%, 5%) 0%, 
          hsl(${baseHue}, 40%, 12%) 40%, 
          hsl(${baseHue + 10}, 50%, 18%) 100%
        )`,
      }}
    >
      {/* Stars */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
        {stars.map((star, i) => (
          <circle
            key={`star-${i}`}
            cx={`${star.x}%`}
            cy={`${star.y * 0.5}%`}
            r={star.size}
            fill="white"
            opacity={star.opacity + Math.sin(timeRef.current * 2 + i) * 0.15}
          />
        ))}
      </svg>

      {/* Sun/Moon */}
      <div 
        className="absolute rounded-full"
        style={{
          width: 120 + energy * 40,
          height: 120 + energy * 40,
          background: `radial-gradient(circle, ${sunColor} 0%, ${sunColor}88 30%, transparent 70%)`,
          top: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          filter: `blur(${10 + energy * 10}px)`,
          zIndex: 2,
        }}
      />

      {/* Scanlines overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
          zIndex: 10,
        }}
      />

      {/* Grid floor */}
      <svg 
        className="absolute bottom-0 left-0 w-full"
        style={{ 
          height: '45%',
          zIndex: 3,
        }}
        viewBox={`0 0 ${width} 400`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="gridFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1DB954" stopOpacity="0" />
            <stop offset="30%" stopColor="#1DB954" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1DB954" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        
        {/* Horizontal lines with perspective */}
        {Array.from({ length: 25 }).map((_, i) => {
          const y = i * 16 + (gridOffset % 16);
          const perspective = Math.pow(i / 25, 1.5);
          const opacity = 0.1 + perspective * 0.5;
          return (
            <line
              key={`h-${i}`}
              x1={0}
              y1={y}
              x2={width}
              y2={y}
              stroke="#1DB954"
              strokeWidth={0.5 + perspective * 1.5}
              opacity={opacity}
            />
          );
        })}
        
        {/* Vertical lines with perspective (converging to horizon) */}
        {Array.from({ length: 30 }).map((_, i) => {
          const normalizedX = (i / 29) * 2 - 1; // -1 to 1
          const topX = width / 2 + normalizedX * width * 0.1;
          const bottomX = width / 2 + normalizedX * width * 0.6;
          return (
            <line
              key={`v-${i}`}
              x1={topX}
              y1={0}
              x2={bottomX}
              y2={400}
              stroke="#1DB954"
              strokeWidth="1"
              opacity={0.3 + Math.abs(normalizedX) * 0.3}
            />
          );
        })}
      </svg>

      {/* Mountain layers */}
      <svg 
        className="absolute bottom-0 left-0 w-full"
        style={{ height: '70%', zIndex: 4 }}
        viewBox={`0 0 ${width} ${height * 0.7}`}
        preserveAspectRatio="none"
      >
        <defs>
          {mountainLayers.map((layer, i) => (
            <linearGradient key={`grad-${i}`} id={`mountainGrad${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={layer.color} />
              <stop offset="100%" stopColor={`hsl(${baseHue}, 70%, ${15 - i * 3}%)`} />
            </linearGradient>
          ))}
          <filter id="mountainGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {mountainLayers.map((layer, i) => {
          const path = catmullRomSpline(layer.points, 1);
          const closedPath = `${path} L ${width} ${height * 0.7} L 0 ${height * 0.7} Z`;
          
          return (
            <g key={`mountain-${i}`}>
              {/* Glow effect for front layer */}
              {i === 2 && (
                <path
                  d={closedPath}
                  fill="none"
                  stroke="#1DB954"
                  strokeWidth="2"
                  opacity={0.3 + energy * 0.2}
                  filter="url(#mountainGlow)"
                />
              )}
              <path
                d={closedPath}
                fill={`url(#mountainGrad${i})`}
                opacity={layer.opacity}
              />
            </g>
          );
        })}
      </svg>

      {/* Data overlay */}
      <div 
        className="absolute bottom-36 left-4 font-mono text-xs space-y-1"
        style={{ zIndex: 20, color: '#1DB954' }}
      >
        <div className="opacity-80">ENERGY: {(energy * 100).toFixed(0)}%</div>
        <div className="opacity-80">TEMPO: {tempo.toFixed(0)} BPM</div>
        <div className="opacity-80">MOOD: {valence > 0.5 ? 'EUPHORIC' : 'MELANCHOLIC'}</div>
      </div>

      {/* Track name */}
      <div 
        className="absolute bottom-32 left-1/2 -translate-x-1/2 text-center"
        style={{ zIndex: 20 }}
      >
        <p className="text-white/80 font-display text-lg font-bold tracking-wide">
          {currentTrack.name}
        </p>
        <p className="text-white/50 text-sm">{currentTrack.artist}</p>
      </div>
    </div>
  );
}
