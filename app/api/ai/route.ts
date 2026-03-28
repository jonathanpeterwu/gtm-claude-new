import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { categorizeThreadsBatch, generateDraft, summarizeThread, researchAndDraft, extractTasks, improveWriting, generateInboxSuggestions } from '@/lib/ai/claude';
import { Thread } from '@/types';

const MAX_TEXT_LENGTH = 10000;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  try {
    if (action === 'categorize') {
      if (!Array.isArray(body.threads)) {
        return NextResponse.json({ error: 'threads must be an array' }, { status: 400 });
      }
      const threads: Thread[] = body.threads.slice(0, 20);
      const categories = await categorizeThreadsBatch(threads);
      const result = Object.fromEntries(categories);
      return NextResponse.json({ categories: result });
    }

    if (action === 'draft') {
      if (!body.thread || typeof body.thread !== 'object') {
        return NextResponse.json({ error: 'Missing thread' }, { status: 400 });
      }
      const draft = await generateDraft(body.thread, body.tone, body.customInstructions?.slice(0, MAX_TEXT_LENGTH), body.userEmail);
      return NextResponse.json(draft);
    }

    if (action === 'summarize') {
      if (!body.thread || typeof body.thread !== 'object') {
        return NextResponse.json({ error: 'Missing thread' }, { status: 400 });
      }
      const summary = await summarizeThread(body.thread);
      return NextResponse.json({ summary });
    }

    if (action === 'research-draft') {
      if (!body.thread || typeof body.thread !== 'object') {
        return NextResponse.json({ error: 'Missing thread' }, { status: 400 });
      }
      const draft = await researchAndDraft(body.thread, (body.researchContext || '').slice(0, MAX_TEXT_LENGTH), body.userEmail);
      return NextResponse.json(draft);
    }

    if (action === 'extract-tasks') {
      if (!body.thread || typeof body.thread !== 'object') {
        return NextResponse.json({ error: 'Missing thread' }, { status: 400 });
      }
      const tasks = await extractTasks(body.thread);
      return NextResponse.json({ tasks });
    }

    if (action === 'improve') {
      if (!body.text || typeof body.text !== 'string') {
        return NextResponse.json({ error: 'Missing text' }, { status: 400 });
      }
      if (!body.instruction || typeof body.instruction !== 'string') {
        return NextResponse.json({ error: 'Missing instruction' }, { status: 400 });
      }
      const improved = await improveWriting(body.text.slice(0, MAX_TEXT_LENGTH), body.instruction.slice(0, 1000));
      return NextResponse.json({ text: improved });
    }

    if (action === 'inbox-suggestions') {
      if (!Array.isArray(body.threads)) {
        return NextResponse.json({ error: 'threads must be an array' }, { status: 400 });
      }
      const suggestions = await generateInboxSuggestions(body.threads.slice(0, 20));
      return NextResponse.json({ suggestions });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('AI error:', { action, message: error?.message });
    return NextResponse.json({ error: error.message || 'AI processing failed' }, { status: 500 });
  }
}
