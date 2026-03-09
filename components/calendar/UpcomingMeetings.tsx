'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { CalendarEvent } from '@/types';
import { format, isAfter, parseISO, differenceInMinutes } from 'date-fns';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { EventModal } from './EventModal';

export function UpcomingMeetings() {
  const { data: session } = useSession();
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [tomorrowEvents, setTomorrowEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTomorrow, setShowTomorrow] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/calendar?action=today-tomorrow');
      if (!res.ok) throw new Error('Failed to fetch calendar');
      const data = await res.json();
      setTodayEvents(data.today || []);
      setTomorrowEvents(data.tomorrow || []);
      setError(null);
    } catch {
      setError('Calendar unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchEvents();
    const interval = setInterval(fetchEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session, fetchEvents]);

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleEventSaved = () => {
    fetchEvents();
  };

  if (!session) return null;

  const now = new Date();
  const upcomingToday = todayEvents.filter(
    (e) => !e.isAllDay && isAfter(parseISO(e.end), now)
  );
  const allDayToday = todayEvents.filter((e) => e.isAllDay);
  const nextMeeting = upcomingToday[0];

  return (
    <>
      <div className="border-b border-border-subtle">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text-secondary transition"
          >
            <Calendar className="h-3.5 w-3.5" />
            Today&apos;s Schedule
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={handleCreateEvent}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-medium text-accent-blue hover:bg-accent-blue/10 transition"
            title="Create event"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        {expanded && (
          <div className="px-3 pb-3">
            {loading ? (
              <div className="flex items-center gap-2 px-1 py-2 text-xs text-text-muted">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
                Loading calendar...
              </div>
            ) : error ? (
              <div className="px-1 py-2">
              <p className="text-xs text-text-muted">{error}</p>
              <button
                onClick={() => signIn('google')}
                className="mt-1.5 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-2xs font-medium text-accent-blue hover:bg-accent-blue/10 transition"
              >
                <RefreshCw className="h-3 w-3" />
                Reconnect with calendar permissions
              </button>
            </div>
            ) : upcomingToday.length === 0 && allDayToday.length === 0 ? (
              <p className="px-1 py-2 text-xs text-text-muted">No meetings today</p>
            ) : (
              <div className="space-y-1">
                {nextMeeting && <NextMeetingCard event={nextMeeting} onEdit={handleEditEvent} />}

                {allDayToday.map((event) => (
                  <EventRow key={event.id} event={event} onEdit={handleEditEvent} />
                ))}

                {upcomingToday.slice(1).map((event) => (
                  <EventRow key={event.id} event={event} onEdit={handleEditEvent} />
                ))}
              </div>
            )}

            {tomorrowEvents.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowTomorrow(!showTomorrow)}
                  className="flex w-full items-center gap-1 px-1 py-1 text-2xs text-text-muted hover:text-text-secondary transition"
                >
                  {showTomorrow ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  Tomorrow ({tomorrowEvents.length} event{tomorrowEvents.length !== 1 ? 's' : ''})
                </button>
                {showTomorrow && (
                  <div className="space-y-1 mt-1">
                    {tomorrowEvents.map((event) => (
                      <EventRow key={event.id} event={event} onEdit={handleEditEvent} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showEventModal && (
        <EventModal
          event={editingEvent}
          onClose={() => setShowEventModal(false)}
          onSaved={handleEventSaved}
        />
      )}
    </>
  );
}

function NextMeetingCard({ event, onEdit }: { event: CalendarEvent; onEdit: (e: CalendarEvent) => void }) {
  const now = new Date();
  const start = parseISO(event.start);
  const minutesUntil = differenceInMinutes(start, now);
  const isHappening = minutesUntil <= 0;
  const isSoon = minutesUntil > 0 && minutesUntil <= 15;
  const joinLink = event.meetLink || event.hangoutLink;

  return (
    <div
      className={clsx(
        'group rounded-lg border px-3 py-2.5 mb-1',
        isHappening
          ? 'border-accent-green/30 bg-accent-green/5'
          : isSoon
          ? 'border-accent-yellow/30 bg-accent-yellow/5'
          : 'border-accent-blue/20 bg-accent-blue/5'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-text-primary truncate">{event.summary}</p>
            <button
              onClick={() => onEdit(event)}
              className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-text-muted hover:text-text-primary hover:bg-bg-hover transition"
              title="Edit event"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-2xs text-text-secondary">
              <Clock className="h-3 w-3" />
              {formatTimeRange(event.start, event.end)}
            </span>
            {isHappening && (
              <span className="rounded-full bg-accent-green/20 px-1.5 py-0.5 text-2xs font-medium text-accent-green">
                Now
              </span>
            )}
            {isSoon && (
              <span className="rounded-full bg-accent-yellow/20 px-1.5 py-0.5 text-2xs font-medium text-accent-yellow">
                In {minutesUntil}m
              </span>
            )}
          </div>
          {event.location && (
            <span className="flex items-center gap-1 mt-1 text-2xs text-text-muted">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
        </div>

        {joinLink && (
          <a
            href={joinLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1 rounded-md bg-accent-blue px-2.5 py-1.5 text-2xs font-medium text-white hover:bg-accent-blue/90 transition"
          >
            <Video className="h-3 w-3" />
            Join
          </a>
        )}
      </div>

      {event.attendees && event.attendees.length > 0 && (
        <div className="flex items-center gap-1 mt-2 text-2xs text-text-muted">
          <Users className="h-3 w-3" />
          {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
          <span className="text-text-muted/60">
            ({event.attendees.filter((a) => a.responseStatus === 'accepted').length} accepted)
          </span>
        </div>
      )}
    </div>
  );
}

function EventRow({ event, onEdit }: { event: CalendarEvent; onEdit: (e: CalendarEvent) => void }) {
  const joinLink = event.meetLink || event.hangoutLink;

  return (
    <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-bg-hover transition">
      <div
        className={clsx(
          'h-2 w-2 flex-shrink-0 rounded-full',
          event.isAllDay ? 'bg-accent-purple' : 'bg-accent-blue'
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-secondary truncate">{event.summary}</p>
        <p className="text-2xs text-text-muted">
          {event.isAllDay ? 'All day' : formatTimeRange(event.start, event.end)}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={() => onEdit(event)}
          className="text-text-muted hover:text-text-primary transition"
          title="Edit event"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {joinLink && (
          <a
            href={joinLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue hover:text-accent-blue/80 transition"
            title="Join meeting"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function formatTimeRange(start: string, end: string): string {
  try {
    const s = parseISO(start);
    const e = parseISO(end);
    return `${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}`;
  } catch {
    return '';
  }
}
