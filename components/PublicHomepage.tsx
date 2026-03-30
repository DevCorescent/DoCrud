'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, ChevronRight, Mail, Phone, Sparkles } from 'lucide-react';
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
    <div className="mb-8 flex flex-col gap-3 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p>
        <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h3>
      </div>
      <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{subtitle}</p>
    </div>
  );
}

export default function PublicHomepage({ settings, softwareName, accentLabel, saasPlans }: PublicHomepageProps) {
  return (
    <PublicSiteChrome softwareName={softwareName} accentLabel={accentLabel} settings={settings}>
      {settings.enabledSections.hero && <section className="relative overflow-hidden rounded-[2.9rem] border border-white/80 bg-[#f6f7fb] px-6 py-6 shadow-[0_30px_100px_rgba(15,23,42,0.08)] sm:px-8 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute left-[-6rem] top-[-5rem] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(39,25,255,0.12),rgba(39,25,255,0))]" />
        <div className="pointer-events-none absolute right-[-4rem] top-12 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(219,78,42,0.16),rgba(219,78,42,0))]" />
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-[2.5rem] bg-white px-6 py-7 shadow-[18px_18px_40px_rgba(180,181,182,0.18),-10px_-10px_30px_rgba(255,255,255,0.86)] sm:px-8 sm:py-9">
            <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-[0.28em] text-slate-600">
              {settings.heroBadge}
            </p>
            <p className="mt-6 text-sm font-medium uppercase tracking-[0.32em] text-[#2719FF]">{accentLabel}</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight text-slate-950 sm:text-5xl xl:text-6xl">
              {settings.heroTitle}
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">{settings.heroSubtitle}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="rounded-full bg-[#2719FF] px-6 text-white hover:bg-[#2014d6]">
                <a href={settings.primaryCtaHref || '/schedule-demo'}>
                  {settings.primaryCtaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-slate-200 bg-white px-6">
                <a href={settings.secondaryCtaHref || '/login'}>{settings.secondaryCtaLabel}</a>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-slate-200 bg-white px-6">
                <Link href="/signup">Start Free</Link>
              </Button>
            </div>

            <div className="mt-10">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{settings.socialProofLabel}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {settings.socialProofItems.map((item) => (
                  <span key={item} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-[8px_8px_20px_rgba(180,181,182,0.12),-6px_-6px_18px_rgba(255,255,255,0.9)]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="overflow-hidden rounded-[2.3rem] border-0 bg-[#0B0C0D] text-white shadow-[0_26px_60px_rgba(15,23,42,0.18)]">
              <CardContent className="relative p-6 sm:p-7">
                <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-[2rem] bg-[radial-gradient(circle,rgba(39,25,255,0.45),rgba(39,25,255,0))]" />
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">Why Docuside</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">A modern system for complex document operations</h3>
                <div className="mt-6 space-y-3">
                  {settings.featureHighlights.map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/82">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-white" />
                        <span>{item}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-3">
              {settings.stats.map((stat, index) => (
                <Card key={stat.id} className={`rounded-[2rem] border-0 ${index === 1 ? 'bg-[#2719FF] text-white shadow-[0_20px_44px_rgba(39,25,255,0.22)]' : 'bg-white text-slate-950 shadow-[14px_14px_32px_rgba(180,181,182,0.18),-10px_-10px_24px_rgba(255,255,255,0.86)]'}`}>
                  <CardContent className="p-5">
                    <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${index === 1 ? 'text-white/70' : 'text-slate-500'}`}>Metric</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight">{stat.value}</p>
                    <p className={`mt-2 text-sm leading-6 ${index === 1 ? 'text-white/82' : 'text-slate-600'}`}>{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
              <Card className="rounded-[2rem] border-0 bg-white shadow-[14px_14px_32px_rgba(180,181,182,0.18),-10px_-10px_24px_rgba(255,255,255,0.86)]">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Sales Contact</p>
                  <p className="mt-4 flex items-center gap-2 text-sm text-slate-700"><Mail className="h-4 w-4" />{settings.contactEmail}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-700"><Phone className="h-4 w-4" />{settings.contactPhone}</p>
                </CardContent>
              </Card>
              <Card className="rounded-[2rem] border-0 bg-[#DB4E2A] text-white shadow-[0_20px_44px_rgba(219,78,42,0.2)]">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Next Step</p>
                  <h4 className="mt-3 text-xl font-semibold tracking-tight">Schedule a guided product walkthrough</h4>
                  <Link href="/schedule-demo" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white">
                    Book a demo
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>}

      {settings.enabledSections.snapshot && <section className="rounded-[2.8rem] bg-white px-6 py-7 shadow-[18px_18px_44px_rgba(180,181,182,0.16),-12px_-12px_30px_rgba(255,255,255,0.88)] sm:px-8 lg:px-10 lg:py-10">
        <SectionHeader
          eyebrow="Platform Snapshot"
          title={settings.featureSectionTitle}
          subtitle="Decision makers should understand the platform story quickly. This section frames the business value before the detailed software capabilities below."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {settings.featureCards.map((feature, index) => (
            <Card key={feature.id} className={`rounded-[2rem] border-0 ${index === 1 ? 'bg-[#0B0C0D] text-white shadow-[0_22px_56px_rgba(15,23,42,0.16)]' : 'bg-[#f6f7fb] text-slate-950 shadow-[inset_1px_1px_0_rgba(255,255,255,0.85)]'}`}>
              <CardContent className="p-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${index === 1 ? 'bg-white/10 text-white' : 'bg-[#2719FF] text-white'}`}>
                  <span className="text-sm font-semibold">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <h3 className={`mt-5 text-xl font-semibold tracking-tight ${index === 1 ? 'text-white' : 'text-slate-950'}`}>{feature.title}</h3>
                <p className={`mt-3 text-sm leading-7 ${index === 1 ? 'text-white/75' : 'text-slate-600'}`}>{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>}

      {settings.enabledSections.softwareModules && <section className="rounded-[2.8rem] bg-[#f6f7fb] px-6 py-7 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:px-8 lg:px-10 lg:py-10">
        <SectionHeader
          eyebrow="Software Features"
          title={settings.softwareModulesTitle}
          subtitle={settings.softwareModulesSubtitle}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {settings.softwareModules.map((module, index) => (
            <Card key={module.id} className={`rounded-[2rem] border-0 ${index === 0 ? 'bg-white shadow-[16px_16px_36px_rgba(180,181,182,0.18),-10px_-10px_24px_rgba(255,255,255,0.88)]' : index === 1 ? 'bg-[#2719FF] text-white shadow-[0_24px_48px_rgba(39,25,255,0.22)]' : index === 2 ? 'bg-[#0B0C0D] text-white shadow-[0_24px_56px_rgba(15,23,42,0.18)]' : 'bg-white shadow-[16px_16px_36px_rgba(180,181,182,0.18),-10px_-10px_24px_rgba(255,255,255,0.88)]'}`}>
              <CardContent className="p-6">
                <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${index === 1 || index === 2 ? 'text-white/60' : 'text-slate-500'}`}>Module</p>
                <h4 className={`mt-3 text-2xl font-semibold tracking-tight ${index === 1 || index === 2 ? 'text-white' : 'text-slate-950'}`}>{module.title}</h4>
                <p className={`mt-3 text-sm leading-7 ${index === 1 || index === 2 ? 'text-white/78' : 'text-slate-600'}`}>{module.description}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {module.capabilities.map((capability) => (
                    <div
                      key={capability}
                      className={`rounded-2xl px-4 py-3 text-sm ${index === 1 || index === 2 ? 'border border-white/12 bg-white/8 text-white/86' : 'border border-slate-200 bg-[#f6f7fb] text-slate-700'}`}
                    >
                      {capability}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>}

      {settings.enabledSections.screenshots && <section className="rounded-[2.8rem] bg-[#f6f7fb] px-6 py-7 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:px-8 lg:px-10 lg:py-10">
        <SectionHeader
          eyebrow="Product Views"
          title={settings.screenshotsSectionTitle}
          subtitle={settings.screenshotsSectionSubtitle}
        />
        <div className="grid gap-5 lg:grid-cols-2">
          {settings.featureScreenshots.map((shot, index) => (
            <Card key={shot.id} className={`overflow-hidden rounded-[2.15rem] border-0 ${index % 3 === 1 ? 'bg-[#0B0C0D] text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]' : 'bg-white text-slate-950 shadow-[16px_16px_36px_rgba(180,181,182,0.18),-10px_-10px_24px_rgba(255,255,255,0.88)]'}`}>
              <CardContent className="p-5">
                <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200/70 bg-slate-100">
                  <Image
                    src={shot.imagePath}
                    alt={shot.title}
                    width={1200}
                    height={760}
                    className="h-auto w-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="mt-5">
                  <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${index % 3 === 1 ? 'text-white/60' : 'text-slate-500'}`}>Screenshot</p>
                  <h4 className={`mt-2 text-2xl font-semibold tracking-tight ${index % 3 === 1 ? 'text-white' : 'text-slate-950'}`}>{shot.title}</h4>
                  <p className={`mt-3 text-sm leading-7 ${index % 3 === 1 ? 'text-white/78' : 'text-slate-600'}`}>{shot.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>}

      {settings.enabledSections.pricing && <section className="rounded-[2.8rem] bg-white px-6 py-7 shadow-[18px_18px_44px_rgba(180,181,182,0.16),-12px_-12px_30px_rgba(255,255,255,0.88)] sm:px-8 lg:px-10 lg:py-10" id="pricing">
        <SectionHeader
          eyebrow="Commercial Model"
          title={settings.pricingSectionTitle}
          subtitle={settings.pricingSectionSubtitle}
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {(saasPlans.length ? saasPlans : settings.pricingPlans).map((plan, index) => {
            const isSaasPlan = 'billingModel' in plan;
            const highlights = isSaasPlan
              ? [
                  `${plan.freeDocumentGenerations} free document generations`,
                  `Max ${plan.maxDocumentGenerations} documents in this plan`,
                  plan.overagePriceLabel || 'Upgrade path available',
                ]
              : plan.highlights;
            return (
            <Card key={plan.id} className={`rounded-[2.25rem] border-0 ${index === 1 ? 'bg-[#0B0C0D] text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]' : index === 2 ? 'bg-[#2719FF] text-white shadow-[0_24px_52px_rgba(39,25,255,0.18)]' : 'bg-[#f6f7fb] text-slate-950 shadow-[inset_1px_1px_0_rgba(255,255,255,0.85)]'}`}>
              <CardContent className="flex h-full flex-col p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${index === 0 ? 'text-slate-500' : 'text-white/60'}`}>Plan</p>
                    <h4 className={`mt-3 text-2xl font-semibold tracking-tight ${index === 0 ? 'text-slate-950' : 'text-white'}`}>{plan.name}</h4>
                    <p className={`mt-2 text-sm leading-7 ${index === 0 ? 'text-slate-600' : 'text-white/78'}`}>{plan.description}</p>
                  </div>
                  {index === 1 && <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white">Popular</span>}
                </div>
                <p className={`mt-6 text-3xl font-semibold tracking-tight ${index === 0 ? 'text-slate-950' : 'text-white'}`}>{plan.priceLabel}</p>
                <div className="mt-6 space-y-3">
                  {highlights.map((item) => (
                    <div key={item} className={`flex items-start gap-3 text-sm ${index === 0 ? 'text-slate-700' : 'text-white/86'}`}>
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-none ${index === 0 ? 'text-slate-950' : 'text-white'}`} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <Button asChild className={`mt-8 rounded-full ${index === 0 ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-white text-slate-950 hover:bg-white/90'}`}>
                  <Link href={isSaasPlan && plan.billingModel === 'free' ? '/signup' : '/pricing'}>{isSaasPlan ? (plan.ctaLabel || 'Explore Pricing') : 'Explore Pricing'}</Link>
                </Button>
              </CardContent>
            </Card>
          )})}
        </div>
      </section>}

      {(settings.enabledSections.demo || settings.enabledSections.contact) && <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        {settings.enabledSections.demo && <Card className="rounded-[2.5rem] border-0 bg-[#f6f7fb] shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <CardContent className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Schedule Demo</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{settings.demoPageTitle}</h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">{settings.demoPageSubtitle}</p>
            <div className="mt-6 space-y-3">
              {settings.demoBenefits.map((benefit) => (
                <div key={benefit} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-[10px_10px_24px_rgba(180,181,182,0.12),-6px_-6px_16px_rgba(255,255,255,0.88)]">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-[#2719FF]" />
                    <span>{benefit}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button asChild className="mt-6 rounded-full bg-[#2719FF] text-white hover:bg-[#2014d6]">
              <Link href="/schedule-demo">
                Schedule Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>}

        {settings.enabledSections.contact && <Card id="contact-us" className="rounded-[2.5rem] border-0 bg-white shadow-[18px_18px_44px_rgba(180,181,182,0.16),-12px_-12px_30px_rgba(255,255,255,0.88)]">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Contact</p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{settings.contactHeading}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">Share your current workflow structure, the teams involved, and where documents slow you down today. We’ll help shape the right implementation path.</p>
            </div>
            <InquiryForm requestType="contact" title="Tell us about your organization and workflow needs" submitLabel="Send Enquiry" />
          </CardContent>
        </Card>}
      </section>}
    </PublicSiteChrome>
  );
}
