import { notFound } from 'next/navigation';
import PublicGigDetailPage from '@/components/PublicGigDetailPage';
import { buildPageMetadata } from '@/lib/seo';
import { getPublicGigBySlug } from '@/lib/server/gigs';
import { getLandingSettings, getThemeSettings } from '@/lib/server/settings';

type GigDetailPageProps = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: GigDetailPageProps) {
  const gig = await getPublicGigBySlug(params.slug);
  if (!gig) {
    return buildPageMetadata({
      title: 'Gig not found | docrud',
      description: 'The requested gig could not be found.',
      path: `/gigs/${params.slug}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `${gig.title} | Docrud Gigs`,
    description: gig.summary,
    path: `/gigs/${gig.slug}`,
    keywords: [gig.category, ...gig.interests, ...gig.skills.slice(0, 4)],
    image: '/homepage/hero-workspace-meet.png',
  });
}

export default async function GigDetailPage({ params }: GigDetailPageProps) {
  const [gig, settings, themeSettings] = await Promise.all([
    getPublicGigBySlug(params.slug),
    getLandingSettings(),
    getThemeSettings(),
  ]);

  if (!gig) {
    notFound();
  }

  return (
    <PublicGigDetailPage
      gig={gig}
      settings={settings}
      softwareName={themeSettings.softwareName}
      accentLabel={themeSettings.accentLabel}
    />
  );
}
