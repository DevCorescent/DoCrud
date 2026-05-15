'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Mail, Send, ShieldCheck, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type MailSettings = {
  host: string;
  port: number;
  secure: boolean;
  requireAuth: boolean;
  username: string;
  password: string; // masked on load
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  testRecipient?: string;
};

type OutboxEvent = {
  id: string;
  createdAt: string;
  status: 'queued' | 'sent' | 'failed' | 'tested';
  type: string;
  to: string;
  subject: string;
  messageId?: string;
  sentAt?: string;
  sentBy?: string;
  error?: string;
  tracking?: { opens: number; clicks: number; lastOpenedAt?: string; lastClickedAt?: string };
};

type MailPolicies = Record<string, boolean>;

type Campaign = {
  id: string;
  title: string;
  subject: string;
  text: string;
  html?: string;
  audience: any;
  sendAt?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastError?: string;
  progress?: { total: number; sent: number; failed: number; startedAt?: string; finishedAt?: string };
};

export default function SuperAdminMailCenter() {
  const [tab, setTab] = useState<'smtp' | 'policies' | 'campaigns' | 'outbox'>('smtp');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<MailSettings>({
    host: '',
    port: 587,
    secure: false,
    requireAuth: true,
    username: '',
    password: '',
    fromName: 'docrud',
    fromEmail: '',
    replyTo: '',
    testRecipient: '',
  });

  const [outboxLoading, setOutboxLoading] = useState(false);
  const [outbox, setOutbox] = useState<OutboxEvent[]>([]);
  const [outboxSummary, setOutboxSummary] = useState<{ total: number; sent: number; failed: number; opens: number; clicks: number } | null>(null);

  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [policiesSaving, setPoliciesSaving] = useState(false);
  const [policies, setPolicies] = useState<MailPolicies>({});

  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignDraft, setCampaignDraft] = useState<{ title: string; subject: string; text: string; sendAt: string }>({
    title: 'Bulk email',
    subject: '',
    text: '',
    sendAt: '',
  });
  const [campaignSendingId, setCampaignSendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/mail', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Failed to load mail settings');
      setSettings(payload as MailSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mail settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOutbox = useCallback(async () => {
    setOutboxLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/mail/outbox?limit=220', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Failed to load outbox');
      setOutbox(Array.isArray(payload?.events) ? payload.events : []);
      setOutboxSummary(payload?.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load outbox');
      setOutbox([]);
      setOutboxSummary(null);
    } finally {
      setOutboxLoading(false);
    }
  }, []);

  const loadPolicies = useCallback(async () => {
    setPoliciesLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/mail/policies', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Failed to load mail policies');
      setPolicies(payload?.policies || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mail policies');
      setPolicies({});
    } finally {
      setPoliciesLoading(false);
    }
  }, []);

  const savePolicies = useCallback(async () => {
    setPoliciesSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/mail/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policies }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Failed to save mail policies');
      setPolicies(payload?.policies || {});
      setMessage('Mail notification toggles saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mail policies');
    } finally {
      setPoliciesSaving(false);
    }
  }, [policies]);

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/mail/campaigns', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Failed to load campaigns');
      setCampaigns(Array.isArray(payload?.campaigns) ? payload.campaigns : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const createCampaign = useCallback(async () => {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/mail/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: campaignDraft.title,
          subject: campaignDraft.subject,
          text: campaignDraft.text,
          audience: { mode: 'all_users' },
          sendAt: campaignDraft.sendAt ? new Date(campaignDraft.sendAt).toISOString() : undefined,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Failed to create campaign');
      setMessage(campaignDraft.sendAt ? 'Campaign scheduled.' : 'Campaign draft created.');
      setCampaignDraft((c) => ({ ...c, subject: '', text: '', sendAt: '' }));
      void loadCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    }
  }, [campaignDraft.sendAt, campaignDraft.subject, campaignDraft.text, campaignDraft.title, loadCampaigns]);

  const sendCampaignNow = useCallback(async (id: string) => {
    setCampaignSendingId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/mail/campaigns/${encodeURIComponent(id)}/send`, { method: 'POST' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Failed to send campaign');
      setMessage(`Campaign sent. ${payload?.result?.sent ?? 0} delivered, ${payload?.result?.failed ?? 0} failed.`);
      void loadOutbox();
      void loadCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send campaign');
    } finally {
      setCampaignSendingId(null);
    }
  }, [loadCampaigns, loadOutbox]);

  const runDueCampaigns = useCallback(async () => {
    try {
      await fetch('/api/admin/mail/campaigns/run', { method: 'POST' });
      void loadCampaigns();
      void loadOutbox();
    } catch {
      // ignore
    }
  }, [loadCampaigns, loadOutbox]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab !== 'outbox') return;
    void loadOutbox();
    const interval = window.setInterval(() => void loadOutbox(), 10_000);
    return () => window.clearInterval(interval);
  }, [loadOutbox, tab]);

  useEffect(() => {
    if (tab !== 'policies') return;
    void loadPolicies();
  }, [loadPolicies, tab]);

  useEffect(() => {
    if (tab !== 'campaigns') return;
    void loadCampaigns();
    void runDueCampaigns();
    const interval = window.setInterval(() => void runDueCampaigns(), 20_000);
    return () => window.clearInterval(interval);
  }, [loadCampaigns, runDueCampaigns, tab]);

  const canSave = useMemo(() => Boolean(settings.host && settings.fromEmail), [settings.fromEmail, settings.host]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/mail', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Failed to save SMTP settings');
      setSettings(payload as MailSettings);
      setMessage('SMTP settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save SMTP settings');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const verify = useCallback(async (sendTest: boolean) => {
    setVerifying(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/mail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testRecipient: sendTest ? settings.testRecipient : undefined }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'SMTP verify failed');
      setMessage(String(payload?.message || 'SMTP verified.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SMTP verify failed');
    } finally {
      setVerifying(false);
    }
  }, [settings.testRecipient]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">SMTP + Email Tracking</p>
          <p className="mt-1 text-sm text-slate-600">Configure Hostinger SMTP, send test mails, and track every outgoing notification.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="rounded-2xl bg-white/70">
          <TabsTrigger value="smtp" className="rounded-xl">SMTP settings</TabsTrigger>
          <TabsTrigger value="policies" className="rounded-xl">Notifications</TabsTrigger>
          <TabsTrigger value="campaigns" className="rounded-xl">Campaigns</TabsTrigger>
          <TabsTrigger value="outbox" className="rounded-xl">Outbox + tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="smtp" className="space-y-6">
          <Card className="border-white/60 bg-white/75 backdrop-blur">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-sky-600" />
                  SMTP Settings
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Host</p>
                      <Input className="mt-2 h-11 rounded-2xl" value={settings.host} onChange={(e) => setSettings((c) => ({ ...c, host: e.target.value }))} placeholder="smtp.hostinger.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Port</p>
                        <Input className="mt-2 h-11 rounded-2xl" type="number" value={settings.port} onChange={(e) => setSettings((c) => ({ ...c, port: Number(e.target.value || 587) }))} />
                      </div>
                      <div className="flex items-end">
                        <label className="inline-flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                          <input type="checkbox" checked={settings.secure} onChange={(e) => setSettings((c) => ({ ...c, secure: e.target.checked }))} />
                          Secure (SSL/TLS)
                        </label>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Username</p>
                      <Input className="mt-2 h-11 rounded-2xl" value={settings.username} onChange={(e) => setSettings((c) => ({ ...c, username: e.target.value }))} placeholder="docrud@yourdomain.com" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Password</p>
                      <Input className="mt-2 h-11 rounded-2xl" value={settings.password} onChange={(e) => setSettings((c) => ({ ...c, password: e.target.value }))} placeholder="********" />
                      <p className="mt-1 text-xs text-slate-500">Stored securely in server settings. UI always masks it after save.</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">From name</p>
                      <Input className="mt-2 h-11 rounded-2xl" value={settings.fromName} onChange={(e) => setSettings((c) => ({ ...c, fromName: e.target.value }))} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">From email</p>
                      <Input className="mt-2 h-11 rounded-2xl" value={settings.fromEmail} onChange={(e) => setSettings((c) => ({ ...c, fromEmail: e.target.value }))} placeholder="docrud@yourdomain.com" />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reply-to (optional)</p>
                      <Input className="mt-2 h-11 rounded-2xl" value={settings.replyTo || ''} onChange={(e) => setSettings((c) => ({ ...c, replyTo: e.target.value }))} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Test recipient</p>
                      <Input className="mt-2 h-11 rounded-2xl" value={settings.testRecipient || ''} onChange={(e) => setSettings((c) => ({ ...c, testRecipient: e.target.value }))} placeholder="you@company.com" />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" className="h-11 rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-900" disabled={saving || !canSave} onClick={() => void save()}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                      Save SMTP
                    </Button>
                    <Button type="button" variant="outline" className="h-11 rounded-2xl" disabled={verifying || !canSave} onClick={() => void verify(false)}>
                      {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Verify
                    </Button>
                    <Button type="button" variant="outline" className="h-11 rounded-2xl" disabled={verifying || !canSave || !settings.testRecipient} onClick={() => void verify(true)}>
                      {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Send test mail
                    </Button>
                  </div>

                  {message ? (
                    <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-sm text-emerald-900">
                      <CheckCircle2 className="mt-0.5 h-4 w-4" />
                      <p className="min-w-0">{message}</p>
                    </div>
                  ) : null}
                  {error ? (
                    <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-3 text-sm text-rose-900">
                      <XCircle className="mt-0.5 h-4 w-4" />
                      <p className="min-w-0">{error}</p>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <Card className="border-white/60 bg-white/75 backdrop-blur">
            <CardHeader>
              <CardTitle>Mail Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/70 bg-white/60 p-4 text-sm text-slate-700">
                Toggle which product emails can be sent. Disabling a policy stops sends across the whole system and logs a delivery attempt in Outbox.
              </div>

              {policiesLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading policies…</div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { key: 'document_delivery', label: 'Document delivery emails', detail: 'Secure link delivery, share notifications.' },
                    { key: 'collection_request', label: 'Collection requests', detail: 'File collection + required docs requests.' },
                    { key: 'document_signed_owner_notify', label: 'Signed document owner alerts', detail: 'Notify owner/admin when a document is signed.' },
                    { key: 'admin_user_message', label: 'Admin → user messages', detail: 'Manual super admin emails to individual users.' },
                    { key: 'otp_verification', label: 'OTP verification', detail: 'Email OTPs for signup and verification flows.' },
                    { key: 'business_welcome', label: 'Business welcome', detail: 'Welcome emails after workspace creation.' },
                    { key: 'bulk_campaign', label: 'Bulk campaigns', detail: 'Admin-created newsletters and bulk updates.' },
                    { key: 'smtp_test', label: 'SMTP test mails', detail: 'Allow sending test emails from SMTP settings.' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-start justify-between gap-3 rounded-2xl border border-white/70 bg-white/60 p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
                      </div>
                      <label className="shrink-0 cursor-pointer select-none rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                        <input
                          type="checkbox"
                          className="mr-2 align-middle"
                          checked={Boolean(policies[item.key])}
                          onChange={(e) => setPolicies((c) => ({ ...c, [item.key]: e.target.checked }))}
                        />
                        Enabled
                      </label>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  className="h-11 rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-900"
                  disabled={policiesSaving}
                  onClick={() => void savePolicies()}
                >
                  {policiesSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Save toggles
                </Button>
                <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => void loadPolicies()} disabled={policiesLoading}>
                  Refresh
                </Button>
              </div>

              {message ? (
                <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-sm text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-4 w-4" />
                  <p className="min-w-0">{message}</p>
                </div>
              ) : null}
              {error ? (
                <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-3 text-sm text-rose-900">
                  <XCircle className="mt-0.5 h-4 w-4" />
                  <p className="min-w-0">{error}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <Card className="border-white/60 bg-white/75 backdrop-blur">
              <CardHeader>
                <CardTitle>Create Bulk Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Campaign title</p>
                    <Input className="mt-2 h-11 rounded-2xl" value={campaignDraft.title} onChange={(e) => setCampaignDraft((c) => ({ ...c, title: e.target.value }))} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Subject</p>
                    <Input className="mt-2 h-11 rounded-2xl" value={campaignDraft.subject} onChange={(e) => setCampaignDraft((c) => ({ ...c, subject: e.target.value }))} placeholder="Workspace update" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Message (plain text)</p>
                    <textarea
                      className="mt-2 min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-300"
                      value={campaignDraft.text}
                      onChange={(e) => setCampaignDraft((c) => ({ ...c, text: e.target.value }))}
                      placeholder="Write a short, clear update. Links will be tracked automatically."
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">When to send</p>
                      <Input className="mt-2 h-11 rounded-2xl" type="datetime-local" value={campaignDraft.sendAt} onChange={(e) => setCampaignDraft((c) => ({ ...c, sendAt: e.target.value }))} />
                      <p className="mt-1 text-xs text-slate-500">Leave empty to save as draft, then send manually.</p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/60 p-4 text-sm text-slate-700">
                      Audience: <span className="font-semibold text-slate-900">All users</span>
                      <p className="mt-1 text-xs text-slate-600">Role targeting and list upload can be added next.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button className="h-11 rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-900" onClick={() => void createCampaign()} disabled={!campaignDraft.subject.trim() || !campaignDraft.text.trim()}>
                    <Mail className="mr-2 h-4 w-4" />
                    {campaignDraft.sendAt ? 'Schedule campaign' : 'Save draft'}
                  </Button>
                  <Button variant="outline" className="h-11 rounded-2xl" onClick={() => void loadCampaigns()} disabled={campaignsLoading}>Refresh</Button>
                </div>

                {message ? (
                  <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-sm text-emerald-900">
                    <CheckCircle2 className="mt-0.5 h-4 w-4" />
                    <p className="min-w-0">{message}</p>
                  </div>
                ) : null}
                {error ? (
                  <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-3 text-sm text-rose-900">
                    <XCircle className="mt-0.5 h-4 w-4" />
                    <p className="min-w-0">{error}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-white/60 bg-white/75 backdrop-blur">
              <CardHeader>
                <CardTitle>Campaign History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {campaignsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading campaigns…</div>
                ) : null}
                {!campaignsLoading && campaigns.length === 0 ? (
                  <div className="rounded-2xl border border-white/70 bg-white/60 p-4 text-sm text-slate-600">No campaigns yet. Create one on the left.</div>
                ) : null}
                {!campaignsLoading && campaigns.length ? (
                  <div className="space-y-2">
                    {campaigns.slice(0, 60).map((c) => (
                      <div key={c.id} className="rounded-2xl border border-white/70 bg-white/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">{c.title}</p>
                            <p className="mt-1 text-xs text-slate-600">{c.subject}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-slate-100/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700">{c.status}</span>
                            {c.sendAt ? <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-sm">Scheduled</span> : null}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm">To: all users</span>
                          <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm">Updated {new Date(c.updatedAt).toLocaleString()}</span>
                          {c.progress?.total ? (
                            <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm">
                              {c.progress.sent}/{c.progress.total} sent · {c.progress.failed} failed
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            className="h-10 rounded-2xl bg-slate-950 px-4 text-white hover:bg-slate-900"
                            disabled={campaignSendingId === c.id || c.status === 'sending'}
                            onClick={() => void sendCampaignNow(c.id)}
                          >
                            {campaignSendingId === c.id || c.status === 'sending' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Send now
                          </Button>
                          <Button variant="outline" className="h-10 rounded-2xl" onClick={() => void loadOutbox()}>View outbox</Button>
                        </div>
                        {c.lastError ? <p className="mt-2 text-xs text-rose-700">Last error: {c.lastError}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="outbox" className="space-y-6">
          <Card className="border-white/60 bg-white/75 backdrop-blur">
            <CardHeader>
              <CardTitle>Outbound Mail Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Sent</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{outboxSummary?.sent ?? '–'}</p>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Failed</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{outboxSummary?.failed ?? '–'}</p>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Queued</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{outbox.filter((ev) => ev.status === 'queued').length}</p>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Opens</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{outboxSummary?.opens ?? '–'}</p>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Clicks</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{outboxSummary?.clicks ?? '–'}</p>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{outboxSummary?.total ?? '–'}</p>
                </div>
              </div>

              {outboxLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading outbox…</div>
              ) : (
                <div className="space-y-2">
                  {outbox.map((item) => (
                    <div key={item.id} className="rounded-2xl border bg-white p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              item.status === 'sent' ? 'bg-emerald-100 text-emerald-800' :
                              item.status === 'failed' ? 'bg-rose-100 text-rose-800' :
                              item.status === 'queued' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {item.status}
                            </span>
                            <p className="truncate font-semibold text-slate-950">{item.subject}</p>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">To: <span className="font-semibold text-slate-900">{item.to}</span></p>
                          <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()} · {item.type}</p>
                          {item.error ? <p className="mt-2 text-xs text-rose-700">Error: {item.error}</p> : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                            Opens {item.tracking?.opens ?? 0}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                            Clicks {item.tracking?.clicks ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {outbox.length === 0 ? (
                    <div className="rounded-2xl border border-dashed bg-slate-50 p-6 text-sm text-slate-600">
                      No outbound mails logged yet. Use E-sign or Send Email to generate tracked delivery events.
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
