'use client';

import { memo } from 'react';
import { Thread, CATEGORY_CONFIG, EmailCategory } from '@/types';
import { useThreadCategory } from '@/lib/store';
import { Star, Paperclip } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface ThreadRowProps {
  thread: Thread;
  isSelected: boolean;
  onClick: () => void;
  accountColor?: string;
  showAccountDot?: boolean;
}

export const ThreadRow = memo(function ThreadRow({
  thread,
  isSelected,
  onClick,
  accountColor,
  showAccountDot,
}: ThreadRowProps) {
  const category = useThreadCategory(thread.id) || thread.category;
  const catConfig = category ? CATEGORY_CONFIG[category] : null;
  const lastMsg = thread.messages[thread.messages.length - 1];
  const fromName = lastMsg?.from.name || lastMsg?.from.email?.split('@')[0] || 'Unknown';

  return (
    <div
      onClick={onClick}
      className={clsx(
        'group flex cursor-pointer items-start gap-3 border-b border-border-subtle px-4 py-3 transition-colors',
        isSelected ? 'bg-bg-selected' : 'hover:bg-bg-hover',
        thread.isUnread && 'bg-bg-hover/50'
      )}
    >
      {/* Unread indicator + account dot */}
      <div className="mt-2 flex-shrink-0">
        {showAccountDot && accountColor ? (
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: accountColor }}
          />
        ) : thread.isUnread ? (
          <div className="h-2 w-2 rounded-full bg-accent-blue" />
        ) : (
          <div className="h-2 w-2" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={clsx('truncate text-sm', thread.isUnread ? 'font-semibold text-text-primary' : 'text-text-secondary')}>
            {fromName}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {thread.isStarred && <Star className="h-3.5 w-3.5 fill-accent-yellow text-accent-yellow" />}
            {thread.messages.some((m) => m.hasAttachments) && <Paperclip className="h-3 w-3 text-text-muted" />}
            <span className="text-2xs text-text-muted whitespace-nowrap">
              {formatDistanceToNow(new Date(thread.lastMessageDate), { addSuffix: false })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span className={clsx('truncate text-sm', thread.isUnread ? 'text-text-primary' : 'text-text-secondary')}>
            {thread.subject}
          </span>
          {thread.messages.length > 1 && (
            <span className="flex-shrink-0 rounded bg-bg-tertiary px-1.5 py-0.5 text-2xs text-text-muted">
              {thread.messages.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="truncate text-xs text-text-muted">{thread.snippet}</span>
          {catConfig && (
            <span className={clsx('flex-shrink-0 text-2xs', catConfig.color)}>
              {catConfig.icon} {catConfig.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
