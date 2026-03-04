'use client';

import { useEffect, useRef } from 'react';
import { scaleBand, scaleLinear, select, axisBottom, axisLeft, max } from 'd3';
import type { ListeningTimeData } from '@/types/stats';
import { chartColors } from '@/lib/utils/colors';

interface ListeningTimeChartProps {
  data: ListeningTimeData[];
  isLoading?: boolean;
}

/**
 * D3 bar chart showing listening time over days
 */
export function ListeningTimeChart({ data, isLoading }: ListeningTimeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.length) return;

    // Clear previous render
    select(svgRef.current).selectAll('*').remove();

    // Dimensions
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = scaleBand()
      .domain(data.map((d) => d.date))
      .range([0, innerWidth])
      .padding(0.2);

    const yScale = scaleLinear()
      .domain([0, max(data, (d) => d.minutes) || 100])
      .range([innerHeight, 0])
      .nice();

    // Axes
    const xAxis = axisBottom(xScale).tickFormat((d) => {
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const yAxis = axisLeft(yScale).ticks(5);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr('color', chartColors.textMuted)
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    g.append('g')
      .call(yAxis)
      .attr('color', chartColors.textMuted);

    // Bars
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.date) || 0)
      .attr('y', (d) => yScale(d.minutes))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => innerHeight - yScale(d.minutes))
      .attr('fill', 'var(--theme-primary)')
      .attr('opacity', 0.85)
      .style('filter', 'drop-shadow(0 0 6px var(--theme-primary))')
      .on('mouseenter', function () {
        select(this).attr('opacity', 1);
      })
      .on('mouseleave', function () {
        select(this).attr('opacity', 0.8);
      });

    // Y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 20)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', chartColors.textMuted)
      .text('Minutes');

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

  if (!data.length) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6">
        <div className="h-[300px] flex items-center justify-center text-zinc-500">
          No listening data for this period
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl p-6" ref={containerRef}>
      <h3 className="text-lg font-bold mb-4">Listening Time</h3>
      <svg ref={svgRef} />
    </div>
  );
}

