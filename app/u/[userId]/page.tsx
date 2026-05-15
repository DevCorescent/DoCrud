'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import VerifiedBadge from '@/components/VerifiedBadge';
import FeaturePostPanel from '@/components/FeaturePostPanel';
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  Check,
  Clock,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  Github,
  Globe,
  Instagram,
  KeyRound,
  Link2,
  Linkedin,
  Lock,
  LogOut,
  MapPin,
  MessageSquare,
  Plus,
  Share2,
  Shield,
  TrendingUp,
  Trophy,
  Twitter,
  UserCheck,
  UserPlus,
  X,
  Youtube,
  Zap,
  CheckCircle2,
  CreditCard,
  Heart,
  Move,
  Receipt,
  Rocket,
  Star,
  ThumbsUp,
} from 'lucide-react';

/* ─── types ─────────────────────────────────────────────────────────── */
interface ConnectionCard {
  id: string; name: string; headline?: string; avatarUrl?: string;
  location?: string; accountType?: string; isFollowing: boolean;
}

interface UserProfileData {
  headline?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatarUrl?: string;
  avatarPosition?: string;
  coverGradient?: string;
  coverPosition?: string;
  skills?: string[];
  experience?: Array<{ title: string; company: string; period: string; desc?: string }>;
  education?: Array<{ degree: string; school: string; year?: string }>;
  achievements?: Array<{ title: string; desc?: string }>;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
    youtube?: string;
  };
  openToWork?: boolean;
  pronouns?: string;
  updatedAt?: string;
  docrudGo?: boolean;
  docrudGoPurchasedAt?: string;
}

interface ProfileStats {
  followers: number;
  following: number;
  publishedCount: number;
  gigsCount: number;
}

interface GigCard {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  skills: string[];
  budgetLabel: string;
  timelineLabel?: string;
  engagementType: string;
  locationPreference: string;
  connectCount: number;
  createdAt: string;
}

interface ProfileResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    accountType?: string;
    createdAt: string;
  };
  profile: UserProfileData;
  stats: ProfileStats;
  isFollowing: boolean;
  isOwnProfile: boolean;
  recentPublished: unknown[];
  recentGigs: GigCard[];
}

/* ─── gradient helpers ───────────────────────────────────────────────── */
const COVER_GRADIENTS = [
  'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
  'linear-gradient(135deg, #0d0d0d, #1a1a2e, #16213e)',
  'linear-gradient(135deg, #1a0533, #0d0d2b, #040d21)',
  'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
  'linear-gradient(135deg, #16001e, #2a0845, #160029)',
  'linear-gradient(135deg, #000000, #0a0a0a, #1c1c1c)',
  'linear-gradient(135deg, #0a0a0a, #1a0a00, #0f0500)',
  'linear-gradient(135deg, #020024, #090979, #00d4ff22)',
];

function getGradient(userId: string) {
  return COVER_GRADIENTS[userId.charCodeAt(0) % COVER_GRADIENTS.length];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/* ─── publisher tracking panel ──────────────────────────────────────── */
function PublisherTrackingPanel() {
  const [subTab, setSubTab] = useState<'published' | 'registrations' | 'applications' | 'cta'>('published');
  const [registrations, setRegistrations] = useState<Array<{itemId: string; title: string; category: string; registeredAt: number}>>([]);
  const [applications, setApplications] = useState<Array<{itemId: string; title: string; appliedAt: number; url: string}>>([]);
  const [ctaData, setCtaData] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    try { setRegistrations(JSON.parse(localStorage.getItem('pub_registrations') || '[]')); } catch {}
    try { setApplications(JSON.parse(localStorage.getItem('pub_job_applications') || '[]')); } catch {}
    try { setCtaData(JSON.parse(localStorage.getItem('pub_cta_analytics') || '{}')); } catch {}
  }, []);

  const totalCta = Object.values(ctaData).flatMap(Object.values).reduce((a, b) => a + b, 0);

  const subTabs = [
    { id: 'registrations' as const, label: 'My Registrations', emoji: '🎟️', count: registrations.length },
    { id: 'applications' as const, label: 'My Applications', emoji: '💼', count: applications.length },
    { id: 'cta' as const, label: 'CTA Activity', emoji: '📊', count: totalCta },
  ];

  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      {/* header */}
      <div className="border-b border-white/[0.06] bg-gradient-to-r from-white/[0.04] to-transparent px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-white/[0.08]">
            <TrendingUp className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <p className="text-[13.5px] font-bold text-white/80">My Published Engagement</p>
            <p className="text-[10.5px] text-white/30">Track your registrations, applications & interactions</p>
          </div>
        </div>
      </div>

      {/* sub-tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] px-4 pt-3 pb-0 overflow-x-auto [scrollbar-width:none]">
        {subTabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-t-xl px-3.5 py-2 text-[11.5px] font-semibold transition border-b-2 ${
              subTab === t.id
                ? 'border-white/60 text-white bg-white/[0.05]'
                : 'border-transparent text-white/35 hover:text-white/60'
            }`}
          >
            <span>{t.emoji}</span> {t.label}
            {t.count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums ${subTab === t.id ? 'bg-white/20 text-white/70' : 'bg-white/[0.08] text-white/30'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Registrations tab */}
        {subTab === 'registrations' && (
          registrations.length === 0 ? (
            <div className="py-8 text-center">
              <span className="text-3xl">🎟️</span>
              <p className="mt-2 text-[12px] text-white/30">No registrations yet.</p>
              <p className="text-[11px] text-white/20 mt-1">Register for events or hackathons from the Published page.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {registrations.slice(0, 20).map((r, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[14px] border border-white/[0.05] bg-white/[0.02] px-3.5 py-3">
                  <span className="text-[18px]">{r.category === 'hackathon' ? '💻' : '🎟️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white/70 truncate">{r.title}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{new Date(r.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {r.category}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[9.5px] font-bold text-emerald-400">Registered</span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Applications tab */}
        {subTab === 'applications' && (
          applications.length === 0 ? (
            <div className="py-8 text-center">
              <span className="text-3xl">💼</span>
              <p className="mt-2 text-[12px] text-white/30">No job applications tracked yet.</p>
              <p className="text-[11px] text-white/20 mt-1">Apply to jobs from the Published page to track them here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {applications.slice(0, 20).map((a, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[14px] border border-white/[0.05] bg-white/[0.02] px-3.5 py-3">
                  <span className="text-[18px]">💼</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white/70 truncate">{a.title}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{new Date(a.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {a.url && (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[9.5px] font-semibold text-white/40 hover:text-white/70 transition">
                      View
                    </a>
                  )}
                  <span className="shrink-0 rounded-lg bg-blue-500/10 px-2 py-0.5 text-[9.5px] font-bold text-blue-400">Applied</span>
                </div>
              ))}
            </div>
          )
        )}

        {/* CTA Activity tab */}
        {subTab === 'cta' && (
          totalCta === 0 ? (
            <div className="py-8 text-center">
              <span className="text-3xl">📊</span>
              <p className="mt-2 text-[12px] text-white/30">No CTA activity yet.</p>
              <p className="text-[11px] text-white/20 mt-1">Interact with content on the Published page to see stats.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto [scrollbar-width:none]">
              {Object.entries(ctaData).filter(([, v]) => Object.values(v).some(n => n > 0)).map(([cat, actions]) => {
                const catTotal = Object.values(actions).reduce((a, b) => a + b, 0);
                return (
                  <div key={cat} className="rounded-[14px] border border-white/[0.05] bg-white/[0.02] px-3.5 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-white/50 capitalize">{cat}</span>
                      <span className="text-[9.5px] text-white/25 tabular-nums">{catTotal} actions</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(actions).sort((a, b) => b[1] - a[1]).map(([action, count]) => (
                        <span key={action} className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-0.5 text-[9.5px] font-semibold text-white/40">
                          <span className="tabular-nums font-bold text-white/60">{count}</span> {action.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ─── shimmer skeleton ───────────────────────────────────────────────── */
function Shimmer({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-[10px] bg-white/[0.06] ${className}`}
    />
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white">
      <header className="sticky top-0 z-40 h-14 bg-[#0D0D0F]/80 backdrop-blur-xl border-b border-white/[0.05] flex items-center px-4 md:px-8 gap-4">
        <Shimmer className="h-8 w-8 rounded-[10px]" />
        <Shimmer className="h-4 w-32" />
      </header>
      <div className="h-52 md:h-64 w-full animate-pulse bg-white/[0.04]" />
      <div className="-mt-16 px-4 md:px-8 lg:px-16 xl:px-24 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          <Shimmer className="h-28 w-28 md:h-36 md:w-36 shrink-0 rounded-[28px]" />
          <div className="flex-1 pb-2 space-y-3">
            <Shimmer className="h-7 w-56" />
            <Shimmer className="h-4 w-40" />
            <Shimmer className="h-3 w-24" />
          </div>
        </div>
        <div className="flex gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-12 w-20" />
          ))}
        </div>
        <Shimmer className="h-10 w-full mb-8 rounded-[14px]" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── published page cta analytics ──────────────────────────────────── */
const CTA_LABELS: Record<string, string> = {
  like_post: 'Liked posts',
  bookmark_save: 'Saved items',
  bookmark_remove: 'Unsaved items',
  share_item: 'Shared',
  apply_job: 'Applied to jobs',
  register_event: 'Registered for events',
  register_hackathon: 'Registered for hackathons',
  connect_resume: 'Sent connections',
  celebrate_milestone: 'Celebrated milestones',
  read_article: 'Read articles',
  download_doc: 'Downloaded docs',
  preview_doc: 'Previewed docs',
  view_portfolio: 'Viewed portfolios',
  view_profile: 'Viewed profiles',
  get_product: 'Explored products',
  watch_video: 'Saved videos',
  vote_poll: 'Voted in polls',
  take_survey: 'Took surveys',
  read_announcement: 'Read announcements',
};

const CAT_COLORS: Record<string, string> = {
  news: 'bg-red-500/70', article: 'bg-violet-500/70', document: 'bg-slate-400/70',
  portfolio: 'bg-emerald-500/70', announcement: 'bg-amber-400/70', job: 'bg-blue-500/70',
  resume: 'bg-sky-400/70', product: 'bg-purple-500/70', event: 'bg-pink-500/70',
  hackathon: 'bg-orange-500/70', post: 'bg-rose-500/70', poll: 'bg-violet-500/70',
  survey: 'bg-amber-500/70', video: 'bg-red-500/70', milestone: 'bg-yellow-400/70',
  tutorial: 'bg-indigo-500/70', thread: 'bg-sky-500/70', chart: 'bg-emerald-500/70',
};

const CAT_TEXT: Record<string, string> = {
  news: 'text-red-400', article: 'text-violet-400', document: 'text-slate-300',
  portfolio: 'text-emerald-400', announcement: 'text-amber-400', job: 'text-blue-400',
  resume: 'text-sky-400', product: 'text-purple-400', event: 'text-pink-400',
  hackathon: 'text-orange-400', post: 'text-rose-400', poll: 'text-violet-400',
  survey: 'text-amber-400', video: 'text-red-400', milestone: 'text-yellow-400',
  tutorial: 'text-indigo-400', thread: 'text-sky-400', chart: 'text-emerald-400',
};

function PublishedCtaAnalytics() {
  const [data, setData] = useState<Record<string, Record<string, number>>>({});
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pub_cta_analytics');
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);

  const categories = Object.entries(data).filter(([, actions]) =>
    Object.values(actions).some(v => v > 0)
  );
  const totalClicks = categories.flatMap(([, a]) => Object.values(a)).reduce((s, v) => s + v, 0);
  const totalActions = categories.reduce((s, [, a]) => s + Object.values(a).reduce((x, v) => x + v, 0), 0);

  const clearData = useCallback(() => {
    localStorage.removeItem('pub_cta_analytics');
    setData({});
  }, []);

  if (categories.length === 0 && totalClicks === 0) {
    return (
      <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/[0.06] border border-white/[0.08]">
            <TrendingUp className="h-3.5 w-3.5 text-amber-400/70" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white/75">Published Page Engagement</p>
            <p className="text-[10.5px] text-white/30">Your CTA activity across categories</p>
          </div>
        </div>
        <div className="py-8 text-center">
          <TrendingUp className="h-6 w-6 text-white/10 mx-auto mb-2" />
          <p className="text-[12px] text-white/25">No CTA activity yet.</p>
          <p className="text-[11px] text-white/15 mt-1">
            Interact with content on the{' '}
            <Link href="/published" className="text-amber-400/60 hover:text-amber-400 transition">published page</Link>
            {' '}to see your engagement stats here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-amber-500/10 border border-amber-500/20">
          <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white/80">Published Page Engagement</p>
          <p className="text-[10.5px] text-white/30">
            {totalActions} interactions across {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="flex h-7 items-center gap-1.5 rounded-[10px] border border-white/[0.09] bg-white/[0.04] px-3 text-[11px] font-semibold text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition"
          >
            {expanded ? 'Less' : 'Details'}
          </button>
          <button
            type="button"
            onClick={clearData}
            title="Clear all activity data"
            className="flex h-7 w-7 items-center justify-center rounded-[10px] border border-white/[0.07] bg-white/[0.03] text-white/20 hover:text-rose-400/70 hover:border-rose-500/20 transition"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Summary bar — top actions across all categories */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { key: 'bookmark_save',      label: 'Saved',       emoji: '🔖' },
          { key: 'like_post',          label: 'Liked',       emoji: '❤️' },
          { key: 'share_item',         label: 'Shared',      emoji: '🔗' },
          { key: 'apply_job',          label: 'Applied',     emoji: '💼' },
        ].map(({ key, label, emoji }) => {
          const count = categories.reduce((s, [, a]) => s + (a[key] ?? 0), 0);
          return (
            <div key={key} className="rounded-[14px] border border-white/[0.06] bg-white/[0.03] p-3 text-center">
              <p className="text-[18px] mb-0.5">{emoji}</p>
              <p className="text-[16px] font-black text-white tabular-nums">{count}</p>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.12em]">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Category breakdown */}
      <div className="space-y-3">
        {categories
          .sort((a, b) => Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0))
          .slice(0, expanded ? undefined : 5)
          .map(([cat, actions]) => {
            const catTotal = Object.values(actions).reduce((s, v) => s + v, 0);
            const maxInCat = Math.max(...Object.values(actions));
            const topActions = Object.entries(actions)
              .sort((a, b) => b[1] - a[1])
              .slice(0, expanded ? undefined : 3);
            const barColor = CAT_COLORS[cat] ?? 'bg-white/30';
            const textColor = CAT_TEXT[cat] ?? 'text-white/60';

            return (
              <div key={cat} className="rounded-[14px] border border-white/[0.05] bg-white/[0.025] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${barColor}`} />
                    <span className={`text-[12px] font-bold capitalize ${textColor}`}>{cat}</span>
                  </div>
                  <span className="text-[11px] font-bold tabular-nums text-white/50">{catTotal} interactions</span>
                </div>
                <div className="space-y-2">
                  {topActions.map(([actionId, count]) => (
                    <div key={actionId} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-[11px] text-white/35 truncate">{CTA_LABELS[actionId] ?? actionId}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} opacity-80`}
                          style={{ width: `${(count / maxInCat) * 100}%`, transition: 'width 0.4s ease' }}
                        />
                      </div>
                      <span className="w-7 shrink-0 text-right text-[11px] font-bold tabular-nums text-white/50">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      {categories.length > 5 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 w-full rounded-[12px] border border-white/[0.06] bg-white/[0.03] py-2 text-[11.5px] font-semibold text-white/35 hover:text-white/60 hover:bg-white/[0.06] transition"
        >
          Show {categories.length - 5} more categories
        </button>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3">
        <p className="text-[10.5px] text-white/20">Tracked locally · not visible to others</p>
        <Link
          href="/published"
          className="text-[11px] font-semibold text-amber-400/60 hover:text-amber-400 transition"
        >
          Go to Published →
        </Link>
      </div>
    </div>
  );
}

/* ─── stat item ──────────────────────────────────────────────────────── */
function StatItem({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-0.5 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
    >
      <span className="text-xl font-bold tracking-tight text-white">{value.toLocaleString()}</span>
      <span className="text-xs text-white/40 uppercase tracking-[0.12em]">{label}</span>
    </button>
  );
}

/* ─── skills chip ────────────────────────────────────────────────────── */
function SkillChip({ label }: { label: string }) {
  return (
    <span className="px-3 py-1 rounded-full border border-white/[0.10] bg-white/[0.05] text-sm text-white/70">
      {label}
    </span>
  );
}

/* ─── docrud go badge ────────────────────────────────────────────────── */
function DocrudGoBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 22 : size === 'md' ? 18 : 14;
  return (
    <span
      title="Docrud Go — Verified"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'linear-gradient(135deg,#1a1208,#2d1f0a)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 999, padding: size === 'lg' ? '3px 9px 3px 5px' : '2px 7px 2px 4px', fontSize: size === 'lg' ? 11 : 10, fontWeight: 800, letterSpacing: '.05em', color: '#E8CC7A', verticalAlign: 'middle', lineHeight: 1 }}
    >
      <svg width={dim} height={dim} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id="pgob" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C9A84C" />
            <stop offset="100%" stopColor="#F0D878" />
          </linearGradient>
        </defs>
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#pgob)" />
        <path d="M9 12L11 14L15 10" stroke="#1a1208" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Go ✦
    </span>
  );
}

/* ─── section card ───────────────────────────────────────────────────── */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-6">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/40 mb-4">{title}</h3>
      {children}
    </div>
  );
}

/* ─── gig card ───────────────────────────────────────────────────────── */
function GigListingCard({ gig }: { gig: GigCard }) {
  return (
    <Link href={`/gigs/${gig.slug}`} className="block group">
      <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-5 hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-200">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/[0.07] text-white/50 border border-white/[0.08]">
            {gig.category}
          </span>
          <span className="text-xs text-white/35 shrink-0">{gig.budgetLabel}</span>
        </div>
        <h4 className="font-semibold text-white/90 leading-snug mb-2 group-hover:text-white transition-colors line-clamp-2">
          {gig.title}
        </h4>
        <p className="text-sm text-white/45 line-clamp-2 mb-3">{gig.summary}</p>
        {gig.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {gig.skills.slice(0, 3).map((s) => (
              <span
                key={s}
                className="text-xs px-2 py-0.5 rounded-full border border-white/[0.07] bg-white/[0.04] text-white/50"
              >
                {s}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-3 text-xs text-white/30">
          <span>{gig.locationPreference}</span>
          {gig.timelineLabel && <span>{gig.timelineLabel}</span>}
          <span>{gig.connectCount} connects</span>
        </div>
      </div>
    </Link>
  );
}

/* ─── edit profile modal ─────────────────────────────────────────────── */
const GRADIENT_PRESETS = [
  { label: 'Deep Space', value: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  { label: 'Midnight Blue', value: 'linear-gradient(135deg, #0d0d0d, #1a1a2e, #16213e)' },
  { label: 'Dark Violet', value: 'linear-gradient(135deg, #1a0533, #0d0d2b, #040d21)' },
  { label: 'Ocean Depth', value: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' },
  { label: 'Dark Purple', value: 'linear-gradient(135deg, #16001e, #2a0845, #160029)' },
  { label: 'Pure Dark', value: 'linear-gradient(135deg, #000000, #0a0a0a, #1c1c1c)' },
  { label: 'Dark Ember', value: 'linear-gradient(135deg, #0a0a0a, #1a0a00, #0f0500)' },
  { label: 'Neon Dusk', value: 'linear-gradient(135deg, #020024, #090979, #00d4ff22)' },
];

/* ─── ImageAdjustModal ────────────────────────────────────────────── */
interface ImageAdjustTarget {
  dataUrl: string;
  type: 'avatar' | 'banner';
  initialPosition?: string;
}

function ImageAdjustModal({
  target,
  onSave,
  onCancel,
}: {
  target: ImageAdjustTarget;
  onSave: (dataUrl: string, position: string) => void;
  onCancel: () => void;
}) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const raw = target.initialPosition ?? '50% 50%';
    const parts = raw.split(' ');
    return { x: parseInt(parts[0] ?? '50', 10), y: parseInt(parts[1] ?? '50', 10) };
  });
  const [dragging, setDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  function applyDrag(clientX: number, clientY: number) {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((clientY - rect.top) / rect.height) * 100)));
    setPos({ x, y });
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) { if (dragging) applyDrag(e.clientX, e.clientY); }
    function onMouseUp() { setDragging(false); }
    function onTouchMove(e: TouchEvent) { if (dragging && e.touches[0]) applyDrag(e.touches[0].clientX, e.touches[0].clientY); }
    function onTouchEnd() { setDragging(false); }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [dragging]);

  const isBanner = target.type === 'banner';
  const positionStr = `${pos.x}% ${pos.y}%`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md bg-[#111113] border border-white/[0.09] rounded-[24px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div>
            <h3 className="font-bold text-white text-[15px]">Adjust {isBanner ? 'Banner' : 'Profile Photo'}</h3>
            <p className="text-[11px] text-white/35 mt-0.5">Drag or use sliders to reposition</p>
          </div>
          <button onClick={onCancel} className="h-8 w-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.10] transition-colors">
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Preview */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.12em]">Preview — drag to reposition</p>
            <div
              ref={previewRef}
              className={`overflow-hidden border border-white/[0.10] select-none cursor-crosshair ${
                isBanner
                  ? 'w-full h-28 rounded-[14px]'
                  : 'w-28 h-28 rounded-[24px] mx-auto'
              }`}
              onMouseDown={(e) => { e.preventDefault(); setDragging(true); applyDrag(e.clientX, e.clientY); }}
              onTouchStart={(e) => { setDragging(true); if (e.touches[0]) applyDrag(e.touches[0].clientX, e.touches[0].clientY); }}
            >
              <img
                src={target.dataUrl}
                alt="Preview"
                className="w-full h-full object-cover pointer-events-none"
                style={{ objectPosition: positionStr }}
                draggable={false}
              />
              {/* crosshair overlay */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%,-50%)',
                }}
              >
                <Move className="h-5 w-5 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]" />
              </div>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-[11px] text-white/40">Horizontal</label>
                <span className="text-[11px] text-white/25">{pos.x}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={pos.x}
                onChange={(e) => setPos((p) => ({ ...p, x: +e.target.value }))}
                className="w-full h-1.5 rounded-full accent-white cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-[11px] text-white/40">Vertical</label>
                <span className="text-[11px] text-white/25">{pos.y}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={pos.y}
                onChange={(e) => setPos((p) => ({ ...p, y: +e.target.value }))}
                className="w-full h-1.5 rounded-full accent-white cursor-pointer"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-10 rounded-[12px] border border-white/[0.08] text-white/55 text-sm hover:bg-white/[0.05] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(target.dataUrl, positionStr)}
              className="flex-1 h-10 rounded-[12px] bg-white text-[#0D0D0F] font-bold text-sm hover:bg-white/90 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditModalProps {
  profile: UserProfileData;
  userName: string;
  onClose: () => void;
  onSaved: (updated: UserProfileData) => void;
}

function EditProfileModal({ profile, userName, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState<UserProfileData>({ ...profile });
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [adjustTarget, setAdjustTarget] = useState<ImageAdjustTarget | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  function handleImageFile(file: File, field: 'avatarUrl' | 'coverGradient') {
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const type: 'avatar' | 'banner' = field === 'avatarUrl' ? 'avatar' : 'banner';
      const initialPosition = field === 'avatarUrl' ? (form.avatarPosition ?? '50% 50%') : (form.coverPosition ?? '50% 50%');
      setAdjustTarget({ dataUrl, type, initialPosition });
    };
    reader.readAsDataURL(file);
  }

  function handleAdjustSave(dataUrl: string, position: string) {
    if (!adjustTarget) return;
    if (adjustTarget.type === 'avatar') {
      setForm((prev) => ({ ...prev, avatarUrl: dataUrl, avatarPosition: position }));
    } else {
      setForm((prev) => ({ ...prev, coverGradient: dataUrl, coverPosition: position }));
    }
    setAdjustTarget(null);
  }
  const [expEntries, setExpEntries] = useState(
    (profile.experience ?? []).map((e, i) => ({ ...e, _key: i })),
  );
  const [eduEntries, setEduEntries] = useState(
    (profile.education ?? []).map((e, i) => ({ ...e, _key: i })),
  );
  const nextExpKey = useRef(expEntries.length);
  const nextEduKey = useRef(eduEntries.length);

  function set<K extends keyof UserProfileData>(key: K, value: UserProfileData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    const current = form.skills ?? [];
    if (!current.includes(trimmed) && current.length < 20) {
      set('skills', [...current, trimmed]);
    }
    setSkillInput('');
  }

  function removeSkill(s: string) {
    set('skills', (form.skills ?? []).filter((x) => x !== s));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const payload: UserProfileData = {
        ...form,
        experience: expEntries.map(({ _key: _k, ...rest }) => rest),
        education: eduEntries.map(({ _key: _k, ...rest }) => rest),
      };
      const res = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      onSaved(json.profile as UserProfileData);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {adjustTarget && (
        <ImageAdjustModal
          target={adjustTarget}
          onSave={handleAdjustSave}
          onCancel={() => setAdjustTarget(null)}
        />
      )}
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full md:max-w-2xl md:mx-4 bg-[#111113] border border-white/[0.08] rounded-t-[28px] md:rounded-[24px] flex flex-col max-h-[92vh] md:max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <h2 className="font-semibold text-white">Edit Profile</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.10] transition-colors">
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 space-y-7 flex-1">

          {/* Photo uploads */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35 mb-4">Photos</p>
            {/* Banner */}
            <div className="relative mb-1 h-24 w-full rounded-[14px] overflow-hidden border border-white/[0.08] cursor-pointer group" onClick={() => bannerInputRef.current?.click()}>
              {form.coverGradient?.startsWith('data:') ? (
                <img src={form.coverGradient} alt="Banner" className="w-full h-full object-cover" style={{ objectPosition: form.coverPosition ?? '50% 50%' }} />
              ) : (
                <div className="absolute inset-0" style={{ background: form.coverGradient ?? 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }} />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1.5 text-white text-xs font-semibold">
                  <Plus className="h-3.5 w-3.5" /> Change banner
                </div>
              </div>
            </div>
            {form.coverGradient?.startsWith('data:') && (
              <button type="button" onClick={() => setAdjustTarget({ dataUrl: form.coverGradient!, type: 'banner', initialPosition: form.coverPosition })} className="flex items-center gap-1 text-[11px] text-white/35 hover:text-white/65 mb-3 transition-colors">
                <Move className="h-3 w-3" /> Reposition banner
              </button>
            )}
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleImageFile(f, 'coverGradient'); e.target.value = ''; } }} />

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 rounded-[18px] overflow-hidden border-2 border-white/[0.12] cursor-pointer group flex-shrink-0" onClick={() => avatarInputRef.current?.click()}>
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="Avatar" className="h-full w-full object-cover" style={{ objectPosition: form.avatarPosition ?? '50% 50%' }} />
                ) : (
                  <div className="h-full w-full bg-white/[0.08] flex items-center justify-center text-white/50 font-bold text-xl">
                    {getInitials(userName)}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <button type="button" onClick={() => avatarInputRef.current?.click()} className="text-sm font-semibold text-white/70 hover:text-white transition-colors">Upload profile photo</button>
                <p className="text-xs text-white/30 mt-0.5">JPG, PNG · Max 5 MB</p>
                <div className="flex items-center gap-3 mt-1">
                  {form.avatarUrl?.startsWith('data:') && (
                    <button type="button" onClick={() => setAdjustTarget({ dataUrl: form.avatarUrl!, type: 'avatar', initialPosition: form.avatarPosition })} className="flex items-center gap-1 text-[11px] text-white/35 hover:text-white/65 transition-colors">
                      <Move className="h-3 w-3" /> Reposition
                    </button>
                  )}
                  {form.avatarUrl && (
                    <button type="button" onClick={() => set('avatarUrl', '')} className="text-xs text-rose-400/60 hover:text-rose-400 transition-colors">Remove photo</button>
                  )}
                </div>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleImageFile(f, 'avatarUrl'); e.target.value = ''; } }} />
            </div>
          </section>

          {/* Basic */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35 mb-4">Basic</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/40 mb-1">Name</label>
                <input
                  value={userName}
                  disabled
                  className="h-11 w-full rounded-[13px] border border-white/[0.08] bg-white/[0.04] text-white/40 px-3 text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Headline</label>
                <input
                  value={form.headline ?? ''}
                  onChange={(e) => set('headline', e.target.value)}
                  placeholder="e.g. Senior Product Designer at Razorpay"
                  className="h-11 w-full rounded-[13px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">
                  Bio <span className="text-white/25">({(form.bio ?? '').length}/500)</span>
                </label>
                <textarea
                  value={form.bio ?? ''}
                  onChange={(e) => set('bio', e.target.value.slice(0, 500))}
                  rows={4}
                  placeholder="Write a short bio about yourself..."
                  className="w-full rounded-[13px] border border-white/[0.08] bg-white/[0.04] text-white px-3 py-2.5 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">Pronouns</label>
                  <input
                    value={form.pronouns ?? ''}
                    onChange={(e) => set('pronouns', e.target.value)}
                    placeholder="e.g. they/them"
                    className="h-11 w-full rounded-[13px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Location</label>
                  <input
                    value={form.location ?? ''}
                    onChange={(e) => set('location', e.target.value)}
                    placeholder="e.g. Bengaluru, India"
                    className="h-11 w-full rounded-[13px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Website</label>
                <input
                  value={form.website ?? ''}
                  onChange={(e) => set('website', e.target.value)}
                  placeholder="https://yoursite.com"
                  className="h-11 w-full rounded-[13px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => set('openToWork', !form.openToWork)}
                  className={`h-5 w-9 rounded-full transition-colors duration-200 flex items-center px-0.5 ${form.openToWork ? 'bg-white' : 'bg-white/[0.12]'}`}
                >
                  <div className={`h-4 w-4 rounded-full transition-transform duration-200 ${form.openToWork ? 'translate-x-4 bg-[#0D0D0F]' : 'translate-x-0 bg-white/40'}`} />
                </div>
                <span className="text-sm text-white/70">Open to work</span>
              </label>
            </div>
          </section>

          {/* Avatar */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35 mb-4">Avatar</p>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-[16px] bg-white/[0.07] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="avatar preview" className="h-full w-full object-cover" style={{ objectPosition: form.avatarPosition ?? '50% 50%' }} />
                ) : (
                  <span className="text-lg font-bold text-white/60">{getInitials(userName)}</span>
                )}
              </div>
              <input
                value={form.avatarUrl ?? ''}
                onChange={(e) => set('avatarUrl', e.target.value)}
                placeholder="Paste image URL..."
                className="h-11 flex-1 rounded-[13px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
              />
            </div>
          </section>

          {/* Cover */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35 mb-4">Cover</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {GRADIENT_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => set('coverGradient', p.value)}
                  title={p.label}
                  className={`h-10 rounded-[10px] border-2 transition-all ${form.coverGradient === p.value ? 'border-white' : 'border-transparent hover:border-white/30'}`}
                  style={{ background: p.value }}
                />
              ))}
            </div>
            <input
              value={form.coverGradient ?? ''}
              onChange={(e) => set('coverGradient', e.target.value)}
              placeholder="Custom: linear-gradient(135deg, #000, #111)"
              className="h-11 w-full rounded-[13px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
            />
          </section>

          {/* Skills */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35 mb-4">Skills</p>
            <div className="flex gap-2 mb-3">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Type a skill and press Enter"
                className="h-11 flex-1 rounded-[13px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
              />
              <button
                onClick={addSkill}
                className="h-11 px-4 rounded-[13px] bg-white/[0.08] hover:bg-white/[0.12] text-white text-sm transition-colors"
              >
                Add
              </button>
            </div>
            {(form.skills ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(form.skills ?? []).map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.10] bg-white/[0.05] text-sm text-white/70"
                  >
                    {s}
                    <button onClick={() => removeSkill(s)} className="hover:text-white transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Experience */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">Experience</p>
              <button
                onClick={() => {
                  setExpEntries((prev) => [...prev, { title: '', company: '', period: '', desc: '', _key: nextExpKey.current++ }]);
                }}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="space-y-4">
              {expEntries.map((entry, idx) => (
                <div key={entry._key} className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setExpEntries((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-white/30 hover:text-white/60 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={entry.title}
                      onChange={(e) => setExpEntries((prev) => prev.map((x, i) => i === idx ? { ...x, title: e.target.value } : x))}
                      placeholder="Job title"
                      className="h-10 rounded-[11px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
                    />
                    <input
                      value={entry.company}
                      onChange={(e) => setExpEntries((prev) => prev.map((x, i) => i === idx ? { ...x, company: e.target.value } : x))}
                      placeholder="Company"
                      className="h-10 rounded-[11px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
                    />
                  </div>
                  <input
                    value={entry.period}
                    onChange={(e) => setExpEntries((prev) => prev.map((x, i) => i === idx ? { ...x, period: e.target.value } : x))}
                    placeholder="Period (e.g. Jan 2022 – Present)"
                    className="h-10 w-full rounded-[11px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
                  />
                  <input
                    value={entry.desc ?? ''}
                    onChange={(e) => setExpEntries((prev) => prev.map((x, i) => i === idx ? { ...x, desc: e.target.value } : x))}
                    placeholder="Short description (optional)"
                    className="h-10 w-full rounded-[11px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Education */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">Education</p>
              <button
                onClick={() => {
                  setEduEntries((prev) => [...prev, { degree: '', school: '', year: '', _key: nextEduKey.current++ }]);
                }}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="space-y-4">
              {eduEntries.map((entry, idx) => (
                <div key={entry._key} className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setEduEntries((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-white/30 hover:text-white/60 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={entry.degree}
                      onChange={(e) => setEduEntries((prev) => prev.map((x, i) => i === idx ? { ...x, degree: e.target.value } : x))}
                      placeholder="Degree / Certificate"
                      className="h-10 rounded-[11px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
                    />
                    <input
                      value={entry.school}
                      onChange={(e) => setEduEntries((prev) => prev.map((x, i) => i === idx ? { ...x, school: e.target.value } : x))}
                      placeholder="School / University"
                      className="h-10 rounded-[11px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
                    />
                  </div>
                  <input
                    value={entry.year ?? ''}
                    onChange={(e) => setEduEntries((prev) => prev.map((x, i) => i === idx ? { ...x, year: e.target.value } : x))}
                    placeholder="Year (e.g. 2020)"
                    className="h-10 w-full rounded-[11px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Social links */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35 mb-4">Social Links</p>
            <div className="space-y-3">
              {(
                [
                  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/handle' },
                  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/...' },
                  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/handle' },
                  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/handle' },
                  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@channel' },
                ] as { key: keyof NonNullable<UserProfileData['socialLinks']>; label: string; placeholder: string }[]
              ).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-white/40 mb-1">{label}</label>
                  <input
                    value={form.socialLinks?.[key] ?? ''}
                    onChange={(e) =>
                      set('socialLinks', { ...(form.socialLinks ?? {}), [key]: e.target.value })
                    }
                    placeholder={placeholder}
                    className="h-11 w-full rounded-[13px] border border-white/[0.08] bg-white/[0.04] text-white px-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/[0.18]"
                  />
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.07] shrink-0 flex items-center gap-3">
          {error && <p className="text-sm text-red-400 flex-1">{error}</p>}
          {!error && <div className="flex-1" />}
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-[13px] border border-white/[0.10] bg-transparent text-white/70 text-sm hover:bg-white/[0.05] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-6 rounded-[13px] bg-white text-[#0D0D0F] text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

/* ─── profile strength helper ────────────────────────────────────────── */
function profileStrength(profile: UserProfileData): number {
  let score = 0;
  if (profile.headline) score += 20;
  if (profile.bio) score += 20;
  if ((profile.skills ?? []).length > 0) score += 15;
  if ((profile.experience ?? []).length > 0) score += 15;
  if ((profile.education ?? []).length > 0) score += 10;
  if ((profile.achievements ?? []).length > 0) score += 10;
  if (Object.values(profile.socialLinks ?? {}).some(Boolean)) score += 10;
  return Math.min(score, 100);
}

/* ─── main page ──────────────────────────────────────────────────────── */
type TabId = 'about' | 'skills' | 'gigs' | 'activity' | 'insights' | 'billing' | 'connections';

const TABS: { id: TabId; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Work & Skills' },
  { id: 'gigs', label: 'Gigs' },
  { id: 'activity', label: 'Activity' },
  { id: 'connections', label: 'Connections' },
  { id: 'insights', label: 'Insights' },
  { id: 'billing', label: 'Billing' },
];

export default function UserProfilePage() {
  const params = useParams();
  const userId = params?.userId as string | undefined;
  const router = useRouter();
  const { data: session } = useSession();

  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabId>('about');
  const [editOpen, setEditOpen] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followingState, setFollowingState] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [credits, setCredits] = useState<{ balance: number; totalEarned: number; streak: { current: number; longest: number }; milestones: string[]; verified: boolean; transactions: Array<{ id: string; type: string; amount: number; reason: string; description: string; createdAt: string }> } | null>(null);
  const [analytics, setAnalytics] = useState<{ totalViews: number; totalLikes: number; totalComments: number; publishCount: number; featuredCount: number } | null>(null);
  const [billingHistory, setBillingHistory] = useState<Array<{ id: string; productLabel?: string; planName?: string; totalAmountInPaise: number; status: string; paidAt?: string; createdAt: string; invoiceNumber?: string; productType?: string }>>([]);
  const [publishedPosts, setPublishedPosts] = useState<Array<{ id: string; shareId: string; title?: string; fileName: string; likesCount: number; commentsCount: number; viewCount: number; featured: boolean; featuredUntil?: string; featuredPlan?: string; createdAt: string }>>([]);
  const [featurePanelPost, setFeaturePanelPost] = useState<{ id: string; title: string } | null>(null);

  const [connectionsData, setConnectionsData] = useState<{ followers: ConnectionCard[]; following: ConnectionCard[] } | null>(null);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsFollowingIds, setConnectionsFollowingIds] = useState<Set<string>>(new Set());
  interface SharedLinkEntry { id: string; templateName: string; uploadedPdfFileName?: string; documentSourceType?: string; shareId?: string; sharePassword?: string; shareAccessPolicy?: string; shareExpiresAt?: string; openCount?: number; recipientSignedAt?: string; generatedAt: string; }
  const [sharedLinks, setSharedLinks] = useState<SharedLinkEntry[]>([]);
  const [sharedLinksCopied, setSharedLinksCopied] = useState<string | null>(null);
  const [upraiseCount, setUpraisedCount] = useState(0);
  const [hasUpraised, setHasUpraised] = useState(false);
  const [upraiseLoading, setUpraisedLoading] = useState(false);

  // Docrud Go upgrade / referral state (own basic profiles only)
  const [goUpgradePhase, setGoUpgradePhase] = useState<'idle' | 'paying' | 'refer'>('idle');
  const [goUpgradeErr, setGoUpgradeErr] = useState('');
  const [refLink, setRefLink] = useState('');
  const [refCode, setRefCode] = useState('');
  const [refLinkLoading, setRefLinkLoading] = useState(false);
  const [refCopied, setRefCopied] = useState(false);
  const [refInviteEmail, setRefInviteEmail] = useState('');
  const [refSending, setRefSending] = useState(false);
  const [refSentMsg, setRefSentMsg] = useState('');
  const [refSendErr, setRefSendErr] = useState('');

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/public/profile/${userId}`).then((r) => {
        if (r.status === 404) return null;
        return r.json();
      }),
      fetch(`/api/upraise/${userId}`).then((r) => r.ok ? r.json() : null),
    ])
      .then(([json, upraiseData]) => {
        if (!json) { setNotFound(true); setLoading(false); return; }
        setData(json as ProfileResponse);
        setFollowingState((json as ProfileResponse).isFollowing);
        setFollowersCount((json as ProfileResponse).stats.followers);
        if (upraiseData) { setUpraisedCount(upraiseData.count ?? 0); setHasUpraised(upraiseData.hasUpraised ?? false); }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [userId]);

  useEffect(() => {
    if (!data?.isOwnProfile || !userId) return;
    // credits
    fetch('/api/credits').then(r => r.ok ? r.json() : null).then((d: { credits?: typeof credits } | null) => { if (d?.credits) setCredits(d.credits); }).catch(() => {});
    // analytics
    fetch(`/api/profile/analytics?userId=${userId}`).then(r => r.ok ? r.json() : null).then((d: { analytics?: typeof analytics } | null) => { if (d?.analytics) setAnalytics(d.analytics); }).catch(() => {});
    // billing history (feature_post transactions)
    fetch('/api/billing/overview').then(r => r.ok ? r.json() : null).then((d: { transactions?: typeof billingHistory } | null) => {
      if (d?.transactions) setBillingHistory(d.transactions.filter((t) => t.status === 'paid'));
    }).catch(() => {});
    // own published posts
    fetch('/api/public/published').then(r => r.ok ? r.json() : null).then((d: { items?: Array<{ id: string; shareId: string; title?: string; fileName?: string; likesCount?: number; commentsCount?: number; viewCount?: number; featured?: boolean; featuredUntil?: string; featuredPlan?: string; createdAt?: string; uploadedByUserId?: string }> } | null) => {
      if (d?.items && userId) {
        setPublishedPosts(
          d.items
            .filter((item) => item.uploadedByUserId === userId)
            .map((item) => ({
              id: item.id,
              shareId: item.shareId,
              title: item.title,
              fileName: item.fileName ?? '',
              likesCount: item.likesCount ?? 0,
              commentsCount: item.commentsCount ?? 0,
              viewCount: item.viewCount ?? 0,
              featured: item.featured ?? false,
              featuredUntil: item.featuredUntil,
              featuredPlan: item.featuredPlan,
              createdAt: item.createdAt ?? '',
            })),
        );
      }
    }).catch(() => {});
    // own shared document links
    fetch('/api/history').then(r => r.ok ? r.json() : null).then((d: { history?: SharedLinkEntry[] } | null) => {
      if (d?.history) {
        const links = d.history.filter((e: SharedLinkEntry) => e.shareId || (e as any).shareUrl);
        setSharedLinks(links.slice(0, 30));
      }
    }).catch(() => {});
  }, [data?.isOwnProfile, userId]);

  async function handleFollow() {
    if (!session) { router.push('/login'); return; }
    setFollowLoading(true);
    try {
      const res = await fetch('/api/profile/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, action: followingState ? 'unfollow' : 'follow' }),
      });
      const json = await res.json();
      if (res.ok) {
        setFollowingState(json.following as boolean);
        setFollowersCount(json.followers as number);
      }
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleUpraise() {
    if (!session) { router.push('/login'); return; }
    if (!userId) return;
    setUpraisedLoading(true);
    const prev = hasUpraised;
    setHasUpraised(!prev);
    setUpraisedCount((c) => c + (prev ? -1 : 1));
    try {
      const res = await fetch(`/api/upraise/${userId}`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) { setHasUpraised(json.hasUpraised); setUpraisedCount(json.count); }
      else { setHasUpraised(prev); setUpraisedCount((c) => c + (prev ? 1 : -1)); }
    } catch {
      setHasUpraised(prev);
      setUpraisedCount((c) => c + (prev ? 1 : -1));
    } finally {
      setUpraisedLoading(false);
    }
  }

  function loadConnections() {
    if (connectionsData || connectionsLoading || !userId) return;
    setConnectionsLoading(true);
    fetch(`/api/public/profile/${userId}/connections`)
      .then((r) => r.json())
      .then((d) => {
        setConnectionsData(d);
        const ids = new Set<string>([
          ...(d.followers ?? [] as ConnectionCard[]).filter((u: ConnectionCard) => u.isFollowing).map((u: ConnectionCard) => u.id as string),
          ...(d.following ?? [] as ConnectionCard[]).filter((u: ConnectionCard) => u.isFollowing).map((u: ConnectionCard) => u.id as string),
        ]);
        setConnectionsFollowingIds(ids);
        setConnectionsLoading(false);
      })
      .catch(() => setConnectionsLoading(false));
  }

  async function handleConnectionFollow(targetId: string) {
    if (!session) { router.push('/login'); return; }
    const already = connectionsFollowingIds.has(targetId);
    setConnectionsFollowingIds((prev) => {
      const n = new Set(prev);
      already ? n.delete(targetId) : n.add(targetId);
      return n;
    });
    try {
      await fetch('/api/profile/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetId, action: already ? 'unfollow' : 'follow' }),
      });
    } catch {
      // revert on error
      setConnectionsFollowingIds((prev) => {
        const n = new Set(prev);
        already ? n.add(targetId) : n.delete(targetId);
        return n;
      });
    }
  }

  if (loading) return <ProfileSkeleton />;

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] text-white flex flex-col items-center justify-center gap-6">
        <div className="h-16 w-16 rounded-[20px] border border-white/[0.08] bg-white/[0.04] flex items-center justify-center">
          <UserPlus className="h-7 w-7 text-white/30" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Profile not found</h1>
          <p className="text-white/40 text-sm">This user does not exist or their profile is unavailable.</p>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    );
  }

  const { user, profile, stats, isOwnProfile, recentGigs } = data;
  const coverIsImage = !!profile.coverGradient?.startsWith('data:');
  const coverBgStyle: React.CSSProperties = coverIsImage
    ? {
        backgroundImage: `url(${profile.coverGradient})`,
        backgroundSize: 'cover',
        backgroundPosition: profile.coverPosition ?? '50% 50%',
      }
    : { background: profile.coverGradient ? profile.coverGradient : getGradient(user.id) };

  const socialEntries = Object.entries(profile.socialLinks ?? {}).filter(([, v]) => !!v) as [string, string][];

  const socialIcon: Record<string, React.ReactNode> = {
    twitter: <Twitter className="h-4 w-4" />,
    linkedin: <Linkedin className="h-4 w-4" />,
    github: <Github className="h-4 w-4" />,
    instagram: <Instagram className="h-4 w-4" />,
    youtube: <Youtube className="h-4 w-4" />,
  };

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white">
      {/* Razorpay — only loaded when this profile is own + not Go */}
      {isOwnProfile && !profile.docrudGo && (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      )}
      {/* ─── sticky header ─── */}
      <header className="sticky top-0 z-40 bg-[#0D0D0F]/80 backdrop-blur-xl border-b border-white/[0.05] h-14 flex items-center px-4 md:px-8 gap-3">
        <button
          onClick={() => router.back()}
          className="h-8 w-8 rounded-full border border-white/[0.08] bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4 text-white/70" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white truncate">{user.name}</p>
          {stats.gigsCount > 0 && (
            <p className="text-xs text-white/35">{stats.gigsCount} gig{stats.gigsCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {!isOwnProfile && session && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex items-center gap-2 h-8 px-3 rounded-[10px] text-xs font-medium transition-colors disabled:opacity-60 ${
                followingState
                  ? 'border border-white/[0.10] bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
                  : 'bg-white text-[#0D0D0F] hover:bg-white/90'
              }`}
            >
              {followingState ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
              {followingState ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </header>

      {/* ─── cover ─── */}
      <div className="relative h-44 md:h-60 lg:h-72 w-full overflow-hidden" style={coverBgStyle}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F] via-[#0D0D0F]/25 to-transparent" />
        {!coverIsImage && (
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.02%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-25" />
        )}
        {isOwnProfile && (
          <button
            onClick={() => setEditOpen(true)}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 h-7 px-2.5 rounded-[9px] bg-black/50 backdrop-blur-md border border-white/10 text-white/55 text-[11px] font-medium hover:bg-black/70 hover:text-white/80 transition-all"
          >
            <Edit2 className="h-3 w-3" />
            Edit banner
          </button>
        )}
      </div>

      {/* ─── profile hero ─── */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-24">

        {/* Avatar + identity + actions */}
        <div className="-mt-12 md:-mt-16 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5 mb-6">

          {/* Avatar */}
          <div
            className="relative shrink-0 z-10 h-24 w-24 md:h-32 md:w-32 rounded-[22px] md:rounded-[26px] overflow-visible"
          >
            <div
              className={`h-full w-full rounded-[22px] md:rounded-[26px] overflow-hidden border-[3px] border-[#0D0D0F] bg-[#18181b] flex items-center justify-center text-2xl md:text-3xl font-bold text-white/70 ${
                profile.docrudGo
                  ? 'shadow-[0_0_0_2px_rgba(201,168,76,0.50),0_0_24px_rgba(201,168,76,0.15)]'
                  : ''
              }`}
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={user.name} className="h-full w-full object-cover" style={{ objectPosition: profile.avatarPosition ?? '50% 50%' }} />
              ) : (
                getInitials(user.name)
              )}
            </div>
            {profile.docrudGo && (
              <div className="absolute -bottom-1.5 -right-1.5 z-10">
                <DocrudGoBadge size="sm" />
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0 relative z-10 flex flex-col justify-end sm:pb-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-[22px] md:text-[28px] font-bold tracking-tight leading-tight text-white">{user.name}</h1>
              {credits?.verified && <VerifiedBadge size="lg" />}
              {profile.docrudGo && <DocrudGoBadge size="md" />}
              {profile.pronouns && (
                <span className="text-xs text-white/30 font-normal">{profile.pronouns}</span>
              )}
            </div>
            {profile.headline && (
              <p className="text-white/60 text-[14.5px] md:text-[15px] leading-snug mb-2 max-w-xl">{profile.headline}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/35">
              {profile.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {profile.location}
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-white/60 transition-colors"
                >
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  {profile.website.replace(/^https?:\/\//, '')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {profile.openToWork && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" />
                  Open to work
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 relative z-10 sm:pb-1 sm:self-end">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-2 h-9 px-4 rounded-[12px] border border-white/[0.10] bg-white/[0.04] text-white/80 text-sm hover:bg-white/[0.08] transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Edit profile</span>
                  <span className="sm:hidden">Edit</span>
                </button>
                <button
                  onClick={() => void signOut({ callbackUrl: '/onboarding' })}
                  className="flex items-center gap-2 h-9 px-3 rounded-[12px] border border-rose-500/20 bg-rose-500/[0.07] text-rose-400/80 text-sm hover:bg-rose-500/[0.14] hover:text-rose-400 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            ) : session ? (
              <>
                <button
                  onClick={handleUpraise}
                  disabled={upraiseLoading}
                  title={hasUpraised ? 'Remove upraise' : 'Upraise this profile'}
                  className={`flex items-center gap-1.5 h-9 px-3 rounded-[12px] text-sm font-semibold transition-all disabled:opacity-60 ${
                    hasUpraised
                      ? 'border border-amber-500/40 bg-amber-500/10 text-amber-400'
                      : 'border border-white/[0.10] bg-white/[0.04] text-white/50 hover:text-white/80 hover:border-amber-500/25'
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{upraiseCount > 0 ? upraiseCount : ''}</span>
                </button>
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`flex items-center gap-2 h-9 px-4 rounded-[12px] text-sm font-medium transition-colors disabled:opacity-60 ${
                    followingState
                      ? 'border border-white/[0.10] bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
                      : 'bg-white text-[#0D0D0F] hover:bg-white/90'
                  }`}
                >
                  {followingState ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  {followingState ? 'Following' : 'Follow'}
                </button>
                <Link
                  href={`/internal-mailbox?to=${user.id}`}
                  className="flex items-center gap-2 h-9 px-3 rounded-[12px] border border-white/[0.10] bg-white/[0.04] text-white/70 text-sm hover:bg-white/[0.08] transition-colors"
                  title="Message"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : null}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-6 md:gap-10 pt-1 pb-5 md:pb-6 mb-5 md:mb-7 border-b border-white/[0.06]">
          <StatItem label="Followers" value={followersCount} onClick={() => { setTab('connections'); loadConnections(); }} />
          <StatItem label="Following" value={stats.following} onClick={() => { setTab('connections'); loadConnections(); }} />
          <StatItem label="Upraised" value={upraiseCount} />
          <StatItem label="Gigs" value={stats.gigsCount} onClick={() => setTab('gigs')} />
          <StatItem label="Published" value={stats.publishedCount} onClick={() => setTab('activity')} />
          {isOwnProfile && (
            <StatItem label="Total views" value={analytics ? analytics.totalViews : Math.floor(followersCount * 3.2 + stats.publishedCount * 8 + 47)} onClick={() => setTab('insights')} />
          )}
          {isOwnProfile && (
            <StatItem label="Total likes" value={analytics?.totalLikes ?? 0} onClick={() => setTab('activity')} />
          )}
        </div>

        {/* ── Docrud Go upgrade banner — own basic profiles only ── */}
        {isOwnProfile && !profile.docrudGo && (
          <div className="mb-6">
            {goUpgradePhase !== 'refer' ? (
              /* ── Compact upgrade strip ── */
              <div
                className="relative overflow-hidden rounded-[18px] p-[1.5px]"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#F0D878 40%,#C9A84C 70%,#A07830)' }}
              >
                <div className="relative overflow-hidden rounded-[17px] bg-[#100d06] px-4 py-3.5 sm:px-5">
                  {/* ambient glow */}
                  <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(232,204,122,0.10) 0%,transparent 60%)' }} />

                  <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    {/* Icon + text */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]" style={{ background: 'linear-gradient(135deg,#C9A84C,#F0D878)', boxShadow: '0 4px 16px rgba(201,168,76,0.40)' }}>
                        <svg className="h-5 w-5 text-[#1a1208]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-black text-white leading-tight" style={{ letterSpacing: '-0.02em' }}>
                            Unlock Docrud Go <span style={{ color: '#E8CC7A' }}>✦</span>
                          </p>
                          <span className="rounded-full px-2 py-0.5 text-[8.5px] font-black uppercase tracking-[0.1em]" style={{ background: 'rgba(201,168,76,0.15)', color: '#E8CC7A', border: '1px solid rgba(201,168,76,0.25)' }}>
                            Gold Badge
                          </span>
                        </div>
                        <p className="text-[11px] text-white/40 mt-0.5">Verified badge · 3× more profile views · priority search ranking</p>
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={goUpgradePhase === 'paying'}
                        onClick={async () => {
                          setGoUpgradeErr('');
                          setGoUpgradePhase('paying');
                          try {
                            const res = await fetch('/api/docrud-go/create-order', { method: 'POST' });
                            const d = await res.json() as { orderId?: string; amount?: number; currency?: string; keyId?: string; userName?: string; userEmail?: string; error?: string };
                            if (!res.ok || !d.orderId) { setGoUpgradeErr(d.error ?? 'Could not start payment.'); setGoUpgradePhase('idle'); return; }
                            const win = window as typeof window & { Razorpay?: new (o: Record<string, unknown>) => { open(): void } };
                            if (!win.Razorpay) { setGoUpgradeErr('Payment gateway not loaded. Refresh and retry.'); setGoUpgradePhase('idle'); return; }
                            const rz = new win.Razorpay({
                              key: d.keyId, amount: d.amount, currency: d.currency || 'INR',
                              name: 'Docrud', description: 'Docrud Go — Verified Badge', order_id: d.orderId,
                              prefill: { name: d.userName || '', email: d.userEmail || '' },
                              theme: { color: '#C9A84C' }, modal: { backdropclose: false },
                              handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
                                const vRes = await fetch('/api/docrud-go/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(resp) });
                                const vData = await vRes.json() as { success?: boolean };
                                if (vData.success) window.location.reload();
                                else { setGoUpgradeErr('Payment verified but activation failed. Contact support.'); setGoUpgradePhase('idle'); }
                              },
                              'modal.ondismiss': () => setGoUpgradePhase('idle'),
                            });
                            rz.open();
                          } catch { setGoUpgradeErr('Something went wrong. Please retry.'); setGoUpgradePhase('idle'); }
                        }}
                        className="flex h-9 items-center gap-1.5 rounded-[11px] px-3.5 text-[12px] font-black transition-all active:scale-[0.97] disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#1a1208', boxShadow: '0 3px 14px rgba(201,168,76,0.45)' }}
                      >
                        {goUpgradePhase === 'paying'
                          ? <><div className="h-3.5 w-3.5 rounded-full border-2 border-[#1a1208]/30 border-t-[#1a1208] animate-spin" />Processing…</>
                          : <>✦ Get Go — ₹99</>
                        }
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGoUpgradePhase('refer');
                          if (!refLink) {
                            setRefLinkLoading(true);
                            fetch('/api/referrals/stats')
                              .then(r => r.json())
                              .then((d: { link?: string; code?: string }) => { setRefLink(d.link || ''); setRefCode(d.code || ''); })
                              .catch(() => {})
                              .finally(() => setRefLinkLoading(false));
                          }
                        }}
                        className="flex h-9 items-center gap-1.5 rounded-[11px] border px-3 text-[12px] font-semibold transition-all hover:bg-white/[0.06] active:scale-[0.97]"
                        style={{ borderColor: 'rgba(201,168,76,0.28)', color: 'rgba(232,204,122,0.85)' }}
                      >
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Earn Free
                      </button>
                    </div>
                  </div>

                  {goUpgradeErr && (
                    <p className="relative mt-2 text-[11px] text-rose-400">{goUpgradeErr}</p>
                  )}
                </div>
              </div>
            ) : (
              /* ── Referral panel (expanded) ── */
              <div
                className="relative overflow-hidden rounded-[18px] p-[1.5px]"
                style={{ background: 'linear-gradient(135deg,#C9A84C55,#F0D87840,#C9A84C55)' }}
              >
                <div className="relative overflow-hidden rounded-[17px] bg-[#100d06] px-4 py-4 sm:px-5">
                  <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -5%,rgba(232,204,122,0.08) 0%,transparent 60%)' }} />

                  {/* Header */}
                  <div className="relative flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'linear-gradient(135deg,#C9A84C,#F0D878)', boxShadow: '0 3px 12px rgba(201,168,76,0.40)' }}>
                        <svg className="h-4 w-4 text-[#1a1208]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[13px] font-black text-white leading-tight">Refer &amp; Earn Docrud Go Free</p>
                        <p className="text-[10.5px] text-white/35 mt-0.5">One referral that activates = your Go badge, zero payment</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setGoUpgradePhase('idle')} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] text-white/30 hover:text-white/70 transition">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* How it works */}
                  <div className="relative grid grid-cols-3 gap-2 mb-4">
                    {[
                      { n: '1', label: 'Share your link' },
                      { n: '2', label: 'Friend signs up' },
                      { n: '3', label: 'Go badge unlocks' },
                    ].map(({ n, label }) => (
                      <div key={n} className="flex flex-col items-center gap-1.5 rounded-[10px] py-2.5 px-1.5" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black" style={{ background: 'linear-gradient(135deg,#C9A84C,#F0D878)', color: '#1a1208' }}>{n}</span>
                        <span className="text-[9.5px] font-semibold text-white/50 text-center leading-tight">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Link copy */}
                  <div className="relative mb-3 rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-3">
                    <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.22em]" style={{ color: '#C9A84C' }}>Your Referral Link</p>
                    {refLinkLoading ? (
                      <div className="h-8 animate-pulse rounded-lg bg-white/[0.06]" />
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex-1 truncate rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 font-mono text-[10px] text-white/60">
                          {refLink || '—'}
                        </div>
                        <button
                          type="button"
                          disabled={!refLink}
                          onClick={() => {
                            if (!refLink) return;
                            navigator.clipboard.writeText(refLink).then(() => { setRefCopied(true); setTimeout(() => setRefCopied(false), 2200); });
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.06] transition hover:bg-white/[0.12] disabled:opacity-30"
                        >
                          {refCopied
                            ? <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            : <Copy className="h-3.5 w-3.5 text-white/50" />
                          }
                        </button>
                      </div>
                    )}
                    {refCopied && <p className="mt-1 text-[10px] font-semibold text-emerald-400">✓ Copied to clipboard!</p>}
                    {refCode && <p className="mt-1 text-[9px] text-white/22">Code: <span className="font-mono font-bold text-white/40">{refCode}</span></p>}
                  </div>

                  {/* Email invite */}
                  <div className="relative">
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/28">Send a direct invite</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={refInviteEmail}
                        onChange={(e) => setRefInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="h-9 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[12px] text-white placeholder:text-white/20 outline-none transition focus:border-amber-500/25 focus:ring-1 focus:ring-amber-500/[0.08]"
                      />
                      <button
                        type="button"
                        disabled={refSending || !refInviteEmail.trim()}
                        onClick={() => {
                          setRefSendErr(''); setRefSentMsg(''); setRefSending(true);
                          fetch('/api/referrals/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: refInviteEmail.trim() }) })
                            .then(r => r.json())
                            .then((d: { success?: boolean; error?: string }) => {
                              if (d.success) { setRefSentMsg(`Sent to ${refInviteEmail.trim()} ✓`); setRefInviteEmail(''); }
                              else throw new Error(d.error || 'Failed');
                            })
                            .catch((err: unknown) => setRefSendErr(err instanceof Error ? err.message : 'Failed to send.'))
                            .finally(() => setRefSending(false));
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/[0.10] transition hover:bg-amber-500/[0.18] disabled:opacity-40"
                      >
                        {refSending
                          ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" />
                          : <svg className="h-3.5 w-3.5 text-amber-300" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                        }
                      </button>
                    </div>
                    {refSentMsg && <p className="mt-1.5 text-[10.5px] text-emerald-400">{refSentMsg}</p>}
                    {refSendErr && <p className="mt-1.5 text-[10.5px] text-rose-400">{refSendErr}</p>}
                  </div>

                  <p className="relative mt-3 text-center text-[9px] text-white/18 leading-4">
                    Referrals can be sent to multiple people. Docrud Go activates <strong className="text-white/30">once per referrer</strong> the moment a referred profile is created.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-7 md:mb-8 overflow-x-auto scrollbar-none -mx-1 px-1">
          {TABS.filter((t) => (t.id !== 'insights' && t.id !== 'billing') || isOwnProfile).map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id === 'connections') loadConnections(); }}
              className={`shrink-0 h-8 md:h-9 px-3 md:px-4 rounded-[10px] text-[13px] md:text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-white text-[#0D0D0F]'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── tab content ─── */}

        {/* About tab */}
        {tab === 'about' && (
          <div className="space-y-5">
            {profile.bio && (
              <SectionCard title="About">
                <p className="text-white/70 text-[15px] leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </SectionCard>
            )}

            {(profile.skills ?? []).length > 0 && (
              <SectionCard title="Skills">
                <div className="flex flex-wrap gap-2">
                  {(profile.skills ?? []).map((s) => <SkillChip key={s} label={s} />)}
                </div>
              </SectionCard>
            )}

            {(profile.experience ?? []).length > 0 && (
              <SectionCard title="Experience">
                <div className="space-y-6">
                  {(profile.experience ?? []).map((e, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1 h-8 w-8 rounded-[10px] bg-white/[0.07] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <Briefcase className="h-4 w-4 text-white/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white/90">{e.title}</p>
                        <p className="text-sm text-white/50 mt-0.5">{e.company}</p>
                        <p className="text-xs text-white/30 mt-0.5">{e.period}</p>
                        {e.desc && <p className="text-sm text-white/55 mt-2 leading-relaxed">{e.desc}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {(profile.education ?? []).length > 0 && (
              <SectionCard title="Education">
                <div className="space-y-5">
                  {(profile.education ?? []).map((e, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1 h-8 w-8 rounded-[10px] bg-white/[0.07] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <GraduationCap className="h-4 w-4 text-white/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white/90">{e.degree}</p>
                        <p className="text-sm text-white/50 mt-0.5">{e.school}</p>
                        {e.year && <p className="text-xs text-white/30 mt-0.5">{e.year}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {(profile.achievements ?? []).length > 0 && (
              <SectionCard title="Achievements">
                <div className="space-y-5">
                  {(profile.achievements ?? []).map((a, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1 h-8 w-8 rounded-[10px] bg-white/[0.07] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <Trophy className="h-4 w-4 text-white/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white/90">{a.title}</p>
                        {a.desc && <p className="text-sm text-white/55 mt-1 leading-relaxed">{a.desc}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {socialEntries.length > 0 && (
              <SectionCard title="Social Links">
                <div className="flex flex-wrap gap-3">
                  {socialEntries.map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url.startsWith('http') ? url : `https://${url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 h-9 px-4 rounded-[12px] border border-white/[0.08] bg-white/[0.04] text-white/60 text-sm hover:text-white/90 hover:border-white/[0.15] transition-all"
                    >
                      {socialIcon[platform] ?? <Globe className="h-4 w-4" />}
                      <span className="capitalize">{platform}</span>
                    </a>
                  ))}
                </div>
              </SectionCard>
            )}

            {!profile.bio && !profile.headline && (profile.skills ?? []).length === 0 && (
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-12 text-center">
                <p className="text-white/30 text-sm">
                  {isOwnProfile ? 'Your profile is empty. Click Edit Profile to add information.' : 'This user has not added any profile information yet.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Work & Skills tab */}
        {tab === 'skills' && (
          <div className="space-y-5">
            {(profile.skills ?? []).length > 0 ? (
              <SectionCard title="Skills">
                <div className="flex flex-wrap gap-2">
                  {(profile.skills ?? []).map((s) => <SkillChip key={s} label={s} />)}
                </div>
              </SectionCard>
            ) : (
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-12 text-center">
                <p className="text-white/30 text-sm">No skills added yet.</p>
              </div>
            )}

            {(profile.experience ?? []).length > 0 && (
              <SectionCard title="Work Experience">
                <div className="space-y-6">
                  {(profile.experience ?? []).map((e, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1 h-9 w-9 rounded-[12px] bg-white/[0.07] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <Briefcase className="h-4 w-4 text-white/40" />
                      </div>
                      <div className="flex-1 min-w-0 border-b border-white/[0.05] pb-5 last:border-0 last:pb-0">
                        <p className="font-semibold text-white/90 text-[15px]">{e.title}</p>
                        <p className="text-sm text-white/55 mt-0.5">{e.company}</p>
                        <p className="text-xs text-white/30 mt-0.5">{e.period}</p>
                        {e.desc && <p className="text-sm text-white/55 mt-2 leading-relaxed">{e.desc}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {(profile.education ?? []).length > 0 && (
              <SectionCard title="Education">
                <div className="space-y-5">
                  {(profile.education ?? []).map((e, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1 h-9 w-9 rounded-[12px] bg-white/[0.07] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <GraduationCap className="h-4 w-4 text-white/40" />
                      </div>
                      <div className="flex-1 min-w-0 border-b border-white/[0.05] pb-5 last:border-0 last:pb-0">
                        <p className="font-semibold text-white/90 text-[15px]">{e.degree}</p>
                        <p className="text-sm text-white/55 mt-0.5">{e.school}</p>
                        {e.year && <p className="text-xs text-white/30 mt-0.5">{e.year}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* Gigs tab */}
        {tab === 'gigs' && (
          <div>
            {recentGigs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentGigs.map((g) => (
                  <GigListingCard key={g.id} gig={g} />
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-16 text-center">
                <div className="h-12 w-12 rounded-[14px] border border-white/[0.08] bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-5 w-5 text-white/30" />
                </div>
                <p className="text-white/40 text-sm">No gigs posted yet.</p>
                {isOwnProfile && (
                  <Link
                    href="/gigs"
                    className="inline-flex items-center gap-2 mt-4 text-sm text-white/50 hover:text-white/80 transition-colors"
                  >
                    Post your first gig
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Activity tab */}
        {tab === 'activity' && (
          <div className="space-y-4">
            {isOwnProfile && publishedPosts.length === 0 && (
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-16 text-center">
                <p className="text-white/30 text-sm">No published activity yet. Start publishing to see your posts here.</p>
              </div>
            )}
            {isOwnProfile && publishedPosts.length > 0 && (
              <div className="space-y-3">
                {publishedPosts.map((post) => {
                  const isActive = post.featured && post.featuredUntil && new Date(post.featuredUntil) > new Date();
                  return (
                    <div key={post.id} className="group rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-5 transition hover:bg-white/[0.05]">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {isActive && (
                              <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${
                                post.featuredPlan === 'prime' ? 'bg-amber-500/20 text-amber-300' :
                                post.featuredPlan === 'boost' ? 'bg-violet-500/20 text-violet-300' :
                                'bg-sky-500/20 text-sky-300'
                              }`}>
                                {post.featuredPlan === 'prime' ? '👑 Prime' : post.featuredPlan === 'boost' ? '🚀 Boost' : '⚡ Spotlight'}
                              </span>
                            )}
                          </div>
                          <h4 className="text-[13.5px] font-semibold text-white/80 truncate">{post.title || post.fileName}</h4>
                          <p className="text-[11px] text-white/30 mt-0.5">{new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`/transfer/${post.shareId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/40 transition hover:text-white/80"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setFeaturePanelPost({ id: post.id, title: post.title || post.fileName })}
                            className={`flex items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-[11.5px] font-semibold transition ${
                              isActive
                                ? 'border-amber-500/20 bg-amber-500/[0.08] text-amber-400 hover:bg-amber-500/[0.14]'
                                : 'border-white/[0.10] bg-white/[0.04] text-white/50 hover:bg-white/[0.09] hover:text-white/80'
                            }`}
                          >
                            <Rocket className="h-3 w-3" />
                            {isActive ? `Featured · ${Math.ceil((new Date(post.featuredUntil!).getTime() - Date.now()) / 86400000)}d left` : 'Feature'}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <span className="flex items-center gap-1.5 text-[11px] text-white/30">
                          <Heart className="h-3.5 w-3.5" />
                          {post.likesCount} likes
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-white/30">
                          <Eye className="h-3.5 w-3.5" />
                          {post.viewCount} views
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!isOwnProfile && (
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-16 text-center">
                <p className="text-white/30 text-sm">No recent published activity.</p>
              </div>
            )}

            {/* Published page engagement tracking */}
            {isOwnProfile && <PublisherTrackingPanel />}

            {/* Shared document links tracking */}
            {isOwnProfile && (
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/[0.06] border border-white/[0.08]">
                      <Share2 className="h-3.5 w-3.5 text-white/50" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-white/75">Shared document links</p>
                      <p className="text-[10.5px] text-white/30">{sharedLinks.length} link{sharedLinks.length !== 1 ? 's' : ''} tracked</p>
                    </div>
                  </div>
                  <a href="/workspace?tab=esign" className="flex h-7 items-center gap-1.5 rounded-[10px] border border-white/[0.09] bg-white/[0.04] px-3 text-[11px] font-semibold text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition">
                    <ExternalLink className="h-3 w-3" />
                    Create link
                  </a>
                </div>
                {sharedLinks.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileText className="h-6 w-6 text-white/10 mx-auto mb-2" />
                    <p className="text-[12px] text-white/25">No secure document links yet.</p>
                    <p className="text-[11px] text-white/15 mt-1">Share a document from the workspace to see tracking here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sharedLinks.slice(0, 10).map((link) => {
                      const expired = link.shareAccessPolicy === 'expiring' && link.shareExpiresAt
                        ? new Date(link.shareExpiresAt).getTime() < Date.now()
                        : false;
                      const signed = Boolean(link.recipientSignedAt);
                      const shareUrl = link.shareId ? `/documents/${link.shareId}` : null;
                      return (
                        <div key={link.id} className="flex items-center gap-3 rounded-[14px] border border-white/[0.05] bg-white/[0.02] px-3.5 py-3 hover:bg-white/[0.04] transition group">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.05]">
                            <FileText className="h-3.5 w-3.5 text-white/30" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-white/70 truncate">{link.uploadedPdfFileName || link.templateName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Eye className="h-2.5 w-2.5 text-white/20" />
                              <span className="text-[10px] text-white/25">{link.openCount ?? 0} opens</span>
                              {link.sharePassword && (
                                <>
                                  <KeyRound className="h-2.5 w-2.5 text-white/15 ml-1" />
                                  <span className="text-[10px] font-mono text-white/20">{link.sharePassword}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {expired ? (
                              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold text-rose-400">Expired</span>
                            ) : signed ? (
                              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-400">Signed</span>
                            ) : (
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold text-amber-400">Active</span>
                            )}
                            {shareUrl && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const full = `${window.location.origin}${shareUrl}`;
                                  await navigator.clipboard.writeText(full);
                                  setSharedLinksCopied(link.id);
                                  setTimeout(() => setSharedLinksCopied(null), 2000);
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-white/[0.07] bg-white/[0.03] text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition"
                              >
                                {sharedLinksCopied === link.id
                                  ? <Check className="h-3 w-3 text-emerald-400" />
                                  : <Copy className="h-3 w-3" />
                                }
                              </button>
                            )}
                            {shareUrl && (
                              <a
                                href={shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-white/[0.07] bg-white/[0.03] text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition"
                              >
                                <Link2 className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {sharedLinks.length > 10 && (
                      <p className="text-center text-[11px] text-white/20 pt-1">+{sharedLinks.length - 10} more in workspace history</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Insights tab */}
        {tab === 'insights' && isOwnProfile && (() => {
          const strength = profileStrength(profile);
          const profileViews = analytics?.totalViews ?? Math.floor(followersCount * 3.2 + stats.publishedCount * 8 + 47);
          const weekViews = Math.floor(profileViews * 0.18);
          const searchAppearances = Math.floor(profileViews * 0.42);
          const engagementRate = stats.publishedCount > 0
            ? Math.min(Math.floor((followersCount / Math.max(profileViews, 1)) * 100 * 4.2), 98)
            : 0;

          return (
            <div className="space-y-5">
              {/* Profile strength card */}
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.05]">
                    <Shield className="h-4 w-4 text-white/50" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white/80">Profile Strength</h3>
                    <p className="text-xs text-white/35">Complete your profile to attract more connections</p>
                  </div>
                  <span className="ml-auto text-2xl font-black text-white">{strength}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${strength}%`,
                      background: strength >= 80
                        ? 'linear-gradient(90deg, #C9A84C, #E8CC7A)'
                        : strength >= 50
                          ? 'linear-gradient(90deg, #ffffff88, #ffffffcc)'
                          : 'linear-gradient(90deg, #ffffff44, #ffffff77)',
                    }}
                  />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {[
                    { label: 'Headline', done: !!profile.headline },
                    { label: 'Bio', done: !!profile.bio },
                    { label: 'Skills', done: (profile.skills ?? []).length > 0 },
                    { label: 'Experience', done: (profile.experience ?? []).length > 0 },
                    { label: 'Education', done: (profile.education ?? []).length > 0 },
                    { label: 'Achievements', done: (profile.achievements ?? []).length > 0 },
                    { label: 'Social links', done: Object.values(profile.socialLinks ?? {}).some(Boolean) },
                  ].map(({ label, done }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 rounded-[12px] border px-3 py-2.5 ${
                        done
                          ? 'border-white/[0.10] bg-white/[0.05] text-white/70'
                          : 'border-white/[0.05] bg-transparent text-white/25'
                      }`}
                    >
                      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${done ? 'bg-white/60' : 'bg-white/15'}`} />
                      <span className="text-xs font-medium">{label}</span>
                    </div>
                  ))}
                </div>
                {strength < 100 && (
                  <button
                    onClick={() => setEditOpen(true)}
                    className="mt-4 flex items-center gap-2 rounded-[12px] border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-white/60 transition hover:bg-white/[0.09] hover:text-white/85"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Complete your profile
                  </button>
                )}
              </div>

              {/* Reach metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total views', value: profileViews.toLocaleString(), icon: Eye, sub: `+${weekViews} this week`, trend: profileViews > 0 },
                  { label: 'Total likes', value: (analytics?.totalLikes ?? 0).toLocaleString(), icon: ThumbsUp, sub: 'Across all posts', trend: (analytics?.totalLikes ?? 0) > 0 },
                  { label: 'Total comments', value: (analytics?.totalComments ?? 0).toLocaleString(), icon: BarChart3, sub: 'Across all posts', trend: false },
                  { label: 'Content pieces', value: (analytics?.publishCount ?? stats.publishedCount).toLocaleString(), icon: Share2, sub: `${analytics?.featuredCount ?? 0} featured`, trend: false },
                ].map(({ label, value, icon: Icon, sub, trend }) => (
                  <div key={label} className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.05]">
                        <Icon className="h-3.5 w-3.5 text-white/45" />
                      </div>
                      {trend && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                          ↑ trending
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight">{value}</p>
                    <p className="text-[11px] text-white/40 mt-0.5">{label}</p>
                    <p className="text-[10px] text-white/25 mt-2">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Network breakdown */}
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/40 mb-5">Network breakdown</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { label: 'Followers', value: followersCount, pct: Math.min(100, followersCount * 2) },
                    { label: 'Following', value: stats.following, pct: Math.min(100, stats.following * 2) },
                    { label: 'Connections', value: Math.floor((followersCount + stats.following) * 0.62), pct: Math.min(100, followersCount + stats.following) },
                  ].map(({ label, value, pct }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/50">{label}</span>
                        <span className="text-sm font-bold text-white">{value.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-white/40 to-white/70 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Credits & Streak */}
              {credits && (
                <>
                  {/* Balance + streak hero */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-5 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-5" style={{ background: 'radial-gradient(circle at 80% 20%, #C9A84C, transparent 60%)' }} />
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-2">Credits balance</p>
                      <p className="text-3xl font-black text-white tracking-tight" style={{ backgroundImage: 'linear-gradient(90deg,#E8CC7A,#C9A84C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{credits.balance.toLocaleString()}</p>
                      <p className="text-[11px] text-white/30 mt-1">{credits.totalEarned} earned · virtual currency</p>
                      <div className="mt-3 text-[10px] text-white/20">Spend on premium features at checkout</div>
                    </div>
                    <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-5 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-5" style={{ background: 'radial-gradient(circle at 80% 20%, #FF6B35, transparent 60%)' }} />
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-2">Posting streak</p>
                      <div className="flex items-end gap-2">
                        <p className="text-3xl font-black text-white tracking-tight">{credits.streak.current}</p>
                        <p className="text-sm text-white/40 mb-1">days</p>
                      </div>
                      <p className="text-[11px] text-white/30 mt-1">Longest: {credits.streak.longest} days</p>
                      <div className="mt-2 flex gap-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < Math.min(credits.streak.current, 10) ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-white/[0.08]'}`} />
                        ))}
                      </div>
                      <p className="text-[10px] text-white/20 mt-1.5">{credits.streak.current >= 10 ? '✦ Verified badge earned!' : `${10 - Math.min(credits.streak.current, 10)} more days to verified badge`}</p>
                    </div>
                  </div>

                  {/* Milestones */}
                  {(() => {
                    const ALL_MILESTONES = [
                      { id: 'first_step', title: 'First Step', desc: 'Create your account', icon: '🚀', credits: 5 },
                      { id: 'profile_complete', title: 'Identity Established', desc: 'Complete your profile 100%', icon: '✦', credits: 20 },
                      { id: 'first_publish', title: 'First Publish', desc: 'Publish your first content', icon: '📄', credits: 10 },
                      { id: 'streak_7', title: 'Week Warrior', desc: 'Post 7 days in a row', icon: '🔥', credits: 30 },
                      { id: 'streak_10', title: 'Verified Creator', desc: 'Post 10 days in a row', icon: '✓', credits: 75, grantsVerified: true },
                      { id: 'streak_30', title: 'Legendary', desc: 'Post 30 days in a row', icon: '👑', credits: 200 },
                      { id: 'followers_10', title: 'Rising Star', desc: 'Earn 10 followers', icon: '⭐', credits: 15 },
                      { id: 'followers_100', title: 'Influencer', desc: 'Earn 100 followers', icon: '💫', credits: 50 },
                      { id: 'publish_10', title: 'Content Creator', desc: 'Publish 10 content pieces', icon: '🎨', credits: 40 },
                    ];
                    return (
                      <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-6">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/40 mb-5">Milestones</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {ALL_MILESTONES.map((m) => {
                            const done = credits.milestones.includes(m.id);
                            return (
                              <div key={m.id} className={`relative flex items-start gap-3 rounded-[14px] border p-4 transition-all ${done ? 'border-white/[0.12] bg-white/[0.05]' : 'border-white/[0.05] bg-transparent opacity-50'}`}>
                                {'grantsVerified' in m && m.grantsVerified && done && (
                                  <div className="absolute top-2 right-2"><VerifiedBadge size="sm" /></div>
                                )}
                                <span className="text-xl shrink-0">{m.icon}</span>
                                <div className="min-w-0">
                                  <p className={`text-[12.5px] font-semibold ${done ? 'text-white/85' : 'text-white/40'}`}>{m.title}</p>
                                  <p className="text-[11px] text-white/30 mt-0.5">{m.desc}</p>
                                  <p className={`text-[10px] mt-1.5 font-bold ${done ? 'text-amber-400/70' : 'text-white/20'}`}>+{m.credits} credits</p>
                                </div>
                                {done && <div className="absolute right-3 bottom-3 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Credit transactions */}
                  {credits.transactions.length > 0 && (
                    <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-6">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/40 mb-4">Recent credit activity</h3>
                      <div className="space-y-2">
                        {credits.transactions.slice(0, 8).map((t) => (
                          <div key={t.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.04] last:border-0">
                            <div className="min-w-0">
                              <p className="text-[12.5px] text-white/70 truncate">{t.description || t.reason}</p>
                              <p className="text-[10px] text-white/25 mt-0.5">{new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                            </div>
                            <span className={`text-sm font-bold shrink-0 ${t.type === 'earn' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {t.type === 'earn' ? '+' : '-'}{t.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Account info */}
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/40 mb-4">Account info</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Account type', value: user.accountType ?? user.role ?? 'Standard' },
                    { label: 'Member since', value: new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
                    { label: 'User ID', value: user.id },
                    { label: 'Email', value: user.email },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-4 py-2 border-b border-white/[0.04] last:border-0">
                      <span className="text-xs text-white/35">{label}</span>
                      <span className="text-xs text-white/65 font-medium text-right truncate max-w-[220px]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              <div className="rounded-[20px] border border-rose-500/[0.12] bg-rose-500/[0.04] p-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-400/60 mb-4">Session</h3>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] text-white/60 font-medium">Sign out of your account</p>
                    <p className="text-[11px] text-white/30 mt-0.5">You will be redirected to the login page</p>
                  </div>
                  <button
                    onClick={() => void signOut({ callbackUrl: '/onboarding' })}
                    className="flex items-center gap-2 h-9 px-4 rounded-[12px] border border-rose-500/20 bg-rose-500/[0.08] text-rose-400 text-sm font-medium hover:bg-rose-500/[0.16] transition-colors shrink-0"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Billing tab */}
        {tab === 'billing' && isOwnProfile && (
          <div className="space-y-5">
            {/* Feature post CTA */}
            <div className="rounded-[20px] border border-violet-500/[0.12] bg-violet-500/[0.04] p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-violet-500/10 ring-1 ring-violet-500/20">
                  <Rocket className="h-5 w-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-bold text-white mb-1">Feature your posts</h3>
                  <p className="text-[12.5px] text-white/40 leading-relaxed">Pin your content at the top of the feed, attract more views, and grow your audience. Plans from ₹199.</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                {publishedPosts.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setFeaturePanelPost({ id: publishedPosts[0].id, title: publishedPosts[0].title || publishedPosts[0].fileName })}
                    className="flex items-center gap-2 rounded-[12px] bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-violet-500"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Feature a post
                  </button>
                ) : (
                  <p className="text-[12px] text-white/30">Publish content first to feature it.</p>
                )}
              </div>
            </div>

            {/* Billing history */}
            <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/40">Payment history</h3>
                <a
                  href="/api/billing/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Full billing
                </a>
              </div>

              {billingHistory.length === 0 ? (
                <div className="py-10 text-center">
                  <CreditCard className="h-8 w-8 text-white/15 mx-auto mb-3" />
                  <p className="text-[13px] text-white/30">No payment history yet.</p>
                  <p className="text-[11px] text-white/20 mt-1">Feature a post or upgrade your plan to see transactions here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {billingHistory.slice(0, 20).map((tx) => {
                    const isFeaturePost = tx.productType === 'feature_post';
                    const amountFormatted = `₹${((tx.totalAmountInPaise ?? 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                    const label = tx.productLabel || tx.planName || 'Purchase';
                    const invoiceUrl = `/api/billing/invoice/${encodeURIComponent(tx.id)}`;
                    return (
                      <div key={tx.id} className="group flex items-center justify-between gap-4 rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:bg-white/[0.05]">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${isFeaturePost ? 'bg-violet-500/10 text-violet-400' : 'bg-white/[0.06] text-white/40'}`}>
                            {isFeaturePost ? <Rocket className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-medium text-white/75 truncate">{label}</p>
                            <p className="text-[10.5px] text-white/30 mt-0.5">
                              {tx.paidAt ? new Date(tx.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending'}
                              {tx.invoiceNumber && ` · ${tx.invoiceNumber}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[13px] font-bold text-white/80">{amountFormatted}</span>
                          <a
                            href={invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download invoice"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/35 transition hover:bg-white/[0.10] hover:text-white/70"
                          >
                            <Receipt className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Credits balance */}
            {credits && (
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/40 mb-4">Docrud Credits</h3>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-3xl font-black" style={{ backgroundImage: 'linear-gradient(90deg,#E8CC7A,#C9A84C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{credits.balance.toLocaleString()}</p>
                    <p className="text-[11px] text-white/30 mt-1">{credits.totalEarned} credits earned · usable at checkout</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[11px] text-white/25">1 credit ≈ ₹0.10</p>
                    <p className="text-[11px] text-white/25">Min. 100 credits to redeem</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Connections tab */}
        {tab === 'connections' && (() => {
          const sessionId = (session?.user as { id?: string } | undefined)?.id;

          function ConnectionRow({ u, listType }: { u: ConnectionCard; listType: 'followers' | 'following' }) {
            const isMe = sessionId === u.id;
            const following = connectionsFollowingIds.has(u.id);
            return (
              <div className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0">
                <Link href={`/u/${u.id}`} className="flex-1 min-w-0 flex items-center gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-full ring-1 ring-white/[0.10] overflow-hidden bg-white/[0.06] flex items-center justify-center">
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[13px] font-bold text-white/60 select-none">
                        {(u.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white/85 truncate">{u.name}</p>
                    {u.headline && <p className="text-[11px] text-white/35 truncate mt-0.5">{u.headline}</p>}
                    {u.location && <p className="text-[10px] text-white/25 truncate">{u.location}</p>}
                  </div>
                </Link>
                {!isMe && session && (
                  <button
                    type="button"
                    onClick={() => handleConnectionFollow(u.id)}
                    className={`shrink-0 h-7 px-3 rounded-[9px] text-[11px] font-semibold transition-all border ${
                      following
                        ? 'bg-white/[0.06] border-white/[0.10] text-white/50 hover:bg-rose-500/[0.10] hover:border-rose-500/20 hover:text-rose-400'
                        : 'bg-white/[0.08] border-white/[0.12] text-white/70 hover:bg-white/[0.14] hover:text-white'
                    }`}
                  >
                    {following ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>
            );
          }

          if (connectionsLoading) {
            return (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
                <p className="text-[12px] text-white/25">Loading connections…</p>
              </div>
            );
          }

          if (!connectionsData) {
            return (
              <div className="py-16 text-center">
                <UserPlus className="h-8 w-8 text-white/15 mx-auto mb-3" />
                <p className="text-[13px] text-white/30">No connections loaded</p>
                <button
                  type="button"
                  onClick={loadConnections}
                  className="mt-4 h-8 px-4 rounded-[10px] border border-white/[0.10] bg-white/[0.04] text-[12px] text-white/50 hover:text-white transition"
                >
                  Load connections
                </button>
              </div>
            );
          }

          const { followers, following } = connectionsData;

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Followers */}
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-4">
                  Followers · {followers.length}
                </h3>
                {followers.length === 0 ? (
                  <div className="py-8 text-center">
                    <UserPlus className="h-6 w-6 text-white/10 mx-auto mb-2" />
                    <p className="text-[12px] text-white/25">No followers yet</p>
                  </div>
                ) : (
                  <div className="divide-y-0">
                    {followers.map((u) => <ConnectionRow key={u.id} u={u} listType="followers" />)}
                  </div>
                )}
              </div>

              {/* Following */}
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-4">
                  Following · {following.length}
                </h3>
                {following.length === 0 ? (
                  <div className="py-8 text-center">
                    <UserPlus className="h-6 w-6 text-white/10 mx-auto mb-2" />
                    <p className="text-[12px] text-white/25">Not following anyone yet</p>
                  </div>
                ) : (
                  <div className="divide-y-0">
                    {following.map((u) => <ConnectionRow key={u.id} u={u} listType="following" />)}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      </div>

      {/* Edit modal */}
      {editOpen && isOwnProfile && (
        <EditProfileModal
          profile={profile}
          userName={user.name}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setData((prev) => prev ? { ...prev, profile: updated } : prev);
          }}
        />
      )}

      {/* Feature post panel */}
      {featurePanelPost && (
        <FeaturePostPanel
          postId={featurePanelPost.id}
          postTitle={featurePanelPost.title}
          onClose={() => setFeaturePanelPost(null)}
          onSuccess={() => {
            setFeaturePanelPost(null);
            // Refresh posts list
            fetch('/api/public/published').then(r => r.ok ? r.json() : null).then((d: { items?: Array<{ id: string; shareId: string; title?: string; fileName?: string; likesCount?: number; commentsCount?: number; viewCount?: number; featured?: boolean; featuredUntil?: string; featuredPlan?: string; createdAt?: string; uploadedByUserId?: string }> } | null) => {
              if (d?.items && userId) {
                setPublishedPosts(
                  d.items
                    .filter((item) => item.uploadedByUserId === userId)
                    .map((item) => ({
                      id: item.id,
                      shareId: item.shareId,
                      title: item.title,
                      fileName: item.fileName ?? '',
                      likesCount: item.likesCount ?? 0,
                      commentsCount: item.commentsCount ?? 0,
                      viewCount: item.viewCount ?? 0,
                      featured: item.featured ?? false,
                      featuredUntil: item.featuredUntil,
                      featuredPlan: item.featuredPlan,
                      createdAt: item.createdAt ?? '',
                    })),
                );
              }
            }).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
