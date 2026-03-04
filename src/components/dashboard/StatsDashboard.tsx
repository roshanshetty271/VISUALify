'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Period } from '@/types/stats';
import {
  useStatsSummary,
  useListeningTime,
  useAudioProfile,
  useMusicPhases,
} from '@/hooks/useStats';
import { useBackendToken } from '@/hooks/useBackendToken';
import { StatCard } from './StatCard';
import { PeriodSelector } from './PeriodSelector';
import { ListeningTimeChart } from './ListeningTimeChart';
import { AudioProfileRadar } from './AudioProfileRadar';
import { MusicPhases } from './MusicPhases';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Main Stats Dashboard container
 */
export function StatsDashboard() {
  const { token, error: tokenError, isLoading: tokenLoading } = useBackendToken();
  const [period, setPeriod] = useState<Period>('week');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch data (only when we have a token)
  const { data: summary, isLoading: summaryLoading } = useStatsSummary(token ?? '', period);
  const { data: listeningTime, isLoading: timeLoading } = useListeningTime(token ?? '', period);
  const { data: audioProfile, isLoading: profileLoading } = useAudioProfile(token ?? '', period);
  const { data: musicPhases, isLoading: phasesLoading } = useMusicPhases(token ?? '', period);

  // Show loading state while fetching token
  if (tokenLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-zinc-800 rounded w-1/3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-zinc-800 rounded-xl" />
            ))}
          </div>
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

  // Sync history from Spotify and backfill audio features
  const syncHistory = async () => {
    if (!token) {
      setSyncMessage('Not authenticated');
      return;
    }

    setSyncing(true);
    setSyncMessage('Importing history...');

    try {
      // Step 1: Sync recent history from Spotify
      const syncResponse = await fetch(`${API_URL}/api/stats/sync-history`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const syncData = await syncResponse.json();

      if (syncData.error) {
        setSyncMessage(`Error: ${syncData.error}`);
        setSyncing(false);
        return;
      }

      // Step 2: Backfill audio features for any tracks/plays missing them
      setSyncMessage('Fetching audio features...');
      const backfillResponse = await fetch(`${API_URL}/api/stats/backfill-features`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const backfillData = await backfillResponse.json();

      // Build success message
      const messages = [];
      if (syncData.imported > 0) messages.push(`${syncData.imported} new plays imported`);
      if (syncData.updated > 0) messages.push(`${syncData.updated} plays updated`);
      if (backfillData.tracks_updated > 0) messages.push(`${backfillData.tracks_updated} tracks got audio features`);
      if (backfillData.plays_updated > 0) messages.push(`${backfillData.plays_updated} plays got mood data`);

      if (messages.length === 0) {
        setSyncMessage('Already up to date! All data synced.');
      } else {
        setSyncMessage(`✓ ${messages.join(', ')}`);
      }

      // Invalidate all stats queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['mood-journey'] });
    } catch {
      setSyncMessage('Failed to sync history. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Your Music Stats</h1>
          <p className="text-zinc-400">Insights into your listening habits</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={syncHistory}
            disabled={syncing}
            style={{
              backgroundColor: syncing ? 'transparent' : 'var(--theme-primary)',
              color: 'black',
              boxShadow: syncing ? 'none' : '0 0 15px var(--theme-primary)'
            }}
            className="px-4 py-2 rounded-lg font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-black/10"
          >
            {syncing ? 'Syncing...' : 'Import History'}
          </button>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Sync Message */}
      {syncMessage && (
        <div className={`p-4 rounded-lg ${syncMessage.startsWith('Error') ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'}`}>
          {syncMessage}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Plays"
          value={summary?.totalPlays ?? 0}
          isLoading={summaryLoading}
        />
        <StatCard
          title="Listening Time"
          value={`${summary?.totalMinutes ?? 0}m`}
          subtitle="Minutes"
          isLoading={summaryLoading}
        />
        <StatCard
          title="Unique Tracks"
          value={summary?.uniqueTracks ?? 0}
          isLoading={summaryLoading}
        />
        <StatCard
          title="Unique Artists"
          value={summary?.uniqueArtists ?? 0}
          subtitle={summary?.topGenre ? `Top: ${summary.topGenre}` : undefined}
          isLoading={summaryLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ListeningTimeChart
            data={listeningTime ?? []}
            isLoading={timeLoading}
          />
        </div>
        <div>
          {audioProfile && (
            <AudioProfileRadar
              data={audioProfile}
              isLoading={profileLoading}
            />
          )}
        </div>
      </div>

      {/* Music Phases */}
      <MusicPhases phases={musicPhases ?? []} isLoading={phasesLoading} />
    </div>
  );
}

