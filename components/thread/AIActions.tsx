'use client';

import { useState, memo, useCallback } from 'react';
import { Thread, DraftTone, GTMTask } from '@/types';
import { Brain, FileText, CheckSquare, Wand2, Loader2, Search } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useInboxStore } from '@/lib/store';

interface ExtractedTask {
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  threadId?: string;
}

interface AIActionsProps {
  thread: Thread;
  userEmail?: string;
  onDraftGenerated: () => void;
  summary: string | null;
  onSummarize: () => void;
}

const TONES: { value: DraftTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
];

export const AIActions = memo(function AIActions({ thread, userEmail, onDraftGenerated, summary, onSummarize }: AIActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<DraftTone>('professional');
  const [draft, setDraft] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ExtractedTask[] | null>(null);
  const addTask = useInboxStore((s) => s.addTask);

  const handleDraft = async () => {
    setLoading('draft');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft', thread, tone: selectedTone, userEmail }),
      });
      const data = await res.json();
      setDraft(data.content);
      toast.success('Draft generated');
    } catch {
      toast.error('Failed to generate draft');
    } finally {
      setLoading(null);
    }
  };

  const handleResearchDraft = async () => {
    setLoading('research');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'research-draft', thread, userEmail }),
      });
      const data = await res.json();
      setDraft(data.content);
      toast.success('Research draft generated');
    } catch {
      toast.error('Failed to generate research draft');
    } finally {
      setLoading(null);
    }
  };

  const handleExtractTasks = async () => {
    setLoading('tasks');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract-tasks', thread }),
      });
      const data = await res.json();
      const extractedTasks: ExtractedTask[] = Array.isArray(data.tasks) ? data.tasks : [];
      setTasks(extractedTasks);

      const lastMsg = thread.messages[thread.messages.length - 1];
      const now = new Date().toISOString();
      for (const task of extractedTasks) {
        const gtmTask: GTMTask = {
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          threadId: thread.id,
          title: task.title,
          description: task.description || '',
          status: 'todo',
          priority: task.priority || 'medium',
          dueDate: task.dueDate || undefined,
          contact: lastMsg?.from || { name: '', email: '' },
          createdAt: now,
          updatedAt: now,
        };
        addTask(gtmTask);
      }

      toast.success(`${extractedTasks.length} task${extractedTasks.length !== 1 ? 's' : ''} extracted and added`);
    } catch {
      toast.error('Failed to extract tasks');
    } finally {
      setLoading(null);
    }
  };

  const handleSummarize = async () => {
    setLoading('summarize');
    await onSummarize();
    setLoading(null);
  };

  return (
    <div className="border-b border-border-subtle bg-accent-purple/5 px-4 py-3 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-accent-purple" />
        <span className="text-sm font-medium text-accent-purple">AI Actions</span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-1 rounded-lg border border-border-subtle bg-bg-primary p-1">
          {TONES.map((tone) => (
            <button
              key={tone.value}
              onClick={() => setSelectedTone(tone.value)}
              className={clsx(
                'rounded px-2 py-1 text-xs transition',
                selectedTone === tone.value
                  ? 'bg-accent-blue text-white'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              {tone.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleDraft}
          disabled={loading !== null}
          className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-blue/90 transition disabled:opacity-50"
        >
          {loading === 'draft' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
          Draft Reply
        </button>

        <button
          onClick={handleResearchDraft}
          disabled={loading !== null}
          className="flex items-center gap-1.5 rounded-lg bg-accent-purple px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-purple/90 transition disabled:opacity-50"
        >
          {loading === 'research' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
          Research & Draft
        </button>

        <button
          onClick={handleSummarize}
          disabled={loading !== null}
          className="flex items-center gap-1.5 rounded-lg bg-bg-tertiary px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition disabled:opacity-50"
        >
          {loading === 'summarize' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
          Summarize
        </button>

        <button
          onClick={handleExtractTasks}
          disabled={loading !== null}
          className="flex items-center gap-1.5 rounded-lg bg-bg-tertiary px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition disabled:opacity-50"
        >
          {loading === 'tasks' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckSquare className="h-3 w-3" />}
          Extract Tasks
        </button>
      </div>

      {/* Results */}
      {summary && (
        <div className="mb-3 rounded-lg border border-accent-purple/20 bg-bg-primary p-3">
          <div className="text-xs font-medium text-accent-purple mb-1">Summary</div>
          <p className="text-sm text-text-secondary">{summary}</p>
        </div>
      )}

      {draft && (
        <div className="mb-3 rounded-lg border border-accent-blue/20 bg-bg-primary p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-accent-blue">AI Draft</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(draft);
                toast.success('Copied to clipboard');
              }}
              className="text-2xs text-text-muted hover:text-text-primary"
            >
              Copy
            </button>
          </div>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">{draft}</p>
        </div>
      )}

      {tasks && tasks.length > 0 && (
        <div className="rounded-lg border border-accent-green/20 bg-bg-primary p-3">
          <div className="text-xs font-medium text-accent-green mb-2">Extracted Tasks</div>
          <ul className="space-y-1.5">
            {tasks.map((task, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={clsx(
                    'mt-0.5 rounded px-1.5 py-0.5 text-2xs font-medium',
                    task.priority === 'high' ? 'bg-accent-red/20 text-accent-red' :
                    task.priority === 'medium' ? 'bg-accent-yellow/20 text-accent-yellow' :
                    'bg-bg-tertiary text-text-muted'
                  )}
                >
                  {task.priority}
                </span>
                <span className="text-text-secondary">{task.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});
