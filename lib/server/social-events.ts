import { socialEventsPath, readJsonFile, writeJsonFile } from '@/lib/server/storage';

export type SocialEventType = 'follow' | 'profile_view' | 'like' | 'comment' | 'mention' | 'gig_applied' | 'document_viewed';

export interface SocialEvent {
  id: string;
  type: SocialEventType;
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  actorHeadline?: string;
  /** The user who should receive the notification */
  targetUserId: string;
  resourceId?: string;
  resourceTitle?: string;
  /** Extra text (e.g. comment body snippet) */
  excerpt?: string;
  href?: string;
  createdAt: string;
}

type SocialEventsData = { events: SocialEvent[] };
const empty: SocialEventsData = { events: [] };

/* Keep at most 500 events total to avoid unbounded growth */
const MAX_EVENTS = 500;

export async function getSocialEvents(): Promise<SocialEventsData> {
  return readJsonFile<SocialEventsData>(socialEventsPath, empty);
}

export async function addSocialEvent(event: Omit<SocialEvent, 'id' | 'createdAt'>): Promise<SocialEvent> {
  const data = await getSocialEvents();
  const newEvent: SocialEvent = {
    ...event,
    id: `se_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  data.events = [newEvent, ...data.events].slice(0, MAX_EVENTS);
  await writeJsonFile(socialEventsPath, data);
  return newEvent;
}

/** Returns events where targetUserId matches, newest-first, capped at 60 */
export async function getSocialEventsForUser(userId: string): Promise<SocialEvent[]> {
  const data = await getSocialEvents();
  return data.events
    .filter((e) => e.targetUserId === userId)
    .slice(0, 60);
}

/** Deduplicate follow events — only keep the most recent follow from each actor */
export async function getDeduplicatedSocialEventsForUser(userId: string): Promise<SocialEvent[]> {
  const events = await getSocialEventsForUser(userId);
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.type}:${e.actorId}:${e.resourceId ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
