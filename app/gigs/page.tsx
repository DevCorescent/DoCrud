import PublicGigsPage from '@/components/PublicGigsPage';
import { buildPageMetadata } from '@/lib/seo';
import { getGigCategories, getGigInterests, getPublicGigListings } from '@/lib/server/gigs';
import { getLandingSettings, getThemeSettings } from '@/lib/server/settings';

export const metadata = buildPageMetadata({
  title: 'Docrud Gigs | Explore Project Work, Publish Gig Briefs & Connect Directly',
  description: 'Explore project gigs by interest, publish cleaner work briefs, and connect directly after login inside a premium docrud workflow.',
  path: '/gigs',
  keywords: ['docrud gigs', 'freelance gigs', 'project listings', 'hire for project work', 'gig marketplace'],
  image: '/homepage/hero-workspace-meet.png',
});

export default async function GigsPage() {
  const [settings, themeSettings, initialGigs, categories, interests] = await Promise.all([
    getLandingSettings(),
    getThemeSettings(),
    getPublicGigListings(),
    getGigCategories(),
    getGigInterests(),
  ]);

  return (
    <PublicGigsPage
      settings={settings}
      softwareName={themeSettings.softwareName}
      accentLabel={themeSettings.accentLabel}
      initialGigs={initialGigs}
      categories={categories}
      interests={interests}
    />
  );
}
