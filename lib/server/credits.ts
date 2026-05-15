import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

function uuidv4(): string {
  return crypto.randomUUID();
}

const CREDITS_FILE = path.join(process.cwd(), 'data', 'credits.json');

export interface UserCredits {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  streak: {
    current: number;
    longest: number;
    lastPostDate: string | null;
    streakStartDate: string | null;
  };
  milestones: string[];
  verified: boolean;
  transactions: Array<{
    id: string;
    type: 'earn' | 'spend';
    amount: number;
    reason: string;
    description: string;
    createdAt: string;
  }>;
  dailyEarnLog: Record<string, string[]>;
}

interface CreditsStore {
  users: Record<string, UserCredits>;
}

export const MILESTONES = [
  { id: 'first_step', title: 'First Step', desc: 'Create your account', icon: '🚀', credits: 5, condition: 'signup' },
  { id: 'profile_complete', title: 'Identity Established', desc: 'Complete your profile to 100%', icon: '✦', credits: 20, condition: 'profile_complete' },
  { id: 'first_publish', title: 'First Publish', desc: 'Publish your first piece of content', icon: '📄', credits: 10, condition: 'first_publish' },
  { id: 'streak_7', title: 'Week Warrior', desc: 'Post 7 days in a row', icon: '🔥', credits: 30, condition: 'streak_7' },
  { id: 'streak_10', title: 'Verified Creator', desc: 'Post 10 days in a row', icon: '✓', credits: 75, condition: 'streak_10', grantsVerified: true },
  { id: 'streak_30', title: 'Legendary', desc: 'Post 30 days in a row', icon: '👑', credits: 200, condition: 'streak_30' },
  { id: 'followers_10', title: 'Rising Star', desc: 'Earn 10 followers', icon: '⭐', credits: 15, condition: 'followers_10' },
  { id: 'followers_100', title: 'Influencer', desc: 'Earn 100 followers', icon: '💫', credits: 50, condition: 'followers_100' },
  { id: 'publish_10', title: 'Content Creator', desc: 'Publish 10 pieces of content', icon: '🎨', credits: 40, condition: 'publish_10' },
] as const;

const CREDIT_RULES: Record<string, { amount: number; dailyMax?: number }> = {
  daily_post: { amount: 5, dailyMax: 1 },
  profile_view: { amount: 0.5, dailyMax: 5 },
  received_follow: { amount: 3 },
  post_comment: { amount: 1, dailyMax: 10 },
  post_like: { amount: 1, dailyMax: 20 },
  profile_complete: { amount: 20 },
  first_gig: { amount: 10 },
  streak_7: { amount: 30 },
  streak_10: { amount: 75 },
  streak_30: { amount: 200 },
};

const ONE_TIME_REASONS = new Set(['profile_complete', 'first_gig', 'streak_7', 'streak_10', 'streak_30']);

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultUserCredits(): UserCredits {
  return {
    balance: 0,
    totalEarned: 0,
    totalSpent: 0,
    streak: { current: 0, longest: 0, lastPostDate: null, streakStartDate: null },
    milestones: [],
    verified: false,
    transactions: [],
    dailyEarnLog: {},
  };
}

async function readCreditsStore(): Promise<CreditsStore> {
  try {
    const content = await fs.readFile(CREDITS_FILE, 'utf8');
    return JSON.parse(content) as CreditsStore;
  } catch {
    return { users: {} };
  }
}

async function writeCreditsStore(store: CreditsStore): Promise<void> {
  await fs.writeFile(CREDITS_FILE, JSON.stringify(store, null, 2), 'utf8');
}

export async function getUserCredits(userId: string): Promise<UserCredits> {
  const store = await readCreditsStore();
  if (!store.users[userId]) {
    store.users[userId] = defaultUserCredits();
    await writeCreditsStore(store);
  }
  return store.users[userId];
}

export async function earnCredits(
  userId: string,
  reason: string,
  amount?: number,
  description?: string,
): Promise<UserCredits> {
  const store = await readCreditsStore();
  if (!store.users[userId]) store.users[userId] = defaultUserCredits();

  const user = store.users[userId];
  const rule = CREDIT_RULES[reason];
  const today = getToday();
  const earnAmount = amount ?? rule?.amount ?? 1;

  if (ONE_TIME_REASONS.has(reason)) {
    const alreadyEarned = user.transactions.some((t) => t.type === 'earn' && t.reason === reason);
    if (alreadyEarned) return user;
  }

  if (rule?.dailyMax !== undefined) {
    const todayLog = user.dailyEarnLog[today] || [];
    const countToday = todayLog.filter((r) => r === reason).length;
    if (countToday >= rule.dailyMax) return user;
  }

  if (reason === 'profile_view') {
    const todayLog = user.dailyEarnLog[today] || [];
    const viewsToday = todayLog.filter((r) => r === reason).length;
    if (viewsToday >= 10) return user;
  }

  const transaction = {
    id: uuidv4(),
    type: 'earn' as const,
    amount: earnAmount,
    reason,
    description: description ?? reason,
    createdAt: new Date().toISOString(),
  };

  user.transactions.push(transaction);
  user.balance += earnAmount;
  user.totalEarned += earnAmount;

  if (!user.dailyEarnLog[today]) user.dailyEarnLog[today] = [];
  user.dailyEarnLog[today].push(reason);

  store.users[userId] = user;
  await writeCreditsStore(store);
  return user;
}

export async function spendCredits(userId: string, amount: number, reason: string): Promise<UserCredits> {
  const store = await readCreditsStore();
  if (!store.users[userId]) store.users[userId] = defaultUserCredits();

  const user = store.users[userId];
  if (user.balance < amount) {
    throw new Error(`Insufficient credits. Balance: ${user.balance}, Required: ${amount}`);
  }

  const transaction = {
    id: uuidv4(),
    type: 'spend' as const,
    amount,
    reason,
    description: reason,
    createdAt: new Date().toISOString(),
  };

  user.transactions.push(transaction);
  user.balance -= amount;
  user.totalSpent += amount;

  store.users[userId] = user;
  await writeCreditsStore(store);
  return user;
}

export async function recordPost(userId: string): Promise<UserCredits> {
  const store = await readCreditsStore();
  if (!store.users[userId]) store.users[userId] = defaultUserCredits();

  const user = store.users[userId];
  const today = getToday();

  if (user.streak.lastPostDate === today) {
    store.users[userId] = user;
    await writeCreditsStore(store);
    return user;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (user.streak.lastPostDate === yesterdayStr) {
    user.streak.current += 1;
  } else {
    user.streak.current = 1;
    user.streak.streakStartDate = today;
  }

  if (user.streak.current > user.streak.longest) {
    user.streak.longest = user.streak.current;
  }

  user.streak.lastPostDate = today;
  store.users[userId] = user;
  await writeCreditsStore(store);

  await earnCredits(userId, 'daily_post', 5, 'Daily post reward');

  const currentStreak = user.streak.current;
  if (currentStreak >= 30 && !user.milestones.includes('streak_30')) {
    await _grantMilestone(userId, 'streak_30');
  } else if (currentStreak >= 10 && !user.milestones.includes('streak_10')) {
    await _grantMilestone(userId, 'streak_10');
  } else if (currentStreak >= 7 && !user.milestones.includes('streak_7')) {
    await _grantMilestone(userId, 'streak_7');
  }

  const finalStore = await readCreditsStore();
  return finalStore.users[userId];
}

async function _grantMilestone(userId: string, milestoneId: string): Promise<void> {
  const milestone = MILESTONES.find((m) => m.id === milestoneId);
  if (!milestone) return;

  const store = await readCreditsStore();
  if (!store.users[userId]) return;
  const user = store.users[userId];

  if (user.milestones.includes(milestoneId)) return;

  user.milestones.push(milestoneId);

  if ('grantsVerified' in milestone && milestone.grantsVerified) {
    user.verified = true;
  }

  const transaction = {
    id: uuidv4(),
    type: 'earn' as const,
    amount: milestone.credits,
    reason: milestoneId,
    description: `Milestone: ${milestone.title}`,
    createdAt: new Date().toISOString(),
  };

  user.transactions.push(transaction);
  user.balance += milestone.credits;
  user.totalEarned += milestone.credits;

  const today = getToday();
  if (!user.dailyEarnLog[today]) user.dailyEarnLog[today] = [];
  user.dailyEarnLog[today].push(milestoneId);

  store.users[userId] = user;
  await writeCreditsStore(store);
}

export async function checkAndGrantMilestones(
  userId: string,
  context: { followers?: number; publishCount?: number },
): Promise<UserCredits> {
  const store = await readCreditsStore();
  if (!store.users[userId]) {
    store.users[userId] = defaultUserCredits();
    await writeCreditsStore(store);
  }

  const user = store.users[userId];
  const { followers = 0, publishCount = 0 } = context;

  if (followers >= 10 && !user.milestones.includes('followers_10')) {
    await _grantMilestone(userId, 'followers_10');
  }
  if (followers >= 100 && !user.milestones.includes('followers_100')) {
    await _grantMilestone(userId, 'followers_100');
  }
  if (publishCount >= 1 && !user.milestones.includes('first_publish')) {
    await _grantMilestone(userId, 'first_publish');
  }
  if (publishCount >= 10 && !user.milestones.includes('publish_10')) {
    await _grantMilestone(userId, 'publish_10');
  }

  const finalStore = await readCreditsStore();
  return finalStore.users[userId];
}
