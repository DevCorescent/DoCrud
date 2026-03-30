'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronRight,
  FolderKanban,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
} from 'lucide-react';
import { LandingSettings, SaasPlan } from '@/types/document';
import { Button } from '@/components/ui/button';
import PublicSiteChrome from '@/components/PublicSiteChrome';

interface PublicHomepageProps {
  settings: LandingSettings;
  softwareName: string;
  accentLabel: string;
  saasPlans: SaasPlan[];
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-[56rem] text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-sky-700 sm:text-[11px]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-4xl lg:text-[3.2rem]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{subtitle}</p>
      ) : null}
    </div>
  );
}

function HeroSlider({
  slides,
}: {
  slides: LandingSettings['heroBanners'];
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 4500);
    return () => window.clearInterval(intervalId);
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <div className="relative h-[360px] overflow-hidden rounded-[2rem] border border-black/5 bg-[#090c12] shadow-[0_40px_120px_rgba(15,23,42,0.18)] sm:h-[460px] lg:h-[720px] xl:h-[760px]">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-all duration-700 ${index === activeIndex ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-[1.04]'}`}
        >
          <Image
            src={slide.imagePath}
            alt={slide.title}
            fill
            unoptimized
            className="object-cover object-top"
            priority={index === 0}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.14)_0%,rgba(15,23,42,0.34)_38%,rgba(2,6,23,0.86)_100%)]" />
        </div>
      ))}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),transparent_58%)]" />

      <div className="absolute inset-x-4 bottom-4 rounded-[1.6rem] border border-white/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(96,165,250,0.05))] p-4 text-white shadow-[0_24px_55px_rgba(15,23,42,0.16)] backdrop-blur-2xl sm:inset-x-6 sm:bottom-6 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/64 sm:text-[11px]">
              {slides[activeIndex].eyebrow}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl lg:text-[2rem]">
              {slides[activeIndex].title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/80 sm:text-base">{slides[activeIndex].description}</p>
          </div>

          <div className="flex items-center gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`View banner ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${index === activeIndex ? 'w-9 bg-sky-300' : 'w-2.5 bg-white/35 hover:bg-slate-300/70'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageShowcase({
  cards,
}: {
  cards: Array<{ id: string; title: string; description: string; imagePath: string }>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (cards.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % cards.length);
    }, 3800);
    return () => window.clearInterval(intervalId);
  }, [cards.length]);

  if (!cards.length) return null;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.05)] homepage-fade-up-delay">
      <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative min-h-[360px] sm:min-h-[460px] lg:min-h-[560px]">
          {cards.map((card, index) => (
            <div key={card.id} className={`absolute inset-0 transition-all duration-700 ${index === activeIndex ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-[1.02]'}`}>
              <Image src={card.imagePath} alt={card.title} fill unoptimized className="object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.82)_0%,rgba(15,23,42,0.36)_44%,rgba(255,255,255,0.06)_100%)]" />
            </div>
          ))}
        </div>

        <div className="relative flex flex-col justify-between px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10 xl:px-12 xl:py-12">
          <div className="pointer-events-none absolute right-8 top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.16),rgba(96,165,250,0))] blur-3xl homepage-float" />
          <div className="pointer-events-none absolute bottom-8 left-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.16),rgba(148,163,184,0))] blur-3xl homepage-float-delayed" />

          <div className="relative z-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-sky-700 sm:text-[11px]">Why teams move to docrud</p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-4xl lg:text-[3.3rem]">
              More control.
              <br />
              Less friction.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
              Show one system to leadership, operations, and clients without making the product feel heavy.
            </p>
          </div>

          <div className="relative z-10 mt-8 rounded-[1.8rem] border border-black/5 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.98))] p-5 shadow-[0_24px_55px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-700">Live use case</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{cards[activeIndex].title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{cards[activeIndex].description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {cards.map((card, index) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`rounded-xl px-3 py-2 text-xs font-medium transition ${index === activeIndex ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950'}`}
                >
                  {card.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function PublicHomepage({ settings, softwareName, accentLabel, saasPlans }: PublicHomepageProps) {
  const heroSlides = settings.heroBanners.length
    ? settings.heroBanners
    : settings.featureScreenshots.map((shot) => ({
        id: shot.id,
        eyebrow: shot.title,
        title: shot.title,
        description: shot.description,
        imagePath: shot.imagePath,
      }));

  const usageCards = useMemo(
    () =>
      (settings.featureScreenshots.length ? settings.featureScreenshots : heroSlides).slice(0, 4).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        imagePath: item.imagePath,
      })),
    [heroSlides, settings.featureScreenshots],
  );

  const compactFeatures = [
    {
      title: 'Templates that scale',
      description: 'Reusable document systems with premium output.',
      icon: FolderKanban,
    },
    {
      title: 'Approvals that feel calm',
      description: 'Clear review ownership, tracking, and control.',
      icon: Workflow,
    },
    {
      title: 'Client flows that look polished',
      description: 'Share, collect, sign, and follow up from one space.',
      icon: UsersRound,
    },
    {
      title: 'Governance built in',
      description: 'Role-aware access, history, and safer operations.',
      icon: ShieldCheck,
    },
  ];

  const audienceCards = settings.audienceProfiles.slice(0, 4);
  const featuredPlans = saasPlans.slice(0, 2);

  return (
    <PublicSiteChrome softwareName={softwareName} accentLabel={accentLabel} settings={settings}>
      <section className="homepage-fade-up relative overflow-hidden rounded-[2.2rem] border border-black/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.99)_0%,rgba(248,250,252,0.98)_38%,rgba(255,255,255,0.99)_100%)] px-5 py-5 shadow-[0_30px_90px_rgba(15,23,42,0.08)] sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10 2xl:px-12">
        <div className="pointer-events-none absolute left-[-6rem] top-[-7rem] h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.18),rgba(96,165,250,0))] blur-3xl homepage-float" />
        <div className="pointer-events-none absolute right-[-4rem] top-8 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.16),rgba(148,163,184,0))] blur-3xl homepage-float-delayed" />

        <div className="grid gap-8 xl:gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:items-center">
          <div className="relative z-10 px-1 py-2 lg:pr-8 xl:pr-10">
            <h1 className="mt-3 max-w-3xl text-[2.4rem] font-semibold leading-[0.92] tracking-[-0.07em] text-slate-950 sm:text-[3.6rem] lg:text-[5rem]">
              Futuristic document operations,
              <span className="block bg-[linear-gradient(135deg,#0f172a_0%,#334155_42%,#2563eb_78%,#60a5fa_100%)] bg-clip-text text-transparent">without the clutter.</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7 lg:text-lg">
              {settings.heroSubtitle}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="h-11 rounded-xl bg-slate-950 px-6 text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)] hover:bg-slate-800">
                <a href={settings.primaryCtaHref || '/schedule-demo'}>
                  {settings.primaryCtaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl border-slate-300 bg-white px-6 text-slate-950 hover:bg-slate-950 hover:text-white">
                <Link href="/signup">Start Free</Link>
              </Button>
              <Button asChild variant="ghost" className="h-11 rounded-xl px-4 text-slate-700 hover:bg-slate-100 hover:text-slate-950">
                <a href={settings.secondaryCtaHref || '/login'}>
                  {settings.secondaryCtaLabel}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {settings.stats.slice(0, 3).map((stat) => (
                <div key={stat.id} className="rounded-[1.4rem] border border-black/5 bg-white/94 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur">
                  <p className="text-2xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-3xl">{stat.value}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <HeroSlider slides={heroSlides} />
        </div>
      </section>

      <UsageShowcase cards={usageCards} />

      <section className="homepage-fade-up-delay rounded-[2rem] border border-black/5 bg-white px-5 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)] sm:px-7 sm:py-8 lg:px-10 xl:px-12 xl:py-10">
        <SectionHeading
          eyebrow="Core capabilities"
          title="A cleaner, sharper operating layer for every document move."
          subtitle="Built to look premium in front of leadership, internal teams, and clients."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {compactFeatures.map((feature, index) => {
            const Icon = feature.icon;
            const shot = usageCards[index % Math.max(usageCards.length, 1)];

            return (
              <article
                key={feature.title}
                className="group overflow-hidden rounded-[1.7rem] border border-black/5 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_16px_34px_rgba(15,23,42,0.05)]"
              >
                <div className="relative h-44 overflow-hidden">
                  {shot ? <Image src={shot.imagePath} alt={feature.title} fill unoptimized className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" /> : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(15,23,42,0.12)_42%,rgba(2,6,23,0.76)_100%)]" />
                  <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-[linear-gradient(135deg,rgba(0,0,0,0.72),rgba(59,130,246,0.52))] text-white backdrop-blur-xl">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {audienceCards.length > 0 ? (
        <section className="homepage-fade-up-delay rounded-[2rem] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] px-5 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)] sm:px-7 sm:py-8 lg:px-10 xl:px-12 xl:py-10">
          <SectionHeading
            eyebrow="Who uses docrud"
            title="Built for teams that need premium execution."
            subtitle="Shorter cycles, better client handling, and stronger governance."
          />

          <div className="-mx-1 mt-8 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-4 px-1">
              {audienceCards.map((profile, index) => (
                <div
                  key={profile.id}
                  className={`w-[310px] flex-none rounded-[1.7rem] border border-black/6 p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)] ${
                    index % 2 === 0 ? 'bg-white' : 'bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]'
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#334155_52%,#2563eb_100%)] text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{profile.businessType}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{profile.usage}</p>
                  <div className="mt-5 rounded-[1.25rem] border border-black/5 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-700">Business outcome</p>
                    <p className="mt-2 text-sm leading-6 text-slate-800">{profile.benefit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="homepage-fade-up-delay relative overflow-hidden rounded-[2.1rem] border border-white/10 bg-[linear-gradient(180deg,#050505_0%,#0b0b0c_100%)] px-5 py-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:px-7 sm:py-8 lg:px-10 xl:px-12 xl:py-10">
        <div className="pointer-events-none absolute left-[-6rem] top-[-5rem] h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),rgba(255,255,255,0))] blur-3xl homepage-float" />
        <div className="pointer-events-none absolute right-[-5rem] bottom-[-4rem] h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.10),rgba(59,130,246,0))] blur-3xl homepage-float-delayed" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01),rgba(0,0,0,0.16))]" />
        <div className="grid gap-8 xl:gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="relative z-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55 sm:text-[11px]">Ready for rollout</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-white sm:text-4xl lg:text-[3.2rem]">
              Premium enough for leadership. Simple enough for teams.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/72 sm:text-base">
              Launch docrud as a clean workspace for approvals, client communication, generation, and governed execution.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="h-11 rounded-xl bg-slate-950 px-6 text-white hover:bg-slate-800">
                <Link href="/schedule-demo">
                  Schedule Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl border-white/20 bg-white/10 px-6 text-white hover:bg-white hover:text-slate-950">
                <Link href="/signup">Create Workspace</Link>
              </Button>
            </div>
          </div>

          <div className="relative z-10 grid gap-4 sm:grid-cols-2">
            {featuredPlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))] p-5 backdrop-blur-2xl shadow-[14px_14px_34px_rgba(0,0,0,0.34),inset_1px_1px_0_rgba(255,255,255,0.12)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">SaaS workspace</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{plan.name}</h3>
                <p className="mt-2 text-sm leading-6 text-white/72">{plan.description}</p>
                <p className="mt-5 text-lg font-semibold text-white">{plan.priceLabel}</p>
              </div>
            ))}
            <div className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04),rgba(96,165,250,0.03))] p-5 backdrop-blur-2xl shadow-[16px_16px_36px_rgba(0,0,0,0.34),inset_1px_1px_0_rgba(255,255,255,0.10)] sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">Why it stands out</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {settings.socialProofItems.slice(0, 3).map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))] px-4 py-4 text-sm font-medium text-white shadow-[10px_10px_24px_rgba(0,0,0,0.24),inset_1px_1px_0_rgba(255,255,255,0.08)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteChrome>
  );
}
