'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';

/* ─── constants ──────────────────────────────────────────────────────── */
const PAGE_SIZE = 24;

/* ─── types ──────────────────────────────────────────────────────────── */
interface PersonProfile {
  headline?: string;
  bio?: string;
  location?: string;
  avatarUrl?: string;
  skills?: string[];
  openToWork?: boolean;
  pronouns?: string;
}

interface PersonStats { followers: number; following: number; gigsCount: number; }

interface Person {
  id: string;
  name: string;
  accountType?: string;
  createdAt: string;
  docrudGo?: boolean;
  profile: PersonProfile;
  stats: PersonStats;
  upraiseCount: number;
}

type SortMode = 'mostUpraised' | 'mostFollowed' | 'mostGigs' | 'recent' | 'verified';

/* ─── helpers ────────────────────────────────────────────────────────── */
function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

/* ─── Gold badge ─────────────────────────────────────────────────────── */
function GoldBadge() {
  return (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none" style={{ display:'inline-block', verticalAlign:'middle', flexShrink:0 }}>
      <defs>
        <linearGradient id="gbp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C9A84C" />
          <stop offset="50%" stopColor="#F0D878" />
          <stop offset="100%" stopColor="#C9A84C" />
        </linearGradient>
      </defs>
      <path d="M8 1L2 3.5v4.2C2 11.2 5 14.2 8 15c3-0.8 6-3.8 6-7.3V3.5L8 1z" fill="url(#gbp)" />
      <path d="M5.5 8l1.8 1.8L11 6" stroke="#1a1208" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Avatar atom ────────────────────────────────────────────────────── */
function Avatar({ person, size }: { person: Person; size: number }) {
  const v = person.docrudGo === true;
  const radius = size >= 48 ? 14 : 10;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {v && (
        <div className="absolute rounded-[inherit] z-0"
          style={{ inset: -1.5, borderRadius: radius + 2, background: 'linear-gradient(135deg,#C9A84C,#F0D878,#C9A84C)' }} />
      )}
      <div className="relative z-10 w-full h-full overflow-hidden flex items-center justify-center font-bold text-sm"
        style={{
          borderRadius: radius,
          background: v ? '#1a1208' : 'rgba(255,255,255,0.07)',
          color: v ? '#C9A84C' : 'rgba(255,255,255,0.6)',
          border: v ? 'none' : '1px solid rgba(255,255,255,0.09)',
        }}>
        {person.profile.avatarUrl
          ? <img src={person.profile.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
          : getInitials(person.name)}
      </div>
    </div>
  );
}

/* ─── Person card ────────────────────────────────────────────────────── */
function PersonCard({
  person, sessionUserId, isFollowing, isUpraised, upraiseCount,
  onToggleFollow, onToggleUpraise,
}: {
  person: Person;
  sessionUserId?: string;
  isFollowing: boolean;
  isUpraised: boolean;
  upraiseCount: number;
  onToggleFollow: (id: string) => void;
  onToggleUpraise: (id: string) => void;
}) {
  const router = useRouter();
  const isOwnCard = sessionUserId === person.id;
  const v = person.docrudGo === true;

  const skillStyle = (v: boolean) => v
    ? { background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.13)', color: 'rgba(255,255,255,0.50)' }
    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.42)' };

  /* ── Mobile list card (< sm) ── */
  const mobileCard = (
    <div
      className="sm:hidden cursor-pointer"
      onClick={() => router.push(`/u/${person.id}`)}
      role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/u/${person.id}`); }}
    >
      <div
        className="rounded-[16px] p-[1px] transition-all"
        style={{
          background: v
            ? 'linear-gradient(135deg,rgba(201,168,76,0.55),rgba(240,216,120,0.28) 50%,rgba(201,168,76,0.50))'
            : 'rgba(255,255,255,0.07)',
        }}
      >
        <div className="rounded-[15px] p-3.5 flex gap-3"
          style={{ background: v ? 'linear-gradient(160deg,#1c1608,#120e04)' : '#0f0f11', position: 'relative', overflow: 'hidden' }}>
          {/* Verified glow */}
          {v && <div className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 10% 0%,rgba(232,204,122,0.08) 0%,transparent 60%)' }} />}

          {/* Avatar */}
          <Avatar person={person} size={46} />

          {/* Main info */}
          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-bold text-[14px] text-white leading-tight truncate">{person.name}</span>
              {v && <GoldBadge />}
              {person.profile.openToWork && (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-400 shrink-0">
                  Open
                </span>
              )}
            </div>
            {/* Headline */}
            {person.profile.headline && (
              <p className="text-[12px] leading-snug truncate mb-1" style={{ color: v ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.40)' }}>
                {person.profile.headline}
              </p>
            )}
            {/* Location */}
            {person.profile.location && (
              <div className="flex items-center gap-1 mb-2 text-[11px] text-white/30">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{person.profile.location}</span>
              </div>
            )}
            {/* Skills */}
            {(person.profile.skills ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {person.profile.skills!.slice(0, 4).map((s) => (
                  <span key={s} className="rounded-full px-2 py-0.5 text-[10px]" style={skillStyle(v)}>{s}</span>
                ))}
                {person.profile.skills!.length > 4 && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] text-white/25" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                    +{person.profile.skills!.length - 4}
                  </span>
                )}
              </div>
            )}
            {/* Stats row */}
            <div className="flex items-center gap-3 text-[11px]" style={{ color: v ? 'rgba(201,168,76,0.50)' : 'rgba(255,255,255,0.28)' }}>
              {upraiseCount > 0 && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />{upraiseCount}
                </span>
              )}
              <span>{person.stats.followers.toLocaleString()} followers</span>
              {person.stats.gigsCount > 0 && (
                <span className="flex items-center gap-1 text-white/22">
                  <Briefcase className="h-3 w-3" />{person.stats.gigsCount}
                </span>
              )}
            </div>
          </div>

          {/* Right-side actions */}
          {!isOwnCard && sessionUserId && (
            <div className="flex flex-col gap-1.5 shrink-0 justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onToggleFollow(person.id)}
                className="h-8 px-4 rounded-[10px] text-[12px] font-semibold transition-all"
                style={isFollowing
                  ? { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.10)' }
                  : v
                    ? { background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#1a1208' }
                    : { background: '#fff', color: '#0D0D0F' }}>
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <button
                onClick={() => onToggleUpraise(person.id)}
                className="h-7 px-3 rounded-[9px] text-[11px] font-semibold transition-all flex items-center justify-center gap-1"
                style={isUpraised
                  ? { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.30)', color: '#F59E0B' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.38)' }}>
                <TrendingUp className="h-3 w-3" />
                Upraise
              </button>
            </div>
          )}
          {!isOwnCard && !sessionUserId && (
            <div className="flex flex-col gap-1.5 shrink-0 justify-center" onClick={(e) => e.stopPropagation()}>
              <Link href={`/u/${person.id}`} onClick={(e) => e.stopPropagation()}
                className="h-8 px-3 rounded-[10px] text-[12px] font-medium border border-white/[0.09] text-white/50 flex items-center gap-1 hover:bg-white/[0.06] transition-all">
                View <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ── Desktop grid card (sm+) ── */
  const gridCard = (
    <div
      className="hidden sm:flex flex-col h-full cursor-pointer group"
      onClick={() => router.push(`/u/${person.id}`)}
      role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/u/${person.id}`); }}
    >
      {/* Gradient border wrapper */}
      <div className="rounded-[16px] p-[1px] flex-1 flex flex-col transition-all duration-200"
        style={{
          background: v
            ? 'linear-gradient(135deg,rgba(201,168,76,0.55),rgba(240,216,120,0.28) 50%,rgba(201,168,76,0.50))'
            : 'rgba(255,255,255,0.07)',
        }}>
        <div className="rounded-[15px] p-4 flex flex-col gap-2.5 flex-1 relative overflow-hidden"
          style={{ background: v ? 'linear-gradient(160deg,#1c1608,#120e04)' : 'rgba(255,255,255,0.025)' }}>
          {/* Verified glow */}
          {v && <div className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -5%,rgba(232,204,122,0.09) 0%,transparent 65%)' }} />}

          {/* Avatar + identity */}
          <div className="flex items-start gap-2.5">
            <Avatar person={person} size={40} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-semibold text-[13px] text-white leading-tight truncate">{person.name}</span>
                {v && <GoldBadge />}
              </div>
              {person.profile.headline && (
                <p className="text-[11px] truncate" style={{ color: v ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.38)' }}>
                  {person.profile.headline}
                </p>
              )}
              {person.profile.location && (
                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-white/28">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{person.profile.location}</span>
                </div>
              )}
            </div>
            {/* badges */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {v && (
                <span className="rounded-full px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-[0.08em]"
                  style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.20)' }}>
                  Go ✦
                </span>
              )}
              {person.profile.openToWork && (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/18 px-1.5 py-0.5 text-[8.5px] font-semibold text-emerald-400">
                  Open
                </span>
              )}
            </div>
          </div>

          {/* Skills */}
          {(person.profile.skills ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {person.profile.skills!.slice(0, 3).map((s) => (
                <span key={s} className="rounded-full px-2 py-0.5 text-[9.5px]" style={skillStyle(v)}>{s}</span>
              ))}
              {person.profile.skills!.length > 3 && (
                <span className="rounded-full px-2 py-0.5 text-[9.5px] text-white/22" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  +{person.profile.skills!.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Stats + actions */}
          <div className="flex items-center justify-between mt-auto pt-2"
            style={{ borderTop: v ? '1px solid rgba(201,168,76,0.10)' : '1px solid rgba(255,255,255,0.05)' }}>
            {/* Stats */}
            <div className="flex items-center gap-2.5 text-[10px]" style={{ color: v ? 'rgba(201,168,76,0.48)' : 'rgba(255,255,255,0.28)' }}>
              {upraiseCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <TrendingUp className="h-2.5 w-2.5" />{upraiseCount}
                </span>
              )}
              <span>{person.stats.followers}<span className="ml-0.5 opacity-60">flw</span></span>
              {person.stats.gigsCount > 0 && (
                <span className="flex items-center gap-0.5 opacity-70">
                  <Briefcase className="h-2.5 w-2.5" />{person.stats.gigsCount}
                </span>
              )}
            </div>
            {/* Actions */}
            <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              {sessionUserId && !isOwnCard && (
                <>
                  <button onClick={() => onToggleUpraise(person.id)}
                    className="flex items-center h-6 w-6 justify-center rounded-[7px] transition-all"
                    style={isUpraised
                      ? { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)', color: '#F59E0B' }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.38)' }}>
                    <TrendingUp className="h-2.5 w-2.5" />
                  </button>
                  <button onClick={() => onToggleFollow(person.id)}
                    className="h-6 px-2.5 rounded-[7px] text-[10px] font-semibold transition-all"
                    style={isFollowing
                      ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.48)' }
                      : v
                        ? { background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#1a1208' }
                        : { background: '#fff', color: '#0D0D0F' }}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </>
              )}
              <Link href={`/u/${person.id}`} onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center h-6 w-6 rounded-[7px] border border-white/[0.08] bg-white/[0.03] text-white/30 hover:text-white/60 hover:bg-white/[0.07] transition-all">
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileCard}
      {gridCard}
    </>
  );
}

/* ─── Sidebar filter panel ───────────────────────────────────────────── */
interface FilterState {
  sort: SortMode;
  search: string;
  verifiedOnly: boolean;
  openToWorkOnly: boolean;
  hasGigsOnly: boolean;
  accountType: string;
  minUpraised: string;
  minFollowers: string;
  location: string;
  skills: Set<string>;
}

function FilterPanel({
  filters, allSkills, onChange, onClear, activeCount,
}: {
  filters: FilterState;
  allSkills: string[];
  onChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onClear: () => void;
  activeCount: number;
}) {
  const [skillSearch, setSkillSearch] = useState('');
  const [skillsExpanded, setSkillsExpanded] = useState(false);

  const visibleSkills = useMemo(() => {
    const f = allSkills.filter((s) => s.toLowerCase().includes(skillSearch.toLowerCase()));
    return skillsExpanded ? f : f.slice(0, 12);
  }, [allSkills, skillSearch, skillsExpanded]);

  const sortOptions: { label: string; value: SortMode; icon: string }[] = [
    { label: 'Most Upraised', value: 'mostUpraised', icon: '▲' },
    { label: 'Most Followed', value: 'mostFollowed', icon: '◉' },
    { label: 'Most Active', value: 'mostGigs', icon: '⚡' },
    { label: 'Newest', value: 'recent', icon: '✦' },
    { label: 'Verified First', value: 'verified', icon: '◈' },
  ];

  const toggleSkill = (s: string) => {
    const next = new Set(filters.skills);
    next.has(s) ? next.delete(s) : next.add(s);
    onChange('skills', next);
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Filters</span>
        {activeCount > 0 && (
          <button onClick={onClear} className="text-[11px] font-semibold text-white/35 hover:text-white/60 transition-colors">
            Clear {activeCount}
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="mb-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/30 mb-2.5">Sort by</p>
        <div className="flex flex-col gap-1">
          {sortOptions.map((o) => (
            <button key={o.value} onClick={() => onChange('sort', o.value)}
              className={`flex items-center gap-2.5 h-8 px-3 rounded-[9px] text-[12px] font-medium text-left transition-all ${
                filters.sort === o.value
                  ? 'bg-white text-[#0D0D0F]'
                  : 'text-white/45 hover:text-white/70 hover:bg-white/[0.05]'
              }`}>
              <span className="text-[10px] opacity-60">{o.icon}</span>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/[0.06] mb-5" />

      {/* Status */}
      <div className="mb-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/30 mb-2.5">Status</p>
        <div className="flex flex-col gap-1.5">
          {[
            { label: 'Docrud Go Verified', key: 'verifiedOnly' as const, color: 'amber' },
            { label: 'Open to Work', key: 'openToWorkOnly' as const, color: 'emerald' },
            { label: 'Has Gig Listings', key: 'hasGigsOnly' as const, color: 'violet' },
          ].map(({ label, key, color }) => (
            <button key={key} onClick={() => onChange(key, !filters[key])}
              className={`flex items-center justify-between h-8 px-3 rounded-[9px] text-[12px] font-medium transition-all ${
                filters[key]
                  ? color === 'amber'
                    ? 'bg-amber-500/10 border border-amber-500/25 text-amber-300'
                    : color === 'emerald'
                      ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300'
                      : 'bg-violet-500/10 border border-violet-500/25 text-violet-300'
                  : 'text-white/40 hover:text-white/65 hover:bg-white/[0.04]'
              }`}>
              {label}
              {filters[key] && <span className="text-[9px]">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/[0.06] mb-5" />

      {/* Account type */}
      <div className="mb-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/30 mb-2.5">Account type</p>
        <div className="flex flex-wrap gap-1.5">
          {['', 'individual', 'business', 'enterprise'].map((t) => (
            <button key={t} onClick={() => onChange('accountType', t)}
              className={`h-7 px-3 rounded-full text-[11px] font-semibold transition-all capitalize ${
                filters.accountType === t
                  ? 'bg-white text-[#0D0D0F]'
                  : 'border border-white/[0.08] text-white/35 hover:text-white/60'
              }`}>
              {t === '' ? 'All' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/[0.06] mb-5" />

      {/* Thresholds */}
      <div className="mb-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/30 mb-2.5">Thresholds</p>
        <div className="space-y-2.5">
          <div>
            <label className="text-[10.5px] text-white/30 mb-1 block">Min upraised</label>
            <input
              type="number" min="0" value={filters.minUpraised}
              onChange={(e) => onChange('minUpraised', e.target.value)}
              placeholder="0"
              className="h-8 w-full rounded-[9px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-[12px] placeholder:text-white/20 focus:outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label className="text-[10.5px] text-white/30 mb-1 block">Min followers</label>
            <input
              type="number" min="0" value={filters.minFollowers}
              onChange={(e) => onChange('minFollowers', e.target.value)}
              placeholder="0"
              className="h-8 w-full rounded-[9px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-[12px] placeholder:text-white/20 focus:outline-none focus:border-white/20"
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-white/[0.06] mb-5" />

      {/* Location */}
      <div className="mb-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/30 mb-2.5">Location</p>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/25" />
          <input
            value={filters.location}
            onChange={(e) => onChange('location', e.target.value)}
            placeholder="City, country…"
            className="h-8 w-full rounded-[9px] border border-white/[0.08] bg-white/[0.04] text-white pl-8 pr-3 text-[12px] placeholder:text-white/20 focus:outline-none focus:border-white/20"
          />
        </div>
      </div>

      <div className="h-px bg-white/[0.06] mb-5" />

      {/* Skills */}
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/30 mb-2.5">Skills</p>
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/25" />
          <input
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
            placeholder="Filter skills…"
            className="h-7 w-full rounded-[9px] border border-white/[0.08] bg-white/[0.04] text-white pl-8 pr-2 text-[11px] placeholder:text-white/20 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {visibleSkills.map((s) => {
            const active = filters.skills.has(s);
            return (
              <button key={s} onClick={() => toggleSkill(s)}
                className={`h-6 px-2.5 rounded-full text-[10.5px] font-medium transition-all ${
                  active
                    ? 'bg-white/[0.12] border border-white/[0.20] text-white'
                    : 'border border-white/[0.07] text-white/35 hover:text-white/55 hover:border-white/[0.12]'
                }`}>
                {s}
              </button>
            );
          })}
          {allSkills.filter((s) => s.toLowerCase().includes(skillSearch.toLowerCase())).length > 12 && (
            <button onClick={() => setSkillsExpanded((p) => !p)}
              className="h-6 px-2.5 rounded-full border border-white/[0.07] text-[10.5px] text-white/30 hover:text-white/55 transition-colors">
              {skillsExpanded ? 'Show less' : `+${allSkills.length - 12} more`}
            </button>
          )}
        </div>
        {filters.skills.size > 0 && (
          <button onClick={() => onChange('skills', new Set())}
            className="mt-2 text-[10.5px] text-white/30 hover:text-white/55 transition-colors">
            Clear skills
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Pagination ─────────────────────────────────────────────────────── */
function Pagination({ page, totalPages, total, pageSize, onChange }: {
  page: number; totalPages: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages = useMemo(() => {
    const arr: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push('ellipsis');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) arr.push(i);
      if (page < totalPages - 2) arr.push('ellipsis');
      arr.push(totalPages);
    }
    return arr;
  }, [page, totalPages]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-2 border-t border-white/[0.06]">
      <p className="text-[12px] text-white/30">
        Showing <span className="text-white/55 font-medium">{from}–{to}</span> of <span className="text-white/55 font-medium">{total}</span> people
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)} disabled={page === 1}
          className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-white/[0.08] bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className="flex h-8 w-8 items-center justify-center text-white/20 text-[12px]">…</span>
          ) : (
            <button key={p} onClick={() => onChange(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-[9px] text-[12px] font-semibold transition-all ${
                p === page
                  ? 'bg-white text-[#0D0D0F]'
                  : 'border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
              }`}>
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-white/[0.08] bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Skeleton card ──────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <>
      {/* Mobile skeleton */}
      <div className="sm:hidden rounded-[16px] border border-white/[0.06] p-3.5 flex gap-3" style={{ background: '#0f0f11' }}>
        <div className="h-[46px] w-[46px] animate-pulse bg-white/[0.06] rounded-[14px] shrink-0" />
        <div className="flex-1 space-y-2 py-0.5">
          <div className="h-3.5 animate-pulse bg-white/[0.06] rounded w-2/3" />
          <div className="h-3 animate-pulse bg-white/[0.06] rounded w-1/2" />
          <div className="flex gap-1.5 pt-0.5">
            {[1,2,3].map((j) => <div key={j} className="h-5 w-12 animate-pulse bg-white/[0.06] rounded-full" />)}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0 justify-center">
          <div className="h-8 w-20 animate-pulse bg-white/[0.06] rounded-[10px]" />
          <div className="h-7 w-20 animate-pulse bg-white/[0.06] rounded-[9px]" />
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="hidden sm:block rounded-[16px] border border-white/[0.06] p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.025)' }}>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 animate-pulse bg-white/[0.06] rounded-[10px] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 animate-pulse bg-white/[0.06] rounded w-3/4" />
            <div className="h-2.5 animate-pulse bg-white/[0.06] rounded w-1/2" />
          </div>
        </div>
        <div className="flex gap-1">
          {[1,2,3].map((j) => <div key={j} className="h-5 w-14 animate-pulse bg-white/[0.06] rounded-full" />)}
        </div>
        <div className="h-6 animate-pulse bg-white/[0.06] rounded-[8px]" />
      </div>
    </>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────── */
const DEFAULT_FILTERS: FilterState = {
  sort: 'mostUpraised',
  search: '',
  verifiedOnly: false,
  openToWorkOnly: false,
  hasGigsOnly: false,
  accountType: '',
  minUpraised: '',
  minFollowers: '',
  location: '',
  skills: new Set(),
};

export default function PeoplePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;

  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [upraisedIds, setUpraisedIds] = useState<Set<string>>(new Set());
  const [upraiseCounts, setUpraiseCounts] = useState<Record<string, number>>({});

  /* load data */
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch('/api/public/people').then((r) => r.json()).catch(() => ({ people: [] })),
      fetch('/api/profile/following').then((r) => r.json()).catch(() => ({ followingIds: [] })),
      fetch('/api/upraise/my-list').then((r) => r.json()).catch(() => ({ upraisedIds: [] })),
    ]).then(([peopleData, followData, upraiseData]) => {
      if (!alive) return;
      const list: Person[] = peopleData.people ?? [];
      setPeople(list);
      // seed upraise counts from API data
      const counts: Record<string, number> = {};
      for (const p of list) counts[p.id] = p.upraiseCount ?? 0;
      setUpraiseCounts(counts);
      setFollowingIds(new Set<string>(Array.isArray(followData.followingIds) ? followData.followingIds : []));
      setUpraisedIds(new Set<string>(Array.isArray(upraiseData.upraisedIds) ? upraiseData.upraisedIds : []));
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  /* reset to page 1 when filters change */
  useEffect(() => { setPage(1); }, [filters]);

  /* derived all-skills list */
  const allSkills = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const p of people) for (const s of p.profile.skills ?? []) freq[s] = (freq[s] ?? 0) + 1;
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [people]);

  /* active filter count */
  const activeFilterCount = useMemo(() => [
    filters.sort !== 'mostUpraised',
    filters.verifiedOnly, filters.openToWorkOnly, filters.hasGigsOnly,
    filters.accountType !== '', filters.minUpraised !== '',
    filters.minFollowers !== '', filters.location !== '',
    filters.skills.size > 0,
  ].filter(Boolean).length, [filters]);

  /* filtered + sorted list */
  const filtered = useMemo(() => {
    let r = people;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      r = r.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.profile.headline?.toLowerCase().includes(q) ?? false) ||
        (p.profile.location?.toLowerCase().includes(q) ?? false) ||
        (p.profile.skills?.some((s) => s.toLowerCase().includes(q)) ?? false),
      );
    }
    if (filters.verifiedOnly) r = r.filter((p) => p.docrudGo);
    if (filters.openToWorkOnly) r = r.filter((p) => p.profile.openToWork);
    if (filters.hasGigsOnly) r = r.filter((p) => p.stats.gigsCount > 0);
    if (filters.accountType) r = r.filter((p) => p.accountType === filters.accountType);
    if (filters.minUpraised) r = r.filter((p) => (upraiseCounts[p.id] ?? p.upraiseCount ?? 0) >= Number(filters.minUpraised));
    if (filters.minFollowers) r = r.filter((p) => p.stats.followers >= Number(filters.minFollowers));
    if (filters.location) {
      const lf = filters.location.toLowerCase();
      r = r.filter((p) => p.profile.location?.toLowerCase().includes(lf) ?? false);
    }
    if (filters.skills.size > 0) {
      const skillArr = Array.from(filters.skills);
      r = r.filter((p) => skillArr.every((s) => p.profile.skills?.includes(s) ?? false));
    }
    // sort
    r = [...r].sort((a, b) => {
      const aCount = upraiseCounts[a.id] ?? a.upraiseCount ?? 0;
      const bCount = upraiseCounts[b.id] ?? b.upraiseCount ?? 0;
      switch (filters.sort) {
        case 'mostUpraised': return bCount - aCount || b.stats.followers - a.stats.followers;
        case 'mostFollowed': return b.stats.followers - a.stats.followers;
        case 'mostGigs': return b.stats.gigsCount - a.stats.gigsCount;
        case 'recent': return +new Date(b.createdAt) - +new Date(a.createdAt);
        case 'verified': {
          if (a.docrudGo !== b.docrudGo) return a.docrudGo ? -1 : 1;
          return bCount - aCount;
        }
      }
    });
    return r;
  }, [people, filters, upraiseCounts]);

  /* paginated slice */
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* scroll to top on page change */
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [page]);

  /* follow toggle */
  const handleToggleFollow = useCallback(async (targetId: string) => {
    if (!sessionUserId) return;
    const already = followingIds.has(targetId);
    setFollowingIds((prev) => { const n = new Set(prev); already ? n.delete(targetId) : n.add(targetId); return n; });
    try {
      await fetch('/api/profile/follow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetId, action: already ? 'unfollow' : 'follow' }),
      });
    } catch {
      setFollowingIds((prev) => { const n = new Set(prev); already ? n.add(targetId) : n.delete(targetId); return n; });
    }
  }, [followingIds, sessionUserId]);

  /* upraise toggle */
  const handleToggleUpraise = useCallback(async (targetId: string) => {
    if (!sessionUserId) { router.push('/login'); return; }
    const already = upraisedIds.has(targetId);
    setUpraisedIds((prev) => { const n = new Set(prev); already ? n.delete(targetId) : n.add(targetId); return n; });
    setUpraiseCounts((prev) => ({ ...prev, [targetId]: Math.max(0, (prev[targetId] ?? 0) + (already ? -1 : 1)) }));
    try {
      const res = await fetch(`/api/upraise/${targetId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setUpraisedIds((prev) => { const n = new Set(prev); data.hasUpraised ? n.add(targetId) : n.delete(targetId); return n; });
        setUpraiseCounts((prev) => ({ ...prev, [targetId]: data.count }));
      }
    } catch {
      setUpraisedIds((prev) => { const n = new Set(prev); already ? n.add(targetId) : n.delete(targetId); return n; });
      setUpraiseCounts((prev) => ({ ...prev, [targetId]: Math.max(0, (prev[targetId] ?? 0) + (already ? 1 : -1)) }));
    }
  }, [upraisedIds, sessionUserId, router]);

  /* filter updater */
  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  /* close sidebar on ESC */
  useEffect(() => {
    if (!sidebarOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white">

      {/* ─── Sticky header ─── */}
      <header className="sticky top-0 z-30 bg-[#0D0D0F]/92 backdrop-blur-xl border-b border-white/[0.06]">
        {/* Row 1: back + title + filter button (mobile) */}
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12 pt-3 pb-2 flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.04] text-white/55 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex items-baseline gap-2 flex-1 min-w-0">
            <h1 className="text-[15px] font-bold text-white">People</h1>
            {!loading && (
              <span className="text-[12px] text-white/30">{filtered.length}</span>
            )}
          </div>

          {/* Mobile filter button */}
          <button onClick={() => setSidebarOpen(true)}
            className={`lg:hidden flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-[12px] font-semibold shrink-0 transition-all ${
              activeFilterCount > 0
                ? 'bg-white text-[#0D0D0F]'
                : 'border border-white/[0.08] bg-white/[0.04] text-white/50'
            }`}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">{activeFilterCount > 0 ? `Filters · ${activeFilterCount}` : 'Filter'}</span>
            {activeFilterCount > 0 && <span className="xs:hidden text-[10px] font-bold">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Row 2: search (full width on mobile) */}
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12 pb-3">
          <div className="relative max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25" />
            <input
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Search name, skill, location…"
              className="h-9 w-full rounded-[11px] border border-white/[0.08] bg-white/[0.05] text-white pl-9 pr-8 text-[13px] placeholder:text-white/25 focus:outline-none focus:border-white/[0.18] transition-colors"
            />
            {filters.search && (
              <button onClick={() => setFilter('search', '')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Active filter pills strip */}
        {activeFilterCount > 0 && (
          <div className="px-4 sm:px-6 lg:px-8 xl:px-12 pb-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {filters.verifiedOnly && (
              <button onClick={() => setFilter('verifiedOnly', false)}
                className="inline-flex shrink-0 items-center gap-1 h-6 rounded-full px-2.5 text-[10.5px] font-semibold bg-amber-500/12 border border-amber-500/25 text-amber-400">
                Verified <X className="h-2.5 w-2.5" />
              </button>
            )}
            {filters.openToWorkOnly && (
              <button onClick={() => setFilter('openToWorkOnly', false)}
                className="inline-flex shrink-0 items-center gap-1 h-6 rounded-full px-2.5 text-[10.5px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                Open to work <X className="h-2.5 w-2.5" />
              </button>
            )}
            {filters.hasGigsOnly && (
              <button onClick={() => setFilter('hasGigsOnly', false)}
                className="inline-flex shrink-0 items-center gap-1 h-6 rounded-full px-2.5 text-[10.5px] font-semibold border border-white/[0.10] bg-white/[0.06] text-white/60">
                Has gigs <X className="h-2.5 w-2.5" />
              </button>
            )}
            {filters.accountType && (
              <button onClick={() => setFilter('accountType', '')}
                className="inline-flex shrink-0 items-center gap-1 h-6 rounded-full px-2.5 text-[10.5px] font-semibold border border-white/[0.10] bg-white/[0.06] text-white/60 capitalize">
                {filters.accountType} <X className="h-2.5 w-2.5" />
              </button>
            )}
            {filters.location && (
              <button onClick={() => setFilter('location', '')}
                className="inline-flex shrink-0 items-center gap-1 h-6 rounded-full px-2.5 text-[10.5px] font-semibold border border-white/[0.10] bg-white/[0.06] text-white/60">
                <MapPin className="h-2.5 w-2.5" />{filters.location} <X className="h-2.5 w-2.5" />
              </button>
            )}
            {Array.from(filters.skills).map((s) => (
              <button key={s} onClick={() => { const n = new Set(filters.skills); n.delete(s); setFilter('skills', n); }}
                className="inline-flex shrink-0 items-center gap-1 h-6 rounded-full px-2.5 text-[10.5px] font-semibold border border-white/[0.10] bg-white/[0.06] text-white/60">
                {s} <X className="h-2.5 w-2.5" />
              </button>
            ))}
            <button onClick={clearFilters}
              className="inline-flex shrink-0 items-center h-6 rounded-full px-2.5 text-[10.5px] text-white/28 hover:text-white/50">
              Clear all
            </button>
          </div>
        )}
      </header>

      {/* ─── Body: sidebar + grid ─── */}
      <div className="flex min-h-[calc(100vh-56px)]">

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex shrink-0 w-[248px] xl:w-[264px] flex-col border-r border-white/[0.05]">
          <div className="sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto px-5 py-6 scrollbar-none">
            <FilterPanel
              filters={filters} allSkills={allSkills}
              onChange={setFilter} onClear={clearFilters} activeCount={activeFilterCount}
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-3 sm:px-5 lg:px-7 xl:px-9 py-4 sm:py-6">

          {/* Stats banner */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-5 text-[11px] sm:text-[12px] text-white/30 overflow-x-auto scrollbar-none pb-0.5">
              <span className="flex items-center gap-1.5 shrink-0">
                <Users className="h-3.5 w-3.5" />
                <span><span className="text-white/55 font-semibold">{filtered.length}</span> people</span>
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <TrendingUp className="h-3.5 w-3.5" />
                <span><span className="text-white/55 font-semibold">{people.filter((p) => p.docrudGo).length}</span> verified</span>
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <Zap className="h-3.5 w-3.5" />
                <span><span className="text-white/55 font-semibold">{people.filter((p) => p.profile.openToWork).length}</span> open</span>
              </span>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <div className="h-14 w-14 rounded-[18px] border border-white/[0.08] bg-white/[0.03] flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-white/20" />
              </div>
              <p className="text-white/40 text-[15px] font-semibold mb-1">No people found</p>
              <p className="text-white/22 text-[13px]">Try adjusting or clearing your filters</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters}
                  className="mt-5 h-9 px-5 rounded-[12px] border border-white/[0.10] bg-white/[0.04] text-sm text-white/55 hover:bg-white/[0.08] transition-colors">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3">
                {paginated.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    sessionUserId={sessionUserId}
                    isFollowing={followingIds.has(person.id)}
                    isUpraised={upraisedIds.has(person.id)}
                    upraiseCount={upraiseCounts[person.id] ?? person.upraiseCount ?? 0}
                    onToggleFollow={handleToggleFollow}
                    onToggleUpraise={handleToggleUpraise}
                  />
                ))}
              </div>
              <div className="mt-8">
                <Pagination
                  page={page} totalPages={totalPages} total={filtered.length}
                  pageSize={PAGE_SIZE} onChange={setPage}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {/* ─── Mobile filter sheet ─── */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[90] max-h-[86dvh] flex flex-col rounded-t-[24px] bg-[#111113] border-t border-white/[0.09] shadow-[0_-24px_60px_rgba(0,0,0,0.8)]">
            <div className="shrink-0 px-5 pt-3 pb-3 border-b border-white/[0.07]">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/[0.12]" />
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-bold text-white">Filters & Sort</p>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-[12px] font-semibold text-white/40 hover:text-white/65">Clear all</button>
                  )}
                  <button onClick={() => setSidebarOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-white/[0.08] bg-white/[0.04] text-white/45">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-none">
              <FilterPanel
                filters={filters} allSkills={allSkills}
                onChange={setFilter} onClear={clearFilters} activeCount={activeFilterCount}
              />
            </div>
            <div className="shrink-0 px-5 py-4 border-t border-white/[0.07]">
              <button onClick={() => setSidebarOpen(false)}
                className="w-full h-10 rounded-[13px] bg-white text-[#0D0D0F] font-bold text-sm">
                Show {filtered.length} results
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
