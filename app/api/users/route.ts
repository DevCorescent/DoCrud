import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { User } from '../../../types/document';

const usersPath = path.join(process.cwd(), 'data', 'users.json');

async function getUsers(): Promise<User[]> {
  try {
    const data = await fs.readFile(usersPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveUsers(users: User[]): Promise<void> {
  await fs.writeFile(usersPath, JSON.stringify(users, null, 2));
}

export async function GET() {
  try {
    const users = await getUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'> = await request.json();

    const users = await getUsers();

    // Check if email already exists
    if (users.some(u => u.email === userData.email)) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await saveUsers(users);

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updates }: Partial<User> & { id: string } = await request.json();

    const users = await getUsers();
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    users[userIndex] = { ...users[userIndex], ...updates };
    await saveUsers(users);

    return NextResponse.json(users[userIndex]);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const users = await getUsers();
    const filteredUsers = users.filter(u => u.id !== id);

    if (filteredUsers.length === users.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await saveUsers(filteredUsers);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}