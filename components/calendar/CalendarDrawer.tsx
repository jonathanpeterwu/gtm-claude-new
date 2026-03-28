'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useInboxStore } from '@/lib/store';
import { UpcomingMeetings } from './UpcomingMeetings';
import { X, Calendar } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

export function CalendarDrawer() {
  const { data: session } = useSession();
  const calendarOpen = useInboxStore((s) => s.calendarOpen);
  const setCalendarOpen = useInboxStore((s) => s.setCalendarOpen);

  useEffect(() => {
    if (!calendarOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCalendarOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [calendarOpen, setCalendarOpen]);

  if (!session) return null;

  return (
    <>
      {/* Backdrop */}
      {calendarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:bg-transparent"
          onClick={() => setCalendarOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={clsx(
          'fixed inset-y-0 right-0 z-50 flex w-80 max-w-[90vw] flex-col border-l border-border-subtle bg-bg-secondary shadow-2xl transition-transform duration-200',
          calendarOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent-blue" />
            <span className="text-sm font-semibold">Calendar</span>
          </div>
          <button
            onClick={() => setCalendarOpen(false)}
            className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary transition"
            aria-label="Close calendar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Calendar content */}
        <div className="flex-1 overflow-y-auto">
          <UpcomingMeetings />
        </div>

        {/* Footer link to full calendar */}
        <div className="border-t border-border-subtle p-3">
          <Link
            href="/calendar"
            onClick={() => setCalendarOpen(false)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary transition"
          >
            <Calendar className="h-3.5 w-3.5" />
            Open full calendar
          </Link>
        </div>
      </div>
    </>
  );
}
