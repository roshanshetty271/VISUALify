'use client';

import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { useCurrentTrack, useRecentTracks, useAudioFeatures, useIsPlaying } from '@/stores';
import Image from 'next/image';

export function RiverMode() {
  const currentTrack = useCurrentTrack();
  const recentTracks = useRecentTracks();
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

  // Animation loop - ALWAYS runs, slower when paused
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
  const energy = audioFeatures?.energy ?? 0.5;
  const valence = audioFeatures?.valence ?? 0.5;
  const tempo = audioFeatures?.tempo ?? 120;

  // Combine current and recent tracks for the river
  const allTracks = useMemo(() => {
    const tracks = currentTrack ? [currentTrack, ...recentTracks] : recentTracks;
    return tracks.slice(0, 10);
  }, [currentTrack, recentTracks]);

  // Calculate track positions along the river
  const trackPositions = useMemo(() => {
    return allTracks.map((track, i) => {
      const segmentWidth = width / (allTracks.length + 1);
      const x = segmentWidth * (i + 1);
      const waveHeight = 40 + energy * 80;
      const baseY = height / 2;
      const yOffset = Math.sin(i * 0.7 + timeRef.current * 0.5) * waveHeight;
      const y = baseY + yOffset;
      const isCurrent = track.id === currentTrack?.id;

      return { track, x, y, isCurrent };
    });
  }, [allTracks, width, height, energy, currentTrack]);

  // Generate river path with animated wave
  const generateRiverPaths = useMemo(() => {
    const riverWidth = 70 + energy * 50;
    const segmentWidth = width / (allTracks.length + 1);
    
    const generateEdge = (offset: number) => {
      let path = `M -50 ${height / 2 + offset}`;
      
      allTracks.forEach((_, i) => {
        const x = segmentWidth * (i + 1);
        const waveHeight = 40 + energy * 80;
        const yOffset = Math.sin(i * 0.7 + timeRef.current * 0.5) * waveHeight;
        const y = height / 2 + yOffset + offset;
        const cpX = x - segmentWidth / 2;
        const cpOffset = Math.sin((i - 0.5) * 0.7 + timeRef.current * 0.5) * waveHeight;
        const cpY = height / 2 + cpOffset + offset;
        path += ` Q ${cpX} ${cpY}, ${x} ${y}`;
      });
      
      path += ` L ${width + 50} ${height / 2 + offset}`;
      return path;
    };

    const topPath = generateEdge(-riverWidth / 2);
    const bottomPath = generateEdge(riverWidth / 2);
    const centerPath = generateEdge(0);

    // Create filled path
    const fillPath = `${topPath} L ${width + 50} ${height / 2 + riverWidth / 2} ${bottomPath.replace('M -50', 'L -50').split(' ').reverse().join(' ')} Z`;

    return { topPath, bottomPath, centerPath, fillPath };
  }, [allTracks, width, height, energy]);

  // Ripple circles at markers
  const ripples = useMemo(() => {
    return trackPositions.map((pos) => {
      const numRipples = pos.isCurrent ? 4 : 2;
      return Array.from({ length: numRipples }, (_, j) => ({
        delay: j * 0.5,
        maxRadius: pos.isCurrent ? 60 : 30,
      }));
    });
  }, [trackPositions]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
        <div className="text-6xl animate-pulse">🌊</div>
        <p className="text-lg font-display">Play something on Spotify</p>
        <p className="text-sm text-gray-600">to start the flow</p>
      </div>
    );
  }

  // Color based on valence
  const primaryHue = 160 + valence * 40;
  const secondaryHue = 200 - valence * 40;

  return (
    <div 
      className="w-full h-full relative overflow-hidden"
      style={{ 
        background: `linear-gradient(to bottom, 
          hsl(${primaryHue - 20}, 30%, 6%) 0%, 
          hsl(${primaryHue}, 25%, 10%) 50%, 
          hsl(${primaryHue - 20}, 30%, 6%) 100%
        )` 
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full absolute inset-0">
        <defs>
          {/* River gradient */}
          <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={`hsl(${secondaryHue}, 80%, 45%)`} />
            <stop offset="30%" stopColor="#1DB954" />
            <stop offset="70%" stopColor="#1DB954" />
            <stop offset="100%" stopColor={`hsl(${primaryHue}, 80%, 45%)`} />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="riverGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Reflection gradient */}
          <linearGradient id="reflectionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1DB954" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1DB954" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Reflection (below river) */}
        <g transform={`translate(0, ${height / 2 + 60}) scale(1, -0.3)`} opacity="0.2">
          <path
            d={generateRiverPaths.centerPath}
            fill="none"
            stroke="url(#riverGradient)"
            strokeWidth="40"
            style={{ filter: 'blur(8px)' }}
          />
        </g>

        {/* River glow background */}
        <path
          d={generateRiverPaths.centerPath}
          fill="none"
          stroke="url(#riverGradient)"
          strokeWidth={120 + energy * 60}
          opacity={0.15}
          style={{ filter: 'blur(30px)' }}
        />

        {/* River body */}
        <path
          d={generateRiverPaths.centerPath}
          fill="none"
          stroke="url(#riverGradient)"
          strokeWidth={70 + energy * 50}
          opacity={0.6}
          strokeLinecap="round"
          filter="url(#riverGlow)"
        />

        {/* River center line */}
        <path
          d={generateRiverPaths.centerPath}
          fill="none"
          stroke="#1DB954"
          strokeWidth="4"
          opacity={0.9}
          style={{ filter: 'drop-shadow(0 0 8px #1DB954)' }}
        />

        {/* Ripple effects at markers */}
        {trackPositions.map((pos, i) => (
          <g key={`ripples-${i}`}>
            {ripples[i].map((ripple, j) => {
              const phase = (timeRef.current * 2 + ripple.delay) % 3;
              const radius = (phase / 3) * ripple.maxRadius;
              const opacity = 0.6 * (1 - phase / 3);
              
              return (
                <circle
                  key={`ripple-${i}-${j}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill="none"
                  stroke={pos.isCurrent ? '#1DB954' : 'rgba(29, 185, 84, 0.5)'}
                  strokeWidth={pos.isCurrent ? 2 : 1}
                  opacity={opacity}
                />
              );
            })}
          </g>
        ))}

        {/* Track markers */}
        {trackPositions.map((pos, i) => (
          <g key={pos.track.id}>
            {/* Marker glow */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={pos.isCurrent ? 35 : 18}
              fill={pos.isCurrent ? '#1DB954' : 'rgba(29, 185, 84, 0.4)'}
              opacity={0.3}
            />
            
            {/* Marker body */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={pos.isCurrent ? 22 : 12}
              fill={pos.isCurrent ? '#1DB954' : 'rgba(29, 185, 84, 0.7)'}
              style={{ 
                filter: pos.isCurrent ? 'drop-shadow(0 0 15px #1DB954)' : undefined 
              }}
            />

            {/* Track number */}
            {!pos.isCurrent && (
              <text
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="bold"
              >
                {i}
              </text>
            )}
          </g>
        ))}

        {/* Time labels */}
        <text 
          x={40} 
          y={height - 30} 
          fill="rgba(29, 185, 84, 0.5)" 
          fontSize="12" 
          className="font-mono"
        >
          NOW
        </text>
        <text 
          x={width - 70} 
          y={height - 30} 
          fill="rgba(29, 185, 84, 0.5)" 
          fontSize="12" 
          className="font-mono"
        >
          EARLIER
        </text>

        {/* Audio stats - positioned at bottom-left */}
        <g className="font-mono" fontSize="11" fill="rgba(29, 185, 84, 0.7)">
          <text x={20} y={height - 80}>FLOW: {(energy * 100).toFixed(0)}%</text>
          <text x={20} y={height - 62}>TEMPO: {tempo.toFixed(0)} BPM</text>
        </g>
      </svg>

      {/* Current track thumbnail overlay */}
      {trackPositions.filter(p => p.isCurrent).map((pos) => (
        <div
          key="current-thumb"
          className="absolute flex flex-col items-center gap-2"
          style={{
            left: pos.x,
            top: pos.y + 50,
            transform: 'translateX(-50%)',
          }}
        >
          {pos.track.albumArt && (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden shadow-lg ring-2 ring-spotify-green/50">
              <Image
                src={pos.track.albumArt}
                alt={pos.track.albumName}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="text-center">
            <p className="text-white font-display font-bold text-sm max-w-[150px] truncate">
              {pos.track.name}
            </p>
            <p className="text-white/60 text-xs">{pos.track.artist}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
