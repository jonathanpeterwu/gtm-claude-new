'use client';

import { SearchBar } from './SearchBar';
import { AccountSwitcher } from './AccountSwitcher';
import { useInboxStore } from '@/lib/store';
import { RefreshCw, Keyboard, Menu } from 'lucide-react';
import { useState } from 'react';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

interface HeaderProps {
  onSearch: (query: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function Header({ onSearch, onRefresh, isLoading }: HeaderProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const setSidebarOpen = useInboxStore((s) => s.setSidebarOpen);

  return (
    <>
      <header className="flex items-center gap-2 md:gap-4 border-b border-border-subtle bg-bg-secondary px-2 md:px-4 py-2 md:py-2.5 safe-left safe-right">
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition md:hidden"
          title="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <SearchBar onSearch={onSearch} />

        <div className="flex items-center gap-0.5 md:gap-1">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="rounded-lg p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Hide keyboard shortcuts on mobile — not relevant for touch */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="hidden md:block rounded-lg p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition"
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
