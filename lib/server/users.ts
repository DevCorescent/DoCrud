import { User } from '@/types/document';
import { createPasswordHash, normalizeEmail } from '@/lib/server/security';
import { defaultRoleProfiles } from '@/lib/server/roles';
import { getStoredUsersFromRepository, saveStoredUsersToRepository } from '@/lib/server/repositories';

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
