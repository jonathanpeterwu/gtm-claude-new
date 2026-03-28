import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenForAccount } from '@/lib/account-token';
import { listThreads, getThread, archiveThread, starThread, markRead, markUnread, sendReply, createDraft, searchEmails } from '@/lib/gmail/client';

function gmailErrorStatus(error: any): number {
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
    if (action === 'threads') {
      const query = (searchParams.get('q') || '').slice(0, 500);
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
      const q = (searchParams.get('q') || '').slice(0, 500);
      const threads = await searchEmails(token, q);
      return NextResponse.json({ threads });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    const status = gmailErrorStatus(error);
    const message = error?.errors?.[0]?.message || error?.message || 'Unknown Gmail error';
    console.error('Gmail API error:', { status, message, action: searchParams.get('action') });
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = await getAccessTokenForAccount(req, body.account);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action } = body;

  try {
    if (action === 'archive' || action === 'markRead' || action === 'markUnread') {
      if (!body.threadId || typeof body.threadId !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid threadId' }, { status: 400 });
      }
      if (action === 'archive') await archiveThread(token, body.threadId);
      else if (action === 'markRead') await markRead(token, body.threadId);
      else await markUnread(token, body.threadId);
      return NextResponse.json({ success: true });
    }

    if (action === 'star') {
      if (!body.threadId || typeof body.threadId !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid threadId' }, { status: 400 });
      }
      if (typeof body.starred !== 'boolean') {
        return NextResponse.json({ error: 'Missing or invalid starred' }, { status: 400 });
      }
      await starThread(token, body.threadId, body.starred);
      return NextResponse.json({ success: true });
    }

    if (action === 'reply' || action === 'draft') {
      if (!body.threadId || typeof body.threadId !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid threadId' }, { status: 400 });
      }
      if (!body.to || typeof body.to !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid to' }, { status: 400 });
      }
      if (!body.subject || typeof body.subject !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid subject' }, { status: 400 });
      }
      if (!body.body || typeof body.body !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid body' }, { status: 400 });
      }
      if (action === 'reply') {
        const id = await sendReply(token, body.threadId, body.to, body.subject, body.body, body.inReplyTo, body.references);
        return NextResponse.json({ success: true, messageId: id });
      } else {
        const id = await createDraft(token, body.threadId, body.to, body.subject, body.body, body.inReplyTo, body.references);
        return NextResponse.json({ success: true, draftId: id });
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    const status = gmailErrorStatus(error);
    const message = error?.errors?.[0]?.message || error?.message || 'Unknown Gmail error';
    console.error('Gmail action error:', { status, message, action: body.action });
    return NextResponse.json({ error: message }, { status });
  }
}
