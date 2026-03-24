'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/common/Sidebar';
import { useThemeStore } from '@/lib/hooks/useTheme';
import { Sun, Moon, LogOut, User, Shield, Zap, Menu } from 'lucide-react';
import { useInboxStore } from '@/lib/store';
import clsx from 'clsx';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useThemeStore();
  const setSidebarOpen = useInboxStore((s) => s.setSidebarOpen);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/');
  }, [status, router]);

  if (!session) return null;

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0">
        <div className="border-b border-border-subtle bg-bg-secondary px-4 md:px-6 py-3 md:py-4 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden rounded-lg p-1.5 text-text-secondary hover:bg-bg-hover">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl">
          {/* Account */}
          <section className="mb-8">
            <h2 className="flex items-center gap-2 text-sm font-semibold mb-4">
              <User className="h-4 w-4 text-accent-blue" />
              Account
            </h2>
            <div className="rounded-lg border border-border-subtle bg-bg-secondary p-4">
              <div className="flex items-center gap-3">
                {session.user?.image && (
                  <img src={session.user.image} alt="" className="h-10 w-10 rounded-full" />
                )}
                <div>
                  <p className="text-sm font-medium">{session.user?.name}</p>
                  <p className="text-xs text-text-muted">{session.user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="mt-4 flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover transition"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </section>

          {/* Appearance */}
          <section className="mb-8">
            <h2 className="flex items-center gap-2 text-sm font-semibold mb-4">
              <Sun className="h-4 w-4 text-accent-yellow" />
              Appearance
            </h2>
            <div className="rounded-lg border border-border-subtle bg-bg-secondary p-4">
              <p className="text-sm text-text-secondary mb-3">Theme</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('dark')}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition border',
                    theme === 'dark'
                      ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                      : 'border-border-subtle text-text-secondary hover:bg-bg-hover'
                  )}
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition border',
                    theme === 'light'
                      ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                      : 'border-border-subtle text-text-secondary hover:bg-bg-hover'
                  )}
                >
                  <Sun className="h-4 w-4" />
                  Light
                </button>
              </div>
            </div>
          </section>

          {/* AI Settings */}
          <section className="mb-8">
            <h2 className="flex items-center gap-2 text-sm font-semibold mb-4">
              <Zap className="h-4 w-4 text-accent-purple" />
              AI Settings
            </h2>
            <div className="rounded-lg border border-border-subtle bg-bg-secondary p-4 space-y-3">
              <div>
                <p className="text-sm text-text-secondary">Model</p>
                <p className="text-xs text-text-muted mt-0.5">Claude Sonnet (claude-sonnet-4-20250514)</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Capabilities</p>
                <ul className="mt-1 space-y-1 text-xs text-text-muted">
                  <li>Email categorization & triage</li>
                  <li>Smart draft generation (4 tones)</li>
                  <li>Thread summarization</li>
                  <li>Research-based drafting</li>
                  <li>Task extraction</li>
                  <li>Writing improvement</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold mb-4">
              <Shield className="h-4 w-4 text-accent-green" />
              Privacy & Security
            </h2>
            <div className="rounded-lg border border-border-subtle bg-bg-secondary p-4">
              <p className="text-sm text-text-secondary">
                Superuser processes your emails using Claude AI. Your data is sent directly to the Anthropic API
                and is not stored beyond the request. Gmail access uses OAuth 2.0 with minimal required scopes.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
