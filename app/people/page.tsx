'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PublicFaceStarIcon, PUBLIC_FACE_CATEGORY_LABELS } from '@/components/PublicFaceBadge';
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
  bannerUrl?: string;
  coverGradient?: string;
  coverPosition?: string;
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
  publicFace?: { category: string; approvedAt: string } | null;
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
  const pf = !!person.publicFace;
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
  const pf = !!person.publicFace;
  const v = !pf && person.docrudGo === true;
  const pfLabel = pf && person.publicFace?.category
    ? (PUBLIC_FACE_CATEGORY_LABELS as Record<string, string>)[person.publicFace.category] ?? 'Public Figure'
    : null;

  const skillPill = (gold: boolean, purple: boolean) =>
    purple
      ? { background: 'rgba(160,160,160,0.06)', border: '1px solid rgba(180,180,180,0.15)', color: 'rgba(185,185,185,0.65)' }
      : gold
        ? { background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.16)', color: 'rgba(255,255,255,0.52)' }
        : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.44)' };

  /* Banner background: real image → stored gradient → name-derived dark gradient */
  const BANNER_GRADIENTS = [
    'linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%)',
    'linear-gradient(135deg,#0d1b0d 0%,#14532d 100%)',
    'linear-gradient(135deg,#1a0d2e 0%,#4c1d95 100%)',
    'linear-gradient(135deg,#1c0a0a 0%,#7f1d1d 100%)',
    'linear-gradient(135deg,#0d1a1a 0%,#134e4a 100%)',
    'linear-gradient(135deg,#1a150d 0%,#78350f 100%)',
    'linear-gradient(135deg,#0a0d1a 0%,#1e1b4b 100%)',
    'linear-gradient(135deg,#0f0a1a 0%,#581c87 100%)',
  ];
  const bannerHash = Array.from(person.name).reduce((a, c) => a + c.charCodeAt(0), 0);

  const bannerStyle: React.CSSProperties = person.profile.bannerUrl
    ? { backgroundImage: `url(${person.profile.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: person.profile.coverPosition ?? 'center' }
    : person.profile.coverGradient
      ? { background: person.profile.coverGradient }
      : pf
        ? { background: 'linear-gradient(135deg,#080808 0%,#141414 55%,#0a0a0a 100%)' }
        : v
          ? { background: 'linear-gradient(135deg,#1c1608 0%,#3a2a06 55%,#1c1608 100%)' }
          : { background: BANNER_GRADIENTS[bannerHash % BANNER_GRADIENTS.length] };

  const outerBorder = v
    ? 'linear-gradient(135deg,rgba(201,168,76,0.60),rgba(240,216,120,0.30) 50%,rgba(201,168,76,0.55))'
    : 'rgba(255,255,255,0.08)';
  const cardBg = v
    ? 'linear-gradient(160deg,#1c1608,#120e04)'
    : 'rgb(13,13,15)';

  /* ── Mobile card ── */
  const mobileCard = (
    <div
      className="sm:hidden cursor-pointer active:scale-[0.99] transition-transform"
      onClick={() => router.push(`/u/${person.id}`)}
      role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/u/${person.id}`); }}
    >
      <div className="rounded-[18px] p-[1px]" style={{ background: outerBorder }}>
        {/* overflow-hidden is on the BANNER only, not the card — so negative-margin avatar/buttons aren't clipped */}
        <div className="rounded-[17px] flex flex-col" style={{ background: cardBg }}>

          {/* Banner strip — own overflow-hidden keeps image within rounded top corners */}
          <div className="relative shrink-0 rounded-t-[17px] overflow-hidden" style={{ height: 68, ...bannerStyle }}>
            {/* Scrim */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,0.08) 0%,rgba(0,0,0,0.62) 100%)' }} />
            {/* Gold shimmer for verified */}
            {v && <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(100deg,transparent 30%,rgba(201,168,76,0.10) 60%,transparent 80%)' }} />}
            {/* Public Face badge — top-right */}
            {pf && (
              <span className="pf-badge absolute top-2 right-2.5">
                <PublicFaceStarIcon size={7} /> Public Face
              </span>
            )}
            {/* Open-to-work pill on banner */}
            {person.profile.openToWork && (
              <span className="absolute top-2 right-2.5 rounded-full px-2 py-[3px] text-[9px] font-semibold backdrop-blur-md"
                style={{ background: 'rgba(16,185,129,0.20)', border: '1px solid rgba(16,185,129,0.32)', color: '#6ee7b7' }}>
                Open to Work
              </span>
            )}
          </div>

          {/* Body — avatar overlaps banner; z-index:1 ensures it paints above banner overlays */}
          <div className="px-3.5 pb-3.5" style={{ marginTop: -22, position: 'relative', zIndex: 1 }}>
            <div className="flex items-end gap-2.5">
              {/* Avatar */}
              <div className="shrink-0 rounded-full shadow-2xl" style={{
                padding: '2.5px',
                background: v ? 'linear-gradient(135deg,#C9A84C,#F0D878)' : 'rgba(255,255,255,0.12)',
              }}>
                <Avatar person={person} size={46} />
              </div>

              {/* Name + headline */}
              <div className="flex-1 min-w-0 pb-0.5 pt-[18px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-[13.5px] leading-tight text-white truncate">{person.name}</span>
                  {pf && <PublicFaceStarIcon size={13} />}
                  {v && <GoldBadge />}
                </div>
                {pf && pfLabel && (
                  <p className="text-[9.5px] font-medium mt-[1px]" style={{ color: 'rgba(255,255,255,0.38)' }}>{pfLabel}</p>
                )}
                {person.profile.headline && (
                  <p className="text-[11px] leading-snug truncate mt-[2px]"
                    style={{ color: pf ? 'rgba(185,185,185,0.55)' : v ? 'rgba(255,255,255,0.48)' : 'rgba(255,255,255,0.40)' }}>
                    {person.profile.headline}
                  </p>
                )}
              </div>

              {/* Actions — right side */}
              {!isOwnCard && (
                <div className="flex flex-col gap-1.5 shrink-0 pb-0.5 pt-[18px]" onClick={(e) => e.stopPropagation()}>
                  {sessionUserId ? (
                    <>
                      <button onClick={() => onToggleFollow(person.id)}
                        className="h-7 px-3.5 rounded-[9px] text-[11.5px] font-semibold transition-all"
                        style={isFollowing
                          ? { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.10)' }
                          : pf
                            ? { background: 'rgba(180,180,180,0.10)', border: '1px solid rgba(200,200,200,0.30)', color: '#d8d8d8' }
                            : v
                              ? { background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#1a1208' }
                              : { background: '#ffffff', color: '#0D0D0F', fontWeight: 700 }}>
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                      <button onClick={() => onToggleUpraise(person.id)}
                        className="h-6 px-2.5 rounded-[8px] text-[10.5px] font-semibold transition-all flex items-center justify-center gap-1"
                        style={isUpraised
                          ? { background: 'rgba(245,158,11,0.13)', border: '1px solid rgba(245,158,11,0.30)', color: '#F59E0B' }
                          : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.38)' }}>
                        <TrendingUp className="h-2.5 w-2.5" /> Upraise
                      </button>
                    </>
                  ) : (
                    <Link href={`/u/${person.id}`} onClick={(e) => e.stopPropagation()}
                      className="h-7 px-3 rounded-[9px] text-[11px] font-medium flex items-center gap-1 transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.50)', border: '1px solid rgba(255,255,255,0.09)' }}>
                      View <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Location */}
            {person.profile.location && (
              <div className="flex items-center gap-1 mt-2 text-[10.5px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{person.profile.location}</span>
              </div>
            )}

            {/* Skills */}
            {(person.profile.skills ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {person.profile.skills!.slice(0, 4).map((s) => (
                  <span key={s} className="rounded-full px-2 py-[3px] text-[9.5px]" style={skillPill(v, pf)}>{s}</span>
                ))}
                {person.profile.skills!.length > 4 && (
                  <span className="rounded-full px-2 py-[3px] text-[9.5px]"
                    style={{ color: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    +{person.profile.skills!.length - 4}
                  </span>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 mt-2.5 text-[10.5px]" style={{ color: pf ? 'rgba(185,185,185,0.45)' : v ? 'rgba(201,168,76,0.50)' : 'rgba(255,255,255,0.28)' }}>
              {upraiseCount > 0 && (
                <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{upraiseCount}</span>
              )}
              <span>{person.stats.followers.toLocaleString()} <span className="opacity-60">followers</span></span>
              {person.stats.gigsCount > 0 && (
                <span className="flex items-center gap-1 opacity-70">
                  <Briefcase className="h-3 w-3" />{person.stats.gigsCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Desktop grid card ── */
  const gridCard = (
    <div
      className="hidden sm:flex flex-col h-full cursor-pointer group"
      onClick={() => router.push(`/u/${person.id}`)}
      role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/u/${person.id}`); }}
    >
      <div className="rounded-[18px] p-[1px] flex-1 flex flex-col transition-all duration-200 group-hover:scale-[1.012] group-hover:shadow-2xl"
        style={{ background: outerBorder }}>
        {/* No overflow-hidden here — it's only on the banner div, so avatar+buttons aren't clipped */}
        <div className="rounded-[17px] flex flex-col flex-1" style={{ background: cardBg }}>

          {/* ── Hero banner — overflow-hidden clips image to rounded top corners ── */}
          <div className="relative shrink-0 rounded-t-[17px] overflow-hidden" style={{ height: 82, ...bannerStyle }}>
            {/* Bottom scrim blends into card body */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.65) 100%)' }} />
            {/* Gold shimmer */}
            {v && <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(105deg,transparent 20%,rgba(201,168,76,0.09) 55%,transparent 75%)' }} />}

            {/* Top-right badge cluster */}
            <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
              {pf && <span className="pf-badge"><PublicFaceStarIcon size={7} /> Public Face</span>}
              {v && (
                <span className="rounded-full px-2 py-[3px] text-[8px] font-black uppercase tracking-[0.10em] backdrop-blur-sm"
                  style={{ background: 'rgba(201,168,76,0.24)', border: '1px solid rgba(201,168,76,0.38)', color: '#F0D878', letterSpacing: '0.08em' }}>
                  ✦ Go
                </span>
              )}
              {person.profile.openToWork && (
                <span className="rounded-full px-2 py-[3px] text-[8px] font-semibold backdrop-blur-sm"
                  style={{ background: 'rgba(16,185,129,0.20)', border: '1px solid rgba(16,185,129,0.32)', color: '#6ee7b7' }}>
                  Open to Work
                </span>
              )}
            </div>
          </div>

          {/* ── Card body — z-index:1 paints above banner overlay children ── */}
          <div className="flex flex-col flex-1 px-4" style={{ position: 'relative', zIndex: 1 }}>

            {/* Avatar + actions row — avatar overlaps banner */}
            <div className="flex items-end justify-between" style={{ marginTop: -26 }}>
              {/* Avatar */}
              <div className="shrink-0 rounded-full shadow-2xl" style={{
                padding: '2.5px',
                background: v ? 'linear-gradient(135deg,#C9A84C,#F0D878)' : 'rgba(255,255,255,0.12)',
                boxShadow: v ? '0 0 0 1px rgba(201,168,76,0.25), 0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.45)',
              }}>
                <Avatar person={person} size={50} />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 pb-[3px]" onClick={(e) => e.stopPropagation()}>
                {sessionUserId && !isOwnCard && (
                  <button onClick={() => onToggleUpraise(person.id)}
                    className="flex items-center justify-center h-7 w-7 rounded-[8px] transition-all"
                    style={isUpraised
                      ? { background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.32)', color: '#F59E0B' }
                      : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.36)' }}>
                    <TrendingUp className="h-3 w-3" />
                  </button>
                )}
                {sessionUserId && !isOwnCard && (
                  <button onClick={() => onToggleFollow(person.id)}
                    className="h-7 px-3 rounded-[8px] text-[11px] font-semibold transition-all"
                    style={isFollowing
                      ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.50)', border: '1px solid rgba(255,255,255,0.09)' }
                      : pf
                        ? { background: 'rgba(180,180,180,0.10)', border: '1px solid rgba(200,200,200,0.30)', color: '#d8d8d8' }
                        : v
                          ? { background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#1a1208' }
                          : { background: '#ffffff', color: '#0D0D0F', fontWeight: 700 }}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
                <Link href={`/u/${person.id}`} onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center h-7 w-7 rounded-[8px] transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.32)' }}>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Name + headline + location */}
            <div className="mt-2.5">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[13.5px] leading-snug text-white truncate">{person.name}</span>
                {pf && <PublicFaceStarIcon size={13} />}
                {v && <GoldBadge />}
              </div>
              {pf && pfLabel && (
                <p className="text-[10px] font-medium mt-[2px]" style={{ color: 'rgba(255,255,255,0.38)' }}>{pfLabel}</p>
              )}
              {person.profile.headline && (
                <p className="text-[11.5px] leading-snug truncate mt-[3px]"
                  style={{ color: pf ? 'rgba(185,185,185,0.55)' : v ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.40)' }}>
                  {person.profile.headline}
                </p>
              )}
              {person.profile.location && (
                <div className="flex items-center gap-1 mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{person.profile.location}</span>
                </div>
              )}
            </div>

            {/* Skills */}
            {(person.profile.skills ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {person.profile.skills!.slice(0, 3).map((s) => (
                  <span key={s} className="rounded-full px-2 py-[3px] text-[9px]" style={skillPill(v, pf)}>{s}</span>
                ))}
                {person.profile.skills!.length > 3 && (
                  <span className="rounded-full px-2 py-[3px] text-[9px]"
                    style={{ color: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    +{person.profile.skills!.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Stats footer */}
            <div className="flex items-center gap-2.5 mt-auto pt-3 pb-3.5 text-[10px]"
              style={{
                borderTop: pf ? '1px solid rgba(180,180,180,0.10)' : v ? '1px solid rgba(201,168,76,0.10)' : '1px solid rgba(255,255,255,0.06)',
                marginTop: 'auto',
                color: pf ? 'rgba(185,185,185,0.45)' : v ? 'rgba(201,168,76,0.50)' : 'rgba(255,255,255,0.28)',
              }}>
              {upraiseCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <TrendingUp className="h-2.5 w-2.5" />{upraiseCount}
                </span>
              )}
              <span>{person.stats.followers.toLocaleString()}<span className="ml-0.5 opacity-55">flw</span></span>
              {person.stats.gigsCount > 0 && (
                <span className="flex items-center gap-0.5 opacity-70">
                  <Briefcase className="h-2.5 w-2.5" />{person.stats.gigsCount} gig{person.stats.gigsCount !== 1 ? 's' : ''}
                </span>
              )}
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
  publicFaceOnly: boolean;
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
            { label: '⭐ Public Faces', key: 'publicFaceOnly' as const, color: 'platinum' },
            { label: 'Docrud Go Verified', key: 'verifiedOnly' as const, color: 'amber' },
            { label: 'Open to Work', key: 'openToWorkOnly' as const, color: 'emerald' },
            { label: 'Has Gig Listings', key: 'hasGigsOnly' as const, color: 'violet' },
          ].map(({ label, key, color }) => (
            <button key={key} onClick={() => onChange(key, !filters[key])}
              className={`flex items-center justify-between h-8 px-3 rounded-[9px] text-[12px] font-medium transition-all ${
                filters[key]
                  ? color === 'platinum'
                    ? ''
                    : color === 'amber'
                      ? 'bg-amber-500/10 border border-amber-500/25 text-amber-300'
                      : color === 'emerald'
                        ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300'
                        : 'bg-violet-500/10 border border-violet-500/25 text-violet-300'
                  : 'text-white/40 hover:text-white/65 hover:bg-white/[0.04]'
              }`}
              style={filters[key] && color === 'platinum'
                ? { background: 'rgba(160,160,160,0.08)', border: '1px solid rgba(200,200,200,0.22)', color: '#d8d8d8' }
                : {}
              }>
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
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

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
      {/* Mobile skeleton — mirrors the banner+avatar layout */}
      <div className="sm:hidden rounded-[18px] overflow-hidden border border-white/[0.06]" style={{ background: '#0d0d0f' }}>
        <div className="h-[68px] animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="px-3.5 pb-3.5" style={{ marginTop: -22 }}>
          <div className="flex items-end gap-2.5">
            <div className="h-[50px] w-[50px] rounded-full animate-pulse shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div className="flex-1 space-y-1.5 pb-1 pt-[22px]">
              <div className="h-3.5 animate-pulse rounded w-2/3" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <div className="h-2.5 animate-pulse rounded w-1/2" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div className="h-7 w-20 animate-pulse rounded-[9px] pb-1 mt-[22px] shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <div className="flex gap-1.5 mt-2.5">
            {[1,2,3].map((j) => <div key={j} className="h-5 w-14 animate-pulse rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />)}
          </div>
        </div>
      </div>
      {/* Grid skeleton — mirrors banner+avatar+body */}
      <div className="hidden sm:block rounded-[18px] overflow-hidden border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="h-[82px] animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between" style={{ marginTop: -26 }}>
            <div className="h-[54px] w-[54px] rounded-full animate-pulse shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div className="flex gap-1.5 pb-1">
              <div className="h-7 w-7 animate-pulse rounded-[8px]" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-7 w-20 animate-pulse rounded-[8px]" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
          </div>
          <div className="mt-2.5 space-y-1.5">
            <div className="h-3.5 animate-pulse rounded w-3/5" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div className="h-2.5 animate-pulse rounded w-2/5" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
          <div className="flex gap-1.5 mt-3">
            {[1,2,3].map((j) => <div key={j} className="h-5 w-14 animate-pulse rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />)}
          </div>
          <div className="h-px mt-3 mb-3" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="flex gap-3">
            {[1,2].map((j) => <div key={j} className="h-2.5 w-16 animate-pulse rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />)}
          </div>
        </div>
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
  publicFaceOnly: false,
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
    filters.verifiedOnly, filters.openToWorkOnly, filters.hasGigsOnly, filters.publicFaceOnly,
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
    if (filters.publicFaceOnly) r = r.filter((p) => !!p.publicFace);
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
          const aPF = !!a.publicFace; const bPF = !!b.publicFace;
          if (aPF !== bPF) return aPF ? -1 : 1;
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

  /* ── quick-filter chip definitions ─────────────────────────────────── */
  const quickChips = [
    { id: 'all',         label: 'All',              icon: '◈' },
    { id: 'publicFaces', label: '⭐ Public Faces',  icon: '' },
    { id: 'verified',    label: '✦ Verified',       icon: '' },
    { id: 'openToWork',  label: 'Open to Work',     icon: '' },
    { id: 'hasGigs',     label: 'Has Gigs',         icon: '' },
    { id: 'individual',  label: 'Individual',       icon: '' },
    { id: 'business',    label: 'Business',         icon: '' },
    { id: 'upraised',    label: '▲ Top Upraised',   icon: '' },
    { id: 'followed',    label: '◉ Most Followed',  icon: '' },
    { id: 'newest',      label: '✦ Newest',         icon: '' },
    { id: 'active',      label: '⚡ Most Active',   icon: '' },
  ] as const;
  type QuickChipId = typeof quickChips[number]['id'];

  function isChipActive(id: QuickChipId): boolean {
    if (id === 'all')         return activeFilterCount === 0 && filters.sort === 'mostUpraised';
    if (id === 'publicFaces') return filters.publicFaceOnly;
    if (id === 'verified')    return filters.verifiedOnly;
    if (id === 'openToWork')  return filters.openToWorkOnly;
    if (id === 'hasGigs')     return filters.hasGigsOnly;
    if (id === 'individual')  return filters.accountType === 'individual';
    if (id === 'business')    return filters.accountType === 'business';
    if (id === 'upraised')    return filters.sort === 'mostUpraised' && activeFilterCount === 0;
    if (id === 'followed')    return filters.sort === 'mostFollowed';
    if (id === 'newest')      return filters.sort === 'recent';
    if (id === 'active')      return filters.sort === 'mostGigs';
    return false;
  }

  function handleChip(id: QuickChipId) {
    if (id === 'all')         { clearFilters(); return; }
    if (id === 'publicFaces') { setFilter('publicFaceOnly', !filters.publicFaceOnly); return; }
    if (id === 'verified')    { setFilter('verifiedOnly',   !filters.verifiedOnly);   return; }
    if (id === 'openToWork')  { setFilter('openToWorkOnly', !filters.openToWorkOnly); return; }
    if (id === 'hasGigs')     { setFilter('hasGigsOnly',    !filters.hasGigsOnly);    return; }
    if (id === 'individual')  { setFilter('accountType', filters.accountType === 'individual' ? '' : 'individual'); return; }
    if (id === 'business')    { setFilter('accountType', filters.accountType === 'business'   ? '' : 'business');   return; }
    if (id === 'upraised')    { setFilter('sort', 'mostUpraised'); return; }
    if (id === 'followed')    { setFilter('sort', 'mostFollowed'); return; }
    if (id === 'newest')      { setFilter('sort', 'recent');       return; }
    if (id === 'active')      { setFilter('sort', 'mostGigs');     return; }
  }

  /* ── header height ref for sticky chip strip offset ─────────────────── */
  const HEADER_H = 56; // px — keep in sync with actual header height

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white">
      <style>{`
        @keyframes cardIn {
          from { opacity:0; transform:translateY(18px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        .pc-anim { animation: cardIn 0.38s cubic-bezier(0.22,1,0.36,1) both; }
        .no-sb::-webkit-scrollbar { display:none; }
        .no-sb { scrollbar-width:none; }

        /* ── Public Face badge ── */
        .pf-badge {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 2px 7px; border-radius: 999px;
          font-size: 8px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.11);
          color: rgba(255,255,255,0.52); backdrop-filter: blur(8px);
        }
      `}</style>

      {/* ══ Sticky header — single row ══════════════════════════════════ */}
      <header className="sticky top-0 z-30 bg-[#0D0D0F]/95 backdrop-blur-xl border-b border-white/[0.06]"
        style={{ height: HEADER_H }}>
        <div className="h-full px-3 sm:px-5 lg:px-8 flex items-center gap-2.5">

          {/* Back */}
          <button onClick={() => router.back()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.07] transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Title — hidden on very small screens to give search more room */}
          <div className="hidden sm:flex items-baseline gap-1.5 shrink-0">
            <span className="text-[15px] font-bold text-white">People</span>
            {!loading && <span className="text-[12px] text-white/30 font-medium">{filtered.length}</span>}
          </div>

          {/* Search — grows to fill space */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/28" />
            <input
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Search name, skill, location…"
              className="h-[34px] w-full rounded-[10px] border border-white/[0.08] bg-white/[0.05] text-white pl-9 pr-8 text-[13px] placeholder:text-white/25 focus:outline-none focus:border-white/[0.18] transition-colors"
            />
            {filters.search && (
              <button onClick={() => setFilter('search', '')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Stats — desktop only, compact */}
          {!loading && (
            <div className="hidden lg:flex items-center gap-3 shrink-0 text-[11px] text-white/30">
              <span className="flex items-center gap-1 font-medium" style={{ color: 'rgba(255,255,255,0.42)' }}>
                <PublicFaceStarIcon size={10} /> <span className="font-semibold">{people.filter((p) => !!p.publicFace).length}</span> public faces
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span className="text-white/55 font-semibold">{people.filter((p) => p.docrudGo).length}</span> verified
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span className="text-white/55 font-semibold">{people.filter((p) => p.profile.openToWork).length}</span> open
              </span>
            </div>
          )}

          {/* Filter button — shown on all screens (sidebar hidden on <lg, sheet opens) */}
          <button onClick={() => setSidebarOpen(true)}
            className={`lg:hidden flex items-center gap-1.5 h-[34px] px-3 rounded-[10px] text-[12px] font-semibold shrink-0 transition-all ${
              activeFilterCount > 0
                ? 'bg-white text-[#0D0D0F]'
                : 'border border-white/[0.08] bg-white/[0.04] text-white/50 hover:text-white/75'
            }`}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFilterCount > 0 && <span className="text-[10.5px] font-bold">{activeFilterCount}</span>}
          </button>
        </div>
      </header>

      {/* ══ Quick-filter chip strip — sticky below header ════════════════ */}
      <div className="sticky z-20 bg-[#0D0D0F]/95 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ top: HEADER_H }}>
        <div className="px-3 sm:px-5 lg:px-8 py-2 flex items-center gap-2 overflow-x-auto no-sb">
          {quickChips.map((chip) => {
            const active = isChipActive(chip.id);
            return (
              <button
                key={chip.id}
                onClick={() => handleChip(chip.id)}
                className="shrink-0 h-7 px-3 rounded-full text-[11.5px] font-semibold transition-all duration-150"
                style={active
                  ? chip.id === 'publicFaces'
                    ? { background: 'rgba(180,180,180,0.12)', border: '1px solid rgba(210,210,210,0.35)', color: '#e0e0e0' }
                    : chip.id === 'verified'
                      ? { background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.35)', color: '#F0D878' }
                      : chip.id === 'openToWork'
                        ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.30)', color: '#6ee7b7' }
                        : { background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.22)', color: '#ffffff' }
                  : chip.id === 'publicFaces'
                    ? { background: 'rgba(160,160,160,0.05)', border: '1px solid rgba(180,180,180,0.14)', color: 'rgba(200,200,200,0.50)' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.42)' }
                }>
                {chip.label}
              </button>
            );
          })}

          {/* Active skill pills */}
          {Array.from(filters.skills).map((s) => (
            <button key={s}
              onClick={() => { const n = new Set(filters.skills); n.delete(s); setFilter('skills', n); }}
              className="shrink-0 inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11.5px] font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
              {s} <X className="h-2.5 w-2.5" />
            </button>
          ))}

          {/* Location pill */}
          {filters.location && (
            <button onClick={() => setFilter('location', '')}
              className="shrink-0 inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11.5px] font-semibold"
              style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
              <MapPin className="h-2.5 w-2.5" />{filters.location} <X className="h-2.5 w-2.5" />
            </button>
          )}

          {/* Clear all — only when non-trivial filters active */}
          {activeFilterCount > 1 && (
            <button onClick={clearFilters}
              className="shrink-0 h-7 px-3 rounded-full text-[11px] text-white/28 hover:text-white/55 transition-colors">
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ══ Body: sidebar + grid ════════════════════════════════════════ */}
      <div className="flex">

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex shrink-0 w-[240px] xl:w-[256px] flex-col border-r border-white/[0.05]">
          <div className="sticky overflow-y-auto px-5 py-5 no-sb"
            style={{ top: HEADER_H + 41, height: `calc(100vh - ${HEADER_H + 41}px)` }}>
            <FilterPanel
              filters={filters} allSkills={allSkills}
              onChange={setFilter} onClear={clearFilters} activeCount={activeFilterCount}
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-3 sm:px-4 lg:px-6 xl:px-8 pt-4 pb-10">

          {/* Result count — mobile only (desktop has it in header) */}
          {!loading && filtered.length > 0 && (
            <div className="sm:hidden flex items-center gap-3 mb-3 text-[11px] text-white/30">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /><span className="font-semibold text-white/50">{filtered.length}</span> people</span>
              <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /><span className="font-semibold text-white/50">{people.filter((p) => p.docrudGo).length}</span> verified</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" /><span className="font-semibold text-white/50">{people.filter((p) => p.profile.openToWork).length}</span> open</span>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="h-16 w-16 rounded-[20px] border border-white/[0.07] bg-white/[0.03] flex items-center justify-center mb-5"
                style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}>
                <Users className="h-8 w-8 text-white/18" />
              </div>
              <p className="text-[16px] font-bold text-white/45 mb-1.5">No people found</p>
              <p className="text-[13px] text-white/25 mb-6 max-w-xs">
                Try clearing some filters or searching with a different keyword
              </p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters}
                  className="h-9 px-6 rounded-[12px] border border-white/[0.10] bg-white/[0.04] text-[13px] font-semibold text-white/55 hover:bg-white/[0.08] hover:text-white/75 transition-all">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {paginated.map((person, i) => (
                  <div key={person.id} className="pc-anim" style={{ animationDelay: `${Math.min(i, 11) * 0.045}s` }}>
                    <PersonCard
                      person={person}
                      sessionUserId={sessionUserId}
                      isFollowing={followingIds.has(person.id)}
                      isUpraised={upraisedIds.has(person.id)}
                      upraiseCount={upraiseCounts[person.id] ?? person.upraiseCount ?? 0}
                      onToggleFollow={handleToggleFollow}
                      onToggleUpraise={handleToggleUpraise}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Pagination
                  page={page} totalPages={totalPages} total={filtered.length}
                  pageSize={PAGE_SIZE} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {/* ══ Mobile filter bottom-sheet ═══════════════════════════════════ */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[90] max-h-[88dvh] flex flex-col rounded-t-[22px] border-t border-white/[0.09] shadow-[0_-28px_70px_rgba(0,0,0,0.85)]"
            style={{ background: '#111114' }}>
            {/* Handle + header */}
            <div className="shrink-0 px-5 pt-3 pb-3.5 border-b border-white/[0.07]">
              <div className="mx-auto mb-3 h-[3px] w-10 rounded-full bg-white/[0.14]" />
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-bold text-white">Filters &amp; Sort</p>
                <div className="flex items-center gap-2.5">
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters}
                      className="text-[12px] font-semibold text-white/38 hover:text-white/65 transition-colors">
                      Clear all
                    </button>
                  )}
                  <button onClick={() => setSidebarOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-white/[0.08] bg-white/[0.04] text-white/45 hover:text-white/70 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
            {/* Scrollable filter content */}
            <div className="flex-1 overflow-y-auto px-5 py-5 no-sb">
              <FilterPanel
                filters={filters} allSkills={allSkills}
                onChange={setFilter} onClear={clearFilters} activeCount={activeFilterCount}
              />
            </div>
            {/* CTA */}
            <div className="shrink-0 px-5 py-4 border-t border-white/[0.07]">
              <button onClick={() => setSidebarOpen(false)}
                className="w-full h-11 rounded-[13px] font-bold text-[14px] transition-all"
                style={{ background: '#ffffff', color: '#0D0D0F' }}>
                Show {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
