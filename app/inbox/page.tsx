'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useInboxStore } from '@/lib/store';
import { Sidebar } from '@/components/common/Sidebar';
import { Header } from '@/components/common/Header';
import { ThreadList } from '@/components/inbox/ThreadList';
import { ThreadView } from '@/components/thread/ThreadView';
import { ComposeModal } from '@/components/compose/ComposeModal';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboard';
import { useLinkedAccountsSync, withAccount } from '@/lib/hooks/useLinkedAccounts';
import { Thread, GTMTask } from '@/types';
import { UpcomingMeetings } from '@/components/calendar/UpcomingMeetings';
import { InboxSuggestions } from '@/components/inbox/InboxSuggestions';
import toast from 'react-hot-toast';

function autoExtractTasksFromThreads(threads: Thread[], existingTasks: GTMTask[], addTask: (task: GTMTask) => void) {
  // Only extract from threads not already processed
  const processedThreadIds = new Set(existingTasks.map((t) => t.threadId));
  const newThreads = threads.filter((t) => !processedThreadIds.has(t.id));
  if (newThreads.length === 0) return;

  // Process in background, batch of 5 at a time
  const batch = newThreads.slice(0, 5);
  batch.forEach(async (thread) => {
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract-tasks', thread }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.tasks || data.tasks.length === 0) return;

      const lastMsg = thread.messages[thread.messages.length - 1];
      const now = new Date().toISOString();
      for (const task of data.tasks) {
        const gtmTask: GTMTask = {
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          threadId: thread.id,
          title: task.title,
          description: task.description || '',
          status: 'todo',
          priority: task.priority || 'medium',
          dueDate: task.dueDate || undefined,
          contact: lastMsg?.from || { name: '', email: '' },
          createdAt: now,
          updatedAt: now,
        };
        addTask(gtmTask);
      }
    } catch {
      // Silently fail for auto-extraction
    }
  });
}

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    threads, setThreads, isLoading, setLoading,
    selectedThreadId, selectThread, setCategories,
    composing, setComposing, removeThread, updateThread,
    tasks, addTask, addAccount, inboxMode, mergeThreads,
    setThreadAccountMap, threadAccountMap,
    activeAccountEmail,
  } = useInboxStore();

  // Sync linked accounts from session into the store
  useLinkedAccountsSync();

  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/');
  }, [status, router]);

  // Register current session as an account
  useEffect(() => {
    if (session?.user?.email) {
      addAccount({
        email: session.user.email,
        name: session.user.name || session.user.email.split('@')[0],
        image: session.user.image || undefined,
        color: '#3B82F6', // Will be overridden by store if already exists
      });
    }
  }, [session, addAccount]);

  // Re-authenticate if refresh token is invalid
  useEffect(() => {
    if ((session as any)?.error === 'RefreshAccessTokenError') {
      signIn('google');
    }
  }, [session]);

  const fetchThreads = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: 'threads' });
      if (query) params.set('q', query);
      const res = await fetch(withAccount(`/api/gmail?${params}`, activeAccountEmail));
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      const accountEmail = session?.user?.email || '';

      // Track which account each thread belongs to
      if (inboxMode === 'blended') {
        mergeThreads(data.threads, accountEmail);
      } else {
        setThreads(data.threads);
        const newMap = new Map<string, string>();
        data.threads.forEach((t: Thread) => newMap.set(t.id, accountEmail));
        setThreadAccountMap(newMap);
      }

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

        // Auto-extract tasks from email threads
        autoExtractTasksFromThreads(data.threads, tasks, addTask);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, [setThreads, setLoading, setCategories, activeAccountEmail]);

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
        body: JSON.stringify({ action: 'archive', threadId: selectedThreadId, account: activeAccountEmail }),
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
        body: JSON.stringify({ action: 'star', threadId: selectedThread.id, starred: newStarred, account: activeAccountEmail }),
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
          <div className="w-96 flex-shrink-0 border-r border-border-subtle overflow-hidden flex flex-col">
            <InboxSuggestions onSelectThread={(id) => selectThread(id)} />
            <div className="flex-1 overflow-hidden">
              <ThreadList onSelectThread={(id) => selectThread(id)} />
            </div>
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
