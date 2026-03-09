export interface Email {
  id: string;
  threadId: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  subject: string;
  snippet: string;
  body: string;
  bodyHtml?: string;
  date: string;
  isUnread: boolean;
  isStarred: boolean;
  labels: string[];
  hasAttachments: boolean;
  inReplyTo?: string;
  references?: string[];
}

export interface EmailAddress {
  name: string;
  email: string;
}

export interface Thread {
  id: string;
  subject: string;
  snippet: string;
  messages: Email[];
  lastMessageDate: string;
  isUnread: boolean;
  isStarred: boolean;
  labels: string[];
  category?: EmailCategory;
  aiSummary?: string;
}

export type EmailCategory =
  | 'action_required'
  | 'waiting_on'
  | 'fyi'
  | 'scheduling'
  | 'intro'
  | 'follow_up'
  | 'gtm'
  | 'newsletter'
  | 'notification'
  | 'other';

export const CATEGORY_CONFIG: Record<EmailCategory, { label: string; color: string; icon: string }> = {
  action_required: { label: 'Action Required', color: 'text-accent-red', icon: '🔴' },
  waiting_on: { label: 'Waiting On', color: 'text-accent-yellow', icon: '⏳' },
  fyi: { label: 'FYI', color: 'text-accent-blue', icon: 'ℹ️' },
  scheduling: { label: 'Scheduling', color: 'text-accent-purple', icon: '📅' },
  intro: { label: 'Intro', color: 'text-accent-green', icon: '🤝' },
  follow_up: { label: 'Follow Up', color: 'text-accent-orange', icon: '↩️' },
  gtm: { label: 'GTM', color: 'text-accent-purple', icon: '🚀' },
  newsletter: { label: 'Newsletter', color: 'text-text-muted', icon: '📰' },
  notification: { label: 'Notification', color: 'text-text-muted', icon: '🔔' },
  other: { label: 'Other', color: 'text-text-secondary', icon: '📧' },
};

export interface AIDraft {
  content: string;
  tone: DraftTone;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export type DraftTone = 'professional' | 'friendly' | 'concise' | 'detailed';

export interface AutoResponseRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    fromPattern?: string;
    subjectPattern?: string;
    category?: EmailCategory;
    hasLabel?: string;
  };
  action: {
    type: 'draft' | 'send' | 'label' | 'archive';
    tone?: DraftTone;
    customInstructions?: string;
    labelToAdd?: string;
  };
}

export interface GTMTask {
  id: string;
  threadId: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'waiting' | 'done';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  contact: EmailAddress;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  isAllDay: boolean;
  meetLink?: string;
  hangoutLink?: string;
  htmlLink?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  attendees?: CalendarAttendee[];
  organizer?: { name?: string; email: string };
  colorId?: string;
}

export interface CalendarAttendee {
  name?: string;
  email: string;
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  self?: boolean;
}

export interface CreateEventInput {
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  isAllDay?: boolean;
  attendees?: string[];
  addMeet?: boolean;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  id: string;
}

export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  description: string;
  action: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'j', description: 'Next email', action: 'next' },
  { key: 'k', description: 'Previous email', action: 'prev' },
  { key: 'Enter', description: 'Open thread', action: 'open' },
  { key: 'Escape', description: 'Back to inbox', action: 'back' },
  { key: 'e', description: 'Archive', action: 'archive' },
  { key: 'r', description: 'Reply', action: 'reply' },
  { key: 'a', description: 'Reply all', action: 'replyAll' },
  { key: 'f', description: 'Forward', action: 'forward' },
  { key: 's', description: 'Star/Unstar', action: 'star' },
  { key: 'c', description: 'Compose', action: 'compose' },
  { key: 'd', description: 'AI Draft', action: 'aiDraft' },
  { key: 't', description: 'Create task', action: 'createTask' },
  { key: '/', description: 'Search', action: 'search' },
  { key: '?', description: 'Show shortcuts', action: 'shortcuts' },
  { key: 'u', modifiers: ['shift'], description: 'Mark unread', action: 'markUnread' },
];
