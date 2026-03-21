'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useInboxStore } from '@/lib/store';

/**
 * Syncs linked accounts from the NextAuth session into the Zustand store.
 * Call once near the top of your app (e.g., in a layout or inbox page).
 */
export function useLinkedAccountsSync() {
  const { data: session } = useSession();
  const addAccount = useInboxStore((s) => s.addAccount);
  const accounts = useInboxStore((s) => s.accounts);

  useEffect(() => {
    const linked = (session as any)?.linkedAccounts as
      | Array<{ email: string; name: string; image?: string }>
      | undefined;

    if (!linked || linked.length === 0) return;

    // Add any accounts from the session that aren't already in the store
    for (const acc of linked) {
      const exists = accounts.some((a) => a.email === acc.email);
      if (!exists) {
        addAccount({
          email: acc.email,
          name: acc.name,
          image: acc.image,
          color: '', // Will be auto-assigned by store
        });
      }
    }
  }, [session, accounts, addAccount]);
}

/**
 * Returns the active account email for use in API calls.
 * Returns null if using the primary/default session account.
 */
export function useActiveAccountEmail(): string | null {
  return useInboxStore((s) => s.activeAccountEmail);
}

/**
 * Helper to append account query param to a URL if an account is active.
 */
export function withAccount(url: string, accountEmail: string | null): string {
  if (!accountEmail) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}account=${encodeURIComponent(accountEmail)}`;
}
