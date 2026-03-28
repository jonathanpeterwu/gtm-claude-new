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
  Mail,
  ArrowLeftRight,
} from 'lucide-react';
import clsx from 'clsx';

interface AccountSwitcherProps {
  variant?: 'sidebar' | 'header';
  collapsed?: boolean;
}

export function AccountSwitcher({ variant = 'sidebar', collapsed = false }: AccountSwitcherProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const accounts = useInboxStore((s) => s.accounts);
  const activeAccountEmail = useInboxStore((s) => s.activeAccountEmail);
  const inboxMode = useInboxStore((s) => s.inboxMode);
  const setActiveAccount = useInboxStore((s) => s.setActiveAccount);
  const setInboxMode = useInboxStore((s) => s.setInboxMode);
  const removeAccount = useInboxStore((s) => s.removeAccount);

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
      // No need to re-auth — tokens are preserved in the session JWT
    }
    setOpen(false);
  };

  const handleToggleBlended = () => {
    setInboxMode(inboxMode === 'blended' ? 'single' : 'blended');
    setOpen(false);
  };

  const handleRemoveAccount = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    if (email === currentEmail) return;
    removeAccount(email);
  };

  // Header variant — compact avatar button
  if (variant === 'header') {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-bg-hover transition"
          title="Switch account"
        >
          {inboxMode === 'blended' && accounts.length > 1 ? (
            <div className="relative flex items-center">
              {accounts.slice(0, 3).map((acc, i) => (
                <div
                  key={acc.email}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white text-2xs font-medium border-2 border-bg-secondary"
                  style={{ backgroundColor: acc.color, marginLeft: i > 0 ? '-8px' : '0', zIndex: 3 - i }}
                >
                  {acc.image ? (
                    <img src={acc.image} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    acc.name[0]?.toUpperCase() || 'U'
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-white text-2xs font-medium overflow-hidden"
              style={{ backgroundColor: activeAccount?.color || '#3B82F6' }}
            >
              {activeAccount?.image || session?.user?.image ? (
                <img src={activeAccount?.image || session?.user?.image || ''} alt="" className="h-full w-full object-cover" />
              ) : (
                activeAccount?.name?.[0]?.toUpperCase() || activeEmail[0]?.toUpperCase() || 'U'
              )}
            </div>
          )}
          <ChevronDown className={clsx('h-3 w-3 text-text-muted transition', open && 'rotate-180')} />
        </button>

        {open && <AccountDropdown
          accounts={accounts}
          activeEmail={activeEmail}
          currentEmail={currentEmail}
          inboxMode={inboxMode}
          onSwitch={handleSwitchAccount}
          onAdd={handleAddAccount}
          onRemove={handleRemoveAccount}
          onToggleBlended={handleToggleBlended}
          onClose={() => setOpen(false)}
          position="right"
        />}
      </div>
    );
  }

  // Sidebar variant — collapsed shows just the avatar
  if (collapsed) {
    return (
      <div className="relative flex justify-center">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-1.5 hover:bg-bg-hover transition"
          title={activeEmail}
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-white text-2xs font-medium overflow-hidden"
            style={{ backgroundColor: activeAccount?.color || '#3B82F6' }}
          >
            {activeAccount?.image || session?.user?.image ? (
              <img src={activeAccount?.image || session?.user?.image || ''} alt="" className="h-full w-full object-cover" />
            ) : (
              activeAccount?.name?.[0]?.toUpperCase() || 'U'
            )}
          </div>
        </button>

        {open && <AccountDropdown
          accounts={accounts}
          activeEmail={activeEmail}
          currentEmail={currentEmail}
          inboxMode={inboxMode}
          onSwitch={handleSwitchAccount}
          onAdd={handleAddAccount}
          onRemove={handleRemoveAccount}
          onToggleBlended={handleToggleBlended}
          onClose={() => setOpen(false)}
          position="left-offset"
        />}
      </div>
    );
  }

  // Sidebar variant — expanded
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-bg-hover transition group"
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-medium flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: activeAccount?.color || '#3B82F6' }}
        >
          {activeAccount?.image || session?.user?.image ? (
            <img src={activeAccount?.image || session?.user?.image || ''} alt="" className="h-full w-full object-cover" />
          ) : (
            activeAccount?.name?.[0]?.toUpperCase() || activeEmail[0]?.toUpperCase() || 'U'
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="truncate text-sm text-text-primary font-medium">
            {activeAccount?.name || activeEmail.split('@')[0]}
          </div>
          <div className="truncate text-2xs text-text-muted">{activeEmail}</div>
        </div>
        <ArrowLeftRight className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition" />
      </button>

      {/* Inbox mode indicator */}
      {inboxMode === 'blended' && accounts.length > 1 && (
        <button
          onClick={handleToggleBlended}
          className="mt-1 mx-1 flex w-[calc(100%-8px)] items-center gap-1.5 rounded-md px-2 py-1 bg-accent-purple/10 hover:bg-accent-purple/20 transition"
        >
          <Layers className="h-3 w-3 text-accent-purple" />
          <span className="text-2xs font-medium text-accent-purple">Blended Inbox</span>
          <span className="ml-auto text-2xs text-accent-purple/60">{accounts.length} accounts</span>
        </button>
      )}

      {/* Account pills for quick switching */}
      {accounts.length > 1 && inboxMode !== 'blended' && (
        <div className="mt-1.5 mx-1 flex items-center gap-1">
          {accounts.map((acc) => (
            <button
              key={acc.email}
              onClick={(e) => {
                e.stopPropagation();
                handleSwitchAccount(acc.email);
              }}
              className={clsx(
                'flex h-6 w-6 items-center justify-center rounded-full text-white text-2xs font-medium transition overflow-hidden',
                acc.email === activeEmail
                  ? 'ring-2 ring-accent-blue ring-offset-1 ring-offset-bg-secondary'
                  : 'opacity-50 hover:opacity-100'
              )}
              style={{ backgroundColor: acc.color }}
              title={acc.email}
            >
              {acc.image ? (
                <img src={acc.image} alt="" className="h-full w-full object-cover" />
              ) : (
                acc.name[0]?.toUpperCase() || 'U'
              )}
            </button>
          ))}
          <button
            onClick={handleAddAccount}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border-subtle text-text-muted hover:border-accent-blue hover:text-accent-blue transition"
            title="Add account"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}

      {open && <AccountDropdown
        accounts={accounts}
        activeEmail={activeEmail}
        currentEmail={currentEmail}
        inboxMode={inboxMode}
        onSwitch={handleSwitchAccount}
        onAdd={handleAddAccount}
        onRemove={handleRemoveAccount}
        onToggleBlended={handleToggleBlended}
        onClose={() => setOpen(false)}
        position="left"
      />}
    </div>
  );
}

// Shared dropdown component
function AccountDropdown({
  accounts,
  activeEmail,
  currentEmail,
  inboxMode,
  onSwitch,
  onAdd,
  onRemove,
  onToggleBlended,
  onClose,
  position,
}: {
  accounts: LinkedAccount[];
  activeEmail: string;
  currentEmail: string;
  inboxMode: InboxMode;
  onSwitch: (email: string) => void;
  onAdd: () => void;
  onRemove: (e: React.MouseEvent, email: string) => void;
  onToggleBlended: () => void;
  onClose: () => void;
  position: 'left' | 'right' | 'left-offset';
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={clsx(
          'absolute top-full z-50 mt-1 w-72 rounded-xl border border-border-subtle bg-bg-secondary shadow-xl overflow-hidden animate-fade-in',
          position === 'right' && 'right-0',
          position === 'left' && 'left-0',
          position === 'left-offset' && 'left-full ml-2 top-0'
        )}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-accent-blue" />
            <span className="text-xs font-semibold text-text-primary">Gmail Accounts</span>
          </div>
        </div>

        {/* Accounts list */}
        <div className="py-1 max-h-64 overflow-y-auto">
          {accounts.map((account) => (
            <button
              key={account.email}
              onClick={() => onSwitch(account.email)}
              className={clsx(
                'flex w-full items-center gap-3 px-4 py-2.5 text-left transition',
                account.email === activeEmail
                  ? 'bg-accent-blue/5'
                  : 'hover:bg-bg-hover'
              )}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-medium flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: account.color }}
              >
                {account.image ? (
                  <img src={account.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  account.name[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm text-text-primary font-medium">{account.name}</div>
                <div className="truncate text-2xs text-text-muted">{account.email}</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {account.email === activeEmail && (
                  <Check className="h-4 w-4 text-accent-blue" />
                )}
                {account.email !== currentEmail && (
                  <button
                    onClick={(e) => onRemove(e, account.email)}
                    className="rounded-md p-1 text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition"
                    title="Remove account"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </button>
          ))}

          {accounts.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 text-text-muted">
              <User className="h-4 w-4" />
              <span className="text-xs">{currentEmail}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-border-subtle py-1">
          {/* Blended inbox toggle */}
          {accounts.length > 1 && (
            <button
              onClick={onToggleBlended}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-bg-hover transition"
            >
              <div className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-full',
                inboxMode === 'blended'
                  ? 'bg-accent-purple/15 text-accent-purple'
                  : 'bg-bg-tertiary text-text-muted'
              )}>
                <Layers className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-text-primary font-medium">
                  {inboxMode === 'blended' ? 'Single inbox' : 'Blend all inboxes'}
                </div>
                <div className="text-2xs text-text-muted">
                  {inboxMode === 'blended'
                    ? 'View one account at a time'
                    : `Combine ${accounts.length} accounts into one view`}
                </div>
              </div>
              {inboxMode === 'blended' && (
                <div className="rounded-full bg-accent-purple/15 px-2 py-0.5 text-2xs font-medium text-accent-purple">
                  On
                </div>
              )}
            </button>
          )}

          {/* Add account button */}
          <button
            onClick={onAdd}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-bg-hover transition"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-border-subtle text-text-muted">
              <Plus className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-text-primary font-medium">Add Gmail account</div>
              <div className="text-2xs text-text-muted">Sign in with another Google account</div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
