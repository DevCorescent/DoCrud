import { getStoredUsers, saveStoredUsers, type StoredUser } from '@/lib/server/auth';
import { getHistoryEntries } from '@/lib/server/history';
import { getBillingTransactions } from '@/lib/server/billing';
import { getUserActivityEvents, getUserFeedbackEntries } from '@/lib/server/user-intelligence';
import { getWebTelemetryEvents } from '@/lib/server/telemetry';
import { appendAdminAuditEvent, getAdminAuditEvents } from '@/lib/server/admin-audit';

function nowMs() {
  return Date.now();
}

function isSuspended(user: StoredUser, now = new Date()) {
  const until = user.safety?.suspendedUntil ? new Date(user.safety.suspendedUntil).getTime() : 0;
  return Boolean(until && until > now.getTime());
}

function statusLabel(user: StoredUser) {
  if (!user.isActive) return 'disabled' as const;
  if (isSuspended(user)) return 'suspended' as const;
  return 'active' as const;
}

function safeString(value: unknown) {
  return String(value ?? '').trim();
}

export type AdminUserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
  accountType?: 'business' | 'individual';
  organizationName?: string;
  planName?: string;
  planStatus?: string;
  isActive: boolean;
  suspendedUntil?: string;
  createdAt: string;
  lastLogin?: string;
  lastActivityAt?: string;
  status: 'active' | 'suspended' | 'disabled';
};

export async function listAdminUsers(params: {
  query?: string;
  status?: 'all' | 'active' | 'suspended' | 'disabled';
  limit?: number;
}) {
  const query = safeString(params.query).toLowerCase();
  const status = params.status || 'all';
  const limit = Math.max(1, Math.min(2000, Math.round(params.limit || 260)));

  const users = await getStoredUsers();
  const filtered = users
    .filter(Boolean)
    .filter((user) => {
      if (!query) return true;
      const haystack = `${user.name} ${user.email} ${user.organizationName || ''} ${user.role} ${user.loginId || ''}`.toLowerCase();
      return haystack.includes(query);
    })
    .map((user) => {
      const userStatus = statusLabel(user);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountType: user.accountType,
        organizationName: user.organizationName,
        planName: user.subscription?.planName,
        planStatus: user.subscription?.status,
        isActive: user.isActive,
        suspendedUntil: user.safety?.suspendedUntil,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        lastActivityAt: user.lastActivityAt,
        status: userStatus,
      } satisfies AdminUserSummary;
    })
    .filter((user) => (status === 'all' ? true : user.status === status))
    .sort((a, b) => new Date(b.lastActivityAt || b.lastLogin || b.createdAt).getTime() - new Date(a.lastActivityAt || a.lastLogin || a.createdAt).getTime())
    .slice(0, limit);

  const totals = filtered.reduce(
    (acc, user) => {
      acc.total += 1;
      acc.active += user.status === 'active' ? 1 : 0;
      acc.suspended += user.status === 'suspended' ? 1 : 0;
      acc.disabled += user.status === 'disabled' ? 1 : 0;
      return acc;
    },
    { total: 0, active: 0, suspended: 0, disabled: 0 },
  );

  return { users: filtered, totals };
}

export type AdminActiveSession = {
  sessionId: string;
  visitorId?: string;
  userId?: string;
  userRole?: string;
  userEmail?: string;
  userName?: string;
  ip?: string;
  userAgent?: string;
  lastSeenAt: string;
  surface?: string;
  lastPath?: string;
  eventsInWindow: number;
};

export async function listActiveSessions(params?: { windowMinutes?: number; limit?: number }) {
  const windowMinutes = Math.max(1, Math.min(180, Math.round(params?.windowMinutes || 15)));
  const limit = Math.max(1, Math.min(1000, Math.round(params?.limit || 260)));
  const cutoff = nowMs() - windowMinutes * 60 * 1000;

  const [events, users] = await Promise.all([getWebTelemetryEvents(), getStoredUsers()]);
  const userById = new Map(users.map((u) => [u.id, u]));

  const recent = events.filter((ev) => ev.sessionId && new Date(ev.createdAt).getTime() >= cutoff);
  const bySession = new Map<string, AdminActiveSession>();
  for (const ev of recent) {
    const sessionId = String(ev.sessionId || '').trim();
    if (!sessionId) continue;
    const existing = bySession.get(sessionId);
    const lastSeenAt = existing?.lastSeenAt && new Date(existing.lastSeenAt).getTime() > new Date(ev.createdAt).getTime()
      ? existing.lastSeenAt
      : ev.createdAt;
    const user = ev.userId ? userById.get(ev.userId) : undefined;
    bySession.set(sessionId, {
      sessionId,
      visitorId: ev.visitorId || existing?.visitorId,
      userId: ev.userId || existing?.userId,
      userRole: ev.userRole || existing?.userRole,
      userEmail: user?.email || existing?.userEmail,
      userName: user?.name || existing?.userName,
      ip: ev.ip || existing?.ip,
      userAgent: ev.userAgent || existing?.userAgent,
      lastSeenAt,
      surface: ev.surface || existing?.surface,
      lastPath: ev.path || existing?.lastPath,
      eventsInWindow: (existing?.eventsInWindow || 0) + 1,
    });
  }

  return Array.from(bySession.values())
    .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime())
    .slice(0, limit);
}

export type AdminUserBehaviour = {
  user: AdminUserSummary;
  activity: {
    events7d: number;
    lastSeenAt?: string;
    topTabs7d: Array<{ tabId: string; count: number }>;
    topFeatures7d: Array<{ featureId: string; count: number }>;
    recentEvents: Array<{ id: string; eventType: string; tabId?: string; featureId?: string; detail?: string; createdAt: string }>;
  };
  telemetry: {
    sessions24h: number;
    pageViews24h: number;
    featureOpens24h: number;
    lastIp?: string;
    lastUserAgent?: string;
    recentTelemetry: Array<{ id: string; type: string; surface: string; path: string; createdAt: string; ip?: string; sessionId?: string }>;
  };
  documents: {
    generatedTotal: number;
    lastGeneratedAt?: string;
  };
  billing: {
    paidTotalInPaise: number;
    paid30dInPaise: number;
    paidTransactions: number;
    lastPaidAt?: string;
  };
  feedback: {
    latestRating?: number;
    latestSummary?: string;
    latestCreatedAt?: string;
  };
  audits: Array<{ id: string; action: string; reason?: string; createdAt: string; actorEmail?: string }>;
};

function topFromMap(map: Map<string, number>, limit = 8) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

export async function getAdminUserBehaviour(userId: string): Promise<AdminUserBehaviour | null> {
  const [users, activity, feedback, telemetry, history, transactions, audits] = await Promise.all([
    getStoredUsers(),
    getUserActivityEvents(),
    getUserFeedbackEntries(),
    getWebTelemetryEvents(),
    getHistoryEntries(),
    getBillingTransactions(),
    getAdminAuditEvents(1500),
  ]);
  const target = users.find((u) => u.id === userId) || null;
  if (!target) return null;

  const summary: AdminUserSummary = {
    id: target.id,
    name: target.name,
    email: target.email,
    role: target.role,
    accountType: target.accountType,
    organizationName: target.organizationName,
    planName: target.subscription?.planName,
    planStatus: target.subscription?.status,
    isActive: target.isActive,
    suspendedUntil: target.safety?.suspendedUntil,
    createdAt: target.createdAt,
    lastLogin: target.lastLogin,
    lastActivityAt: target.lastActivityAt,
    status: statusLabel(target),
  };

  const now = Date.now();
  const weekCutoff = now - 7 * 24 * 60 * 60 * 1000;
  const dayCutoff = now - 24 * 60 * 60 * 1000;
  const monthCutoff = now - 30 * 24 * 60 * 60 * 1000;

  const userEvents7d = activity.filter((ev) => ev.userId === target.id && new Date(ev.createdAt).getTime() >= weekCutoff);
  const tabMap = new Map<string, number>();
  const featureMap = new Map<string, number>();
  userEvents7d.forEach((ev) => {
    if (ev.tabId) tabMap.set(ev.tabId, (tabMap.get(ev.tabId) || 0) + 1);
    if (ev.featureId) featureMap.set(ev.featureId, (featureMap.get(ev.featureId) || 0) + 1);
  });

  const lastSeenAt = userEvents7d
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.createdAt
    || target.lastActivityAt
    || target.lastLogin;

  const topTabs7d = topFromMap(tabMap, 8).map((row) => ({ tabId: row.key, count: row.count }));
  const topFeatures7d = topFromMap(featureMap, 8).map((row) => ({ featureId: row.key, count: row.count }));

  const recentEvents = userEvents7d
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 60)
    .map((ev) => ({
      id: ev.id,
      eventType: ev.eventType,
      tabId: ev.tabId,
      featureId: ev.featureId,
      detail: ev.detail,
      createdAt: ev.createdAt,
    }));

  const userTelemetry24h = telemetry.filter((ev) => ev.userId === target.id && new Date(ev.createdAt).getTime() >= dayCutoff);
  const sessions24h = new Set(userTelemetry24h.map((ev) => ev.sessionId).filter(Boolean)).size;
  const pageViews24h = userTelemetry24h.filter((ev) => ev.type === 'page_view').length;
  const featureOpens24h = userTelemetry24h.filter((ev) => ev.type === 'feature_open').length;
  const lastTe = userTelemetry24h.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const recentTelemetry = userTelemetry24h
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 80)
    .map((ev) => ({
      id: ev.id,
      type: ev.type,
      surface: ev.surface,
      path: ev.path,
      createdAt: ev.createdAt,
      ip: ev.ip,
      sessionId: ev.sessionId,
    }));

  const docs = history.filter((entry) => {
    const actor = String((entry as any).generatedBy || '').toLowerCase();
    return actor === target.email.toLowerCase() || actor === target.name.toLowerCase();
  });
  const lastGeneratedAt = docs.slice().sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0]?.generatedAt;

  const paid = transactions.filter((t) => t.userId === target.id && t.status === 'paid');
  const paid30d = paid.filter((t) => new Date(t.paidAt || t.updatedAt || t.createdAt).getTime() >= monthCutoff);
  const paidTotalInPaise = paid.reduce((sum, t) => sum + (t.amountInPaise || 0), 0);
  const paid30dInPaise = paid30d.reduce((sum, t) => sum + (t.amountInPaise || 0), 0);
  const lastPaidAt = paid
    .map((t) => t.paidAt || t.updatedAt || t.createdAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  const latestFeedback = feedback
    .filter((f) => f.userId === target.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const auditsForUser = audits
    .filter((ev) => ev.targetUserId === target.id)
    .slice(0, 120)
    .map((ev) => ({ id: ev.id, action: ev.action, reason: ev.reason, createdAt: ev.createdAt, actorEmail: ev.actorEmail }));

  return {
    user: summary,
    activity: {
      events7d: userEvents7d.length,
      lastSeenAt,
      topTabs7d,
      topFeatures7d,
      recentEvents,
    },
    telemetry: {
      sessions24h,
      pageViews24h,
      featureOpens24h,
      lastIp: lastTe?.ip,
      lastUserAgent: lastTe?.userAgent,
      recentTelemetry,
    },
    documents: {
      generatedTotal: docs.length,
      lastGeneratedAt,
    },
    billing: {
      paidTotalInPaise,
      paid30dInPaise,
      paidTransactions: paid.length,
      lastPaidAt,
    },
    feedback: {
      latestRating: latestFeedback?.rating,
      latestSummary: latestFeedback?.summary,
      latestCreatedAt: latestFeedback?.createdAt,
    },
    audits: auditsForUser,
  };
}

export async function adminSuspendUser(params: {
  actorUserId: string;
  actorEmail?: string;
  actorRole?: string;
  targetUserId: string;
  days?: number;
  reason?: string;
}) {
  const days = Math.max(1, Math.min(365, Math.round(params.days || 7)));
  const users = await getStoredUsers();
  const idx = users.findIndex((u) => u.id === params.targetUserId);
  if (idx === -1) throw new Error('User not found.');

  const now = new Date();
  const suspendedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const nextUsers = users.map((u) => (u.id === params.targetUserId
    ? {
        ...u,
        safety: {
          ...(u.safety || {}),
          suspendedUntil,
        },
        isActive: true,
      }
    : u));
  await saveStoredUsers(nextUsers);

  const target = users[idx];
  await appendAdminAuditEvent({
    actorUserId: params.actorUserId,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    targetUserId: target.id,
    targetEmail: target.email,
    action: 'suspend',
    reason: safeString(params.reason) || `Suspended for ${days} day(s)`,
    metadata: { days: String(days), suspendedUntil },
  });

  return { suspendedUntil };
}

export async function adminUnsuspendUser(params: {
  actorUserId: string;
  actorEmail?: string;
  actorRole?: string;
  targetUserId: string;
  reason?: string;
}) {
  const users = await getStoredUsers();
  const idx = users.findIndex((u) => u.id === params.targetUserId);
  if (idx === -1) throw new Error('User not found.');
  const nextUsers = users.map((u) => (u.id === params.targetUserId
    ? { ...u, safety: { ...(u.safety || {}), suspendedUntil: undefined } }
    : u));
  await saveStoredUsers(nextUsers);
  const target = users[idx];
  await appendAdminAuditEvent({
    actorUserId: params.actorUserId,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    targetUserId: target.id,
    targetEmail: target.email,
    action: 'unsuspend',
    reason: safeString(params.reason) || 'Unsuspended by admin',
  });
}

export async function adminDisableUser(params: {
  actorUserId: string;
  actorEmail?: string;
  actorRole?: string;
  targetUserId: string;
  reason?: string;
}) {
  const users = await getStoredUsers();
  const idx = users.findIndex((u) => u.id === params.targetUserId);
  if (idx === -1) throw new Error('User not found.');
  const nextUsers = users.map((u) => (u.id === params.targetUserId ? { ...u, isActive: false } : u));
  await saveStoredUsers(nextUsers);
  const target = users[idx];
  await appendAdminAuditEvent({
    actorUserId: params.actorUserId,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    targetUserId: target.id,
    targetEmail: target.email,
    action: 'disable',
    reason: safeString(params.reason) || 'Disabled by admin',
  });
}

export async function adminEnableUser(params: {
  actorUserId: string;
  actorEmail?: string;
  actorRole?: string;
  targetUserId: string;
  reason?: string;
}) {
  const users = await getStoredUsers();
  const idx = users.findIndex((u) => u.id === params.targetUserId);
  if (idx === -1) throw new Error('User not found.');
  const nextUsers = users.map((u) => (u.id === params.targetUserId ? { ...u, isActive: true } : u));
  await saveStoredUsers(nextUsers);
  const target = users[idx];
  await appendAdminAuditEvent({
    actorUserId: params.actorUserId,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    targetUserId: target.id,
    targetEmail: target.email,
    action: 'enable',
    reason: safeString(params.reason) || 'Enabled by admin',
  });
}

export async function adminDeleteUser(params: {
  actorUserId: string;
  actorEmail?: string;
  actorRole?: string;
  targetUserId: string;
  reason?: string;
}) {
  const users = await getStoredUsers();
  const target = users.find((u) => u.id === params.targetUserId) || null;
  if (!target) throw new Error('User not found.');
  const nextUsers = users.filter((u) => u.id !== params.targetUserId);
  await saveStoredUsers(nextUsers);
  await appendAdminAuditEvent({
    actorUserId: params.actorUserId,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    targetUserId: target.id,
    targetEmail: target.email,
    action: 'delete',
    reason: safeString(params.reason) || 'Deleted by admin',
  });
}
