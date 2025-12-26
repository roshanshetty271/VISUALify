import NextAuth from 'next-auth';
import SpotifyProvider from 'next-auth/providers/spotify';
import { refreshAccessToken, shouldRefreshToken } from '@/lib/auth/refreshToken';

const scopes = [
  'user-read-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
].join(' ');

const handler = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: { scope: scopes },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign in - store all tokens
      if (account) {
        console.log('Initial sign in - storing tokens');
        return {
          ...token,
          accessToken: account.access_token!,
          refreshToken: account.refresh_token!,
          expiresAt: account.expires_at! * 1000, // Convert to milliseconds
        };
      }

      // Return existing token if not expired
      if (!shouldRefreshToken(token.expiresAt)) {
        return token;
      }

      // Token expired or expiring soon - refresh it
      console.log('Token expiring, refreshing...');
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
});

export { handler as GET, handler as POST };

