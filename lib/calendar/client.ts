import { google, calendar_v3 } from 'googleapis';
import { CalendarEvent, CalendarAttendee, CreateEventInput, UpdateEventInput } from '@/types';

export function getCalendarClient(accessToken: string): calendar_v3.Calendar {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth });
}

export async function listUpcomingEvents(
  accessToken: string,
  maxResults: number = 10,
  timeMinOverride?: string,
  timeMaxOverride?: string
): Promise<CalendarEvent[]> {
  const calendar = getCalendarClient(accessToken);
  const now = new Date();
  const timeMin = timeMinOverride || now.toISOString();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const timeMax = timeMaxOverride || endOfDay.toISOString();

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (res.data.items || [])
    .filter((e) => e.status !== 'cancelled')
    .map(parseCalendarEvent);
}

export async function listTodayAndTomorrowEvents(
  accessToken: string
): Promise<{ today: CalendarEvent[]; tomorrow: CalendarEvent[] }> {
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const tomorrowStart = new Date(todayEnd);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const [today, tomorrow] = await Promise.all([
    listUpcomingEvents(accessToken, 20, todayStart.toISOString(), todayEnd.toISOString()),
    listUpcomingEvents(accessToken, 10, tomorrowStart.toISOString(), tomorrowEnd.toISOString()),
  ]);

  return { today, tomorrow };
}

export async function createEvent(
  accessToken: string,
  input: CreateEventInput
): Promise<CalendarEvent> {
  const calendar = getCalendarClient(accessToken);

  const requestBody: calendar_v3.Schema$Event = {
    summary: input.summary,
    description: input.description,
    location: input.location,
    start: input.isAllDay
      ? { date: input.start }
      : { dateTime: input.start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: input.isAllDay
      ? { date: input.end }
      : { dateTime: input.end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    attendees: input.attendees?.map((email) => ({ email })),
  };

  if (input.addMeet) {
    requestBody.conferenceData = {
      createRequest: {
        requestId: `superuser-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  }

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody,
    conferenceDataVersion: input.addMeet ? 1 : 0,
    sendUpdates: input.attendees?.length ? 'all' : 'none',
  });

  return parseCalendarEvent(res.data);
}

export async function updateEvent(
  accessToken: string,
  input: UpdateEventInput
): Promise<CalendarEvent> {
  const calendar = getCalendarClient(accessToken);

  // Fetch existing event first to merge
  const existing = await calendar.events.get({
    calendarId: 'primary',
    eventId: input.id,
  });

  const requestBody: calendar_v3.Schema$Event = { ...existing.data };

  if (input.summary !== undefined) requestBody.summary = input.summary;
  if (input.description !== undefined) requestBody.description = input.description;
  if (input.location !== undefined) requestBody.location = input.location;
  if (input.start !== undefined) {
    requestBody.start = input.isAllDay
      ? { date: input.start }
      : { dateTime: input.start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  }
  if (input.end !== undefined) {
    requestBody.end = input.isAllDay
      ? { date: input.end }
      : { dateTime: input.end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  }
  if (input.attendees !== undefined) {
    requestBody.attendees = input.attendees.map((email) => ({ email }));
  }

  const res = await calendar.events.update({
    calendarId: 'primary',
    eventId: input.id,
    requestBody,
    sendUpdates: 'all',
  });

  return parseCalendarEvent(res.data);
}

export async function deleteEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const calendar = getCalendarClient(accessToken);
  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
  });
}

function parseCalendarEvent(event: calendar_v3.Schema$Event): CalendarEvent {
  const isAllDay = !!event.start?.date && !event.start?.dateTime;

  return {
    id: event.id!,
    summary: event.summary || '(No title)',
    description: event.description || undefined,
    location: event.location || undefined,
    start: isAllDay ? event.start!.date! : event.start?.dateTime || '',
    end: isAllDay ? event.end!.date! : event.end?.dateTime || '',
    isAllDay,
    meetLink: event.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video'
    )?.uri || undefined,
    hangoutLink: event.hangoutLink || undefined,
    htmlLink: event.htmlLink || undefined,
    status: (event.status as CalendarEvent['status']) || 'confirmed',
    attendees: event.attendees?.map(parseAttendee),
    organizer: event.organizer
      ? { name: event.organizer.displayName || undefined, email: event.organizer.email || '' }
      : undefined,
    colorId: event.colorId || undefined,
  };
}

function parseAttendee(a: calendar_v3.Schema$EventAttendee): CalendarAttendee {
  return {
    name: a.displayName || undefined,
    email: a.email || '',
    responseStatus: (a.responseStatus as CalendarAttendee['responseStatus']) || 'needsAction',
    self: a.self || undefined,
  };
}
