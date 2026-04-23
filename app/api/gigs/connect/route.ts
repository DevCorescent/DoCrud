import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, getStoredUsers } from '@/lib/server/auth';
import { createGigConnectionRequest } from '@/lib/server/gigs';

export const dynamic = 'force-dynamic';

async function getActor() {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return null;
  }

  const users = await getStoredUsers();
  return users.find((entry) => entry.email.toLowerCase() === session.user!.email!.toLowerCase()) || null;
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getActor();
    if (!actor) {
      return NextResponse.json({ error: 'Login required to connect.' }, { status: 401 });
    }

    const payload = await request.json() as {
      gigId?: string;
      note?: string;
      interestArea?: string;
      portfolioUrl?: string;
    };

    if (!payload.gigId || !payload.note?.trim()) {
      return NextResponse.json({ error: 'Gig and intro note are required.' }, { status: 400 });
    }

    const connection = await createGigConnectionRequest(actor, {
      gigId: payload.gigId,
      note: payload.note,
      interestArea: payload.interestArea,
      portfolioUrl: payload.portfolioUrl,
    });

    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to connect right now.' }, { status: 400 });
  }
}
