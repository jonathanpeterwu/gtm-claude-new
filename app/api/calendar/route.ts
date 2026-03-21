import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listUpcomingEvents, listTodayAndTomorrowEvents, createEvent, updateEvent, deleteEvent } from '@/lib/calendar/client';

async function getAccessToken(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session as any)?.accessToken || null;
}

export async function GET(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
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
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
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
