import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminEmail, getSuperAdminSessionFromRequest } from '@/lib/server/super-admin-auth';

export async function GET(req: NextRequest) {
  const session = getSuperAdminSessionFromRequest(req);
  return NextResponse.json({
    authenticated: session.valid,
    email: session.valid ? session.email : undefined,
    configured: Boolean(getSuperAdminEmail()),
  });
}
