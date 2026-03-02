'use client';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  isLoading?: boolean;
}

/**
 * Card component for displaying a single stat with loading state
 */
export function StatCard({ title, value, subtitle, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6">
        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-3" />
        <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse mb-2" />
        {subtitle && <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />}
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl p-6 hover:bg-zinc-800/50 transition-colors">
      <h3 className="text-sm font-medium text-zinc-400 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-zinc-500">{subtitle}</p>
      )}
    </div>
  );
}

