import PublicHomepage from '@/components/PublicHomepage';
import { buildPageMetadata } from '@/lib/seo';
import { getLandingSettings, getThemeSettings } from '@/lib/server/settings';
import { getPublicSaasPlans } from '@/lib/server/saas';
import { getPublicHomeMetrics } from '@/lib/server/public-home-metrics';
import { getFileDirectoryStats } from '@/lib/server/file-directory';

export const metadata = buildPageMetadata({
  title: 'Docrud | Document Management, Forms, PDF Editor, AI Tools & Secure File Sharing',
  description:
    'Docrud helps teams create documents, build forms, edit PDFs, review files with AI, share securely, and manage daily workflows from one workspace.',
  path: '/',
  keywords: ['docrud', 'document management software', 'pdf editor', 'secure file sharing', 'form builder', 'ai document review'],
});

export default async function Home() {
  const [landingSettings, themeSettings, saasPlans, homeMetrics, fileDirectoryStats] = await Promise.all([
    getLandingSettings(),
    getThemeSettings(),
    getPublicSaasPlans(),
    getPublicHomeMetrics(),
    getFileDirectoryStats(),
  ]);

  return (
    <PublicHomepage
      settings={landingSettings}
      softwareName={themeSettings.softwareName}
      accentLabel={themeSettings.accentLabel}
      saasPlans={saasPlans}
      homeMetrics={homeMetrics}
      fileDirectoryStats={fileDirectoryStats}
    />
  );
}
