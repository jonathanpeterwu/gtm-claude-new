'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useInboxStore } from '@/lib/store';
import { Sidebar } from '@/components/common/Sidebar';
import { GTMTask } from '@/types';
import { CheckCircle, Circle, Clock, ArrowUpCircle, MinusCircle, Menu } from 'lucide-react';
import clsx from 'clsx';

const STATUS_CONFIG = {
  todo: { label: 'To Do', icon: Circle, color: 'text-text-muted' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-accent-blue' },
  waiting: { label: 'Waiting', icon: Clock, color: 'text-accent-yellow' },
  done: { label: 'Done', icon: CheckCircle, color: 'text-accent-green' },
};

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'text-accent-red bg-accent-red/10' },
  medium: { label: 'Medium', color: 'text-accent-yellow bg-accent-yellow/10' },
  low: { label: 'Low', color: 'text-text-muted bg-bg-tertiary' },
};

export default function TasksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const tasks = useInboxStore((s) => s.tasks);
  const updateTask = useInboxStore((s) => s.updateTask);
  const setSidebarOpen = useInboxStore((s) => s.setSidebarOpen);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/');
  }, [status, router]);

  if (!session) return null;

  const columns: { status: GTMTask['status']; tasks: GTMTask[] }[] = [
    { status: 'todo', tasks: tasks.filter((t) => t.status === 'todo') },
    { status: 'in_progress', tasks: tasks.filter((t) => t.status === 'in_progress') },
    { status: 'waiting', tasks: tasks.filter((t) => t.status === 'waiting') },
    { status: 'done', tasks: tasks.filter((t) => t.status === 'done') },
  ];

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0">
        <div className="border-b border-border-subtle bg-bg-secondary px-4 md:px-6 py-3 md:py-4 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden rounded-lg p-1.5 text-text-secondary hover:bg-bg-hover">
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">GTM Tasks</h1>
            <p className="text-sm text-text-muted mt-0.5 hidden sm:block">Tasks extracted from your email threads</p>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto p-3 md:p-6">
          {tasks.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-text-muted">
              <CheckCircle className="mb-3 h-10 w-10" />
              <p className="text-sm">No tasks yet</p>
              <p className="mt-1 text-xs">Open an email and use AI to extract tasks</p>
            </div>
          ) : (
            <div className="flex md:flex-row flex-col gap-4 h-full">
              {columns.map(({ status: colStatus, tasks: colTasks }) => {
                const config = STATUS_CONFIG[colStatus];
                const Icon = config.icon;
                return (
                  <div key={colStatus} className="md:w-72 md:flex-shrink-0 w-full">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Icon className={clsx('h-4 w-4', config.color)} />
                      <span className="text-sm font-medium">{config.label}</span>
                      <span className="rounded-full bg-bg-tertiary px-2 py-0.5 text-2xs text-text-muted">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {colTasks.map((task) => {
                        const pConfig = PRIORITY_CONFIG[task.priority];
                        return (
                          <div
                            key={task.id}
                            onClick={() => {
                              const statuses: GTMTask['status'][] = ['todo', 'in_progress', 'waiting', 'done'];
                              const nextIdx = (statuses.indexOf(task.status) + 1) % statuses.length;
                              updateTask(task.id, { status: statuses[nextIdx], updatedAt: new Date().toISOString() });
                            }}
                            className="rounded-lg border border-border-subtle bg-bg-secondary p-3 hover:border-accent-blue/30 transition cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-medium">{task.title}</h3>
                              <span className={clsx('rounded px-1.5 py-0.5 text-2xs font-medium flex-shrink-0', pConfig.color)}>
                                {pConfig.label}
                              </span>
                            </div>
                            {task.description && (
                              <p className="mt-1 text-xs text-text-muted line-clamp-2">{task.description}</p>
                            )}
                            <div className="mt-2 flex items-center gap-2 text-2xs text-text-muted">
                              <span>{task.contact.name || task.contact.email}</span>
                              {task.dueDate && <span>Due {task.dueDate}</span>}
                            </div>
                          </div>
                        );
                      })}
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
