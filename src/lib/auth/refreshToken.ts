import { JWT } from 'next-auth/jwt';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

export async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Spotify token refresh failed:', data);
      throw new Error(data.error_description || 'Failed to refresh token');
    }

    console.log('Token refreshed successfully');

    return {
      ...token,
      accessToken: data.access_token,
      // CRITICAL: Spotify MAY rotate refresh tokens. Always use new one if provided.
      refreshToken: data.refresh_token ?? token.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      error: undefined,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

// Refresh 5 minutes before expiry for safety buffer
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export function shouldRefreshToken(expiresAt: number): boolean {
  return Date.now() + REFRESH_BUFFER_MS >= expiresAt;
}

