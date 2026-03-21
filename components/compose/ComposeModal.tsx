'use client';

import { useState } from 'react';
import { X, Send, Loader2, Wand2 } from 'lucide-react';
import { useInboxStore } from '@/lib/store';
import toast from 'react-hot-toast';

export function ComposeModal() {
  const setComposing = useInboxStore((s) => s.setComposing);
  const activeAccountEmail = useInboxStore((s) => s.activeAccountEmail);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!to.trim() || !body.trim()) {
      toast.error('Please fill in recipient and body');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          threadId: '',
          to,
          subject: subject || '(no subject)',
          body,
          account: activeAccountEmail,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Email sent');
      setComposing(false);
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleImprove = async () => {
    if (!body.trim()) return;
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'improve', text: body, instruction: 'Improve clarity and professionalism' }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (!data.text) throw new Error('No improved text returned');
      setBody(data.text);
      toast.success('Text improved');
    } catch {
      toast.error('Failed to improve');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-lg rounded-xl border border-border-subtle bg-bg-secondary shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h3 className="text-sm font-medium">New Message</h3>
          <button onClick={() => setComposing(false)} className="rounded p-1 text-text-muted hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-4 py-2 space-y-0">
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To"
            autoFocus
            className="w-full border-b border-border-subtle bg-transparent py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full border-b border-border-subtle bg-transparent py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </div>

        {/* Body */}
        <div className="px-4 py-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={10}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-border-subtle px-4 py-3">
          <button
            onClick={handleImprove}
            disabled={!body.trim()}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-accent-purple hover:bg-accent-purple/10 transition disabled:opacity-50"
          >
            <Wand2 className="h-3 w-3" />
            Improve with AI
          </button>

          <button
            onClick={handleSend}
            disabled={sending || !to.trim() || !body.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-blue/90 transition disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
