import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminSessionFromRequest } from '@/lib/server/super-admin-auth';
import { getUserIntelligenceOverview } from '@/lib/server/user-intelligence';

function guard(req: NextRequest) {
  const s = getSuperAdminSessionFromRequest(req);
  return s.valid ? s : null;
}

export async function GET(req: NextRequest) {
  const session = guard(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const overview = await getUserIntelligenceOverview();
    return NextResponse.json({ ...overview, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[super-admin/user-intelligence GET]', err);
    return NextResponse.json({ error: 'Failed to load user intelligence' }, { status: 500 });
  }
}
