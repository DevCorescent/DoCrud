import { emailOutboxPath, readJsonFile, writeJsonFile } from '@/lib/server/storage';

export type OutboundEmailStatus = 'queued' | 'sent' | 'failed' | 'tested';

export type OutboundEmailEvent = {
  id: string;
  createdAt: string;
  status: OutboundEmailStatus;
  type: 'document_delivery' | 'collection_request' | 'system' | 'test' | 'docrud_go_welcome';
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  messageId?: string;
  sentAt?: string;
  sentBy?: string;
  error?: string;
  tracking: {
    opens: number;
    clicks: number;
    lastOpenedAt?: string;
    lastClickedAt?: string;
  };
  metadata?: Record<string, string>;
};

type OutboxState = {
  events: OutboundEmailEvent[];
};

const fallback: OutboxState = { events: [] };

function safeString(value: unknown) {
  return String(value ?? '').trim();
}

export function createOutboundEmailId(prefix = 'eml') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getEmailOutbox(limit = 200): Promise<OutboundEmailEvent[]> {
  const state = await readJsonFile<OutboxState>(emailOutboxPath, fallback);
  const events = Array.isArray(state?.events) ? state.events : [];
  return events
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, Math.max(1, Math.min(500, limit)));
}

export async function appendEmailOutboxEvent(event: OutboundEmailEvent) {
  const state = await readJsonFile<OutboxState>(emailOutboxPath, fallback);
  const events = Array.isArray(state?.events) ? state.events : [];
  const next = [event, ...events].slice(0, 2000);
  await writeJsonFile(emailOutboxPath, { events: next });
}

export async function updateEmailOutboxEvent(id: string, updater: (event: OutboundEmailEvent) => OutboundEmailEvent) {
  const state = await readJsonFile<OutboxState>(emailOutboxPath, fallback);
  const events = Array.isArray(state?.events) ? state.events : [];
  const next = events.map((ev) => (ev.id === id ? updater(ev) : ev));
  await writeJsonFile(emailOutboxPath, { events: next });
}

export async function markEmailOpened(id: string) {
  await updateEmailOutboxEvent(id, (ev) => ({
    ...ev,
    tracking: {
      ...ev.tracking,
      opens: Number(ev.tracking?.opens || 0) + 1,
      lastOpenedAt: new Date().toISOString(),
    },
  }));
}

export async function markEmailClicked(id: string) {
  await updateEmailOutboxEvent(id, (ev) => ({
    ...ev,
    tracking: {
      ...ev.tracking,
      clicks: Number(ev.tracking?.clicks || 0) + 1,
      lastClickedAt: new Date().toISOString(),
    },
  }));
}

export function buildTrackingPixel(origin: string, id: string) {
  const base = safeString(origin);
  const url = `${base}/api/mail/track/open?id=${encodeURIComponent(id)}`;
  return `<img src="${url}" alt="" width="1" height="1" style="display:none;opacity:0" />`;
}

export function rewriteLinksForTracking(origin: string, id: string, input: string) {
  const base = safeString(origin);
  const raw = String(input || '');
  const urlRegex = /\bhttps?:\/\/[^\s<>"')]+/gi;
  return raw.replace(urlRegex, (url) => (
    `${base}/api/mail/track/click?id=${encodeURIComponent(id)}&url=${encodeURIComponent(url)}`
  ));
}

