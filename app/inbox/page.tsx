'use client';

import { useEffect, useMemo, useCallback, useRef } from 'react';
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
import { InboxSuggestions } from '@/components/inbox/InboxSuggestions';
import { ThreadListSkeleton } from '@/components/inbox/ThreadListSkeleton';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function gmailAction(action: string, payload: Record<string, unknown>) {
  return fetch('/api/gmail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
}

// Fire-and-forget background task extraction — only sends summaries, not full threads
function backgroundExtractTasks(threads: Thread[], addTask: (task: GTMTask) => void) {
  const processedThreadIds = new Set(useInboxStore.getState().tasks.map((t) => t.threadId));
  const newThreads = threads.filter((t) => !processedThreadIds.has(t.id));
  if (newThreads.length === 0) return;

  // Only send minimal data to AI
  const summaries = newThreads.slice(0, 5).map((t) => ({
    id: t.id,
    subject: t.subject,
    snippet: t.snippet,
    from: t.messages[t.messages.length - 1]?.from,
    messageCount: t.messages.length,
  }));

  fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'extract-tasks', threads: summaries }),
  })
    .then((r) => r.ok ? r.json() : null)
    .then((data) => {
      if (!data?.tasks?.length) return;
      const now = new Date().toISOString();
      for (const task of data.tasks) {
        const thread = newThreads.find((t) => t.id === task.threadId);
        const lastMsg = thread?.messages[thread.messages.length - 1];
        addTask({
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          threadId: task.threadId || thread?.id || '',
          title: task.title,
          description: task.description || '',
          status: 'todo',
          priority: task.priority || 'medium',
          dueDate: task.dueDate || undefined,
          contact: lastMsg?.from,
          createdAt: now,
          updatedAt: now,
        });
      }
    })
    .catch(() => {});
}

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    threads, setThreads, isLoading, setLoading,
    selectedThreadId, selectThread, setCategories,
    composing, setComposing, updateThread,
    tasks, addTask, addAccount, inboxMode, mergeThreads,
    setThreadAccountMap,
    activeAccountEmail,
    optimisticArchive, optimisticStar, optimisticMarkRead,
  } = useInboxStore();

  useLinkedAccountsSync();

  const fetchAbortRef = useRef<AbortController | null>(null);

  // Derive selected thread from store — no redundant local state
  const selectedThread = useMemo(
    () => (selectedThreadId ? threads.find((t) => t.id === selectedThreadId) || null : null),
    [selectedThreadId, threads]
  );

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/');
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      addAccount({
        email: session.user.email,
        name: session.user.name || session.user.email.split('@')[0],
        image: session.user.image || undefined,
        color: '#3B82F6',
      });
    }
  }, [session, addAccount]);

  useEffect(() => {
    if ((session as any)?.error === 'RefreshAccessTokenError') {
      signIn('google');
    }
  }, [session]);

  const fetchThreads = useCallback(async (query?: string) => {
    // Abort any in-flight request
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams({ action: 'threads' });
      if (query) params.set('q', query);
      const res = await fetch(withAccount(`/api/gmail?${params}`, activeAccountEmail), {
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      const accountEmail = session?.user?.email || '';

      if (inboxMode === 'blended') {
        mergeThreads(data.threads, accountEmail);
      } else {
        setThreads(data.threads);
        const newMap = new Map<string, string>();
        data.threads.forEach((t: Thread) => newMap.set(t.id, accountEmail));
        setThreadAccountMap(newMap);
      }

      // Background: categorize with AI (non-blocking)
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

        // Background: extract tasks
        backgroundExtractTasks(data.threads, addTask);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      toast.error(err?.message || 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, [setThreads, setLoading, setCategories, activeAccountEmail]);

  useEffect(() => {
    if (session) fetchThreads();
  }, [session, fetchThreads]);

  // Auto-mark as read when thread is selected
  useEffect(() => {
    if (!selectedThread || !selectedThread.isUnread) return;
    optimisticMarkRead(selectedThread.id);
    gmailAction('markRead', { threadId: selectedThread.id, account: activeAccountEmail }).catch(() => {});
  }, [selectedThreadId]);

  // Optimistic archive with undo
  const handleArchive = useCallback(async () => {
    if (!selectedThreadId) return;
    const archivedId = selectedThreadId;
    const archivedThread = threads.find((t) => t.id === archivedId);
    optimisticArchive(archivedId);

    const toastId = toast.success(
      (t) => (
        <span className="flex items-center gap-2 text-sm">
          Archived
          <button
            onClick={() => {
              if (archivedThread) {
                useInboxStore.getState().setThreads([archivedThread, ...useInboxStore.getState().threads]);
                useInboxStore.getState().selectThread(archivedId);
              }
              toast.dismiss(t.id);
            }}
            className="font-medium text-accent-blue hover:underline"
          >
            Undo
          </button>
        </span>
      ),
      { duration: 4000 }
    );

    gmailAction('archive', { threadId: archivedId, account: activeAccountEmail }).catch(() => {
      toast.dismiss(toastId);
      toast.error('Failed to archive on server');
    });
  }, [selectedThreadId, threads, optimisticArchive, activeAccountEmail]);

  // Optimistic star — instant UI, background API
  const handleStar = useCallback(async () => {
    if (!selectedThread) return;
    const newStarred = !selectedThread.isStarred;
    optimisticStar(selectedThread.id, newStarred);
    toast.success(newStarred ? 'Starred' : 'Unstarred');

    gmailAction('star', { threadId: selectedThread.id, starred: newStarred, account: activeAccountEmail }).catch(() => {
      // Revert on failure
      optimisticStar(selectedThread.id, !newStarred);
      toast.error('Failed to update star');
    });
  }, [selectedThread, optimisticStar, activeAccountEmail]);

  const handleBack = useCallback(() => {
    selectThread(null);
  }, [selectThread]);

  useKeyboardShortcuts({
    onArchive: handleArchive,
    onStar: handleStar,
    onOpen: () => {},
    onBack: handleBack,
    onCompose: () => setComposing(true),
    onReply: () => {},
    onDraft: () => {},
  });

  if (status === 'loading') {
    return (
      <div className="flex h-screen bg-bg-primary">
        {/* Skeleton sidebar */}
        <div className="hidden md:flex w-14 flex-col border-r border-border-subtle bg-bg-secondary">
          <div className="p-3 py-4"><div className="h-5 w-5 rounded bg-bg-tertiary animate-pulse" /></div>
          <div className="space-y-2 px-2 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-bg-tertiary animate-pulse" />
            ))}
          </div>
        </div>
        {/* Skeleton thread list */}
        <div className="w-full md:w-96 border-r border-border-subtle">
          <div className="h-14 border-b border-border-subtle px-4 flex items-center">
            <div className="h-8 w-full max-w-xs rounded-lg bg-bg-tertiary animate-pulse" />
          </div>
          <ThreadListSkeleton />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const showThreadView = !!selectedThread;

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
          <div
            className={clsx(
              'flex-shrink-0 border-r border-border-subtle overflow-hidden flex flex-col',
              'w-full md:w-96',
              showThreadView && 'hidden md:flex'
            )}
          >
            <InboxSuggestions onSelectThread={(id) => selectThread(id)} />
            <div className="flex-1 overflow-hidden">
              <ThreadList onSelectThread={(id) => selectThread(id)} />
            </div>
          </div>

          <div
            className={clsx(
              'flex-1 min-w-0',
              !showThreadView && 'hidden md:block'
            )}
          >
            {selectedThread ? (
              <ThreadView
                thread={selectedThread}
                onBack={handleBack}
                onArchive={handleArchive}
                onStar={handleStar}
                userEmail={session.user?.email || undefined}
              />
            ) : (
              <div className="flex h-full flex-col">
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
