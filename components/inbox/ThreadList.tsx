'use client';

import { useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInboxStore, useFilteredThreads } from '@/lib/store';
import { ThreadRow } from './ThreadRow';
import { ThreadListSkeleton } from './ThreadListSkeleton';
import { Inbox } from 'lucide-react';

interface ThreadListProps {
  onSelectThread: (threadId: string) => void;
}

const THREAD_ROW_HEIGHT = 88; // estimated height per row

export function ThreadList({ onSelectThread }: ThreadListProps) {
  const isLoading = useInboxStore((s) => s.isLoading);
  const selectedThreadId = useInboxStore((s) => s.selectedThreadId);
  const selectThread = useInboxStore((s) => s.selectThread);
  const inboxMode = useInboxStore((s) => s.inboxMode);
  const threadAccountMap = useInboxStore((s) => s.threadAccountMap);
  const accounts = useInboxStore((s) => s.accounts);
  const filteredThreads = useFilteredThreads();
  const parentRef = useRef<HTMLDivElement>(null);

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const acc of accounts) {
      map.set(acc.email, acc.color);
    }
    return map;
  }, [accounts]);

  const virtualizer = useVirtualizer({
    count: filteredThreads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => THREAD_ROW_HEIGHT,
    overscan: 5,
  });

  const handleSelect = useCallback((threadId: string) => {
    selectThread(threadId);
    onSelectThread(threadId);
  }, [selectThread, onSelectThread]);

  if (isLoading && filteredThreads.length === 0) {
    return <ThreadListSkeleton />;
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
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const thread = filteredThreads[virtualItem.index];
          const accountEmail = threadAccountMap.get(thread.id);
          const showDot = inboxMode === 'blended' && !!accountEmail;
          const color = accountEmail ? accountMap.get(accountEmail) : undefined;

          return (
            <div
              key={thread.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
            >
              <ThreadRow
                thread={thread}
                isSelected={thread.id === selectedThreadId}
                onClick={() => handleSelect(thread.id)}
                showAccountDot={showDot}
                accountColor={color}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
