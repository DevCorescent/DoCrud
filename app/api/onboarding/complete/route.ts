import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, getStoredUsers } from '@/lib/server/auth';
import { updateProfileData, type UserProfileData } from '@/lib/server/user-profiles';

export const dynamic = 'force-dynamic';

async function getActor() {
  const session = await getAuthSession();
  if (!session?.user?.email) return null;
  const users = await getStoredUsers();
  return users.find((u) => u.email.toLowerCase() === session.user!.email!.toLowerCase()) ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as { profile?: Partial<UserProfileData> };
    const profilePayload = body.profile ?? {};

    await updateProfileData(actor.id, {
      ...profilePayload,
      onboardingDone: true,
      profileSetupDone: true,
    });

    return NextResponse.json({ done: true });
  } catch (error) {
    console.error('[onboarding/complete] POST error', error);
    return NextResponse.json({ error: 'Failed to complete onboarding.' }, { status: 500 });
  }
}
