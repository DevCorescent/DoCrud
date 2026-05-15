export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getAuthSession, getStoredUsers, saveStoredUsers } from '@/lib/server/auth';
import { readJsonFile, writeJsonFile, userProfilesPath, followsPath } from '@/lib/server/storage';

const CREDITS_FILE = path.join(process.cwd(), 'data', 'credits.json');

function hashPassword(password: string, salt: string): string {
  return crypto.createHmac('sha512', salt).update(password).digest('hex');
}

interface CreditsStore {
  users: Record<string, unknown>;
}

export async function DELETE(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { confirmPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.confirmPassword) {
    return NextResponse.json({ error: 'confirmPassword is required' }, { status: 400 });
  }

  try {
    const users = await getStoredUsers();
    const user = users.find((u) => u.id === session.user.id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify password
    if (!user.passwordHash || !user.passwordSalt) {
      return NextResponse.json({ error: 'Cannot verify password for this account' }, { status: 400 });
    }

    const inputHash = hashPassword(body.confirmPassword, user.passwordSalt);
    if (inputHash !== user.passwordHash) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });
    }

    // Remove from users.json
    const updatedUsers = users.filter((u) => u.id !== session.user.id);
    await saveStoredUsers(updatedUsers);

    // Remove from user-profiles.json
    const profiles = await readJsonFile<Record<string, unknown>>(userProfilesPath, {});
    delete profiles[session.user.id];
    await writeJsonFile(userProfilesPath, profiles);

    // Remove from credits.json
    try {
      const creditsContent = await fs.readFile(CREDITS_FILE, 'utf8');
      const creditsStore = JSON.parse(creditsContent) as CreditsStore;
      delete creditsStore.users[session.user.id];
      await fs.writeFile(CREDITS_FILE, JSON.stringify(creditsStore, null, 2), 'utf8');
    } catch {
      // credits file may not exist — ignore
    }

    // Remove from follows.json
    const follows = await readJsonFile<Record<string, string[]>>(followsPath, {});
    // Remove this user's own follows
    delete follows[session.user.id];
    // Remove this user from others' follow lists
    for (const followerId of Object.keys(follows)) {
      follows[followerId] = follows[followerId].filter((id) => id !== session.user.id);
    }
    await writeJsonFile(followsPath, follows);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
