'use client';

import type { Period } from '@/types/stats';

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
}

const periods: { value: Period; label: string }[] = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All Time' },
];

/**
 * Period selector for stats dashboard
 */
export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm transition-all
            ${
              value === period.value
                ? 'bg-[#1DB954] text-white shadow-lg shadow-[#1DB954]/20'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }
          `}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

