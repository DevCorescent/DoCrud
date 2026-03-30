import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import PublicSiteChrome from '@/components/PublicSiteChrome';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getLandingSettings, getThemeSettings } from '@/lib/server/settings';
import { getPublicSaasPlans } from '@/lib/server/saas';

export default async function PricingPage() {
  const [settings, themeSettings, saasPlans] = await Promise.all([getLandingSettings(), getThemeSettings(), getPublicSaasPlans()]);

  return (
    <PublicSiteChrome softwareName={themeSettings.softwareName} accentLabel={themeSettings.accentLabel} settings={settings}>
      <section className="rounded-[2.75rem] border border-white/80 bg-white/78 px-6 py-8 shadow-[0_24px_90px_rgba(15,23,42,0.1)] backdrop-blur-2xl sm:px-8 lg:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Pricing</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">{settings.pricingPageTitle}</h2>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">{settings.pricingPageSubtitle}</p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {(saasPlans.length ? saasPlans : settings.pricingPlans).map((plan, index) => {
          const isSaasPlan = 'billingModel' in plan;
          const highlights = isSaasPlan
            ? [
                `${plan.freeDocumentGenerations} free document generations included`,
                `Maximum ${plan.maxDocumentGenerations} document generations`,
                plan.overagePriceLabel || 'Upgrade when the free quota is exhausted',
              ]
            : plan.highlights;
          return (
          <Card key={plan.id} className={`rounded-[2.25rem] border border-white/80 ${index === 1 ? 'bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]' : 'bg-white/74 shadow-[0_18px_48px_rgba(15,23,42,0.08)]'} backdrop-blur-2xl`}>
            <CardContent className="flex h-full flex-col p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className={`text-2xl font-semibold tracking-tight ${index === 1 ? 'text-white' : 'text-slate-950'}`}>{plan.name}</h3>
                  <p className={`mt-2 text-sm leading-6 ${index === 1 ? 'text-white/75' : 'text-slate-600'}`}>{plan.description}</p>
                </div>
                {index === 1 && <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white">Recommended</span>}
              </div>
              <p className={`mt-6 text-3xl font-semibold tracking-tight ${index === 1 ? 'text-white' : 'text-slate-950'}`}>{plan.priceLabel}</p>
              <div className="mt-6 space-y-3">
                {highlights.map((item) => (
                  <div key={item} className={`flex items-start gap-3 text-sm ${index === 1 ? 'text-white/85' : 'text-slate-700'}`}>
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-none ${index === 1 ? 'text-white' : 'text-slate-950'}`} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Button asChild className={`mt-8 rounded-full ${index === 1 ? 'bg-white text-slate-950 hover:bg-white/90' : 'bg-slate-950 text-white hover:bg-slate-800'}`}>
                <Link href={isSaasPlan && plan.billingModel === 'free' ? '/signup' : '/schedule-demo'}>{isSaasPlan && plan.billingModel === 'free' ? 'Start Free' : 'Discuss This Plan'}</Link>
              </Button>
            </CardContent>
          </Card>
        )})}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[2.25rem] border border-white/80 bg-white/74 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
          <CardContent className="p-6 sm:p-8">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">What every plan includes</h3>
            <div className="mt-6 space-y-3">
              {[
                '5 free document generations included in every public plan',
                'Docuside watermark applied to free-tier document generation',
                'Plan-based feature controls and generation restrictions',
                'Admin-managed upgrades for higher document volumes and advanced SaaS access',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-slate-950" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.25rem] border border-white/80 bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
          <CardContent className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Need a custom scope?</p>
            <h3 className="mt-4 text-3xl font-semibold tracking-tight">Let us tailor the rollout for your organization</h3>
            <p className="mt-4 text-sm leading-7 text-white/75">
              If you need industry-specific compliance, deeper integrations, or a highly customized workflow structure, we can shape a one-time purchase plan around your exact needs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="rounded-full bg-white text-slate-950 hover:bg-white/90">
                <Link href="/contact">Talk to Sales</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15">
                <Link href="/schedule-demo">Schedule Demo</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </PublicSiteChrome>
  );
}
