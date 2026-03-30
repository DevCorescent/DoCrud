import PublicSiteChrome from '@/components/PublicSiteChrome';
import BusinessSignupForm from '@/components/BusinessSignupForm';
import { getLandingSettings, getThemeSettings } from '@/lib/server/settings';

export default async function SignupPage() {
  const [settings, themeSettings] = await Promise.all([getLandingSettings(), getThemeSettings()]);

  return (
    <PublicSiteChrome softwareName={themeSettings.softwareName} accentLabel={themeSettings.accentLabel} settings={settings}>
      <section className="space-y-6">
        <div className="rounded-[2.75rem] border border-white/80 bg-white/78 px-6 py-8 shadow-[0_24px_90px_rgba(15,23,42,0.1)] backdrop-blur-2xl sm:px-8 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Business Signup</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Start docrud as a SaaS workspace for your business.</h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">Create your organization profile, log in instantly, and use your first 5 document generations for free. Free usage is watermarked and is designed to help you evaluate the workflow before moving to a paid plan.</p>
        </div>
        <BusinessSignupForm />
      </section>
    </PublicSiteChrome>
  );
}
