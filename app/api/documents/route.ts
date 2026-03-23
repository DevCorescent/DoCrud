import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/auth';
import { createAccessEvent, getHistoryEntries, updateHistoryEntry } from '@/lib/server/history';

export const dynamic = 'force-dynamic';

function isAdmin(session: Awaited<ReturnType<typeof getAuthSession>>) {
  return session?.user?.role === 'admin';
}

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(await getHistoryEntries());
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load documents' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await request.json() as {
      id?: string;
      documentsVerificationStatus?: 'verified' | 'rejected';
      documentsVerificationNotes?: string;
    };
    if (!payload.id || !payload.documentsVerificationStatus) {
      return NextResponse.json({ error: 'Document id and verification status are required' }, { status: 400 });
    }

    const history = await getHistoryEntries();
    const existing = history.find((entry) => entry.id === payload.id);
    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    if (!existing.requiredDocumentWorkflowEnabled) {
      return NextResponse.json({ error: 'Required-document workflow is not enabled for this document' }, { status: 400 });
    }
    if (payload.documentsVerificationStatus === 'verified' && !existing.submittedDocuments?.length) {
      return NextResponse.json({ error: 'Recipient documents must be submitted before verification' }, { status: 400 });
    }

    const verifiedAt = new Date().toISOString();

    const updated = await updateHistoryEntry(payload.id, (entry) => ({
      ...entry,
      documentsVerificationStatus: payload.documentsVerificationStatus,
      documentsVerificationNotes: payload.documentsVerificationNotes?.trim() || undefined,
      documentsVerifiedAt: verifiedAt,
      documentsVerifiedBy: session?.user?.email || 'admin',
      accessEvents: [
        createAccessEvent({
          eventType: 'verify',
          createdAt: verifiedAt,
          actorName: session?.user?.email || 'admin',
        }),
        ...(entry.accessEvents || []),
      ].slice(0, 50),
      automationNotes: [
        ...(entry.automationNotes || []),
        `Required documents ${payload.documentsVerificationStatus} by ${session?.user?.email || 'admin'}`,
      ],
    }));

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update document verification' }, { status: 500 });
  }
}
