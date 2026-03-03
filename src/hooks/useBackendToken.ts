// src/hooks/useBackendToken.ts
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Hook to exchange NextAuth token for backend JWT token.
 * 
 * Used by dashboard and mood journey pages to authenticate with the backend API.
 */
export function useBackendToken() {
  const { data: session, status } = useSession();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function exchangeToken() {
      if (status === 'loading') return;
      
      if (!session?.accessToken) {
        setToken(null);
        setError('No session');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/api/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nextauth_token: session.accessToken }),
        });

        if (!response.ok) {
          throw new Error(`Token exchange failed: ${response.status}`);
        }

        const data = await response.json();
        setToken(data.access_token);
        setError(null);
      } catch (e) {
        console.error('[useBackendToken] Token exchange failed:', e);
        setError(e instanceof Error ? e.message : 'Token exchange failed');
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    exchangeToken();
  }, [session?.accessToken, status]);

  return { token, error, isLoading };
}

