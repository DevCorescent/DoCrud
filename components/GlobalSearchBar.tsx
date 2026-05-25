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
  relevance?: number;
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
  placeholder?: string;
  placeholderCycle?: string[];
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
  if (Date.now() - entry.ts > CACHE_TTL_MS) { resultCache.delete(query); return null; }
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
    case 'GIG':     return 'bg-orange-500/15 text-orange-300 border border-orange-500/20';
    case 'RESUME':  return 'bg-sky-500/15 text-sky-300 border border-sky-500/20';
    case 'FILE':    return 'bg-white/[0.07] text-white/45 border border-white/[0.09]';
    case 'PUBLIC':  return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20';
    case 'PRIVATE': return 'bg-rose-500/15 text-rose-300 border border-rose-500/20';
    case 'SIGNED':  return 'bg-green-500/15 text-green-300 border border-green-500/20';
    case 'DOC':     return 'bg-blue-500/15 text-blue-300 border border-blue-500/20';
    case 'TPL':     return 'bg-violet-500/15 text-violet-300 border border-violet-500/20';
    case 'KB':      return 'bg-purple-500/15 text-purple-300 border border-purple-500/20';
    case 'BLOG':    return 'bg-teal-500/15 text-teal-300 border border-teal-500/20';
    case 'FREE':    return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20';
    case 'NEW':     return 'bg-pink-500/15 text-pink-300 border border-pink-500/20';
    case 'SOURCE':  return 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20';
    default:        return 'bg-white/[0.06] text-white/35 border border-white/[0.08]';
  }
}

// ─── Skill chips ──────────────────────────────────────────────────────────────

function SkillChips({ skills }: { skills: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {skills.slice(0, 5).map((s) => (
        <span key={s} className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-white/50">
          {s}
        </span>
      ))}
    </div>
  );
}

// ─── Relevance indicator ──────────────────────────────────────────────────────

function RelevanceScore({ score }: { score?: number }) {
  if (typeof score !== 'number' || score <= 0) return null;
  const isHigh = score >= 80;
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.05em',
      fontVariantNumeric: 'tabular-nums',
      flexShrink: 0,
      lineHeight: 1,
      color: isHigh ? 'rgba(251,146,60,0.48)' : 'rgba(255,255,255,0.15)',
    }}>
      {score}
    </span>
  );
}

// ─── Card base ────────────────────────────────────────────────────────────────

const ENGAGEMENT: Record<string, string> = { one_time: 'One-time', ongoing: 'Ongoing', retainer: 'Retainer' };
const LOCATION: Record<string, string>   = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' };

function GigCard({ r, onClose }: { r: DbSearchResult; onClose: () => void }) {
  return (
    <a href={r.href} onClick={onClose}
      className="group block rounded-[16px] border border-orange-500/[0.15] bg-orange-500/[0.06] p-3 transition-all hover:border-orange-400/30 hover:bg-orange-500/[0.10]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-orange-500/20 text-orange-400">
            <Briefcase className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-white/85">{r.title}</p>
            <p className="truncate text-[11px] text-white/35">
              {r.category}{r.meta?.location ? ` · ${LOCATION[r.meta.location] ?? r.meta.location}` : ''}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {r.meta?.urgent && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">URGENT</span>}
          {r.meta?.budget && <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-300">{r.meta.budget}</span>}
          {r.meta?.engagement && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">{ENGAGEMENT[r.meta.engagement] ?? r.meta.engagement}</span>}
          <RelevanceScore score={r.relevance} />
        </div>
      </div>
      {r.description && <p className="mt-1.5 pl-11 line-clamp-2 text-[11px] leading-[1.45] text-white/42">{r.description}</p>}
      {r.meta?.skills && r.meta.skills.length > 0 && <div className="mt-2 pl-11"><SkillChips skills={r.meta.skills} /></div>}
    </a>
  );
}

function ProfileCard({ r, onClose }: { r: DbSearchResult; onClose: () => void }) {
  const initials = r.title.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
  return (
    <a href={r.href} onClick={onClose}
      className="group flex items-start gap-3 rounded-[16px] border border-sky-500/[0.15] bg-sky-500/[0.06] p-3 transition-all hover:border-sky-400/30 hover:bg-sky-500/[0.10]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/80 to-blue-600/80 text-[13px] font-bold text-white shadow-lg">
        {initials || <UserRound className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-semibold text-white/85">{r.title}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <RelevanceScore score={r.relevance} />
            <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-300">{r.category}</span>
          </div>
        </div>
        {r.meta?.headline && <p className="mt-0.5 truncate text-[11px] text-white/35">{r.meta.headline}</p>}
        {r.meta?.skills && r.meta.skills.length > 0 && <div className="mt-1.5"><SkillChips skills={r.meta.skills} /></div>}
      </div>
    </a>
  );
}

function PersonCard({ r, onClose }: { r: DbSearchResult; onClose: () => void }) {
  const initials = r.title.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
  return (
    <a href={r.href} onClick={onClose}
      className="group flex items-start gap-3 rounded-[14px] p-3 transition-all hover:bg-white/[0.04]"
      style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)' }}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/70 to-indigo-600/70 text-[12px] font-bold text-white shadow-md">
        {initials || <UserRound className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-semibold text-white/85 group-hover:text-white transition-colors">{r.title}</p>
          {r.meta?.location && (
            <span className="shrink-0 text-[10px] text-white/28">· {r.meta.location}</span>
          )}
        </div>
        {r.description && <p className="mt-0.5 line-clamp-2 text-[11px] leading-[1.45] text-white/48">{r.description}</p>}
        {r.meta?.skills && r.meta.skills.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {r.meta.skills.slice(0, 4).map((s) => (
              <span key={s} className="rounded-full px-1.5 py-[2px] text-[9.5px] font-medium"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.20)', color: 'rgba(196,181,253,0.80)' }}>
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <RelevanceScore score={r.relevance} />
        <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-white/18 transition-transform group-hover:translate-x-0.5" />
      </div>
    </a>
  );
}

function GenericCard({ r, onClose, iconCls, Icon }: { r: DbSearchResult; onClose: () => void; iconCls: string; Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <a href={r.href} onClick={onClose}
      className="group flex items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-3 transition-all hover:border-white/[0.12] hover:bg-white/[0.055]">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] ${iconCls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-white/85">{r.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-[1.45] text-white/48">{r.description}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <RelevanceScore score={r.relevance} />
        {r.badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeCls(r.badge)}`}>{r.badge}</span>}
      </div>
    </a>
  );
}

function WebSourceCard({ r, onClose }: { r: DbSearchResult; onClose: () => void }) {
  return (
    <a href={r.href} onClick={onClose}
      className="group flex items-center gap-3 rounded-[16px] border border-indigo-500/[0.15] bg-indigo-500/[0.06] p-3 transition-all hover:border-indigo-400/30 hover:bg-indigo-500/[0.10]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-indigo-500/20 text-indigo-400"><Globe className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-white/85">{r.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-[1.45] text-white/48">{r.description}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <RelevanceScore score={r.relevance} />
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeCls('SOURCE')}`}>SOURCE</span>
      </div>
    </a>
  );
}

function ResultCard({ r, onClose }: { r: DbSearchResult; onClose: () => void }) {
  const badge = (r.badge ?? '').toUpperCase();
  if (badge === 'PERSON')                                              return <PersonCard r={r} onClose={onClose} />;
  if (badge === 'GIG')                                                 return <GigCard r={r} onClose={onClose} />;
  if (badge === 'RESUME')                                              return <ProfileCard r={r} onClose={onClose} />;
  if (badge === 'SOURCE')                                              return <WebSourceCard r={r} onClose={onClose} />;
  if (badge === 'BLOG' || badge === 'KB') {
    const Icon = badge === 'KB' ? BookOpen : Newspaper;
    const iconCls = badge === 'KB' ? 'bg-purple-500/20 text-purple-400' : 'bg-teal-500/20 text-teal-400';
    return <GenericCard r={r} onClose={onClose} iconCls={iconCls} Icon={Icon} />;
  }
  if (badge === 'DOC' || badge === 'SIGNED' || badge === 'TPL') {
    const iconCls = badge === 'SIGNED' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400';
    return <GenericCard r={r} onClose={onClose} iconCls={iconCls} Icon={FileText} />;
  }
  if (badge === 'FILE' || badge === 'PUBLIC' || badge === 'PRIVATE' || r.type === 'file')
    return <GenericCard r={r} onClose={onClose} iconCls="bg-white/[0.08] text-white/45" Icon={File} />;
  if (r.type === 'feature' || badge === 'FREE' || badge === 'NEW')
    return <GenericCard r={r} onClose={onClose} iconCls="bg-white/[0.08] text-white/60" Icon={Sparkles} />;
  return <GenericCard r={r} onClose={onClose} iconCls="bg-blue-500/20 text-blue-400" Icon={FileText} />;
}

// ─── Filter definitions ───────────────────────────────────────────────────────

export type SearchFilter = 'all' | 'people' | 'gigs' | 'docs' | 'files';

const FILTERS: Array<{ id: SearchFilter; label: string; badges: string[] }> = [
  { id: 'all',    label: 'All',      badges: [] },
  { id: 'people', label: 'People',   badges: ['PERSON', 'RESUME'] },
  { id: 'gigs',   label: 'Gigs',     badges: ['GIG'] },
  { id: 'docs',   label: 'Docs',     badges: ['DOC', 'SIGNED', 'TPL', 'BLOG', 'KB'] },
  { id: 'files',  label: 'Files',    badges: ['FILE', 'PUBLIC', 'PRIVATE', 'SVC'] },
];

// ─── Group DB results ─────────────────────────────────────────────────────────

const GROUP_ORDER = ['People', 'Gigs', 'Talent', 'Documents', 'Files', 'Knowledge & Blog', 'Web Sources', 'Features & Pages'];

function groupResults(results: DbSearchResult[]) {
  const map: Record<string, DbSearchResult[]> = {};
  for (const r of results) {
    const badge = (r.badge ?? '').toUpperCase();
    let label: string;
    if (badge === 'PERSON') label = 'People';
    else if (badge === 'GIG') label = 'Gigs';
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

// ─── Source cycling loader ────────────────────────────────────────────────────

const SOURCE_PILLS = [
  { label: 'People',    color: 'rgba(167,139,250,0.92)', bg: 'rgba(139,92,246,0.14)',  border: 'rgba(139,92,246,0.26)' },
  { label: 'Gigs',      color: 'rgba(253,186,116,0.92)', bg: 'rgba(251,146,60,0.14)',  border: 'rgba(251,146,60,0.26)' },
  { label: 'Docs',      color: 'rgba(147,197,253,0.92)', bg: 'rgba(96,165,250,0.14)',  border: 'rgba(96,165,250,0.26)' },
  { label: 'Files',     color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.12)' },
  { label: 'Knowledge', color: 'rgba(196,181,253,0.92)', bg: 'rgba(167,139,250,0.14)', border: 'rgba(167,139,250,0.26)' },
  { label: 'Templates', color: 'rgba(110,231,183,0.92)', bg: 'rgba(52,211,153,0.14)',  border: 'rgba(52,211,153,0.26)' },
];

function useSourceCycle(active: boolean) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % SOURCE_PILLS.length), 460);
    return () => clearInterval(t);
  }, [active]);
  return idx;
}

function LoadingSourceTag({ loading }: { loading: boolean }) {
  const idx = useSourceCycle(loading);
  if (!loading) return null;
  const src = SOURCE_PILLS[idx];
  return (
    <span style={{
      display: 'inline-block', fontSize: 9.5, fontWeight: 700,
      padding: '2px 8px', borderRadius: 20,
      background: src.bg, border: `1px solid ${src.border}`, color: src.color,
      transition: 'color 200ms ease, background 200ms ease, border-color 200ms ease',
      letterSpacing: '0.01em', whiteSpace: 'nowrap',
    }}>
      {src.label}
    </span>
  );
}

function SearchingFromIndicator() {
  const idx = useSourceCycle(true);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Source row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.26)', letterSpacing: '0.05em', flexShrink: 0 }}>
          Searching from
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {SOURCE_PILLS.map((s, i) => {
            const isActive = i === idx;
            return (
              <span key={s.label} style={{
                fontSize: 9.5, fontWeight: 600, padding: '2.5px 9px', borderRadius: 20,
                background: isActive ? s.bg : 'rgba(255,255,255,0.025)',
                border: `1px solid ${isActive ? s.border : 'rgba(255,255,255,0.052)'}`,
                color: isActive ? s.color : 'rgba(255,255,255,0.18)',
                transition: 'all 240ms cubic-bezier(0.4,0,0.2,1)',
                transform: isActive ? 'translateY(-1px) scale(1.04)' : 'none',
              }}>
                {s.label}
              </span>
            );
          })}
        </div>
      </div>
      {/* Shimmer skeletons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {([0.88, 0.58, 0.36] as number[]).map((opacity, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 14, border: '1px solid rgba(255,255,255,0.042)',
            background: 'rgba(255,255,255,0.018)', opacity,
          }}>
            <div className="animate-pulse" style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.055)', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div className="animate-pulse" style={{ height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.058)', width: `${62 - i * 14}%` }} />
              <div className="animate-pulse" style={{ height: 8, borderRadius: 5, background: 'rgba(255,255,255,0.034)', width: `${42 - i * 9}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
  activeFilter: SearchFilter;
  onFilterChange: (f: SearchFilter) => void;
}

function FilterChips({ active, onChange }: { active: SearchFilter; onChange: (f: SearchFilter) => void }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {FILTERS.map((f) => {
        const isActive = active === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className="shrink-0 rounded-full px-2.5 py-[4px] text-[10.5px] font-medium transition-all duration-150"
            style={{
              background: isActive ? 'rgba(251,146,60,0.14)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isActive ? 'rgba(251,146,60,0.32)' : 'rgba(255,255,255,0.08)'}`,
              color: isActive ? 'rgba(253,186,116,0.95)' : 'rgba(255,255,255,0.38)',
              boxShadow: isActive ? '0 0 8px rgba(251,146,60,0.15)' : 'none',
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

function ResultsPanel({ query, localResults, grouped, loading, dbResults, mobileShortcuts, onClose, activeFilter, onFilterChange }: ResultsPanelProps) {
  const hasQuery = query.trim().length > 0;
  const hasLocal = localResults.length > 0;
  const hasDb    = dbResults.length > 0;

  if (!hasQuery) {
    if (mobileShortcuts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Sparkles className="h-6 w-6 text-white/15" />
          <p className="text-[12px] text-white/25 text-center">Search people, gigs, documents, feeds and more</p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <FilterChips active={activeFilter} onChange={onFilterChange} />
        <p className="px-1 text-[9.5px] font-black uppercase tracking-[0.26em] text-white/20 mb-3 mt-3">Quick access</p>
        {mobileShortcuts.map((s) => (
          <button key={s.id} type="button" onClick={() => { s.onSelect(); onClose(); }}
            className="flex w-full items-center gap-3 rounded-[14px] border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-left transition hover:border-white/[0.12] hover:bg-white/[0.07] active:scale-[0.99]">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${s.iconBg ?? 'bg-white/[0.08]'}`}>
              <s.Icon className={`h-[18px] w-[18px] ${s.iconFg ?? 'text-white/60'}`} />
            </div>
            <p className="flex-1 truncate text-[13px] font-semibold text-white/75">{s.label}</p>
            {s.active
              ? <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot ?? 'bg-white/30'}`} />
              : <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />}
          </button>
        ))}
        <p className="text-center text-[11px] text-white/20 pt-2">
          Type to search across gigs, talent, docs, templates and files
        </p>
      </div>
    );
  }

  if (!hasLocal && !hasDb && !loading) {
    return (
      <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-5 py-10 text-center">
        <p className="text-[13px] font-semibold text-white/50">No results for &ldquo;{query}&rdquo;</p>
        <p className="mt-1.5 text-[11.5px] text-white/25 leading-relaxed">
          Try a skill, template name, reference number, or feature keyword.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter chips — always shown when there is a query */}
      <FilterChips active={activeFilter} onChange={onFilterChange} />

      {/* Local workspace results */}
      {hasLocal && (
        <div className="space-y-1" style={{ opacity: loading ? 0.72 : 1, transition: 'opacity 180ms ease' }}>
          <div className="mb-2.5 flex items-center gap-2.5">
            <p className="text-[9.5px] font-black uppercase tracking-[0.26em] text-white/20">Workspace</p>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>
          {localResults.map((item) => (
            <button key={item.id} type="button" onClick={() => { item.onSelect(); onClose(); }}
              className="flex w-full items-center gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-white/[0.11] hover:bg-white/[0.055] active:scale-[0.99]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.05]">
                <item.Icon className="h-4 w-4 text-white/50" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white/80">{item.title}</p>
                {item.subtitle && <p className="mt-0.5 truncate text-[11px] text-white/35">{item.subtitle}</p>}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/18" />
            </button>
          ))}
        </div>
      )}

      {/* Loading — animated source indicator */}
      {loading && !hasDb && <SearchingFromIndicator />}

      {/* DB results grouped — fade slightly while reloading so results never flash blank */}
      <div style={{ opacity: loading && hasDb ? 0.60 : 1, transition: 'opacity 180ms ease', pointerEvents: loading && hasDb ? 'none' : 'auto' }}>
        {grouped.map(({ label, items }) => (
          <div key={label} className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <p className="text-[9.5px] font-black uppercase tracking-[0.26em] text-white/20">{label}</p>
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[9.5px] tabular-nums text-white/15">{items.length}</span>
            </div>
            {items.map((r) => <ResultCard key={r.id} r={r} onClose={onClose} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_PLACEHOLDER_CYCLE = [
  'Search gigs, people, docs…',
  'Find professionals & talent…',
  'Search documents & files…',
  'Explore feeds & articles…',
  'Look up templates & tools…',
];

const GlobalSearchBar = forwardRef<GlobalSearchBarHandle, GlobalSearchBarProps>(
  function GlobalSearchBar({ getLocalResults, mobileShortcuts = [], className, placeholder, placeholderCycle }, ref) {
    const [query, setQuery]             = useState('');
    const [desktopOpen, setDesktopOpen] = useState(false);
    const [mobileOpen, setMobileOpen]   = useState(false);
    const [dbResults, setDbResults]     = useState<DbSearchResult[]>([]);
    const [loading, setLoading]         = useState(false);
    const [isMounted, setIsMounted]     = useState(false);
    const [cycleIdx, setCycleIdx]       = useState(0);
    const [cycleVisible, setCycleVisible] = useState(true);
    const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');

    const desktopInputRef  = useRef<HTMLInputElement>(null);
    const mobileInputRef   = useRef<HTMLInputElement>(null);
    const rootRef          = useRef<HTMLDivElement>(null);
    const innerRef         = useRef<HTMLDivElement>(null);
    const portalDropRef    = useRef<HTMLDivElement>(null);
    const abortRef         = useRef<AbortController | null>(null);
    const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [portalRect, setPortalRect] = useState<{ top: number; left: number; width: number } | null>(null);

    useEffect(() => { setIsMounted(true); }, []);

    const cycle = placeholderCycle ?? DEFAULT_PLACEHOLDER_CYCLE;
    const activePlaceholder = placeholder ?? cycle[cycleIdx];

    useEffect(() => {
      if (placeholder) return; // static placeholder — no cycling
      const fade = setInterval(() => {
        setCycleVisible(false);
        setTimeout(() => {
          setCycleIdx((i) => (i + 1) % cycle.length);
          setCycleVisible(true);
        }, 320);
      }, 2800);
      return () => clearInterval(fade);
    }, [placeholder, cycle.length]);

    const closeAll = useCallback(() => {
      setDesktopOpen(false); setMobileOpen(false);
      setQuery(''); setDbResults([]); setLoading(false); setActiveFilter('all');
    }, []);

    useImperativeHandle(ref, () => ({
      open:       () => { setDesktopOpen(true); setTimeout(() => desktopInputRef.current?.focus(), 10); },
      openMobile: () => { setMobileOpen(true);  setTimeout(() => mobileInputRef.current?.focus(), 10); },
      close:  closeAll,
      focus:  () => desktopInputRef.current?.focus(),
    }));

    const fetchDb = useCallback((q: string, filter: SearchFilter = 'all') => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Cancel any in-flight request immediately — no stale results ever land
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }

      const trimmed = q.trim();
      if (!trimmed) { setDbResults([]); setLoading(false); return; }

      const cacheKey = `${trimmed}::${filter}`;
      const cached = getCached(cacheKey);
      if (cached) { setDbResults(cached); setLoading(false); return; }

      // ⚡ setLoading only fires AFTER the debounce — rapid typing never triggers the spinner
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        abortRef.current = new AbortController();
        try {
          const badges = FILTERS.find((f) => f.id === filter)?.badges ?? [];
          const badgeParam = badges.length ? `&badge=${badges.join(',')}` : '';
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(trimmed)}&limit=30${badgeParam}`,
            { signal: abortRef.current.signal },
          );
          if (!res.ok) throw new Error('search failed');
          const data = await res.json() as { results?: DbSearchResult[] };
          const results = data.results ?? [];
          setCache(cacheKey, results);
          setDbResults(results);
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return;
          // Keep showing previous results on network error — don't blank the list
        } finally { setLoading(false); }
      }, 30);
    }, []);

    const handleQueryChange = useCallback((value: string) => {
      setQuery(value); fetchDb(value, activeFilter);
    }, [fetchDb, activeFilter]);

    const handleFilterChange = useCallback((f: SearchFilter) => {
      setActiveFilter(f);
      if (query.trim()) fetchDb(query, f);
    }, [fetchDb, query]);

    const localResults = query.trim() ? getLocalResults(query) : [];
    const grouped = groupResults(dbResults);

    // Track position of the search container for the portalled dropdown
    useEffect(() => {
      if (!desktopOpen || !isMounted) { setPortalRect(null); return; }
      const update = () => {
        if (innerRef.current) {
          const r = innerRef.current.getBoundingClientRect();
          setPortalRect({ top: r.bottom + 6, left: r.left, width: r.width });
        }
      };
      update();
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
      };
    }, [desktopOpen, isMounted]);

    useEffect(() => {
      if (!desktopOpen) return;
      const onDown = (e: MouseEvent) => {
        const inRoot   = rootRef.current?.contains(e.target as Node);
        const inPortal = portalDropRef.current?.contains(e.target as Node);
        if (!inRoot && !inPortal) setDesktopOpen(false);
      };
      window.addEventListener('mousedown', onDown);
      return () => window.removeEventListener('mousedown', onDown);
    }, [desktopOpen]);

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && (desktopOpen || mobileOpen)) closeAll();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [desktopOpen, mobileOpen, closeAll]);

    const panelProps: ResultsPanelProps = { query, localResults, grouped, loading, dbResults, mobileShortcuts, onClose: closeAll, activeFilter, onFilterChange: handleFilterChange };

    return (
      <>
        {/* ── Desktop: inline bar + dropdown ───────────────────────────────── */}
        <div
          ref={rootRef}
          className={`hidden min-w-0 flex-1 px-2 md:flex md:items-center md:justify-center ${className ?? ''}`}
          data-global-search-root
        >
          <div ref={innerRef} className="relative w-full max-w-[620px]">
            {/* Search icon */}
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[14px] w-[14px] -translate-y-1/2 z-10 transition-colors duration-200"
              style={{ color: desktopOpen ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.32)' }} />

            {/* Input — native placeholder */}
            <input
              ref={desktopInputRef}
              value={query}
              onChange={(e) => { handleQueryChange(e.target.value); setDesktopOpen(true); }}
              onFocus={() => setDesktopOpen(true)}
              onKeyDown={(e) => { if (e.key === 'Escape') closeAll(); }}
              placeholder={activePlaceholder}
              className="h-[38px] w-full rounded-full pl-[38px] pr-[80px] text-[13px] font-medium text-white/85 outline-none transition-all duration-200 [&::placeholder]:text-white/38"
              style={{
                background: desktopOpen ? 'rgba(255,255,255,0.065)' : 'rgba(255,255,255,0.045)',
                border: desktopOpen
                  ? '1px solid rgba(255,255,255,0.18)'
                  : '1px solid rgba(255,255,255,0.09)',
                backdropFilter: 'blur(28px) saturate(1.5)',
                WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
                boxShadow: desktopOpen
                  ? '0 0 0 3px rgba(251,146,60,0.07), 0 8px 32px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)'
                  : '0 2px 10px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            />

            {/* ⌘K / loading badge */}
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full px-2 py-[4px]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {loading
                ? <Loader2 className="h-[9px] w-[9px] animate-spin text-white/35" />
                : <>
                    <span className="text-[9.5px] font-semibold text-white/28 tracking-[0.04em]">⌘</span>
                    <span className="text-[9.5px] font-semibold text-white/28 tracking-[0.04em]">K</span>
                  </>}
            </div>
          </div>
        </div>

        {/* ── Mobile: full-screen overlay ───────────────────────────────────── */}
        {/* ── Keyframes for loading bar sweep ──────────────────────────────── */}
        {isMounted && (
          <style>{`
            @keyframes gsBarSweep {
              0%   { transform: translateX(-100%); }
              100% { transform: translateX(400%); }
            }
          `}</style>
        )}

        {/* ── Desktop: portalled dropdown (escapes header stacking context) ── */}
        {isMounted && desktopOpen && portalRect && createPortal(
          <div
            ref={portalDropRef}
            style={{
              position: 'fixed',
              top: portalRect.top,
              left: portalRect.left,
              width: portalRect.width,
              zIndex: 9980,
              borderRadius: 22,
              overflow: 'hidden',          /* clips the loading bar to rounded corners */
              background: 'rgba(9,9,13,0.97)',
              border: '1px solid rgba(255,255,255,0.10)',
              backdropFilter: 'blur(48px) saturate(1.8)',
              WebkitBackdropFilter: 'blur(48px) saturate(1.8)',
              boxShadow: '0 28px 72px rgba(0,0,0,0.82), 0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* ── Loading bar — fixed at top, never scrolls ── */}
            <div style={{
              flexShrink: 0, height: 2, width: '100%', overflow: 'hidden',
              background: 'rgba(255,255,255,0.04)',
              opacity: loading ? 1 : 0,
              transition: 'opacity 250ms ease',
            }}>
              <div style={{
                width: '35%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(251,146,60,0.75), rgba(253,186,116,0.55), transparent)',
                animation: 'gsBarSweep 1.1s cubic-bezier(0.4,0,0.6,1) infinite',
              }} />
            </div>

            {/* ── Scrollable content ── */}
            <div style={{ maxHeight: 558, overflowY: 'auto', overflowX: 'hidden', padding: 12, scrollbarWidth: 'none' as const }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ position: 'relative', width: 11, height: 11, flexShrink: 0 }}>
                    <Sparkles style={{ position: 'absolute', inset: 0, width: 11, height: 11, color: 'rgba(251,146,60,0.50)', transition: 'opacity 200ms ease', opacity: loading ? 0 : 1 }} />
                    <Loader2 style={{ position: 'absolute', inset: 0, width: 11, height: 11, color: 'rgba(251,146,60,0.55)', animation: 'spin 0.75s linear infinite', transition: 'opacity 200ms ease', opacity: loading ? 1 : 0 }} />
                  </div>
                  <div style={{ position: 'relative', overflow: 'hidden', minWidth: 0, flex: 1 }}>
                    {/* Static label — always present, fades when loading */}
                    <p style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.03em', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'opacity 200ms ease, color 200ms ease', color: loading ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.34)', opacity: loading ? 0 : 1, position: loading ? 'absolute' : 'static' }}>
                      {query.trim() ? `Results for "${query.trim()}"` : 'Search gigs, people, docs, feeds & more'}
                    </p>
                    {/* Searching-from label — fades in when loading */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 200ms ease', opacity: loading ? 1 : 0, position: loading ? 'static' : 'absolute', pointerEvents: loading ? 'auto' : 'none' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,0.26)', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                        Searching from
                      </span>
                      <LoadingSourceTag loading={loading} />
                    </div>
                  </div>
                </div>
                <button type="button" onClick={closeAll}
                  style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.08em', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, flexShrink: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.22)')}>
                  ESC
                </button>
              </div>
              <ResultsPanel {...panelProps} />
            </div>
          </div>,
          document.body,
        )}

        {isMounted && mobileOpen && createPortal(
          <>
            {/* Backdrop */}
            <button type="button" aria-label="Close search" onClick={closeAll} className="md:hidden"
              style={{
                position: 'fixed', inset: 0, zIndex: 9998,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                border: 'none', cursor: 'pointer',
              }}
            />

            {/* Panel */}
            <div className="md:hidden" data-global-search-root
              style={{
                position: 'fixed', left: 12, right: 12, top: 80, bottom: 96,
                zIndex: 9999, display: 'flex', flexDirection: 'column',
                overflow: 'hidden', borderRadius: 24,
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(10,10,14,0.93)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07)',
                backdropFilter: 'blur(48px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(48px) saturate(1.6)',
              }}
            >
              {/* Mobile loading bar */}
              <div style={{ flexShrink: 0, height: 2, width: '100%', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', opacity: loading ? 1 : 0, transition: 'opacity 250ms ease' }}>
                <div style={{ width: '35%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(251,146,60,0.75), rgba(253,186,116,0.55), transparent)', animation: 'gsBarSweep 1.1s cubic-bezier(0.4,0,0.6,1) infinite' }} />
              </div>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                padding: '10px 12px',
              }}>
                {/* Search icon pill */}
                <div style={{
                  flexShrink: 0, width: 36, height: 36, borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {loading
                    ? <Loader2 style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.35)', animation: 'spin 1s linear infinite' }} />
                    : <Sparkles style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.35)' }} />}
                </div>

                <input
                  ref={mobileInputRef}
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder={activePlaceholder}
                  style={{
                    flex: 1, height: 40, borderRadius: 12, outline: 'none',
                    border: '1px solid rgba(255,255,255,0.09)',
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                    paddingLeft: 14, paddingRight: 14,
                    fontSize: 14, fontWeight: 500,
                    color: 'rgba(255,255,255,0.80)',
                  }}
                />

                <button type="button" onClick={closeAll} aria-label="Close search"
                  style={{
                    flexShrink: 0, width: 36, height: 36, borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'rgba(255,255,255,0.35)',
                  }}
                >
                  <X style={{ width: 15, height: 15 }} />
                </button>
              </div>

              {/* Results */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 12, scrollbarWidth: 'none' }}>
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
