'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bookmark, BriefcaseBusiness, Filter, Loader2, Search, Sparkles } from 'lucide-react';
import type { GigListing, LandingSettings } from '@/types/document';
import PublicSiteChrome from '@/components/PublicSiteChrome';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface PublicGigsPageProps {
  settings: LandingSettings;
  softwareName: string;
  accentLabel: string;
  initialGigs: GigListing[];
  categories: string[];
  interests: string[];
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getCategoryTone(category: string) {
  const key = slugify(category || 'general');
  if (key.includes('design')) {
    return {
      pill: 'bg-fuchsia-100/70 text-fuchsia-900 ring-1 ring-fuchsia-200/70',
      chip: 'bg-fuchsia-50/70 text-fuchsia-800 ring-1 ring-fuchsia-200/60',
      glow: 'from-fuchsia-500/18 via-pink-500/10 to-transparent',
    };
  }
  if (key.includes('automation')) {
    return {
      pill: 'bg-emerald-100/70 text-emerald-900 ring-1 ring-emerald-200/70',
      chip: 'bg-emerald-50/70 text-emerald-800 ring-1 ring-emerald-200/60',
      glow: 'from-emerald-500/18 via-teal-500/10 to-transparent',
    };
  }
  if (key.includes('content') || key.includes('writing')) {
    return {
      pill: 'bg-amber-100/70 text-amber-950 ring-1 ring-amber-200/70',
      chip: 'bg-amber-50/70 text-amber-900 ring-1 ring-amber-200/60',
      glow: 'from-amber-500/18 via-orange-500/10 to-transparent',
    };
  }
  if (key.includes('engineering') || key.includes('dev')) {
    return {
      pill: 'bg-sky-100/70 text-sky-950 ring-1 ring-sky-200/70',
      chip: 'bg-sky-50/70 text-sky-900 ring-1 ring-sky-200/60',
      glow: 'from-sky-500/18 via-indigo-500/10 to-transparent',
    };
  }
  if (key.includes('security')) {
    return {
      pill: 'bg-slate-200/70 text-slate-900 ring-1 ring-slate-300/70',
      chip: 'bg-slate-100/70 text-slate-800 ring-1 ring-slate-200/70',
      glow: 'from-slate-500/16 via-slate-400/10 to-transparent',
    };
  }
  return {
    pill: 'bg-violet-100/70 text-violet-950 ring-1 ring-violet-200/70',
    chip: 'bg-violet-50/70 text-violet-900 ring-1 ring-violet-200/60',
    glow: 'from-violet-500/18 via-sky-500/10 to-transparent',
  };
}

function isGigFeatured(gig: GigListing) {
  if (gig.featuredUntil) {
    const until = new Date(gig.featuredUntil);
    return Number.isFinite(until.getTime()) && until.getTime() > Date.now();
  }
  return Boolean(gig.featured);
}

export default function PublicGigsPage({
  settings,
  softwareName,
  accentLabel,
  initialGigs,
  categories,
  interests,
}: PublicGigsPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAuthenticated = status === 'authenticated' && Boolean(session?.user);

  const [gigs, setGigs] = useState<GigListing[]>(initialGigs);
  const [availableCategories, setAvailableCategories] = useState<string[]>(categories);
  const [availableInterests, setAvailableInterests] = useState<string[]>(interests);
  const [query, setQuery] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [activeInterest, setActiveInterest] = useState('All');
  const [visibility, setVisibility] = useState<'all' | 'public' | 'private'>('all');
  const [locationFilters, setLocationFilters] = useState<Array<GigListing['locationPreference']>>([]);
  const [engagementFilters, setEngagementFilters] = useState<Array<GigListing['engagementType']>>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'replies'>('newest');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [connectTarget, setConnectTarget] = useState<GigListing | null>(null);
  const [connectNote, setConnectNote] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<number | null>(null);
  const seenGigIdsRef = useRef<Set<string>>(new Set());
  const hasHydratedRef = useRef(false);
  const [savedGigIds, setSavedGigIds] = useState<string[]>([]);
  const [gigToastQueue, setGigToastQueue] = useState<GigListing[]>([]);
  const [activeGigToast, setActiveGigToast] = useState<GigListing | null>(null);
  const [toastLeaving, setToastLeaving] = useState(false);
  const PAGE_SIZE = 12;

  useEffect(() => {
    const closeStream = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };

    const stopPolling = () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    const applyPayload = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const record = payload as Record<string, unknown>;
      const nextGigs = Array.isArray(record.discoverListings)
        ? record.discoverListings
        : Array.isArray(record.gigs)
          ? record.gigs
          : [];

      const normalized = (nextGigs as GigListing[]) || [];
      setGigs(normalized);

      // Desktop-only toast queue: show newly added gigs after the first hydration.
      if (!hasHydratedRef.current) {
        hasHydratedRef.current = true;
        seenGigIdsRef.current = new Set(normalized.map((gig) => gig.id));
      } else {
        const newOnes = normalized.filter((gig) => !seenGigIdsRef.current.has(gig.id));
        if (newOnes.length) {
          newOnes.forEach((gig) => seenGigIdsRef.current.add(gig.id));
          setGigToastQueue((current) => [...current, ...newOnes.slice(0, 5)]);
        }
      }

      if (Array.isArray(record.categories)) setAvailableCategories(record.categories as string[]);
      if (Array.isArray(record.interests)) setAvailableInterests(record.interests as string[]);
    };

    const startPolling = () => {
      stopPolling();

      const load = async () => {
        try {
          const endpoint = isAuthenticated ? '/api/gigs' : '/api/public/gigs';
          const response = await fetch(endpoint, { cache: 'no-store' });
          const payload = response.ok ? await response.json() : null;
          applyPayload(payload);
        } catch {
          // ignore
        }
      };

      void load();
      pollingRef.current = window.setInterval(() => void load(), 15000);
    };

    closeStream();
    stopPolling();

    // Prefer stream for realtime updates; fall back to polling when blocked.
    try {
      const endpoint = isAuthenticated ? '/api/gigs/stream' : '/api/public/gigs/stream';
      const es = new EventSource(endpoint);
      eventSourceRef.current = es;

      es.addEventListener('gigs', (event) => {
        const messageEvent = event as MessageEvent<string>;
        try {
          applyPayload(JSON.parse(messageEvent.data));
        } catch {
          // ignore
        }
      });

      es.addEventListener('error', () => {
        closeStream();
        startPolling();
      });
    } catch {
      startPolling();
    }

    return () => {
      closeStream();
      stopPolling();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeGigToast || gigToastQueue.length === 0) return;
    setActiveGigToast(gigToastQueue[0]);
    setGigToastQueue((current) => current.slice(1));
    setToastLeaving(false);
  }, [activeGigToast, gigToastQueue]);

  useEffect(() => {
    if (!activeGigToast) return;
    const timer = window.setTimeout(() => {
      setToastLeaving(true);
      window.setTimeout(() => {
        setActiveGigToast(null);
        setToastLeaving(false);
      }, 240);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [activeGigToast]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('docrud:gigs:saved');
      const next = raw ? (JSON.parse(raw) as unknown) : [];
      setSavedGigIds(Array.isArray(next) ? next.filter((id) => typeof id === 'string') : []);
    } catch {
      setSavedGigIds([]);
    }
  }, []);

  const savedGigIdSet = useMemo(() => new Set(savedGigIds), [savedGigIds]);

  const filteredGigs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return gigs.filter((gig) => {
      const matchesVisibility = visibility === 'all' || gig.visibility === visibility;
      const matchesCategory = categoryFilters.length === 0 || categoryFilters.includes(gig.category);
      const matchesInterest = activeInterest === 'All' || gig.interests.includes(activeInterest);
      const matchesLocation = locationFilters.length === 0 || locationFilters.includes(gig.locationPreference);
      const matchesEngagement = engagementFilters.length === 0 || engagementFilters.includes(gig.engagementType);
      const haystack = `${gig.title} ${gig.summary} ${gig.category} ${gig.interests.join(' ')} ${gig.skills.join(' ')}`.toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchesVisibility && matchesCategory && matchesInterest && matchesLocation && matchesEngagement && matchesQuery;
    });
  }, [activeInterest, categoryFilters, engagementFilters, gigs, locationFilters, query, visibility]);

  const categoryFiltersKey = useMemo(() => categoryFilters.join(','), [categoryFilters]);
  const locationFiltersKey = useMemo(() => locationFilters.join(','), [locationFilters]);
  const engagementFiltersKey = useMemo(() => engagementFilters.join(','), [engagementFilters]);

  useEffect(() => {
    setPage(1);
  }, [activeInterest, categoryFiltersKey, engagementFiltersKey, locationFiltersKey, query, sortBy, visibility]);

  const sortedGigs = useMemo(() => {
    const list = [...filteredGigs];
    if (sortBy === 'replies') {
      list.sort((a, b) => (b.connectCount || 0) - (a.connectCount || 0) || +new Date(b.updatedAt) - +new Date(a.updatedAt));
      return list;
    }
    list.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return list;
  }, [filteredGigs, sortBy]);

  const [featuredGigs, standardGigs] = useMemo(() => {
    const featured: GigListing[] = [];
    const standard: GigListing[] = [];
    for (const gig of sortedGigs) {
      (isGigFeatured(gig) ? featured : standard).push(gig);
    }
    return [featured, standard];
  }, [sortedGigs]);

  const totalCount = sortedGigs.length;
  const totalPages = Math.max(1, Math.ceil(standardGigs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = standardGigs.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(standardGigs.length, safePage * PAGE_SIZE);
  const pageItems = standardGigs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const appliedFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count += 1;
    if (visibility !== 'all') count += 1;
    if (activeInterest !== 'All') count += 1;
    if (categoryFilters.length) count += 1;
    if (locationFilters.length) count += 1;
    if (engagementFilters.length) count += 1;
    return count;
  }, [activeInterest, categoryFilters.length, engagementFilters.length, locationFilters.length, query, visibility]);

  const featuredOrganizations = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const gig of sortedGigs) {
      const name = (gig.organizationName || gig.ownerName || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(name);
      if (list.length >= 7) break;
    }
    return list;
  }, [sortedGigs]);

  const toggleSaved = (gigId: string) => {
    setSavedGigIds((current) => {
      const next = current.includes(gigId) ? current.filter((id) => id !== gigId) : [gigId, ...current];
      try {
        window.localStorage.setItem('docrud:gigs:saved', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleCategoryChip = (category: string) => {
    setCategoryFilters((current) => (current.length === 1 && current[0] === category ? [] : [category]));
  };

  const clearAllFilters = () => {
    setQuery('');
    setVisibility('all');
    setActiveInterest('All');
    setCategoryFilters([]);
    setLocationFilters([]);
    setEngagementFilters([]);
    setSortBy('newest');
  };

  const FiltersPanel = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-[-0.02em] text-slate-950">All filters</p>
          <p className="mt-1 text-xs text-slate-500">{appliedFilterCount ? `Applied (${appliedFilterCount})` : 'No filters applied'}</p>
        </div>
        <Button type="button" variant="outline" className="h-9 rounded-full border-slate-200 bg-white px-3 text-xs" onClick={clearAllFilters} disabled={!appliedFilterCount}>
          Clear
        </Button>
      </div>

      <div className="rounded-[1.55rem] border border-white/0 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.74))] p-4 shadow-[0_18px_46px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Category</p>
        <div className="mt-3 space-y-2">
          {availableCategories.slice(0, 10).map((category) => (
            <label key={category} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={categoryFilters.includes(category)}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setCategoryFilters((current) => checked ? Array.from(new Set([...current, category])) : current.filter((item) => item !== category));
                  }}
                />
                {category}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-[1.55rem] border border-white/0 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.74))] p-4 shadow-[0_18px_46px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Work mode</p>
        <div className="mt-3 space-y-2">
          {(['remote', 'hybrid', 'onsite'] as const).map((item) => (
            <label key={item} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={locationFilters.includes(item)}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setLocationFilters((current) => checked ? Array.from(new Set([...current, item])) : current.filter((value) => value !== item));
                  }}
                />
                {formatLabel(item)}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-[1.55rem] border border-white/0 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.74))] p-4 shadow-[0_18px_46px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Engagement</p>
        <div className="mt-3 space-y-2">
          {(['one_time', 'ongoing', 'retainer'] as const).map((item) => (
            <label key={item} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={engagementFilters.includes(item)}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setEngagementFilters((current) => checked ? Array.from(new Set([...current, item])) : current.filter((value) => value !== item));
                  }}
                />
                {formatLabel(item)}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-[1.55rem] border border-white/0 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.74))] p-4 shadow-[0_18px_46px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Interest</p>
        <select
          value={activeInterest}
          onChange={(event) => setActiveInterest(event.target.value)}
          className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white/92 px-3 text-sm text-slate-800 outline-none"
        >
          <option value="All">All interests</option>
          {availableInterests.slice(0, 40).map((interest) => (
            <option key={interest} value={interest}>{interest}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const submitConnect = async () => {
    if (!connectTarget) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!connectNote.trim()) {
      setFeedback('Add a short intro so the gig owner knows why you are a strong fit.');
      return;
    }

    try {
      setConnectLoading(true);
      setFeedback('');
      const response = await fetch('/api/gigs/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gigId: connectTarget.id,
          note: connectNote.trim(),
          interestArea: activeInterest !== 'All' ? activeInterest : undefined,
          portfolioUrl: portfolioUrl.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to send your request right now.');
      }
      setFeedback('Connection request sent.');
      setConnectTarget(null);
      setConnectNote('');
      setPortfolioUrl('');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to send your request right now.');
    } finally {
      setConnectLoading(false);
    }
  };

  return (
    <PublicSiteChrome softwareName={softwareName} accentLabel={accentLabel} settings={settings}>
      <section className="cloud-panel relative overflow-hidden rounded-[2rem] p-4 sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(56,189,248,0.14),transparent_34%),radial-gradient(circle_at_86%_22%,rgba(139,92,246,0.12),transparent_30%),radial-gradient(circle_at_58%_92%,rgba(16,185,129,0.10),transparent_34%)]" />
        <div className="relative overflow-hidden rounded-[1.7rem] border border-white/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.62))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_18px_46px_rgba(148,163,184,0.12)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.94),transparent)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-[linear-gradient(270deg,rgba(255,255,255,0.94),transparent)]" />
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-3 py-1">
            {availableCategories.map((category) => {
              const active = categoryFilters.length === 1 && categoryFilters[0] === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategoryChip(category)}
                  className={`min-w-[168px] shrink-0 rounded-[1.25rem] px-4 py-3 text-sm font-semibold tracking-[-0.02em] transition duration-300 ${
                    active
                      ? 'bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] text-white shadow-[0_18px_40px_rgba(29,78,216,0.22)] ring-1 ring-white/30'
                      : 'bg-white/78 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl hover:-translate-y-0.5 hover:bg-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_20px_44px_rgba(15,23,42,0.10)]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.28fr_0.54fr_0.18fr] lg:items-start">
        <aside className="hidden lg:block lg:sticky lg:top-24">
          {FiltersPanel}
        </aside>

        <div className="relative space-y-4">
          <div className="pointer-events-none absolute -inset-x-6 -top-6 h-28 bg-[radial-gradient(circle_at_18%_30%,rgba(59,130,246,0.14),transparent_52%),radial-gradient(circle_at_72%_20%,rgba(236,72,153,0.12),transparent_56%),radial-gradient(circle_at_58%_90%,rgba(16,185,129,0.12),transparent_62%)] opacity-80 blur-2xl" />
          {featuredGigs.length ? (
            <div className="-mx-4 rounded-[1.9rem] bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,41,59,0.88))] px-4 py-4 shadow-[0_26px_70px_rgba(15,23,42,0.18)] sm:mx-0 sm:rounded-[2rem] sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Featured gigs</p>
                  <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-white">Boosted listings that are trending right now</p>
                </div>
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-slate-200">{featuredGigs.length}</span>
              </div>
              <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
                {featuredGigs.slice(0, 10).map((gig) => (
                  <Link
                    key={gig.id}
                    href={`/gigs/${gig.slug}`}
                    className="group relative w-[78vw] max-w-[420px] flex-none snap-start overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.06))] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.22),rgba(255,255,255,0.08))] sm:w-[360px]"
                  >
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${getCategoryTone(gig.category).glow}`} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[1.02rem] font-semibold tracking-[-0.03em] text-white group-hover:text-white">{gig.title}</p>
                        <p className="mt-1 truncate text-sm text-slate-200">{gig.organizationName || gig.ownerName}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
                        <Sparkles className="h-3.5 w-3.5" />
                        Featured
                      </span>
                    </div>
                    <p className="relative mt-3 line-clamp-2 text-sm leading-7 text-slate-200">{gig.summary}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">{gig.budgetLabel}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-200">
                        View
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              {standardGigs.length ? (
                <span className="font-medium text-slate-700">{startIndex}-{endIndex}</span>
              ) : (
                <span className="font-medium text-slate-700">0</span>
              )}
              <span className="ml-1">of {totalCount} gigs</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full border-slate-200 bg-white px-4 text-sm lg:hidden"
                onClick={() => setFiltersOpen(true)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none"
              >
                <option value="newest">Sort by: Newest</option>
                <option value="replies">Sort by: Most replies</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4">
            {pageItems.length ? pageItems.map((gig) => {
              const saved = savedGigIdSet.has(gig.id);
              const tone = getCategoryTone(gig.category);
              return (
                <article key={gig.id} className="group relative overflow-hidden rounded-[1.8rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-4 shadow-[0_18px_52px_rgba(15,23,42,0.07)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_70px_rgba(15,23,42,0.10)] sm:p-5">
                  <div className={`pointer-events-none absolute -left-12 top-0 h-full w-56 bg-gradient-to-br ${tone.glow} opacity-90 blur-2xl`} />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/gigs/${gig.slug}`} className="block truncate text-[1.05rem] font-semibold tracking-[-0.03em] text-slate-950 hover:text-sky-700 sm:text-[1.15rem]">
                        {gig.title}
                      </Link>
                      <p className="mt-1 text-sm font-medium text-slate-600">{gig.organizationName || gig.ownerName}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className={`rounded-full px-3 py-1 font-semibold ${tone.pill}`}>{gig.category}</span>
                        <span className="rounded-full bg-slate-100/80 px-3 py-1 font-semibold text-slate-700">{formatLabel(gig.locationPreference)}</span>
                        <span className="rounded-full bg-slate-100/80 px-3 py-1 font-semibold text-slate-700">{formatLabel(gig.engagementType)}</span>
                        {(gig.bidMode || 'fixed') === 'bidding' ? (
                          <span className="rounded-full bg-amber-100/70 px-3 py-1 font-semibold text-amber-900">Bidding</span>
                        ) : null}
                        <span className="rounded-full bg-slate-100/80 px-3 py-1 font-semibold text-slate-700">{formatRelativeTime(gig.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSaved(gig.id)}
                        className={`grid h-10 w-10 place-items-center rounded-full transition ${
                          saved
                            ? 'bg-slate-950 text-white'
                            : 'bg-white/92 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_30px_rgba(15,23,42,0.07)] hover:text-slate-950'
                        }`}
                        aria-label={saved ? 'Unsave gig' : 'Save gig'}
                      >
                        <Bookmark className="h-4 w-4" />
                      </button>
                      <span className="hidden rounded-[1.2rem] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 sm:inline">
                        {gig.budgetLabel}
                      </span>
                    </div>
                  </div>

                  <p className="relative mt-3 line-clamp-2 text-sm leading-7 text-slate-600">{gig.summary}</p>

                  <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <div className="flex flex-wrap gap-2">
                      {gig.skills.slice(0, 5).map((skill) => (
                        <span key={`${gig.id}-${skill}`} className={`rounded-full px-3 py-1.5 text-xs font-medium ${tone.chip}`}>
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" className="h-10 rounded-full border-slate-200 bg-white px-4 text-sm">
                        <Link href={`/gigs/${gig.slug}`}>View</Link>
                      </Button>
                      <Button
                        type="button"
                        className="h-10 rounded-full bg-slate-950 px-4 text-sm text-white hover:bg-slate-800"
                        onClick={() => {
                          if (!isAuthenticated) {
                            router.push('/login');
                            return;
                          }
                          setConnectTarget(gig);
                          setFeedback('');
                        }}
                      >
                        Connect
                      </Button>
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-[1.7rem] bg-white p-10 text-center shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
                <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">No gigs match this filter yet.</p>
                <p className="mt-2 text-sm text-slate-600">Try removing a filter, or post a gig from your workspace.</p>
              </div>
            )}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 rounded-[1.5rem] bg-white/90 px-4 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full border-slate-200 bg-white px-3 text-xs"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
              >
                Prev
              </Button>
              <div className="text-xs font-semibold text-slate-600">
                Page {safePage} of {totalPages}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full border-slate-200 bg-white px-3 text-xs"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage === totalPages}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.07)] backdrop-blur-2xl">
            <p className="text-sm font-semibold text-slate-950">Featured teams</p>
            <p className="mt-1 text-xs text-slate-500">Based on what is live right now</p>
            <div className="mt-4 grid gap-3">
              {featuredOrganizations.length ? featuredOrganizations.map((name) => (
                <div key={name} className="flex items-center gap-3 rounded-[1.25rem] bg-slate-50/70 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                  <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-[1.2rem] bg-white/92 text-sm font-semibold text-slate-800 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.18),transparent_60%),radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.16),transparent_62%)]" />
                    <span className="relative">{name.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">View gigs</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500">No teams yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] p-5 text-white shadow-[0_26px_70px_rgba(15,23,42,0.18)]">
            <p className="text-sm font-semibold">Post your gig</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">Publish a clean brief, and Docai helps tighten the scope inside the workspace.</p>
            <Button asChild className="mt-4 w-full rounded-full bg-white text-slate-950 hover:bg-slate-100">
              <Link href={isAuthenticated ? '/workspace?tab=gigs' : '/login'}>
                {isAuthenticated ? 'Open gigs studio' : 'Login to publish'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </aside>
      </section>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-w-xl rounded-[1.7rem] border-white/0 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-left text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">
              Filters
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            {FiltersPanel}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(connectTarget)} onOpenChange={(open) => { if (!open) setConnectTarget(null); }}>
        <DialogContent className="max-w-xl rounded-[1.7rem] border-white/0 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.78))] p-0 shadow-[0_28px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
          <DialogHeader className="border-b border-white/55 px-6 py-5">
            <DialogTitle className="text-left text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">
              Connect for {connectTarget?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm leading-6 text-slate-600">
              Keep it short. This goes straight into the owner&apos;s gigs inbox inside docrud.
            </p>
            <textarea
              value={connectNote}
              onChange={(event) => setConnectNote(event.target.value)}
              className="min-h-[130px] w-full rounded-[1.2rem] border border-slate-200 bg-white/90 px-4 py-3 text-sm leading-6 text-slate-900 outline-none"
              placeholder="Why are you a strong fit, and how would you approach this work?"
            />
            <Input
              value={portfolioUrl}
              onChange={(event) => setPortfolioUrl(event.target.value)}
              placeholder="Portfolio or profile link (optional)"
              className="rounded-[1.1rem] border-slate-200 bg-white/88"
            />
            {feedback ? <p className="text-sm text-slate-600">{feedback}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full border-white/0 bg-white/76 px-4 text-slate-900" onClick={() => setConnectTarget(null)}>
                Cancel
              </Button>
              <Button type="button" className="rounded-full bg-slate-950 px-4 text-white hover:bg-slate-800" onClick={submitConnect} disabled={connectLoading}>
                {connectLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Send request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {activeGigToast ? (
        <div className="pointer-events-none fixed bottom-6 left-6 z-[80] hidden max-w-[420px] sm:block">
          <div
            className={`pointer-events-auto overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(30,41,59,0.90))] p-4 text-white shadow-[0_26px_70px_rgba(15,23,42,0.30)] backdrop-blur-2xl transition duration-300 ${
              toastLeaving ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">New gig just posted</p>
            <p className="mt-2 line-clamp-1 text-sm font-semibold tracking-[-0.02em] text-white">{activeGigToast.title}</p>
            <p className="mt-1 line-clamp-1 text-xs text-slate-300">{activeGigToast.organizationName || activeGigToast.ownerName} · {activeGigToast.category}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">{activeGigToast.budgetLabel}</span>
              <Link
                href={`/gigs/${activeGigToast.slug}`}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-white/15"
              >
                Open
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </PublicSiteChrome>
  );
}
