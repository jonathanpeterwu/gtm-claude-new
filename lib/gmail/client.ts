import { google, gmail_v1 } from 'googleapis';
import { Email, EmailAddress, Thread } from '@/types';

export function getGmailClient(accessToken: string): gmail_v1.Gmail {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth });
}

export async function listThreads(
  accessToken: string,
  query: string = '',
  maxResults: number = 30,
  pageToken?: string
): Promise<{ threads: Thread[]; nextPageToken?: string }> {
  const gmail = getGmailClient(accessToken);

  const res = await gmail.users.threads.list({
    userId: 'me',
    q: query || 'in:inbox',
    maxResults,
    pageToken,
  });

  if (!res.data.threads) return { threads: [] };

  // Fetch thread details in parallel batches of 10
  const threadIds = res.data.threads.map((t) => t.id!);
  const threadDetails: (Thread | null)[] = [];
  const batchSize = 10;

  for (let i = 0; i < threadIds.length; i += batchSize) {
    const batch = threadIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((id) => getThread(accessToken, id))
    );
    threadDetails.push(...results);
  }

  return {
    threads: threadDetails.filter(Boolean) as Thread[],
    nextPageToken: res.data.nextPageToken || undefined,
  };
}

export async function getThread(accessToken: string, threadId: string): Promise<Thread | null> {
  const gmail = getGmailClient(accessToken);

  try {
    const res = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });

    if (!res.data.messages) return null;

    const messages = res.data.messages.map(parseMessage);
    const lastMsg = messages[messages.length - 1];

    return {
      id: threadId,
      subject: messages[0].subject,
      snippet: lastMsg.snippet,
      messages,
      lastMessageDate: lastMsg.date,
      isUnread: messages.some((m) => m.isUnread),
      isStarred: messages.some((m) => m.isStarred),
      labels: [...new Set(messages.flatMap((m) => m.labels))],
    };
  } catch {
    return null;
  }
}

export async function getMessage(accessToken: string, messageId: string): Promise<Email | null> {
  const gmail = getGmailClient(accessToken);

  try {
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    return parseMessage(res.data);
  } catch {
    return null;
  }
}

function parseMessage(msg: gmail_v1.Schema$Message): Email {
  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

  return {
    id: msg.id!,
    threadId: msg.threadId!,
    from: parseEmailAddress(getHeader('From')),
    to: parseEmailAddressList(getHeader('To')),
    cc: parseEmailAddressList(getHeader('Cc')),
    subject: getHeader('Subject') || '(no subject)',
    snippet: msg.snippet || '',
    body: extractBody(msg.payload, 'text/plain'),
    bodyHtml: extractBody(msg.payload, 'text/html') || undefined,
    date: new Date(parseInt(msg.internalDate || '0', 10)).toISOString(),
    isUnread: msg.labelIds?.includes('UNREAD') || false,
    isStarred: msg.labelIds?.includes('STARRED') || false,
    labels: msg.labelIds || [],
    hasAttachments: hasAttachments(msg.payload),
    inReplyTo: getHeader('In-Reply-To') || undefined,
    references: getHeader('References') ? getHeader('References').split(/\s+/) : undefined,
  };
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined, mimeType: string): string {
  if (!payload) return '';

  if (payload.mimeType === mimeType && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const result = extractBody(part, mimeType);
      if (result) return result;
    }
  }

  return '';
}

function hasAttachments(payload: gmail_v1.Schema$MessagePart | undefined): boolean {
  if (!payload) return false;
  if (payload.filename && payload.filename.length > 0 && payload.body?.attachmentId) return true;
  return payload.parts?.some((p) => hasAttachments(p)) || false;
}

function parseEmailAddress(raw: string): EmailAddress {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].replace(/^["']|["']$/g, '').trim(), email: match[2].toLowerCase() };
  }
  return { name: raw.split('@')[0], email: raw.toLowerCase().trim() };
}

function parseEmailAddressList(raw: string): EmailAddress[] {
  if (!raw) return [];
  return raw.split(',').map((a) => parseEmailAddress(a.trim())).filter((a) => a.email);
}

// Gmail Actions

export async function archiveThread(accessToken: string, threadId: string): Promise<void> {
  const gmail = getGmailClient(accessToken);
  await gmail.users.threads.modify({
    userId: 'me',
    id: threadId,
    requestBody: { removeLabelIds: ['INBOX'] },
  });
}

export async function starThread(accessToken: string, threadId: string, starred: boolean): Promise<void> {
  const gmail = getGmailClient(accessToken);
  const messages = (await gmail.users.threads.get({ userId: 'me', id: threadId })).data.messages;
  if (!messages) return;

  const lastMsgId = messages[messages.length - 1].id!;
  await gmail.users.messages.modify({
    userId: 'me',
    id: lastMsgId,
    requestBody: starred ? { addLabelIds: ['STARRED'] } : { removeLabelIds: ['STARRED'] },
  });
}

export async function markRead(accessToken: string, threadId: string): Promise<void> {
  const gmail = getGmailClient(accessToken);
  await gmail.users.threads.modify({
    userId: 'me',
    id: threadId,
    requestBody: { removeLabelIds: ['UNREAD'] },
  });
}

export async function markUnread(accessToken: string, threadId: string): Promise<void> {
  const gmail = getGmailClient(accessToken);
  await gmail.users.threads.modify({
    userId: 'me',
    id: threadId,
    requestBody: { addLabelIds: ['UNREAD'] },
  });
}

export async function sendReply(
  accessToken: string,
  threadId: string,
  to: string,
  subject: string,
  body: string,
  inReplyTo?: string,
  references?: string[]
): Promise<string> {
  const gmail = getGmailClient(accessToken);

  const lines = [
    `To: ${to}`,
    `Subject: ${subject.startsWith('Re:') ? subject : `Re: ${subject}`}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
  ];
  if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
  if (references?.length) lines.push(`References: ${references.join(' ')}`);
  lines.push('', body);

  const raw = Buffer.from(lines.join('\r\n')).toString('base64url');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw, threadId },
  });

  return res.data.id!;
}

export async function createDraft(
  accessToken: string,
  threadId: string,
  to: string,
  subject: string,
  body: string,
  inReplyTo?: string,
  references?: string[]
): Promise<string> {
  const gmail = getGmailClient(accessToken);

  const lines = [
    `To: ${to}`,
    `Subject: ${subject.startsWith('Re:') ? subject : `Re: ${subject}`}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
  ];
  if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
  if (references?.length) lines.push(`References: ${references.join(' ')}`);
  lines.push('', body);

  const raw = Buffer.from(lines.join('\r\n')).toString('base64url');

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw, threadId } },
  });

  return res.data.id!;
}

export async function searchEmails(accessToken: string, query: string): Promise<Thread[]> {
  const { threads } = await listThreads(accessToken, query, 20);
  return threads;
}
