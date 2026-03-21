'use client';

import { useEffect, useState } from 'react';
import { useInboxStore } from '@/lib/store';
import { InboxSuggestion } from '@/types';
import {
  Sparkles,
  Reply,
  Clock,
  AlertTriangle,
  Users,
  Archive,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';

const SUGGESTION_CONFIG: Record<InboxSuggestion['type'], { icon: typeof Reply; color: string; label: string }> = {
  reply_needed: { icon: Reply, color: 'text-accent-blue', label: 'Reply needed' },
  follow_up: { icon: Clock, color: 'text-accent-yellow', label: 'Follow up' },
  urgent: { icon: AlertTriangle, color: 'text-accent-red', label: 'Urgent' },
  delegate: { icon: Users, color: 'text-accent-purple', label: 'Delegate' },
  archive: { icon: Archive, color: 'text-text-muted', label: 'Archive' },
};

interface InboxSuggestionsProps {
  onSelectThread: (threadId: string) => void;
}

export function InboxSuggestions({ onSelectThread }: InboxSuggestionsProps) {
  const threads = useInboxStore((s) => s.threads);
  const suggestions = useInboxStore((s) => s.suggestions);
  const setSuggestions = useInboxStore((s) => s.setSuggestions);
  const categories = useInboxStore((s) => s.categories);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (threads.length === 0 || suggestions.length > 0) return;

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const threadSummaries = threads.slice(0, 15).map((t) => {
          const lastMsg = t.messages[t.messages.length - 1];
          return {
            id: t.id,
            subject: t.subject,
            snippet: t.snippet,
            from: lastMsg?.from.name || lastMsg?.from.email || 'Unknown',
            category: categories.get(t.id) || undefined,
          };
        });

        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'inbox-suggestions', threads: threadSummaries }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.suggestions?.length) {
            setSuggestions(
              data.suggestions.sort((a: InboxSuggestion, b: InboxSuggestion) => b.priority - a.priority)
            );
          }
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    // Delay to let categorization finish first
    const timeout = setTimeout(fetchSuggestions, 3000);
    return () => clearTimeout(timeout);
  }, [threads, suggestions.length, categories, setSuggestions]);

  if (suggestions.length === 0 && !loading) return null;

  return (
    <div className="border-b border-border-subtle">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-bg-hover/50 transition"
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-accent-purple" />
          <span className="text-xs font-semibold uppercase tracking-wider text-accent-purple">
            AI Suggestions
          </span>
          {loading && <Loader2 className="h-3 w-3 animate-spin text-accent-purple" />}
          {!loading && suggestions.length > 0 && (
            <span className="rounded-full bg-accent-purple/10 px-1.5 py-0.5 text-2xs text-accent-purple">
              {suggestions.length}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-text-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-text-muted" />}
      </button>

      {expanded && suggestions.length > 0 && (
        <div className="px-3 pb-3 space-y-1.5">
          {suggestions.map((suggestion) => {
            const thread = threads.find((t) => t.id === suggestion.threadId);
            if (!thread) return null;
            const config = SUGGESTION_CONFIG[suggestion.type];
            const Icon = config.icon;

            return (
              <button
                key={`${suggestion.threadId}-${suggestion.type}`}
                onClick={() => onSelectThread(suggestion.threadId)}
                className="flex w-full items-start gap-2 rounded-lg border border-border-subtle bg-bg-primary p-2.5 text-left hover:border-accent-purple/30 hover:bg-bg-hover transition"
              >
                <div className={clsx('mt-0.5 flex-shrink-0', config.color)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={clsx('text-2xs font-medium', config.color)}>{config.label}</span>
                    <span className="text-2xs text-text-muted">
                      {'*'.repeat(suggestion.priority)}
                    </span>
                  </div>
                  <p className="text-xs text-text-primary truncate mt-0.5">{thread.subject}</p>
                  <p className="text-2xs text-text-muted mt-0.5">{suggestion.reason}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
