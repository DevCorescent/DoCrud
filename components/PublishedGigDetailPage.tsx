'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Check,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  Flag,
  Gavel,
  IndianRupee,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Twitter,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { GigListing } from '@/types/document';

/* ─── helpers ───────────────────────────────────────────────── */
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDeadline(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatBudget(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 0)}k`;
  return `₹${n}`;
}

function getShareUrl(gig: GigListing) {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/published/gig/${gig.slug}`;
}

const ENGAGEMENT_LABEL: Record<string, string> = {
  one_time: 'One-time project',
  ongoing:  'Ongoing work',
  retainer: 'Monthly retainer',
};
const ENGAGEMENT_CLS: Record<string, string> = {
  one_time: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ongoing:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
  retainer: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};
const LOCATION_LABEL: Record<string, string> = {
  remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site',
};
const LOCATION_CLS: Record<string, string> = {
  remote: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  hybrid: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  onsite: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};
const CAT_COLORS: Record<string, string> = {
  Design:      'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Engineering: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Content:     'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Marketing:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Strategy:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Automation:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Finance:     'bg-green-500/10 text-green-400 border-green-500/20',
};

/* ─── apply / bid panel ─────────────────────────────────────── */
type PanelMode = 'cta' | 'apply' | 'bid' | 'success' | 'authwall' | 'paywall';

function ApplyPanel({ gig, compact = false }: { gig: GigListing; compact?: boolean }) {
  const [mode, setMode]         = useState<PanelMode>('cta');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [note, setNote]         = useState('');
  const [bidAmt, setBidAmt]     = useState('');
  const [timeline, setTimeline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paywallInfo, setPaywallInfo] = useState<{ options?: { oneTime: { amountInPaise: number; label: string }; monthlyPass: { amountInPaise: number; label: string; credits: number } } } | null>(null);
  const isBidding = gig.bidMode === 'bidding';
  const minBid = gig.bidRules?.minBidInRupees ?? 0;

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !note.trim()) { setErrorMsg('Name, email, and note are required.'); return; }
    if (isBidding && (!bidAmt || Number(bidAmt) < minBid)) { setErrorMsg(`Minimum bid is ${formatBudget(minBid)}.`); return; }
    setSubmitting(true); setErrorMsg('');
    try {
      const endpoint = isBidding ? '/api/gigs/bids' : '/api/gigs/connect';
      const body = isBidding
        ? { gigId: gig.id, amountInRupees: Number(bidAmt), timelineLabel: timeline, note }
        : { gigId: gig.id, note, portfolioUrl: portfolio || undefined };
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.status === 401) { setMode('authwall'); return; }
      if (res.status === 402) {
        const data = await res.json();
        if (data.paywall) { setPaywallInfo(data); setMode('paywall'); return; }
        setErrorMsg(data.error ?? 'Plan upgrade required.'); return;
      }
      if (!res.ok) { const d = await res.json(); setErrorMsg(d.error ?? 'Something went wrong.'); return; }
      setMode('success');
    } catch { setErrorMsg('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  /* success */
  if (mode === 'success') {
    return (
      <div className={`rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-5 text-center ${compact ? '' : ''}`}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/15">
          <Check className="h-6 w-6 text-emerald-400" />
        </div>
        <p className="mt-3 text-[14px] font-bold text-white">{isBidding ? 'Bid placed!' : 'Proposal sent!'}</p>
        <p className="mt-1.5 text-[12px] text-white/50">
          {isBidding ? `Your bid of ${formatBudget(Number(bidAmt))} has been submitted. The client will review all bids.`
            : `Your proposal has been delivered to ${gig.ownerName}.`}
        </p>
        <button onClick={() => setMode('cta')} className="mt-4 text-xs font-medium text-white/30 hover:text-white/60 transition-colors">
          Done
        </button>
      </div>
    );
  }

  /* auth wall */
  if (mode === 'authwall') {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-white/25" />
        <p className="mt-3 text-[13px] font-bold text-white">Sign in to {isBidding ? 'bid' : 'apply'}</p>
        <p className="mt-1.5 text-[11.5px] text-white/40">Create a free account or sign in to connect with clients.</p>
        <div className="mt-4 flex flex-col gap-2">
          <Link href="/signup" className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-white/90">
            Create account
          </Link>
          <Link href="/login" className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white/60 transition hover:bg-white/[0.08] hover:text-white">
            Sign in
          </Link>
        </div>
        <button onClick={() => setMode('cta')} className="mt-3 text-[11px] text-white/25 hover:text-white/50 transition-colors">← Back</button>
      </div>
    );
  }

  /* paywall */
  if (mode === 'paywall') {
    const ot = paywallInfo?.options?.oneTime;
    const mp = paywallInfo?.options?.monthlyPass;
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-amber-400" />
          <p className="text-[12px] font-bold text-white">Gigs Connect required</p>
        </div>
        <p className="text-[11.5px] text-white/50 mb-4">Purchase a connect credit to send your proposal.</p>
        <div className="space-y-2">
          {ot && (
            <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
              <div>
                <p className="text-[12px] font-semibold text-white">{ot.label}</p>
                <p className="text-[10px] text-white/35">1 proposal</p>
              </div>
              <span className="text-[13px] font-bold text-white">₹{ot.amountInPaise / 100}</span>
            </div>
          )}
          {mp && (
            <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
              <div>
                <p className="text-[12px] font-semibold text-white">{mp.label}</p>
                <p className="text-[10px] text-white/35">{mp.credits} proposals / month</p>
              </div>
              <span className="text-[13px] font-bold text-white">₹{mp.amountInPaise / 100}</span>
            </div>
          )}
        </div>
        <p className="mt-3 text-[10px] text-white/25 text-center">Payments processed via Razorpay</p>
        <button onClick={() => setMode('cta')} className="mt-2 block text-[11px] text-white/25 hover:text-white/50 transition-colors text-center w-full">← Back</button>
      </div>
    );
  }

  /* apply / bid form */
  if (mode === 'apply' || mode === 'bid') {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[12px] font-bold text-white">{isBidding ? 'Place your bid' : 'Send a proposal'}</p>
          <button onClick={() => setMode('cta')} className="text-white/30 hover:text-white/70 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                className="h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.18]" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Email *</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email"
                className="h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.18]" />
            </div>
          </div>

          {isBidding && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                  Bid (₹) {minBid > 0 && <span className="text-white/20 normal-case">min {formatBudget(minBid)}</span>}
                </label>
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" />
                  <input value={bidAmt} onChange={e => setBidAmt(e.target.value)} placeholder="0" type="number" min={minBid}
                    className="h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-7 pr-3 text-[13px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.18]" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Timeline</label>
                <input value={timeline} onChange={e => setTimeline(e.target.value)} placeholder="e.g. 3 weeks"
                  className="h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.18]" />
              </div>
            </div>
          )}

          {!isBidding && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Portfolio URL</label>
              <input value={portfolio} onChange={e => setPortfolio(e.target.value)} placeholder="https://yourwork.com"
                className="h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.18]" />
            </div>
          )}

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
              {isBidding ? 'Why you? *' : 'Proposal note *'}
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder={isBidding ? 'Why should the client pick you? Share relevant experience...' : 'Briefly describe your approach and relevant experience...'}
              rows={4}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[13px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.18] focus:bg-white/[0.06]" />
          </div>

          {errorMsg && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-[11.5px] font-medium text-red-400 border border-red-500/20">{errorMsg}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[13px] font-bold text-slate-950 shadow-sm transition hover:bg-white/90 active:scale-[0.98] disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Sending…' : isBidding ? 'Place Bid' : 'Send Proposal'}
          </button>
          <p className="text-center text-[10px] text-white/20">Your contact info is shared only with this client.</p>
        </div>
      </div>
    );
  }

  /* CTA state */
  const isClosed = gig.status === 'closed';
  return (
    <div className={`rounded-2xl border ${isClosed ? 'border-white/[0.06]' : 'border-white/[0.10]'} bg-white/[0.03] overflow-hidden`}>
      {/* budget header */}
      <div className={`px-5 py-4 ${isBidding ? 'bg-gradient-to-r from-amber-500/[0.08] to-transparent' : 'bg-gradient-to-r from-teal-500/[0.07] to-transparent'}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">Budget</p>
            <p className="mt-1 text-[22px] font-bold tracking-tight text-white leading-none">{gig.budgetLabel}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {gig.urgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/20 px-2 py-0.5 text-[9.5px] font-bold text-orange-400">
                🔥 Urgent
              </span>
            )}
            {isBidding ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 text-[9.5px] font-bold text-amber-400">
                <Gavel className="h-2.5 w-2.5" /> Bidding
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-[9.5px] font-bold text-teal-400">
                Direct Apply
              </span>
            )}
          </div>
        </div>
        {gig.timelineLabel && (
          <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-white/45">
            <Clock className="h-3.5 w-3.5" />
            {gig.timelineLabel}
            <span className="text-white/20">·</span>
            <MapPin className="h-3.5 w-3.5" />
            {LOCATION_LABEL[gig.locationPreference] ?? gig.locationPreference}
          </div>
        )}
      </div>

      <div className="px-5 pb-5 pt-4 space-y-4">
        {/* bid rules */}
        {isBidding && gig.bidRules && (
          <div className="rounded-xl bg-white/[0.04] px-3.5 py-3 space-y-1.5">
            {gig.bidRules.minBidInRupees && (
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-white/40">Minimum bid</span>
                <span className="font-semibold text-white">{formatBudget(gig.bidRules.minBidInRupees)}</span>
              </div>
            )}
            {gig.bidRules.bidDeadlineAt && (
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-white/40">Bid deadline</span>
                <span className="font-semibold text-white">{formatDeadline(gig.bidRules.bidDeadlineAt)}</span>
              </div>
            )}
            {gig.bidRules.allowCounterOffer && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <Check className="h-3 w-3" /> Counter-offers accepted
              </div>
            )}
          </div>
        )}

        {/* connect count */}
        <div className="flex items-center gap-1.5 text-[11.5px] text-white/35">
          <Users className="h-3.5 w-3.5" />
          <span>{gig.connectCount} {isBidding ? 'bids' : 'proposals'} received</span>
        </div>

        {/* CTA button */}
        {isClosed ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-center text-sm text-white/30 font-medium">
            This gig is closed
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMode(isBidding ? 'bid' : 'apply')}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[13px] font-bold shadow-lg transition active:scale-[0.98] ${
              isBidding
                ? 'bg-amber-500 text-black hover:bg-amber-400'
                : 'bg-white text-slate-950 hover:bg-white/90'
            }`}
          >
            {isBidding ? (
              <><Gavel className="h-4 w-4" /> Place Your Bid</>
            ) : (
              <><Send className="h-4 w-4" /> Send Proposal</>
            )}
          </button>
        )}

        <p className="text-center text-[10px] text-white/20">
          {isBidding ? 'Client reviews all bids before selection' : `Preferred contact: ${gig.contactPreference}`}
        </p>
      </div>
    </div>
  );
}

/* ─── share sub-components ──────────────────────────────────── */
function ShareBtn({ icon: Icon, label, onClick, accent }: { icon: React.ElementType; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${accent ? 'bg-emerald-500/10 text-emerald-400' : 'text-white/55 hover:bg-white/[0.06] hover:text-white'}`}
    >
      <Icon className="h-4 w-4 shrink-0" /> {label}
    </button>
  );
}

function SideShareBtn({ icon: Icon, label, onClick, accent }: { icon: React.ElementType; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium transition ${accent ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-white/[0.07] bg-white/[0.03] text-white/50 hover:bg-white/[0.07] hover:text-white'}`}
    >
      <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{label}</span>
      <ArrowRight className="h-3 w-3 opacity-30" />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function PublishedGigDetailPage({ slug }: { slug: string }) {
  const [gig,        setGig]        = useState<GigListing | null>(null);
  const [related,    setRelated]    = useState<GigListing[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saved,      setSaved]      = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [embedCopied,setEmbedCopied]= useState(false);
  const [showShare,  setShowShare]  = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const sharePanelRef = useRef<HTMLDivElement>(null);

  /* fetch */
  useEffect(() => {
    fetch('/api/public/gigs')
      .then(r => r.ok ? r.json() : { gigs: [] })
      .then(({ gigs }: { gigs: GigListing[] }) => {
        const found = gigs.find(g => g.slug === slug) ?? null;
        setGig(found);
        setRelated(gigs.filter(g => g.slug !== slug && g.category === found?.category).slice(0, 4));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  /* saved state from localStorage */
  useEffect(() => {
    if (!gig) return;
    try {
      const ids = JSON.parse(localStorage.getItem('saved_gigs') || '[]') as string[];
      setSaved(ids.includes(gig.id));
    } catch {}
  }, [gig]);

  /* close share panel on outside click */
  useEffect(() => {
    if (!showShare) return;
    const h = (e: MouseEvent) => { if (sharePanelRef.current && !sharePanelRef.current.contains(e.target as Node)) setShowShare(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showShare]);

  const toggleSave = () => {
    if (!gig) return;
    try {
      const ids = JSON.parse(localStorage.getItem('saved_gigs') || '[]') as string[];
      const next = saved ? ids.filter(i => i !== gig.id) : [...ids, gig.id];
      localStorage.setItem('saved_gigs', JSON.stringify(next));
      setSaved(!saved);
    } catch {}
  };

  const copyLink = async () => {
    if (!gig) return;
    try { await navigator.clipboard.writeText(getShareUrl(gig)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const copyEmbed = async () => {
    if (!gig) return;
    const embed = `<iframe src="${getShareUrl(gig)}" width="100%" height="500" frameborder="0" title="${gig.title}"></iframe>`;
    try { await navigator.clipboard.writeText(embed); setEmbedCopied(true); setTimeout(() => setEmbedCopied(false), 2000); } catch {}
  };

  /* loading skeleton */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-white">
        <div className="h-14 border-b border-white/[0.06]" />
        <div className="px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20 py-10">
          <div className="grid gap-10 xl:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <div className="flex gap-2">{[60,80,50].map(w => <div key={w} className="h-6 animate-pulse rounded-full bg-white/[0.06]" style={{ width: w }} />)}</div>
              <div className="h-11 w-3/4 animate-pulse rounded-xl bg-white/[0.07]" />
              <div className="h-4 w-1/2 animate-pulse rounded-lg bg-white/[0.04]" />
              <div className="space-y-3 pt-2">{[1,2,3,4].map(i => <div key={i} className="h-4 animate-pulse rounded bg-white/[0.04]" style={{ width: `${92 - i * 5}%` }} />)}</div>
            </div>
            <div className="hidden xl:block space-y-4">{[1,2,3].map(i => <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/[0.04]" />)}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0C] text-white">
        <div className="text-center">
          <p className="text-base font-semibold">Gig not found</p>
          <Link href="/published" className="mt-3 inline-block text-sm text-white/40 hover:text-white underline">← Back to Published</Link>
        </div>
      </div>
    );
  }

  const shareUrl = getShareUrl(gig);
  const catCls   = CAT_COLORS[gig.category] ?? 'bg-teal-500/10 text-teal-400 border-teal-500/20';
  const engCls   = ENGAGEMENT_CLS[gig.engagementType] ?? 'bg-white/10 text-white/70 border-white/10';
  const locCls   = LOCATION_CLS[gig.locationPreference] ?? 'bg-white/10 text-white/70 border-white/10';
  const isClosed = gig.status === 'closed';

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white">

      {/* ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-teal-400/[0.04] blur-[160px]" />
        <div className="absolute right-0 top-1/2 h-[300px] w-[300px] rounded-full bg-amber-500/[0.04] blur-[130px]" />
      </div>

      {/* ── sticky header ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0A0A0C]/95 backdrop-blur-2xl">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
          <Link href="/published" className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/55 transition hover:bg-white/[0.09] hover:text-white" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <nav className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-[11.5px]">
            <Link href="/published" className="shrink-0 text-white/35 transition hover:text-white/70">Published</Link>
            <ChevronRight className="h-3 w-3 shrink-0 text-white/20" />
            <span className="shrink-0 text-white/35">Gigs</span>
            <ChevronRight className="h-3 w-3 shrink-0 text-white/20" />
            <span className="truncate font-medium text-white/55">{gig.title}</span>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleSave}
              className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
                saved ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.09] hover:text-white'
              }`}
            >
              {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
            </button>

            <div className="relative" ref={sharePanelRef}>
              <button
                type="button"
                onClick={() => setShowShare(s => !s)}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-semibold text-white/50 transition hover:bg-white/[0.09] hover:text-white"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>

              {showShare && (
                <div className="absolute right-0 top-10 z-50 w-68 rounded-2xl border border-white/[0.10] bg-[#111114] shadow-[0_24px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
                  <div className="border-b border-white/[0.07] px-4 py-3">
                    <p className="text-xs font-semibold text-white/70">Share this gig</p>
                    <p className="mt-0.5 truncate text-[10px] text-white/30">{shareUrl}</p>
                  </div>
                  <div className="space-y-0.5 p-2">
                    <ShareBtn icon={copied ? Check : Copy} label={copied ? 'Copied!' : 'Copy link'} accent={copied} onClick={copyLink} />
                    <ShareBtn icon={Twitter} label="Share on X / Twitter" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(gig.title)}&url=${encodeURIComponent(shareUrl)}`, '_blank')} />
                    <ShareBtn icon={ExternalLink} label="Share on LinkedIn" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')} />
                    <ShareBtn icon={Mail} label="Share via Email" onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(gig.title)}&body=${encodeURIComponent(`${gig.title}\n\n${shareUrl}`)}`; }} />
                    <div className="my-1 border-t border-white/[0.06]" />
                    <ShareBtn icon={embedCopied ? Check : Code2} label={embedCopied ? 'Embed copied!' : 'Copy embed code'} accent={embedCopied} onClick={copyEmbed} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── page body ── */}
      <div className="px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20 py-8 lg:py-12">
        <div className="grid gap-10 xl:grid-cols-[1fr_320px] 2xl:grid-cols-[1fr_360px]">

          {/* ════ LEFT ════ */}
          <article className="min-w-0">

            {/* badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${catCls}`}>
                <Zap className="h-3.5 w-3.5" />
                {gig.category}
              </span>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${engCls}`}>
                {ENGAGEMENT_LABEL[gig.engagementType] ?? gig.engagementType}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${locCls}`}>
                <MapPin className="h-3 w-3" />
                {LOCATION_LABEL[gig.locationPreference] ?? gig.locationPreference}
              </span>
              {gig.urgent && (
                <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-semibold text-orange-400">
                  🔥 Urgent
                </span>
              )}
              {gig.bidMode === 'bidding' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-400">
                  <Gavel className="h-3 w-3" /> Open to Bids
                </span>
              )}
              {isClosed && (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold text-red-400">
                  Closed
                </span>
              )}
            </div>

            {/* title */}
            <h1 className="mt-5 text-[1.75rem] font-bold leading-[1.2] tracking-[-0.03em] text-white sm:text-[2rem] lg:text-[2.25rem]">
              {gig.title}
            </h1>

            {/* byline + engagement */}
            <div className="mt-4 flex flex-col gap-3 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
                  {gig.ownerName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-white/80">{gig.ownerName}</p>
                  {gig.organizationName && <p className="text-[11px] text-white/35">{gig.organizationName}</p>}
                </div>
                <span className="text-white/20">·</span>
                <span className="text-[11px] text-white/30">{timeAgo(gig.createdAt)}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={copyLink} title="Copy link"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/25 transition hover:bg-white/[0.06] hover:text-white/55">
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Link2 className="h-4 w-4" />}
                </button>
                <button onClick={() => setReportOpen(true)} title="Report"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/25 transition hover:bg-white/[0.06] hover:text-white/55">
                  <Flag className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5 ml-2 text-[12px] text-white/35">
                  <Users className="h-3.5 w-3.5" />
                  <span className="tabular-nums">{gig.connectCount} {gig.bidMode === 'bidding' ? 'bids' : 'proposals'}</span>
                </div>
              </div>
            </div>

            {/* mobile: budget + apply panel */}
            <div className="mt-6 xl:hidden">
              <ApplyPanel gig={gig} compact />
            </div>

            {/* summary */}
            <div className="mt-7 space-y-5">
              {gig.summary.split('\n\n').filter(Boolean).map((para, i) => (
                <p key={i} className="text-[15px] leading-[1.85] text-white/70">{para}</p>
              ))}
            </div>

            {/* deliverables */}
            {gig.deliverables && gig.deliverables.length > 0 && (
              <div className="mt-9">
                <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-white/40">
                  <Sparkles className="h-3.5 w-3.5" />
                  Deliverables
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {gig.deliverables.map((d, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-teal-500/25 bg-teal-500/10">
                        <Check className="h-3 w-3 text-teal-400" />
                      </span>
                      <span className="text-[14px] text-white/70">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* skills */}
            {gig.skills && gig.skills.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.14em] text-white/40">Skills required</h2>
                <div className="flex flex-wrap gap-2">
                  {gig.skills.map(s => (
                    <span key={s} className="rounded-full border border-teal-500/20 bg-teal-500/[0.07] px-3 py-1.5 text-[12px] font-medium text-teal-300/80">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* interests */}
            {gig.interests && gig.interests.length > 0 && (
              <div className="mt-5">
                <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.14em] text-white/40">Related interests</h2>
                <div className="flex flex-wrap gap-2">
                  {gig.interests.map(t => (
                    <span key={t} className="rounded-full border border-white/[0.09] bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-white/50">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* timeline / bid rules info strip */}
            {(gig.timelineLabel || (gig.bidMode === 'bidding' && gig.bidRules)) && (
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gig.timelineLabel && (
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                    <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/30">
                      <Clock className="h-3 w-3" /> Timeline
                    </p>
                    <p className="mt-2 text-[14px] font-semibold text-white">{gig.timelineLabel}</p>
                  </div>
                )}
                {gig.bidMode === 'bidding' && gig.bidRules?.minBidInRupees && (
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                    <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/30">
                      <IndianRupee className="h-3 w-3" /> Min Bid
                    </p>
                    <p className="mt-2 text-[14px] font-semibold text-white">{formatBudget(gig.bidRules.minBidInRupees)}</p>
                  </div>
                )}
                {gig.bidMode === 'bidding' && gig.bidRules?.bidDeadlineAt && (
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                    <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/30">
                      <Briefcase className="h-3 w-3" /> Bid Deadline
                    </p>
                    <p className="mt-2 text-[14px] font-semibold text-white">{formatDeadline(gig.bidRules.bidDeadlineAt)}</p>
                  </div>
                )}
              </div>
            )}
          </article>

          {/* ════ RIGHT SIDEBAR ════ */}
          <aside className="hidden xl:block">
            <div className="sticky top-[57px] space-y-4">

              {/* ── apply / bid panel ── */}
              <ApplyPanel gig={gig} />

              {/* gig details */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Gig details</p>
                <div className="space-y-3">
                  {[
                    { label: 'Category',   val: gig.category },
                    { label: 'Engagement', val: ENGAGEMENT_LABEL[gig.engagementType] ?? gig.engagementType },
                    { label: 'Location',   val: LOCATION_LABEL[gig.locationPreference] ?? gig.locationPreference },
                    { label: 'Contact',    val: gig.contactPreference },
                    { label: 'Status',     val: isClosed ? 'Closed' : 'Accepting proposals' },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-[11.5px] text-white/35">{label}</span>
                      <span className="text-[11.5px] font-medium text-white/70 capitalize">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* share card */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Share</p>
                <div className="space-y-1.5">
                  <SideShareBtn icon={copied ? Check : Link2}      label={copied ? 'Copied!' : 'Copy link'} onClick={copyLink} accent={copied} />
                  <SideShareBtn icon={Twitter}      label="X / Twitter" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(gig.title)}&url=${encodeURIComponent(shareUrl)}`, '_blank')} />
                  <SideShareBtn icon={ExternalLink} label="LinkedIn"    onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')} />
                  <SideShareBtn icon={Mail}         label="Email"       onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(gig.title)}&body=${encodeURIComponent(`${gig.title}\n\n${shareUrl}`)}`; }} />
                  <SideShareBtn icon={embedCopied ? Check : Code2} label={embedCopied ? 'Embed copied!' : 'Embed'} onClick={copyEmbed} accent={embedCopied} />
                </div>
              </div>

              {/* posted by */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Posted by</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-[13px] font-bold text-white">
                    {gig.ownerName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white/80">{gig.ownerName}</p>
                    {gig.organizationName && <p className="text-[11px] text-white/35">{gig.organizationName}</p>}
                    <p className="text-[10px] text-white/25">Posted {timeAgo(gig.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* related */}
              {related.length > 0 && (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">More {gig.category} gigs</p>
                  <div className="space-y-2">
                    {related.map(r => (
                      <Link key={r.id} href={`/published/gig/${r.slug}`}
                        className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/[0.12] hover:bg-white/[0.05]">
                        <div>
                          <p className="text-[11px] font-semibold text-white/60 group-hover:text-white/85 transition-colors line-clamp-2">{r.title}</p>
                          <p className="mt-1 text-[10px] text-white/30">{r.budgetLabel} · {LOCATION_LABEL[r.locationPreference]}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link href="/published" className="mt-3 flex items-center gap-1 text-[11px] font-medium text-white/30 transition hover:text-white/60">
                    Browse all gigs <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* report modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setReportOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111114] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Report this gig</h3>
              <button onClick={() => setReportOpen(false)} className="text-white/30 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-1.5">
              {['Misleading or fraudulent','Spam or duplicate','Inappropriate content','Suspected scam','Other'].map(r => (
                <button key={r} type="button" onClick={() => setReportOpen(false)}
                  className="flex w-full items-center rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm text-white/55 transition hover:bg-white/[0.08] hover:text-white">
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
