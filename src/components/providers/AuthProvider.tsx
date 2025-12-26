'use client';

import { SessionProvider, useSession, signIn } from 'next-auth/react';
import { useEffect } from 'react';

function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    // Auto re-login if refresh token failed
    if (session?.error === 'RefreshAccessTokenError') {
      console.log('Refresh token expired, redirecting to login...');
      signIn('spotify');
    }
  }, [session?.error]);

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionGuard>{children}</SessionGuard>
    </SessionProvider>
  );
}

