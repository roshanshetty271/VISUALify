'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { MoodJourneyPoint } from '@/types/stats';
import { moodColors } from '@/lib/utils/colors';
import Image from 'next/image';

interface MoodTimelineProps {
  data: MoodJourneyPoint[];
  isLoading?: boolean;
}

export function MoodTimeline({ data, isLoading }: MoodTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<MoodJourneyPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const defaultCount = data.filter((d) => moodColors.isDefault(d.energy, d.valence)).length;
  const hasRealData = defaultCount < data.length * 0.8;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 380;
    const margin = { top: 24, right: 16, bottom: 48, left: 48 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height);

    const defs = svg.append('defs');

    // Gradient for the area fill under the curve
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'mood-area-gradient')
      .attr('x1', '0')
      .attr('y1', '0')
      .attr('x2', '0')
      .attr('y2', '1');
    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#1DB954').attr('stop-opacity', 0.25);
    areaGradient.append('stop').attr('offset', '50%').attr('stop-color', '#8B5CF6').attr('stop-opacity', 0.08);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#3B82F6').attr('stop-opacity', 0.15);

    // Glow filter for points
    const glow = defs.append('filter').attr('id', 'point-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const parsedData = data.map((d) => ({ ...d, date: new Date(d.playedAt) }));
    const xExtent = d3.extent(parsedData, (d) => d.date) as [Date, Date];
    const xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    // Mood zone backgrounds
    const zones = [
      { y0: 0.7, y1: 1.0, color: '#FBBF24', opacity: 0.04, label: 'Happy' },
      { y0: 0.3, y1: 0.7, color: '#8B5CF6', opacity: 0.02, label: '' },
      { y0: 0.0, y1: 0.3, color: '#3B82F6', opacity: 0.04, label: 'Sad' },
    ];

    zones.forEach((zone) => {
      g.append('rect')
        .attr('x', 0)
        .attr('y', yScale(zone.y1))
        .attr('width', innerWidth)
        .attr('height', yScale(zone.y0) - yScale(zone.y1))
        .attr('fill', zone.color)
        .attr('opacity', zone.opacity)
        .attr('rx', 4);
    });

    // Zone labels on right edge
    g.append('text')
      .attr('x', innerWidth - 6)
      .attr('y', yScale(0.85))
      .attr('text-anchor', 'end')
      .attr('fill', '#FBBF24')
      .attr('opacity', 0.3)
      .attr('font-size', 10)
      .attr('font-weight', 500)
      .text('Happy');

    g.append('text')
      .attr('x', innerWidth - 6)
      .attr('y', yScale(0.15))
      .attr('text-anchor', 'end')
      .attr('fill', '#3B82F6')
      .attr('opacity', 0.3)
      .attr('font-size', 10)
      .attr('font-weight', 500)
      .text('Sad');

    // Grid lines
    [0.25, 0.5, 0.75].forEach((tick) => {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(tick))
        .attr('y2', yScale(tick))
        .attr('stroke', 'white')
        .attr('stroke-opacity', 0.04)
        .attr('stroke-dasharray', '4,6');
    });

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(Math.min(6, data.length))
          .tickSize(0)
          .tickPadding(12)
      )
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#52525b')
      .attr('font-size', 10);

    // Y axis
    g.append('g')
      .call(
        d3.axisLeft(yScale)
          .tickValues([0, 0.25, 0.5, 0.75, 1])
          .tickFormat((d) => `${Math.round((d as number) * 100)}%`)
          .tickSize(0)
          .tickPadding(8)
      )
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#52525b')
      .attr('font-size', 10);

    // Smooth area fill
    const areaGenerator = d3.area<(typeof parsedData)[0]>()
      .x((d) => xScale(d.date))
      .y0(innerHeight)
      .y1((d) => yScale(d.valence))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(parsedData)
      .attr('d', areaGenerator)
      .attr('fill', 'url(#mood-area-gradient)');

    // Smooth connecting line
    const lineGenerator = d3.line<(typeof parsedData)[0]>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.valence))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(parsedData)
      .attr('d', lineGenerator)
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.15);

    // Data points
    g.selectAll('.mood-point')
      .data(parsedData)
      .enter()
      .append('circle')
      .attr('class', 'mood-point')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.valence))
      .attr('r', (d) => 3 + d.energy * 5)
      .attr('fill', (d) => moodColors.fromMood(d.energy, d.valence))
      .attr('stroke', (d) => moodColors.fromMood(d.energy, d.valence))
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.3)
      .attr('opacity', (d) => moodColors.isDefault(d.energy, d.valence) ? 0.35 : 0.85)
      .attr('filter', (d) => moodColors.isDefault(d.energy, d.valence) ? '' : 'url(#point-glow)')
      .attr('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('r', 5 + d.energy * 6);
        setHoveredPoint(d);
        const rect = (event.target as SVGElement).getBoundingClientRect();
        setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
      })
      .on('mouseleave', function (event, d) {
        d3.select(this)
          .attr('opacity', moodColors.isDefault(d.energy, d.valence) ? 0.35 : 0.85)
          .attr('r', 3 + d.energy * 5);
        setHoveredPoint(null);
      });

  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-zinc-900/80 rounded-xl p-6 border border-zinc-800/50">
        <div className="h-[380px] flex items-center justify-center">
          <div className="animate-pulse text-zinc-600 text-sm">Loading timeline...</div>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-zinc-900/80 rounded-xl p-6 border border-zinc-800/50">
        <div className="h-[380px] flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <p className="text-zinc-400 text-sm mb-1">No mood data yet</p>
          <p className="text-zinc-600 text-xs text-center max-w-xs">
            Click <span className="text-[#1DB954]">Import History</span> to fetch your listening data, then try <span className="text-white">Week</span> or <span className="text-white">All Time</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-zinc-900/80 rounded-xl p-5 border border-zinc-800/50" ref={containerRef}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-300">Mood Over Time</h3>
          {!hasRealData && data.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500/80 border border-amber-500/20">
              Most tracks missing audio features — try re-importing
            </span>
          )}
        </div>
        <svg ref={svgRef} />
      </div>

      {hoveredPoint && (
        <div
          className="fixed z-50 bg-zinc-900 border border-zinc-700/50 rounded-xl p-3 shadow-2xl pointer-events-none backdrop-blur-sm"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 10}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex items-start gap-3 min-w-[200px]">
            {hoveredPoint.albumArt && (
              <Image
                src={hoveredPoint.albumArt}
                alt={hoveredPoint.trackName}
                width={44}
                height={44}
                className="rounded-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-xs text-white truncate">{hoveredPoint.trackName}</div>
              <div className="text-[11px] text-zinc-500 truncate">{hoveredPoint.artistName}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: moodColors.fromMood(hoveredPoint.energy, hoveredPoint.valence) }}
                  />
                  <span className="text-[10px] text-zinc-400">
                    {moodColors.labelFromMood(hoveredPoint.energy, hoveredPoint.valence)}
                  </span>
                </div>
                {moodColors.isDefault(hoveredPoint.energy, hoveredPoint.valence) && (
                  <span className="text-[9px] text-zinc-600">(no audio data)</span>
                )}
              </div>
              {!moodColors.isDefault(hoveredPoint.energy, hoveredPoint.valence) && (
                <div className="flex gap-3 mt-1 text-[10px] text-zinc-500 font-mono">
                  <span>{Math.round(hoveredPoint.valence * 100)}% happy</span>
                  <span>{Math.round(hoveredPoint.energy * 100)}% energy</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
