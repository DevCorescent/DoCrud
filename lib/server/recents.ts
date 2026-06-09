import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'recents.json');
const EXPIRY_HOURS = 24;

export type RecentType = 'image' | 'video' | 'text';
export type RecentVisibility = 'public' | 'private';

export interface Recent {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  type: RecentType;
  mediaUrl?: string | null;
  caption?: string | null;
  bgColor?: string;
  bgGradient?: string;
  textColor?: string;
  fontStyle?: string;
  fontSize?: number;
  ctaLabel?: string;
  ctaUrl?: string;
  expiryHours?: number;
  category: string;
  visibility: RecentVisibility;
  viewCount: number;
  viewedBy: string[];
  likedBy: string[];
  createdAt: string;
  expiresAt: string;
}

function read(): Recent[] {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const all = JSON.parse(raw) as Recent[];
    // Purge expired
    const now = Date.now();
    return all.filter((r) => new Date(r.expiresAt).getTime() > now);
  } catch { return []; }
}

function write(items: Recent[]) {
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2));
}

function save(items: Recent[]) {
  // Always persist the non-expired subset
  const now = Date.now();
  write(items.filter((r) => new Date(r.expiresAt).getTime() > now));
}

export function getRecents(options?: { visibility?: RecentVisibility; userId?: string }): Recent[] {
  const all = read();
  if (!options) return all;
  return all.filter((r) => {
    if (options.visibility && r.visibility !== options.visibility) return false;
    if (options.userId && r.userId !== options.userId) return false;
    return true;
  });
}

export function getRecentById(id: string): Recent | null {
  return read().find((r) => r.id === id) ?? null;
}

export function createRecent(data: {
  userId: string;
  userName: string;
  userAvatar?: string | null;
  type: RecentType;
  mediaUrl?: string | null;
  caption?: string | null;
  bgColor?: string;
  bgGradient?: string;
  textColor?: string;
  fontStyle?: string;
  fontSize?: number;
  ctaLabel?: string;
  ctaUrl?: string;
  expiryHours?: number;
  category: string;
  visibility: RecentVisibility;
}): Recent {
  const all = read();
  const now = new Date();
  const hours = Math.min(Math.max(data.expiryHours ?? EXPIRY_HOURS, 1), 48);
  const expires = new Date(now.getTime() + hours * 3600 * 1000);
  const recent: Recent = {
    id: `rc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...data,
    viewCount: 0,
    viewedBy: [],
    likedBy: [],
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  save([...all, recent]);
  return recent;
}

export function recordView(id: string, viewerId: string): Recent | null {
  const all = read();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const r = all[idx];
  if (!r.viewedBy.includes(viewerId)) {
    r.viewedBy.push(viewerId);
    r.viewCount = r.viewedBy.length;
    save(all);
  }
  return r;
}

export function toggleLike(id: string, userId: string): Recent | null {
  const all = read();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const r = all[idx];
  if (r.likedBy.includes(userId)) {
    r.likedBy = r.likedBy.filter((u) => u !== userId);
  } else {
    r.likedBy.push(userId);
  }
  save(all);
  return r;
}

export function deleteRecent(id: string, requestingUserId: string): boolean {
  const all = read();
  const item = all.find((r) => r.id === id);
  if (!item) return false;
  if (item.userId !== requestingUserId) return false;
  save(all.filter((r) => r.id !== id));
  return true;
}
