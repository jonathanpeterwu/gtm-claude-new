'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/common/Sidebar';
import { EventModal } from '@/components/calendar/EventModal';
import { CalendarEvent } from '@/types';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
  addWeeks,
  subWeeks,
  differenceInMinutes,
} from 'date-fns';
import { useInboxStore } from '@/lib/store';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  RefreshCw,
  Calendar,
  Video,
  MapPin,
  Clock,
  Pencil,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

type ViewMode = 'month' | 'week';

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const setSidebarOpen = useInboxStore((s) => s.setSidebarOpen);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/');
  }, [status, router]);

  useEffect(() => {
    if ((session as any)?.error === 'RefreshAccessTokenError') {
      signIn('google');
    }
  }, [session]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      let timeMin: string;
      let timeMax: string;

      if (viewMode === 'month') {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        timeMin = startOfWeek(monthStart).toISOString();
        timeMax = endOfWeek(monthEnd).toISOString();
      } else {
        timeMin = startOfWeek(currentDate).toISOString();
        timeMax = endOfWeek(currentDate).toISOString();
      }

      const params = new URLSearchParams({
        action: 'upcoming',
        timeMin,
        timeMax,
        maxResults: '100',
      });

      const res = await fetch(`/api/calendar?${params}`);
      if (!res.ok) throw new Error('Failed to fetch calendar');
      const data = await res.json();
      setEvents(data.events || []);
    } catch {
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    if (session) fetchEvents();
  }, [session, fetchEvents]);

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: Date) => {
    const dayEvents = events.filter((e) => {
      const eventDate = parseISO(e.start);
      return isSameDay(eventDate, day) || (e.isAllDay && isSameDay(parseISO(e.start), day));
    });
    setSelectedDate(day);
    setSelectedDayEvents(dayEvents);
  };

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
    setSelectedDayEvents(null);
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="animate-pulse-subtle text-accent-blue">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  // Build calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(viewMode === 'month' ? monthStart : currentDate);
  const calendarEnd = endOfWeek(viewMode === 'month' ? monthEnd : currentDate);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getEventsForDay = (day: Date) =>
    events.filter((e) => {
      try {
        return isSameDay(parseISO(e.start), day);
      } catch {
        return false;
      }
    });

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle bg-bg-secondary px-3 md:px-6 py-3 md:py-4 gap-2">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden rounded-lg p-1.5 text-text-secondary hover:bg-bg-hover flex-shrink-0">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-sm md:text-lg font-semibold truncate">
              {viewMode === 'month'
                ? format(currentDate, 'MMMM yyyy')
                : `Week of ${format(calendarStart, 'MMM d')} - ${format(calendarEnd, 'MMM d, yyyy')}`}
            </h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate('prev')}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToToday}
                className="rounded-lg px-3 py-1 text-xs font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary transition"
              >
                Today
              </button>
              <button
                onClick={() => navigate('next')}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border-subtle bg-bg-primary p-0.5">
              <button
                onClick={() => setViewMode('month')}
                className={clsx(
                  'rounded px-3 py-1 text-xs font-medium transition',
                  viewMode === 'month'
                    ? 'bg-accent-blue text-white'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={clsx(
                  'rounded px-3 py-1 text-xs font-medium transition',
                  viewMode === 'week'
                    ? 'bg-accent-blue text-white'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                Week
              </button>
            </div>
            <button
              onClick={fetchEvents}
              disabled={loading}
              className="rounded-lg p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={handleCreateEvent}
              className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-2 md:px-3 py-2 text-xs font-medium text-white hover:bg-accent-blue/90 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Event</span>
            </button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col overflow-hidden">
            {loading && events.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
              </div>
            ) : (
              <>
                {/* Weekday headers */}
                <div className="grid grid-cols-7 border-b border-border-subtle bg-bg-secondary">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="px-1 md:px-2 py-2 text-center text-2xs md:text-xs font-medium text-text-muted"
                    >
                      <span className="md:hidden">{day[0]}</span>
                      <span className="hidden md:inline">{day}</span>
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
                  {days.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);

                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => handleDayClick(day)}
                        className={clsx(
                          'min-h-[60px] md:min-h-[100px] border-b border-r border-border-subtle p-1 md:p-1.5 cursor-pointer transition hover:bg-bg-hover',
                          !isCurrentMonth && 'bg-bg-secondary/50',
                          isSelected && 'bg-accent-blue/5 ring-1 ring-inset ring-accent-blue/20'
                        )}
                      >
                        <div
                          className={clsx(
                            'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                            isToday(day)
                              ? 'bg-accent-blue text-white font-medium'
                              : isCurrentMonth
                              ? 'text-text-primary'
                              : 'text-text-muted'
                          )}
                        >
                          {format(day, 'd')}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEvent(event);
                              }}
                              className={clsx(
                                'truncate rounded px-1.5 py-0.5 text-2xs cursor-pointer transition',
                                event.isAllDay
                                  ? 'bg-accent-purple/15 text-accent-purple font-medium'
                                  : 'bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20'
                              )}
                              title={event.summary}
                            >
                              {!event.isAllDay && (
                                <span className="text-text-muted mr-0.5">
                                  {format(parseISO(event.start), 'h:mma').toLowerCase()}
                                </span>
                              )}
                              {event.summary}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="px-1.5 text-2xs text-text-muted">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Day detail — sidebar on desktop, bottom sheet on mobile */}
          {selectedDayEvents !== null && selectedDate && (
            <>
              {/* Mobile backdrop */}
              <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => { setSelectedDayEvents(null); setSelectedDate(null); }} />
              <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] rounded-t-2xl border-t border-border-subtle bg-bg-secondary overflow-y-auto safe-bottom md:static md:inset-auto md:z-auto md:max-h-none md:rounded-none md:border-t-0 md:border-l md:w-80 md:flex-shrink-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                <div>
                  <div className="text-sm font-medium">{format(selectedDate, 'EEEE')}</div>
                  <div className="text-xs text-text-muted">{format(selectedDate, 'MMMM d, yyyy')}</div>
                </div>
                <button
                  onClick={() => {
                    setSelectedDayEvents(null);
                    setSelectedDate(null);
                  }}
                  className="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary transition"
                >
                  <X className="h-4 w-4 md:hidden" />
                  <ChevronRight className="h-4 w-4 hidden md:block" />
                </button>
              </div>

              <div className="p-3 space-y-2">
                {selectedDayEvents.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-text-muted">No events this day</p>
                ) : (
                  selectedDayEvents.map((event) => {
                    const joinLink = event.meetLink || event.hangoutLink;
                    return (
                      <div
                        key={event.id}
                        className="group rounded-lg border border-border-subtle bg-bg-primary p-3 hover:border-accent-blue/30 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-medium text-text-primary">{event.summary}</h3>
                          <button
                            onClick={() => handleEditEvent(event)}
                            className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-text-muted hover:text-text-primary transition"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="mt-1.5 space-y-1">
                          <div className="flex items-center gap-1.5 text-2xs text-text-secondary">
                            <Clock className="h-3 w-3 text-text-muted" />
                            {event.isAllDay
                              ? 'All day'
                              : `${format(parseISO(event.start), 'h:mm a')} - ${format(parseISO(event.end), 'h:mm a')}`}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1.5 text-2xs text-text-secondary">
                              <MapPin className="h-3 w-3 text-text-muted" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                          {joinLink && (
                            <a
                              href={joinLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-2xs text-accent-blue hover:text-accent-blue/80 transition"
                            >
                              <Video className="h-3 w-3" />
                              Join meeting
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="mt-2 text-2xs text-text-muted">
                            {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            </>
          )}
        </div>
      </div>

      {showEventModal && (
        <EventModal
          event={editingEvent}
          onClose={() => setShowEventModal(false)}
          onSaved={handleEventSaved}
        />
      )}
    </div>
  );
}
