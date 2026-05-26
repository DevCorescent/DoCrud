import { NextRequest, NextResponse } from 'next/server';
import { getShareRecord, recordShareAccess, revokeShareRecord } from '@/lib/server/share-store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/shares/[token] — public; anyone with the token can view the share metadata */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const record = await getShareRecord(params.token);
  if (!record) {
    return NextResponse.json({ ok: false, error: 'Share not found or expired' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: record });
}

/** PATCH /api/v1/shares/[token]
 *  { recordAccess: true } — increment view counter
 *  { revoke: true }       — mark share as revoked
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const body = await req.json().catch(() => ({})) as { recordAccess?: boolean; revoke?: boolean };

  if (body.recordAccess) {
    await recordShareAccess(params.token);
    return NextResponse.json({ ok: true });
  }

  if (body.revoke) {
    await revokeShareRecord(params.token);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Specify recordAccess or revoke' }, { status: 400 });
}
