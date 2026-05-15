'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────
type Tab = 'overview' | 'users' | 'plans' | 'platform' | 'analytics' | 'documents' | 'mail' | 'content' | 'settings' | 'audit' | 'revenue' | 'gigs' | 'people' | 'search' | 'security' | 'geography' | 'integrations' | 'early-access';

interface DashboardData {
  users: { total: number; active: number; suspended: number; disabled: number; business: number; individual: number; newLast30Days: number; newLast7Days: number; planDistribution: Record<string, number>; subscriptionStatusDistribution: Record<string, number>; roleDistribution: Record<string, number>; recentSignups: UserRow[]; dailySignups: { date: string; count: number }[] };
  documents: { total: number; last30Days: number; last7Days: number; daily: { date: string; count: number }[] };
  revenue: { totalPaise: number; last30DaysPaise: number; last7DaysPaise: number; totalTransactions: number; recentBilling: BillingRow[] };
  telemetry: { pageViewsLast7Days: number; signupsLast7Days: number; loginsLast7Days: number };
}

interface UserRow {
  id: string; name: string; email: string; role: string; accountType?: string; organizationName?: string; planId?: string; planName?: string; planStatus?: string; isActive: boolean; suspendedUntil?: string; createdAt: string; lastLogin?: string; status?: string; subscription?: Record<string, unknown>; safety?: { scamWarning?: boolean; flaggedAt?: string; suspendedUntil?: string };
}

interface BillingRow { id?: string; userEmail?: string; planId?: string; amountPaise?: number; status?: string; createdAt?: string; }

interface Plan { id: string; name: string; description?: string; priceInPaise: number; billingCycle?: string; isPublic?: boolean; features?: string[]; stats?: { subscribers: number; revenue: number; trials: number; active: number; cancelled: number }; }

interface AuditEntry { id?: string; action: string; targetType?: string; targetId?: string; details?: Record<string, unknown>; ip?: string; timestamp?: string; createdAt?: string; source?: string; actorEmail?: string; }

interface AnalyticsData { period: { days: number; since: string }; overview: Record<string, number>; topPages: { path: string; views: number }[]; topFeatures: { feature: string; count: number }[]; topDocTypes: { type: string; count: number }[]; dailyActivity: { date: string; pageViews: number; signups: number; logins: number; docs: number }[]; dailyRevenue: { date: string; amountPaise: number; transactions: number }[]; signupsByRole: Record<string, number>; signupsByAccountType: Record<string, number>; }

interface PlatformData { flags: Record<string, unknown>; featureControls: Record<string, boolean>; activeSuperAdminSessions: { email: string; createdAt: string; expiresAt: string; ip?: string }[]; authSettings?: { googleEnabled: boolean; aadhaarVerificationEnabled: boolean }; mailConfigured: boolean; }

// ── Helpers ────────────────────────────────────────────────────────────
const fmt = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const ago = (iso?: string) => { if (!iso) return '—'; const d = new Date(iso); const diff = Date.now() - d.getTime(); if (diff < 60000) return 'just now'; if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`; if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`; return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); };
const badge = (s?: string) => { const map: Record<string, string> = { active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', trial: 'bg-amber-500/15 text-amber-400 border-amber-500/20', suspended: 'bg-red-500/15 text-red-400 border-red-500/20', disabled: 'bg-zinc-700/50 text-zinc-500 border-zinc-600/20', cancelled: 'bg-zinc-600/15 text-zinc-400 border-zinc-600/20', paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', failed: 'bg-red-500/15 text-red-400 border-red-500/20' }; return `text-xs px-2 py-0.5 rounded-full border font-medium ${map[s || ''] || 'bg-zinc-700/30 text-zinc-400 border-zinc-600/20'}`; };

// ── Mini chart ─────────────────────────────────────────────────────────
function Sparkline({ data, color = '#f59e0b' }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const h = 32; const w = data.length * 8;
  const pts = data.map((v, i) => `${i * 8},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="opacity-80">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Bar chart row ──────────────────────────────────────────────────────
function BarRow({ label, value, max, color = 'bg-amber-500' }: { label: string; value: number; max: number; color?: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-zinc-400 w-32 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
      </div>
      <span className="text-zinc-300 w-8 text-right font-mono">{value}</span>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, accent = false, spark }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; accent?: boolean; spark?: number[] }) {
  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-3 ${accent ? 'bg-amber-500/10 border-amber-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent ? 'bg-amber-500/20' : 'bg-zinc-800'}`}>{icon}</div>
        {spark && <Sparkline data={spark} color={accent ? '#f59e0b' : '#6366f1'} />}
      </div>
      <div>
        <div className={`text-2xl font-bold ${accent ? 'text-amber-400' : 'text-white'}`}>{value}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────
function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────
function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={() => !disabled && onChange(!enabled)} className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${enabled ? 'bg-amber-500' : 'bg-zinc-700'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`} style={{ height: 22 }}>
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${enabled ? 'left-5' : 'left-0.5'}`} />
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────
export default function SuperAdminPanel({ adminEmail, onLogout }: { adminEmail: string; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  type NavGroup = { group: string; items: { id: Tab; label: string; icon: React.ReactNode }[] };
  const navGroups: NavGroup[] = [
    { group: 'Core', items: [
      { id: 'overview', label: 'Overview', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
      { id: 'analytics', label: 'Analytics', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg> },
      { id: 'geography', label: 'Geography', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg> },
      { id: 'search', label: 'Search Intel', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> },
    ]},
    { group: 'People', items: [
      { id: 'users', label: 'Users', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" /></svg> },
      { id: 'people', label: 'Profiles', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0M19 21a7 7 0 10-14 0" /></svg> },
    ]},
    { group: 'Commerce', items: [
      { id: 'revenue', label: 'Revenue', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
      { id: 'plans', label: 'Plans', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
      { id: 'gigs', label: 'Gigs', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
    ]},
    { group: 'Platform', items: [
      { id: 'platform', label: 'Controls', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> },
      { id: 'documents', label: 'Documents', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
      { id: 'security', label: 'Security', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
      { id: 'integrations', label: 'Integrations', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> },
    ]},
    { group: 'Growth', items: [
      { id: 'early-access', label: 'Early Access', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" /></svg> },
    ]},
    { group: 'Manage', items: [
      { id: 'mail', label: 'Mail', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
      { id: 'content', label: 'Content', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg> },
      { id: 'settings', label: 'Settings', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg> },
      { id: 'audit', label: 'Audit Log', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
    ]},
  ];
  const allNavItems = navGroups.flatMap((g) => g.items);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-14'} flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-200`}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-zinc-800 gap-3 flex-shrink-0">
          <div className="w-7 h-7 bg-amber-500/20 rounded-lg flex items-center justify-center border border-amber-500/30 flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-2.28-.637-4.41-1.748-6.212M12 9v3l1.5 1.5" /></svg>
          </div>
          {sidebarOpen && <div><div className="text-sm font-bold text-white leading-tight">docrud</div><div className="text-[10px] text-amber-500/80 font-medium uppercase tracking-wider">Super Admin</div></div>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={sidebarOpen ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'} /></svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.group}>
              {sidebarOpen && <div className="px-4 pt-4 pb-1 text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">{group.group}</div>}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-all ${tab === item.id ? 'text-amber-400 bg-amber-500/10 border-r-2 border-amber-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-zinc-800 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 text-xs font-bold flex-shrink-0">{adminEmail[0]?.toUpperCase() || 'S'}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-300 truncate font-medium">{adminEmail}</div>
                <div className="text-[10px] text-zinc-600">Super Admin</div>
              </div>
              <button onClick={onLogout} title="Logout" className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          ) : (
            <button onClick={onLogout} className="w-full flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors py-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="h-14 flex items-center px-6 border-b border-zinc-800 bg-zinc-900/50 gap-3 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex-1">
            <span className="text-sm font-medium text-white">{allNavItems.find((n) => n.id === tab)?.label}</span>
            <span className="text-xs text-zinc-600 ml-2">docrud super admin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Live</span>
            </div>
            <span className="text-xs text-zinc-600">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
          </div>
        </div>

        <div className="p-6">
          {tab === 'overview' && <OverviewTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'plans' && <PlansTab />}
          {tab === 'platform' && <PlatformTab />}
          {tab === 'analytics' && <AnalyticsTab />}
          {tab === 'documents' && <DocumentsTab />}
          {tab === 'mail' && <MailTab />}
          {tab === 'content' && <ContentTab />}
          {tab === 'settings' && <SettingsTab />}
          {tab === 'audit' && <AuditTab />}
          {tab === 'revenue' && <RevenueTab />}
          {tab === 'gigs' && <GigsTab />}
          {tab === 'people' && <PeopleTab />}
          {tab === 'search' && <SearchIntelTab />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'geography' && <GeographyTab />}
          {tab === 'integrations' && <IntegrationsTab />}
          {tab === 'early-access' && <EarlyAccessTab />}
        </div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════════════════════════════════
function OverviewTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/super-admin/dashboard').then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <ErrorState msg="Failed to load dashboard" />;

  const { users, documents, revenue, telemetry } = data;

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={users.total} sub={`+${users.newLast7Days} this week`} accent spark={users.dailySignups.map((d) => d.count)}
          icon={<svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard label="Documents Generated" value={documents.total} sub={`${documents.last7Days} this week`} spark={documents.daily.map((d) => d.count)}
          icon={<svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <StatCard label="Total Revenue" value={fmt(revenue.totalPaise)} sub={`${fmt(revenue.last30DaysPaise)} last 30d`}
          icon={<svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="Page Views (7d)" value={telemetry.pageViewsLast7Days} sub={`${telemetry.loginsLast7Days} logins · ${telemetry.signupsLast7Days} signups`}
          icon={<svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-2">Account Types</div>
          <div className="space-y-1">
            <BarRow label="Business" value={users.business} max={users.total} color="bg-amber-500" />
            <BarRow label="Individual" value={users.individual} max={users.total} color="bg-sky-500" />
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-2">User Status</div>
          <div className="space-y-1">
            <BarRow label="Active" value={users.active} max={users.total} color="bg-emerald-500" />
            <BarRow label="Suspended" value={users.suspended} max={users.total} color="bg-red-500" />
            <BarRow label="Disabled" value={users.disabled} max={users.total} color="bg-zinc-600" />
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-2">Subscriptions</div>
          <div className="space-y-1">
            {Object.entries(users.subscriptionStatusDistribution).map(([k, v]) => (
              <BarRow key={k} label={k} value={v} max={users.total} color={k === 'active' ? 'bg-emerald-500' : k === 'trial' ? 'bg-amber-500' : 'bg-zinc-600'} />
            ))}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-2">Roles</div>
          <div className="space-y-1">
            {Object.entries(users.roleDistribution).slice(0, 5).map(([k, v]) => (
              <BarRow key={k} label={k} value={v} max={users.total} color="bg-indigo-500" />
            ))}
          </div>
        </div>
      </div>

      {/* Recent signups + Recent billing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">Recent Signups</div>
              <div className="text-xs text-zinc-500">{users.newLast30Days} in last 30 days</div>
            </div>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {users.recentSignups.slice(0, 7).map((u) => (
              <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0">{(u.name || u.email)[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{u.name || '—'}</div>
                  <div className="text-xs text-zinc-500 truncate">{u.email}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={badge(u.planStatus)}>{u.planStatus || 'none'}</div>
                  <div className="text-xs text-zinc-600 mt-0.5">{ago(u.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="px-5 py-4 border-b border-zinc-800">
            <div className="text-sm font-medium text-white">Recent Transactions</div>
            <div className="text-xs text-zinc-500">{revenue.totalTransactions} total successful</div>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {revenue.recentBilling.length === 0 && <div className="px-5 py-8 text-center text-zinc-600 text-sm">No transactions yet</div>}
            {revenue.recentBilling.map((t, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{t.userEmail || '—'}</div>
                  <div className="text-xs text-zinc-500">{t.planId || '—'}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-emerald-400">{fmt(t.amountPaise || 0)}</div>
                  <div className="text-xs text-zinc-600">{ago(t.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// USERS TAB
// ══════════════════════════════════════════════════════════════════════
function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/super-admin/users?query=${encodeURIComponent(query)}&status=${statusFilter}&limit=300`)
      .then((r) => r.json()).then((d) => setUsers(d.users || [])).catch(console.error).finally(() => setLoading(false));
  }, [query, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function doAction(action: string, userId: string, extra?: Record<string, unknown>) {
    setActionLoading(true);
    try {
      const res = await fetch('/api/super-admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, userId, ...extra }) });
      if (res.ok) { setMsg('Done'); load(); setSelectedUser(null); setTimeout(() => setMsg(''), 2000); }
      else { const d = await res.json(); setMsg(d.error || 'Failed'); }
    } finally { setActionLoading(false); }
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="User Management" sub={`${users.length} users loaded`} />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, org…" className="bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 min-w-60" />
        {(['all', 'active', 'suspended', 'disabled'] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${statusFilter === s ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'}`}>{s}</button>
        ))}
        {msg && <span className="text-xs text-emerald-400 self-center">{msg}</span>}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Org</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Plan</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
                <th className="text-left px-4 py-3 font-medium">Last Login</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading && <tr><td colSpan={8} className="text-center py-8 text-zinc-600">Loading…</td></tr>}
              {!loading && users.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-zinc-600">No users found</td></tr>}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0">{(u.name || u.email)[0]?.toUpperCase()}</div>
                      <div>
                        <div className="text-white font-medium truncate max-w-[140px]">{u.name || '—'}</div>
                        <div className="text-zinc-500 text-xs truncate max-w-[140px]">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs max-w-[100px] truncate">{u.organizationName || '—'}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{u.role}</span></td>
                  <td className="px-4 py-3"><span className="text-xs text-zinc-400">{(u.subscription as Record<string, string>)?.planId || '—'}</span></td>
                  <td className="px-4 py-3"><span className={badge(u.status)}>{u.status}</span></td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{ago(u.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{ago(u.lastLogin)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedUser(u)} className="text-xs text-amber-500 hover:text-amber-400 transition-colors">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User detail modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-300">{(selectedUser.name || selectedUser.email)[0]?.toUpperCase()}</div>
                <div>
                  <div className="font-semibold text-white">{selectedUser.name}</div>
                  <div className="text-sm text-zinc-500">{selectedUser.email}</div>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-zinc-600 hover:text-zinc-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[['Role', selectedUser.role], ['Account', selectedUser.accountType || '—'], ['Status', selectedUser.status || '—'], ['Org', selectedUser.organizationName || '—'], ['Joined', ago(selectedUser.createdAt)], ['Last Login', ago(selectedUser.lastLogin)]].map(([k, v]) => (
                <div key={k} className="bg-zinc-800 rounded-lg p-3"><div className="text-zinc-500 mb-0.5">{k}</div><div className="text-white font-medium">{v}</div></div>
              ))}
            </div>

            {selectedUser.safety?.scamWarning && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">
                ⚠ Flagged as suspicious · {ago(selectedUser.safety.flaggedAt)}
              </div>
            )}

            <div className="border-t border-zinc-800 pt-4">
              <div className="text-xs text-zinc-500 mb-3 uppercase tracking-wider font-medium">Actions</div>
              <div className="flex flex-wrap gap-2">
                {selectedUser.status !== 'suspended' && (
                  <button disabled={actionLoading} onClick={() => doAction('suspend', selectedUser.id, { days: 7 })} className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs hover:bg-amber-500/20 transition-all disabled:opacity-50">Suspend 7d</button>
                )}
                {selectedUser.status === 'suspended' && (
                  <button disabled={actionLoading} onClick={() => doAction('unsuspend', selectedUser.id)} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/20 transition-all disabled:opacity-50">Unsuspend</button>
                )}
                {selectedUser.isActive ? (
                  <button disabled={actionLoading} onClick={() => doAction('disable', selectedUser.id)} className="px-3 py-1.5 bg-zinc-700/50 border border-zinc-600/20 text-zinc-400 rounded-lg text-xs hover:bg-zinc-700 transition-all disabled:opacity-50">Disable</button>
                ) : (
                  <button disabled={actionLoading} onClick={() => doAction('enable', selectedUser.id)} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/20 transition-all disabled:opacity-50">Enable</button>
                )}
                {selectedUser.safety?.scamWarning ? (
                  <button disabled={actionLoading} onClick={() => doAction('clear_flag', selectedUser.id)} className="px-3 py-1.5 bg-zinc-700/50 border border-zinc-600/20 text-zinc-400 rounded-lg text-xs hover:bg-zinc-700 transition-all disabled:opacity-50">Clear Flag</button>
                ) : (
                  <button disabled={actionLoading} onClick={() => doAction('flag_scam', selectedUser.id)} className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg text-xs hover:bg-orange-500/20 transition-all disabled:opacity-50">Flag Suspicious</button>
                )}
                <button disabled={actionLoading} onClick={() => { if (confirm('Permanently delete this user?')) doAction('delete', selectedUser.id); }} className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-all disabled:opacity-50">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// PLANS TAB
// ══════════════════════════════════════════════════════════════════════
function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/super-admin/plans').then((r) => r.json()).then((d) => setPlans(d.plans || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function savePlan(plan: Plan, action: 'create' | 'update') {
    const res = await fetch('/api/super-admin/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, plan }) });
    if (res.ok) { setMsg('Saved'); load(); setEditing(null); setTimeout(() => setMsg(''), 2000); }
    else { const d = await res.json(); setMsg(d.error || 'Failed'); }
  }

  async function deletePlan(id: string) {
    if (!confirm('Delete this plan?')) return;
    const res = await fetch('/api/super-admin/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', plan: { id } }) });
    if (res.ok) { setMsg('Deleted'); load(); setTimeout(() => setMsg(''), 2000); }
  }

  if (loading) return <Loader />;

  return (
    <div className="space-y-5">
      <SectionHeader title="Plans & Billing" sub="Manage subscription plans and pricing"
        action={<button onClick={() => setEditing({ id: '', name: '', priceInPaise: 0, billingCycle: 'monthly', isPublic: true, features: [] })} className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-all">+ New Plan</button>}
      />
      {msg && <div className="text-xs text-emerald-400">{msg}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((p) => (
          <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-white">{p.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{p.id}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-amber-400">{fmt(p.priceInPaise)}</div>
                <div className="text-xs text-zinc-600">/{p.billingCycle || 'mo'}</div>
              </div>
            </div>

            {p.stats && (
              <div className="grid grid-cols-4 gap-2 text-center">
                {[['Subscribers', p.stats.subscribers], ['Trials', p.stats.trials], ['Active', p.stats.active], ['Revenue', fmt(p.stats.revenue)]].map(([k, v]) => (
                  <div key={k as string} className="bg-zinc-800 rounded-lg p-2">
                    <div className="text-xs text-zinc-500">{k}</div>
                    <div className="text-sm font-semibold text-white mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className={badge(p.isPublic ? 'active' : 'disabled')}>{p.isPublic ? 'Public' : 'Hidden'}</span>
              <div className="flex gap-2">
                <button onClick={() => setEditing(p)} className="text-xs text-amber-500 hover:text-amber-400 transition-colors">Edit</button>
                <button onClick={() => deletePlan(p.id)} className="text-xs text-red-500 hover:text-red-400 transition-colors">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Plan editor modal */}
      {editing !== null && (
        <PlanEditor plan={editing} onSave={(p) => savePlan(p, p.id && plans.find((x) => x.id === p.id) ? 'update' : 'create')} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function PlanEditor({ plan, onSave, onClose }: { plan: Plan; onSave: (p: Plan) => void; onClose: () => void }) {
  const [form, setForm] = useState({ ...plan, features: plan.features?.join('\n') || '' });
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">{plan.id ? 'Edit Plan' : 'New Plan'}</h3>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(['id', 'name'] as const).map((k) => (
            <div key={k}><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">{k}</label><input value={String((form as unknown as Record<string, unknown>)[k] ?? '')} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" /></div>
          ))}
          <div><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">Price (paise)</label><input type="number" value={form.priceInPaise} onChange={(e) => setForm({ ...form, priceInPaise: Number(e.target.value) })} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" /></div>
          <div><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">Billing Cycle</label><select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="one-time">One-time</option></select></div>
        </div>
        <div><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">Description</label><input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" /></div>
        <div><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">Features (one per line)</label><textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={4} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none" /></div>
        <div className="flex items-center gap-2"><Toggle enabled={Boolean(form.isPublic)} onChange={(v) => setForm({ ...form, isPublic: v })} /><span className="text-sm text-zinc-400">Publicly visible</span></div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors">Cancel</button>
          <button onClick={() => onSave({ ...form, features: String(form.features ?? '').split('\n').filter(Boolean) } as Plan)} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg transition-all">Save Plan</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// PLATFORM TAB
// ══════════════════════════════════════════════════════════════════════
function PlatformTab() {
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/super-admin/platform').then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function updateFlags(updates: Record<string, unknown>) {
    setSaving(true);
    await fetch('/api/super-admin/platform', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_flags', data: { ...data?.flags, ...updates } }) });
    setSaving(false); setMsg('Saved'); load(); setTimeout(() => setMsg(''), 2000);
  }

  async function toggleFeature(key: string, val: boolean) {
    setSaving(true);
    await fetch('/api/super-admin/platform', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_feature_controls', data: { [key]: val } }) });
    setSaving(false); setMsg('Saved'); load(); setTimeout(() => setMsg(''), 2000);
  }

  if (loading) return <Loader />;
  if (!data) return <ErrorState msg="Failed to load platform data" />;

  const flags = data.flags as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Platform Controls" sub="Global flags, feature switches, and active sessions" />
      {msg && <div className="text-xs text-emerald-400">{msg}</div>}

      {/* Platform flags */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-4">Platform Flags</div>
        <div className="space-y-4">
          {[
            { key: 'maintenanceMode', label: 'Maintenance Mode', sub: 'Show maintenance page to all users', danger: true },
            { key: 'newSignupsEnabled', label: 'New Signups Enabled', sub: 'Allow new users to register' },
            { key: 'publicGigsEnabled', label: 'Public Gigs / Connect', sub: 'Gig marketplace visible' },
            { key: 'publicMarketplaceEnabled', label: 'Template Marketplace', sub: 'Public template market' },
            { key: 'publicBlogEnabled', label: 'Blog / Content', sub: 'Public blog section' },
          ].map(({ key, label, sub, danger }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <div className={`text-sm font-medium ${danger && flags[key] ? 'text-red-400' : 'text-white'}`}>{label}</div>
                <div className="text-xs text-zinc-500">{sub}</div>
              </div>
              <Toggle enabled={Boolean(flags[key])} disabled={saving} onChange={(v) => updateFlags({ [key]: v })} />
            </div>
          ))}
        </div>
      </div>

      {/* Global broadcast */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-1">Global Broadcast Banner</div>
        <div className="text-xs text-zinc-500 mb-4">Shown to all logged-in users</div>
        <BroadcastEditor current={flags.globalBroadcast as { message: string; type: string } | null} onSave={(v) => updateFlags({ globalBroadcast: v })} />
      </div>

      {/* Feature controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-4">Feature Controls</div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(data.featureControls).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2.5">
              <span className="text-xs text-zinc-300 font-mono">{key}</span>
              <Toggle enabled={val} disabled={saving} onChange={(v) => toggleFeature(key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Active sessions */}
      {data.activeSuperAdminSessions.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-4">Active Super Admin Sessions</div>
          <div className="space-y-2">
            {data.activeSuperAdminSessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-zinc-800 rounded-lg px-4 py-3 text-xs">
                <div className="text-zinc-300">{s.email}</div>
                <div className="text-zinc-500">{s.ip || 'unknown IP'}</div>
                <div className="text-zinc-500">expires {ago(s.expiresAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BroadcastEditor({ current, onSave }: { current: { message: string; type: string } | null; onSave: (v: { message: string; type: string; createdAt: string } | null) => void }) {
  const [message, setMessage] = useState(current?.message || '');
  const [type, setType] = useState(current?.type || 'info');
  return (
    <div className="space-y-3">
      <select value={type} onChange={(e) => setType(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
        <option value="info">Info</option><option value="warning">Warning</option><option value="error">Error / Alert</option>
      </select>
      <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Broadcast message…" className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
      <div className="flex gap-2">
        <button onClick={() => onSave(message.trim() ? { message, type, createdAt: new Date().toISOString() } : null)} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition-all">{message ? 'Set Broadcast' : 'Clear Broadcast'}</button>
        {current && <button onClick={() => { setMessage(''); onSave(null); }} className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded-lg transition-all">Clear</button>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ANALYTICS TAB
// ══════════════════════════════════════════════════════════════════════
function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/super-admin/analytics?days=${days}`).then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [days]);

  if (loading) return <Loader />;
  if (!data) return <ErrorState msg="Failed to load analytics" />;

  const { overview, topPages, topFeatures, topDocTypes, dailyActivity, dailyRevenue, signupsByRole, signupsByAccountType } = data;

  return (
    <div className="space-y-6">
      <SectionHeader title="Analytics & Insights" sub="Deep platform usage data"
        action={
          <div className="flex gap-1">
            {[7, 14, 30, 60, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${days === d ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-zinc-700'}`}>{d}d</button>
            ))}
          </div>
        }
      />

      {/* Overview metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { k: 'totalPageViews', label: 'Page Views', color: 'text-sky-400' },
          { k: 'totalNewUsers', label: 'New Users', color: 'text-emerald-400' },
          { k: 'totalDocuments', label: 'Documents', color: 'text-indigo-400' },
          { k: 'totalRevenuePaise', label: 'Revenue', color: 'text-amber-400', fmt: true },
        ].map(({ k, label, color, fmt: isFmt }) => (
          <div key={k} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-1">{label}</div>
            <div className={`text-xl font-bold ${color}`}>{isFmt ? fmt(overview[k] || 0) : (overview[k] || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Daily activity chart (text-based) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-4">Daily Activity</div>
        <div className="overflow-x-auto">
          <div className="flex items-end gap-1 h-24 min-w-max">
            {dailyActivity.map((d, i) => {
              const maxVal = Math.max(...dailyActivity.map((x) => x.pageViews), 1);
              const h = Math.max(2, (d.pageViews / maxVal) * 88);
              return (
                <div key={i} className="flex flex-col items-center gap-1 group relative">
                  <div className="absolute bottom-full mb-1 bg-zinc-800 border border-zinc-700 text-xs text-white px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    {d.date}<br />Views: {d.pageViews} · Docs: {d.docs}
                  </div>
                  <div className="w-4 bg-indigo-500/60 hover:bg-indigo-500 rounded-sm transition-colors" style={{ height: h }} />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 mt-1 min-w-max">
            {dailyActivity.map((d, i) => (
              <div key={i} className="w-4 text-[8px] text-zinc-700 text-center">{d.date.slice(5)}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Top content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { title: 'Top Pages', items: topPages.map((p) => ({ label: p.path, value: p.views })) },
          { title: 'Top Features', items: topFeatures.map((f) => ({ label: f.feature, value: f.count })) },
          { title: 'Top Document Types', items: topDocTypes.map((t) => ({ label: t.type, value: t.count })) },
        ].map(({ title, items }) => (
          <div key={title} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="text-sm font-medium text-white mb-4">{title}</div>
            <div className="space-y-2">
              {items.slice(0, 10).map((item, i) => (
                <BarRow key={i} label={item.label} value={item.value} max={items[0]?.value || 1} color={i === 0 ? 'bg-amber-500' : 'bg-indigo-500'} />
              ))}
              {items.length === 0 && <div className="text-xs text-zinc-600">No data</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Signup breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-4">Signups by Role</div>
          <div className="space-y-2">
            {Object.entries(signupsByRole).map(([k, v]) => (
              <BarRow key={k} label={k} value={v} max={Math.max(...Object.values(signupsByRole), 1)} color="bg-amber-500" />
            ))}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-4">Signups by Account Type</div>
          <div className="space-y-2">
            {Object.entries(signupsByAccountType).map(([k, v]) => (
              <BarRow key={k} label={k} value={v} max={Math.max(...Object.values(signupsByAccountType), 1)} color="bg-sky-500" />
            ))}
          </div>
        </div>
      </div>

      {/* Revenue over time */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-4">Daily Revenue</div>
        <div className="overflow-x-auto">
          <div className="flex items-end gap-1 h-20 min-w-max">
            {dailyRevenue.map((d, i) => {
              const maxVal = Math.max(...dailyRevenue.map((x) => x.amountPaise), 1);
              const h = Math.max(2, (d.amountPaise / maxVal) * 72);
              return (
                <div key={i} className="flex flex-col items-center group relative">
                  <div className="absolute bottom-full mb-1 bg-zinc-800 border border-zinc-700 text-xs text-white px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    {d.date}<br />{fmt(d.amountPaise)} · {d.transactions} tx
                  </div>
                  <div className="w-4 bg-emerald-500/60 hover:bg-emerald-500 rounded-sm transition-colors" style={{ height: h }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// DOCUMENTS TAB
// ══════════════════════════════════════════════════════════════════════
function DocumentsTab() {
  const [data, setData] = useState<{ documents: Record<string, unknown>[]; templates: Record<string, unknown>[]; totalDocuments: number; totalTemplates: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'documents' | 'templates'>('documents');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/super-admin/documents?query=${encodeURIComponent(query)}`).then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [query]);

  useEffect(() => { load(); }, [load]);

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return;
    const res = await fetch('/api/super-admin/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_template', templateId: id }) });
    if (res.ok) { setMsg('Deleted'); load(); setTimeout(() => setMsg(''), 2000); } else setMsg('Failed');
  }

  if (loading) return <Loader />;
  if (!data) return <ErrorState msg="Failed to load documents" />;

  return (
    <div className="space-y-5">
      <SectionHeader title="Document Control" sub={`${data.totalDocuments} documents · ${data.totalTemplates} templates`} />

      <div className="flex gap-3 flex-wrap">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 min-w-52" />
        {(['documents', 'templates'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${view === v ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>{v}</button>
        ))}
        {msg && <span className="text-xs text-emerald-400 self-center">{msg}</span>}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                {view === 'documents' ? (
                  <><th className="text-left px-4 py-3">Template</th><th className="text-left px-4 py-3">Generated By</th><th className="text-left px-4 py-3">Org</th><th className="text-left px-4 py-3">Date</th></>
                ) : (
                  <><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Category</th><th className="text-left px-4 py-3">Org</th><th className="text-left px-4 py-3">Usage</th><th className="px-4 py-3" /></>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {view === 'documents' && data.documents.slice(0, 100).map((d, i) => (
                <tr key={i} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-zinc-300 text-sm">{String(d.templateName || '—')}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{String(d.generatedBy || d.userEmail || '—')}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{String(d.organizationName || '—')}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{ago(String(d.createdAt || ''))}</td>
                </tr>
              ))}
              {view === 'templates' && data.templates.map((t, i) => (
                <tr key={i} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-zinc-300 font-medium">{String(t.name)}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{String(t.category || '—')}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{String(t.organizationName || 'System')}</td>
                  <td className="px-4 py-3 text-xs"><span className="text-amber-400 font-mono">{String(t.usageCount || 0)}</span></td>
                  <td className="px-4 py-3">
                    {Boolean(t.isCustom) && <button onClick={() => deleteTemplate(String(t.id))} className="text-xs text-red-500 hover:text-red-400 transition-colors">Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIL TAB
// ══════════════════════════════════════════════════════════════════════
function MailTab() {
  const [data, setData] = useState<{ campaigns: Record<string, unknown>[]; recentOutbox: Record<string, unknown>[]; stats: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [broadcast, setBroadcast] = useState({ subject: '', htmlBody: '', audience: 'all' });
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [view, setView] = useState<'overview' | 'outbox'>('overview');
  const [outbox, setOutbox] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch('/api/super-admin/mail').then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function loadOutbox() {
    setView('outbox');
    const d = await fetch('/api/super-admin/mail?view=outbox&limit=100').then((r) => r.json()).catch(() => ({ outbox: [] }));
    setOutbox(d.outbox || []);
  }

  async function sendBroadcast() {
    if (!broadcast.subject || !broadcast.htmlBody) { setMsg('Subject and body required'); return; }
    setSending(true);
    const res = await fetch('/api/super-admin/mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send_broadcast', data: broadcast }) });
    const d = await res.json();
    setSending(false);
    setMsg(d.sent ? `Sent to ${d.sent} recipients` : d.error || 'Failed');
    setComposing(false);
    setTimeout(() => setMsg(''), 5000);
  }

  if (loading) return <Loader />;

  return (
    <div className="space-y-5">
      <SectionHeader title="Mail Center" sub="Broadcasts, campaigns, and outbox"
        action={<button onClick={() => setComposing(true)} className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-all">Compose Broadcast</button>}
      />
      {msg && <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{msg}</div>}

      <div className="flex gap-1">
        {(['overview', 'outbox'] as const).map((v) => (
          <button key={v} onClick={() => v === 'outbox' ? loadOutbox() : setView('overview')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${view === v ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>{v}</button>
        ))}
      </div>

      {view === 'overview' && data && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[['Total Sent', data.stats.totalSent, 'text-emerald-400'], ['Failed', data.stats.totalFailed, 'text-red-400'], ['Campaigns', data.stats.totalCampaigns, 'text-amber-400']].map(([k, v, c]) => (
              <div key={k as string} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${c}`}>{v}</div>
                <div className="text-xs text-zinc-500 mt-1">{k}</div>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="px-5 py-4 border-b border-zinc-800 text-sm font-medium text-white">Recent Outbox</div>
            <div className="divide-y divide-zinc-800/50">
              {data.recentOutbox.length === 0 && <div className="px-5 py-8 text-center text-zinc-600 text-sm">No emails sent yet</div>}
              {data.recentOutbox.map((e, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3 text-sm">
                  <span className={badge(String(e.status || ''))}>{String(e.status)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-zinc-300 truncate">{String(e.subject || '—')}</div>
                    <div className="text-xs text-zinc-500 truncate">To: {String(e.to || '—')}</div>
                  </div>
                  <div className="text-xs text-zinc-600 flex-shrink-0">{ago(String(e.createdAt || ''))}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {view === 'outbox' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-800 text-xs text-zinc-500"><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Subject</th><th className="text-left px-4 py-3">To</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Date</th></tr></thead>
            <tbody className="divide-y divide-zinc-800/50">
              {outbox.map((e, i) => (
                <tr key={i} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3"><span className={badge(String(e.status || ''))}>{String(e.status)}</span></td>
                  <td className="px-4 py-3 text-zinc-300 max-w-[200px] truncate">{String(e.subject || '—')}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs max-w-[150px] truncate">{String(e.to || '—')}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{String(e.type || '—')}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{ago(String(e.createdAt || ''))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {composing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setComposing(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Compose Broadcast</h3>
              <button onClick={() => setComposing(false)} className="text-zinc-600 hover:text-zinc-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">Audience</label>
              <select value={broadcast.audience} onChange={(e) => setBroadcast({ ...broadcast, audience: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
                <option value="all">All Active Users</option><option value="business">Business Accounts</option><option value="individual">Individual Accounts</option><option value="admins">Admins Only</option>
              </select></div>
            <div><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">Subject</label><input value={broadcast.subject} onChange={(e) => setBroadcast({ ...broadcast, subject: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" /></div>
            <div><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">HTML Body</label><textarea value={broadcast.htmlBody} onChange={(e) => setBroadcast({ ...broadcast, htmlBody: e.target.value })} rows={6} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none font-mono text-xs" placeholder="<p>Your message…</p>" /></div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setComposing(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-300">Cancel</button>
              <button disabled={sending} onClick={sendBroadcast} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-all flex items-center gap-2">
                {sending ? <><div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />Sending…</> : 'Send Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// CONTENT TAB
// ══════════════════════════════════════════════════════════════════════
function ContentTab() {
  const [data, setData] = useState<{ landing: Record<string, unknown> | null; theme: Record<string, unknown> | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [view, setView] = useState<'landing' | 'theme'>('landing');
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/super-admin/content').then((r) => r.json()).then((d) => {
      setData(d);
      if (d.landing) setForm(view === 'landing' ? flattenSimple(d.landing) : flattenSimple(d.theme || {}));
    }).catch(console.error).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (data) setForm(view === 'landing' ? flattenSimple(data.landing || {}) : flattenSimple(data.theme || {}));
  }, [view, data]);

  function flattenSimple(obj: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = String(v);
    }
    return out;
  }

  async function save() {
    setSaving(true);
    const action = view === 'landing' ? 'update_landing' : 'update_theme';
    const res = await fetch('/api/super-admin/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data: form }) });
    setSaving(false);
    if (res.ok) { setMsg('Saved'); setTimeout(() => setMsg(''), 2000); } else setMsg('Failed');
  }

  if (loading) return <Loader />;

  const editableFields = Object.entries(form).filter(([k]) => !['id', 'updatedAt', 'createdAt'].includes(k));

  return (
    <div className="space-y-5">
      <SectionHeader title="Content Management" sub="Landing page and theme settings" />
      {msg && <div className="text-xs text-emerald-400">{msg}</div>}

      <div className="flex gap-1">
        {(['landing', 'theme'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${view === v ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>{v}</button>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="grid gap-4">
          {editableFields.map(([k, v]) => (
            <div key={k}>
              <label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">{k.replace(/([A-Z])/g, ' $1').trim()}</label>
              {v.length > 80 ? (
                <textarea value={v} onChange={(e) => setForm({ ...form, [k]: e.target.value })} rows={3} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none" />
              ) : (
                <input value={v} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button disabled={saving} onClick={save} className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-all">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ══════════════════════════════════════════════════════════════════════
function SettingsTab() {
  const [data, setData] = useState<{ superAdminEmail: string; authSettings: Record<string, unknown> | null; mailSettings: Record<string, unknown> | null; adminUsers: Record<string, unknown>[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [newSaEmail, setNewSaEmail] = useState('');
  const [mailForm, setMailForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/super-admin/settings').then((r) => r.json()).then((d) => {
      setData(d);
      if (d.mailSettings) setMailForm(Object.fromEntries(Object.entries(d.mailSettings).map(([k, v]) => [k, String(v ?? '')])));
    }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function doAction(action: string, extra: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch('/api/super-admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data: extra }) });
    setSaving(false);
    if (res.ok) { setMsg('Saved'); load(); setTimeout(() => setMsg(''), 2000); }
    else { const d = await res.json(); setMsg(d.error || 'Failed'); }
  }

  if (loading) return <Loader />;
  if (!data) return <ErrorState msg="Failed to load settings" />;

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" sub="Super admin account, mail, and auth configuration" />
      {msg && <div className="text-xs text-emerald-400">{msg}</div>}

      {/* Super admin email */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div>
          <div className="text-sm font-medium text-white">Super Admin Email</div>
          <div className="text-xs text-zinc-500 mt-0.5">Current: <span className="text-amber-400 font-mono">{data.superAdminEmail || '(not set)'}</span></div>
        </div>
        <div className="flex gap-3">
          <input value={newSaEmail} onChange={(e) => setNewSaEmail(e.target.value)} placeholder="new@email.com" type="email" className="flex-1 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          <button disabled={saving} onClick={() => doAction('update_super_admin_email', { email: newSaEmail })} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold rounded-lg transition-all">Update</button>
        </div>
      </div>

      {/* Mail settings */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="text-sm font-medium text-white">SMTP Mail Settings</div>
        <div className="grid grid-cols-2 gap-3">
          {[['host', 'SMTP Host'], ['port', 'Port'], ['username', 'Username'], ['fromEmail', 'From Email'], ['fromName', 'From Name'], ['replyTo', 'Reply-To']].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">{label}</label>
              <input value={mailForm[k] || ''} onChange={(e) => setMailForm({ ...mailForm, [k]: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
            </div>
          ))}
        </div>
        <div><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">SMTP Password</label><input type="password" placeholder="••••••••" onChange={(e) => setMailForm({ ...mailForm, password: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" /></div>
        <div className="flex justify-end">
          <button disabled={saving} onClick={() => doAction('update_mail', mailForm)} className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-all">Save Mail Config</button>
        </div>
      </div>

      {/* Auth settings */}
      {data.authSettings && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div className="text-sm font-medium text-white">Auth Settings</div>
          {[['Google Sign-in', 'googleEnabled'], ['Aadhaar Verification', 'aadhaarVerificationEnabled']].map(([label, key]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">{label}</span>
              <Toggle enabled={Boolean(data.authSettings![key])} onChange={(v) => doAction('update_auth', { [key]: v })} />
            </div>
          ))}
        </div>
      )}

      {/* Admin users */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-4">Admin Users</div>
        <div className="space-y-2">
          {data.adminUsers.map((u, i) => (
            <div key={i} className="flex items-center justify-between bg-zinc-800 rounded-lg px-4 py-3">
              <div>
                <div className="text-sm text-white">{String(u.name)}</div>
                <div className="text-xs text-zinc-500">{String(u.email)}</div>
              </div>
              <div className="text-right">
                <span className={badge(u.isActive ? 'active' : 'disabled')}>{u.isActive ? 'active' : 'disabled'}</span>
                <div className="text-xs text-zinc-600 mt-0.5">last login {ago(String(u.lastLogin || ''))}</div>
              </div>
            </div>
          ))}
          {data.adminUsers.length === 0 && <div className="text-sm text-zinc-600">No admin users found</div>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// AUDIT TAB
// ══════════════════════════════════════════════════════════════════════
function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('all');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/super-admin/audit?source=${source}&limit=200`).then((r) => r.json()).then((d) => setEntries(d.entries || [])).catch(console.error).finally(() => setLoading(false));
  }, [source]);

  return (
    <div className="space-y-5">
      <SectionHeader title="Audit Log" sub="All super admin and admin actions" />

      <div className="flex gap-1">
        {(['all', 'super-admin', 'admin'] as const).map((s) => (
          <button key={s} onClick={() => setSource(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${source === s ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>{s}</button>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Target</th>
                <th className="text-left px-4 py-3">Actor</th>
                <th className="text-left px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading && <tr><td colSpan={6} className="text-center py-8 text-zinc-600">Loading…</td></tr>}
              {!loading && entries.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-zinc-600">No audit entries</td></tr>}
              {entries.map((e, i) => (
                <tr key={i} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{ago(e.timestamp || e.createdAt)}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${e.source === 'super-admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700/50 text-zinc-400'}`}>{e.source}</span></td>
                  <td className="px-4 py-3 text-zinc-300 font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{e.targetType ? `${e.targetType}: ${e.targetId || ''}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 truncate max-w-[120px]">{e.actorEmail || '—'}</td>
                  <td className="px-4 py-3 text-xs text-zinc-600 font-mono">{e.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Shared utilities ───────────────────────────────────────────────────
function Loader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="space-y-3 text-center">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-xs text-zinc-600">Loading…</div>
      </div>
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-2">
        <div className="text-red-400 text-sm">{msg}</div>
        <button onClick={() => window.location.reload()} className="text-xs text-zinc-500 hover:text-zinc-400">Retry</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// REVENUE TAB
// ══════════════════════════════════════════════════════════════════════
function RevenueTab() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/super-admin/revenue').then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <ErrorState msg="Failed to load revenue" />;

  const s = data.summary as Record<string, number & string>;
  const monthly = (data.monthlyRevenue as { month: string; paise: number; transactions: number }[]) || [];
  const daily30 = ((data.dailyRevenue as { date: string; paise: number; transactions: number; failed: number }[]) || []).slice(-30);
  const planRev = (data.planRevenue as { id: string; name: string; revenue: number; transactions: number }[]) || [];
  const topUsers = (data.topPayingUsers as { userId: string; email: string; name: string; revenue: number; transactions: number }[]) || [];
  const recentTx = (data.recentTransactions as Record<string, unknown>[]) || [];
  const recentFailed = (data.recentFailed as Record<string, unknown>[]) || [];
  const maxMonthly = Math.max(...monthly.map((m) => m.paise), 1);
  const maxDaily = Math.max(...daily30.map((d) => d.paise), 1);

  return (
    <div className="space-y-6">
      <SectionHeader title="Revenue Dashboard" sub="Real-time financial overview with GST, MRR, ARR" />

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: fmt(Number(s.totalRevenuePaise || 0)), sub: 'all time', accent: true },
          { label: 'MRR', value: fmt(Number(s.mrrPaise || 0)), sub: `ARR ${fmt(Number(s.arrPaise || 0))}` },
          { label: 'This Month', value: fmt(Number(s.thisMonthRevenue || 0)), sub: s.monthGrowth != null ? `${Number(s.monthGrowth) >= 0 ? '+' : ''}${s.monthGrowth}% vs last month` : 'vs last month' },
          { label: 'Net Revenue', value: fmt(Number(s.netRevenuePaise || 0)), sub: `GST collected: ${fmt(Number(s.totalGstPaise || 0))}` },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} className={`rounded-xl border p-5 ${accent ? 'bg-amber-500/10 border-amber-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className={`text-2xl font-bold mb-1 ${accent ? 'text-amber-400' : 'text-white'}`}>{value}</div>
            <div className="text-xs text-zinc-500">{label}</div>
            {sub && <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Transactions', value: String(s.totalPaid || 0), sub: `${s.successRate}% success rate` },
          { label: 'Failed', value: String(s.totalFailed || 0), sub: 'failed payments', danger: true },
          { label: 'Avg. Transaction', value: fmt(Number(s.avgTransactionPaise || 0)), sub: 'per successful payment' },
          { label: 'Active Subs', value: String(s.activeSubscriptions || 0), sub: 'subscribers now' },
        ].map(({ label, value, sub, danger }) => (
          <div key={label} className={`rounded-xl border p-4 bg-zinc-900 ${danger && Number(value) > 0 ? 'border-red-500/20' : 'border-zinc-800'}`}>
            <div className={`text-xl font-bold ${danger && Number(value) > 0 ? 'text-red-400' : 'text-white'}`}>{value}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
            <div className="text-xs text-zinc-600">{sub}</div>
          </div>
        ))}
      </div>

      {/* Monthly revenue chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-4">Monthly Revenue (12 months)</div>
        <div className="flex items-end gap-2 h-32">
          {monthly.map((m, i) => {
            const h = Math.max(4, (m.paise / maxMonthly) * 120);
            const isThisMonth = m.month === new Date().toISOString().slice(0, 7);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute bottom-full mb-1 bg-zinc-800 border border-zinc-700 text-xs text-white px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 z-10 pointer-events-none">
                  {m.month}<br />{fmt(m.paise)} · {m.transactions} tx
                </div>
                <div className={`w-full rounded-t-sm transition-colors ${isThisMonth ? 'bg-amber-500' : 'bg-indigo-500/60 hover:bg-indigo-500'}`} style={{ height: h }} />
                <div className="text-[9px] text-zinc-600">{m.month.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily revenue last 30 days */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-1">Daily Revenue (last 30 days)</div>
        <div className="text-xs text-zinc-500 mb-4">Hover over bars for details</div>
        <div className="flex items-end gap-1 h-20">
          {daily30.map((d, i) => {
            const h = Math.max(2, (d.paise / maxDaily) * 72);
            return (
              <div key={i} className="flex-1 flex flex-col items-center group relative">
                <div className="absolute bottom-full mb-1 bg-zinc-800 border border-zinc-700 text-xs text-white px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 z-10 pointer-events-none">
                  {d.date}<br />{fmt(d.paise)} · {d.failed > 0 && <span className="text-red-400">{d.failed} failed</span>}
                </div>
                <div className={`w-full rounded-sm ${d.paise > 0 ? 'bg-emerald-500/70 hover:bg-emerald-500' : 'bg-zinc-800'}`} style={{ height: Math.max(2, h) }} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by plan */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-4">Revenue by Plan</div>
          <div className="space-y-3">
            {planRev.map((p, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 truncate max-w-[150px]">{p.name || p.id}</span>
                  <span className="text-amber-400 font-semibold">{fmt(p.revenue)}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500/70 rounded-full" style={{ width: `${planRev[0]?.revenue > 0 ? (p.revenue / planRev[0].revenue) * 100 : 0}%` }} />
                </div>
                <div className="text-xs text-zinc-600">{p.transactions} transactions</div>
              </div>
            ))}
            {planRev.length === 0 && <div className="text-sm text-zinc-600">No transactions yet</div>}
          </div>
        </div>

        {/* Top paying users */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-4">Top Paying Users</div>
          <div className="space-y-2">
            {topUsers.slice(0, 8).map((u, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 flex-shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-300 truncate">{u.name || u.email}</div>
                  <div className="text-xs text-zinc-600 truncate">{u.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-amber-400">{fmt(u.revenue)}</div>
                  <div className="text-xs text-zinc-600">{u.transactions} tx</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="text-sm font-medium text-white">Recent Transactions</div>
          {Number(s.totalFailed) > 0 && <span className="text-xs text-red-400">{s.totalFailed} failed</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-800 text-xs text-zinc-500"><th className="text-left px-4 py-3">User</th><th className="text-left px-4 py-3">Plan</th><th className="text-left px-4 py-3">Amount</th><th className="text-left px-4 py-3">GST</th><th className="text-left px-4 py-3">Coupon</th><th className="text-left px-4 py-3">Date</th></tr></thead>
            <tbody className="divide-y divide-zinc-800/50">
              {recentTx.map((t, i) => (
                <tr key={i} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3"><div className="text-zinc-300 text-xs font-medium truncate max-w-[130px]">{String(t.userEmail || '—')}</div><div className="text-zinc-600 text-xs">{String(t.organizationName || '')}</div></td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{String(t.planName || t.productLabel || t.planId || '—')}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-emerald-400">{fmt(Number(t.amountInPaise || 0))}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{fmt(Number(t.gstAmountInPaise || 0))}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{String(t.couponCode || '—')}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{ago(String(t.createdAt || ''))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {recentFailed.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
          <div className="text-sm font-medium text-red-400 mb-3">Failed Payments</div>
          <div className="space-y-2">
            {recentFailed.map((t, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-zinc-400 truncate">{String(t.userEmail || '—')}</span>
                <span className="text-zinc-600">{String(t.planId || '—')}</span>
                <span className="text-red-400 ml-auto">{fmt(Number(t.amountInPaise || 0))}</span>
                <span className="text-zinc-600">{ago(String(t.createdAt || ''))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// GIGS TAB
// ══════════════════════════════════════════════════════════════════════
function GigsTab() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/super-admin/gigs?query=${encodeURIComponent(query)}&status=${statusFilter}`)
      .then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [query, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function gigAction(action: string, gigId: string) {
    if (action === 'delete' && !confirm('Delete this gig?')) return;
    const res = await fetch('/api/super-admin/gigs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, gigId }) });
    if (res.ok) { setMsg('Done'); load(); setTimeout(() => setMsg(''), 2000); }
  }

  if (loading) return <Loader />;
  if (!data) return <ErrorState msg="Failed to load gigs" />;

  const gigs = (data.gigs as Record<string, unknown>[]) || [];
  const catDist = data.categoryDistribution as Record<string, number> || {};
  const statusDist = data.statusDistribution as Record<string, number> || {};
  const recentConnections = (data.recentConnections as Record<string, unknown>[]) || [];
  const recentBids = (data.recentBids as Record<string, unknown>[]) || [];

  return (
    <div className="space-y-5">
      <SectionHeader title="Gig Marketplace Control" sub={`${data.totalGigs as number} gigs · ${data.totalConnections as number} connections · ${data.totalBids as number} bids`} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Total Gigs', data.totalGigs, 'text-white'], ['Connections', data.totalConnections, 'text-sky-400'], ['Bids', data.totalBids, 'text-amber-400'], ['Published', statusDist['published'] || 0, 'text-emerald-400']].map(([k, v, c]) => (
          <div key={k as string} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${c}`}>{String(v)}</div>
            <div className="text-xs text-zinc-500 mt-1">{k as string}</div>
          </div>
        ))}
      </div>

      {/* Category + Status dist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-3">By Category</div>
          <div className="space-y-1.5">
            {Object.entries(catDist).sort(([, a], [, b]) => b - a).slice(0, 8).map(([cat, count]) => (
              <BarRow key={cat} label={cat} value={count} max={Math.max(...Object.values(catDist), 1)} color="bg-indigo-500" />
            ))}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-3">By Status</div>
          <div className="space-y-1.5">
            {Object.entries(statusDist).map(([st, count]) => (
              <BarRow key={st} label={st} value={count} max={Math.max(...Object.values(statusDist), 1)} color={st === 'published' ? 'bg-emerald-500' : st === 'draft' ? 'bg-zinc-600' : 'bg-red-500'} />
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, owner, category…" className="bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 min-w-60" />
        {(['all', 'published', 'draft', 'closed'] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${statusFilter === s ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>{s}</button>
        ))}
        {msg && <span className="text-xs text-emerald-400 self-center">{msg}</span>}
      </div>

      {/* Gig table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-800 text-xs text-zinc-500"><th className="text-left px-4 py-3">Title</th><th className="text-left px-4 py-3">Owner</th><th className="text-left px-4 py-3">Category</th><th className="text-left px-4 py-3">Budget</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Connects</th><th className="text-left px-4 py-3">Bids</th><th className="text-left px-4 py-3">Created</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading && <tr><td colSpan={9} className="text-center py-8 text-zinc-600">Loading…</td></tr>}
              {gigs.slice(0, 100).map((g, i) => (
                <tr key={i} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-zinc-300 font-medium max-w-[180px] truncate">{String(g.title)}</td>
                  <td className="px-4 py-3"><div className="text-xs text-zinc-400 truncate max-w-[100px]">{String(g.ownerName)}</div><div className="text-xs text-zinc-600 truncate max-w-[100px]">{String(g.ownerEmail)}</div></td>
                  <td className="px-4 py-3"><span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{String(g.category)}</span></td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{String(g.budgetLabel || '—')}</td>
                  <td className="px-4 py-3"><span className={badge(String(g.status))}>{String(g.status)}</span></td>
                  <td className="px-4 py-3 text-xs text-sky-400 font-mono">{String(g.connectionCount || 0)}</td>
                  <td className="px-4 py-3 text-xs text-amber-400 font-mono">{String(g.bidCount || 0)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{ago(String(g.createdAt || ''))}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {String(g.status) === 'published' && <button onClick={() => gigAction('unpublish', String(g.id))} className="text-xs text-amber-500 hover:text-amber-400">Close</button>}
                      {String(g.status) !== 'published' && <button onClick={() => gigAction('feature', String(g.id))} className="text-xs text-sky-500 hover:text-sky-400">Feature</button>}
                      <button onClick={() => gigAction('delete', String(g.id))} className="text-xs text-red-500 hover:text-red-400">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-3">Recent Connections</div>
          <div className="space-y-2">
            {recentConnections.slice(0, 8).map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={badge(String(c.status))}>{String(c.status)}</span>
                <span className="text-zinc-300 truncate">{String(c.requesterName)} → {String(c.gigTitle)}</span>
                <span className="text-zinc-600 ml-auto flex-shrink-0">{ago(String(c.createdAt))}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-3">Recent Bids</div>
          <div className="space-y-2">
            {recentBids.slice(0, 8).map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={badge(String(b.status))}>{String(b.status)}</span>
                <span className="text-zinc-300 truncate">{String(b.bidderName)}</span>
                <span className="text-amber-400 font-semibold ml-auto flex-shrink-0">₹{String(b.amountInRupees || 0)}</span>
                <span className="text-zinc-600">{ago(String(b.createdAt))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// PEOPLE TAB
// ══════════════════════════════════════════════════════════════════════
function PeopleTab() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'profiles' | 'resumes'>('profiles');

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/super-admin/people?query=${encodeURIComponent(query)}&view=${view}`)
      .then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [query, view]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loader />;
  if (!data) return <ErrorState msg="Failed to load people" />;

  const people = (data.people as Record<string, unknown>[]) || [];
  const resumes = (data.resumes as Record<string, unknown>[]) || [];
  const stats = data.stats as Record<string, number> || {};
  const locations = (data.locationDistribution as { location: string; count: number }[]) || [];
  const skills = (data.topSkills as { skill: string; count: number }[]) || [];

  return (
    <div className="space-y-5">
      <SectionHeader title="People & Profiles" sub="All users, profiles, and resume directory" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Total People', stats.total, 'text-white'], ['Open to Work', stats.openToWork, 'text-emerald-400'], ['Profile Set Up', stats.profilesSetup, 'text-amber-400'], ['docrud Go', stats.docrudGo, 'text-sky-400']].map(([k, v, c]) => (
          <div key={k as string} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${c}`}>{String(v || 0)}</div>
            <div className="text-xs text-zinc-500 mt-1">{k as string}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-3">Top Locations</div>
          <div className="space-y-1.5">
            {locations.slice(0, 10).map((l, i) => <BarRow key={i} label={l.location} value={l.count} max={locations[0]?.count || 1} color="bg-sky-500" />)}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-3">Top Skills</div>
          <div className="space-y-1.5">
            {skills.slice(0, 10).map((s, i) => <BarRow key={i} label={s.skill} value={s.count} max={skills[0]?.count || 1} color="bg-amber-500" />)}
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, org…" className="bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 min-w-60" />
        {(['profiles', 'resumes'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${view === v ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-zinc-700 text-zinc-500'}`}>{v}</button>
        ))}
      </div>

      {view === 'profiles' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-800 text-xs text-zinc-500"><th className="text-left px-4 py-3">Person</th><th className="text-left px-4 py-3">Headline</th><th className="text-left px-4 py-3">Location</th><th className="text-left px-4 py-3">Skills</th><th className="text-left px-4 py-3">Flags</th><th className="text-left px-4 py-3">Joined</th></tr></thead>
            <tbody className="divide-y divide-zinc-800/50">
              {people.slice(0, 100).map((p, i) => (
                <tr key={i} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3"><div className="text-zinc-300 font-medium text-sm truncate max-w-[120px]">{String(p.name)}</div><div className="text-xs text-zinc-500 truncate max-w-[120px]">{String(p.email)}</div></td>
                  <td className="px-4 py-3 text-xs text-zinc-400 max-w-[160px] truncate">{String(p.headline || '—')}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{String(p.location || '—')}</td>
                  <td className="px-4 py-3"><div className="flex gap-1 flex-wrap max-w-[150px]">{((p.skills as string[]) || []).slice(0, 3).map((s, j) => <span key={j} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{s}</span>)}</div></td>
                  <td className="px-4 py-3"><div className="flex gap-1">{Boolean(p.openToWork) && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Hiring</span>}{Boolean(p.docrudGo) && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Go</span>}</div></td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{ago(String(p.createdAt || ''))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'resumes' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-800 text-xs text-zinc-500"><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Category</th><th className="text-left px-4 py-3">Location</th><th className="text-left px-4 py-3">Views</th><th className="text-left px-4 py-3">Contacts</th><th className="text-left px-4 py-3">Published</th></tr></thead>
            <tbody className="divide-y divide-zinc-800/50">
              {resumes.slice(0, 100).map((r, i) => (
                <tr key={i} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-zinc-300 font-medium">{String(r.displayName)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{String(r.category || '—')}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{String(r.location || '—')}</td>
                  <td className="px-4 py-3 text-xs text-sky-400 font-mono">{String(r.viewCount || 0)}</td>
                  <td className="px-4 py-3 text-xs text-amber-400 font-mono">{String(r.contactCount || 0)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{ago(String(r.createdAt || ''))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SEARCH INTELLIGENCE TAB
// ══════════════════════════════════════════════════════════════════════
function SearchIntelTab() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/super-admin/search?days=${days}`).then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [days]);

  if (loading) return <Loader />;
  if (!data) return <ErrorState msg="Failed to load search data" />;

  const overview = data.overview as Record<string, number> || {};
  const topQueries = (data.topQueries as { query: string; count: number; uniqueUsers: number; lastAt: string }[]) || [];
  const trending = (data.trending as { query: string; thisWeek: number; lastWeek: number; growth: number }[]) || [];
  const zeroCandidates = (data.zeroResultCandidates as string[]) || [];
  const byHour = (data.byHour as number[]) || new Array(24).fill(0);
  const daily = (data.dailySearches as { date: string; count: number; uniqueQueries: number }[]) || [];
  const byRole = data.byRole as Record<string, number> || {};
  const topSearchers = (data.topSearchers as { userId: string; count: number }[]) || [];
  const maxHour = Math.max(...byHour, 1);
  const maxDaily = Math.max(...daily.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <SectionHeader title="Search Intelligence" sub="What users search, trending queries, patterns"
        action={<div className="flex gap-1">{[7, 14, 30, 60].map((d) => <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${days === d ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'text-zinc-500 border-transparent hover:border-zinc-700'}`}>{d}d</button>)}</div>}
      />

      <div className="grid grid-cols-3 gap-4">
        {[['Total Searches', overview.totalSearches, 'text-white'], ['Unique Queries', overview.uniqueQueries, 'text-amber-400'], ['Avg / Day', overview.avgPerDay, 'text-sky-400']].map(([k, v, c]) => (
          <div key={k as string} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${c}`}>{String(v || 0)}</div>
            <div className="text-xs text-zinc-500 mt-1">{k as string}</div>
          </div>
        ))}
      </div>

      {/* Hour heatmap */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-4">Search Volume by Hour of Day</div>
        <div className="flex items-end gap-1 h-16">
          {byHour.map((count, hour) => (
            <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute bottom-full mb-1 bg-zinc-800 border border-zinc-700 text-xs text-white px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 z-10 pointer-events-none">{hour}:00 · {count} searches</div>
              <div className="w-full bg-indigo-500/60 hover:bg-indigo-500 rounded-sm transition-colors" style={{ height: Math.max(2, (count / maxHour) * 56) }} />
              {hour % 4 === 0 && <div className="text-[8px] text-zinc-700">{hour}h</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top queries */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-4">Top Search Queries</div>
          <div className="space-y-2">
            {topQueries.slice(0, 20).map((q, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-zinc-600 w-5 text-right flex-shrink-0">#{i + 1}</span>
                <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-amber-500/70 rounded-full" style={{ width: `${topQueries[0]?.count > 0 ? (q.count / topQueries[0].count) * 100 : 0}%` }} />
                </div>
                <span className="text-sm text-zinc-300 truncate max-w-[120px]">{q.query}</span>
                <span className="text-xs text-zinc-500 flex-shrink-0">{q.count}x</span>
                <span className="text-xs text-zinc-600 flex-shrink-0">{q.uniqueUsers}u</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trending */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-4">Trending This Week</div>
          <div className="space-y-2">
            {trending.slice(0, 12).map((t, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-zinc-600 w-4">#{i + 1}</span>
                <span className="text-zinc-300 flex-1 truncate">{t.query}</span>
                <span className="text-emerald-400 font-semibold">{t.thisWeek}x</span>
                <span className={`${t.growth >= 0 ? 'text-emerald-400' : 'text-red-400'} font-mono`}>{t.growth >= 0 ? '↑' : '↓'}{Math.abs(Math.round(t.growth))}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Zero result candidates */}
        {zeroCandidates.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="text-sm font-medium text-white mb-1">Possible Zero-Result Searches</div>
            <div className="text-xs text-zinc-500 mb-3">Queries searched once — may indicate content gaps</div>
            <div className="flex flex-wrap gap-2">
              {zeroCandidates.map((q, i) => <span key={i} className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-full">{q}</span>)}
            </div>
          </div>
        )}

        {/* By role */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-4">Searches by User Role</div>
          <div className="space-y-2">
            {Object.entries(byRole).sort(([, a], [, b]) => b - a).map(([role, count]) => (
              <BarRow key={role} label={role} value={count} max={Math.max(...Object.values(byRole), 1)} color="bg-sky-500" />
            ))}
          </div>
        </div>
      </div>

      {/* Daily search chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-4">Daily Search Volume</div>
        <div className="flex items-end gap-1 h-20">
          {daily.map((d, i) => (
            <div key={i} className="flex-1 group relative">
              <div className="absolute bottom-full mb-1 bg-zinc-800 border border-zinc-700 text-xs text-white px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 z-10 pointer-events-none">{d.date}<br />{d.count} searches · {d.uniqueQueries} unique</div>
              <div className="w-full bg-indigo-500/60 hover:bg-indigo-500 rounded-sm transition-colors" style={{ height: Math.max(2, (d.count / maxDaily) * 72) }} />
            </div>
          ))}
        </div>
      </div>

      {topSearchers.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-3">Top Searching Users</div>
          <div className="flex flex-wrap gap-3">
            {topSearchers.map((u, i) => (
              <div key={i} className="bg-zinc-800 rounded-lg px-3 py-2 text-xs">
                <div className="text-zinc-400 font-mono">{u.userId.slice(0, 12)}…</div>
                <div className="text-amber-400 font-semibold mt-0.5">{u.count} searches</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SECURITY TAB
// ══════════════════════════════════════════════════════════════════════
function SecurityTab() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/super-admin/security').then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function ipAction(action: string, ip: string) {
    const res = await fetch('/api/super-admin/security', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ip }) });
    if (res.ok) { setMsg(`IP ${action === 'block' ? 'blocked' : 'unblocked'}`); load(); setTimeout(() => setMsg(''), 2000); }
  }

  if (loading) return <Loader />;
  if (!data) return <ErrorState msg="Failed to load security data" />;

  const stats = data.stats as Record<string, number> || {};
  const suspicious = (data.suspicious as Record<string, unknown>[]) || [];
  const topIps = (data.topIps as { ip: string; count: number; blocked: boolean }[]) || [];
  const blocked = (data.blocklist as { ips: string[]; count: number }) || { ips: [], count: 0 };
  const botCandidates = (data.botCandidates as { ip: string; events: number }[]) || [];

  return (
    <div className="space-y-5">
      <SectionHeader title="Security Center" sub="IP monitoring, bot detection, and access control" />
      {msg && <div className="text-xs text-emerald-400">{msg}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Unique IPs (24h)', stats.uniqueIps24h, 'text-white'], ['Events (24h)', stats.totalEvents24h, 'text-sky-400'], ['Suspicious IPs', stats.suspiciousCount, stats.suspiciousCount > 0 ? 'text-amber-400' : 'text-zinc-400'], ['Blocked IPs', stats.blockedCount, stats.blockedCount > 0 ? 'text-red-400' : 'text-zinc-400']].map(([k, v, c]) => (
          <div key={k as string} className={`bg-zinc-900 border ${Number(v) > 0 && (k as string).includes('Suspicious') ? 'border-amber-500/20' : Number(v) > 0 && (k as string).includes('Blocked') ? 'border-red-500/20' : 'border-zinc-800'} rounded-xl p-4 text-center`}>
            <div className={`text-2xl font-bold ${c}`}>{String(v || 0)}</div>
            <div className="text-xs text-zinc-500 mt-1">{k as string}</div>
          </div>
        ))}
      </div>

      {/* Suspicious IPs */}
      {suspicious.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
          <div className="text-sm font-medium text-amber-400 mb-4">⚠ Suspicious IPs (80+ events in 24h)</div>
          <div className="space-y-3">
            {suspicious.map((s, i) => (
              <div key={i} className="bg-zinc-900 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-white">{String(s.ip)}</span>
                    {Boolean(s.isBlocked) && <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">Blocked</span>}
                  </div>
                  <div className="flex gap-2">
                    {!s.isBlocked ? (
                      <button onClick={() => ipAction('block', String(s.ip))} className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 px-3 py-1 rounded-lg transition-all">Block IP</button>
                    ) : (
                      <button onClick={() => ipAction('unblock', String(s.ip))} className="text-xs bg-zinc-700/50 border border-zinc-600/20 text-zinc-400 hover:bg-zinc-700 px-3 py-1 rounded-lg transition-all">Unblock</button>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-zinc-500">
                  <span>{Number(s.events24h)} events</span>
                  <span>{Number(s.uniqueUsers)} users</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {((s.topPaths as { path: string; count: number }[]) || []).map((p, j) => (
                    <span key={j} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">{p.path} ({p.count})</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocked IPs */}
      {blocked.ips.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
          <div className="text-sm font-medium text-red-400 mb-3">Blocked IPs ({blocked.count})</div>
          <div className="flex flex-wrap gap-2">
            {blocked.ips.map((ip, i) => (
              <div key={i} className="flex items-center gap-2 bg-zinc-900 rounded-lg px-3 py-1.5">
                <span className="font-mono text-xs text-zinc-300">{ip}</span>
                <button onClick={() => ipAction('unblock', ip)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bot candidates */}
      {botCandidates.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-3">Possible Bots (no auth, high volume)</div>
          <div className="space-y-2">
            {botCandidates.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="font-mono text-xs text-zinc-400">{b.ip}</span>
                <span className="text-xs text-zinc-600">{b.events} events</span>
                <button onClick={() => ipAction('block', b.ip)} className="ml-auto text-xs text-red-500 hover:text-red-400 transition-colors">Block</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top IPs 7d */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-4">Top IPs (7 days)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-800 text-xs text-zinc-500"><th className="text-left py-2">IP</th><th className="text-left py-2">Events</th><th className="text-left py-2">Status</th><th className="py-2" /></tr></thead>
            <tbody className="divide-y divide-zinc-800/50">
              {topIps.slice(0, 30).map((ip, i) => (
                <tr key={i} className="hover:bg-zinc-800/30">
                  <td className="py-2 font-mono text-xs text-zinc-300">{ip.ip}</td>
                  <td className="py-2 text-xs text-zinc-400">{ip.count}</td>
                  <td className="py-2">{ip.blocked ? <span className="text-xs text-red-400">Blocked</span> : <span className="text-xs text-zinc-600">—</span>}</td>
                  <td className="py-2 text-right">
                    {!ip.blocked ? <button onClick={() => ipAction('block', ip.ip)} className="text-xs text-red-500 hover:text-red-400">Block</button>
                      : <button onClick={() => ipAction('unblock', ip.ip)} className="text-xs text-zinc-500 hover:text-zinc-400">Unblock</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// GEOGRAPHY TAB
// ══════════════════════════════════════════════════════════════════════
function GeographyTab() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/super-admin/geography?days=${days}`).then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [days]);

  if (loading) return <Loader />;
  if (!data) return <ErrorState msg="Failed to load geography data" />;

  const overview = data.overview as Record<string, number> || {};
  const deviceDist = (data.deviceDistribution as { device: string; count: number }[]) || [];
  const osDist = (data.osDistribution as { os: string; count: number }[]) || [];
  const browserDist = (data.browserDistribution as { browser: string; count: number }[]) || [];
  const surfaceDist = (data.surfaceDistribution as { surface: string; count: number }[]) || [];
  const topIps = (data.topIps as { ip: string; count: number; percent: number }[]) || [];
  const topReferrers = (data.topReferrers as { referrer: string; count: number }[]) || [];
  const heatmap = (data.heatmap as number[][]) || [];
  const dailyVisitors = (data.dailyVisitors as { date: string; visitors: number; sessions: number }[]) || [];
  const live = data.live as { visitors: number } || { visitors: 0 };
  const maxHeatmap = heatmap.length > 0 ? Math.max(...heatmap.flat(), 1) : 1;
  const maxDaily = Math.max(...dailyVisitors.map((d) => d.visitors), 1);
  const days_labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <SectionHeader title="Geography & Behavior" sub="Device mix, sessions, traffic patterns, visitor heatmap"
        action={<div className="flex gap-1 items-center">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mr-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/><span className="text-xs text-emerald-400 font-medium">{live.visitors} live</span></div>
          {[7, 14, 30, 60].map((d) => <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${days === d ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'text-zinc-500 border-transparent hover:border-zinc-700'}`}>{d}d</button>)}
        </div>}
      />

      {/* Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Total Events', overview.totalEvents, 'text-white'], ['Unique Visitors', overview.uniqueVisitors, 'text-amber-400'], ['Sessions', overview.uniqueSessions, 'text-sky-400'], ['Bounce Rate', `${overview.bounceRate || 0}%`, overview.bounceRate > 60 ? 'text-red-400' : 'text-emerald-400']].map(([k, v, c]) => (
          <div key={k as string} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${c}`}>{String(v || 0)}</div>
            <div className="text-xs text-zinc-500 mt-1">{k as string}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-indigo-400">{Math.floor((overview.avgSessionSeconds || 0) / 60)}m {(overview.avgSessionSeconds || 0) % 60}s</div>
          <div className="text-xs text-zinc-500 mt-1">Avg. Session Duration</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-zinc-400">{overview.localEvents || 0}</div>
          <div className="text-xs text-zinc-500 mt-1">Local/Dev Events</div>
        </div>
      </div>

      {/* Daily visitors */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-4">Daily Unique Visitors</div>
        <div className="flex items-end gap-1 h-20">
          {dailyVisitors.map((d, i) => (
            <div key={i} className="flex-1 group relative">
              <div className="absolute bottom-full mb-1 bg-zinc-800 border border-zinc-700 text-xs text-white px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 z-10 pointer-events-none">{d.date}<br />{d.visitors} visitors · {d.sessions} sessions</div>
              <div className="w-full bg-sky-500/60 hover:bg-sky-500 rounded-sm transition-colors" style={{ height: Math.max(2, (d.visitors / maxDaily) * 72) }} />
            </div>
          ))}
        </div>
      </div>

      {/* Device + OS + Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { title: 'Devices', items: deviceDist.map((d) => ({ label: d.device, value: d.count })) },
          { title: 'Operating Systems', items: osDist.map((d) => ({ label: d.os, value: d.count })) },
          { title: 'Browsers', items: browserDist.map((d) => ({ label: d.browser, value: d.count })) },
        ].map(({ title, items }) => (
          <div key={title} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="text-sm font-medium text-white mb-4">{title}</div>
            <div className="space-y-2">
              {items.map((item, i) => <BarRow key={i} label={item.label} value={item.value} max={items[0]?.value || 1} color={i === 0 ? 'bg-amber-500' : 'bg-indigo-500/70'} />)}
            </div>
          </div>
        ))}
      </div>

      {/* Activity heatmap (day × hour) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-4">Activity Heatmap (Day × Hour)</div>
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div className="flex gap-1 mb-1">
              <div className="w-8" />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="w-5 text-[8px] text-zinc-700 text-center">{h % 6 === 0 ? `${h}h` : ''}</div>
              ))}
            </div>
            {heatmap.map((row, day) => (
              <div key={day} className="flex gap-1 mb-0.5 items-center">
                <div className="w-8 text-[9px] text-zinc-600 text-right pr-1">{days_labels[day]}</div>
                {row.map((val, hour) => {
                  const intensity = val / maxHeatmap;
                  const bg = intensity === 0 ? 'bg-zinc-800' : intensity < 0.25 ? 'bg-amber-900/60' : intensity < 0.5 ? 'bg-amber-700/70' : intensity < 0.75 ? 'bg-amber-500/80' : 'bg-amber-400';
                  return <div key={hour} title={`${days_labels[day]} ${hour}:00 — ${val} events`} className={`w-5 h-5 rounded-sm ${bg} cursor-default transition-colors`} />;
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-zinc-600">
          <span>Low</span>
          <div className="flex gap-0.5">{['bg-zinc-800', 'bg-amber-900/60', 'bg-amber-700/70', 'bg-amber-500/80', 'bg-amber-400'].map((c, i) => <div key={i} className={`w-4 h-3 rounded-sm ${c}`} />)}</div>
          <span>High</span>
        </div>
      </div>

      {/* Referrers + IPs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-4">Top Referrers</div>
          <div className="space-y-2">
            {topReferrers.slice(0, 12).map((r, i) => <BarRow key={i} label={r.referrer} value={r.count} max={topReferrers[0]?.count || 1} color={r.referrer === 'direct' ? 'bg-emerald-500' : 'bg-sky-500'} />)}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-medium text-white mb-4">Top IP Addresses</div>
          <div className="space-y-1.5">
            {topIps.slice(0, 15).map((ip, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-zinc-400 w-28 truncate">{ip.ip}</span>
                <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-indigo-500/70 rounded-full" style={{ width: `${ip.percent}%` }} />
                </div>
                <span className="text-zinc-500 w-8 text-right">{ip.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Surface distribution */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-4">Traffic by Surface</div>
        <div className="grid grid-cols-2 gap-3">
          {surfaceDist.map((s, i) => (
            <div key={i} className="bg-zinc-800 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-white">{s.count.toLocaleString()}</div>
              <div className="text-xs text-zinc-500 mt-0.5 capitalize">{s.surface}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// INTEGRATIONS TAB
// ══════════════════════════════════════════════════════════════════════
function IntegrationsTab() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [msg, setMsg] = useState('');
  const [gaForm, setGaForm] = useState({ enabled: false, measurementId: '', apiSecret: '' });
  const [rzForm, setRzForm] = useState({ enabled: false, keyId: '', keySecret: '', webhookSecret: '', testMode: true });
  const [slackForm, setSlackForm] = useState({ enabled: false, webhookUrl: '', channel: '#alerts', notifyOnSignup: true, notifyOnPayment: true, notifyOnAlert: true });
  const [newWebhook, setNewWebhook] = useState({ url: '', label: '', events: '' });

  const load = () => {
    setLoading(true);
    fetch('/api/super-admin/integrations').then((r) => r.json()).then((d) => {
      setData(d);
      if (d.googleAnalytics) setGaForm({ enabled: d.googleAnalytics.enabled, measurementId: d.googleAnalytics.measurementId || '', apiSecret: '' });
      if (d.razorpay) setRzForm({ enabled: d.razorpay.enabled, keyId: d.razorpay.keyId || '', keySecret: '', webhookSecret: '', testMode: d.razorpay.testMode });
      if (d.slack) setSlackForm({ enabled: d.slack.enabled, webhookUrl: '', channel: d.slack.channel || '#alerts', notifyOnSignup: d.slack.notifyOnSignup, notifyOnPayment: d.slack.notifyOnPayment, notifyOnAlert: d.slack.notifyOnAlert });
    }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function doAction(action: string, payload: object) {
    setSaving(action);
    const res = await fetch('/api/super-admin/integrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data: payload }) });
    const d = await res.json();
    setSaving('');
    if (res.ok) { setMsg(d.success ? 'Saved' : d.status === 204 ? 'Sent!' : 'Saved'); load(); }
    else setMsg(d.error || 'Failed');
    setTimeout(() => setMsg(''), 3000);
  }

  if (loading) return <Loader />;

  const envStatus = data?.envStatus as Record<string, boolean> || {};
  const webhooks = (data?.webhooks as Record<string, unknown>[]) || [];

  return (
    <div className="space-y-6">
      <SectionHeader title="Integrations" sub="Google Analytics, Razorpay, Slack, Webhooks" />
      {msg && <div className={`text-xs px-3 py-2 rounded-lg border ${msg.includes('ail') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>{msg}</div>}

      {/* Env status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-4">Environment Variables</div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(envStatus).map(([key, set]) => (
            <div key={key} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
              <div className={`w-2 h-2 rounded-full ${set ? 'bg-emerald-500' : 'bg-red-500/60'}`} />
              <span className="text-xs font-mono text-zinc-400">{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Google Analytics */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Google Analytics 4</div>
            <div className="text-xs text-zinc-500">Track events via GA4 Measurement Protocol</div>
          </div>
          <div className="flex items-center gap-3">
            {Boolean(data?.googleAnalytics && (data.googleAnalytics as unknown as Record<string, boolean>).apiSecretConfigured) && <span className="text-xs text-emerald-400">Configured</span>}
            <Toggle enabled={gaForm.enabled} onChange={(v) => setGaForm({ ...gaForm, enabled: v })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[['Measurement ID', 'measurementId', 'G-XXXXXXXXXX'], ['API Secret', 'apiSecret', '••••••']].map(([label, key, ph]) => (
            <div key={key}><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">{label}</label><input value={String((gaForm as unknown as Record<string, unknown>)[key] ?? '')} onChange={(e) => setGaForm({ ...gaForm, [key]: e.target.value })} placeholder={ph} className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" /></div>
          ))}
        </div>
        <div className="flex gap-2">
          <button disabled={saving === 'update_google_analytics'} onClick={() => doAction('update_google_analytics', gaForm)} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold rounded-lg transition-all">Save</button>
          <button disabled={saving === 'test_google_analytics'} onClick={() => doAction('test_google_analytics', {})} className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded-lg transition-all">Test Ping</button>
        </div>
      </div>

      {/* Razorpay */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Razorpay</div>
            <div className="text-xs text-zinc-500">Payment gateway configuration</div>
          </div>
          <Toggle enabled={rzForm.enabled} onChange={(v) => setRzForm({ ...rzForm, enabled: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[['Key ID', 'keyId', 'rzp_live_...'], ['Key Secret', 'keySecret', '••••••'], ['Webhook Secret', 'webhookSecret', '••••••']].map(([label, key, ph]) => (
            <div key={key}><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">{label}</label><input value={String((rzForm as unknown as Record<string, unknown>)[key] ?? '')} onChange={(e) => setRzForm({ ...rzForm, [key]: e.target.value })} placeholder={ph} className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" /></div>
          ))}
        </div>
        <div className="flex items-center gap-2"><Toggle enabled={rzForm.testMode} onChange={(v) => setRzForm({ ...rzForm, testMode: v })} /><span className="text-sm text-zinc-400">Test Mode</span></div>
        <button disabled={saving === 'update_razorpay'} onClick={() => doAction('update_razorpay', rzForm)} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold rounded-lg transition-all">Save Razorpay Config</button>
      </div>

      {/* Slack */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Slack Notifications</div>
            <div className="text-xs text-zinc-500">Get alerts in Slack for signups, payments, and anomalies</div>
          </div>
          <Toggle enabled={slackForm.enabled} onChange={(v) => setSlackForm({ ...slackForm, enabled: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">Webhook URL</label><input value={slackForm.webhookUrl} onChange={(e) => setSlackForm({ ...slackForm, webhookUrl: e.target.value })} placeholder="https://hooks.slack.com/services/..." className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" /></div>
          <div><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">Channel</label><input value={slackForm.channel} onChange={(e) => setSlackForm({ ...slackForm, channel: e.target.value })} placeholder="#alerts" className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" /></div>
        </div>
        <div className="flex flex-wrap gap-4">
          {[['Signups', 'notifyOnSignup'], ['Payments', 'notifyOnPayment'], ['Alerts', 'notifyOnAlert']].map(([label, key]) => (
            <div key={key} className="flex items-center gap-2"><Toggle enabled={Boolean((slackForm as unknown as Record<string, unknown>)[key])} onChange={(v) => setSlackForm({ ...slackForm, [key]: v })} /><span className="text-sm text-zinc-400">{label}</span></div>
          ))}
        </div>
        <div className="flex gap-2">
          <button disabled={saving === 'update_slack'} onClick={() => doAction('update_slack', slackForm)} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold rounded-lg transition-all">Save</button>
          <button disabled={saving === 'test_slack'} onClick={() => doAction('test_slack', {})} className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded-lg transition-all">Send Test</button>
        </div>
      </div>

      {/* Webhooks */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="text-sm font-medium text-white">Custom Webhooks</div>
        {webhooks.length > 0 && (
          <div className="space-y-2">
            {webhooks.map((w, i) => (
              <div key={i} className="flex items-center gap-3 bg-zinc-800 rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{String(w.label)}</div>
                  <div className="text-xs text-zinc-500 font-mono truncate">{String(w.url)}</div>
                </div>
                <span className={badge(w.enabled ? 'active' : 'disabled')}>{w.enabled ? 'active' : 'paused'}</span>
                <button onClick={() => doAction('toggle_webhook', { id: w.id })} className="text-xs text-zinc-500 hover:text-zinc-300">{w.enabled ? 'Pause' : 'Resume'}</button>
                <button onClick={() => doAction('delete_webhook', { id: w.id })} className="text-xs text-red-500 hover:text-red-400">Delete</button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
          <div className="col-span-2"><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">Endpoint URL</label><input value={newWebhook.url} onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })} placeholder="https://your-server.com/webhook" className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" /></div>
          <div><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">Label</label><input value={newWebhook.label} onChange={(e) => setNewWebhook({ ...newWebhook, label: e.target.value })} placeholder="My webhook" className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" /></div>
          <div><label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">Events (comma separated)</label><input value={newWebhook.events} onChange={(e) => setNewWebhook({ ...newWebhook, events: e.target.value })} placeholder="user.created, payment.paid" className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" /></div>
        </div>
        <button onClick={() => doAction('add_webhook', { url: newWebhook.url, label: newWebhook.label, events: newWebhook.events.split(',').map((e) => e.trim()).filter(Boolean) })} className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded-lg transition-all">Add Webhook</button>
      </div>
    </div>
  );
}

// ── Early Access Tab ──────────────────────────────────────────────────────────
function EarlyAccessTab() {
  type EAView = 'overview' | 'waitlist' | 'wishes' | 'manage';
  const [view, setView] = useState<EAView>('overview');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [drillData, setDrillData] = useState<any>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [editFeature, setEditFeature] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newFeat, setNewFeat] = useState({ title: '', tagline: '', description: '', category: '', eta: 'Q3 2026', icon: 'Star', accentColor: 'amber', tags: '' });

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/super-admin/early-access?view=overview', { credentials: 'include' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      setData(d);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadDrill = async (featureId: string, type: 'waitlist' | 'wishes') => {
    setDrillLoading(true); setDrillData(null);
    try {
      const res = await fetch(`/api/super-admin/early-access?view=${type}&featureId=${featureId}`, { credentials: 'include' });
      const d = await res.json();
      setDrillData(d);
    } catch { setDrillData(null); }
    finally { setDrillLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (selectedFeature && (view === 'waitlist' || view === 'wishes')) {
      loadDrill(selectedFeature, view);
    }
  }, [selectedFeature, view]);

  const doAction = async (action: string, payload: any) => {
    setSaving(action);
    try {
      const res = await fetch('/api/super-admin/early-access', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data: payload }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      await load();
      setEditFeature(null); setShowAdd(false);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(''); }
  };

  const ACCENT_COLORS = ['amber', 'sky', 'violet', 'rose', 'cyan', 'emerald', 'yellow', 'teal', 'indigo', 'orange', 'pink', 'fuchsia'];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="p-4 text-red-400 text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Early Bird Access</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Waitlists, wishes, and upcoming feature management</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/early-access" target="_blank" className="px-3 py-1.5 text-xs border border-zinc-700 text-zinc-400 rounded-lg hover:border-zinc-600 transition-all">View Page ↗</a>
          <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-all">+ Add Feature</button>
        </div>
      </div>

      {/* Stats */}
      {data?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Features', value: data.stats.totalFeatures, color: 'text-white' },
            { label: 'Early Birds', value: data.stats.totalWaitlist, color: 'text-amber-400' },
            { label: 'Wishes Submitted', value: data.stats.totalWishes, color: 'text-rose-400' },
            { label: 'Unique Emails', value: data.stats.uniqueEmails, color: 'text-sky-400' },
          ].map((s) => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value?.toLocaleString() ?? '—'}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Feature list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Upcoming Features</span>
          <span className="text-xs text-zinc-500">{data?.features?.length ?? 0} features</span>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {(data?.features || []).map((f: any) => (
            <div key={f.id} className="px-4 py-3 hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{f.accentColor?.slice(0,2)}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{f.title}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${f.status === 'live' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : f.status === 'beta' ? 'bg-sky-500/15 text-sky-400 border-sky-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>{f.status?.replace('_', ' ')}</span>
                      {f.featured && <span className="text-[10px] text-amber-400">★ Featured</span>}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{f.tagline}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-zinc-600">{f.category}</span>
                      <span className="text-xs text-zinc-600">ETA: {f.eta}</span>
                      <button onClick={() => { setSelectedFeature(f.id); setView('waitlist'); }} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                        {f.waitlistVerified} waitlisted
                      </button>
                      <button onClick={() => { setSelectedFeature(f.id); setView('wishes'); }} className="text-xs text-rose-400 hover:text-rose-300 transition-colors">
                        {f.wishCount} wishes
                      </button>
                    </div>
                    {f.recentSignups?.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-[10px] text-zinc-600">Recent:</span>
                        {f.recentSignups.map((s: any) => (
                          <span key={s.email} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{s.email.split('@')[0]}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setEditFeature(f)} className="text-xs px-2.5 py-1 border border-zinc-700 text-zinc-400 rounded-lg hover:border-zinc-600 transition-all">Edit</button>
                  <button onClick={() => { if (confirm(`Delete "${f.title}"?`)) doAction('delete_feature', { id: f.id }); }} className="text-xs px-2.5 py-1 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/10 transition-all">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drilldown: Waitlist / Wishes */}
      {selectedFeature && (view === 'waitlist' || view === 'wishes') && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { setSelectedFeature(null); setView('overview'); }} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← Back</button>
              <span className="text-sm font-semibold text-white capitalize">{view} — {data?.features?.find((f: any) => f.id === selectedFeature)?.title}</span>
            </div>
            <div className="flex gap-1.5">
              {(['waitlist', 'wishes'] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`px-2.5 py-1 text-xs rounded-lg border transition-all capitalize ${view === v ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>{v}</button>
              ))}
            </div>
          </div>
          {drillLoading ? (
            <div className="flex items-center justify-center h-24"><div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : view === 'waitlist' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/50 border-b border-zinc-800">
                  <tr>{['Name', 'Email', 'Verified', 'Joined'].map((h) => <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {(drillData?.entries || []).map((e: any) => (
                    <tr key={e.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-4 py-2.5 text-zinc-300 text-sm">{e.name || '—'}</td>
                      <td className="px-4 py-2.5 text-zinc-400 text-xs font-mono">{e.email}</td>
                      <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${e.verified ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-600 border-zinc-700'}`}>{e.verified ? 'Verified' : 'Pending'}</span></td>
                      <td className="px-4 py-2.5 text-zinc-600 text-xs">{new Date(e.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {!drillData?.entries?.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-600 text-sm">No entries yet</td></tr>}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {(drillData?.wishes || []).map((w: any) => (
                <div key={w.id} className="px-4 py-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-semibold text-white">{w.name || 'Anonymous'}</span>
                      <span className="text-xs text-zinc-500 ml-2">{w.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[1,2,3,4,5].map((n) => <span key={n} className={`text-xs ${n <= w.excitement ? 'text-amber-400' : 'text-zinc-800'}`}>★</span>)}
                      <span className="text-xs text-zinc-500 ml-1">{new Date(w.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {w.currentSoftware && <p className="text-xs text-zinc-500"><span className="font-semibold text-zinc-400">Current tool:</span> {w.currentSoftware}</p>}
                  <div className="bg-zinc-800/40 rounded-lg p-3 space-y-2">
                    <div><p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-1">Pain points</p><p className="text-xs text-zinc-300 leading-relaxed">{w.painPoints}</p></div>
                    <div className="border-t border-zinc-700/40 pt-2"><p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-1">Expected features</p><p className="text-xs text-zinc-300 leading-relaxed">{w.expectedFeatures}</p></div>
                  </div>
                </div>
              ))}
              {!drillData?.wishes?.length && <div className="px-4 py-8 text-center text-zinc-600 text-sm">No wishes submitted yet</div>}
            </div>
          )}
        </div>
      )}

      {/* Edit Feature Modal */}
      {editFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit Feature</h3>
              <button onClick={() => setEditFeature(null)} className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors text-zinc-400">✕</button>
            </div>
            {[['Title', 'title'], ['Tagline', 'tagline'], ['Category', 'category'], ['ETA', 'eta'], ['Icon', 'icon']].map(([label, key]) => (
              <div key={key}>
                <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">{label}</label>
                <input value={String(editFeature[key] ?? '')} onChange={(e) => setEditFeature({ ...editFeature, [key]: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
              </div>
            ))}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">Description</label>
              <textarea rows={3} value={String(editFeature.description ?? '')} onChange={(e) => setEditFeature({ ...editFeature, description: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none" />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">Status</label>
              <select value={String(editFeature.status ?? 'coming_soon')} onChange={(e) => setEditFeature({ ...editFeature, status: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
                {['coming_soon', 'beta', 'live'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">Accent Color</label>
              <div className="flex flex-wrap gap-1.5">
                {ACCENT_COLORS.map((c) => (
                  <button key={c} onClick={() => setEditFeature({ ...editFeature, accentColor: c })} className={`px-2 py-1 text-[10px] rounded border transition-all ${editFeature.accentColor === c ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-zinc-700 text-zinc-500'}`}>{c}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="feat-featured" checked={Boolean(editFeature.featured)} onChange={(e) => setEditFeature({ ...editFeature, featured: e.target.checked })} className="rounded" />
              <label htmlFor="feat-featured" className="text-sm text-zinc-300">Featured (shows star badge)</label>
            </div>
            <div className="flex gap-2 pt-2">
              <button disabled={Boolean(saving)} onClick={() => doAction('update_feature', editFeature)} className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg disabled:opacity-50 transition-all">{saving ? 'Saving…' : 'Save changes'}</button>
              <button onClick={() => setEditFeature(null)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Feature Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add New Feature</h3>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors text-zinc-400">✕</button>
            </div>
            {([['Title *', 'title', 'AI Document Generation'], ['Tagline *', 'tagline', 'Generate any document with one prompt'], ['Category', 'category', 'AI & Automation'], ['ETA', 'eta', 'Q3 2026'], ['Icon', 'icon', 'Sparkles']] as [string, keyof typeof newFeat, string][]).map(([label, key, ph]) => (
              <div key={key}>
                <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">{label}</label>
                <input value={String(newFeat[key])} onChange={(e) => setNewFeat({ ...newFeat, [key]: e.target.value })} placeholder={ph} className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
              </div>
            ))}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">Description</label>
              <textarea rows={3} value={newFeat.description} onChange={(e) => setNewFeat({ ...newFeat, description: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none" />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">Accent Color</label>
              <div className="flex flex-wrap gap-1.5">
                {ACCENT_COLORS.map((c) => (
                  <button key={c} onClick={() => setNewFeat({ ...newFeat, accentColor: c })} className={`px-2 py-1 text-[10px] rounded border transition-all ${newFeat.accentColor === c ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-zinc-700 text-zinc-500'}`}>{c}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button disabled={Boolean(saving)} onClick={() => doAction('add_feature', { ...newFeat, tags: newFeat.tags.split(',').map((t) => t.trim()).filter(Boolean) })} className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg disabled:opacity-50 transition-all">{saving ? 'Adding…' : 'Add feature'}</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
