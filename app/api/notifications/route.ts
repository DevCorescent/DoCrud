import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, getStoredUsers } from '@/lib/server/auth';
import { getWorkspaceNotifications, markWorkspaceNotificationsRead } from '@/lib/server/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAuthSession();
    const sessionEmail = session?.user?.email;
    if (!sessionEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await getStoredUsers();
    const storedUser = users.find((entry) => entry.email.toLowerCase() === sessionEmail.toLowerCase());
    if (!storedUser) {
      return NextResponse.json({ error: 'Workspace user not found.' }, { status: 404 });
    }

    const payload = await getWorkspaceNotifications(storedUser);
    return NextResponse.json(payload);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load notifications.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    const sessionEmail = session?.user?.email;
    if (!sessionEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await getStoredUsers();
    const storedUser = users.find((entry) => entry.email.toLowerCase() === sessionEmail.toLowerCase());
    if (!storedUser) {
      return NextResponse.json({ error: 'Workspace user not found.' }, { status: 404 });
    }
    const body = await request.json().catch(() => null);
    const ids = Array.isArray(body?.ids) ? body.ids.map(String) : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Notification ids are required.' }, { status: 400 });
    }

    await markWorkspaceNotificationsRead(storedUser.id, ids);
    const payload = await getWorkspaceNotifications(storedUser);
    return NextResponse.json(payload);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update notifications.' }, { status: 500 });
  }
}
