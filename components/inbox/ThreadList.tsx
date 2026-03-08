'use client';

import { useInboxStore, useFilteredThreads } from '@/lib/store';
import { ThreadRow } from './ThreadRow';
import { Loader2, Inbox } from 'lucide-react';

interface ThreadListProps {
  onSelectThread: (threadId: string) => void;
}

export function ThreadList({ onSelectThread }: ThreadListProps) {
  const isLoading = useInboxStore((s) => s.isLoading);
  const selectedThreadId = useInboxStore((s) => s.selectedThreadId);
  const selectThread = useInboxStore((s) => s.selectThread);
  const filteredThreads = useFilteredThreads();

  const handleSelect = (threadId: string) => {
    selectThread(threadId);
    onSelectThread(threadId);
  };

  if (isLoading && filteredThreads.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
      </div>
    );
  }

  if (filteredThreads.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-text-muted">
        <Inbox className="mb-3 h-10 w-10" />
        <p className="text-sm">No emails found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {filteredThreads.map((thread) => (
        <ThreadRow
          key={thread.id}
          thread={thread}
          isSelected={thread.id === selectedThreadId}
          onClick={() => handleSelect(thread.id)}
        />
      ))}
    </div>
  );
}
