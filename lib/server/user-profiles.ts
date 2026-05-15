import { readJsonFile, writeJsonFile, userProfilesPath, followsPath } from '@/lib/server/storage';

export interface UserProfileData {
  headline?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatarUrl?: string;
  avatarPosition?: string;
  coverGradient?: string;
  coverPosition?: string;
  skills?: string[];
  experience?: Array<{ title: string; company: string; period: string; desc?: string }>;
  education?: Array<{ degree: string; school: string; year?: string }>;
  achievements?: Array<{ title: string; desc?: string }>;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
    youtube?: string;
  };
  openToWork?: boolean;
  pronouns?: string;
  updatedAt?: string;
  profileSetupDone?: boolean;
  onboardingDone?: boolean;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  interests?: string[];
  docrudGo?: boolean;
  docrudGoPurchasedAt?: string;
  docrudGoReferralGrantedAt?: string;
  docrudGoGrantedFree?: boolean;
}

export interface FollowsData {
  [followerId: string]: string[];
}

export async function getAllProfiles(): Promise<Record<string, UserProfileData>> {
  return readJsonFile<Record<string, UserProfileData>>(userProfilesPath, {});
}

export async function getProfileData(userId: string): Promise<UserProfileData> {
  const profiles = await getAllProfiles();
  return profiles[userId] ?? {};
}

export async function updateProfileData(userId: string, data: Partial<UserProfileData>): Promise<void> {
  const profiles = await getAllProfiles();
  profiles[userId] = {
    ...(profiles[userId] ?? {}),
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await writeJsonFile(userProfilesPath, profiles);
}

async function getFollowsData(): Promise<FollowsData> {
  return readJsonFile<FollowsData>(followsPath, {});
}

async function saveFollowsData(data: FollowsData): Promise<void> {
  await writeJsonFile(followsPath, data);
}

export async function getFollowers(userId: string): Promise<string[]> {
  const follows = await getFollowsData();
  return Object.entries(follows)
    .filter(([, followedIds]) => followedIds.includes(userId))
    .map(([followerId]) => followerId);
}

export async function getFollowing(userId: string): Promise<string[]> {
  const follows = await getFollowsData();
  return follows[userId] ?? [];
}

export async function isFollowing(followerId: string, targetId: string): Promise<boolean> {
  const following = await getFollowing(followerId);
  return following.includes(targetId);
}

export async function followUser(followerId: string, targetId: string): Promise<void> {
  const follows = await getFollowsData();
  const current = follows[followerId] ?? [];
  if (!current.includes(targetId)) {
    follows[followerId] = [...current, targetId];
    await saveFollowsData(follows);
  }
}

export async function unfollowUser(followerId: string, targetId: string): Promise<void> {
  const follows = await getFollowsData();
  const current = follows[followerId] ?? [];
  follows[followerId] = current.filter((id) => id !== targetId);
  await saveFollowsData(follows);
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [followers, following] = await Promise.all([getFollowers(userId), getFollowing(userId)]);
  return { followers: followers.length, following: following.length };
}
