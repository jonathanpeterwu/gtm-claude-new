import { getServerSession } from 'next-auth';
import { authOptions, getLinkedAccountToken } from '@/lib/auth';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

/**
 * Resolve an access token for a specific account email.
 * Falls back to the primary session token if no account is specified
 * or if the account isn't found in linked accounts.
 */
export async function getAccessTokenForAccount(
  req: NextRequest,
  accountEmail?: string | null
): Promise<string | null> {
  // Get the raw JWT to access linkedAccounts with tokens
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!jwt) return null;

  const linkedAccounts = (jwt.linkedAccounts || {}) as Record<string, any>;

  // If a specific account is requested and exists in linked accounts
  if (accountEmail && linkedAccounts[accountEmail]) {
    const result = await getLinkedAccountToken(linkedAccounts, accountEmail);
    return result?.token || null;
  }

  // Default: use primary session token
  return (jwt.accessToken as string) || null;
}
