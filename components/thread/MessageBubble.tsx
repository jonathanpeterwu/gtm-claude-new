'use client';

import { Email } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import { Paperclip, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

interface MessageBubbleProps {
  message: Email;
  isLast: boolean;
}

export function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const [expanded, setExpanded] = useState(isLast);

  return (
    <div className={clsx('rounded-lg border border-border-subtle transition', expanded ? 'bg-bg-secondary' : 'bg-bg-primary')}>
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-blue/20 text-sm font-medium text-accent-blue">
          {(message.from.name || message.from.email)[0]?.toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{message.from.name || message.from.email}</span>
            <span className="text-2xs text-text-muted flex-shrink-0">
              {format(new Date(message.date), 'MMM d, h:mm a')}
            </span>
          </div>
          {!expanded && <p className="truncate text-xs text-text-muted mt-0.5">{message.snippet}</p>}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {message.hasAttachments && <Paperclip className="h-3.5 w-3.5 text-text-muted" />}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </div>
      </button>

      {/* Body - expandable */}
      {expanded && (
        <div className="border-t border-border-subtle px-4 py-3 animate-fade-in">
          <div className="mb-2 text-xs text-text-muted">
            To: {message.to.map((t) => t.name || t.email).join(', ')}
            {message.cc.length > 0 && (
              <span className="ml-2">Cc: {message.cc.map((c) => c.name || c.email).join(', ')}</span>
            )}
          </div>
          <div className="whitespace-pre-wrap text-sm text-text-primary leading-relaxed">
            {message.body || message.snippet}
          </div>
        </div>
      )}
    </div>
  );
}
