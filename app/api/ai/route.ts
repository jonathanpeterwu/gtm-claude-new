import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { categorizeThreadsBatch, generateDraft, summarizeThread, researchAndDraft, extractTasks, improveWriting } from '@/lib/ai/claude';
import { Thread } from '@/types';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  try {
    if (action === 'categorize') {
      const threads: Thread[] = body.threads;
      const categories = await categorizeThreadsBatch(threads);
      const result = Object.fromEntries(categories);
      return NextResponse.json({ categories: result });
    }

    if (action === 'draft') {
      const draft = await generateDraft(body.thread, body.tone, body.customInstructions, body.userEmail);
      return NextResponse.json(draft);
    }

    if (action === 'summarize') {
      const summary = await summarizeThread(body.thread);
      return NextResponse.json({ summary });
    }

    if (action === 'research-draft') {
      const draft = await researchAndDraft(body.thread, body.researchContext, body.userEmail);
      return NextResponse.json(draft);
    }

    if (action === 'extract-tasks') {
      const tasks = await extractTasks(body.thread);
      return NextResponse.json({ tasks });
    }

    if (action === 'improve') {
      const improved = await improveWriting(body.text, body.instruction);
      return NextResponse.json({ text: improved });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('AI error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
