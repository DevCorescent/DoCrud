import { NextRequest, NextResponse } from 'next/server';
import { getFileTransfers } from '@/lib/server/file-transfers';
import { getAuthSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    const viewerIdentifier = session?.user?.id || session?.user?.email || '';
    const now = new Date();

    const transfers = await getFileTransfers();
    const items = transfers
      .filter(
        (t) =>
          t.directoryVisibility === 'public' &&
          t.authMode === 'public' &&
          !t.revokedAt,
      )
      .sort((a, b) => {
        const aFeatured = a.featured && a.featuredUntil && new Date(a.featuredUntil) > now;
        const bFeatured = b.featured && b.featuredUntil && new Date(b.featuredUntil) > now;
        if (aFeatured && !bFeatured) return -1;
        if (!aFeatured && bFeatured) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .map((t) => {
        const isFeaturedActive = t.featured && t.featuredUntil && new Date(t.featuredUntil) > now;
        return {
          id: t.id,
          shareId: t.shareId,
          category: t.directoryCategory?.toLowerCase() || 'document',
          badge: t.directoryTags?.[0] || 'Published',
          title: t.title || t.fileName,
          byline: `${t.uploadedBy} · ${t.fileName}`,
          body: t.notes || '',
          chips: (t.directoryTags ?? []).slice(1).length > 0 ? (t.directoryTags ?? []).slice(1) : undefined,
          postedAt: t.createdAt,
          featured: !!isFeaturedActive,
          featuredPlan: isFeaturedActive ? t.featuredPlan : undefined,
          isReal: true,
          likesCount: t.likesCount ?? 0,
          commentsCount: t.commentsCount ?? 0,
          viewCount: t.viewCount ?? t.openCount ?? 0,
          likedByViewer: viewerIdentifier ? (t.likedBy ?? []).includes(viewerIdentifier) : false,
          uploadedByUserId: t.uploadedByUserId,
          videoUrl: t.videoUrl || undefined,
          mimeType: t.mimeType || null,
          thumbnailUrl: t.thumbnailUrl || undefined,
          applicationUrl: t.applicationUrl || undefined,
        };
      });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
