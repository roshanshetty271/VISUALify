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
        params: {
          scope: scopes,
          show_dialog: 'true'
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token ?? '',
          refreshToken: account.refresh_token ?? '',
          expiresAt: (account.expires_at ?? 0) * 1000,
        };
      }

      if (!shouldRefreshToken(token.expiresAt)) {
        return token;
      }

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
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development' || !!process.env.VERCEL,
  logger: {
    error(code, metadata) {
      console.error(`[next-auth][error][${code}]`, metadata);
    },
    warn(code) {
      console.warn(`[next-auth][warn][${code}]`);
    },
    debug(code, metadata) {
      console.log(`[next-auth][debug][${code}]`, metadata);
    },
  },
});

export { handler as GET, handler as POST };

