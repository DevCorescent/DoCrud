export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthSession, getStoredUsers, saveStoredUsers } from '@/lib/server/auth';

export async function POST() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const users = await getStoredUsers();
    const userIndex = users.findIndex((u) => u.id === session.user.id);

    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedUsers = users.map((u) =>
      u.id === session.user.id ? { ...u, isActive: false } : u,
    );

    await saveStoredUsers(updatedUsers);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
