import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

interface LinkedAccountTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  name: string;
  email: string;
  image?: string;
}

async function refreshAccountToken(account: LinkedAccountTokens): Promise<LinkedAccountTokens> {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: 'refresh_token',
    refresh_token: account.refreshToken,
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const refreshed = await res.json();
  if (!res.ok) throw refreshed;

  return {
    ...account,
    accessToken: refreshed.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
    refreshToken: refreshed.refresh_token || account.refreshToken,
  };
}

export async function getLinkedAccountToken(
  linkedAccounts: Record<string, LinkedAccountTokens>,
  email: string
): Promise<{ token: string; updatedAccounts: Record<string, LinkedAccountTokens> } | null> {
  const account = linkedAccounts[email];
  if (!account) return null;

  // Check if token is still valid (refresh 60s early to avoid mid-request expiry)
  const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;
  if (Date.now() < account.expiresAt * 1000 - TOKEN_REFRESH_BUFFER_MS) {
    return { token: account.accessToken, updatedAccounts: linkedAccounts };
  }

  // Refresh expired token
  try {
    const refreshed = await refreshAccountToken(account);
    const updatedAccounts = { ...linkedAccounts, [email]: refreshed };
    return { token: refreshed.accessToken, updatedAccounts };
  } catch (error) {
    console.error(`Failed to refresh token for ${email}:`, error);
    return null;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Initialize linked accounts map if not present
      if (!token.linkedAccounts) {
        token.linkedAccounts = {} as Record<string, LinkedAccountTokens>;
      }

      const linkedAccounts = token.linkedAccounts as Record<string, LinkedAccountTokens>;

      if (account) {
        // A new sign-in happened — merge this account's tokens
        const email = (profile as any)?.email || token.email || '';
        const name = (profile as any)?.name || token.name || '';
        const image = (profile as any)?.picture || (profile as any)?.image || '';

        linkedAccounts[email] = {
          accessToken: account.access_token as string,
          refreshToken: account.refresh_token as string,
          expiresAt: account.expires_at as number,
          name,
          email,
          image,
        };

        // Keep primary token fields for backward compat
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.linkedAccounts = linkedAccounts;
      } else {
        // No new sign-in — refresh any expired tokens for the primary account
        const primaryEmail = token.email as string;
        if (primaryEmail && linkedAccounts[primaryEmail]) {
          const result = await getLinkedAccountToken(linkedAccounts, primaryEmail);
          if (result) {
            token.accessToken = result.token;
            token.linkedAccounts = result.updatedAccounts;
            const updated = result.updatedAccounts[primaryEmail];
            if (updated) {
              token.expiresAt = updated.expiresAt;
              token.refreshToken = updated.refreshToken;
            }
          } else {
            token.error = 'RefreshAccessTokenError';
          }
        } else if (typeof token.expiresAt === 'number' && Date.now() >= (token.expiresAt * 1000 - 60000) && token.refreshToken) {
          // Fallback: refresh using legacy fields via shared helper
          try {
            const refreshed = await refreshAccountToken({
              accessToken: token.accessToken as string,
              refreshToken: token.refreshToken as string,
              expiresAt: token.expiresAt as number,
              name: (token.name as string) || '',
              email: (token.email as string) || '',
            });
            token.accessToken = refreshed.accessToken;
            token.expiresAt = refreshed.expiresAt;
            token.refreshToken = refreshed.refreshToken;
          } catch (error) {
            console.error('Error refreshing access token:', error);
            token.error = 'RefreshAccessTokenError';
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).error = token.error;

      // Expose linked accounts info to the client (without tokens)
      const linkedAccounts = (token.linkedAccounts || {}) as Record<string, LinkedAccountTokens>;
      (session as any).linkedAccounts = Object.values(linkedAccounts).map((acc) => ({
        email: acc.email,
        name: acc.name,
        image: acc.image,
      }));

      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};
