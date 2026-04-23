import { NextResponse } from 'next/server';
import { getAuthSession, getStoredUsers } from '@/lib/server/auth';
import { getEffectiveSaasPlanForUser, getRoadmapPromotionSnapshot, getUserUsageSummary } from '@/lib/server/saas';
import { getHistoryEntries } from '@/lib/server/history';
import { getFileTransfers } from '@/lib/server/file-transfers';
import { getVisibleVirtualIdCards } from '@/lib/server/virtual-ids';
import { getVisibleCertificates } from '@/lib/server/certificates';
import { ProfileOverview } from '@/types/document';
import { buildBillingThreshold } from '@/lib/server/billing';

export const dynamic = 'force-dynamic';

function formatExhaustion(daysUntilExhausted: number | null) {
  if (daysUntilExhausted === null) {
    return {
      projectedExhaustionLabel: 'No usage forecast yet',
      projectedExhaustionDate: undefined,
    };
  }

  if (!Number.isFinite(daysUntilExhausted)) {
    return {
      projectedExhaustionLabel: 'Resources look stable at current pace',
      projectedExhaustionDate: undefined,
    };
  }

  const target = new Date(Date.now() + daysUntilExhausted * 24 * 60 * 60 * 1000);
  return {
    projectedExhaustionLabel: `Approx. ${Math.max(1, Math.round(daysUntilExhausted))} day${Math.round(daysUntilExhausted) === 1 ? '' : 's'} left at current pace`,
    projectedExhaustionDate: target.toISOString(),
  };
}

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [users, history, transfers] = await Promise.all([
      getStoredUsers(),
      getHistoryEntries(),
      getFileTransfers(),
    ]);

    const storedUser = users.find((user) => user.email === session.user.email) || null;
    const plan = storedUser ? await getEffectiveSaasPlanForUser(storedUser) : null;
    const usageSummary = storedUser ? await getUserUsageSummary(storedUser, history) : null;
    const [virtualIds, certificates] = storedUser ? await Promise.all([
      getVisibleVirtualIdCards(storedUser),
      getVisibleCertificates(storedUser),
    ]) : [[], []];

    const visibleHistory = session.user.role === 'admin'
      ? history
      : session.user.role === 'employee'
        ? history.filter((entry) => entry.employeeEmail?.toLowerCase() === (session.user.email || '').toLowerCase())
        : session.user.role === 'client'
          ? history.filter((entry) => entry.organizationId === session.user.id || entry.clientEmail?.toLowerCase() === (session.user.email || '').toLowerCase())
          : history.filter((entry) => entry.generatedBy === session.user.email);

    const visibleTransfers = session.user.role === 'admin'
      ? transfers
      : session.user.role === 'client'
        ? transfers.filter((entry) => entry.organizationId === session.user.id || entry.uploadedBy.toLowerCase() === (session.user.email || '').toLowerCase())
        : transfers.filter((entry) => entry.uploadedBy.toLowerCase() === (session.user.email || '').toLowerCase());

    const lastThirtyDays = new Date();
    lastThirtyDays.setDate(lastThirtyDays.getDate() - 30);
    const monthlyDocuments = visibleHistory.filter((entry) => new Date(entry.generatedAt) >= lastThirtyDays).length;
    const averageDocumentsPerDay = monthlyDocuments / 30;
    const averageDocumentsPerWeek = averageDocumentsPerDay * 7;
    const remainingGenerations = usageSummary?.usage.remainingGenerations ?? 0;
    const daysUntilExhausted = averageDocumentsPerDay > 0 && remainingGenerations > 0
      ? remainingGenerations / averageDocumentsPerDay
      : averageDocumentsPerDay === 0
        ? Number.POSITIVE_INFINITY
        : null;
    const projection = formatExhaustion(daysUntilExhausted);
    const threshold = buildBillingThreshold(usageSummary?.usage.thresholdPercentUsed ?? 0, remainingGenerations);

    const limitations = [
      plan?.maxDocumentGenerations ? `${plan.maxDocumentGenerations} document generations in current billing cycle` : undefined,
      plan?.overagePriceLabel || undefined,
      typeof plan?.maxInternalUsers === 'number' ? `${plan.maxInternalUsers} internal users included` : undefined,
      typeof plan?.maxMailboxThreads === 'number'
        ? (plan.maxMailboxThreads > 0 ? `${plan.maxMailboxThreads} internal mailbox threads per cycle` : 'Internal mailbox is not included on current plan')
        : undefined,
      plan?.includedFeatures?.includes('doxpert') ? 'DoXpert AI included' : 'DoXpert AI not included on current plan',
      storedUser?.subscription
        ? `AI access: ${Math.max((storedUser.subscription.aiTrialLimit || 0) - (storedUser.subscription.aiTrialUsed || 0), 0)} free tries left, ${Math.max(storedUser.subscription.remainingAiCredits || 0, 0)} paid credits available`
        : undefined,
    ].filter(Boolean) as string[];

    const overview: ProfileOverview = {
      name: session.user.name || 'docrud user',
      email: session.user.email || '',
      role: session.user.role,
      organizationName: session.user.organizationName || undefined,
      subscription: {
        planId: storedUser?.subscription?.planId,
        planName: storedUser?.subscription?.planName || (session.user.role === 'admin' ? 'Super Admin Access' : 'docrud Workspace Trial'),
        status: storedUser?.subscription?.status || (session.user.role === 'admin' ? 'active' : 'trial'),
        billingModel: plan?.billingModel,
        priceLabel: plan?.priceLabel,
        maxDocumentGenerations: plan?.maxDocumentGenerations,
        remainingGenerations,
        totalGeneratedDocuments: usageSummary?.usage.totalGeneratedDocuments ?? visibleHistory.length,
        remainingAiTrialRuns: usageSummary?.usage.remainingAiTrialRuns ?? 0,
        monthlyAiCredits: storedUser?.subscription?.monthlyAiCredits || 0,
        remainingAiCredits: usageSummary?.usage.remainingAiCredits ?? 0,
        overagePriceLabel: plan?.overagePriceLabel,
        currentPeriodStart: storedUser?.subscription?.currentPeriodStart || storedUser?.subscription?.startedAt,
        currentPeriodEnd: storedUser?.subscription?.currentPeriodEnd || storedUser?.subscription?.renewalDate,
        lastPaymentAt: storedUser?.subscription?.lastPaymentAt,
        roadmapPromotion: getRoadmapPromotionSnapshot(storedUser?.subscription),
      },
      limitations,
      threshold: {
        state: threshold.state,
        percentUsed: usageSummary?.usage.thresholdPercentUsed ?? 0,
        recommendation: threshold.recommendation,
      },
      usage: {
        totalDocuments: visibleHistory.length,
        documentsThisMonth: monthlyDocuments,
        averageDocumentsPerWeek: Number(averageDocumentsPerWeek.toFixed(1)),
        averageDocumentsPerDay: Number(averageDocumentsPerDay.toFixed(2)),
        remainingGenerations,
        projectedExhaustionLabel: projection.projectedExhaustionLabel,
        projectedExhaustionDate: projection.projectedExhaustionDate,
        activeFileTransfers: visibleTransfers.filter((entry) => !entry.revokedAt).length,
        totalFileTransfers: visibleTransfers.length,
        fileTransferDownloads: visibleTransfers.reduce((sum, entry) => sum + (entry.downloadCount || 0), 0),
        totalVirtualIds: virtualIds.length,
        totalVirtualIdScans: virtualIds.reduce((sum, entry) => sum + entry.analytics.scanCount, 0),
        totalCertificates: certificates.length,
        totalCertificateDownloads: certificates.reduce((sum, entry) => sum + entry.analytics.downloadCount, 0),
      },
    };

    return NextResponse.json(overview);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load profile overview' }, { status: 500 });
  }
}
