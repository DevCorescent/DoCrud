'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Ban,
  BarChart3,
  Clock3,
  Globe2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PlatformConfig, PlatformFeatureControlKey, SaasOverview, UserIntelligenceOverview } from '@/types/document';

type TelemetryOverview = {
  generatedAt: string;
  traffic: {
    pageViews24h: number;
    pageViews7d: number;
    uniqueVisitors24h: number;
    uniqueVisitors7d: number;
    sessions24h: number;
    sessions7d: number;
    avgSessionSeconds24h: number;
    bounceRate24h: number;
    liveVisitors5m: number;
    ctaClicks24h: number;
    searches24h: number;
    signups24h: number;
    logins24h: number;
    topPages24h: Array<{ path: string; views: number }>;
    topReferrers24h: Array<{ referrer: string; views: number }>;
    deviceMix24h: Array<{ device: 'mobile' | 'desktop' | 'bot' | 'unknown'; views: number }>;
    topCtas24h: Array<{ ctaId: string; clicks: number }>;
    topSearches24h: Array<{ query: string; searches: number }>;
    topWorkspaceFeatures24h: Array<{ featureId: string; opens: number }>;
  };
  behaviour: {
    avgTimeOnPageSeconds24h: number;
    returningVisitorRate7d: number;
    topExitPages24h: Array<{ path: string; exits: number }>;
    funnels: Array<{ id: string; label: string; steps: Array<{ label: string; count: number; rateFromPrev: number }> }>;
  };
  security: {
    blockedIps: string[];
    suspiciousIps24h: Array<{ ip: string; events: number; topPaths: Array<{ path: string; count: number }> }>;
  };
};

type LoadState = {
  saas?: SaasOverview;
  intel?: UserIntelligenceOverview;
  platform?: PlatformConfig;
  telemetry?: TelemetryOverview;
};

function formatCompactNumber(value: number) {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\\.0$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\\.0$/, '')}k`;
  return String(Math.round(value));
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function statusPill(status: 'healthy' | 'watch' | 'critical' | string) {
  if (status === 'critical') return 'border-rose-200 bg-rose-50/80 text-rose-900';
  if (status === 'watch') return 'border-amber-200 bg-amber-50/80 text-amber-900';
  return 'border-emerald-200 bg-emerald-50/80 text-emerald-900';
}

function priorityPill(priority: 'high' | 'medium' | 'low' | string) {
  if (priority === 'high') return 'bg-rose-100/80 text-rose-700';
  if (priority === 'medium') return 'bg-amber-100/80 text-amber-700';
  return 'bg-slate-100/80 text-slate-700';
}

function prettyFeatureLabel(key: string) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\\bai\\b/gi, 'AI')
    .replace(/\\bpdf\\b/gi, 'PDF')
    .replace(/\\bqr\\b/gi, 'QR')
    .replace(/\\bats\\b/gi, 'ATS')
    .replace(/\\bkyc\\b/gi, 'KYC')
    .replace(/\\s+/g, ' ')
    .trim()
    .replace(/^\\w/, (m) => m.toUpperCase());
}

export default function SuperAdminCommandCenter() {
  const [tab, setTab] = useState<'overview' | 'traffic' | 'behaviour' | 'events' | 'tenants' | 'security' | 'features'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({});

  const [featureQuery, setFeatureQuery] = useState('');
  const [featureDraft, setFeatureDraft] = useState<Record<PlatformFeatureControlKey, boolean> | null>(null);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [featureSaveMessage, setFeatureSaveMessage] = useState<string | null>(null);

  const [tenantQuery, setTenantQuery] = useState('');
  const [ipDraft, setIpDraft] = useState('');
  const [savingBlocklist, setSavingBlocklist] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);

  const [eventFilterSurface, setEventFilterSurface] = useState<'all' | 'public' | 'workspace'>('all');
  const [eventFilterType, setEventFilterType] = useState<'all' | 'page_view' | 'page_leave' | 'cta_click' | 'search' | 'login' | 'signup' | 'feature_open'>('all');
  const [eventFilterPath, setEventFilterPath] = useState('');
  const [eventLoading, setEventLoading] = useState(false);
  const [events, setEvents] = useState<Array<{ id: string; type: string; surface: string; path: string; createdAt: string; ip?: string; visitorId?: string; sessionId?: string; featureId?: string; ctaId?: string; query?: string; userRole?: string }>>([]);
  const [eventMessage, setEventMessage] = useState<string | null>(null);

  const refreshTimerRef = useRef<number | null>(null);
  const savingTimerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [saasRes, intelRes, platformRes, telemetryRes] = await Promise.all([
        fetch('/api/saas/overview', { cache: 'no-store' }),
        fetch('/api/admin/user-intelligence', { cache: 'no-store' }),
        fetch('/api/platform', { cache: 'no-store' }),
        fetch('/api/admin/telemetry/overview', { cache: 'no-store' }),
      ]);

      if (!saasRes.ok) throw new Error('Failed to load SaaS overview');
      if (!intelRes.ok) throw new Error('Failed to load user intelligence');
      if (!platformRes.ok) throw new Error('Failed to load platform controls');
      if (!telemetryRes.ok) throw new Error('Failed to load visitor telemetry');

      const [saas, intel, platform, telemetry] = await Promise.all([
        saasRes.json() as Promise<SaasOverview>,
        intelRes.json() as Promise<UserIntelligenceOverview>,
        platformRes.json() as Promise<PlatformConfig>,
        telemetryRes.json() as Promise<TelemetryOverview>,
      ]);

      setState({ saas, intel, platform, telemetry });
      setFeatureDraft(platform?.featureControls ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load command center');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventMessage(null);
    setEventLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '220');
      if (eventFilterSurface !== 'all') params.set('surface', eventFilterSurface);
      if (eventFilterType !== 'all') params.set('type', eventFilterType);
      if (eventFilterPath.trim()) params.set('path', eventFilterPath.trim());
      const res = await fetch(`/api/admin/telemetry/events?${params.toString()}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Failed to load events');
      setEvents(Array.isArray(payload?.events) ? payload.events : []);
    } catch (err) {
      setEventMessage(err instanceof Error ? err.message : 'Failed to load events');
      setEvents([]);
    } finally {
      setEventLoading(false);
    }
  }, [eventFilterPath, eventFilterSurface, eventFilterType]);

  useEffect(() => {
    void load();
    if (refreshTimerRef.current) window.clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = window.setInterval(() => void load(), 15_000);
    return () => {
      if (refreshTimerRef.current) window.clearInterval(refreshTimerRef.current);
    };
  }, [load]);

  useEffect(() => {
    if (tab !== 'events') return;
    void loadEvents();
    const interval = window.setInterval(() => void loadEvents(), 8_000);
    return () => window.clearInterval(interval);
  }, [loadEvents, tab]);

  const platform = state.platform;
  const saas = state.saas;
  const intel = state.intel;
  const telemetry = state.telemetry;
  const health = saas?.platformHealth;

  const featureKeys = useMemo(() => {
    const controls = featureDraft || platform?.featureControls;
    if (!controls) return [];
    return Object.keys(controls) as PlatformFeatureControlKey[];
  }, [featureDraft, platform?.featureControls]);

  const filteredFeatureKeys = useMemo(() => {
    const query = featureQuery.trim().toLowerCase();
    if (!query) return featureKeys;
    return featureKeys.filter((key) => prettyFeatureLabel(key).toLowerCase().includes(query) || key.toLowerCase().includes(query));
  }, [featureKeys, featureQuery]);

  const combinedRecommendations = useMemo(() => {
    const fromIntel = intel?.recommendations || [];
    const fromSaas = health?.recommendations || [];
    const merged = [
      ...fromSaas.map((r) => ({ ...r, source: 'Platform' as const })),
      ...fromIntel.map((r) => ({ ...r, source: 'Users' as const })),
    ];
    const score = (priority: string) => (priority === 'high' ? 3 : priority === 'medium' ? 2 : 1);
    return merged.sort((a, b) => score(b.priority) - score(a.priority)).slice(0, 10);
  }, [health?.recommendations, intel?.recommendations]);

  const planBars = useMemo(() => {
    const items = (saas?.planDistribution || []).slice(0, 8);
    const max = Math.max(1, ...items.map((i) => i.businesses));
    return items.map((item) => ({ ...item, pct: Math.round((item.businesses / max) * 100) }));
  }, [saas?.planDistribution]);

  const topTabs = useMemo(() => {
    const items = (intel?.topTabs || []).slice(0, 8);
    const max = Math.max(1, ...items.map((i) => i.count));
    return items.map((item) => ({ ...item, pct: Math.round((item.count / max) * 100) }));
  }, [intel?.topTabs]);

  const tenantRows = useMemo(() => {
    const query = tenantQuery.trim().toLowerCase();
    const rows = (saas?.businessUsage || []).map((row) => ({ ...row, score: Number.isFinite(Number(row.setupReadinessScore)) ? Number(row.setupReadinessScore) : 0 }));
    const filtered = query
      ? rows.filter((row) =>
          [row.name, row.email, row.organizationName, row.planName, row.status, row.industry]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query)),
        )
      : rows;
    return filtered.slice(0, 80);
  }, [saas?.businessUsage, tenantQuery]);

  const blockedIps = telemetry?.security.blockedIps || [];
  const isIpBlocked = useCallback((ip: string) => blockedIps.includes(ip), [blockedIps]);

  const saveBlocklist = useCallback(async (nextIps: string[]) => {
    setSavingBlocklist(true);
    setSecurityMessage(null);
    try {
      const res = await fetch('/api/admin/telemetry/overview', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedIps: nextIps }),
      });
      if (!res.ok) throw new Error('Failed to save blocklist');
      const updated = (await res.json()) as { blockedIps: string[] };
      setState((current) => ({
        ...current,
        telemetry: current.telemetry
          ? { ...current.telemetry, security: { ...current.telemetry.security, blockedIps: updated.blockedIps || [] } }
          : current.telemetry,
      }));
      setSecurityMessage('Saved blocklist.');
    } catch (err) {
      setSecurityMessage(err instanceof Error ? err.message : 'Failed to save blocklist');
    } finally {
      setSavingBlocklist(false);
    }
  }, []);

  const addBlockedIp = useCallback(async (ip: string) => {
    const cleaned = ip.trim();
    if (!cleaned) return;
    const next = Array.from(new Set([...blockedIps, cleaned])).slice(0, 400);
    await saveBlocklist(next);
  }, [blockedIps, saveBlocklist]);

  const removeBlockedIp = useCallback(async (ip: string) => {
    const next = blockedIps.filter((entry) => entry !== ip);
    await saveBlocklist(next);
  }, [blockedIps, saveBlocklist]);

  const toggleFeature = useCallback((key: PlatformFeatureControlKey) => {
    setFeatureDraft((prev) => {
      const base = prev || (platform?.featureControls as Record<PlatformFeatureControlKey, boolean>) || ({} as any);
      return { ...base, [key]: !base[key] };
    });
    setFeatureSaveMessage(null);
  }, [platform?.featureControls]);

  const saveFeatureControls = useCallback(async () => {
    if (!platform || !featureDraft) return;
    setSavingFeatures(true);
    setFeatureSaveMessage(null);
    try {
      const nextPlatform: PlatformConfig = { ...platform, featureControls: featureDraft };
      const res = await fetch('/api/platform', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextPlatform),
      });
      if (!res.ok) throw new Error('Failed to save feature controls');
      const updated = (await res.json()) as PlatformConfig;
      setState((current) => ({ ...current, platform: updated }));
      setFeatureDraft(updated.featureControls);
      setFeatureSaveMessage('Saved. Changes apply across the portal.');
    } catch (err) {
      setFeatureSaveMessage(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingFeatures(false);
    }
  }, [featureDraft, platform]);

  useEffect(() => {
    if (!featureDraft) return;
    if (savingTimerRef.current) window.clearTimeout(savingTimerRef.current);
    savingTimerRef.current = window.setTimeout(() => {
      if (tab === 'features') void saveFeatureControls();
    }, 1100);
    return () => {
      if (savingTimerRef.current) window.clearTimeout(savingTimerRef.current);
    };
  }, [featureDraft, saveFeatureControls, tab]);

  if (loading) {
    return (
      <Card className="border-white/60 bg-white/82 backdrop-blur">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading command center...
        </CardContent>
      </Card>
    );
  }

  if (error || !saas || !intel || !platform || !telemetry) {
    return (
      <Card className="border-white/60 bg-white/82 backdrop-blur">
        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-rose-600">{error || 'Unable to load command center.'}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()}>Retry</Button>
            <Button asChild variant="outline"><Link href="/workspace">Back</Link></Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-900" />
              Super Admin
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 backdrop-blur">
              <Clock3 className="h-3.5 w-3.5 text-slate-900" />
              Updated {new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(telemetry.generatedAt))}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-2xl">Command Center</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => void load()}>
            <Sparkles className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/pricing">Plans</Link>
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full justify-start rounded-2xl bg-white/60 p-1 backdrop-blur sm:w-auto">
            <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
            <TabsTrigger value="traffic" className="rounded-xl">Traffic</TabsTrigger>
            <TabsTrigger value="behaviour" className="rounded-xl">Behaviour</TabsTrigger>
            <TabsTrigger value="events" className="rounded-xl">Live Feed</TabsTrigger>
            <TabsTrigger value="tenants" className="rounded-xl">Tenants</TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl">Security</TabsTrigger>
            <TabsTrigger value="features" className="rounded-xl">Feature Controls</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur ${statusPill(health?.software.status || 'healthy')}`}>
              Product {health?.software.score ?? 0}/100
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur ${statusPill(health?.server.status || 'healthy')}`}>
              Server {health?.server.memoryPressurePercent ?? 0}%
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur ${statusPill(health?.storage.status || 'healthy')}`}>
              Storage {formatBytes(health?.storage.totalEstimatedBytes ?? 0)}
            </span>
          </div>
        </div>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric title="Tenants" value={formatCompactNumber(saas.totalBusinessAccounts)} detail={`${formatCompactNumber(saas.activeBusinessAccounts)} active · ${formatCompactNumber(saas.upgradeRequiredAccounts)} upgrade required`} />
            <Metric title="Visitors (24h)" value={formatCompactNumber(telemetry.traffic.uniqueVisitors24h)} detail={`${formatCompactNumber(telemetry.traffic.pageViews24h)} views · ${formatCompactNumber(telemetry.traffic.sessions24h)} sessions`} />
            <Metric title="Documents" value={formatCompactNumber(saas.totalGeneratedDocuments)} detail={`${formatCompactNumber(saas.totalFileTransfers || 0)} transfers`} />
            <Metric title="User Pulse (7d)" value={formatCompactNumber(intel.totals.activeUsers7d)} detail={`${formatCompactNumber(intel.totals.totalActivityEvents)} events · ${intel.totals.averageFeedbackRating.toFixed(1)} rating`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <Card className="border-white/60 bg-white/82 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-950">
                  <TrendingUp className="h-4 w-4 text-slate-900" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {combinedRecommendations.map((rec) => (
                  <div key={`${rec.source}-${rec.id}`} className="rounded-[1.15rem] border border-white/70 bg-white/60 p-4 shadow-[0_14px_32px_rgba(148,163,184,0.08)] backdrop-blur">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${priorityPill(rec.priority)}`}>{rec.priority}</span>
                      <span className="rounded-full bg-slate-100/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{rec.source}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-950">{rec.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{rec.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-white/60 bg-white/82 backdrop-blur">
                <CardHeader><CardTitle className="text-base text-slate-950">Plan distribution</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {planBars.map((item) => (
                    <div key={item.planId} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <p className="truncate font-medium text-slate-800">{item.planName}</p>
                        <p className="shrink-0 text-xs font-semibold text-slate-600">{item.businesses}</p>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-[linear-gradient(90deg,rgba(37,99,235,0.9),rgba(14,165,233,0.85))]" style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/60 bg-white/82 backdrop-blur">
                <CardHeader><CardTitle className="text-base text-slate-950">Traffic pulse</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-[1.15rem] border border-white/70 bg-white/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Live</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{telemetry.traffic.liveVisitors5m} visitors in last 5 minutes</p>
                    <p className="mt-1 text-xs text-slate-500">Bounce {telemetry.traffic.bounceRate24h}% · Avg session {telemetry.traffic.avgSessionSeconds24h}s</p>
                  </div>
                  <div className="rounded-[1.15rem] border border-white/70 bg-white/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Top page</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{telemetry.traffic.topPages24h[0]?.path || '/'}</p>
                    <p className="mt-1 text-xs text-slate-500">{telemetry.traffic.topPages24h[0]?.views || 0} views</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="traffic" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Metric title="Live visitors" value={formatCompactNumber(telemetry.traffic.liveVisitors5m)} detail="Unique visitors (last 5 min)" />
            <Metric title="Page views (24h)" value={formatCompactNumber(telemetry.traffic.pageViews24h)} detail={`${formatCompactNumber(telemetry.traffic.uniqueVisitors24h)} visitors`} />
            <Metric title="Sessions (24h)" value={formatCompactNumber(telemetry.traffic.sessions24h)} detail={`Avg ${telemetry.traffic.avgSessionSeconds24h}s`} />
            <Metric title="Bounce (24h)" value={`${telemetry.traffic.bounceRate24h}%`} detail="1-page sessions estimate" />
            <Metric title="Signups (24h)" value={formatCompactNumber(telemetry.traffic.signups24h)} detail={`${formatCompactNumber(telemetry.traffic.logins24h)} logins`} />
            <Metric title="Intent (24h)" value={formatCompactNumber(telemetry.traffic.ctaClicks24h)} detail={`${formatCompactNumber(telemetry.traffic.searches24h)} searches`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <Card className="border-white/60 bg-white/82 backdrop-blur">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base text-slate-950"><BarChart3 className="h-4 w-4" />Top pages (24h)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {telemetry.traffic.topPages24h.map((item) => (
                  <div key={item.path} className="flex items-center justify-between gap-3 rounded-[1.05rem] border border-white/70 bg-white/60 px-4 py-3">
                    <p className="truncate text-sm font-medium text-slate-800">{item.path}</p>
                    <span className="shrink-0 rounded-full bg-slate-100/80 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.views}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="space-y-6">
              <Card className="border-white/60 bg-white/82 backdrop-blur">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base text-slate-950"><Globe2 className="h-4 w-4" />Referrers (24h)</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {telemetry.traffic.topReferrers24h.map((item) => (
                    <div key={item.referrer} className="flex items-center justify-between gap-3 rounded-[1.05rem] border border-white/70 bg-white/60 px-4 py-3">
                      <p className="truncate text-sm font-medium text-slate-800">{item.referrer}</p>
                      <span className="shrink-0 rounded-full bg-slate-100/80 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.views}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/60 bg-white/82 backdrop-blur">
                <CardHeader><CardTitle className="text-base text-slate-950">Top intent signals (24h)</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.15rem] border border-white/70 bg-white/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Top CTAs</p>
                    <div className="mt-3 space-y-2">
                      {(telemetry.traffic.topCtas24h || []).slice(0, 5).map((item) => (
                        <div key={item.ctaId} className="flex items-center justify-between gap-3 text-sm">
                          <p className="min-w-0 truncate text-slate-700">{item.ctaId}</p>
                          <p className="shrink-0 font-semibold text-slate-900">{formatCompactNumber(item.clicks)}</p>
                        </div>
                      ))}
                      {telemetry.traffic.topCtas24h.length === 0 ? <p className="text-sm text-slate-500">No CTA clicks yet.</p> : null}
                    </div>
                  </div>
                  <div className="rounded-[1.15rem] border border-white/70 bg-white/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Top searches</p>
                    <div className="mt-3 space-y-2">
                      {(telemetry.traffic.topSearches24h || []).slice(0, 5).map((item) => (
                        <div key={item.query} className="flex items-center justify-between gap-3 text-sm">
                          <p className="min-w-0 truncate text-slate-700">{item.query}</p>
                          <p className="shrink-0 font-semibold text-slate-900">{formatCompactNumber(item.searches)}</p>
                        </div>
                      ))}
                      {telemetry.traffic.topSearches24h.length === 0 ? <p className="text-sm text-slate-500">No searches yet.</p> : null}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/60 bg-white/82 backdrop-blur">
                <CardHeader><CardTitle className="text-base text-slate-950">Top workspace opens (24h)</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(telemetry.traffic.topWorkspaceFeatures24h || []).slice(0, 8).map((item) => (
                    <div key={item.featureId} className="flex items-center justify-between gap-3 rounded-[1.05rem] border border-white/70 bg-white/60 px-4 py-3">
                      <p className="truncate text-sm font-medium text-slate-800">{prettyFeatureLabel(item.featureId)}</p>
                      <span className="shrink-0 rounded-full bg-slate-100/80 px-2.5 py-1 text-xs font-semibold text-slate-700">{formatCompactNumber(item.opens)}</span>
                    </div>
                  ))}
                  {telemetry.traffic.topWorkspaceFeatures24h.length === 0 ? (
                    <div className="rounded-[1.15rem] border border-white/70 bg-white/60 p-4 text-sm text-slate-600">No workspace feature opens tracked yet.</div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-white/60 bg-white/82 backdrop-blur">
                <CardHeader><CardTitle className="text-base text-slate-950">Device mix (24h)</CardTitle></CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2">
                  {telemetry.traffic.deviceMix24h.map((item) => (
                    <div key={item.device} className="rounded-[1.05rem] border border-white/70 bg-white/60 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.device}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">{formatCompactNumber(item.views)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="behaviour" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric title="Active users (7d)" value={formatCompactNumber(intel.totals.activeUsers7d)} detail={`${formatCompactNumber(intel.totals.activeUsers24h)} active today`} />
            <Metric title="Time on page (24h)" value={`${Math.round((telemetry.behaviour.avgTimeOnPageSeconds24h || 0) / 60)}m`} detail={`${telemetry.behaviour.avgTimeOnPageSeconds24h}s average`} />
            <Metric title="Returning (7d)" value={`${telemetry.behaviour.returningVisitorRate7d}%`} detail="Visitors with 2+ sessions" />
            <Metric title="Feedback coverage" value={`${Math.round(intel.totals.feedbackCoverageRate)}%`} detail={`${formatCompactNumber(intel.totals.totalFeedbackResponses)} responses`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="border-white/60 bg-white/82 backdrop-blur">
              <CardHeader><CardTitle className="text-base text-slate-950">Top tabs (7d)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {topTabs.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <p className="truncate font-medium text-slate-800">{item.label}</p>
                      <p className="shrink-0 text-xs font-semibold text-slate-600">{item.count}</p>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,0.9),rgba(59,130,246,0.88))]" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-white/60 bg-white/82 backdrop-blur">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base text-slate-950"><TrendingUp className="h-4 w-4" />Funnels and exits</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {telemetry.behaviour.funnels.map((funnel) => (
                    <div key={funnel.id} className="rounded-[1.15rem] border border-white/70 bg-white/60 p-4">
                      <p className="text-sm font-semibold text-slate-950">{funnel.label}</p>
                      <div className="mt-3 grid gap-2">
                        {funnel.steps.map((step) => (
                          <div key={`${funnel.id}-${step.label}`} className="flex items-center justify-between gap-3 text-sm">
                            <p className="min-w-0 truncate text-slate-700">{step.label}</p>
                            <p className="shrink-0 font-semibold text-slate-900">{formatCompactNumber(step.count)} · {step.rateFromPrev}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-[1.15rem] border border-white/70 bg-white/60 p-4">
                  <p className="text-sm font-semibold text-slate-950">Top exits (24h)</p>
                  <div className="mt-3 space-y-2">
                    {telemetry.behaviour.topExitPages24h.slice(0, 8).map((item) => (
                      <div key={item.path} className="flex items-center justify-between gap-3 text-sm">
                        <p className="min-w-0 truncate text-slate-700">{item.path}</p>
                        <p className="shrink-0 font-semibold text-slate-900">{formatCompactNumber(item.exits)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.15rem] border border-white/70 bg-white/60 p-4 text-sm text-slate-600">
                  {intel.feedbackInsights.summary}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-6 space-y-6">
          <Card className="border-white/60 bg-white/82 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-3 text-base text-slate-950">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-slate-900" />
                  Live activity feed
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="rounded-full" onClick={() => void loadEvents()} disabled={eventLoading}>
                    {eventLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      setEventLoading(true);
                      setEventMessage(null);
                      fetch('/api/admin/telemetry/events', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ maxAgeDays: 60, keepLatest: 20000 }),
                      })
                        .then((r) => r.json())
                        .then(() => loadEvents())
                        .catch((err) => setEventMessage(err instanceof Error ? err.message : 'Failed to purge telemetry'))
                        .finally(() => setEventLoading(false));
                    }}
                    disabled={eventLoading}
                  >
                    Purge 60d+
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,180px)_minmax(0,210px)_minmax(0,1fr)]">
                <div className="rounded-[1.15rem] border border-white/70 bg-white/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Surface</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(['all', 'public', 'workspace'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setEventFilterSurface(value)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${eventFilterSurface === value ? 'bg-slate-950 text-white' : 'bg-white/70 text-slate-700 hover:bg-white/85'}`}
                      >
                        {value === 'all' ? 'All' : value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.15rem] border border-white/70 bg-white/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Type</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {([
                      { id: 'all', label: 'All' },
                      { id: 'page_view', label: 'Views' },
                      { id: 'cta_click', label: 'CTAs' },
                      { id: 'search', label: 'Search' },
                      { id: 'feature_open', label: 'Feature' },
                      { id: 'login', label: 'Login' },
                      { id: 'signup', label: 'Signup' },
                    ] as const).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setEventFilterType(item.id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${eventFilterType === item.id ? 'bg-slate-950 text-white' : 'bg-white/70 text-slate-700 hover:bg-white/85'}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.15rem] border border-white/70 bg-white/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Path contains</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      value={eventFilterPath}
                      onChange={(e) => setEventFilterPath(e.target.value)}
                      placeholder="e.g. /pricing or /workspace"
                      className="h-10 rounded-2xl border-white/70 bg-white/70 backdrop-blur"
                    />
                    <Button variant="outline" className="h-10 rounded-2xl" onClick={() => void loadEvents()} disabled={eventLoading}>
                      Apply
                    </Button>
                  </div>
                </div>
              </div>

              {eventMessage ? (
                <div className="rounded-[1.15rem] border border-white/70 bg-white/60 px-4 py-3 text-sm text-rose-700">{eventMessage}</div>
              ) : null}

              <div className="overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/55">
                <div className="grid grid-cols-[140px_90px_1fr] gap-0 border-b border-white/70 bg-white/65 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span>When</span>
                  <span>Type</span>
                  <span>Path</span>
                </div>
                <div className="max-h-[520px] overflow-auto">
                  {events.length ? events.slice(0, 200).map((ev) => (
                    <div key={ev.id} className="grid grid-cols-[140px_90px_1fr] gap-0 border-b border-white/50 px-4 py-3 text-sm last:border-b-0">
                      <div className="pr-3 text-xs text-slate-600">
                        <p className="font-medium text-slate-800">{formatAgo(ev.createdAt)}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ev.createdAt))}</p>
                      </div>
                      <div className="pr-3">
                        <span className="inline-flex items-center rounded-full bg-slate-100/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700">{ev.type}</span>
                        <p className="mt-1 text-[11px] text-slate-500">{ev.surface}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{ev.path}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          {ev.ctaId ? <span className="rounded-full bg-white/70 px-2 py-0.5">cta:{ev.ctaId}</span> : null}
                          {ev.featureId ? <span className="rounded-full bg-white/70 px-2 py-0.5">feature:{ev.featureId}</span> : null}
                          {ev.query ? <span className="rounded-full bg-white/70 px-2 py-0.5">q:{ev.query}</span> : null}
                          {ev.ip ? <span className="rounded-full bg-white/70 px-2 py-0.5">ip:{ev.ip}</span> : null}
                          {ev.userRole ? <span className="rounded-full bg-white/70 px-2 py-0.5">role:{ev.userRole}</span> : null}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="px-4 py-10 text-center text-sm text-slate-600">
                      {eventLoading ? 'Loading events…' : 'No events match these filters yet.'}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants" className="mt-6 space-y-6">
          <Card className="border-white/60 bg-white/82 backdrop-blur">
            <CardHeader className="pb-3"><CardTitle className="text-base text-slate-950">Tenant command table</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:max-w-md">
                  <Input value={tenantQuery} onChange={(e) => setTenantQuery(e.target.value)} placeholder="Search by org, email, plan, industry..." className="h-11 rounded-2xl border-white/70 bg-white/70 backdrop-blur" />
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/60">
                <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.6fr)] gap-3 border-b border-white/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <span>Tenant</span>
                  <span>Plan</span>
                  <span>Setup</span>
                  <span>Docs</span>
                  <span>Remaining</span>
                </div>
                <div className="divide-y divide-white/60">
                  {tenantRows.map((row) => (
                    <div key={row.userId} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.6fr)] gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{row.organizationName || row.name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{row.email}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{row.planName || 'Plan'}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{row.status || 'unknown'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{row.score}%</p>
                        <p className="mt-0.5 text-xs text-slate-500">{row.workspacePreset || 'preset'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{formatCompactNumber(row.generatedDocuments)}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{row.industry || 'industry'}</p>
                      </div>
                      <div><p className="font-semibold text-slate-900">{formatCompactNumber(row.remainingGenerations)}</p></div>
                    </div>
                  ))}
                  {tenantRows.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-slate-600">No tenants match the current filter.</div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <Card className="border-white/60 bg-white/82 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-950">
                  <ShieldAlert className="h-4 w-4 text-slate-900" />
                  Suspicious traffic (24h)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {telemetry.security.suspiciousIps24h.length ? telemetry.security.suspiciousIps24h.map((entry) => (
                  <div key={entry.ip} className="rounded-[1.15rem] border border-white/70 bg-white/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{entry.ip}</p>
                        <p className="mt-1 text-xs text-slate-500">{entry.events} events</p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => void addBlockedIp(entry.ip)} disabled={savingBlocklist || isIpBlocked(entry.ip)}>
                        <Ban className="mr-2 h-4 w-4" />
                        {isIpBlocked(entry.ip) ? 'Blocked' : 'Block'}
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {entry.topPaths.map((p) => (
                        <div key={`${entry.ip}-${p.path}`} className="flex items-center justify-between gap-3 text-xs text-slate-600">
                          <p className="min-w-0 truncate">{p.path}</p>
                          <p className="shrink-0 font-semibold text-slate-800">{p.count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[1.15rem] border border-white/70 bg-white/60 p-4 text-sm text-slate-600">
                    No suspicious IP spikes detected in the last 24 hours.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/60 bg-white/82 backdrop-blur">
              <CardHeader className="pb-3"><CardTitle className="text-base text-slate-950">IP blocklist</CardTitle></CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex gap-2">
                  <Input value={ipDraft} onChange={(e) => setIpDraft(e.target.value)} placeholder="Add IP to blocklist..." className="h-11 rounded-2xl border-white/70 bg-white/70 backdrop-blur" />
                  <Button className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800" disabled={savingBlocklist} onClick={() => void addBlockedIp(ipDraft).then(() => setIpDraft(''))}>
                    Add
                  </Button>
                </div>
                {securityMessage ? (
                  <div className="rounded-[1.15rem] border border-white/70 bg-white/60 px-4 py-3 text-sm text-slate-700">{securityMessage}</div>
                ) : null}
                <div className="space-y-2">
                  {blockedIps.length ? blockedIps.slice(0, 80).map((ip) => (
                    <div key={ip} className="flex items-center justify-between gap-3 rounded-[1.05rem] border border-white/70 bg-white/60 px-4 py-3 text-sm">
                      <p className="truncate font-medium text-slate-800">{ip}</p>
                      <Button variant="outline" size="sm" className="rounded-full" disabled={savingBlocklist} onClick={() => void removeBlockedIp(ip)}>
                        Remove
                      </Button>
                    </div>
                  )) : (
                    <div className="rounded-[1.15rem] border border-white/70 bg-white/60 p-4 text-sm text-slate-600">No blocked IPs yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="mt-6 space-y-6">
          <Card className="border-white/60 bg-white/82 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-slate-950">
                <Wrench className="h-4 w-4 text-slate-900" />
                Feature toggles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:max-w-md">
                  <Input value={featureQuery} onChange={(event) => setFeatureQuery(event.target.value)} placeholder="Search features..." className="h-11 rounded-2xl border-white/70 bg-white/70 backdrop-blur" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="rounded-full" onClick={() => setFeatureDraft(platform.featureControls)}>Reset</Button>
                  <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800" disabled={savingFeatures} onClick={() => void saveFeatureControls()}>
                    {savingFeatures ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                </div>
              </div>

              {featureSaveMessage ? (
                <div className="rounded-[1.15rem] border border-white/70 bg-white/60 px-4 py-3 text-sm text-slate-700">{featureSaveMessage}</div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredFeatureKeys.map((key) => {
                  const enabled = Boolean((featureDraft || platform.featureControls)[key]);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleFeature(key)}
                      className={`group flex items-start justify-between gap-3 rounded-[1.35rem] border px-4 py-4 text-left shadow-[0_12px_30px_rgba(148,163,184,0.08)] backdrop-blur transition ${
                        enabled
                          ? 'border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.82),rgba(255,255,255,0.62))]'
                          : 'border-white/70 bg-white/60 hover:bg-white/70'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{prettyFeatureLabel(key)}</p>
                        <p className="mt-1 truncate text-xs text-slate-600">{key}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${enabled ? 'bg-emerald-100/90 text-emerald-700' : 'bg-slate-100/90 text-slate-700'}`}>
                        {enabled ? 'On' : 'Off'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="rounded-[1.35rem] border border-white/70 bg-white/60 p-4 text-sm text-slate-600">
                Feature toggles apply across the public site and workspace. Keep at least one create path enabled so tenants are not blocked.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card className="border-white/60 bg-white/82 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-950">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

function formatAgo(iso: string) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 'now';
  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.round(diff / 1000);
  if (sec < 15) return 'now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}
