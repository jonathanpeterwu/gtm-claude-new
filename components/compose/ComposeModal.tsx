'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Loader2, Wand2 } from 'lucide-react';
import { useInboxStore } from '@/lib/store';
import { EmailAddress } from '@/types';
import toast from 'react-hot-toast';

export function ComposeModal() {
  const setComposing = useInboxStore((s) => s.setComposing);
  const activeAccountEmail = useInboxStore((s) => s.activeAccountEmail);
  const threads = useInboxStore((s) => s.threads);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState<EmailAddress[]>([]);
  const [suggestions, setSuggestions] = useState<EmailAddress[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Extract contacts from loaded threads + fetch from API
  useEffect(() => {
    const contactMap = new Map<string, EmailAddress>();

    // Extract from loaded threads
    for (const thread of threads) {
      for (const msg of thread.messages) {
        if (msg.from.email) contactMap.set(msg.from.email, msg.from);
        for (const addr of msg.to) {
          if (addr.email) contactMap.set(addr.email, addr);
        }
        for (const addr of msg.cc) {
          if (addr.email) contactMap.set(addr.email, addr);
        }
      }
    }

    // Remove own email from suggestions
    if (activeAccountEmail) contactMap.delete(activeAccountEmail);

    setContacts(Array.from(contactMap.values()).sort((a, b) => a.email.localeCompare(b.email)));

    // Also fetch from sent messages for more complete list
    const accountParam = activeAccountEmail ? `&account=${encodeURIComponent(activeAccountEmail)}` : '';
    fetch(`/api/gmail?action=contacts${accountParam}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.contacts) {
          for (const c of data.contacts) {
            if (c.email && c.email !== activeAccountEmail) {
              contactMap.set(c.email, c);
            }
          }
          setContacts(Array.from(contactMap.values()).sort((a, b) => a.email.localeCompare(b.email)));
        }
      })
      .catch(() => {}); // silently fail - local contacts still work
  }, [threads, activeAccountEmail]);

  // Filter suggestions based on input
  const updateSuggestions = useCallback((value: string) => {
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const query = value.toLowerCase();
    const filtered = contacts.filter(
      (c) => c.email.toLowerCase().includes(query) || c.name.toLowerCase().includes(query)
    ).slice(0, 8);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedSuggestionIndex(0);
  }, [contacts]);

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTo(value);
    updateSuggestions(value);
  };

  const selectSuggestion = (contact: EmailAddress) => {
    setTo(contact.email);
    setShowSuggestions(false);
    // Focus next field
    const subjectInput = document.querySelector<HTMLInputElement>('input[placeholder="Subject"]');
    subjectInput?.focus();
  };

  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectSuggestion(suggestions[selectedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to send');
      }
      toast.success('Email sent');
      setComposing(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email');
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
    <div className="fixed inset-0 z-50 flex items-end justify-end p-0 md:p-6 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-lg rounded-none md:rounded-xl border border-border-subtle bg-bg-secondary shadow-2xl animate-slide-in max-md:h-full max-md:flex max-md:flex-col safe-top safe-bottom">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h3 className="text-sm font-medium">New Message</h3>
          <button onClick={() => setComposing(false)} className="rounded p-1 text-text-muted hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-4 py-2 space-y-0">
          <div className="relative">
            <input
              ref={inputRef}
              type="email"
              value={to}
              onChange={handleToChange}
              onKeyDown={handleToKeyDown}
              onFocus={() => { if (to.trim()) updateSuggestions(to); }}
              placeholder="To"
              autoFocus
              autoComplete="off"
              className="w-full border-b border-border-subtle bg-transparent py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border-subtle bg-bg-secondary shadow-lg"
              >
                {suggestions.map((contact, index) => (
                  <button
                    key={contact.email}
                    type="button"
                    onClick={() => selectSuggestion(contact)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                      index === selectedSuggestionIndex
                        ? 'bg-accent-blue/10 text-text-primary'
                        : 'text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-blue/20 text-xs font-medium text-accent-blue shrink-0">
                      {(contact.name || contact.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      {contact.name && contact.name !== contact.email.split('@')[0] && (
                        <div className="truncate text-sm font-medium text-text-primary">{contact.name}</div>
                      )}
                      <div className="truncate text-xs text-text-muted">{contact.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full border-b border-border-subtle bg-transparent py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </div>

        {/* Body */}
        <div className="px-4 py-2 flex-1 max-md:overflow-y-auto">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={10}
            className="w-full h-full min-h-[200px] bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
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
