'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  ChevronRight,
  Briefcase,
  FileText,
  BookOpen,
  Newspaper,
  Sparkles,
  Loader2,
  File,
  UserRound,
  Globe,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchMeta {
  skills?: string[];
  tags?: string[];
  budget?: string;
  timeline?: string;
  engagement?: string;
  location?: string;
  headline?: string;
  urgent?: boolean;
  viewCount?: number;
  updatedAt?: string;
}

export interface DbSearchResult {
  id: string;
  title: string;
  description: string;
  href: string;
  type: 'feature' | 'page' | 'file' | 'article';
  category: string;
  badge?: string;
  scope?: string;
  source?: string;
  meta?: SearchMeta;
}

export interface LocalSearchResult {
  id: string;
  kind: 'tab' | 'template' | 'history' | 'summary';
  title: string;
  subtitle?: string;
  Icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export interface MobileShortcut {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  active?: boolean;
  iconBg?: string;
  iconFg?: string;
  dot?: string;
}

interface GlobalSearchBarProps {
  getLocalResults: (query: string) => LocalSearchResult[];
  mobileShortcuts?: MobileShortcut[];
  className?: string;
}

export interface GlobalSearchBarHandle {
  open: () => void;
  openMobile: () => void;
  close: () => void;
  focus: () => void;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000;
const resultCache = new Map<string, { results: DbSearchResult[]; ts: number }>();

function getCached(query: string): DbSearchResult[] | null {
  const entry = resultCache.get(query);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    resultCache.delete(query);
    return null;
  }
  return entry.results;
}

function setCache(query: string, results: DbSearchResult[]) {
  resultCache.set(query, { results, ts: Date.now() });
  if (resultCache.size > 60) {
    const first = resultCache.keys().next().value;
    if (first) resultCache.delete(first);
  }
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function badgeCls(badge?: string): string {
  switch ((badge ?? '').toUpperCase()) {
    case 'GIG':     return 'bg-orange-100 text-orange-700';
    case 'RESUME':  return 'bg-sky-100 text-sky-700';
    case 'FILE':    return 'bg-slate-100 text-slate-600';
    case 'PUBLIC':  return 'bg-emerald-100 text-emerald-700';
    case 'PRIVATE': return 'bg-rose-100 text-rose-700';
    case 'SIGNED':  return 'bg-green-100 text-green-700';
    case 'DOC':     return 'bg-blue-100 text-blue-700';
    case 'TPL':     return 'bg-violet-100 text-violet-700';
    case 'KB':      return 'bg-purple-100 text-purple-700';
    case 'BLOG':    return 'bg-teal-100 text-teal-700';
    case 'FREE':    return 'bg-emerald-100 text-emerald-700';
    case 'NEW':     return 'bg-pink-100 text-pink-700';
    case 'SOURCE':  return 'bg-indigo-100 text-indigo-700';
    default:        return 'bg-slate-100 text-slate-500';
  }
}

// ─── Rich card sub-components ─────────────────────────────────────────────────

function SkillChips({ skills, borderCls = 'border-orange-100' }: { skills: string[]; borderCls?: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {skills.slice(0, 5).map((s) => (
        <span
          key={s}
          className={`rounded-full border ${borderCls} bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

const ENGAGEMENT: Record<string, string> = {
  one_time: 'One-time',
  ongoing: 'Ongoing',
  retainer: 'Retainer',
};
const LOCATION: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
};

function GigCard({ r, onClose }: { r: DbSearchResult; onClose: () => void }) {
  return (
    <a
      href={r.href}
      onClick={onClose}
      className="group block rounded-2xl border border-orange-100/80 bg-gradient-to-br from-orange-50/70 to-amber-50/40 p-3 transition-all hover:border-orange-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <Briefcase className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
            <p className="truncate text-[11px] text-slate-500">
              {r.category}
              {r.meta?.location ? ` · ${LOCATION[r.meta.location] ?? r.meta.location}` : ''}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {r.meta?.urgent && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">URGENT</span>
          )}
          {r.meta?.budget && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
              {r.meta.budget}
            </span>
          )}
          {r.meta?.engagement && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {ENGAGEMENT[r.meta.engagement] ?? r.meta.engagement}
            </span>
          )}
        </div>
      </div>
      {r.meta?.skills && r.meta.skills.length > 0 && (
        <div className="mt-2 pl-11">
          <SkillChips skills={r.meta.skills} borderCls="border-orange-100" />
        </div>
      )}
    </a>
  );
}

function ProfileCard({ r, onClose }: { r: DbSearchResult; onClose: () => void }) {
  const initials = r.title
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <a
      href={r.href}
      onClick={onClose}
      className="group flex items-start gap-3 rounded-2xl border border-sky-100/80 bg-gradient-to-br from-sky-50/70 to-blue-50/40 p-3 transition-all hover:border-sky-200 hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-sm font-bold text-white shadow-sm">
        {initials || <UserRound className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
          <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
            {r.category}
          </span>
        </div>
        {r.meta?.headline && (
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{r.meta.headline}</p>
        )}
        {r.meta?.skills && r.meta.skills.length > 0 && (
          <div className="mt-1.5">
            <SkillChips skills={r.meta.skills} borderCls="border-sky-100" />
          </div>
        )}
      </div>
    </a>
  );
}

function FileCard({ r, onClose }: { r: DbSearchResult; onClose: () => void }) {
  return (
    <a
      href={r.href}
      onClick={onClose}
      className="group flex items-center gap-3 rounded-2xl border border-slate-100/80 bg-white/60 p-3 transition-all hover:border-slate-200 hover:bg-white/90 hover:shadow-sm"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <File className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">{r.description}</p>
      </div>
      {r.badge && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeCls(r.badge)}`}>
          {r.badge}
        </span>
      )}
    </a>
  );
}

function ArticleCard({ r, onClose }: { r: DbSearchResult; onClose: () => void }) {
  const isKB = r.badge === 'KB';
  const Icon = isKB ? BookOpen : Newspaper;
  const iconCls = isKB ? 'bg-purple-100 text-purple-600' : 'bg-teal-100 text-teal-600';
  return (
    <a
      href={r.href}
      onClick={onClose}
      className="group flex items-center gap-3 rounded-2xl border border-slate-100/80 bg-white/60 p-3 transition-all hover:border-slate-200 hover:bg-white/90 hover:shadow-sm"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{r.description}</p>
      </div>
      {r.badge && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeCls(r.badge)}`}>
          {r.badge}
        </span>
      )}
    </a>
  );
}

function DocCard({ r, onClose }: { r: DbSearchResult; onClose: () => void }) {
  const isSigned = (r.badge ?? '').toUpperCase() === 'SIGNED';
  const iconCls = isSigned ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600';
  return (
    <a
      href={r.href}
      onClick={onClose}
      className="group flex items-center gap-3 rounded-2xl border border-slate-100/80 bg-white/60 p-3 transition-all hover:border-slate-200 hover:bg-white/90 hover:shadow-sm"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">{r.description}</p>
      </div>
      {r.badge && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeCls(r.badge)}`}>
          {r.badge}
        </span>
      )}
    </a>
  );
}

function FeatureCard({ r, onClose }: { r: DbSearchResult; onClose: () => void }) {
  return (
    <a
      href={r.href}
      onClick={onClose}
      className="group flex items-center gap-3 rounded-2xl border border-slate-100/80 bg-white/60 p-3 transition-all hover:border-slate-200 hover:bg-white/90 hover:shadow-sm"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">{r.description}</p>
      </div>
      {r.badge && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeCls(r.badge)}`}>
          {r.badge}
        </span>
      )}
    </a>
  );
}

function WebSourceCard({ r, onClose }: { r: DbSearchResult; onClose: () => void }) {
  return (
    <a
      href={r.href}
      onClick={onClose}
      className="group flex items-center gap-3 rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/50 to-white/60 p-3 transition-all hover:border-indigo-200 hover:shadow-sm"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
        <Globe className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">{r.description}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeCls('SOURCE')}`}>
        SOURCE
      </span>
    </a>
  );
}

function ResultCard({ r, onClose }: { r: DbSearchResult; onClose: () => void }) {
  const badge = (r.badge ?? '').toUpperCase();
  if (badge === 'GIG') return <GigCard r={r} onClose={onClose} />;
  if (badge === 'RESUME') return <ProfileCard r={r} onClose={onClose} />;
  if (badge === 'FILE' || badge === 'PUBLIC' || badge === 'PRIVATE') return <FileCard r={r} onClose={onClose} />;
  if (badge === 'BLOG' || badge === 'KB') return <ArticleCard r={r} onClose={onClose} />;
  if (badge === 'DOC' || badge === 'SIGNED' || badge === 'TPL') return <DocCard r={r} onClose={onClose} />;
  if (badge === 'SOURCE') return <WebSourceCard r={r} onClose={onClose} />;
  if (r.type === 'feature' || badge === 'FREE' || badge === 'NEW') return <FeatureCard r={r} onClose={onClose} />;
  return <DocCard r={r} onClose={onClose} />;
}

// ─── Group DB results ─────────────────────────────────────────────────────────

const GROUP_ORDER = ['Gigs', 'Talent', 'Documents', 'Files', 'Knowledge & Blog', 'Web Sources', 'Features & Pages'];

function groupResults(results: DbSearchResult[]) {
  const map: Record<string, DbSearchResult[]> = {};
  for (const r of results) {
    const badge = (r.badge ?? '').toUpperCase();
    let label: string;
    if (badge === 'GIG') label = 'Gigs';
    else if (badge === 'RESUME') label = 'Talent';
    else if (badge === 'DOC' || badge === 'SIGNED' || badge === 'TPL') label = 'Documents';
    else if (badge === 'FILE' || badge === 'PUBLIC' || badge === 'PRIVATE' || r.type === 'file') label = 'Files';
    else if (badge === 'BLOG' || badge === 'KB') label = 'Knowledge & Blog';
    else if (badge === 'SOURCE') label = 'Web Sources';
    else label = 'Features & Pages';
    (map[label] ??= []).push(r);
  }
  return GROUP_ORDER.filter((k) => map[k]).map((k) => ({ label: k, items: map[k] }));
}

// ─── Results panel ────────────────────────────────────────────────────────────

interface ResultsPanelProps {
  query: string;
  localResults: LocalSearchResult[];
  grouped: ReturnType<typeof groupResults>;
  loading: boolean;
  dbResults: DbSearchResult[];
  mobileShortcuts: MobileShortcut[];
  onClose: () => void;
}

function ResultsPanel({
  query,
  localResults,
  grouped,
  loading,
  dbResults,
  mobileShortcuts,
  onClose,
}: ResultsPanelProps) {
  const hasQuery = query.trim().length > 0;
  const hasLocal = localResults.length > 0;
  const hasDb = dbResults.length > 0;

  if (!hasQuery) {
    if (mobileShortcuts.length === 0) {
      return (
        <p className="py-6 text-center text-xs text-slate-400">
          Type to search gigs, talent, documents, templates, files, and more
        </p>
      );
    }
    return (
      <div className="space-y-3">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Quick access</p>
        {mobileShortcuts.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => { s.onSelect(); onClose(); }}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/65 bg-white/75 px-4 py-3 text-left transition hover:bg-white/92"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${s.iconBg ?? 'bg-slate-100'}`}>
              <s.Icon className={`h-[18px] w-[18px] ${s.iconFg ?? 'text-slate-700'}`} />
            </div>
            <p className="flex-1 truncate text-sm font-semibold text-slate-900">{s.label}</p>
            {s.active
              ? <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot ?? 'bg-slate-400'}`} />
              : <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
          </button>
        ))}
        <p className="px-1 text-center text-[11px] text-slate-400">
          Type to search gigs, talent, docs, templates, files, and more
        </p>
      </div>
    );
  }

  if (!hasLocal && !hasDb && !loading) {
    return (
      <div className="rounded-2xl border border-white/65 bg-white/75 px-5 py-8 text-center">
        <p className="text-sm font-medium text-slate-700">No results for &ldquo;{query}&rdquo;</p>
        <p className="mt-1 text-xs text-slate-400">
          Try a skill, template name, reference number, or feature keyword.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Local workspace results */}
      {hasLocal && (
        <div className="space-y-1">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">In this workspace</p>
            <div className="h-px flex-1 bg-slate-100/80" />
          </div>
          {localResults.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { item.onSelect(); onClose(); }}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/65 bg-white/75 px-3 py-2.5 text-left transition hover:bg-white/95"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/80 shadow-sm">
                <item.Icon className="h-4 w-4 text-slate-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
                {item.subtitle && (
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.subtitle}</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !hasDb && (
        <div className="space-y-2">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Searching database</p>
            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100/80 bg-white/60 p-3">
              <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/5 animate-pulse rounded-full bg-slate-100" />
                <div className="h-2.5 w-2/5 animate-pulse rounded-full bg-slate-50" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DB results grouped by type */}
      {grouped.map(({ label, items }) => (
        <div key={label} className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <div className="h-px flex-1 bg-slate-100/80" />
            <span className="text-[10px] tabular-nums text-slate-300">{items.length}</span>
          </div>
          {items.map((r) => (
            <ResultCard key={r.id} r={r} onClose={onClose} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const GlobalSearchBar = forwardRef<GlobalSearchBarHandle, GlobalSearchBarProps>(
  function GlobalSearchBar({ getLocalResults, mobileShortcuts = [], className }, ref) {
    const [query, setQuery] = useState('');
    const [desktopOpen, setDesktopOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [dbResults, setDbResults] = useState<DbSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const desktopInputRef = useRef<HTMLInputElement>(null);
    const mobileInputRef = useRef<HTMLInputElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    const closeAll = useCallback(() => {
      setDesktopOpen(false);
      setMobileOpen(false);
      setQuery('');
      setDbResults([]);
      setLoading(false);
    }, []);

    useImperativeHandle(ref, () => ({
      open: () => {
        setDesktopOpen(true);
        setTimeout(() => desktopInputRef.current?.focus(), 10);
      },
      openMobile: () => {
        setMobileOpen(true);
        setTimeout(() => mobileInputRef.current?.focus(), 10);
      },
      close: closeAll,
      focus: () => desktopInputRef.current?.focus(),
    }));

    // ── Fetch from DB ──────────────────────────────────────────────────────────

    const fetchDb = useCallback((q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const trimmed = q.trim();
      if (!trimmed) {
        setDbResults([]);
        setLoading(false);
        return;
      }
      const cached = getCached(trimmed);
      if (cached) {
        setDbResults(cached);
        setLoading(false);
        return;
      }
      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        try {
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(trimmed)}&limit=24`,
            { signal: abortRef.current.signal },
          );
          if (!res.ok) throw new Error('search failed');
          const data = await res.json() as { results?: DbSearchResult[] };
          const results = data.results ?? [];
          setCache(trimmed, results);
          setDbResults(results);
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return;
          setDbResults([]);
        } finally {
          setLoading(false);
        }
      }, 120);
    }, []);

    const handleQueryChange = useCallback(
      (value: string) => {
        setQuery(value);
        fetchDb(value);
      },
      [fetchDb],
    );

    // ── Derived data ────────────────────────────────────────────────────────────

    const localResults = query.trim() ? getLocalResults(query) : [];
    const grouped = groupResults(dbResults);

    // ── Outside-click close for desktop ────────────────────────────────────────

    useEffect(() => {
      if (!desktopOpen) return;
      const onDown = (e: MouseEvent) => {
        if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
          setDesktopOpen(false);
        }
      };
      window.addEventListener('mousedown', onDown);
      return () => window.removeEventListener('mousedown', onDown);
    }, [desktopOpen]);

    // ── Escape key ──────────────────────────────────────────────────────────────

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && (desktopOpen || mobileOpen)) closeAll();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [desktopOpen, mobileOpen, closeAll]);

    // ── Shared panel props ──────────────────────────────────────────────────────

    const panelProps: ResultsPanelProps = {
      query,
      localResults,
      grouped,
      loading,
      dbResults,
      mobileShortcuts,
      onClose: closeAll,
    };

    return (
      <>
        {/* ── Desktop: inline input + dropdown ──────────────────────────────── */}
        <div
          ref={rootRef}
          className={`hidden min-w-0 flex-1 px-2 md:flex md:items-center md:justify-center ${className ?? ''}`}
          data-global-search-root
        >
          <div className="relative w-full max-w-[720px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              ref={desktopInputRef}
              value={query}
              onChange={(e) => {
                handleQueryChange(e.target.value);
                setDesktopOpen(true);
              }}
              onFocus={() => setDesktopOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') closeAll();
              }}
              placeholder="Search gigs, talent, docs, templates, files… (⌘K)"
              className="h-11 w-full rounded-full border border-white/70 bg-white/75 pl-11 pr-24 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_44px_rgba(148,163,184,0.10)] backdrop-blur-2xl transition focus:border-slate-300"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-2 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl lg:flex">
              {loading
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <span>⌘K</span>}
              <span>/</span>
            </div>

            {desktopOpen && (
              <div className="navbar-glass absolute left-0 right-0 top-full z-50 mt-3 max-h-[540px] overflow-y-auto rounded-[1.4rem] p-3">
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/60 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {query.trim() ? `Results for "${query.trim()}"` : 'Ask me anything'}
                  </p>
                  <button
                    type="button"
                    className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 hover:bg-white/90"
                    onClick={closeAll}
                  >
                    ESC
                  </button>
                </div>
                <ResultsPanel {...panelProps} />
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile: full-screen overlay via portal ─────────────────────────── */}
        {isMounted &&
          mobileOpen &&
          createPortal(
            <>
              {/* Backdrop */}
              <button
                type="button"
                aria-label="Close search"
                onClick={closeAll}
                className="md:hidden"
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 9998,
                  background: 'rgba(15,23,42,0.28)',
                  backdropFilter: 'blur(3px)',
                  WebkitBackdropFilter: 'blur(3px)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              />

              {/* Panel */}
              <div
                className="md:hidden"
                data-global-search-root
                style={{
                  position: 'fixed',
                  left: 12,
                  right: 12,
                  top: 84,
                  bottom: 100,
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  borderRadius: 26,
                  border: '1px solid rgba(255,255,255,0.52)',
                  background:
                    'linear-gradient(160deg,rgba(255,255,255,0.88) 0%,rgba(248,252,255,0.84) 100%)',
                  boxShadow:
                    '0 24px 64px rgba(15,23,42,0.22),0 6px 18px rgba(15,23,42,0.10),inset 0 1.5px 0 rgba(255,255,255,0.90)',
                  backdropFilter: 'blur(36px) saturate(1.8)',
                  WebkitBackdropFilter: 'blur(36px) saturate(1.8)',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    borderBottom: '1px solid rgba(255,255,255,0.50)',
                    background: 'rgba(255,255,255,0.38)',
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ position: 'relative', flex: 1 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg,#334155,#0f172a)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        zIndex: 1,
                      }}
                    >
                      {loading ? (
                        <Loader2
                          style={{
                            width: 12,
                            height: 12,
                            color: '#fff',
                            animation: 'spin 1s linear infinite',
                          }}
                        />
                      ) : (
                        <Sparkles style={{ width: 12, height: 12, color: '#fff', flexShrink: 0 }} />
                      )}
                    </div>
                    <Input
                      ref={mobileInputRef}
                      value={query}
                      onChange={(e) => handleQueryChange(e.target.value)}
                      placeholder="Search gigs, talent, docs, files, features…"
                      style={{
                        paddingLeft: 44,
                        height: 48,
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.70)',
                        background: 'rgba(255,255,255,0.88)',
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#0f172a',
                        boxShadow:
                          '0 2px 8px rgba(15,23,42,0.06),inset 0 1px 0 rgba(255,255,255,0.90)',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={closeAll}
                    aria-label="Close search"
                    style={{
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.60)',
                      background: 'rgba(255,255,255,0.70)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748b',
                    }}
                  >
                    <X style={{ width: 16, height: 16, flexShrink: 0 }} />
                  </button>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-auto p-3">
                  <ResultsPanel {...panelProps} />
                </div>
              </div>
            </>,
            document.body,
          )}
      </>
    );
  },
);

export default GlobalSearchBar;
