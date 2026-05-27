import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/auth';
import { createShareRecord, listShareRecordsForItem, generateShareToken } from '@/lib/server/share-store';
import type { ShareRecord, SharePermission, ShareableKind } from '@/lib/shareStore';

export const dynamic = 'force-dynamic';

/** GET /api/v1/shares?itemId=xxx — list active shares for an item (auth required) */
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const itemId = req.nextUrl.searchParams.get('itemId');
  if (!itemId) return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });

  const shares = await listShareRecordsForItem(itemId);
  return NextResponse.json({ ok: true, data: shares });
}

/** POST /api/v1/shares — create a new share (auth required) */
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    kind: ShareableKind;
    itemId: string;
    itemName: string;
    fileKind?: string;
    permission: SharePermission;
    expiresIn?: number;
    password?: string;
  };

  const { kind, itemId, itemName, fileKind, permission, expiresIn, password } = body;
  if (!kind || !itemId || !itemName || !permission) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const record: ShareRecord = {
    token:     generateShareToken(),
    kind,
    itemId,
    itemName,
    fileKind,
    permission,
    createdAt: Date.now(),
    expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
    password:  password?.trim() || undefined,
    accessCount: 0,
    addedBy:     [],
    collabSessions: [],
    ownerName: session.user.name || session.user.email || 'You',
    revoked:   false,
  };

  await createShareRecord(record);
  return NextResponse.json({ ok: true, data: record });
}
