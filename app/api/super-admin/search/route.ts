import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminSessionFromRequest } from '@/lib/server/super-admin-auth';
import { getWebTelemetryEvents } from '@/lib/server/telemetry';

function guard(req: NextRequest) {
  const s = getSuperAdminSessionFromRequest(req);
  return s.valid ? s : null;
}

export async function GET(req: NextRequest) {
  const session = guard(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.max(1, Math.min(90, parseInt(searchParams.get('days') || '30')));

  try {
    const allEvents = await getWebTelemetryEvents();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Filter search events
    const searchEvents = allEvents.filter((e) =>
      e.type === 'search' && e.query && e.createdAt && new Date(e.createdAt) >= since
    );

    // Total searches
    const totalSearches = searchEvents.length;
    const uniqueQueries = new Set(searchEvents.map((e) => e.query)).size;

    // Query frequency
    const queryFreq: Record<string, { count: number; users: Set<string>; lastAt: string }> = {};
    searchEvents.forEach((e) => {
      const q = (e.query || '').trim().toLowerCase();
      if (!q) return;
      if (!queryFreq[q]) queryFreq[q] = { count: 0, users: new Set(), lastAt: e.createdAt };
      queryFreq[q].count++;
      if (e.userId) queryFreq[q].users.add(e.userId);
      if (e.createdAt > queryFreq[q].lastAt) queryFreq[q].lastAt = e.createdAt;
    });

    const topQueries = Object.entries(queryFreq)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 50)
      .map(([query, data]) => ({ query, count: data.count, uniqueUsers: data.users.size, lastAt: data.lastAt }));

    // Searches with no results (queries that appear only once and are long)
    const zeroResultCandidates = Object.entries(queryFreq)
      .filter(([q, d]) => d.count === 1 && q.length > 5)
      .map(([q]) => q)
      .slice(0, 30);

    // Searches by surface (workspace vs public)
    const bySurface: Record<string, number> = {};
    searchEvents.forEach((e) => { bySurface[e.surface || 'unknown'] = (bySurface[e.surface || 'unknown'] || 0) + 1; });

    // Searches by user role
    const byRole: Record<string, number> = {};
    searchEvents.forEach((e) => { if (e.userRole) byRole[e.userRole] = (byRole[e.userRole] || 0) + 1; });

    // Daily search volume
    const dailySearches: { date: string; count: number; uniqueQueries: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayEvents = searchEvents.filter((e) => e.createdAt?.slice(0, 10) === dateStr);
      const uq = new Set(dayEvents.map((e) => e.query)).size;
      dailySearches.push({ date: dateStr, count: dayEvents.length, uniqueQueries: uq });
    }

    // Hour-of-day distribution
    const byHour: number[] = new Array(24).fill(0);
    searchEvents.forEach((e) => {
      if (e.createdAt) byHour[new Date(e.createdAt).getHours()]++;
    });

    // Search per user (top searching users)
    const userSearchCount: Record<string, number> = {};
    searchEvents.forEach((e) => {
      if (e.userId) userSearchCount[e.userId] = (userSearchCount[e.userId] || 0) + 1;
    });
    const topSearchers = Object.entries(userSearchCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));

    // Trending queries (high growth: last 7d vs previous 7d)
    const now = Date.now();
    const week1Since = new Date(now - 7 * 86400000);
    const week2Since = new Date(now - 14 * 86400000);
    const week1Events = allEvents.filter((e) => e.type === 'search' && e.query && e.createdAt && new Date(e.createdAt) >= week1Since);
    const week2Events = allEvents.filter((e) => e.type === 'search' && e.query && e.createdAt && new Date(e.createdAt) >= week2Since && new Date(e.createdAt) < week1Since);
    const w1Freq: Record<string, number> = {};
    const w2Freq: Record<string, number> = {};
    week1Events.forEach((e) => { if (e.query) w1Freq[e.query] = (w1Freq[e.query] || 0) + 1; });
    week2Events.forEach((e) => { if (e.query) w2Freq[e.query] = (w2Freq[e.query] || 0) + 1; });
    const trending = Object.entries(w1Freq)
      .map(([q, w1]) => ({ query: q, thisWeek: w1, lastWeek: w2Freq[q] || 0, growth: w2Freq[q] ? ((w1 - w2Freq[q]) / w2Freq[q]) * 100 : 100 }))
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 15);

    return NextResponse.json({
      period: { days, since: since.toISOString() },
      overview: { totalSearches, uniqueQueries, avgPerDay: Math.round(totalSearches / days) },
      topQueries,
      trending,
      zeroResultCandidates,
      bySurface,
      byRole,
      byHour,
      dailySearches,
      topSearchers,
    });
  } catch (err) {
    console.error('[super-admin/search GET]', err);
    return NextResponse.json({ error: 'Failed to load search data' }, { status: 500 });
  }
}
