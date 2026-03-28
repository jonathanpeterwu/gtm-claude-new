'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useInboxStore } from '@/lib/store';
import { Sidebar } from '@/components/common/Sidebar';
import { GTMTask } from '@/types';
import {
  CheckCircle2, Circle, Clock, Plus, Trash2, Menu,
  ChevronDown, Calendar as CalendarIcon, Flag, Mail,
} from 'lucide-react';
import clsx from 'clsx';

const STATUS_OPTIONS: { value: GTMTask['status']; label: string; icon: typeof Circle; color: string }[] = [
  { value: 'todo', label: 'To Do', icon: Circle, color: 'text-text-muted' },
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-accent-blue' },
  { value: 'waiting', label: 'Waiting', icon: Clock, color: 'text-accent-yellow' },
  { value: 'done', label: 'Done', icon: CheckCircle2, color: 'text-accent-green' },
];

const PRIORITY_OPTIONS: { value: GTMTask['priority']; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'text-accent-red' },
  { value: 'medium', label: 'Medium', color: 'text-accent-yellow' },
  { value: 'low', label: 'Low', color: 'text-text-muted' },
];

type FilterStatus = GTMTask['status'] | 'all';

export default function TasksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const tasks = useInboxStore((s) => s.tasks);
  const addTask = useInboxStore((s) => s.addTask);
  const updateTask = useInboxStore((s) => s.updateTask);
  const removeTask = useInboxStore((s) => s.removeTask);
  const setSidebarOpen = useInboxStore((s) => s.setSidebarOpen);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<GTMTask['priority']>('medium');
  const [newDueDate, setNewDueDate] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/');
  }, [status, router]);

  const filtered = useMemo(() => {
    const list = filterStatus === 'all' ? tasks : tasks.filter((t) => t.status === filterStatus);
    return list.slice().sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      const prio = { high: 0, medium: 1, low: 2 };
      return prio[a.priority] - prio[b.priority];
    });
  }, [tasks, filterStatus]);

  const counts = useMemo(() => {
    const c = { all: tasks.length, todo: 0, in_progress: 0, waiting: 0, done: 0 };
    for (const t of tasks) c[t.status]++;
    return c;
  }, [tasks]);

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    const now = new Date().toISOString();
    addTask({
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: newTitle.trim(),
      description: newDescription.trim(),
      status: 'todo',
      priority: newPriority,
      dueDate: newDueDate || undefined,
      createdAt: now,
      updatedAt: now,
    });
    setNewTitle('');
    setNewDescription('');
    setNewPriority('medium');
    setNewDueDate('');
    setShowAddForm(false);
  };

  const cycleStatus = (task: GTMTask) => {
    const statuses: GTMTask['status'][] = ['todo', 'in_progress', 'waiting', 'done'];
    const next = statuses[(statuses.indexOf(task.status) + 1) % statuses.length];
    updateTask(task.id, { status: next, updatedAt: new Date().toISOString() });
  };

  const cyclePriority = (task: GTMTask) => {
    const priorities: GTMTask['priority'][] = ['low', 'medium', 'high'];
    const next = priorities[(priorities.indexOf(task.priority) + 1) % priorities.length];
    updateTask(task.id, { priority: next, updatedAt: new Date().toISOString() });
  };

  if (!session) return null;

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-border-subtle bg-bg-secondary px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden rounded-lg p-1.5 text-text-secondary hover:bg-bg-hover">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">Tasks</h1>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-blue/90 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="border-b border-border-subtle bg-bg-secondary px-4 md:px-6 flex gap-1 overflow-x-auto">
          {([['all', 'All'], ['todo', 'To Do'], ['in_progress', 'In Progress'], ['waiting', 'Waiting'], ['done', 'Done']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterStatus(val)}
              className={clsx(
                'px-3 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap',
                filterStatus === val
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              )}
            >
              {label}
              <span className="ml-1.5 rounded-full bg-bg-tertiary px-1.5 py-0.5 text-2xs">{counts[val]}</span>
            </button>
          ))}
        </div>

        {/* Add task form */}
        {showAddForm && (
          <div className="border-b border-border-subtle bg-bg-secondary p-4 md:px-6">
            <div className="space-y-3 max-w-2xl">
              <input
                autoFocus
                type="text"
                placeholder="Task title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm outline-none focus:border-accent-blue"
              />
              <textarea
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm outline-none focus:border-accent-blue resize-none"
              />
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5 text-text-muted" />
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as GTMTask['priority'])}
                    className="rounded border border-border-subtle bg-bg-primary px-2 py-1 text-xs outline-none"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-text-muted" />
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="rounded border border-border-subtle bg-bg-primary px-2 py-1 text-xs outline-none"
                  />
                </div>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTask}
                    disabled={!newTitle.trim()}
                    className="rounded-lg bg-accent-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-blue/90 transition disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-text-muted">
              <CheckCircle2 className="mb-3 h-10 w-10" />
              <p className="text-sm">{filterStatus === 'all' ? 'No tasks yet' : 'No tasks in this status'}</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-3 flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Create a task
              </button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-2 md:py-4">
              {filtered.map((task) => {
                const statusConf = STATUS_OPTIONS.find((s) => s.value === task.status)!;
                const prioConf = PRIORITY_OPTIONS.find((p) => p.value === task.priority)!;
                const StatusIcon = statusConf.icon;
                const isFromEmail = !!task.threadId;

                return (
                  <div
                    key={task.id}
                    className={clsx(
                      'group flex items-start gap-3 border-b border-border-subtle px-4 md:px-6 py-3 hover:bg-bg-hover/50 transition',
                      task.status === 'done' && 'opacity-60'
                    )}
                  >
                    {/* Status toggle */}
                    <button
                      onClick={() => cycleStatus(task)}
                      className={clsx('mt-0.5 flex-shrink-0 transition', statusConf.color)}
                      title={`Status: ${statusConf.label} (click to cycle)`}
                    >
                      <StatusIcon className="h-5 w-5" />
                    </button>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className={clsx('text-sm', task.status === 'done' ? 'line-through text-text-muted' : 'text-text-primary')}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => removeTask(task.id)}
                            className="rounded p-1 text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition"
                            title="Delete task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {task.description && (
                        <p className="mt-0.5 text-xs text-text-muted line-clamp-1">{task.description}</p>
                      )}

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-2xs">
                        {/* Priority badge */}
                        <button
                          onClick={() => cyclePriority(task)}
                          className={clsx('flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-bg-tertiary transition', prioConf.color)}
                          title={`Priority: ${prioConf.label} (click to cycle)`}
                        >
                          <Flag className="h-3 w-3" />
                          {prioConf.label}
                        </button>

                        {/* Due date */}
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-text-muted">
                            <CalendarIcon className="h-3 w-3" />
                            {task.dueDate}
                          </span>
                        )}

                        {/* Email origin indicator */}
                        {isFromEmail && (
                          <span className="flex items-center gap-1 text-text-muted" title="Extracted from email">
                            <Mail className="h-3 w-3" />
                            {task.contact?.name || task.contact?.email || 'Email'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
