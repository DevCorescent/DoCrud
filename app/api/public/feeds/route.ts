import { NextResponse } from 'next/server';
import { getFileTransfers } from '@/lib/server/file-transfers';

export const dynamic = 'force-dynamic';

const CATEGORY_MAP: Record<string, string> = {
  design: 'Design',
  development: 'Development',
  dev: 'Development',
  code: 'Development',
  writing: 'Writing',
  content: 'Writing',
  marketing: 'Marketing',
  productivity: 'Productivity',
  ai: 'AI Tools',
  'ai tools': 'AI Tools',
  career: 'Career',
  resume: 'Career',
  document: 'Productivity',
  finance: 'Productivity',
  legal: 'Writing',
  other: 'Productivity',
};

const ILK_MAP: Record<string, string> = {
  Design: 'design',
  Development: 'code',
  Writing: 'writing',
  Marketing: 'ai',
  Productivity: 'writing',
  'AI Tools': 'ai',
  Career: 'writing',
};

const CAT_CLS_MAP: Record<string, string> = {
  Design: 'text-pink-400 bg-pink-500/[0.12] border-pink-500/[0.20]',
  Development: 'text-emerald-400 bg-emerald-500/[0.12] border-emerald-500/[0.20]',
  Writing: 'text-blue-400 bg-blue-500/[0.12] border-blue-500/[0.20]',
  Marketing: 'text-purple-400 bg-purple-500/[0.12] border-purple-500/[0.20]',
  Productivity: 'text-cyan-400 bg-cyan-500/[0.12] border-cyan-500/[0.20]',
  'AI Tools': 'text-amber-400 bg-amber-500/[0.12] border-amber-500/[0.20]',
  Career: 'text-rose-400 bg-rose-500/[0.12] border-rose-500/[0.20]',
};

const AUTHOR_BGS = [
  'from-pink-500 to-rose-600',
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-violet-600',
  'from-orange-500 to-amber-600',
  'from-teal-500 to-emerald-600',
  'from-cyan-500 to-blue-600',
  'from-fuchsia-500 to-pink-600',
  'from-red-500 to-rose-600',
];

function fmtCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '??';
}

export async function GET() {
  try {
    const transfers = await getFileTransfers();

    const items = transfers
      .filter(
        (t) =>
          t.directoryVisibility === 'public' &&
          t.authMode === 'public' &&
          !t.revokedAt,
      )
      .map((t, i) => {
        const rawCat = (t.directoryCategory ?? '').toLowerCase().trim();
        const displayCat = CATEGORY_MAP[rawCat] ?? 'Productivity';
        const author = t.uploadedBy?.split('@')[0] ?? 'Anonymous';
        return {
          id: t.id,
          shareId: t.shareId || t.id,
          category: displayCat,
          catCls: CAT_CLS_MAP[displayCat] ?? CAT_CLS_MAP.Productivity,
          ilk: ILK_MAP[displayCat] ?? 'writing',
          title: t.title || t.fileName,
          description: t.notes?.slice(0, 120) || `${displayCat} resource`,
          author,
          authorAv: initials(author),
          authorBg: AUTHOR_BGS[i % AUTHOR_BGS.length],
          likes: fmtCount(t.likesCount ?? 0),
          likesRaw: t.likesCount ?? 0,
          comments: t.commentsCount ?? 0,
          href: `/published/${t.id}`,
        };
      });

    // Per category: pick #1 by likes and #1 by comments (deduplicated)
    const byCategory: Record<string, typeof items> = {};
    for (const item of items) {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    }

    const picks: typeof items = [];
    const seen = new Set<string>();

    for (const catItems of Object.values(byCategory)) {
      const byLikes = [...catItems].sort((a, b) => b.likesRaw - a.likesRaw);
      const byComments = [...catItems].sort((a, b) => b.comments - a.comments);

      for (const item of [byLikes[0], byComments[0]]) {
        if (item && !seen.has(item.id)) {
          seen.add(item.id);
          picks.push(item);
        }
      }
    }

    // If fewer than 6 picks, pad with remaining items sorted by engagement
    if (picks.length < 6) {
      const remaining = items
        .filter((it) => !seen.has(it.id))
        .sort((a, b) => (b.likesRaw + b.comments) - (a.likesRaw + a.comments));
      for (const item of remaining) {
        if (picks.length >= 12) break;
        picks.push(item);
        seen.add(item.id);
      }
    }

    return NextResponse.json({ feeds: picks });
  } catch {
    return NextResponse.json({ feeds: [] });
  }
}
