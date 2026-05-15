import { NextResponse } from 'next/server';
import { getAuthSession, getStoredUsers } from '@/lib/server/auth';
import { getAllProfiles, getFollowCounts } from '@/lib/server/user-profiles';
import { getPublicGigListings } from '@/lib/server/gigs';
import { getUpraiseCounts } from '@/lib/server/upraised';

export const dynamic = 'force-dynamic';

async function getSelfId() {
  const session = await getAuthSession();
  if (!session?.user?.email) return null;
  const users = await getStoredUsers();
  const actor = users.find((u) => u.email.toLowerCase() === session.user!.email!.toLowerCase());
  return actor?.id ?? null;
}

export async function GET() {
  try {
    const selfId = await getSelfId();

    const [users, profiles, gigs] = await Promise.all([
      getStoredUsers(),
      getAllProfiles(),
      getPublicGigListings(),
    ]);

    const upraiseCounts = await getUpraiseCounts(users.map((u) => u.id));

    const gigCountByUser: Record<string, number> = {};
    for (const gig of gigs) {
      if (gig.ownerUserId) {
        gigCountByUser[gig.ownerUserId] = (gigCountByUser[gig.ownerUserId] ?? 0) + 1;
      }
    }

    const filteredUsers = users.filter((user) => {
      if (user.isActive === false) return false;
      if (user.role === 'admin' && user.email.includes('company.com')) return false;
      if (selfId && user.id === selfId) return false;
      return true;
    });

    const people = await Promise.all(
      filteredUsers.slice(0, 20).map(async (user) => {
        const counts = await getFollowCounts(user.id);
        const profile = profiles[user.id] ?? {};
        return {
          id: user.id,
          name: user.name,
          accountType: user.accountType,
          createdAt: user.createdAt,
          docrudGo: profile.docrudGo === true,
          profile: {
            headline: profile.headline,
            bio: profile.bio,
            location: profile.location,
            avatarUrl: profile.avatarUrl,
            skills: profile.skills,
            openToWork: profile.openToWork,
            pronouns: profile.pronouns,
          },
          stats: {
            followers: counts.followers,
            following: counts.following,
            gigsCount: gigCountByUser[user.id] ?? 0,
          },
          upraiseCount: upraiseCounts[user.id] ?? 0,
        };
      }),
    );

    // Verified first, then most upraised, then most followed
    const sorted = people
      .sort((a, b) => {
        if (a.docrudGo !== b.docrudGo) return a.docrudGo ? -1 : 1;
        if (b.upraiseCount !== a.upraiseCount) return b.upraiseCount - a.upraiseCount;
        return b.stats.followers - a.stats.followers;
      })
      .slice(0, 8);

    return NextResponse.json({ people: sorted });
  } catch (error) {
    console.error('[onboarding/suggest-people] GET error', error);
    return NextResponse.json({ error: 'Failed to load suggestions.' }, { status: 500 });
  }
}
