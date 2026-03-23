import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import { promises as fs } from 'fs';
import path from 'path';
import { User } from '../../../../types/document';

const usersPath = path.join(process.cwd(), 'data', 'users.json');

async function getUsers(): Promise<(User & { password: string })[]> {
  try {
    const data = await fs.readFile(usersPath, 'utf8');
    const users = JSON.parse(data);
    // Add default passwords for existing users
    return users.map((user: User) => ({
      ...user,
      password: `${user.role}123`, // Default password pattern
    }));
  } catch (error) {
    // Fallback to default users if file doesn't exist
    return [
      {
        id: '1',
        email: 'admin@company.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin',
        permissions: ['all'],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        email: 'hr@company.com',
        password: 'hr123',
        name: 'HR Manager',
        role: 'hr',
        permissions: ['appointment-letter', 'offer-letter', 'termination-letter', 'resignation-letter', 'performance-appraisal'],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '3',
        email: 'legal@company.com',
        password: 'legal123',
        name: 'Legal Advisor',
        role: 'legal',
        permissions: ['nda', 'employment-contract', 'loan-agreement', 'service-agreement', 'partnership-agreement'],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const users = await getUsers();
        const user = users.find(u => u.email === credentials.email && u.password === credentials.password && u.isActive);

        if (user) {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.role = user.role;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.role = token.role;
        session.user.permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };