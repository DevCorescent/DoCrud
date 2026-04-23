'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ArrowRight, BrainCircuit, ChevronDown, FileSpreadsheet, FileText, Grid2x2, House, Lightbulb, LogIn, Menu, Search, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { LandingSettings, PlatformConfig, PlatformFeatureControlKey } from '@/types/document';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import DocrudLogo from '@/components/DocrudLogo';
import { policyCompany, policyDefinitions } from '@/lib/policies';
import { trackTelemetry } from '@/lib/telemetry-client';

interface PublicSiteChromeProps {
  softwareName: string;
  accentLabel: string;
  settings: LandingSettings;
  children: React.ReactNode;
}

interface PublicSearchResult {
  id: string;
  title: string;
  description: string;
  href: string;
  type: 'feature' | 'page' | 'file' | 'article';
  category: string;
  badge?: string;
}

interface PublicNavItem {
  href: string;
  label: string;
  description: string;
  badge?: string;
}

interface PublicNavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: PublicNavItem[];
}

export default function PublicSiteChrome({ softwareName, accentLabel, settings, children }: PublicSiteChromeProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchVisible, setMobileSearchVisible] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<PublicSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  const [wishSubmitting, setWishSubmitting] = useState(false);
  const [wishFeedback, setWishFeedback] = useState<string>('');
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [wishForm, setWishForm] = useState({
    name: '',
    email: '',
    organization: '',
    message: '',
  });
  const dashboardHref = '/workspace';
  const isAuthenticated = status === 'authenticated' && Boolean(session?.user);
  const isPlatformFeatureEnabled = useMemo(
    () => (feature: PlatformFeatureControlKey) => platformConfig?.featureControls?.[feature] !== false,
    [platformConfig],
  );
  const navGroups = useMemo<PublicNavGroup[]>(() => ([
    {
      label: 'Build',
      icon: Sparkles,
      items: [
        { href: '/forms', label: 'Forms', description: 'Build polished forms fast.', badge: 'FREE' },
        { href: '/pdf-editor', label: 'PDF Editor', description: 'Edit, merge, split, and export PDFs.', badge: 'FREE' },
        { href: '/file-directory', label: 'File Directory', description: 'Publish public files or lock private ones.', badge: 'FREE' },
        { href: '/gigs', label: 'Gigs', description: 'Explore project gigs and publish your own work briefs.', badge: 'NEW' },
        { href: '/docrudians', label: 'Docrudians', description: 'Create public or private work rooms.', badge: 'FREE' },
        { href: '/workspace?tab=virtual-id', label: 'Virtual ID', description: 'Create QR identity cards.', badge: 'PRO' },
        { href: '/workspace?tab=certificates', label: 'Certificates', description: 'Publish verifiable e-certificates.', badge: 'PRO' },
        { href: '/daily-tools', label: 'Daily Tools', description: 'Open converters and utility tools.', badge: 'FREE' },
        { href: '/blog', label: 'Blog', description: 'Read product notes and write if you are logged in.', badge: 'NEW' },
      ],
    },
    {
      label: 'AI',
      icon: BrainCircuit,
      items: [
        { href: '/doxpert', label: 'DoXpert AI', description: 'Review documents with AI.' },
        { href: '/visualizer', label: 'Visualizer AI', description: 'Turn dense data into insights.' },
        { href: '/resume-ats', label: 'Resume ATS', description: 'Score and improve resumes.' },
      ],
    },
    {
      label: 'Secure',
      icon: ShieldCheck,
      items: [
        { href: '/file-transfers', label: 'File Transfers', description: 'Share files with control.' },
        { href: '/document-encrypter', label: 'Encrypter', description: 'Lock sensitive files.' },
        { href: '/pricing', label: 'Pricing', description: 'See plans and limits.' },
      ],
    },
    {
      label: 'More',
      icon: Users,
      items: [
        { href: '/docrudians', label: 'Docrudians', description: 'Launch secure rooms for teams, colleges, and events.' },
        { href: '/support', label: 'Support', description: 'Get help and guidance.' },
        { href: '/upcoming-features', label: 'Roadmap', description: 'See what is shipping next.' },
        { href: '/blog', label: 'Blog', description: 'Read and publish product writing on docrud.' },
        { href: '/gigs', label: 'Gigs', description: 'Browse gig briefs or publish a cleaner project listing.' },
        { href: '/contact', label: 'Contact', description: 'Talk to the team.' },
      ],
    },
  ]), []);

  useEffect(() => {
    // Lightweight visitor telemetry (no content), used for super admin command center analytics.
    trackTelemetry({
      type: 'page_view',
      surface: 'public',
      path: pathname || '/',
      userId: session?.user?.id,
      userRole: session?.user?.role,
    });
    const startedAt = Date.now();
    return () => {
      trackTelemetry({
        type: 'page_leave',
        surface: 'public',
        path: pathname || '/',
        durationMs: Date.now() - startedAt,
        userId: session?.user?.id,
        userRole: session?.user?.role,
      });
    };
  }, [pathname, session?.user?.id, session?.user?.role]);
  const mobileNavItems = useMemo(() => ([
    { href: '/', label: 'Home', icon: House },
    { href: '/file-directory', label: 'Files', icon: Grid2x2, badge: 'FREE' },
    { href: '/forms', label: 'Forms', icon: FileSpreadsheet, badge: 'FREE' },
    { href: '/pdf-editor', label: 'PDF', icon: FileText, badge: 'FREE' },
    { href: isAuthenticated ? dashboardHref : '/login', label: isAuthenticated ? 'Menu' : 'Login', icon: isAuthenticated ? Menu : LogIn, isMenu: isAuthenticated },
  ]), [dashboardHref, isAuthenticated]);
  const filteredNavGroups = useMemo(() => (
    navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.href === '/file-directory' || item.href === '/file-transfers') return isPlatformFeatureEnabled('file_manager');
          if (item.href === '/docrudians') return isPlatformFeatureEnabled('docrudians');
          if (item.href === '/workspace?tab=virtual-id') return isPlatformFeatureEnabled('virtual_id');
          if (item.href === '/workspace?tab=certificates') return isPlatformFeatureEnabled('e_certificates');
          if (item.href === '/doxpert') return isPlatformFeatureEnabled('doxpert');
          if (item.href === '/visualizer') return isPlatformFeatureEnabled('visualizer');
          if (item.href === '/document-encrypter') return isPlatformFeatureEnabled('document_encrypter');
          if (item.href === '/support') return isPlatformFeatureEnabled('support');
          return true;
        }),
      }))
      .filter((group) => group.items.length > 0)
  ), [isPlatformFeatureEnabled, navGroups]);
  const filteredMobileNavItems = useMemo(() => (
    mobileNavItems.filter((item) => {
      if (item.href === '/file-directory') return isPlatformFeatureEnabled('file_manager');
      return true;
    })
  ), [isPlatformFeatureEnabled, mobileNavItems]);
  const showSearchDropdown = globalSearch.trim().length > 0;
  const filteredSearchResults = useMemo(() => {
    return searchResults.filter((item) => {
      if (item.href.includes('/file-directory') || item.href.includes('/file-transfers')) return isPlatformFeatureEnabled('file_manager');
      if (item.href.includes('/doxpert')) return isPlatformFeatureEnabled('doxpert');
      if (item.href.includes('/visualizer')) return isPlatformFeatureEnabled('visualizer');
      if (item.href.includes('tab=virtual-id')) return isPlatformFeatureEnabled('virtual_id');
      if (item.href.includes('tab=certificates')) return isPlatformFeatureEnabled('e_certificates');
      if (item.href.includes('tab=deal-room')) return isPlatformFeatureEnabled('deal_room');
      if (item.href.includes('/docrudians')) return isPlatformFeatureEnabled('docrudians');
      if (item.href.includes('/document-encrypter')) return isPlatformFeatureEnabled('document_encrypter');
      if (item.href.includes('/support')) return isPlatformFeatureEnabled('support');
      return true;
    });
  }, [isPlatformFeatureEnabled, searchResults]);
  const noSearchResults = showSearchDropdown && !searchLoading && filteredSearchResults.length === 0;
  const groupedResults = useMemo(() => {
    return filteredSearchResults.reduce<Record<string, PublicSearchResult[]>>((accumulator, item) => {
      accumulator[item.category] = accumulator[item.category] ? [...accumulator[item.category], item] : [item];
      return accumulator;
    }, {});
  }, [filteredSearchResults]);

  useEffect(() => {
    setWishForm((current) => ({
      ...current,
      name: current.name || session?.user?.name || '',
      email: current.email || session?.user?.email || '',
      organization: current.organization || '',
    }));
  }, [session?.user?.email, session?.user?.name]);

  useEffect(() => {
    let active = true;
    void fetch('/api/platform', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!active || !payload) return;
        setPlatformConfig(payload);
      })
      .catch(() => {
        if (!active) return;
        setPlatformConfig(null);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!globalSearch.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        trackTelemetry({
          type: 'search',
          surface: 'public',
          path: pathname || '/',
          query: globalSearch.trim(),
          userId: session?.user?.id,
          userRole: session?.user?.role,
        });
        const response = await fetch(`/api/public/search?query=${encodeURIComponent(globalSearch.trim())}`, { signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Search failed.');
        }
        setSearchResults(Array.isArray(payload?.results) ? payload.results : []);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [globalSearch, pathname, session?.user?.id, session?.user?.role]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const element = target.closest('[data-telemetry-cta]') as HTMLElement | null;
      if (!element) return;
      const ctaId = element.getAttribute('data-telemetry-cta') || '';
      if (!ctaId) return;
      trackTelemetry({
        type: 'cta_click',
        surface: 'public',
        path: pathname || '/',
        ctaId,
        userId: session?.user?.id,
        userRole: session?.user?.role,
      });
    };

    window.addEventListener('click', handleClick, { passive: true });
    return () => window.removeEventListener('click', handleClick);
  }, [pathname, session?.user?.id, session?.user?.role]);

  useEffect(() => {
    const updateVisibility = () => {
      setMobileSearchVisible(window.scrollY > 28 || globalSearch.trim().length > 0);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateVisibility);
  }, [globalSearch]);

  const submitWish = async () => {
    if (!wishForm.name.trim() || !wishForm.email.trim() || !wishForm.message.trim()) {
      setWishFeedback('Add your name, email, and what you were trying to find.');
      return;
    }

    try {
      setWishSubmitting(true);
      const response = await fetch('/api/contact-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'wishlist',
          name: wishForm.name.trim(),
          email: wishForm.email.trim(),
          organization: wishForm.organization.trim() || 'Public Portal',
          message: wishForm.message.trim(),
          searchedFor: globalSearch.trim(),
          sourcePath: pathname,
          useCase: 'Global search wish',
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to submit your wish right now.');
      }
      setWishFeedback('Wish sent to docrud for review.');
      setWishSubmitting(false);
      setTimeout(() => {
        setWishOpen(false);
        setWishFeedback('');
      }, 1200);
    } catch (error) {
      setWishSubmitting(false);
      setWishFeedback(error instanceof Error ? error.message : 'Unable to submit your wish right now.');
    }
  };

  const openInsightsPanel = () => {
    setMobileMenuOpen(false);
    setMobileSearchVisible(false);
    if (isAuthenticated) {
      router.push('/workspace?tab=dashboard&open=insights');
      return;
    }
    router.push('/login');
  };

  return (
    <main className="premium-shell min-h-screen w-full max-w-full overflow-x-visible px-1 py-1 pb-28 pt-[5.1rem] text-slate-950 sm:px-2 sm:py-2 sm:pb-8 sm:pt-4 lg:overflow-x-hidden lg:px-3 xl:px-4 2xl:px-5">
      <div className="fixed inset-x-1 top-1 z-40 lg:hidden">
        <div className="relative cloud-panel rounded-[1.25rem] px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="min-w-0">
              <div className="flex min-w-0 items-center gap-3">
                <DocrudLogo className="max-w-[10.5rem]" height={36} priority />
              </div>
            </Link>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={openInsightsPanel}
                className="cloud-pill inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold tracking-[-0.01em] text-slate-700"
              >
                <Lightbulb className="h-3.5 w-3.5 text-sky-600" />
                Insights
              </button>
            ) : null}
          </div>

          <div
            className={`pointer-events-none absolute left-0 right-0 top-[calc(100%+0.5rem)] px-1 transition-all duration-300 ${
              mobileSearchVisible
                ? 'translate-y-0 opacity-100'
                : '-translate-y-2 opacity-0'
            }`}
          >
            <div className="pointer-events-auto rounded-[1.35rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(242,247,255,0.86))] px-4 py-2.5 text-sm text-slate-600 shadow-[0_8px_28px_rgba(148,163,184,0.035),inset_0_1px_0_rgba(255,255,255,0.56)] backdrop-blur-[24px]">
              <div className="flex items-center gap-3">
              <Search className="h-4 w-4 text-slate-600" />
              <input
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                placeholder="Search files, features, tools, and pages"
                className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-500"
              />
              </div>
            </div>
            {showSearchDropdown ? (
              <div className="pointer-events-auto absolute left-1 right-1 top-[calc(100%+0.55rem)] z-[90] max-h-[55vh] overflow-y-auto rounded-[1.25rem] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-3 shadow-[0_22px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
                {searchLoading ? (
                  <div className="flex items-center gap-2 px-2 py-3 text-sm text-slate-500">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
                    Searching everything in docrud...
                  </div>
                ) : filteredSearchResults.length ? (
                  <div className="space-y-3">
                    {Object.entries(groupedResults).map(([group, items]) => (
                      <div key={group}>
                        <p className="px-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">{group}</p>
                        <div className="mt-2 space-y-1">
                          {items.map((item) => (
                            <Link
                              key={item.id}
                              href={item.href}
                              onClick={() => setGlobalSearch('')}
                              className="flex items-start justify-between gap-3 rounded-[1rem] bg-white/78 px-3 py-3 transition hover:bg-white"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-950">{item.title}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
                              </div>
                              {item.badge ? (
                                <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                  {item.badge}
                                </span>
                              ) : null}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 px-2 py-2">
                    <p className="text-sm text-slate-500">Nothing relevant came up for this search.</p>
                    <Button type="button" variant="outline" className="rounded-full" onClick={() => setWishOpen(true)}>
                      Make a wish
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto min-w-0 w-full max-w-[calc(100vw-0.25rem)] overflow-x-visible space-y-3 sm:max-w-[calc(100vw-0.5rem)] sm:space-y-5 lg:max-w-[calc(100vw-0.9rem)] lg:overflow-x-hidden lg:space-y-7">
        <header className="cloud-panel sticky top-0 z-[70] hidden overflow-visible rounded-b-[1.25rem] px-3 py-3 sm:top-3 sm:block sm:rounded-[1.8rem] sm:px-6 lg:px-8 2xl:px-10">
          <div className="flex items-center justify-between gap-3 lg:gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Link href="/" className="min-w-0">
                <div className="flex min-w-0 items-center gap-3">
                  <DocrudLogo className="max-w-[12rem]" height={40} priority />
                </div>
              </Link>
              <div className="relative z-[80] hidden lg:block">
                <div className="premium-surface-soft hidden min-w-[16rem] items-center gap-3 rounded-full border-white/80 px-4 py-2.5 text-sm text-slate-400 lg:flex xl:min-w-[23rem]">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={globalSearch}
                    onChange={(event) => setGlobalSearch(event.target.value)}
                    placeholder="Search features, public files, pages, and tools"
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
                {showSearchDropdown ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-[95] max-h-[30rem] overflow-y-auto rounded-[1.25rem] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-3 shadow-[0_26px_54px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
                    {searchLoading ? (
                      <div className="flex items-center gap-2 px-2 py-3 text-sm text-slate-500">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
                        Searching everything in docrud...
                      </div>
                    ) : filteredSearchResults.length ? (
                      <div className="space-y-3">
                        {Object.entries(groupedResults).map(([group, items]) => (
                          <div key={group}>
                            <p className="px-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">{group}</p>
                            <div className="mt-2 space-y-1">
                              {items.map((item) => (
                                <Link
                                  key={item.id}
                                  href={item.href}
                                  onClick={() => setGlobalSearch('')}
                                  className="flex items-start justify-between gap-3 rounded-[1rem] bg-white/78 px-3 py-3 transition hover:bg-white"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-950">{item.title}</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
                                  </div>
                                  {item.badge ? (
                                    <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                      {item.badge}
                                    </span>
                                  ) : null}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3 px-2 py-2">
                        <p className="text-sm text-slate-500">Nothing relevant came up for this search.</p>
                        <Button type="button" variant="outline" className="rounded-full" onClick={() => setWishOpen(true)}>
                          Make a wish
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <Button asChild className="premium-button h-10 shrink-0 rounded-full px-3 text-sm text-white hover:opacity-95 lg:hidden sm:px-4">
                <a href={settings.primaryCtaHref || '/schedule-demo'}>
                  Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            <nav className="hidden min-w-0 items-center justify-end gap-2 lg:flex">
              <div className="premium-surface-soft flex min-w-0 items-center gap-1 rounded-full border-white/85 px-1.5 py-1 text-sm text-slate-600">
                <Link
                  href="/"
                  className={`rounded-full px-3 py-2 text-sm transition ${pathname === '/' ? 'bg-slate-950 text-white shadow-[0_8px_18px_rgba(15,23,42,0.14)]' : 'text-slate-600 hover:bg-white hover:text-slate-950'}`}
                >
                  Home
                </Link>
                {filteredNavGroups.map((group) => {
                  const Icon = group.icon;
                  const isGroupActive = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
                  return (
                    <DropdownMenu.Root key={group.label}>
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition outline-none ${
                            isGroupActive
                              ? 'bg-slate-950 text-white shadow-[0_8px_18px_rgba(15,23,42,0.14)]'
                              : 'text-slate-700 hover:bg-white hover:text-slate-950'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {group.label}
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          sideOffset={10}
                          align="center"
                          className="z-50 w-[20rem] rounded-[1.35rem] border border-white/90 bg-white/96 p-2 shadow-[0_28px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl"
                        >
                          <div className="px-2 pb-2 pt-1">
                            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500">{group.label}</p>
                          </div>
                          <div className="space-y-1">
                            {group.items.map((item) => (
                              <DropdownMenu.Item key={item.href} asChild>
                                <Link
                                  href={item.href}
                                  className="flex items-start justify-between gap-3 rounded-[1rem] px-3 py-3 text-left outline-none transition hover:bg-slate-50/90 focus:bg-slate-50/90"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-950">{item.label}</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                                  </div>
                                  {item.badge ? <span className="mt-0.5 shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-700">{item.badge}</span> : null}
                                </Link>
                              </DropdownMenu.Item>
                            ))}
                          </div>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  );
                })}
              </div>
              <Button asChild variant="outline" className="cloud-pill shrink-0 rounded-full border-0 px-5 text-slate-950 hover:bg-white/95 hover:text-slate-950">
                <Link data-telemetry-cta="nav_dashboard" href={isAuthenticated ? dashboardHref : '/login'}>
                  {isAuthenticated ? 'Dashboard' : 'Login'}
                </Link>
              </Button>
              <Button asChild className="premium-button shrink-0 rounded-full px-5 text-white hover:opacity-95">
                <Link data-telemetry-cta="nav_start_trial" href="/signup">
                  Start Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </nav>
          </div>
        </header>

        {children}

        <footer className="cloud-panel rounded-[1.55rem] px-4 py-6 sm:rounded-[1.9rem] sm:px-7 sm:py-7 lg:px-9 2xl:px-12">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <DocrudLogo className="max-w-[13rem] sm:max-w-[14rem]" height={46} />
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Create, review, share, and manage work from one cleaner document workspace.
              </p>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                Operated by {policyCompany.parentCompanyName}. Policies effective from {policyCompany.effectiveDateLabel}.
              </p>
            </div>

            <div className="grid gap-2 text-sm text-slate-600 sm:text-right">
              <Link href="/support" className="hover:text-slate-950">Support</Link>
              <Link href="/pricing" className="hover:text-slate-950">Pricing</Link>
              <Link href="/contact" className="hover:text-slate-950">Contact</Link>
              <Link href="/schedule-demo" className="hover:text-slate-950">Schedule Demo</Link>
              <a href={`mailto:${settings.contactEmail}`} className="hover:text-slate-950">{settings.contactEmail}</a>
            </div>
          </div>
            <div className="cloud-card-soft rounded-[1.15rem] px-4 py-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">Policies and legal</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {policyDefinitions.map((policy) => (
                  <Link key={policy.id} href={policy.href} className="text-sm text-slate-600 transition hover:text-slate-950">
                    {policy.shortLabel}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 md:hidden">
        {mobileMenuOpen ? (
          <div className="cloud-panel mb-3 max-h-[68vh] overflow-hidden rounded-[1.4rem] p-3">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-1 pb-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">Explore</p>
                <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-950">Open any feature fast</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="no-scrollbar mt-3 max-h-[56vh] space-y-4 overflow-y-auto pr-1">
              {filteredNavGroups.map((group) => {
                const Icon = group.icon;
                return (
                  <section key={group.label} className="cloud-card-soft rounded-[1.15rem] p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-semibold tracking-[-0.02em] text-slate-950">{group.label}</p>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="cloud-pill flex items-start justify-between gap-3 rounded-[1rem] px-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-950">{item.label}</p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.description}</p>
                          </div>
                          {item.badge ? (
                            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="cloud-panel grid grid-cols-5 rounded-[1.35rem] px-1 py-1.5">
          {filteredMobileNavItems.map(({ href, label, icon: Icon, badge, isMenu }) => {
            const classes = `relative flex min-w-0 items-center justify-center gap-1.5 rounded-[1rem] px-1.5 py-2.5 text-[10px] font-semibold tracking-[-0.01em] transition-all duration-300 ${
              (isMenu && mobileMenuOpen) || pathname === href
                ? 'bg-[linear-gradient(135deg,#0f172a,#1e293b)] text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]'
                : 'text-slate-700 hover:bg-white/70 hover:text-slate-950 active:scale-[0.97]'
            }`;

            if (isMenu) {
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMobileMenuOpen((current) => !current)}
                  className={classes}
                >
                  <div className="relative shrink-0">
                    <Icon className="h-[0.98rem] w-[0.98rem]" />
                  </div>
                  <span className="truncate text-[9px] leading-none">{label}</span>
                </button>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={classes}
              >
                <div className="relative shrink-0">
                  <Icon className="h-[0.98rem] w-[0.98rem]" />
                  {badge ? (
                    <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[6px] font-bold uppercase tracking-[0.08em] text-white shadow-[0_6px_14px_rgba(16,185,129,0.25)]">
                      {badge === 'FREE' ? 'F' : badge.slice(0, 1)}
                    </span>
                  ) : null}
                </div>
                <span className="truncate text-[9px] leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Dialog open={wishOpen} onOpenChange={setWishOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Make a wish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              Tell us what you were trying to find. This goes to docrud so the product can improve based on real search gaps.
            </p>
            <Input value={globalSearch} readOnly className="h-11 rounded-xl bg-slate-50" />
            <Input
              value={wishForm.name}
              onChange={(event) => setWishForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Your name"
              className="h-11 rounded-xl"
            />
            <Input
              value={wishForm.email}
              onChange={(event) => setWishForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="Your email"
              className="h-11 rounded-xl"
            />
            <Input
              value={wishForm.organization}
              onChange={(event) => setWishForm((current) => ({ ...current, organization: event.target.value }))}
              placeholder="Organization or community"
              className="h-11 rounded-xl"
            />
            <textarea
              value={wishForm.message}
              onChange={(event) => setWishForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="What were you trying to find or do?"
              className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
            />
            {wishFeedback ? <p className={`text-sm ${wishFeedback.includes('Wish sent') ? 'text-emerald-600' : 'text-rose-600'}`}>{wishFeedback}</p> : null}
            <div className="flex justify-end">
              <Button type="button" className="premium-button rounded-full text-white hover:opacity-95" onClick={() => void submitWish()} disabled={wishSubmitting}>
                {wishSubmitting ? 'Sending...' : 'Send to docrud'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
