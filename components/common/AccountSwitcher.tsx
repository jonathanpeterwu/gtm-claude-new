'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useInboxStore } from '@/lib/store';
import { LinkedAccount, InboxMode } from '@/types';
import {
  ChevronDown,
  Plus,
  Check,
  Layers,
  User,
  X,
} from 'lucide-react';
import clsx from 'clsx';

export function AccountSwitcher() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const accounts = useInboxStore((s) => s.accounts);
  const activeAccountEmail = useInboxStore((s) => s.activeAccountEmail);
  const inboxMode = useInboxStore((s) => s.inboxMode);
  const setActiveAccount = useInboxStore((s) => s.setActiveAccount);
  const setInboxMode = useInboxStore((s) => s.setInboxMode);
  const addAccount = useInboxStore((s) => s.addAccount);
  const removeAccount = useInboxStore((s) => s.removeAccount);

  // Ensure current session is in accounts list
  const currentEmail = session?.user?.email || '';
  const currentAccount: LinkedAccount | undefined = accounts.find((a) => a.email === currentEmail);

  const activeEmail = activeAccountEmail || currentEmail;
  const activeAccount = accounts.find((a) => a.email === activeEmail) || currentAccount;

  const handleAddAccount = () => {
    setOpen(false);
    signIn('google', undefined, { prompt: 'select_account' });
  };

  const handleSwitchAccount = (email: string) => {
    if (email === currentEmail) {
      setActiveAccount(null);
    } else {
      setActiveAccount(email);
      // Re-auth with this account to switch session
      signIn('google', undefined, { login_hint: email });
    }
    setOpen(false);
  };

  const handleToggleBlended = () => {
    setInboxMode(inboxMode === 'blended' ? 'single' : 'blended');
    setOpen(false);
  };

  const handleRemoveAccount = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    if (email === currentEmail) return; // Can't remove primary account
    removeAccount(email);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-bg-hover transition"
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full text-white text-2xs font-medium flex-shrink-0"
          style={{ backgroundColor: activeAccount?.color || '#3B82F6' }}
        >
          {activeAccount?.name?.[0]?.toUpperCase() || activeEmail[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="truncate text-text-primary font-medium">
            {activeAccount?.name || activeEmail.split('@')[0]}
          </div>
          <div className="truncate text-2xs text-text-muted">{activeEmail}</div>
        </div>
        <ChevronDown className={clsx('h-3 w-3 text-text-muted transition', open && 'rotate-180')} />
      </button>

      {/* Inbox mode badge */}
      {inboxMode === 'blended' && accounts.length > 1 && (
        <div className="mt-1 mx-2 flex items-center gap-1 rounded px-2 py-0.5 bg-accent-purple/10 text-accent-purple text-2xs font-medium">
          <Layers className="h-3 w-3" />
          Blended Inbox
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border-subtle bg-bg-secondary shadow-lg overflow-hidden">
            {/* Accounts list */}
            <div className="py-1">
              {accounts.map((account) => (
                <button
                  key={account.email}
                  onClick={() => handleSwitchAccount(account.email)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover transition"
                >
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-white text-2xs font-medium flex-shrink-0"
                    style={{ backgroundColor: account.color }}
                  >
                    {account.name[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs text-text-primary">{account.name}</div>
                    <div className="truncate text-2xs text-text-muted">{account.email}</div>
                  </div>
                  {account.email === activeEmail && (
                    <Check className="h-3.5 w-3.5 text-accent-blue flex-shrink-0" />
                  )}
                  {account.email !== currentEmail && (
                    <button
                      onClick={(e) => handleRemoveAccount(e, account.email)}
                      className="rounded p-0.5 text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </button>
              ))}

              {accounts.length === 0 && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <User className="h-4 w-4 text-text-muted" />
                  <span className="text-xs text-text-muted">{currentEmail}</span>
                </div>
              )}
            </div>

            <div className="border-t border-border-subtle py-1">
              {/* Blended inbox toggle */}
              {accounts.length > 1 && (
                <button
                  onClick={handleToggleBlended}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover transition"
                >
                  <Layers className={clsx('h-4 w-4', inboxMode === 'blended' ? 'text-accent-purple' : 'text-text-muted')} />
                  <span className="text-xs text-text-secondary">
                    {inboxMode === 'blended' ? 'Switch to single inbox' : 'Blend all inboxes'}
                  </span>
                </button>
              )}

              {/* Add account */}
              <button
                onClick={handleAddAccount}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover transition"
              >
                <Plus className="h-4 w-4 text-text-muted" />
                <span className="text-xs text-text-secondary">Add another account</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
