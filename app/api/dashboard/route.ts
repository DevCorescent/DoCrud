import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/auth';
import { buildDashboardMetrics } from '@/lib/server/dashboard';
import { getHistoryEntries } from '@/lib/server/history';

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

    return NextResponse.json(buildDashboardMetrics(visibleHistory));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
  }
}
