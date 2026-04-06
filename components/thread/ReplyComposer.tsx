'use client';

import { useState } from 'react';
import { Thread } from '@/types';
import { useInboxStore } from '@/lib/store';
import { Send, X, Wand2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReplyComposerProps {
  thread: Thread;
  userEmail?: string;
  onClose: () => void;
  initialDraft?: string;
}

export function ReplyComposer({ thread, userEmail, onClose, initialDraft }: ReplyComposerProps) {
  const [body, setBody] = useState(initialDraft || '');
  const [sending, setSending] = useState(false);
  const [improving, setImproving] = useState(false);
  const activeAccountEmail = useInboxStore((s) => s.activeAccountEmail);

  const lastMsg = thread.messages[thread.messages.length - 1];
  const replyTo = lastMsg.from.email;
  const replyMessageId = lastMsg.messageId;
  const replyReferences = [
    ...(lastMsg.references || []),
    ...(lastMsg.messageId ? [lastMsg.messageId] : []),
  ].filter(Boolean);

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          threadId: thread.id,
          to: replyTo,
          subject: thread.subject,
          body,
          inReplyTo: replyMessageId,
          references: replyReferences,
          account: activeAccountEmail,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to send');
      }
      toast.success('Reply sent');
      onClose();
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!body.trim()) return;
    try {
      await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'draft',
          threadId: thread.id,
          to: replyTo,
          subject: thread.subject,
          body,
          inReplyTo: replyMessageId,
          references: replyReferences,
          account: activeAccountEmail,
        }),
      });
      toast.success('Draft saved');
    } catch {
      toast.error('Failed to save draft');
    }
  };

  const handleImprove = async () => {
    if (!body.trim()) return;
    setImproving(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'improve', text: body, instruction: 'Improve clarity and tone' }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (!data.text) throw new Error('No improved text returned');
      setBody(data.text);
      toast.success('Text improved');
    } catch {
      toast.error('Failed to improve text');
    } finally {
      setImproving(false);
    }
  };

  return (
    <div className="border-t border-border-subtle bg-bg-secondary px-4 py-3 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted">
          Replying to <span className="text-text-secondary">{replyTo}</span>
        </span>
        <button onClick={onClose} className="rounded p-1 text-text-muted hover:text-text-primary">
          <X className="h-4 w-4" />
        </button>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your reply..."
        rows={6}
        autoFocus
        className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none resize-none"
      />

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleImprove}
            disabled={improving || !body.trim()}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-accent-purple hover:bg-accent-purple/10 transition disabled:opacity-50"
          >
            {improving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
            Improve
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={!body.trim()}
            className="rounded-lg px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-hover transition disabled:opacity-50"
          >
            Save draft
          </button>
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-blue/90 transition disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send
        </button>
      </div>
    </div>
  );
}
