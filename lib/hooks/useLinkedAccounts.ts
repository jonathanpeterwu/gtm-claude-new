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

  useEffect(() => {
    const linked = (session as any)?.linkedAccounts as
      | Array<{ email: string; name: string; image?: string }>
      | undefined;

    if (!linked || linked.length === 0) return;

    const { accounts, addAccount } = useInboxStore.getState();
    for (const acc of linked) {
      if (!accounts.some((a) => a.email === acc.email)) {
        addAccount({
          email: acc.email,
          name: acc.name,
          image: acc.image,
          color: '',
        });
      }
    }
  }, [session]);
}

/**
 * Helper to append account query param to a URL if an account is active.
 */
export function withAccount(url: string, accountEmail: string | null): string {
  if (!accountEmail) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}account=${encodeURIComponent(accountEmail)}`;
}
