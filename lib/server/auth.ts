import { type NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { User } from '@/types/document';
import { createPasswordHash, normalizeEmail, verifyPassword } from '@/lib/server/security';
import { defaultRoleProfiles } from '@/lib/server/roles';
import { applyRoadmapPromotionToSubscription, getDefaultPublicPlan, getEffectiveSaasPlanForUser } from '@/lib/server/saas';
import { getStoredUsersFromRepository, saveStoredUsersToRepository } from '@/lib/server/repositories';
import { buildPolicyAcceptance } from '@/lib/policy-consent';
import { getAuthSettingsSync } from '@/lib/server/settings';

export interface StoredUser extends User {
  passwordHash?: string;
  passwordSalt?: string;
}

const defaultUsers: StoredUser[] = [
  {
    id: '1',
    email: 'admin@company.com',
    name: 'Admin User',
    role: 'admin',
    accountType: 'business',
    permissions: ['all'],
    roleProfileId: defaultRoleProfiles[0].id,
    roleProfileName: defaultRoleProfiles[0].name,
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
    accountType: 'business',
    permissions: ['appointment-letter', 'offer-letter', 'termination-letter', 'resignation-letter', 'performance-appraisal', 'internship-letter'],
    roleProfileId: defaultRoleProfiles[1].id,
    roleProfileName: defaultRoleProfiles[1].name,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    ...createPasswordHash('hr123'),
  },
  {
    id: '3',
    email: 'legal@company.com',
    name: 'Legal Advisor',
    role: 'legal',
    accountType: 'business',
    permissions: ['nda', 'employment-contract', 'loan-agreement', 'service-agreement', 'partnership-agreement', 'contractual-agreement'],
    roleProfileId: defaultRoleProfiles[2].id,
    roleProfileName: defaultRoleProfiles[2].name,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    ...createPasswordHash('legal123'),
  },
];

function getLegacyPassword(user: User) {
  return user.role === 'client' || user.role === 'employee' ? `${user.role}123` : `${user.role}123`;
}

function getAuthSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
}

function normalizeLoginId(value: string) {
  return value.trim().toLowerCase();
}

function getGoogleProviderConfig() {
  const settings = getAuthSettingsSync();
  if (!settings.googleEnabled || !settings.googleClientId || !settings.googleClientSecret) {
    return null;
  }

  return {
    clientId: settings.googleClientId,
    clientSecret: settings.googleClientSecret,
  };
}

export async function getStoredUsers(): Promise<StoredUser[]> {
  const users = await getStoredUsersFromRepository<StoredUser>(defaultUsers);
  return users.map((user) => ({
    ...user,
    email: normalizeEmail(user.email),
  }));
}

export async function saveStoredUsers(users: StoredUser[]) {
  await saveStoredUsersToRepository(users);
}

async function upsertGoogleUser(profile: { email: string; name?: string | null }) {
  const normalizedEmail = normalizeEmail(profile.email);
  const users = await getStoredUsers();
  const existing = users.find((entry) => entry.email === normalizedEmail);
  const now = new Date().toISOString();

  if (existing) {
    const updatedUsers = users.map((entry) =>
      entry.id === existing.id
        ? {
            ...entry,
            name: profile.name?.trim() || entry.name,
            lastLogin: now,
            isActive: true,
            policyAcceptance: buildPolicyAcceptance('login'),
            subscription: applyRoadmapPromotionToSubscription(entry.subscription, now),
          }
        : entry,
    );
    await saveStoredUsers(updatedUsers);
    const refreshedUser = updatedUsers.find((entry) => entry.id === existing.id) || existing;
    const { passwordHash, passwordSalt, ...safeUser } = refreshedUser;
    return safeUser;
  }

  const individualPlan = await getDefaultPublicPlan('individual');
  const createdUser: StoredUser = {
    id: `individual-google-${Date.now()}`,
    email: normalizedEmail,
    name: profile.name?.trim() || normalizedEmail.split('@')[0],
    role: 'individual',
    accountType: 'individual',
    permissions: ['self'],
    isActive: true,
    createdAt: now,
    lastLogin: now,
    organizationName: 'Individual Workspace',
    createdFromSignup: true,
    policyAcceptance: buildPolicyAcceptance('login'),
    subscription: individualPlan
      ? applyRoadmapPromotionToSubscription({
          planId: individualPlan.id,
          planName: individualPlan.name,
          status: individualPlan.billingModel === 'payg' ? 'active' : 'trial',
          startedAt: now,
        }, now)
      : undefined,
  };

  await saveStoredUsers([...users, createdUser]);
  const { passwordHash, passwordSalt, ...safeUser } = createdUser;
  return safeUser;
}

export async function authenticateUser(identifier: string, password: string, policyAccepted = false): Promise<User | null> {
  const normalizedIdentifier = identifier.trim();
  const normalizedEmail = normalizeEmail(identifier);
  const normalizedLoginId = normalizeLoginId(identifier);
  const users = await getStoredUsers();
  const user = users.find((entry) =>
    entry.isActive
    && (
      entry.email === normalizedEmail
      || (entry.loginId && normalizeLoginId(entry.loginId) === normalizedLoginId)
      || entry.email === normalizedIdentifier
    ),
  );

  if (!user) {
    return null;
  }

  const isValidPassword =
    verifyPassword(password, user.passwordHash, user.passwordSalt) ||
    password === getLegacyPassword(user);

  if (!isValidPassword) {
    return null;
  }

  if (!policyAccepted) {
    return null;
  }

  const updatedUsers = users.map((entry) =>
    entry.id === user.id
      ? {
          ...entry,
          lastLogin: new Date().toISOString(),
          subscription: applyRoadmapPromotionToSubscription(entry.subscription, new Date().toISOString()),
          policyAcceptance: buildPolicyAcceptance('login'),
        }
      : entry
  );
  await saveStoredUsers(updatedUsers);

  const refreshedUser = updatedUsers.find((entry) => entry.id === user.id) || user;
  const { passwordHash, passwordSalt, ...safeUser } = refreshedUser;
  return {
    ...safeUser,
    lastLogin: new Date().toISOString(),
  };
}

export function buildAuthOptions(): NextAuthOptions {
  const providerList: NextAuthOptions['providers'] = [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email or Login ID', type: 'text' },
        password: { label: 'Password', type: 'password' },
        policyAccepted: { label: 'Policy Accepted', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        return authenticateUser(credentials.email, credentials.password, credentials.policyAccepted === 'accepted');
      },
    }),
  ];

  const googleProvider = getGoogleProviderConfig();
  if (googleProvider) {
    providerList.push(
      GoogleProvider({
        clientId: googleProvider.clientId,
        clientSecret: googleProvider.clientSecret,
      }),
    );
  }

  return {
    secret: getAuthSecret(),
    session: {
      strategy: 'jwt',
      maxAge: 60 * 60 * 24 * 90,
      updateAge: 60 * 60 * 24,
    },
    jwt: {
      maxAge: 60 * 60 * 24 * 90,
    },
    providers: providerList,
    callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        if (!user.email) {
          return false;
        }
        await upsertGoogleUser({ email: user.email, name: user.name });
      }
      return true;
    },
    async jwt({ token, user }) {
      const lookupEmail = normalizeEmail(String(user?.email || token.email || ''));
      if (lookupEmail) {
        const users = await getStoredUsers();
        const storedUser = users.find((entry) => entry.email === lookupEmail);
        if (storedUser) {
          const plan = await getEffectiveSaasPlanForUser(storedUser);
          token.id = storedUser.id;
          token.role = storedUser.role;
          token.permissions = storedUser.permissions;
          token.organizationName = storedUser.organizationName;
          token.subscription = storedUser.subscription;
          token.planFeatures = plan?.includedFeatures || [];
          token.accountType = storedUser.accountType;
          token.workspaceAccessMode = storedUser.workspaceAccessMode;
          token.boardRoomIds = storedUser.boardRoomIds || [];
        }
      } else if (user) {
        const plan = await getEffectiveSaasPlanForUser(user);
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
        token.organizationName = user.organizationName;
        token.subscription = user.subscription;
        token.planFeatures = plan?.includedFeatures || [];
        token.accountType = user.accountType;
        token.workspaceAccessMode = user.workspaceAccessMode;
        token.boardRoomIds = user.boardRoomIds || [];
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? '');
        session.user.role = String(token.role ?? 'user');
        session.user.permissions = Array.isArray(token.permissions) ? token.permissions.map(String) : [];
        session.user.organizationName = token.organizationName ? String(token.organizationName) : undefined;
        session.user.subscription = token.subscription;
        session.user.planFeatures = Array.isArray(token.planFeatures) ? token.planFeatures.map(String) : [];
        session.user.accountType = token.accountType === 'individual' ? 'individual' : 'business';
        session.user.workspaceAccessMode = token.workspaceAccessMode === 'board_room_only' ? 'board_room_only' : 'standard';
        session.user.boardRoomIds = Array.isArray(token.boardRoomIds) ? token.boardRoomIds.map(String) : [];
      }

      return session;
    },
  },
    pages: {
      signIn: '/login',
    },
  };
}

export const authOptions: NextAuthOptions = buildAuthOptions();

export function getAuthSession() {
  return getServerSession(buildAuthOptions());
}
