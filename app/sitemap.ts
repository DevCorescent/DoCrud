import type { MetadataRoute } from 'next';
import { getCertificates } from '@/lib/server/certificates';
import { getPublicBlogPosts } from '@/lib/server/blog';
import { getPublicDocrudiansData } from '@/lib/server/docrudians';
import { getPublicGigListings } from '@/lib/server/gigs';
import { getPublishedHiringJobs } from '@/lib/server/hiring';
import { getVirtualIdCards } from '@/lib/server/virtual-ids';
import { getPublicAppBaseUrl } from '@/lib/url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicAppBaseUrl();
  const now = new Date();
  const [jobs, certificates, virtualIds, docrudians, blogPosts, gigs] = await Promise.all([
    getPublishedHiringJobs(),
    getCertificates(),
    getVirtualIdCards(),
    getPublicDocrudiansData(),
    getPublicBlogPosts(),
    getPublicGigListings(),
  ]);

  // High-priority platform pages (daily/always fresh)
  const coreRoutes = [
    { path: '', freq: 'daily' as const, priority: 1.0 },
    { path: '/people', freq: 'daily' as const, priority: 0.95 },
    { path: '/gigs', freq: 'daily' as const, priority: 0.95 },
    { path: '/blog', freq: 'daily' as const, priority: 0.85 },
    { path: '/docrudians', freq: 'daily' as const, priority: 0.82 },
  ];

  // Product pages (weekly)
  const productRoutes = [
    { path: '/pricing', freq: 'weekly' as const, priority: 0.90 },
    { path: '/forms', freq: 'weekly' as const, priority: 0.88 },
    { path: '/forms/builder', freq: 'weekly' as const, priority: 0.82 },
    { path: '/pdf-editor', freq: 'weekly' as const, priority: 0.88 },
    { path: '/pdf-editor/workspace', freq: 'weekly' as const, priority: 0.78 },
    { path: '/resume-ats', freq: 'weekly' as const, priority: 0.88 },
    { path: '/doxpert', freq: 'weekly' as const, priority: 0.85 },
    { path: '/docword', freq: 'weekly' as const, priority: 0.80 },
    { path: '/talent', freq: 'weekly' as const, priority: 0.85 },
    { path: '/file-directory', freq: 'weekly' as const, priority: 0.75 },
    { path: '/file-transfers', freq: 'weekly' as const, priority: 0.72 },
    { path: '/visualizer', freq: 'weekly' as const, priority: 0.72 },
    { path: '/document-encrypter', freq: 'weekly' as const, priority: 0.72 },
    { path: '/daily-tools', freq: 'weekly' as const, priority: 0.75 },
  ];

  // Support / info pages (monthly)
  const infoRoutes = [
    { path: '/support', freq: 'monthly' as const, priority: 0.65 },
    { path: '/contact', freq: 'monthly' as const, priority: 0.65 },
    { path: '/schedule-demo', freq: 'monthly' as const, priority: 0.70 },
  ];

  const staticEntries = [
    ...coreRoutes.map((r) => ({ url: `${baseUrl}${r.path}`, lastModified: now, changeFrequency: r.freq, priority: r.priority })),
    ...productRoutes.map((r) => ({ url: `${baseUrl}${r.path}`, lastModified: now, changeFrequency: r.freq, priority: r.priority })),
    ...infoRoutes.map((r) => ({ url: `${baseUrl}${r.path}`, lastModified: now, changeFrequency: r.freq, priority: r.priority })),
  ];

  const jobEntries = jobs.map((job) => ({
    url: `${baseUrl}/jobs/${job.id}`,
    lastModified: new Date(job.updatedAt || job.createdAt || now),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const certificateEntries = certificates
    .filter((certificate) => certificate.status === 'published')
    .map((certificate) => ({
      url: `${baseUrl}/certificate/${certificate.slug}`,
      lastModified: new Date(certificate.updatedAt || certificate.createdAt || now),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

  const virtualIdEntries = virtualIds
    .filter((card) => card.visibility === 'public')
    .map((card) => ({
      url: `${baseUrl}/id/${card.slug}`,
      lastModified: new Date(card.updatedAt || card.createdAt || now),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

  const roomEntries = docrudians.circles.map((room) => ({
    url: `${baseUrl}/docrudians/room/${room.slug || room.id}`,
    lastModified: new Date(room.updatedAt || room.createdAt || now),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const blogEntries = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt || post.publishedAt || now),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  const gigEntries = gigs.map((gig) => ({
    url: `${baseUrl}/gigs/${gig.slug}`,
    lastModified: new Date(gig.updatedAt || gig.createdAt || now),
    changeFrequency: 'daily' as const,
    priority: 0.78,
  }));

  return [...staticEntries, ...jobEntries, ...certificateEntries, ...virtualIdEntries, ...roomEntries, ...blogEntries, ...gigEntries];
}
