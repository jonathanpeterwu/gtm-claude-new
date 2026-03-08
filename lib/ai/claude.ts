import Anthropic from '@anthropic-ai/sdk';
import { Thread, Email, EmailCategory, DraftTone, AIDraft } from '@/types';

const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function categorizeEmail(thread: Thread): Promise<EmailCategory> {
  const client = getClient();
  const lastMsg = thread.messages[thread.messages.length - 1];

  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 50,
    system: `Categorize emails into exactly one category. Reply with ONLY the category ID.
Categories: action_required, waiting_on, fyi, scheduling, intro, follow_up, gtm, newsletter, notification, other`,
    messages: [{
      role: 'user',
      content: `From: ${lastMsg.from.name} <${lastMsg.from.email}>
Subject: ${thread.subject}
Snippet: ${lastMsg.snippet}`,
    }],
  });

  const text = res.content[0].type === 'text' ? res.content[0].text.trim().toLowerCase() : 'other';
  const validCategories: EmailCategory[] = [
    'action_required', 'waiting_on', 'fyi', 'scheduling', 'intro',
    'follow_up', 'gtm', 'newsletter', 'notification', 'other',
  ];
  return validCategories.includes(text as EmailCategory) ? (text as EmailCategory) : 'other';
}

export async function categorizeThreadsBatch(threads: Thread[]): Promise<Map<string, EmailCategory>> {
  const results = new Map<string, EmailCategory>();
  const batch = threads.slice(0, 15); // Limit batch size

  await Promise.all(
    batch.map(async (thread) => {
      try {
        const category = await categorizeEmail(thread);
        results.set(thread.id, category);
      } catch {
        results.set(thread.id, 'other');
      }
    })
  );

  return results;
}

export async function generateDraft(
  thread: Thread,
  tone: DraftTone = 'professional',
  customInstructions?: string,
  userEmail?: string
): Promise<AIDraft> {
  const client = getClient();

  const transcript = thread.messages.map((msg) => {
    const role = msg.from.email === userEmail ? 'You' : msg.from.name || msg.from.email;
    return `[${role}] (${new Date(msg.date).toLocaleDateString()}):\n${msg.body.substring(0, 2000)}`;
  }).join('\n\n---\n\n');

  const toneInstructions: Record<DraftTone, string> = {
    professional: 'Use a formal, professional tone suitable for business communication.',
    friendly: 'Use a warm, approachable tone while remaining professional.',
    concise: 'Be extremely brief and to the point. No fluff.',
    detailed: 'Be thorough and provide comprehensive information.',
  };

  const system = `You are an expert email assistant. Draft a reply to the most recent email in this thread.

RULES:
1. Reply ONLY to the most recent message
2. Be ${tone} in tone: ${toneInstructions[tone]}
3. Do NOT include a subject line - just the reply body
4. Do NOT make up facts or commitments
5. If the email appears suspicious, note it
6. Keep it natural - avoid sounding robotic
${customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}`;

  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system,
    messages: [{
      role: 'user',
      content: `Thread Subject: ${thread.subject}\n\n${transcript}\n\nDraft a reply:`,
    }],
  });

  const content = res.content[0].type === 'text' ? res.content[0].text : '';

  return {
    content,
    tone,
    model: res.model,
    usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
  };
}

export async function summarizeThread(thread: Thread): Promise<string> {
  const client = getClient();

  const transcript = thread.messages
    .slice(-5) // Last 5 messages for context
    .map((msg) => `[${msg.from.name}]: ${msg.snippet}`)
    .join('\n');

  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    system: 'Summarize this email thread in 1-2 concise sentences. Focus on what action (if any) is needed.',
    messages: [{ role: 'user', content: `Subject: ${thread.subject}\n\n${transcript}` }],
  });

  return res.content[0].type === 'text' ? res.content[0].text : '';
}

export async function researchAndDraft(
  thread: Thread,
  researchContext: string,
  userEmail?: string
): Promise<AIDraft> {
  const client = getClient();

  const lastMsg = thread.messages[thread.messages.length - 1];

  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: `You are a senior business strategist and email communication expert.
You've been given context about a situation and need to draft a thoughtful, strategic reply.

Use the research context to inform your response, but don't explicitly reference "research" -
weave the insights naturally into a professional reply.`,
    messages: [{
      role: 'user',
      content: `RESEARCH CONTEXT:\n${researchContext}\n\nEMAIL THREAD:\nFrom: ${lastMsg.from.name} <${lastMsg.from.email}>\nSubject: ${thread.subject}\n\n${lastMsg.body.substring(0, 3000)}\n\nDraft a strategic reply:`,
    }],
  });

  const content = res.content[0].type === 'text' ? res.content[0].text : '';

  return {
    content,
    tone: 'professional',
    model: res.model,
    usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
  };
}

export async function extractTasks(thread: Thread): Promise<{
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}[]> {
  const client = getClient();

  const lastMsg = thread.messages[thread.messages.length - 1];

  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: `Extract actionable tasks from this email. Return a JSON array of tasks.
Each task should have: title (string), description (string), priority ("high"|"medium"|"low"), dueDate (ISO string or null).
Return ONLY valid JSON, no markdown.`,
    messages: [{
      role: 'user',
      content: `From: ${lastMsg.from.name}\nSubject: ${thread.subject}\n\n${lastMsg.body.substring(0, 2000)}`,
    }],
  });

  const text = res.content[0].type === 'text' ? res.content[0].text : '[]';
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

export async function improveWriting(text: string, instruction: string): Promise<string> {
  const client = getClient();

  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: 'You are a writing improvement assistant. Improve the given text according to the instruction. Return ONLY the improved text.',
    messages: [{
      role: 'user',
      content: `INSTRUCTION: ${instruction}\n\nTEXT:\n${text}`,
    }],
  });

  return res.content[0].type === 'text' ? res.content[0].text : text;
}
