import PublicSiteChrome from '@/components/PublicSiteChrome';
import BusinessSignupForm from '@/components/BusinessSignupForm';
import { buildPageMetadata } from '@/lib/seo';
import { getLandingSettings, getThemeSettings } from '@/lib/server/settings';

export const metadata = buildPageMetadata({
  title: 'Business Signup | Create Your Docrud Workspace',
  description: 'Create a Docrud business workspace for documents, AI tools, forms, secure sharing, and team workflows.',
  path: '/signup',
  keywords: ['business signup', 'create workspace', 'docrud signup'],
  noIndex: true,
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: { plan?: string; config?: string };
}) {
  const [settings, themeSettings] = await Promise.all([getLandingSettings(), getThemeSettings()]);

  return (
    <PublicSiteChrome softwareName={themeSettings.softwareName} accentLabel={themeSettings.accentLabel} settings={settings}>
      <section className="space-y-6 overflow-x-hidden">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div className="min-w-0 rounded-[2.5rem] border border-white/80 bg-white/80 px-5 py-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:px-8 sm:py-8 lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Business Signup</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Launch docrud for your team with a cleaner, guided setup.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Create your organization, set your workflow profile, and move into checkout or welcome without friction. Your first 5 document generations remain free so you can evaluate the workspace before expanding.
            </p>
          </div>
          <div className="min-w-0 rounded-[2.5rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.88))] px-5 py-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)] sm:px-8 sm:py-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">What happens next</p>
            <div className="mt-4 space-y-3">
              {[
                'Complete your workspace setup in 3 guided steps.',
                'Sign in automatically after account creation.',
                'Move into checkout or welcome without restarting the flow.',
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 text-sm text-slate-700">
                  <span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <BusinessSignupForm initialPlanId={searchParams?.plan} initialConfig={searchParams?.config} />
      </section>
    </PublicSiteChrome>
  );
}
