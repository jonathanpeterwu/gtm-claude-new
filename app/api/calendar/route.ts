import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenForAccount } from '@/lib/account-token';
import { listUpcomingEvents, listTodayAndTomorrowEvents, createEvent, updateEvent, deleteEvent } from '@/lib/calendar/client';

function calendarErrorStatus(error: any): number {
  const raw = error?.code || error?.status;
  const status = typeof raw === 'number' ? raw : parseInt(raw, 10);
  return Number.isFinite(status) && status >= 400 && status < 600 ? status : 500;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const account = searchParams.get('account');
  const token = await getAccessTokenForAccount(req, account);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const action = searchParams.get('action');

  try {
    if (action === 'upcoming') {
      const timeMin = searchParams.get('timeMin') || undefined;
      const timeMax = searchParams.get('timeMax') || undefined;
      const rawMax = parseInt(searchParams.get('maxResults') || '10', 10);
      const maxResults = Number.isFinite(rawMax) ? Math.min(Math.max(rawMax, 1), 250) : 10;
      const events = await listUpcomingEvents(token, maxResults, timeMin, timeMax);
      return NextResponse.json({ events });
    }

    if (action === 'today-tomorrow') {
      const result = await listTodayAndTomorrowEvents(token);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    const status = calendarErrorStatus(error);
    const message = error?.message || 'Unknown Calendar error';
    console.error('Calendar API error:', { status, message, action });
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = await getAccessTokenForAccount(req, body.account);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action } = body;

  try {
    if (action === 'create') {
      if (!body.event || typeof body.event !== 'object' || !body.event.summary || !body.event.start || !body.event.end) {
        return NextResponse.json({ error: 'Missing required event fields (summary, start, end)' }, { status: 400 });
      }
      const event = await createEvent(token, body.event);
      return NextResponse.json({ success: true, event });
    }

    if (action === 'update') {
      if (!body.event || typeof body.event !== 'object' || !body.event.id) {
        return NextResponse.json({ error: 'Missing event id for update' }, { status: 400 });
      }
      const event = await updateEvent(token, body.event);
      return NextResponse.json({ success: true, event });
    }

    if (action === 'delete') {
      if (!body.eventId || typeof body.eventId !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid eventId' }, { status: 400 });
      }
      await deleteEvent(token, body.eventId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    const status = calendarErrorStatus(error);
    const message = error?.message || 'Unknown Calendar error';
    console.error('Calendar action error:', { status, message, action });
    return NextResponse.json({ error: message }, { status });
  }
}
