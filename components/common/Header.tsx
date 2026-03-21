'use client';

import { useSession } from 'next-auth/react';
import { SearchBar } from './SearchBar';
import { AccountSwitcher } from './AccountSwitcher';
import { RefreshCw, Keyboard } from 'lucide-react';
import { useState } from 'react';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

interface HeaderProps {
  onSearch: (query: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function Header({ onSearch, onRefresh, isLoading }: HeaderProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <>
      <header className="flex items-center gap-4 border-b border-border-subtle bg-bg-secondary px-4 py-2.5">
        <SearchBar onSearch={onSearch} />

        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="rounded-lg p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowShortcuts(true)}
            className="rounded-lg p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </button>

          <AccountSwitcher variant="header" />
        </div>
      </header>

      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}
