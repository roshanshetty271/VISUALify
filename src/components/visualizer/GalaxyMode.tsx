'use client';

import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { useCurrentTrack, useRecentTracks, useAudioFeatures, useIsPlaying } from '@/stores';
import { generateStars } from '@/lib/utils/seededRandom';

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  orbitRadius: number;
  orbitSpeed: number;
  angle: number;
  isCurrent: boolean;
  trail: Array<{ x: number; y: number }>;
}

interface Nebula {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  opacity: number;
  rotation: number;
}

export function GalaxyMode() {
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

  // requestAnimationFrame for smooth animation - ALWAYS runs, but slower when paused
  const animate = useCallback(() => {
    // Speed multiplier: full speed when playing, slow idle animation when paused
    const speedMultiplier = isPlaying ? 1 : 0.1;
    timeRef.current += 0.015 * speedMultiplier;
    forceUpdate((n) => n + 1);
    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying]);

  useEffect(() => {
    // Always start animation
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  const { width, height } = dimensions;
  const centerX = width / 2;
  const centerY = height / 2;

  const energy = audioFeatures?.energy ?? 0.5;
  const valence = audioFeatures?.valence ?? 0.5;
  const tempo = audioFeatures?.tempo ?? 120;

  // Stable star field using seeded random
  const stars = useMemo(() => generateStars(150, 12345), []);

  // Nebula clouds
  const nebulae: Nebula[] = useMemo(() => [
    { cx: 20, cy: 30, rx: 25, ry: 15, color: '#1DB954', opacity: 0.08, rotation: 15 },
    { cx: 75, cy: 20, rx: 20, ry: 12, color: '#3b82f6', opacity: 0.06, rotation: -10 },
    { cx: 85, cy: 70, rx: 18, ry: 22, color: '#8b5cf6', opacity: 0.07, rotation: 25 },
    { cx: 15, cy: 75, rx: 22, ry: 14, color: '#ef4444', opacity: 0.05, rotation: -20 },
  ], []);

  // Color scale
  const colorScale = useMemo(
    () => d3.scaleLinear<string>()
      .domain([0, 0.5, 1])
      .range(['#3b82f6', '#1DB954', '#ef4444']),
    []
  );

  // Build nodes with orbital mechanics
  const nodes: Node[] = useMemo(() => {
    const result: Node[] = [];

    if (currentTrack) {
      result.push({
        id: currentTrack.id,
        name: currentTrack.name,
        x: centerX,
        y: centerY,
        radius: 35 + energy * 20,
        color: colorScale(energy),
        orbitRadius: 0,
        orbitSpeed: 0,
        angle: 0,
        isCurrent: true,
        trail: [],
      });
    }

    recentTracks.slice(0, 8).forEach((track, index) => {
      if (track.id === currentTrack?.id) return;

      const orbitRadius = 100 + index * 45;
      const orbitSpeed = (0.3 + (1 - index / 8) * 0.4) * (tempo / 120);
      const initialAngle = (index / 8) * 2 * Math.PI + index * 0.5;

      result.push({
        id: track.id,
        name: track.name,
        x: 0,
        y: 0,
        radius: 10 + (8 - index) * 1.5,
        color: colorScale(0.2 + (index / 8) * 0.6),
        orbitRadius,
        orbitSpeed,
        angle: initialAngle,
        isCurrent: false,
        trail: [],
      });
    });

    return result;
  }, [currentTrack, recentTracks, energy, tempo, centerX, centerY, colorScale]);

  // Calculate animated positions with trails
  const animatedNodes = useMemo(() => {
    return nodes.map((node) => {
      if (node.isCurrent) return node;

      const angle = node.angle + timeRef.current * node.orbitSpeed;
      const x = centerX + Math.cos(angle) * node.orbitRadius;
      const y = centerY + Math.sin(angle) * node.orbitRadius * 0.6;

      // Generate trail points
      const trailLength = 8;
      const trail = Array.from({ length: trailLength }, (_, i) => {
        const trailAngle = angle - (i + 1) * 0.08;
        return {
          x: centerX + Math.cos(trailAngle) * node.orbitRadius,
          y: centerY + Math.sin(trailAngle) * node.orbitRadius * 0.6,
        };
      });

      return { ...node, x, y, trail };
    });
  }, [nodes, centerX, centerY]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
        <div className="text-6xl animate-pulse">🌌</div>
        <p className="text-lg font-display">Play something on Spotify</p>
        <p className="text-sm text-gray-600">to ignite the galaxy</p>
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      style={{ background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 70%)' }}
    >
      <defs>
        {/* Glow filter for sun */}
        <filter id="sunGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* Planet glow */}
        <filter id="planetGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Nebula clouds */}
      {nebulae.map((nebula, i) => (
        <ellipse
          key={`nebula-${i}`}
          cx={`${nebula.cx}%`}
          cy={`${nebula.cy}%`}
          rx={`${nebula.rx}%`}
          ry={`${nebula.ry}%`}
          fill={nebula.color}
          opacity={nebula.opacity + energy * 0.03}
          transform={`rotate(${nebula.rotation + timeRef.current * 2} ${width * nebula.cx / 100} ${height * nebula.cy / 100})`}
          style={{ filter: 'blur(40px)' }}
        />
      ))}

      {/* Star field */}
      {stars.map((star, i) => (
        <circle
          key={`star-${i}`}
          cx={`${star.x}%`}
          cy={`${star.y}%`}
          r={star.size}
          fill="white"
          opacity={star.opacity + Math.sin(timeRef.current * 2 + i) * 0.1}
        />
      ))}

      {/* Orbit rings */}
      {[100, 145, 190, 235, 280, 325, 370, 415].map((radius, i) => (
        <ellipse
          key={`orbit-${i}`}
          cx={centerX}
          cy={centerY}
          rx={radius}
          ry={radius * 0.6}
          fill="none"
          stroke="rgba(29, 185, 84, 0.08)"
          strokeWidth="1"
          strokeDasharray="8,12"
        />
      ))}

      {/* Planet trails */}
      {animatedNodes.filter((n) => !n.isCurrent && n.trail.length > 0).map((node) => (
        <g key={`trail-${node.id}`}>
          {node.trail.map((point, i) => (
            <circle
              key={`trail-point-${i}`}
              cx={point.x}
              cy={point.y}
              r={node.radius * (1 - i * 0.1) * 0.3}
              fill={node.color}
              opacity={0.3 - i * 0.035}
            />
          ))}
        </g>
      ))}

      {/* Planets (non-current tracks) */}
      {animatedNodes.filter((n) => !n.isCurrent).map((node) => (
        <g key={node.id}>
          {/* Planet glow */}
          <circle
            cx={node.x}
            cy={node.y}
            r={node.radius * 2}
            fill={node.color}
            opacity={0.15}
          />
          {/* Planet ring (for larger planets) */}
          {node.radius > 14 && (
            <ellipse
              cx={node.x}
              cy={node.y}
              rx={node.radius * 1.6}
              ry={node.radius * 0.3}
              fill="none"
              stroke={node.color}
              strokeWidth="2"
              opacity={0.4}
              transform={`rotate(-20 ${node.x} ${node.y})`}
            />
          )}
          {/* Planet body */}
          <circle
            cx={node.x}
            cy={node.y}
            r={node.radius}
            fill={node.color}
            filter="url(#planetGlow)"
          />
          {/* Planet highlight */}
          <circle
            cx={node.x - node.radius * 0.3}
            cy={node.y - node.radius * 0.3}
            r={node.radius * 0.25}
            fill="white"
            opacity={0.25}
          />
        </g>
      ))}

      {/* Sun (current track) */}
      {animatedNodes.filter((n) => n.isCurrent).map((node) => (
        <g key={node.id}>
          {/* Corona layers */}
          <circle
            cx={node.x}
            cy={node.y}
            r={node.radius * 3.5}
            fill={node.color}
            opacity={0.04 + Math.sin(timeRef.current * 3) * 0.02}
          />
          <circle
            cx={node.x}
            cy={node.y}
            r={node.radius * 2.5}
            fill={node.color}
            opacity={0.08 + Math.sin(timeRef.current * 4) * 0.03}
          />
          <circle
            cx={node.x}
            cy={node.y}
            r={node.radius * 1.8}
            fill={node.color}
            opacity={0.15 + Math.sin(timeRef.current * 5) * 0.05}
          />
          {/* Core */}
          <circle
            cx={node.x}
            cy={node.y}
            r={node.radius}
            fill={node.color}
            filter="url(#sunGlow)"
          />
          {/* Inner bright spot */}
          <circle
            cx={node.x - node.radius * 0.2}
            cy={node.y - node.radius * 0.2}
            r={node.radius * 0.35}
            fill="white"
            opacity={0.4}
          />
          {/* Track name */}
          <text
            x={node.x}
            y={node.y + node.radius + 35}
            textAnchor="middle"
            fill="white"
            fontSize="14"
            fontWeight="bold"
            className="font-display"
          >
            {node.name.length > 30 ? node.name.slice(0, 30) + '...' : node.name}
          </text>
        </g>
      ))}

      {/* Audio data overlay */}
      <g className="font-mono" fontSize="11" fill="rgba(255,255,255,0.6)">
        <text x={20} y={height - 60}>ENERGY {(energy * 100).toFixed(0)}%</text>
        <text x={20} y={height - 42}>TEMPO {tempo.toFixed(0)} BPM</text>
        <text x={20} y={height - 24}>VALENCE {(valence * 100).toFixed(0)}%</text>
      </g>
    </svg>
  );
}
