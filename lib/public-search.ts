import { searchPublicDirectory } from '@/lib/server/file-directory';
import { getPublicBlogPosts } from '@/lib/server/blog';
import { getPublicGigListings } from '@/lib/server/gigs';

export interface PublicSearchResult {
  id: string;
  title: string;
  description: string;
  href: string;
  type: 'feature' | 'page' | 'file' | 'article';
  category: string;
  badge?: string;
}

const STATIC_RESULTS: PublicSearchResult[] = [
  { id: 'feature-forms', title: 'Forms', description: 'Build polished forms with QR and response tracking.', href: '/forms', type: 'feature', category: 'Build', badge: 'FREE' },
  { id: 'feature-pdf-editor', title: 'PDF Editor', description: 'Edit, merge, split, and export PDFs.', href: '/pdf-editor', type: 'feature', category: 'Build', badge: 'FREE' },
  { id: 'feature-file-directory', title: 'File Directory', description: 'Publish public files or lock private ones.', href: '/file-directory', type: 'feature', category: 'Build', badge: 'FREE' },
  { id: 'feature-gigs', title: 'Gigs', description: 'Explore project gigs by interest and publish cleaner work briefs.', href: '/gigs', type: 'feature', category: 'Work', badge: 'NEW' },
  { id: 'feature-daily-tools', title: 'Daily Tools', description: 'Open converters and everyday utility tools.', href: '/daily-tools', type: 'feature', category: 'Build', badge: 'FREE' },
  { id: 'feature-docrudians', title: 'Docrudians', description: 'Create public and private rooms for sharing work.', href: '/docrudians', type: 'feature', category: 'Community', badge: 'NEW' },
  { id: 'feature-resume-ats', title: 'Resume ATS', description: 'Score resumes and improve faster.', href: '/resume-ats', type: 'feature', category: 'AI' },
  { id: 'feature-doxpert', title: 'DoXpert AI', description: 'Review documents with AI.', href: '/doxpert', type: 'feature', category: 'AI' },
  { id: 'feature-visualizer', title: 'Visualizer AI', description: 'Turn dense data into visual insights.', href: '/visualizer', type: 'feature', category: 'AI' },
  { id: 'feature-file-transfers', title: 'File Transfers', description: 'Share files with control and tracking.', href: '/file-transfers', type: 'feature', category: 'Secure' },
  { id: 'feature-encrypter', title: 'Document Encrypter', description: 'Lock sensitive files before delivery.', href: '/document-encrypter', type: 'feature', category: 'Secure' },
  { id: 'page-pricing', title: 'Pricing', description: 'See plans, limits, and product access.', href: '/pricing', type: 'page', category: 'Business' },
  { id: 'page-blog', title: 'Blog', description: 'Read product notes, workflow ideas, and writing from docrud.', href: '/blog', type: 'page', category: 'Insights' },
  { id: 'page-support', title: 'Support', description: 'Get help and product guidance.', href: '/support', type: 'page', category: 'Help' },
  { id: 'page-contact', title: 'Contact', description: 'Talk to the docrud team.', href: '/contact', type: 'page', category: 'Help' },
];

function normalize(value?: string) {
  return (value || '').trim().toLowerCase();
}

function scoreStaticResult(entry: PublicSearchResult, query: string) {
  const q = normalize(query);
  if (!q) return 0;

  const fields = [entry.title, entry.description, entry.category].map(normalize);
  let score = 0;
  for (const field of fields) {
    if (field.includes(q)) score += 10;
    for (const token of q.split(/\s+/).filter(Boolean)) {
      if (field.includes(token)) score += 4;
    }
  }
  return score;
}

export async function runPublicSearch(query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  const staticMatches = STATIC_RESULTS
    .map((entry) => ({ entry, score: scoreStaticResult(entry, normalizedQuery) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map(({ entry }) => entry);

  const [fileMatches, blogPosts, gigs] = await Promise.all([
    searchPublicDirectory({ query: normalizedQuery, limit: 5 }),
    getPublicBlogPosts(),
    getPublicGigListings(),
  ]);
  const fileResults: PublicSearchResult[] = fileMatches.map((item) => ({
    id: `file-${item.id}`,
    title: item.title,
    description: item.notes || `${item.fileName}${item.category ? ` · ${item.category}` : ''}`,
    href: item.linkHref,
    type: 'file',
    category: item.category || 'Public file',
    badge: 'FILE',
  }));

  const blogResults: PublicSearchResult[] = blogPosts
    .filter((post) => `${post.title} ${post.excerpt} ${post.category} ${(post.tags || []).join(' ')}`.toLowerCase().includes(normalizedQuery))
    .slice(0, 4)
    .map((post) => ({
      id: `blog-${post.id}`,
      title: post.title,
      description: post.excerpt,
      href: `/blog/${post.slug}`,
      type: 'article',
      category: post.category || 'Blog',
      badge: 'BLOG',
    }));

  const gigResults: PublicSearchResult[] = gigs
    .filter((gig) => `${gig.title} ${gig.summary} ${gig.category} ${gig.interests.join(' ')} ${gig.skills.join(' ')}`.toLowerCase().includes(normalizedQuery))
    .slice(0, 4)
    .map((gig) => ({
      id: `gig-${gig.id}`,
      title: gig.title,
      description: gig.summary,
      href: `/gigs/${gig.slug}`,
      type: 'page',
      category: gig.category || 'Gig',
      badge: 'GIG',
    }));

  return [...staticMatches, ...fileResults, ...blogResults, ...gigResults].slice(0, 12);
}
