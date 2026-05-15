import { notFound } from 'next/navigation';
import PublicTalentProfilePage from '@/components/PublicTalentProfilePage';
import { buildPageMetadata } from '@/lib/seo';
import { getPublicResumeBySlug } from '@/lib/server/resume-directory';
import { getLandingSettings, getThemeSettings } from '@/lib/server/settings';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const entry = await getPublicResumeBySlug(params.slug);
  return buildPageMetadata({
    title: entry ? `${entry.displayName} | Resume` : 'Resume | docrud Talent',
    description: entry?.headline || entry?.summary || 'Public resume profile published through docrud.',
    path: `/talent/${params.slug}`,
    keywords: ['resume', 'talent profile', 'docrud talent'],
  });
}

export default async function TalentProfilePage({ params }: { params: { slug: string } }) {
  const entry = await getPublicResumeBySlug(params.slug);
  if (!entry) notFound();

  const [landingSettings, themeSettings] = await Promise.all([
    getLandingSettings(),
    getThemeSettings(),
  ]);

  return (
    <PublicTalentProfilePage
      settings={landingSettings}
      softwareName={themeSettings.softwareName}
      accentLabel={themeSettings.accentLabel}
      entry={entry}
    />
  );
}

