import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, getStoredUsers } from '@/lib/server/auth';
import { createGigBid, updateGigBidStatus } from '@/lib/server/gigs';
import type { GigBid } from '@/types/document';

export const dynamic = 'force-dynamic';

async function getActor() {
  const session = await getAuthSession();
  if (!session?.user?.email) return null;
  const users = await getStoredUsers();
  const normalizedEmail = (session.user.email || '').trim().toLowerCase();
  return users.find((entry) => entry.email.trim().toLowerCase() === normalizedEmail) || null;
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getActor();
    if (!actor) {
      return NextResponse.json({ error: 'Login required.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as any;
    const gigId = typeof body?.gigId === 'string' ? body.gigId : '';
    const note = typeof body?.note === 'string' ? body.note : '';
    const timelineLabel = typeof body?.timelineLabel === 'string' ? body.timelineLabel : '';
    const amountInRupees = Number(body?.amountInRupees);

    if (!gigId || !Number.isFinite(amountInRupees) || !note.trim()) {
      return NextResponse.json({ error: 'Gig, amount, and note are required.' }, { status: 400 });
    }

    const bid = await createGigBid(actor, {
      gigId,
      amountInRupees,
      timelineLabel: timelineLabel.trim() || undefined,
      note,
    });

    return NextResponse.json(bid, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to submit bid.' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await getActor();
    if (!actor) {
      return NextResponse.json({ error: 'Login required.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as any;
    const id = typeof body?.id === 'string' ? body.id : '';
    const status = typeof body?.status === 'string' ? body.status : '';

    const allowed: GigBid['status'][] = ['submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn'];
    if (!id || !allowed.includes(status as GigBid['status'])) {
      return NextResponse.json({ error: 'Bid update payload is incomplete.' }, { status: 400 });
    }

    const bid = await updateGigBidStatus(actor, id, status as GigBid['status']);
    return NextResponse.json(bid);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update bid.' }, { status: 400 });
  }
}

