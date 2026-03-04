'use client';

import { useEffect, useRef } from 'react';
import { scaleLinear, select, line, curveLinearClosed } from 'd3';
import type { AudioProfile } from '@/types/stats';
import { chartColors } from '@/lib/utils/colors';

interface AudioProfileRadarProps {
  data: AudioProfile;
  isLoading?: boolean;
}

/**
 * D3 radar chart showing audio profile
 */
export function AudioProfileRadar({ data, isLoading }: AudioProfileRadarProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    // Clear previous render
    select(svgRef.current).selectAll('*').remove();

    // Dimensions
    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 40;
    const centerX = width / 2;
    const centerY = height / 2;

    // Data
    const features = [
      { name: 'Energy', value: data.energy },
      { name: 'Happiness', value: data.valence },
      { name: 'Danceability', value: data.danceability },
      { name: 'Acoustic', value: data.acousticness },
      { name: 'Instrumental', value: data.instrumentalness },
    ];

    const angleSlice = (Math.PI * 2) / features.length;

    // Scale
    const rScale = scaleLinear()
      .domain([0, 1])
      .range([0, radius]);

    // Create SVG
    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${centerX},${centerY})`);

    // Draw circular grid
    const levels = 5;
    for (let i = 1; i <= levels; i++) {
      const levelRadius = (radius / levels) * i;

      g.append('circle')
        .attr('r', levelRadius)
        .attr('fill', 'none')
        .attr('stroke', chartColors.grid)
        .attr('stroke-width', 1);
    }

    // Draw axes
    features.forEach((feature, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      // Axis line
      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', chartColors.grid)
        .attr('stroke-width', 1);

      // Label
      const labelDistance = radius + 25;
      const labelX = Math.cos(angle) * labelDistance;
      const labelY = Math.sin(angle) * labelDistance;

      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('fill', chartColors.text)
        .attr('font-size', '12px')
        .text(feature.name);
    });

    // Draw data polygon
    const radarLine = line<{ name: string; value: number }>()
      .x((d, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        return Math.cos(angle) * rScale(d.value);
      })
      .y((d, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        return Math.sin(angle) * rScale(d.value);
      })
      .curve(curveLinearClosed);

    g.append('path')
      .datum(features)
      .attr('d', radarLine)
      .attr('fill', 'var(--theme-primary)')
      .attr('fill-opacity', 0.25)
      .attr('stroke', 'var(--theme-primary)')
      .attr('stroke-width', 3)
      .style('filter', 'drop-shadow(0 0 10px var(--theme-primary))');

    // Draw data points
    features.forEach((feature, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * rScale(feature.value);
      const y = Math.sin(angle) * rScale(feature.value);

      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 5)
        .attr('fill', 'var(--theme-primary)')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);
    });

  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6">
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse text-zinc-600">Loading chart...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl p-6 flex flex-col items-center">
      <h3 className="text-lg font-bold mb-4">Audio Profile</h3>
      <svg ref={svgRef} />
    </div>
  );
}

