import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenForAccount } from '@/lib/account-token';
import { listThreads, getThread, archiveThread, starThread, markRead, markUnread, sendReply, createDraft, searchEmails } from '@/lib/gmail/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const account = searchParams.get('account');
  const token = await getAccessTokenForAccount(req, account);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const action = searchParams.get('action');

  try {
    if (action === 'threads') {
      const query = searchParams.get('q') || '';
      const pageToken = searchParams.get('pageToken') || undefined;
      const result = await listThreads(token, query, 30, pageToken);
      return NextResponse.json(result);
    }

    if (action === 'thread') {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
      const thread = await getThread(token, id);
      return NextResponse.json(thread);
    }

    if (action === 'search') {
      const q = searchParams.get('q') || '';
      const threads = await searchEmails(token, q);
      return NextResponse.json({ threads });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    const status = error?.code || error?.status || 500;
    const message = error?.errors?.[0]?.message || error?.message || 'Unknown Gmail error';
    console.error('Gmail API error:', { status, message, action: searchParams.get('action') });
    return NextResponse.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = await getAccessTokenForAccount(req, body.account);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action } = body;

  try {
    if (action === 'archive') {
      await archiveThread(token, body.threadId);
      return NextResponse.json({ success: true });
    }

    if (action === 'star') {
      await starThread(token, body.threadId, body.starred);
      return NextResponse.json({ success: true });
    }

    if (action === 'markRead') {
      await markRead(token, body.threadId);
      return NextResponse.json({ success: true });
    }

    if (action === 'markUnread') {
      await markUnread(token, body.threadId);
      return NextResponse.json({ success: true });
    }

    if (action === 'reply') {
      const id = await sendReply(token, body.threadId, body.to, body.subject, body.body, body.inReplyTo, body.references);
      return NextResponse.json({ success: true, messageId: id });
    }

    if (action === 'draft') {
      const id = await createDraft(token, body.threadId, body.to, body.subject, body.body, body.inReplyTo, body.references);
      return NextResponse.json({ success: true, draftId: id });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    const status = error?.code || error?.status || 500;
    const message = error?.errors?.[0]?.message || error?.message || 'Unknown Gmail error';
    console.error('Gmail action error:', { status, message, action: body.action });
    return NextResponse.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
