import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminSessionFromRequest } from '@/lib/server/super-admin-auth';
import { getStoredUsers } from '@/lib/server/auth';
import { getHistoryEntries } from '@/lib/server/history';
import { getBillingTransactions } from '@/lib/server/billing';
import { getWebTelemetryEvents } from '@/lib/server/telemetry';

function guard(req: NextRequest) {
  const s = getSuperAdminSessionFromRequest(req);
  return s.valid ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const fail = guard(req);
  if (fail) return fail;

  try {
    const now = new Date();
    const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [users, historyRaw, billingRaw, telemetryRaw] = await Promise.all([
      getStoredUsers(),
      getHistoryEntries().catch(() => []),
      getBillingTransactions().catch(() => []),
      getWebTelemetryEvents().catch(() => []),
    ]);
    const history = historyRaw as { createdAt?: string; templateName?: string; generatedBy?: string; organizationName?: string }[];
    const billing = billingRaw as { status: string; amountPaise?: number; createdAt?: string; planId?: string; id?: string; userEmail?: string }[];
    const telemetry = telemetryRaw as { type: string; createdAt?: string; featureId?: string }[];

    // User stats
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.isActive && !u.safety?.suspendedUntil).length;
    const suspendedUsers = users.filter((u) => {
      const until = u.safety?.suspendedUntil ? new Date(u.safety.suspendedUntil).getTime() : 0;
      return until > now.getTime();
    }).length;
    const disabledUsers = users.filter((u) => !u.isActive).length;
    const businessAccounts = users.filter((u) => u.accountType === 'business').length;
    const individualAccounts = users.filter((u) => u.accountType === 'individual').length;
    const newUsersLast30Days = users.filter((u) => u.createdAt && new Date(u.createdAt) >= day30Ago).length;
    const newUsersLast7Days = users.filter((u) => u.createdAt && new Date(u.createdAt) >= day7Ago).length;

    // Plan distribution
    const planDist: Record<string, number> = {};
    const subStatusDist: Record<string, number> = {};
    users.forEach((u) => {
      const planId = u.subscription?.planId || 'none';
      planDist[planId] = (planDist[planId] || 0) + 1;
      const st = u.subscription?.status || 'none';
      subStatusDist[st] = (subStatusDist[st] || 0) + 1;
    });

    // Role distribution
    const roleDist: Record<string, number> = {};
    users.forEach((u) => {
      roleDist[u.role] = (roleDist[u.role] || 0) + 1;
    });

    // Document / history stats
    const totalDocs = history.length;
    const docsLast30 = history.filter((h) => h.createdAt && new Date(h.createdAt) >= day30Ago).length;
    const docsLast7 = history.filter((h) => h.createdAt && new Date(h.createdAt) >= day7Ago).length;

    // Revenue stats
    const successfulTx = billing.filter((t) => t.status === 'paid' || t.status === 'success');
    const totalRevenuePaise = successfulTx.reduce((sum, t) => sum + (t.amountPaise || 0), 0);
    const revenueLast30 = successfulTx.filter((t) => t.createdAt && new Date(t.createdAt) >= day30Ago).reduce((sum, t) => sum + (t.amountPaise || 0), 0);
    const revenueLast7 = successfulTx.filter((t) => t.createdAt && new Date(t.createdAt) >= day7Ago).reduce((sum, t) => sum + (t.amountPaise || 0), 0);

    // Telemetry
    const pageViewsLast7 = telemetry.filter((e) => e.type === 'page_view' && e.createdAt && new Date(e.createdAt) >= day7Ago).length;
    const signupsLast7 = telemetry.filter((e) => e.type === 'signup' && e.createdAt && new Date(e.createdAt) >= day7Ago).length;
    const loginsLast7 = telemetry.filter((e) => e.type === 'login' && e.createdAt && new Date(e.createdAt) >= day7Ago).length;

    // Recent signups (last 10)
    const recentSignups = [...users]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        accountType: u.accountType,
        organizationName: u.organizationName,
        planId: u.subscription?.planId,
        planStatus: u.subscription?.status,
        createdAt: u.createdAt,
      }));

    // Daily signups last 14 days
    const dailySignups: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = users.filter((u) => u.createdAt && u.createdAt.slice(0, 10) === dateStr).length;
      dailySignups.push({ date: dateStr, count });
    }

    // Daily docs last 14 days
    const dailyDocs: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = history.filter((h) => h.createdAt && h.createdAt.slice(0, 10) === dateStr).length;
      dailyDocs.push({ date: dateStr, count });
    }

    // Recent billing
    const recentBilling = [...successfulTx]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 8)
      .map((t) => ({ id: t.id, userEmail: t.userEmail, planId: t.planId, amountPaise: t.amountPaise, status: t.status, createdAt: t.createdAt }));

    return NextResponse.json({
      generatedAt: now.toISOString(),
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        disabled: disabledUsers,
        business: businessAccounts,
        individual: individualAccounts,
        newLast30Days: newUsersLast30Days,
        newLast7Days: newUsersLast7Days,
        planDistribution: planDist,
        subscriptionStatusDistribution: subStatusDist,
        roleDistribution: roleDist,
        recentSignups,
        dailySignups,
      },
      documents: {
        total: totalDocs,
        last30Days: docsLast30,
        last7Days: docsLast7,
        daily: dailyDocs,
      },
      revenue: {
        totalPaise: totalRevenuePaise,
        last30DaysPaise: revenueLast30,
        last7DaysPaise: revenueLast7,
        totalTransactions: successfulTx.length,
        recentBilling,
      },
      telemetry: {
        pageViewsLast7Days: pageViewsLast7,
        signupsLast7Days: signupsLast7,
        loginsLast7Days: loginsLast7,
      },
    });
  } catch (err) {
    console.error('[super-admin/dashboard]', err);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
