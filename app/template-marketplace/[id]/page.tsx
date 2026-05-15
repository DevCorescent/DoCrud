import { buildPageMetadata } from '@/lib/seo';
import { getLandingSettings, getThemeSettings } from '@/lib/server/settings';
import PublicTemplateMarketplaceItemPage from '@/components/PublicTemplateMarketplaceItemPage';

export const dynamic = 'force-dynamic';

export default async function TemplateMarketplaceItemPage({ params }: { params: { id: string } }) {
  const [landingSettings, themeSettings] = await Promise.all([
    getLandingSettings(),
    getThemeSettings(),
  ]);

  return (
    <PublicTemplateMarketplaceItemPage
      settings={landingSettings}
      softwareName={themeSettings.softwareName}
      accentLabel={themeSettings.accentLabel}
      itemId={params.id}
    />
  );
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  return buildPageMetadata({
    title: 'Template | docrud Marketplace',
    description: 'Preview this template, read reviews, and install it into your workspace.',
    path: `/template-marketplace/${params.id}`,
    keywords: ['template', 'marketplace', 'docrud'],
  });
}

