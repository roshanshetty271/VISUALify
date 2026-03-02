'use client';

import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api/stats';
import type { Period } from '@/types/stats';

/**
 * Hook to fetch summary stats
 */
export function useStatsSummary(token: string | null, period: Period) {
  return useQuery({
    queryKey: ['stats', 'summary', period],
    queryFn: () => statsApi.getSummary(token!, period),
    enabled: !!token,
  });
}

/**
 * Hook to fetch listening time data for chart
 */
export function useListeningTime(token: string | null, period: Period) {
  return useQuery({
    queryKey: ['stats', 'listening-time', period],
    queryFn: () => statsApi.getListeningTime(token!, period),
    enabled: !!token,
  });
}

/**
 * Hook to fetch top artists
 */
export function useTopArtists(token: string | null, period: Period, limit = 5) {
  return useQuery({
    queryKey: ['stats', 'top-artists', period, limit],
    queryFn: () => statsApi.getTopArtists(token!, period, limit),
    enabled: !!token,
  });
}

/**
 * Hook to fetch audio profile
 */
export function useAudioProfile(token: string | null, period: Period) {
  return useQuery({
    queryKey: ['stats', 'audio-profile', period],
    queryFn: () => statsApi.getAudioProfile(token!, period),
    enabled: !!token,
  });
}

/**
 * Hook to fetch music phases
 */
export function useMusicPhases(token: string | null, period: Period) {
  return useQuery({
    queryKey: ['stats', 'music-phases', period],
    queryFn: () => statsApi.getMusicPhases(token!, period),
    enabled: !!token,
  });
}

