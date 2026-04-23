import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicHiringJobPage from '@/components/PublicHiringJobPage';
import { buildPageMetadata } from '@/lib/seo';
import { getPublishedHiringJobById } from '@/lib/server/hiring';
import { getLandingSettings, getThemeSettings } from '@/lib/server/settings';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const job = await getPublishedHiringJobById(params.id);
  if (!job) {
    return buildPageMetadata({
      title: 'Job Opening | Docrud',
      description: 'Explore public job openings published through Docrud.',
      path: `/jobs/${params.id}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `${job.title} | ${job.organizationName} | Docrud Jobs`,
    description: `${job.title} at ${job.organizationName}${job.location ? ` in ${job.location}` : ''}. Explore responsibilities, requirements, and apply through Docrud.`,
    path: `/jobs/${params.id}`,
    keywords: [job.title, job.organizationName, job.location || '', 'job opening', 'hiring'],
  });
}

export default async function PublicHiringJobDetailPage({ params }: { params: { id: string } }) {
  const [landingSettings, themeSettings, job] = await Promise.all([
    getLandingSettings(),
    getThemeSettings(),
    getPublishedHiringJobById(params.id),
  ]);

  if (!job) {
    notFound();
  }

  return (
    <PublicHiringJobPage
      softwareName={themeSettings.softwareName}
      accentLabel={themeSettings.accentLabel}
      settings={landingSettings}
      job={job}
    />
  );
}
