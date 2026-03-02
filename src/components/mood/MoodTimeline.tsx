'use client';

import { useEffect, useRef, useState } from 'react';
import { scaleTime, scaleLinear, select, line, axisBottom, axisLeft, extent } from 'd3';
import type { MoodJourneyPoint } from '@/types/stats';
import { moodColors, chartColors } from '@/lib/utils/colors';
import Image from 'next/image';

interface MoodTimelineProps {
  data: MoodJourneyPoint[];
  isLoading?: boolean;
}

/**
 * D3 timeline visualization showing emotional journey
 */
export function MoodTimeline({ data, isLoading }: MoodTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<MoodJourneyPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.length) return;

    // Clear previous render
    select(svgRef.current).selectAll('*').remove();

    // Dimensions
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Parse dates
    const parsedData = data.map((d) => ({
      ...d,
      date: new Date(d.playedAt),
    }));

    // Create SVG
    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xExtent = extent(parsedData, (d) => d.date) as [Date, Date];
    const xScale = scaleTime()
      .domain(xExtent)
      .range([0, innerWidth]);

    const yScale = scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0]);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(xScale).ticks(6))
      .attr('color', chartColors.textMuted);

    g.append('g')
      .call(axisLeft(yScale).ticks(5).tickFormat((d) => `${(d as number) * 100}%`))
      .attr('color', chartColors.textMuted);

    // Y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 20)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', chartColors.textMuted)
      .text('Happiness');

    // Line generator
    const lineGenerator = line<typeof parsedData[0]>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.valence));

    // Draw connecting line
    g.append('path')
      .datum(parsedData)
      .attr('d', lineGenerator)
      .attr('fill', 'none')
      .attr('stroke', chartColors.primary)
      .attr('stroke-width', 2)
      .attr('opacity', 0.4);

    // Draw points
    const points = g
      .selectAll('.mood-point')
      .data(parsedData)
      .enter()
      .append('circle')
      .attr('class', 'mood-point')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.valence))
      .attr('r', (d) => 4 + d.energy * 8)
      .attr('fill', (d) => moodColors.fromMood(d.energy, d.valence))
      .attr('opacity', 0.8)
      .attr('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        select(this).attr('opacity', 1).attr('r', (d) => 6 + d.energy * 8);
        setHoveredPoint(d);
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        setTooltipPos({ x: rect.left, y: rect.top });
      })
      .on('mouseleave', function () {
        select(this).attr('opacity', 0.8).attr('r', (d: any) => 4 + d.energy * 8);
        setHoveredPoint(null);
      });

  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6">
        <div className="h-[400px] flex items-center justify-center">
          <div className="animate-pulse text-zinc-600">Loading timeline...</div>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6">
        <div className="h-[400px] flex flex-col items-center justify-center">
          <p className="text-zinc-500 mb-2">No mood data yet for this period</p>
          <p className="text-sm text-zinc-600 text-center max-w-md">
            Click <span className="text-[#1DB954] font-medium">&quot;Import History&quot;</span> above to fetch your recent
            listening data from Spotify. Try selecting{' '}
            <span className="text-white">Week</span> or <span className="text-white">All Time</span> for more results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-zinc-900 rounded-xl p-6" ref={containerRef}>
        <h3 className="text-lg font-bold mb-4">Your Mood Journey</h3>
        <svg ref={svgRef} />
      </div>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="fixed z-50 bg-black border border-zinc-700 rounded-lg p-3 shadow-xl pointer-events-none"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 100}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex items-start gap-3 min-w-[200px]">
            {hoveredPoint.albumArt && (
              <Image
                src={hoveredPoint.albumArt}
                alt={hoveredPoint.trackName}
                width={48}
                height={48}
                className="rounded"
              />
            )}
            <div className="flex-1">
              <div className="font-semibold text-sm">{hoveredPoint.trackName}</div>
              <div className="text-xs text-zinc-400">{hoveredPoint.artistName}</div>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="px-2 py-1 bg-zinc-800 rounded">
                  Energy: {Math.round(hoveredPoint.energy * 100)}%
                </span>
                <span className="px-2 py-1 bg-zinc-800 rounded">
                  Mood: {Math.round(hoveredPoint.valence * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

