'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Period } from '@/types/stats';
import { useMoodJourney } from '@/hooks/useMoodJourney';
import { useBackendToken } from '@/hooks/useBackendToken';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { MoodTimeline } from './MoodTimeline';
import { MoodLegend } from './MoodLegend';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Main Mood Journey container
 */
export function MoodJourney() {
  const { token, error: tokenError, isLoading: tokenLoading } = useBackendToken();
  const [period, setPeriod] = useState<Period>('week');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useMoodJourney(token ?? '', period);

  // Sync history and backfill features
  const syncHistory = async () => {
    if (!token) return;
    
    setSyncing(true);
    setSyncMessage('Importing history...');
    
    try {
      // Step 1: Sync recent history
      const syncRes = await fetch(`${API_URL}/api/stats/sync-history`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const syncData = await syncRes.json();
      
      if (syncData.error) {
        setSyncMessage(`Error: ${syncData.error}`);
        setSyncing(false);
        return;
      }

      // Step 2: Backfill features
      setSyncMessage('Fetching audio features...');
      const backfillRes = await fetch(`${API_URL}/api/stats/backfill-features`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const backfillData = await backfillRes.json();
      
      const messages = [];
      if (syncData.imported > 0) messages.push(`${syncData.imported} new plays`);
      if (backfillData.plays_updated > 0) messages.push(`${backfillData.plays_updated} plays got mood data`);
      
      if (messages.length === 0) {
        setSyncMessage('✓ Already up to date!');
      } else {
        setSyncMessage(`✓ ${messages.join(', ')}`);
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['mood-journey'] });
    } catch {
      setSyncMessage('Failed to sync. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  // Show loading state while fetching token
  if (tokenLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-zinc-800 rounded w-1/3" />
          <div className="h-64 bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  // Show error if token exchange failed
  if (tokenError || !token) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-red-400 mb-2">Authentication Error</h2>
          <p className="text-red-300">
            {tokenError || 'Failed to authenticate with the backend. Please try logging out and back in.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Your Mood Journey</h1>
          <p className="text-zinc-400">
            Visualize the emotional arc of your listening session
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={syncHistory}
            disabled={syncing}
            className="px-4 py-2 bg-[#1DB954] text-black rounded-lg font-medium hover:bg-[#1ed760] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncing ? 'Syncing...' : 'Import History'}
          </button>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Sync Message */}
      {syncMessage && (
        <div className={`p-4 rounded-lg ${syncMessage.startsWith('Error') || syncMessage.startsWith('Failed') ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'}`}>
          {syncMessage}
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <MoodTimeline data={data ?? []} isLoading={isLoading} />
        </div>
        <div>
          <MoodLegend />
        </div>
      </div>

      {/* Stats summary */}
      {data && data.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#1DB954]">{data.length}</div>
            <div className="text-zinc-400 text-sm">Tracks</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#1DB954]">
              {Math.round(data.reduce((sum, d) => sum + d.valence, 0) / data.length * 100)}%
            </div>
            <div className="text-zinc-400 text-sm">Avg Happiness</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#1DB954]">
              {Math.round(data.reduce((sum, d) => sum + d.energy, 0) / data.length * 100)}%
            </div>
            <div className="text-zinc-400 text-sm">Avg Energy</div>
          </div>
        </div>
      )}
    </div>
  );
}

