'use client';

import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api/stats';
import type { Period } from '@/types/stats';

/**
 * Hook to fetch mood journey timeline data
 */
export function useMoodJourney(token: string | null, period: Period) {
  return useQuery({
    queryKey: ['mood-journey', period],
    queryFn: () => statsApi.getMoodJourney(token!, period),
    enabled: !!token,
  });
}

