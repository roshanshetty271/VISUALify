'use client';

import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { useCurrentTrack, useRecentTracks, useAudioFeatures, useIsPlaying } from '@/stores';
import { generateStars } from '@/lib/utils/seededRandom';

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isCurrent: boolean;
  pulsePhase: number;
}

interface Link {
  source: string;
  target: string;
  strength: number;
}

// Simple force simulation
function applyForces(
  nodes: Node[],
  links: Link[],
  centerX: number,
  centerY: number,
): Node[] {
  const repulsionStrength = 5000;
  const attractionStrength = 0.02;
  const centerForce = 0.01;
  const damping = 0.85;

  return nodes.map((node, i) => {
    if (node.isCurrent) {
      return { ...node, x: centerX, y: centerY, vx: 0, vy: 0 };
    }

    let fx = 0;
    let fy = 0;

    // Repulsion from other nodes
    nodes.forEach((other, j) => {
      if (i === j) return;
      const dx = node.x - other.x;
      const dy = node.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = repulsionStrength / (dist * dist);
      fx += (dx / dist) * force;
      fy += (dy / dist) * force;
    });

    // Attraction to center
    fx += (centerX - node.x) * centerForce;
    fy += (centerY - node.y) * centerForce;

    // Link attractions
    links.forEach((link) => {
      if (link.source === node.id || link.target === node.id) {
        const otherId = link.source === node.id ? link.target : link.source;
        const other = nodes.find((n) => n.id === otherId);
        if (other) {
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          fx += dx * attractionStrength * link.strength;
          fy += dy * attractionStrength * link.strength;
        }
      }
    });

    // Apply velocity
    const newVx = (node.vx + fx * 0.1) * damping;
    const newVy = (node.vy + fy * 0.1) * damping;

    return {
      ...node,
      x: node.x + newVx,
      y: node.y + newVy,
      vx: newVx,
      vy: newVy,
    };
  });
}

export function NeuralMode() {
  const currentTrack = useCurrentTrack();
  const recentTracks = useRecentTracks();
  const audioFeatures = useAudioFeatures();
  const isPlaying = useIsPlaying();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [nodes, setNodes] = useState<Node[]>([]);
  const timeRef = useRef(0);
  const animationRef = useRef<number | null>(null);

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

  const { width, height } = dimensions;
  const centerX = width / 2;
  const centerY = height / 2;
  const energy = audioFeatures?.energy ?? 0.5;
  const tempo = audioFeatures?.tempo ?? 120;

  // Stable background elements
  const gridDots = useMemo(() => generateStars(200, 77777), []);

  // Initialize nodes when tracks change
  useEffect(() => {
    const newNodes: Node[] = [];

    if (currentTrack) {
      newNodes.push({
        id: currentTrack.id,
        name: currentTrack.name,
        x: centerX,
        y: centerY,
        vx: 0,
        vy: 0,
        radius: 35,
        color: '#1DB954',
        isCurrent: true,
        pulsePhase: 0,
      });
    }

    recentTracks.slice(0, 12).forEach((track, index) => {
      if (track.id === currentTrack?.id) return;

      const angle = (index / 12) * 2 * Math.PI;
      const dist = 150 + Math.random() * 100;

      newNodes.push({
        id: track.id,
        name: track.name,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 12 + Math.random() * 8,
        color: `hsl(${140 + Math.random() * 60}, 70%, 50%)`,
        isCurrent: false,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    });

    setNodes(newNodes);
  }, [currentTrack?.id, recentTracks, centerX, centerY]);

  // Build links
  const links: Link[] = useMemo(() => {
    const result: Link[] = [];
    if (!currentTrack) return result;

    nodes.forEach((node) => {
      if (!node.isCurrent) {
        result.push({
          source: currentTrack.id,
          target: node.id,
          strength: 0.5 + Math.random() * 0.5,
        });
      }
    });

    // Cross-connections between some nodes
    for (let i = 1; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (Math.random() > 0.7) {
          result.push({
            source: nodes[i].id,
            target: nodes[j].id,
            strength: 0.2 + Math.random() * 0.3,
          });
        }
      }
    }

    return result;
  }, [nodes, currentTrack]);

  // Animation loop with force simulation
  const animate = useCallback(() => {
    timeRef.current += 0.02;
    setNodes((prevNodes) => applyForces(prevNodes, links, centerX, centerY));
    animationRef.current = requestAnimationFrame(animate);
  }, [links, centerX, centerY, energy]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
        <div className="text-6xl animate-pulse">🧠</div>
        <p className="text-lg font-display">Play something on Spotify</p>
        <p className="text-sm text-gray-600">to activate the network</p>
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      style={{ background: 'radial-gradient(ellipse at center, #0f1a12 0%, #0a0a0f 100%)' }}
    >
      <defs>
        {/* Grid pattern */}
        <pattern id="neuralGrid" width="50" height="50" patternUnits="userSpaceOnUse">
          <circle cx="25" cy="25" r="1" fill="rgba(29, 185, 84, 0.1)" />
        </pattern>
        
        {/* Glow filters */}
        <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background grid dots */}
      {gridDots.map((dot, i) => (
        <circle
          key={`dot-${i}`}
          cx={`${dot.x}%`}
          cy={`${dot.y}%`}
          r={1}
          fill="#1DB954"
          opacity={0.08 + Math.sin(timeRef.current + i) * 0.04}
        />
      ))}

      {/* Connection lines */}
      {links.map((link, i) => {
        const sourceNode = nodes.find((n) => n.id === link.source);
        const targetNode = nodes.find((n) => n.id === link.target);
        if (!sourceNode || !targetNode) return null;

        const pulseOffset = Math.sin(timeRef.current * 3 + i) * 0.3;

        return (
          <g key={`link-${i}`}>
            {/* Main line */}
            <line
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke="#1DB954"
              strokeWidth={2 + link.strength * 2}
              opacity={0.2 + link.strength * 0.3 + pulseOffset * 0.1}
              strokeLinecap="round"
              filter="url(#lineGlow)"
            />
            
            {/* Data flow particle */}
            {isPlaying && (
              <circle
                r={3 + link.strength * 2}
                fill="#1DB954"
                opacity={0.8}
              >
                <animateMotion
                  dur={`${1.5 + Math.random()}s`}
                  repeatCount="indefinite"
                  path={`M${sourceNode.x},${sourceNode.y} L${targetNode.x},${targetNode.y}`}
                />
              </circle>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const pulse = Math.sin(timeRef.current * (tempo / 60) + node.pulsePhase) * 0.15;
        const scale = 1 + (node.isCurrent ? pulse : pulse * 0.5);

        return (
          <g key={node.id}>
            {/* Outer glow */}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.radius * 2.5 * scale}
              fill={node.color}
              opacity={0.08}
            />
            
            {/* Middle glow */}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.radius * 1.8 * scale}
              fill={node.color}
              opacity={0.15}
            />
            
            {/* Ring */}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.radius * 1.4 * scale}
              fill="none"
              stroke={node.color}
              strokeWidth="1.5"
              opacity={0.5}
            />
            
            {/* Core */}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.radius * scale}
              fill={node.color}
              filter="url(#nodeGlow)"
            />
            
            {/* Highlight */}
            <circle
              cx={node.x - node.radius * 0.25}
              cy={node.y - node.radius * 0.25}
              r={node.radius * 0.3}
              fill="white"
              opacity={0.3}
            />
            
            {/* Label for current track */}
            {node.isCurrent && (
              <text
                x={node.x}
                y={node.y + node.radius + 28}
                textAnchor="middle"
                fill="white"
                fontSize="13"
                fontWeight="bold"
                className="font-display"
              >
                {node.name.length > 30 ? node.name.slice(0, 30) + '...' : node.name}
              </text>
            )}
          </g>
        );
      })}

      {/* Audio data overlay - positioned at bottom-left */}
      <g className="font-mono" fontSize="11" fill="rgba(29, 185, 84, 0.7)">
        <text x={20} y={height - 60}>NODES: {nodes.length}</text>
        <text x={20} y={height - 42}>CONNECTIONS: {links.length}</text>
        <text x={20} y={height - 24}>ENERGY: {(energy * 100).toFixed(0)}%</text>
      </g>
    </svg>
  );
}
