'use client';

import { useIsSyncing, useLastSyncTime } from '@/stores/usePlayerStore';

interface SyncButtonProps {
  onSync: () => void;
}

export function SyncButton({ onSync }: SyncButtonProps) {
  const isSyncing = useIsSyncing();
  const lastSyncTime = useLastSyncTime();

  // Calculate time since last sync
  const getTimeSinceSync = () => {
    if (!lastSyncTime) return 'Never synced';
    const seconds = Math.floor((Date.now() - lastSyncTime) / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <button
      onClick={onSync}
      disabled={isSyncing}
      className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${isSyncing
          ? 'bg-[var(--theme-primary)]/15 text-[var(--theme-primary)] cursor-wait'
          : 'text-zinc-400 hover:text-white hover:bg-white/[0.1]'
        }`}
      title={`Last sync: ${getTimeSinceSync()}`}
    >
      <svg
        className={`w-3.5 h-3.5 transition-transform ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180'}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
      </svg>
      <span className="hidden sm:inline">
        {isSyncing ? 'Syncing...' : 'Sync'}
      </span>
    </button>
  );
}

