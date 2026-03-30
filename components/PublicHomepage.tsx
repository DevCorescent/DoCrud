'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { LandingSettings, SaasPlan } from '@/types/document';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import InquiryForm from '@/components/InquiryForm';
import PublicSiteChrome from '@/components/PublicSiteChrome';

interface PublicHomepageProps {
  settings: LandingSettings;
  softwareName: string;
  accentLabel: string;
  saasPlans: SaasPlan[];
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 sm:text-xs">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-3xl lg:text-[2.6rem]">
          {title}
        </h2>
      </div>
      <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">{subtitle}</p>
    </div>
  );
}

const heroSlides = [
  {
    id: 'ops',
    imagePath: '/screenshots/document-ops.png',
    label: 'Document operations',
    title: 'Operate approvals, generation, and delivery from one clean workspace.',
  },
  {
    id: 'dashboard',
    imagePath: '/screenshots/dashboard-overview.png',
    label: 'Executive dashboards',
    title: 'Track pipeline health, overdue work, and operational performance in real time.',
  },
  {
    id: 'admin',
    imagePath: '/screenshots/admin-panel.png',
    label: 'Central control',
    title: 'Manage policies, templates, branding, and team access with stronger governance.',
  },
];

const heroIcons = [ShieldCheck, Workflow, Sparkles];

export default function PublicHomepage({ settings, softwareName, accentLabel, saasPlans }: PublicHomepageProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const heroHighlights = settings.featureHighlights.slice(0, 3);
  const pricingCards = saasPlans.length ? saasPlans : settings.pricingPlans;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <PublicSiteChrome softwareName={softwareName} accentLabel={accentLabel} settings={settings}>
      {settings.enabledSections.hero && (
        <section className="-mx-3 overflow-hidden rounded-none border-y border-black/5 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.04)] sm:-mx-5 sm:rounded-[2rem] sm:border sm:shadow-[0_28px_75px_rgba(15,23,42,0.06)] lg:-mx-8">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="flex flex-col justify-between px-4 py-8 sm:px-7 sm:py-10 lg:px-10 lg:py-12">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-black/10 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-600 sm:text-[11px]">
                    {settings.heroBadge}
                  </span>
                  <span className="rounded-full border border-black/10 bg-black px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white sm:text-[11px]">
                    Apple-style modern UX
                  </span>
                </div>

                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 sm:text-xs">{accentLabel}</p>
                <h1 className="mt-3 max-w-3xl text-[2rem] font-semibold leading-[0.98] tracking-[-0.06em] text-slate-950 sm:text-[3.1rem] lg:text-[4.4rem]">
                  {settings.heroTitle}
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-8 lg:text-lg">
                  {settings.heroSubtitle}
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button asChild className="h-11 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800">
                    <a href={settings.primaryCtaHref || '/schedule-demo'}>
                      {settings.primaryCtaLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-full border-slate-200 bg-white px-6">
                    <Link href="/signup">Start Free</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-full border-slate-200 bg-white px-6">
                    <a href={settings.secondaryCtaHref || '/login'}>{settings.secondaryCtaLabel}</a>
                  </Button>
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {heroHighlights.map((item, index) => {
                  const Icon = heroIcons[index] || Sparkles;
                  return (
                    <div key={item} className="rounded-[1.4rem] border border-black/6 bg-slate-50 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-700">{item}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-black/5 bg-[#f2f2f4] lg:border-l lg:border-t-0">
              <div className="relative h-[360px] w-full overflow-hidden sm:h-[460px] lg:h-full lg:min-h-[760px]">
                {heroSlides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-all duration-700 ${index === activeSlide ? 'translate-x-0 opacity-100' : 'translate-x-[6%] opacity-0'}`}
                  >
                    <Image
                      src={slide.imagePath}
                      alt={slide.title}
                      fill
                      className="object-cover object-top"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(17,24,39,0.1)_48%,rgba(15,23,42,0.7)_100%)]" />
                  </div>
                ))}

                <div className="absolute inset-x-4 bottom-4 rounded-[1.5rem] border border-white/30 bg-white/78 p-4 backdrop-blur-xl sm:inset-x-6 sm:bottom-6 sm:p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 sm:text-xs">
                    {heroSlides[activeSlide].label}
                  </p>
                  <h3 className="mt-2 max-w-xl text-lg font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                    {heroSlides[activeSlide].title}
                  </h3>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div className="flex gap-2">
                      {heroSlides.map((slide, index) => (
                        <button
                          key={slide.id}
                          type="button"
                          aria-label={`Go to slide ${index + 1}`}
                          onClick={() => setActiveSlide(index)}
                          className={`h-2.5 rounded-full transition-all ${index === activeSlide ? 'w-8 bg-slate-950' : 'w-2.5 bg-slate-300'}`}
                        />
                      ))}
                    </div>
                    <Link href="/schedule-demo" className="inline-flex items-center gap-2 text-sm font-medium text-slate-950">
                      Book walkthrough
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {settings.enabledSections.snapshot && (
        <section className="rounded-[1.8rem] border border-black/5 bg-white px-4 py-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] sm:px-7 sm:py-8 lg:px-10">
          <SectionHeader
            eyebrow="Platform Positioning"
            title={settings.featureSectionTitle}
            subtitle="Designed for modern enterprise teams that want the visual quality of premium software and the controls expected from MNC-grade document operations."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {settings.featureCards.map((feature, index) => (
              <Card
                key={feature.id}
                className={`rounded-[1.5rem] border ${index === 1 ? 'border-slate-950 bg-slate-950 text-white' : 'border-black/5 bg-slate-50 text-slate-950'} shadow-none`}
              >
                <CardContent className="p-5 sm:p-6">
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.25em] ${index === 1 ? 'text-white/60' : 'text-slate-500'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className={`mt-4 text-xl font-semibold tracking-tight sm:text-2xl ${index === 1 ? 'text-white' : 'text-slate-950'}`}>
                    {feature.title}
                  </h3>
                  <p className={`mt-3 text-sm leading-6 sm:leading-7 ${index === 1 ? 'text-white/75' : 'text-slate-600'}`}>
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {settings.enabledSections.softwareModules && (
        <section className="rounded-[1.8rem] border border-black/5 bg-white px-4 py-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] sm:px-7 sm:py-8 lg:px-10">
          <SectionHeader
            eyebrow="Capabilities"
            title={settings.softwareModulesTitle}
            subtitle={settings.softwareModulesSubtitle}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {settings.softwareModules.slice(0, 4).map((module, index) => (
              <Card
                key={module.id}
                className={`rounded-[1.6rem] border ${index % 2 === 0 ? 'border-slate-950 bg-slate-950 text-white' : 'border-black/5 bg-slate-50 text-slate-950'} shadow-none`}
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${index % 2 === 0 ? 'text-white/60' : 'text-slate-500'}`}>Module</p>
                      <h3 className={`mt-3 text-xl font-semibold tracking-tight sm:text-2xl ${index % 2 === 0 ? 'text-white' : 'text-slate-950'}`}>{module.title}</h3>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${index % 2 === 0 ? 'bg-white/10 text-white' : 'bg-white text-slate-700'}`}>
                      Premium
                    </span>
                  </div>
                  <p className={`mt-4 text-sm leading-6 sm:leading-7 ${index % 2 === 0 ? 'text-white/78' : 'text-slate-600'}`}>{module.description}</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {module.capabilities.map((capability) => (
                      <div
                        key={capability}
                        className={`rounded-2xl border px-4 py-3 text-sm ${index % 2 === 0 ? 'border-white/10 bg-white/5 text-white/86' : 'border-black/5 bg-white text-slate-700'}`}
                      >
                        {capability}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {settings.enabledSections.screenshots && (
        <section className="rounded-[1.8rem] border border-black/5 bg-white px-4 py-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] sm:px-7 sm:py-8 lg:px-10">
          <SectionHeader
            eyebrow="Product Views"
            title={settings.screenshotsSectionTitle}
            subtitle={settings.screenshotsSectionSubtitle}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {settings.featureScreenshots.map((shot, index) => (
              <Card key={shot.id} className={`overflow-hidden rounded-[1.6rem] border ${index === 0 ? 'border-slate-950 bg-slate-950 text-white' : 'border-black/5 bg-slate-50 text-slate-950'} shadow-none`}>
                <CardContent className="p-4 sm:p-5">
                  <div className={`overflow-hidden rounded-[1.2rem] border ${index === 0 ? 'border-white/10 bg-black' : 'border-black/5 bg-white'}`}>
                    <Image
                      src={shot.imagePath}
                      alt={shot.title}
                      width={1200}
                      height={760}
                      className="h-auto w-full object-cover"
                      unoptimized
                    />
                  </div>
                  <h3 className={`mt-4 text-lg font-semibold tracking-tight sm:text-2xl ${index === 0 ? 'text-white' : 'text-slate-950'}`}>{shot.title}</h3>
                  <p className={`mt-2 text-sm leading-6 sm:leading-7 ${index === 0 ? 'text-white/76' : 'text-slate-600'}`}>{shot.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {settings.enabledSections.pricing && (
        <section id="pricing" className="rounded-[1.8rem] border border-slate-950 bg-slate-950 px-4 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:px-7 sm:py-8 lg:px-10">
          <SectionHeader
            eyebrow="Pricing"
            title={settings.pricingSectionTitle}
            subtitle={settings.pricingSectionSubtitle}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {pricingCards.map((plan, index) => {
              const isSaasPlan = 'billingModel' in plan;
              const highlights = isSaasPlan
                ? [
                    `${plan.freeDocumentGenerations} free document generations`,
                    `Max ${plan.maxDocumentGenerations} documents in this plan`,
                    plan.overagePriceLabel || 'Upgrade path available',
                  ]
                : plan.highlights;

              return (
                <Card key={plan.id} className={`rounded-[1.6rem] border ${index === 1 ? 'border-white bg-white text-slate-950' : 'border-white/10 bg-white/5 text-white'} shadow-none`}>
                  <CardContent className="flex h-full flex-col p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${index === 1 ? 'text-slate-500' : 'text-white/60'}`}>Plan</p>
                        <h3 className={`mt-3 text-xl font-semibold tracking-tight sm:text-2xl ${index === 1 ? 'text-slate-950' : 'text-white'}`}>{plan.name}</h3>
                        <p className={`mt-3 text-sm leading-6 ${index === 1 ? 'text-slate-600' : 'text-white/75'}`}>{plan.description}</p>
                      </div>
                      {index === 1 && <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white">Popular</span>}
                    </div>
                    <p className={`mt-6 text-3xl font-semibold tracking-tight sm:text-4xl ${index === 1 ? 'text-slate-950' : 'text-white'}`}>{plan.priceLabel}</p>
                    <div className="mt-6 space-y-3">
                      {highlights.map((item) => (
                        <div key={item} className={`flex items-start gap-3 text-sm ${index === 1 ? 'text-slate-700' : 'text-white/84'}`}>
                          <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-none ${index === 1 ? 'text-slate-950' : 'text-white'}`} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <Button asChild className={`mt-8 rounded-full ${index === 1 ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-white text-slate-950 hover:bg-slate-100'}`}>
                      <Link href={isSaasPlan && plan.billingModel === 'free' ? '/signup' : '/pricing'}>
                        {isSaasPlan ? plan.ctaLabel || 'Explore Pricing' : 'Explore Pricing'}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {(settings.enabledSections.demo || settings.enabledSections.contact) && (
        <section className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          {settings.enabledSections.demo && (
            <Card className="rounded-[1.8rem] border border-black/5 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
              <CardContent className="p-5 sm:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 sm:text-xs">Schedule Demo</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{settings.demoPageTitle}</h3>
                <p className="mt-4 text-sm leading-6 text-slate-600 sm:leading-7">{settings.demoPageSubtitle}</p>
                <div className="mt-5 space-y-3">
                  {settings.demoBenefits.map((benefit) => (
                    <div key={benefit} className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-slate-950" />
                        <span>{benefit}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button asChild className="mt-6 rounded-full bg-slate-950 text-white hover:bg-slate-800">
                  <Link href="/schedule-demo">
                    Schedule Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {settings.enabledSections.contact && (
            <Card id="contact-us" className="rounded-[1.8rem] border border-black/5 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
              <CardContent className="p-5 sm:p-7">
                <div className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 sm:text-xs">Contact</p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{settings.contactHeading}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 sm:leading-7">
                      Share your current workflow structure, the teams involved, and where documents slow you down today. We’ll help shape the right implementation path.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-950" />
                        <span>{settings.contactEmail}</span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-950" />
                        <span>{settings.contactPhone}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <InquiryForm requestType="contact" title="Tell us about your organization and workflow needs" submitLabel="Send Enquiry" />
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </PublicSiteChrome>
  );
}
