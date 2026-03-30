import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/auth';
import { appendHistoryEntry, getHistoryEntries, updateHistoryEntry } from '@/lib/server/history';
import { DocumentHistory } from '@/types/document';
import { defaultBackgroundVerificationDocuments, ensureEmployeeAccessAccount, isOnboardingTemplate } from '@/lib/server/onboarding';
import { getStoredUsers } from '@/lib/server/auth';
import { canUserAccessFeature, getUserUsageSummary } from '@/lib/server/saas';
import { getBusinessSettings } from '@/lib/server/business';

export const dynamic = 'force-dynamic';

function getEmployeeName(payload: Partial<DocumentHistory>) {
  return payload.employeeName
    || payload.clientName
    || payload.data?.internFullName
    || payload.data?.engagedIndividualName
    || payload.data?.employeeName
    || 'Employee';
}

function getEmployeeEmail(payload: Partial<DocumentHistory>) {
  return payload.employeeEmail
    || payload.clientEmail
    || payload.data?.employeeEmail
    || payload.data?.internEmail
    || payload.data?.candidateEmail
    || payload.data?.email
    || '';
}

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const history = await getHistoryEntries();
    const visibleHistory = session.user.role === 'admin'
      ? history
      : session.user.role === 'employee'
        ? history.filter((entry) => entry.employeeEmail?.toLowerCase() === (session.user.email || '').toLowerCase())
      : session.user.role === 'client'
        ? history.filter((entry) => entry.organizationId === session.user.id || entry.clientEmail?.toLowerCase() === (session.user.email || '').toLowerCase())
        : history.filter((entry) => entry.generatedBy === session.user.email);

    return NextResponse.json(visibleHistory);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json() as Partial<DocumentHistory>;
    const storedUser = (await getStoredUsers()).find((user) => user.email === session.user.email);
    if (storedUser?.role === 'client') {
      const [canGenerate, usageSummary] = await Promise.all([
        canUserAccessFeature(storedUser, 'generate_documents'),
        getUserUsageSummary(storedUser),
      ]);

      if (!canGenerate) {
        return NextResponse.json({ error: 'Your current plan does not include document generation.' }, { status: 403 });
      }

      if (usageSummary.usage.limitReached) {
        return NextResponse.json({
          error: `You have reached the document generation limit for the ${usageSummary.plan?.name || 'current'} plan. Upgrade the plan to continue generating documents.`,
        }, { status: 403 });
      }
    }

    const onboardingRequired = payload.onboardingRequired ?? isOnboardingTemplate(payload.templateId, payload.category);
    const employeeEmail = getEmployeeEmail(payload).trim().toLowerCase();
    const employeeName = getEmployeeName(payload).trim();
    const employeeAccount = onboardingRequired && employeeEmail
      ? await ensureEmployeeAccessAccount({
          employeeName,
          employeeEmail,
          permissions: [String(payload.templateId || 'internship-letter')],
        })
      : null;
    const [clientPlanUsage, clientBusinessSettings] = storedUser?.role === 'client' && storedUser
      ? await Promise.all([
          getUserUsageSummary(storedUser),
          getBusinessSettings(storedUser.id, storedUser.organizationName),
        ])
      : [null, null];
    const shouldApplyFreeWatermark = Boolean(
      storedUser?.role === 'client'
      && clientPlanUsage?.plan?.watermarkOnFreeGenerations
      && clientPlanUsage.usage.totalGeneratedDocuments < (clientPlanUsage.plan?.freeDocumentGenerations ?? 5),
    );
    const historyEntry = await appendHistoryEntry({
      ...payload,
      generatedBy: session.user.email || payload.generatedBy || 'unknown',
      generatedAt: payload.generatedAt || new Date().toISOString(),
      clientEmail: storedUser?.role === 'client' ? storedUser.email : payload.clientEmail || undefined,
      clientName: storedUser?.role === 'client' ? storedUser.name : payload.clientName || undefined,
      clientOrganization: storedUser?.role === 'client' ? storedUser.organizationName : payload.clientOrganization || undefined,
      organizationId: storedUser?.role === 'client' ? storedUser.id : payload.organizationId,
      organizationName: storedUser?.role === 'client' ? storedUser.organizationName : payload.organizationName,
      shareAccessPolicy: payload.shareAccessPolicy,
      shareExpiresAt: payload.shareExpiresAt,
      maxAccessCount: payload.maxAccessCount,
      employeeName: employeeName || undefined,
      employeeEmail: employeeEmail || undefined,
      onboardingRequired,
      backgroundVerificationRequired: onboardingRequired,
      requiredDocumentWorkflowEnabled: onboardingRequired ? true : payload.requiredDocumentWorkflowEnabled,
      requiredDocuments: onboardingRequired ? defaultBackgroundVerificationDocuments : payload.requiredDocuments,
      backgroundVerificationStatus: onboardingRequired ? 'not_started' : payload.backgroundVerificationStatus,
      onboardingCredentials: employeeAccount ? {
        email: employeeAccount.user.email,
        temporaryPassword: employeeAccount.temporaryPassword,
        generatedAt: new Date().toISOString(),
      } : payload.onboardingCredentials,
      automationNotes: [
        ...(payload.automationNotes || []),
        ...(employeeAccount ? [`Employee onboarding credentials generated for ${employeeAccount.user.email}`] : []),
        ...(storedUser?.role === 'client' ? [`Generated under SaaS plan ${storedUser.subscription?.planName || 'Free Starter'}`] : []),
      ],
      editorState: {
        ...(payload.editorState || {}),
        watermarkLabel: shouldApplyFreeWatermark ? (clientBusinessSettings?.watermarkLabel || 'docrud trial workspace') : payload.editorState?.watermarkLabel,
      },
    });

    return NextResponse.json(historyEntry, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json() as Partial<DocumentHistory> & { id?: string };
    if (!payload.id) {
      return NextResponse.json({ error: 'History ID is required' }, { status: 400 });
    }

    const history = await getHistoryEntries();
    const current = history.find((entry) => entry.id === payload.id);
    if (!current) {
      return NextResponse.json({ error: 'History entry not found' }, { status: 404 });
    }

    const allowed = session.user.role === 'admin'
      || (session.user.role === 'client' && (current.organizationId === session.user.id || current.clientEmail?.toLowerCase() === (session.user.email || '').toLowerCase()))
      || (session.user.role === 'employee' && current.employeeEmail?.toLowerCase() === (session.user.email || '').toLowerCase())
      || current.generatedBy === session.user.email;
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await updateHistoryEntry(payload.id, (entry) => ({
      ...entry,
      ...payload,
      deliveryHistory: payload.deliveryHistory || entry.deliveryHistory,
    }));

    if (!updated) {
      return NextResponse.json({ error: 'History entry not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update history' }, { status: 500 });
  }
}
