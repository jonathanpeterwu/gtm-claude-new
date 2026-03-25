import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenForAccount } from '@/lib/account-token';
import { listUpcomingEvents, listTodayAndTomorrowEvents, createEvent, updateEvent, deleteEvent } from '@/lib/calendar/client';

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
      const maxResults = parseInt(searchParams.get('maxResults') || '10', 10);
      const events = await listUpcomingEvents(token, maxResults, timeMin, timeMax);
      return NextResponse.json({ events });
    }

    if (action === 'today-tomorrow') {
      const result = await listTodayAndTomorrowEvents(token);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = await getAccessTokenForAccount(req, body.account);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action } = body;

  try {
    if (action === 'create') {
      const event = await createEvent(token, body.event);
      return NextResponse.json({ success: true, event });
    }

    if (action === 'update') {
      const event = await updateEvent(token, body.event);
      return NextResponse.json({ success: true, event });
    }

    if (action === 'delete') {
      await deleteEvent(token, body.eventId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Calendar action error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
