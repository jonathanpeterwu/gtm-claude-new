'use client';

import { useSession, signOut } from 'next-auth/react';
import { useInboxStore } from '@/lib/store';
import { useThemeStore } from '@/lib/hooks/useTheme';
import { CATEGORY_CONFIG, EmailCategory } from '@/types';
import {
  Inbox,
  Star,
  Send,
  FileText,
  Calendar,
  CheckSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  Sun,
  Moon,
  PenSquare,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { AccountSwitcher } from './AccountSwitcher';

const NAV_ITEMS = [
  { href: '/inbox', icon: Inbox, label: 'Inbox' },
  { href: '/inbox?filter=starred', icon: Star, label: 'Starred' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const CATEGORY_FILTERS: EmailCategory[] = [
  'action_required',
  'waiting_on',
  'fyi',
  'scheduling',
  'follow_up',
  'gtm',
  'newsletter',
  'notification',
];

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const sidebarOpen = useInboxStore((s) => s.sidebarOpen);
  const setSidebarOpen = useInboxStore((s) => s.setSidebarOpen);
  const activeFilter = useInboxStore((s) => s.activeFilter);
  const setActiveFilter = useInboxStore((s) => s.setActiveFilter);
  const setComposing = useInboxStore((s) => s.setComposing);
  const { theme, toggleTheme } = useThemeStore();

  return (
    <aside
      className={clsx(
        'flex h-screen flex-col border-r border-border-subtle bg-bg-secondary transition-all duration-200',
        sidebarOpen ? 'w-56' : 'w-14'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4">
        {sidebarOpen && (
          <Link href="/inbox" className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent-blue" />
            <span className="text-sm font-bold">Superuser</span>
          </Link>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Account Switcher */}
      {sidebarOpen && (
        <div className="px-2 mb-2">
          <AccountSwitcher />
        </div>
      )}

      {/* Compose button */}
      <div className="px-2 mb-2">
        <button
          onClick={() => setComposing(true)}
          className={clsx(
            'flex w-full items-center gap-2 rounded-lg bg-accent-blue px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-blue/90',
            !sidebarOpen && 'justify-center px-2'
          )}
        >
          <PenSquare className="h-4 w-4" />
          {sidebarOpen && 'Compose'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href === '/inbox' && pathname === '/inbox');
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
                isActive
                  ? 'bg-bg-selected text-text-primary'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
                !sidebarOpen && 'justify-center px-2'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && label}
            </Link>
          );
        })}

        {sidebarOpen && (
          <>
            <div className="mt-4 mb-2 px-3 text-2xs font-semibold uppercase tracking-wider text-text-muted">
              Categories
            </div>
            {CATEGORY_FILTERS.map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(activeFilter === cat ? 'all' : cat)}
                  className={clsx(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition',
                    activeFilter === cat
                      ? 'bg-bg-selected text-text-primary'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  )}
                >
                  <span className="text-xs">{config.icon}</span>
                  {config.label}
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border-subtle p-2 space-y-1">
        <button
          onClick={toggleTheme}
          className={clsx(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition',
            !sidebarOpen && 'justify-center px-2'
          )}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {sidebarOpen && (theme === 'dark' ? 'Light mode' : 'Dark mode')}
        </button>
        {session && (
          <button
            onClick={() => signOut()}
            className={clsx(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition',
              !sidebarOpen && 'justify-center px-2'
            )}
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen && (
              <span className="truncate text-xs">{session.user?.email || 'Sign out'}</span>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
