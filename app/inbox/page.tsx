'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useInboxStore } from '@/lib/store';
import { Sidebar } from '@/components/common/Sidebar';
import { Header } from '@/components/common/Header';
import { ThreadList } from '@/components/inbox/ThreadList';
import { ThreadView } from '@/components/thread/ThreadView';
import { ComposeModal } from '@/components/compose/ComposeModal';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboard';
import { Thread } from '@/types';
import { UpcomingMeetings } from '@/components/calendar/UpcomingMeetings';
import toast from 'react-hot-toast';

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    threads, setThreads, isLoading, setLoading,
    selectedThreadId, selectThread, setCategories,
    composing, setComposing, removeThread, updateThread,
  } = useInboxStore();

  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/');
  }, [status, router]);

  const fetchThreads = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: 'threads' });
      if (query) params.set('q', query);
      const res = await fetch(`/api/gmail?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setThreads(data.threads);

      // Auto-categorize with AI
      if (data.threads.length > 0) {
        fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'categorize', threads: data.threads }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.categories) {
              setCategories(new Map(Object.entries(d.categories)));
            }
          })
          .catch(() => {});
      }
    } catch {
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, [setThreads, setLoading, setCategories]);

  useEffect(() => {
    if (session) fetchThreads();
  }, [session, fetchThreads]);

  // Load full thread when selected
  useEffect(() => {
    if (!selectedThreadId) {
      setSelectedThread(null);
      return;
    }
    const found = threads.find((t) => t.id === selectedThreadId);
    if (found) setSelectedThread(found);
  }, [selectedThreadId, threads]);

  const handleArchive = async () => {
    if (!selectedThreadId) return;
    try {
      await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', threadId: selectedThreadId }),
      });
      removeThread(selectedThreadId);
      selectThread(null);
      toast.success('Archived');
    } catch {
      toast.error('Failed to archive');
    }
  };

  const handleStar = async () => {
    if (!selectedThread) return;
    const newStarred = !selectedThread.isStarred;
    try {
      await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'star', threadId: selectedThread.id, starred: newStarred }),
      });
      updateThread(selectedThread.id, { isStarred: newStarred });
      toast.success(newStarred ? 'Starred' : 'Unstarred');
    } catch {
      toast.error('Failed to update star');
    }
  };

  useKeyboardShortcuts({
    onArchive: handleArchive,
    onStar: handleStar,
    onOpen: () => selectedThreadId && setSelectedThread(threads.find((t) => t.id === selectedThreadId) || null),
    onBack: () => { selectThread(null); setSelectedThread(null); },
    onCompose: () => setComposing(true),
    onReply: () => {},
    onDraft: () => {},
  });

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="animate-pulse-subtle text-accent-blue">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0">
        <Header
          onSearch={(q) => fetchThreads(q)}
          onRefresh={() => fetchThreads()}
          isLoading={isLoading}
        />

        <div className="flex flex-1 min-h-0">
          {/* Thread list - left panel */}
          <div className="w-96 flex-shrink-0 border-r border-border-subtle overflow-hidden">
            <ThreadList onSelectThread={(id) => selectThread(id)} />
          </div>

          {/* Thread view - right panel */}
          <div className="flex-1 min-w-0">
            {selectedThread ? (
              <ThreadView
                thread={selectedThread}
                onBack={() => { selectThread(null); setSelectedThread(null); }}
                onArchive={handleArchive}
                onStar={handleStar}
                userEmail={session.user?.email || undefined}
              />
            ) : (
              <div className="flex h-full flex-col">
                <UpcomingMeetings />
                <div className="flex flex-1 flex-col items-center justify-center text-text-muted">
                  <div className="text-4xl mb-3">
                    <span className="text-accent-blue">S</span>
                  </div>
                  <p className="text-sm">Select an email to read</p>
                  <p className="mt-1 text-xs">Use <kbd className="rounded border border-border-subtle px-1.5 py-0.5 text-2xs font-mono">j</kbd> / <kbd className="rounded border border-border-subtle px-1.5 py-0.5 text-2xs font-mono">k</kbd> to navigate</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {composing && <ComposeModal />}
    </div>
  );
}
