import { type NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { User } from '@/types/document';
import { readJsonFile, usersPath, writeJsonFile } from '@/lib/server/storage';
import { createPasswordHash, normalizeEmail, verifyPassword } from '@/lib/server/security';

interface StoredUser extends User {
  passwordHash?: string;
  passwordSalt?: string;
}

const defaultUsers: StoredUser[] = [
  {
    id: '1',
    email: 'admin@company.com',
    name: 'Admin User',
    role: 'admin',
    permissions: ['all'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    lastLogin: '2024-01-01T00:00:00Z',
    ...createPasswordHash('admin123'),
  },
  {
    id: '2',
    email: 'hr@company.com',
    name: 'HR Manager',
    role: 'hr',
    permissions: ['appointment-letter', 'offer-letter', 'termination-letter', 'resignation-letter', 'performance-appraisal', 'internship-letter'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    ...createPasswordHash('hr123'),
  },
  {
    id: '3',
    email: 'legal@company.com',
    name: 'Legal Advisor',
    role: 'legal',
    permissions: ['nda', 'employment-contract', 'loan-agreement', 'service-agreement', 'partnership-agreement', 'contractual-agreement'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    ...createPasswordHash('legal123'),
  },
];

function getLegacyPassword(user: User) {
  return `${user.role}123`;
}

function getAuthSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
}

export async function getStoredUsers() {
  const users = await readJsonFile<StoredUser[]>(usersPath, defaultUsers);
  return users.map((user) => ({
    ...user,
    email: normalizeEmail(user.email),
  }));
}

export async function saveStoredUsers(users: StoredUser[]) {
  await writeJsonFile(usersPath, users);
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const normalizedEmail = normalizeEmail(email);
  const users = await getStoredUsers();
  const user = users.find((entry) => entry.email === normalizedEmail && entry.isActive);

  if (!user) {
    return null;
  }

  const isValidPassword =
    verifyPassword(password, user.passwordHash, user.passwordSalt) ||
    password === getLegacyPassword(user);

  if (!isValidPassword) {
    return null;
  }

  const updatedUsers = users.map((entry) =>
    entry.id === user.id ? { ...entry, lastLogin: new Date().toISOString() } : entry
  );
  await saveStoredUsers(updatedUsers);

  const { passwordHash, passwordSalt, ...safeUser } = user;
  return {
    ...safeUser,
    lastLogin: new Date().toISOString(),
  };
}

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        return authenticateUser(credentials.email, credentials.password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? '');
        session.user.role = String(token.role ?? 'user');
        session.user.permissions = Array.isArray(token.permissions) ? token.permissions.map(String) : [];
      }

      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
