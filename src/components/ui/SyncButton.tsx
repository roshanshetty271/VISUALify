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
      className={`
        group relative flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm
        transition-all duration-300 overflow-hidden
        ${isSyncing 
          ? 'bg-spotify-green/20 text-spotify-green cursor-wait' 
          : 'bg-white/10 text-white hover:bg-spotify-green hover:text-black border border-white/20 hover:border-spotify-green'
        }
      `}
      title={`Last sync: ${getTimeSinceSync()}`}
    >
      {/* Sync icon */}
      <svg 
        className={`w-4 h-4 transition-transform ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180'}`}
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
      
      {/* Text */}
      <span className="hidden sm:inline">
        {isSyncing ? 'Syncing...' : 'Sync'}
      </span>
    </button>
  );
}

