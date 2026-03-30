import PublicHomepage from '@/components/PublicHomepage';
import { getLandingSettings, getThemeSettings } from '@/lib/server/settings';
import { getPublicSaasPlans } from '@/lib/server/saas';

export default async function Home() {
  const [landingSettings, themeSettings, saasPlans] = await Promise.all([
    getLandingSettings(),
    getThemeSettings(),
    getPublicSaasPlans(),
  ]);

  return (
    <PublicHomepage
      settings={landingSettings}
      softwareName={themeSettings.softwareName}
      accentLabel={themeSettings.accentLabel}
      saasPlans={saasPlans}
    />
  );
}
