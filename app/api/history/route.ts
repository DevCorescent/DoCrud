import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/auth';
import { appendHistoryEntry, getHistoryEntries, updateHistoryEntry } from '@/lib/server/history';
import { DocumentHistory } from '@/types/document';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const history = await getHistoryEntries();
    const visibleHistory = session.user.role === 'admin'
      ? history
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
    const historyEntry = await appendHistoryEntry({
      ...payload,
      generatedBy: session.user.email || payload.generatedBy || 'unknown',
      generatedAt: payload.generatedAt || new Date().toISOString(),
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
