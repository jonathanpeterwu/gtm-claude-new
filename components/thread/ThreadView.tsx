'use client';

import { useState, useEffect } from 'react';
import { Thread, CATEGORY_CONFIG } from '@/types';
import { MessageBubble } from './MessageBubble';
import { AIActions } from './AIActions';
import { ReplyComposer } from './ReplyComposer';
import { Archive, Star, Tag, ArrowLeft, MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface ThreadViewProps {
  thread: Thread;
  onBack: () => void;
  onArchive: () => void;
  onStar: () => void;
  userEmail?: string;
}

export function ThreadView({ thread, onBack, onArchive, onStar, userEmail }: ThreadViewProps) {
  const [replying, setReplying] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const handleSummarize = async () => {
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summarize', thread }),
      });
      const data = await res.json();
      setSummary(data.summary);
    } catch {
      toast.error('Failed to summarize');
    }
  };

  return (
    <div className="flex h-full flex-col animate-slide-in">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
        <button
          onClick={onBack}
          className="rounded p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <h2 className="flex-1 truncate text-base font-medium" title={thread.subject}>{thread.subject}</h2>

        <div className="flex items-center gap-1">
          <button
            onClick={onArchive}
            className="rounded-lg p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition"
            title="Archive (e)"
            aria-label="Archive thread"
          >
            <Archive className="h-4 w-4" />
          </button>
          <button
            onClick={onStar}
            className="rounded-lg p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition"
            title="Star (s)"
            aria-label={thread.isStarred ? 'Unstar thread' : 'Star thread'}
          >
            <Star className={clsx('h-4 w-4', thread.isStarred && 'fill-accent-yellow text-accent-yellow')} />
          </button>
          <button
            onClick={() => setShowAI(!showAI)}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
              showAI ? 'bg-accent-purple text-white' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            )}
          >
            AI Actions
          </button>
        </div>
      </div>

      {/* AI panel */}
      {showAI && (
        <AIActions
          thread={thread}
          userEmail={userEmail}
          onDraftGenerated={() => setReplying(true)}
          summary={summary}
          onSummarize={handleSummarize}
        />
      )}

      {/* Summary banner */}
      {summary && !showAI && (
        <div className="border-b border-border-subtle bg-accent-purple/10 px-4 py-2 text-sm text-text-secondary">
          <strong className="text-accent-purple">Summary:</strong> {summary}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {thread.messages.map((msg, i) => (
          <MessageBubble key={msg.id} message={msg} isLast={i === thread.messages.length - 1} />
        ))}
      </div>

      {/* Reply area */}
      {replying ? (
        <ReplyComposer
          thread={thread}
          userEmail={userEmail}
          onClose={() => setReplying(false)}
        />
      ) : (
        <div className="border-t border-border-subtle px-4 py-3">
          <button
            onClick={() => setReplying(true)}
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-4 py-2.5 text-left text-sm text-text-muted hover:border-accent-blue hover:text-text-secondary transition"
          >
            Reply... (r)
          </button>
        </div>
      )}
    </div>
  );
}
