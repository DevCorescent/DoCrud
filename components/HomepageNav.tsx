'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Bell,
  BriefcaseBusiness,
  Check,
  CreditCard,
  Eye,
  FileText,
  Globe,
  Heart,
  Mail,
  Menu,
  MessageCircle,
  PenLine,
  Plus,
  Search,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

interface WorkspaceNotification {
  id: string;
  type?: string;
  title: string;
  body: string;
  href?: string;
  ctaLabel?: string;
  tone?: 'default' | 'amber' | 'sky' | 'emerald' | 'rose';
  read: boolean;
  createdAt: string;
  actorName?: string;
  actorAvatar?: string;
  actorId?: string;
}

const TONE_RING: Record<NonNullable<WorkspaceNotification['tone']>, string> = {
  default: 'ring-white/20',
  amber:   'ring-amber-400/30',
  sky:     'ring-sky-400/30',
  emerald: 'ring-emerald-400/30',
  rose:    'ring-rose-400/30',
};

const ICON_BG: Record<NonNullable<WorkspaceNotification['tone']>, string> = {
  default: 'bg-white/[0.07]',
  amber:   'bg-amber-500/[0.12]',
  sky:     'bg-sky-500/[0.12]',
  emerald: 'bg-emerald-500/[0.12]',
  rose:    'bg-rose-500/[0.12]',
};

const ICON_COLOR: Record<NonNullable<WorkspaceNotification['tone']>, string> = {
  default: 'text-white/40',
  amber:   'text-amber-400',
  sky:     'text-sky-400',
  emerald: 'text-emerald-400',
  rose:    'text-rose-400',
};

function typeIcon(type?: string) {
  switch (type) {
    case 'follow':           return UserPlus;
    case 'profile_view':     return Eye;
    case 'like':             return Heart;
    case 'comment':          return MessageCircle;
    case 'mention':          return MessageCircle;
    case 'gig_applied':      return BriefcaseBusiness;
    case 'document_viewed':  return FileText;
    case 'mail':             return Mail;
    case 'billing':          return CreditCard;
    default:                 return Bell;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const SOCIAL_TYPES = new Set(['follow', 'profile_view', 'like', 'comment', 'mention', 'gig_applied', 'document_viewed']);

interface HomepageNavProps {
  softwareName: string;
  accentLabel?: string;
  onPublishClick?: () => void;
  onScratchpadClick?: () => void;
  onMobileMenuClick?: () => void;
  guestMode?: boolean;
}

export default function HomepageNav({
  softwareName,
  accentLabel,
  onPublishClick,
  onScratchpadClick,
  onMobileMenuClick,
  guestMode,
}: HomepageNavProps) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const [badge, setBadge] = useState<{ docrudGo: boolean; avatarUrl: string | null } | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json() as { notifications?: WorkspaceNotification[] };
      if (Array.isArray(data.notifications)) setNotifications(data.notifications);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || guestMode) return;
    fetch('/api/me/badge')
      .then((r) => r.ok ? r.json() : null)
      .then((d: { docrudGo?: boolean; avatarUrl?: string | null } | null) => {
        if (d) setBadge({ docrudGo: d.docrudGo ?? false, avatarUrl: d.avatarUrl ?? null });
      })
      .catch(() => {});
  }, [isAuthenticated, guestMode]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    function onVisible() { if (document.visibilityState === 'visible') fetchNotifications(); }
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markAllRead() {
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json() as { notifications?: WorkspaceNotification[] };
        if (Array.isArray(data.notifications)) setNotifications(data.notifications);
        else setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch { /* silent */ }
  }

  async function markOneRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
    } catch { /* silent */ }
  }

  return (
    <header className="shrink-0 h-14 border-b border-white/[0.05] bg-[#08090a]/90 backdrop-blur-[60px] flex items-center justify-between px-3 sm:px-4 z-30 relative shadow-[0_1px_0_rgba(255,255,255,0.04),0_4px_24px_rgba(0,0,0,0.35)]">

      {/* ── LEFT group: menu + logo ── */}
      <div className="flex items-center gap-2 min-w-0">
        {onMobileMenuClick && (
          <button
            type="button"
            onClick={onMobileMenuClick}
            className="lg:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.04] text-white/50 transition hover:bg-white/[0.09] hover:text-white active:scale-95"
          >
            <Menu className="h-[15px] w-[15px]" />
          </button>
        )}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-white/[0.10] text-[11px] font-black text-white ring-1 ring-white/[0.14] shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition group-hover:bg-white/[0.15]">
            {softwareName.charAt(0).toUpperCase()}
          </div>
          <span className="text-[13.5px] font-bold text-white/90 tracking-[-0.01em]">{softwareName}</span>
          {accentLabel && (
            <span className="hidden lg:block shrink-0 rounded-full border border-white/[0.10] bg-white/[0.04] px-2.5 py-[3px] text-[9.5px] font-semibold text-white/35 tracking-[0.02em]">{accentLabel}</span>
          )}
        </Link>
      </div>

      {/* ── CENTER: search bar (md+) ── */}
      <div className="mx-4 hidden md:flex flex-1 max-w-[380px] items-center gap-2 rounded-[10px] border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/35 transition hover:border-white/[0.14] hover:bg-white/[0.06] cursor-pointer">
        <Search className="h-3.5 w-3.5 shrink-0 text-white/25" />
        <span className="flex-1 select-none">Search for tools, people, feeds...</span>
        <kbd className="shrink-0 rounded-[5px] border border-white/[0.10] bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-white/25">⌘ K</kbd>
      </div>

      {/* ── RIGHT group: nav links + bell + avatar ── */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Desktop-only nav links */}
        {isAuthenticated && !guestMode && onPublishClick && (
          <button type="button" onClick={onPublishClick}
            className="hidden sm:inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-white/[0.12] bg-white/[0.08] px-3 text-[12px] font-semibold text-white/80 transition hover:bg-white/[0.14] hover:text-white active:scale-95 shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
            <Plus className="h-3 w-3" />Publish
          </button>
        )}
        {isAuthenticated && !guestMode && (
          <>
            <Link href="/gigs" className="hidden md:flex h-8 items-center gap-1.5 rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-3 text-[12px] font-medium text-white/50 transition hover:bg-white/[0.09] hover:text-white/75 active:scale-95">
              <BriefcaseBusiness className="h-3 w-3" />Gigs
            </Link>
            <Link href="/people" className="hidden md:flex h-8 items-center gap-1.5 rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-3 text-[12px] font-medium text-white/50 transition hover:bg-white/[0.09] hover:text-white/75 active:scale-95">
              <Users className="h-3 w-3" />People
            </Link>
          </>
        )}
        <Link href="/published" className="hidden sm:flex h-8 items-center gap-1.5 rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-3 text-[12px] font-medium text-white/50 transition hover:bg-white/[0.09] hover:text-white/75 active:scale-95">
          <Globe className="h-3 w-3" />Feed
        </Link>
        {onScratchpadClick && (
          <button type="button" onClick={onScratchpadClick}
            className="hidden sm:flex h-8 items-center gap-1.5 rounded-[10px] border border-violet-500/[0.22] bg-violet-500/[0.07] px-3 text-[12px] font-medium text-violet-300/75 transition hover:bg-violet-500/[0.14] hover:text-violet-200 active:scale-95"
            title="Open Scratchpad">
            <PenLine className="h-3 w-3" />Scratchpad
          </button>
        )}

        {/* Notification bell */}
        {isAuthenticated && (
          <div ref={notifRef} className="relative">
            {/* Bell button — circular, consistent on all sizes */}
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition active:scale-95 ${
                notifOpen
                  ? 'border-white/[0.18] bg-white/[0.10] text-white'
                  : 'border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.09] hover:text-white/80'
              }`}
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
              <Bell className={`h-[15px] w-[15px] transition-all ${unreadCount > 0 ? 'text-white/85' : ''}`} />
              {unreadCount > 0 && (
                <>
                  <span className="absolute -right-[2px] -top-[2px] h-[11px] w-[11px] rounded-full bg-rose-500/25 animate-ping" />
                  <span className="absolute -right-[2px] -top-[2px] flex h-[11px] w-[11px] items-center justify-center rounded-full bg-rose-500 text-[6.5px] font-black text-white shadow-[0_0_8px_rgba(239,68,68,0.75)]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </>
              )}
            </button>

            {/* Portal: renders directly into document.body — escapes header stacking context entirely */}
            {notifOpen && createPortal(
              <>
                {/* Backdrop */}
                <button
                  type="button"
                  aria-label="Close notifications"
                  className="notif-backdrop fixed inset-0 bg-black/75 backdrop-blur-[6px]"
                  style={{ zIndex: 2147483646 }}
                  onClick={() => setNotifOpen(false)}
                />

                {/* Panel */}
                <div
                  className="notif-panel fixed flex flex-col
                    bottom-0 left-0 right-0 rounded-t-[26px]
                    border-t border-l border-r border-white/[0.12]
                    shadow-[0_-4px_40px_rgba(0,0,0,1)]
                    sm:bottom-auto sm:left-auto sm:top-[57px] sm:right-4 sm:w-[390px] sm:rounded-[20px] sm:border sm:shadow-[0_8px_48px_rgba(0,0,0,0.92)]"
                  style={{ background: '#0c0c0f', maxHeight: '78svh', zIndex: 2147483647 }}
                >
                  {/* Drag handle — mobile only */}
                  <div className="shrink-0 flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="h-[5px] w-12 rounded-full bg-white/[0.15]" />
                  </div>

                  {/* Header */}
                  <div className="shrink-0 flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-white tracking-[-0.015em]">Notifications</p>
                      {unreadCount > 0 && (
                        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500/15 px-1.5 text-[9px] font-black text-rose-400 border border-rose-500/20 tabular-nums">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {notifications.some((n) => !n.read) && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void markAllRead(); }}
                          className="flex items-center gap-1 rounded-[8px] px-2 py-1 text-[11px] font-medium text-white/30 transition hover:bg-white/[0.07] hover:text-white/65 active:scale-95"
                        >
                          <Check className="h-3 w-3" />
                          Mark all read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/35 transition hover:bg-white/[0.10] hover:text-white"
                        aria-label="Close"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable body */}
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center px-6 py-12 gap-4">
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/[0.07] bg-white/[0.025]">
                          <Bell className="h-7 w-7 text-white/12" />
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1a1a1e] border border-white/[0.07]">
                            <Check className="h-3 w-3 text-white/25" />
                          </span>
                        </div>
                        <div className="text-center">
                          <p className="text-[14px] font-semibold text-white/35 tracking-[-0.01em]">You&apos;re all caught up</p>
                          <p className="mt-1 text-[12px] leading-relaxed text-white/20">
                            New activity from your network<br />will appear here.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="pb-2">
                        {notifications.filter((n) => n.type && SOCIAL_TYPES.has(n.type)).length > 0 && (
                          <>
                            <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
                              <span className="text-[9px] font-black uppercase tracking-[0.28em] text-white/20">Social</span>
                              <div className="flex-1 h-px bg-white/[0.05]" />
                            </div>
                            {notifications.filter((n) => n.type && SOCIAL_TYPES.has(n.type)).map((notif) => {
                              const tone = notif.tone || 'default';
                              const IconComp = typeIcon(notif.type);
                              const isSocial = notif.type && SOCIAL_TYPES.has(notif.type);
                              const inner = (
                                <div className={`group relative flex cursor-pointer items-start gap-3 border-b border-white/[0.04] px-4 py-3.5 transition-colors hover:bg-white/[0.03] active:bg-white/[0.05] ${notif.read ? '' : 'bg-white/[0.018]'}`}
                                  onClick={() => { if (!notif.read) markOneRead(notif.id); if (notif.href) setNotifOpen(false); }}>
                                  {!notif.read && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]" />}
                                  {isSocial && notif.actorId ? (
                                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 overflow-hidden ${TONE_RING[tone]}`}>
                                      {notif.actorAvatar
                                        // eslint-disable-next-line @next/next/no-img-element
                                        ? <img src={notif.actorAvatar} alt={notif.actorName || ''} className="h-full w-full object-cover" />
                                        : <span className="text-[13px] font-bold text-white/70 select-none bg-white/[0.07] w-full h-full flex items-center justify-center">{(notif.actorName || '?').charAt(0).toUpperCase()}</span>}
                                    </div>
                                  ) : (
                                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] ${ICON_BG[tone]}`}><IconComp className={`h-4 w-4 ${ICON_COLOR[tone]}`} /></div>
                                  )}
                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className={`text-[12.5px] font-semibold leading-snug ${notif.read ? 'text-white/45' : 'text-white/88'}`}>{notif.title}</p>
                                      <span className="shrink-0 text-[10px] text-white/22 mt-0.5 tabular-nums">{timeAgo(notif.createdAt)}</span>
                                    </div>
                                    <p className={`mt-0.5 text-[11.5px] leading-relaxed line-clamp-2 ${notif.read ? 'text-white/22' : 'text-white/48'}`}>{notif.body}</p>
                                    {notif.ctaLabel && notif.href && !notif.read && <span className={`mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-semibold ${ICON_COLOR[tone]}`}>{notif.ctaLabel} →</span>}
                                  </div>
                                </div>
                              );
                              return notif.href
                                ? <Link key={notif.id} href={notif.href} onClick={() => { setNotifOpen(false); if (!notif.read) markOneRead(notif.id); }}>{inner}</Link>
                                : <div key={notif.id}>{inner}</div>;
                            })}
                          </>
                        )}
                        {notifications.filter((n) => !n.type || !SOCIAL_TYPES.has(n.type)).length > 0 && (
                          <>
                            <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
                              <span className="text-[9px] font-black uppercase tracking-[0.28em] text-white/20">Workspace</span>
                              <div className="flex-1 h-px bg-white/[0.05]" />
                            </div>
                            {notifications.filter((n) => !n.type || !SOCIAL_TYPES.has(n.type)).map((notif) => {
                              const tone = notif.tone || 'default';
                              const IconComp = typeIcon(notif.type);
                              const isSocial = notif.type && SOCIAL_TYPES.has(notif.type);
                              const inner = (
                                <div className={`group relative flex cursor-pointer items-start gap-3 border-b border-white/[0.04] px-4 py-3.5 transition-colors hover:bg-white/[0.03] active:bg-white/[0.05] ${notif.read ? '' : 'bg-white/[0.018]'}`}
                                  onClick={() => { if (!notif.read) markOneRead(notif.id); if (notif.href) setNotifOpen(false); }}>
                                  {!notif.read && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]" />}
                                  {isSocial && notif.actorId ? (
                                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 overflow-hidden ${TONE_RING[tone]}`}>
                                      {notif.actorAvatar
                                        // eslint-disable-next-line @next/next/no-img-element
                                        ? <img src={notif.actorAvatar} alt={notif.actorName || ''} className="h-full w-full object-cover" />
                                        : <span className="text-[13px] font-bold text-white/70 select-none bg-white/[0.07] w-full h-full flex items-center justify-center">{(notif.actorName || '?').charAt(0).toUpperCase()}</span>}
                                    </div>
                                  ) : (
                                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] ${ICON_BG[tone]}`}><IconComp className={`h-4 w-4 ${ICON_COLOR[tone]}`} /></div>
                                  )}
                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className={`text-[12.5px] font-semibold leading-snug ${notif.read ? 'text-white/45' : 'text-white/88'}`}>{notif.title}</p>
                                      <span className="shrink-0 text-[10px] text-white/22 mt-0.5 tabular-nums">{timeAgo(notif.createdAt)}</span>
                                    </div>
                                    <p className={`mt-0.5 text-[11.5px] leading-relaxed line-clamp-2 ${notif.read ? 'text-white/22' : 'text-white/48'}`}>{notif.body}</p>
                                    {notif.ctaLabel && notif.href && !notif.read && <span className={`mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-semibold ${ICON_COLOR[tone]}`}>{notif.ctaLabel} →</span>}
                                  </div>
                                </div>
                              );
                              return notif.href
                                ? <Link key={notif.id} href={notif.href} onClick={() => { setNotifOpen(false); if (!notif.read) markOneRead(notif.id); }}>{inner}</Link>
                                : <div key={notif.id}>{inner}</div>;
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>
        )}

        {/* Profile avatar — authenticated users only */}
        {isAuthenticated && !guestMode && (
          <div className="relative shrink-0" title={badge?.docrudGo ? 'Docrud Go ✦ Profile' : 'My profile'}>
            {/* Gold ring for Docrud Go users */}
            {badge?.docrudGo && (
              <>
                <div
                  className="absolute inset-[-2.5px] rounded-full"
                  style={{
                    background: 'conic-gradient(from 0deg, #C9A84C 0%, #F0D878 25%, #E8CC7A 50%, #F0D878 75%, #C9A84C 100%)',
                    animation: 'goRingSpin 4s linear infinite',
                  }}
                />
                <div
                  className="absolute inset-[-2.5px] rounded-full opacity-60"
                  style={{ background: 'conic-gradient(from 0deg, #C9A84C, #F0D878, #C9A84C)', filter: 'blur(5px)' }}
                />
              </>
            )}
            <Link
              href="/profile"
              className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.14] bg-gradient-to-br from-white/[0.14] to-white/[0.06] text-white/70 transition hover:from-white/[0.20] hover:to-white/[0.10] hover:text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] active:scale-95 overflow-hidden"
              style={badge?.docrudGo ? { boxShadow: '0 0 0 2px #08090a, 0 2px 12px rgba(201,168,76,0.4)' } : undefined}
            >
              {(badge?.avatarUrl || session?.user?.image) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={badge?.avatarUrl || session!.user!.image!} alt="Profile" className="h-full w-full object-cover" />
              ) : session?.user?.name ? (
                <span className="text-[11px] font-bold leading-none select-none" style={badge?.docrudGo ? { color: '#E8CC7A' } : { color: 'rgba(255,255,255,0.8)' }}>
                  {session.user.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <User className="h-3.5 w-3.5" />
              )}
            </Link>
            {badge?.docrudGo && (
              <span
                className="absolute -bottom-0.5 -right-0.5 z-20 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] font-black"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#F0D878)', color: '#1a1208', boxShadow: '0 0 0 1.5px #08090a' }}
              >✦</span>
            )}
          </div>
        )}

        {/* Guest mode: sign-in button */}
        {guestMode && (
          <Link
            href="/login"
            onClick={() => { if (typeof document !== 'undefined') document.cookie = 'guestMode=; path=/; max-age=0'; }}
            className="inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-white px-3 text-[12px] font-bold text-[#0D0D0F] transition hover:bg-white/90 active:scale-95"
          >
            Sign in
          </Link>
        )}

        {/* Unauthenticated: login button */}
        {!isAuthenticated && !guestMode && (
          <Link
            href="/login"
            className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-white/[0.10] bg-white/[0.06] px-3 text-[12px] font-semibold text-white/70 transition hover:bg-white/[0.12] hover:text-white"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
