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

  const routes = [
    '',
    '/forms',
    '/forms/builder',
    '/pdf-editor',
    '/pdf-editor/workspace',
    '/docword',
    '/doxpert',
    '/resume-ats',
    '/visualizer',
    '/file-directory',
    '/file-transfers',
    '/blog',
    '/gigs',
    '/document-encrypter',
    '/daily-tools',
    '/docrudians',
    '/pricing',
    '/support',
    '/contact',
    '/schedule-demo',
  ];

  const staticEntries = routes.map((route, index) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: index === 0 ? 'daily' as const : 'weekly' as const,
    priority:
      index === 0
        ? 1
        : route === '/pricing' || route === '/forms' || route === '/pdf-editor' || route === '/resume-ats'
          ? 0.9
          : 0.7,
  }));

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
