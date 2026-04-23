'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  BriefcaseBusiness,
  Copy,
  ExternalLink,
  Gavel,
  Loader2,
  Pencil,
  Search,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GigBid, GigConnectionRequest, GigListing } from '@/types/document';

type WorkspaceTab = 'studio' | 'mine' | 'bids' | 'connections' | 'discover';

type GigEditorState = {
  id?: string;
  title: string;
  summary: string;
  category: string;
  interests: string;
  skills: string;
  deliverables: string;
  budgetLabel: string;
  timelineLabel: string;
  engagementType: GigListing['engagementType'];
  locationPreference: GigListing['locationPreference'];
  contactPreference: GigListing['contactPreference'];
  visibility: GigListing['visibility'];
  status: GigListing['status'];
  bidMode: NonNullable<GigListing['bidMode']>;
  bidMinInRupees: string;
  bidDeadlineDate: string;
  bidAllowCounterOffer: boolean;
};

type DocaiGigAction = 'title' | 'summary' | 'deliverables' | 'polish';

const emptyGigEditor: GigEditorState = {
  title: '',
  summary: '',
  category: 'General',
  interests: '',
  skills: '',
  deliverables: '',
  budgetLabel: '',
  timelineLabel: '',
  engagementType: 'one_time',
  locationPreference: 'remote',
  contactPreference: 'chat',
  visibility: 'public',
  status: 'draft',
  bidMode: 'fixed',
  bidMinInRupees: '',
  bidDeadlineDate: '',
  bidAllowCounterOffer: true,
};

function toEditorState(gig?: GigListing | null): GigEditorState {
  if (!gig) return emptyGigEditor;
  const deadlineDate = (() => {
    if (!gig.bidRules?.bidDeadlineAt) return '';
    const date = new Date(gig.bidRules.bidDeadlineAt);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  return {
    id: gig.id,
    title: gig.title,
    summary: gig.summary,
    category: gig.category,
    interests: gig.interests.join(', '),
    skills: gig.skills.join(', '),
    deliverables: gig.deliverables.join('\n'),
    budgetLabel: gig.budgetLabel,
    timelineLabel: gig.timelineLabel || '',
    engagementType: gig.engagementType,
    locationPreference: gig.locationPreference,
    contactPreference: gig.contactPreference,
    visibility: gig.visibility,
    status: gig.status,
    bidMode: gig.bidMode || 'fixed',
    bidMinInRupees: gig.bidRules?.minBidInRupees ? String(gig.bidRules.minBidInRupees) : '',
    bidDeadlineDate: deadlineDate,
    bidAllowCounterOffer: gig.bidRules?.allowCounterOffer ?? true,
  };
}

function buildGigDocaiPrompt(action: DocaiGigAction, editor: GigEditorState) {
  const title = editor.title.trim() || 'a project gig';
  const summary = editor.summary.trim();
  const interests = editor.interests.trim();

  switch (action) {
    case 'title':
      return `Generate 5 clean, premium project gig titles for this work. Category: ${editor.category}. Interests: ${interests || 'general'}. Summary: ${summary || 'Need a crisp gig title.'}`;
    case 'summary':
      return `Write a clear, direct gig summary for this project brief: ${title}. Keep it premium, concise, and easy to reply to. Context: ${summary || interests || editor.skills || 'No extra context yet.'}`;
    case 'deliverables':
      return `List 5 practical deliverables for this gig as short bullet-ready lines. Title: ${title}. Summary: ${summary || interests || 'General project brief.'}`;
    default:
      return `Polish this gig brief to sound sharper, more premium, and easier for strong candidates to respond to:\n\nTitle: ${title}\nSummary: ${summary}\nSkills: ${editor.skills}\nDeliverables: ${editor.deliverables}`;
  }
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffHours = Math.max(0, Math.round((Date.now() - date.getTime()) / 3600000));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

function formatGigStatusLabel(status: GigListing['status']) {
  switch (status) {
    case 'published':
      return 'Published';
    case 'paused':
      return 'Paused';
    case 'closed':
      return 'Closed';
    default:
      return 'Draft';
  }
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

function isGigFeatured(gig: GigListing) {
  if (gig.featuredUntil) {
    const until = new Date(gig.featuredUntil);
    return Number.isFinite(until.getTime()) && until.getTime() > Date.now();
  }
  return Boolean(gig.featured);
}

function estimateFeaturePriceInPaise(durationDays: number) {
  const safeDays = Math.max(1, Math.min(90, Math.round(durationDays || 0)));
  if (safeDays <= 3) return 9900;
  if (safeDays <= 7) return 19900;
  if (safeDays <= 14) return 34900;
  if (safeDays <= 30) return 59900;
  return 59900 + Math.round((safeDays - 30) * 1200);
}

function formatCurrency(amountInPaise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amountInPaise / 100);
}

function gigToUpsertPayload(gig: GigListing, overrides?: Partial<GigListing>) {
  const bidRules = overrides?.bidRules ?? gig.bidRules ?? { currency: 'INR' as const };
  return {
    id: gig.id,
    title: overrides?.title ?? gig.title,
    summary: overrides?.summary ?? gig.summary,
    category: overrides?.category ?? gig.category,
    interests: overrides?.interests ?? gig.interests,
    skills: overrides?.skills ?? gig.skills,
    deliverables: overrides?.deliverables ?? gig.deliverables,
    budgetLabel: overrides?.budgetLabel ?? gig.budgetLabel,
    timelineLabel: overrides?.timelineLabel ?? gig.timelineLabel ?? '',
    engagementType: overrides?.engagementType ?? gig.engagementType,
    locationPreference: overrides?.locationPreference ?? gig.locationPreference,
    contactPreference: overrides?.contactPreference ?? gig.contactPreference,
    visibility: overrides?.visibility ?? gig.visibility,
    status: overrides?.status ?? gig.status,
    bidMode: overrides?.bidMode ?? gig.bidMode ?? 'fixed',
    bidRules,
  };
}

export default function GigsCenter() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('studio');
  const [ownListings, setOwnListings] = useState<GigListing[]>([]);
  const [discoverListings, setDiscoverListings] = useState<GigListing[]>([]);
  const [incomingConnections, setIncomingConnections] = useState<GigConnectionRequest[]>([]);
  const [incomingBids, setIncomingBids] = useState<GigBid[]>([]);
  const [outgoingBids, setOutgoingBids] = useState<GigBid[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const [editorState, setEditorState] = useState<GigEditorState>(emptyGigEditor);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docaiLoading, setDocaiLoading] = useState(false);
  const [docaiOutput, setDocaiOutput] = useState('');

  const [featureTarget, setFeatureTarget] = useState<GigListing | null>(null);
  const [featureDays, setFeatureDays] = useState(7);
  const [featureBusy, setFeatureBusy] = useState(false);
  const [featureError, setFeatureError] = useState('');

  const liveOwnListings = useMemo(() => ownListings.filter((gig) => gig.status === 'published'), [ownListings]);
  const featuredOwnListings = useMemo(() => ownListings.filter((gig) => gig.status === 'published' && isGigFeatured(gig)), [ownListings]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<number | null>(null);

  const applyWorkspacePayload = useCallback((payload: any) => {
    if (!payload) return;
    const record = payload as Record<string, unknown>;
    setOwnListings(Array.isArray(record.ownListings) ? (record.ownListings as GigListing[]) : []);
    setDiscoverListings(Array.isArray(record.discoverListings) ? (record.discoverListings as GigListing[]) : []);
    setIncomingConnections(Array.isArray(record.incomingConnections) ? (record.incomingConnections as GigConnectionRequest[]) : []);
    setIncomingBids(Array.isArray(record.incomingBids) ? (record.incomingBids as GigBid[]) : []);
    setOutgoingBids(Array.isArray(record.outgoingBids) ? (record.outgoingBids as GigBid[]) : []);
    if (Array.isArray(record.categories)) setAvailableCategories(record.categories as string[]);
    setLoading(false);
  }, []);

  const loadSnapshot = useCallback(async () => {
    try {
      const response = await fetch('/api/gigs', { cache: 'no-store' });
      const payload = response.ok ? await response.json() : null;
      applyWorkspacePayload(payload);
    } catch {
      setLoading(false);
    }
  }, [applyWorkspacePayload]);

  useEffect(() => {
    let active = true;

    const closeStream = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };

    const stopPolling = () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      void loadSnapshot();
      pollingRef.current = window.setInterval(() => void loadSnapshot(), 15000);
    };

    closeStream();
    stopPolling();
    setLoading(true);

    try {
      const es = new EventSource('/api/gigs/stream');
      eventSourceRef.current = es;

      es.addEventListener('gigs', (event) => {
        if (!active) return;
        const messageEvent = event as MessageEvent<string>;
        try {
          applyWorkspacePayload(JSON.parse(messageEvent.data));
        } catch {
          // ignore
        }
      });

      es.addEventListener('error', () => {
        closeStream();
        startPolling();
      });
    } catch {
      startPolling();
    }

    return () => {
      active = false;
      closeStream();
      stopPolling();
    };
  }, [applyWorkspacePayload, loadSnapshot]);

  const saveGig = async (overrides?: Partial<GigEditorState>) => {
    const next = { ...editorState, ...(overrides || {}) };
    if (!next.title.trim() || !next.summary.trim() || !next.category.trim()) {
      setFeedback('Title, summary, and category are required.');
      return;
    }
    try {
      setSaving(true);
      setFeedback('');

      const bidRules = next.bidMode === 'bidding'
        ? {
          currency: 'INR' as const,
          minBidInRupees: next.bidMinInRupees.trim() ? Math.max(0, Math.round(Number(next.bidMinInRupees))) : undefined,
          allowCounterOffer: next.bidAllowCounterOffer,
          bidDeadlineAt: next.bidDeadlineDate
            ? new Date(`${next.bidDeadlineDate}T23:59:59.999`).toISOString()
            : undefined,
        }
        : { currency: 'INR' as const };

      const response = await fetch('/api/gigs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: next.id,
          title: next.title.trim(),
          summary: next.summary.trim(),
          category: next.category.trim(),
          interests: next.interests.split(',').map((item) => item.trim()).filter(Boolean),
          skills: next.skills.split(',').map((item) => item.trim()).filter(Boolean),
          deliverables: next.deliverables.split('\n').map((item) => item.trim()).filter(Boolean),
          budgetLabel: next.budgetLabel.trim(),
          timelineLabel: next.timelineLabel.trim(),
          engagementType: next.engagementType,
          locationPreference: next.locationPreference,
          contactPreference: next.contactPreference,
          visibility: next.visibility,
          status: next.status,
          bidMode: next.bidMode,
          bidRules,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to save gig.');
      setFeedback(next.status === 'published' ? 'Gig published.' : 'Gig saved.');
      setEditorState(toEditorState(payload));
      await loadSnapshot();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to save gig.');
    } finally {
      setSaving(false);
    }
  };

  const deleteGigById = async (id: string) => {
    try {
      setSaving(true);
      setFeedback('');
      const response = await fetch(`/api/gigs?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to delete gig.');
      if (editorState.id === id) {
        setEditorState(emptyGigEditor);
        setDocaiOutput('');
      }
      setFeedback('Gig deleted.');
      await loadSnapshot();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to delete gig.');
    } finally {
      setSaving(false);
    }
  };

  const duplicateGig = async (gig: GigListing) => {
    try {
      setSaving(true);
      setFeedback('');
      const response = await fetch('/api/gigs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...gigToUpsertPayload(gig, {
            title: gig.title.trim().toLowerCase().startsWith('copy of') ? gig.title : `Copy of ${gig.title}`,
            status: 'draft',
          }),
          id: undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to duplicate gig.');
      setFeedback('Draft duplicated.');
      setEditorState(toEditorState(payload));
      setDocaiOutput('');
      setActiveTab('studio');
      await loadSnapshot();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to duplicate gig.');
    } finally {
      setSaving(false);
    }
  };

  const updateGigStatusQuick = async (gig: GigListing, status: GigListing['status']) => {
    try {
      setSaving(true);
      setFeedback('');
      const response = await fetch('/api/gigs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gigToUpsertPayload(gig, { status })),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to update gig.');
      setFeedback(`Gig ${formatGigStatusLabel(status).toLowerCase()}.`);
      if (editorState.id === gig.id) setEditorState(toEditorState(payload));
      await loadSnapshot();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to update gig.');
    } finally {
      setSaving(false);
    }
  };

  const runDocai = async (action: DocaiGigAction) => {
    try {
      setDocaiLoading(true);
      setDocaiOutput('');
      const response = await fetch('/api/docword/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: action === 'polish' ? 'rewrite_concise' : 'generate',
          documentTitle: editorState.title || 'Gig brief',
          prompt: buildGigDocaiPrompt(action, editorState),
          text: action === 'polish' ? editorState.summary : '',
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Docai could not help right now.');
      setDocaiOutput(String(payload?.result || '').trim());
    } catch (error) {
      setDocaiOutput(error instanceof Error ? error.message : 'Docai could not help right now.');
    } finally {
      setDocaiLoading(false);
    }
  };

  const applyDocai = () => {
    if (!docaiOutput.trim()) return;
    if (!editorState.title.trim()) {
      setEditorState((current) => ({ ...current, summary: docaiOutput.trim() }));
      return;
    }
    setEditorState((current) => ({
      ...current,
      summary: current.summary.trim() ? `${current.summary.trim()}\n\n${docaiOutput.trim()}` : docaiOutput.trim(),
    }));
  };

  const updateConnectionStatus = async (id: string, status: GigConnectionRequest['status']) => {
    const response = await fetch('/api/gigs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'connection', id, status }),
    });
    if (response.ok) {
      await loadSnapshot();
    }
  };

  const updateBidStatus = async (id: string, status: GigBid['status']) => {
    const response = await fetch('/api/gigs/bids', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (response.ok) {
      await loadSnapshot();
    }
  };

  const loadRazorpayScript = async () => {
    if (typeof window === 'undefined') return false;
    if (window.Razorpay) return true;
    return new Promise<boolean>((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const startFeatureCheckout = async () => {
    if (!featureTarget) return;
    try {
      setFeatureBusy(true);
      setFeatureError('');
      const response = await fetch('/api/gigs/feature/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gigId: featureTarget.id, durationDays: featureDays }),
      });
      const payload = await response.json().catch(() => null) as any;
      if (!response.ok) throw new Error(payload?.error || 'Unable to start featuring checkout.');

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) throw new Error('Razorpay checkout script could not be loaded on this device.');

      const instance = new window.Razorpay({
        key: payload.keyId,
        amount: payload.amountInPaise,
        currency: 'INR',
        name: 'docrud',
        description: `Feature gig for ${payload.durationDays} days`,
        order_id: payload.order.id,
        handler: async (gatewayPayload: Record<string, string>) => {
          try {
            const verifyResponse = await fetch('/api/gigs/feature/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gigId: featureTarget.id,
                durationDays: payload.durationDays,
                ...gatewayPayload,
              }),
            });
            const verifyPayload = await verifyResponse.json().catch(() => null);
            if (!verifyResponse.ok) throw new Error(verifyPayload?.error || 'Payment verification failed.');
            setFeatureTarget(null);
            await loadSnapshot();
          } catch (verificationError) {
            setFeatureError(verificationError instanceof Error ? verificationError.message : 'Payment verification failed.');
          } finally {
            setFeatureBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setFeatureBusy(false);
          },
        },
        notes: {
          gigId: featureTarget.id,
          gigSlug: featureTarget.slug,
          durationDays: String(payload.durationDays),
        },
        theme: {
          color: '#0f172a',
        },
      });
      instance.on('payment.failed', (...args: unknown[]) => {
        const event = args[0] as { error?: { description?: string; reason?: string } } | undefined;
        setFeatureBusy(false);
        setFeatureError(event?.error?.description || event?.error?.reason || 'Payment failed.');
      });
      instance.open();
    } catch (error) {
      setFeatureBusy(false);
      setFeatureError(error instanceof Error ? error.message : 'Unable to start checkout.');
    }
  };

  const selectGigForEdit = (gig: GigListing) => {
    setEditorState(toEditorState(gig));
    setDocaiOutput('');
    setActiveTab('studio');
  };

  const [discoverSearch, setDiscoverSearch] = useState('');
  const filteredDiscoverListings = useMemo(() => {
    const query = discoverSearch.trim().toLowerCase();
    if (!query) return discoverListings;
    return discoverListings.filter((gig) => {
      const haystack = `${gig.title} ${gig.summary} ${gig.category} ${gig.interests.join(' ')} ${gig.skills.join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [discoverListings, discoverSearch]);

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1.3rem] bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Gigs</h2>
              <p className="text-sm text-slate-600">Clean briefs, realtime bids, and a simple listing flow</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-slate-200 bg-white"
              onClick={() => {
                setEditorState(emptyGigEditor);
                setDocaiOutput('');
                setActiveTab('studio');
              }}
            >
              New gig
            </Button>
            <Button asChild className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
              <Link href="/gigs">
                Public gigs
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-[1.8rem] border border-slate-200 bg-white px-6 py-12 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
          </div>
        ) : null}

        {feedback ? (
          <div className="mb-5 rounded-[1.4rem] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            {feedback}
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)}>
          <TabsList className="w-full rounded-[1.5rem] border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.86))] p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
            <TabsTrigger value="studio" className="rounded-[1.2rem]">Studio</TabsTrigger>
            <TabsTrigger value="mine" className="rounded-[1.2rem]">Your gigs <span className="ml-2 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{ownListings.length}</span></TabsTrigger>
            <TabsTrigger value="bids" className="rounded-[1.2rem]">Bids <span className="ml-2 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{incomingBids.length}</span></TabsTrigger>
            <TabsTrigger value="connections" className="rounded-[1.2rem]">Connect <span className="ml-2 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{incomingConnections.length}</span></TabsTrigger>
            <TabsTrigger value="discover" className="rounded-[1.2rem]">Discover</TabsTrigger>
          </TabsList>

          <TabsContent value="studio">
            <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
              <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-[220px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Gig studio</p>
                    <p className="mt-2 text-sm text-slate-600">Write a brief people can reply to in under 60 seconds.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">{formatGigStatusLabel(editorState.status)}</span>
                    {editorState.id ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Editing</span> : null}
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <Input
                    placeholder="Gig title"
                    value={editorState.title}
                    onChange={(event) => setEditorState((prev) => ({ ...prev, title: event.target.value }))}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category</label>
                      <Input
                        list="docrud-gig-categories"
                        placeholder="General"
                        value={editorState.category}
                        onChange={(event) => setEditorState((prev) => ({ ...prev, category: event.target.value }))}
                      />
                      <datalist id="docrud-gig-categories">
                        {availableCategories.map((cat) => <option key={cat} value={cat} />)}
                      </datalist>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Budget</label>
                      <Input
                        placeholder="₹35k - ₹60k"
                        value={editorState.budgetLabel}
                        onChange={(event) => setEditorState((prev) => ({ ...prev, budgetLabel: event.target.value }))}
                      />
                    </div>
                  </div>

                  <textarea
                    className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900"
                    placeholder="What needs to get done?"
                    value={editorState.summary}
                    onChange={(event) => setEditorState((prev) => ({ ...prev, summary: event.target.value }))}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Interests (comma separated)"
                      value={editorState.interests}
                      onChange={(event) => setEditorState((prev) => ({ ...prev, interests: event.target.value }))}
                    />
                    <Input
                      placeholder="Skills (comma separated)"
                      value={editorState.skills}
                      onChange={(event) => setEditorState((prev) => ({ ...prev, skills: event.target.value }))}
                    />
                  </div>

                  <textarea
                    className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900"
                    placeholder="Deliverables (one per line)"
                    value={editorState.deliverables}
                    onChange={(event) => setEditorState((prev) => ({ ...prev, deliverables: event.target.value }))}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Timeline label (optional)"
                      value={editorState.timelineLabel}
                      onChange={(event) => setEditorState((prev) => ({ ...prev, timelineLabel: event.target.value }))}
                    />
                    <select
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                      value={editorState.engagementType}
                      onChange={(event) => setEditorState((prev) => ({ ...prev, engagementType: event.target.value as GigListing['engagementType'] }))}
                    >
                      <option value="one_time">One-time</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="retainer">Retainer</option>
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <select
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                      value={editorState.locationPreference}
                      onChange={(event) => setEditorState((prev) => ({ ...prev, locationPreference: event.target.value as GigListing['locationPreference'] }))}
                    >
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">Onsite</option>
                    </select>
                    <select
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                      value={editorState.contactPreference}
                      onChange={(event) => setEditorState((prev) => ({ ...prev, contactPreference: event.target.value as GigListing['contactPreference'] }))}
                    >
                      <option value="chat">Chat</option>
                      <option value="email">Email</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="call">Call</option>
                    </select>
                    <select
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                      value={editorState.visibility}
                      onChange={(event) => setEditorState((prev) => ({ ...prev, visibility: event.target.value as GigListing['visibility'] }))}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                      value={editorState.bidMode}
                      onChange={(event) => setEditorState((prev) => ({ ...prev, bidMode: event.target.value as GigEditorState['bidMode'] }))}
                    >
                      <option value="fixed">Fixed scope</option>
                      <option value="bidding">Open bidding</option>
                    </select>
                    <select
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                      value={editorState.status}
                      onChange={(event) => setEditorState((prev) => ({ ...prev, status: event.target.value as GigListing['status'] }))}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="paused">Paused</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  {editorState.bidMode === 'bidding' ? (
                    <div className="grid gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                      <Input
                        placeholder="Min bid (INR)"
                        value={editorState.bidMinInRupees}
                        onChange={(event) => setEditorState((prev) => ({ ...prev, bidMinInRupees: event.target.value }))}
                        inputMode="numeric"
                      />
                      <Input
                        type="date"
                        value={editorState.bidDeadlineDate}
                        onChange={(event) => setEditorState((prev) => ({ ...prev, bidDeadlineDate: event.target.value }))}
                      />
                      <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900">
                        Counter offers
                        <input
                          type="checkbox"
                          checked={editorState.bidAllowCounterOffer}
                          onChange={(event) => setEditorState((prev) => ({ ...prev, bidAllowCounterOffer: event.target.checked }))}
                        />
                      </label>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap justify-between gap-2 pt-1">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
                        onClick={() => void saveGig({ status: editorState.status === 'published' ? 'published' : 'draft' })}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full border-slate-200"
                        onClick={() => void saveGig({ status: 'published' })}
                        disabled={saving}
                      >
                        Publish
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full border-slate-200"
                        onClick={() => { setEditorState(emptyGigEditor); setDocaiOutput(''); }}
                        disabled={saving}
                      >
                        New brief
                      </Button>
                    </div>
                    {editorState.id ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full border-rose-200 text-rose-600 hover:bg-rose-50"
                        onClick={() => void deleteGigById(editorState.id!)}
                        disabled={saving}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </section>

              <aside className="space-y-5">
                <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <Bot className="h-4 w-4 text-violet-600" />
                      Docai
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="h-8 rounded-full border-slate-200 px-3 text-xs" onClick={() => void runDocai('title')} disabled={docaiLoading}>Title</Button>
                      <Button type="button" variant="outline" className="h-8 rounded-full border-slate-200 px-3 text-xs" onClick={() => void runDocai('summary')} disabled={docaiLoading}>Rewrite</Button>
                      <Button type="button" variant="outline" className="h-8 rounded-full border-slate-200 px-3 text-xs" onClick={() => void runDocai('deliverables')} disabled={docaiLoading}>Deliverables</Button>
                      <Button type="button" variant="outline" className="h-8 rounded-full border-slate-200 px-3 text-xs" onClick={() => void runDocai('polish')} disabled={docaiLoading}>Polish</Button>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                    {docaiLoading ? 'Docai is shaping your gig...' : docaiOutput || 'Ask Docai to tighten scope, rewrite the summary, or propose deliverables.'}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button type="button" className="rounded-full bg-slate-950 text-white hover:bg-slate-800" onClick={applyDocai} disabled={!docaiOutput.trim()}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Apply
                    </Button>
                  </div>
                </div>

                <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Quick stats</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-950">{liveOwnListings.length} live</p>
                      <p className="mt-1 text-xs text-slate-600">{featuredOwnListings.length} featured</p>
                    </div>
                    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-950">{incomingBids.length} bids</p>
                      <p className="mt-1 text-xs text-slate-600">{incomingConnections.length} connections</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="mine">
            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">Your gigs</h3>
                  <p className="mt-1 text-sm text-slate-600">Edit, duplicate, publish, pause, close, or feature.</p>
                </div>
                <Button type="button" className="rounded-full bg-slate-950 text-white hover:bg-slate-800" onClick={() => setActiveTab('studio')}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Open studio
                </Button>
              </div>

              <div className="mt-5 space-y-3">
                {ownListings.length ? ownListings.map((gig) => (
                  <div key={gig.id} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 transition hover:bg-white">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-[220px]">
                        <p className="text-sm font-semibold text-slate-950">{gig.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {gig.category} · {gig.visibility} · {formatGigStatusLabel(gig.status)}
                          {isGigFeatured(gig) ? ' · Featured' : ''}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{gig.summary}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{formatRelativeTime(gig.updatedAt)}</span>
                        <Button type="button" variant="outline" className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs" onClick={() => selectGigForEdit(gig)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button type="button" variant="outline" className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs" onClick={() => void duplicateGig(gig)} disabled={saving}>
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          Duplicate
                        </Button>
                        <Button asChild type="button" variant="outline" className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs">
                          <Link href={`/gigs/${gig.slug}`}>
                            View
                            <ExternalLink className="ml-2 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        {gig.status === 'published' ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs"
                            onClick={() => { setFeatureTarget(gig); setFeatureDays(7); setFeatureError(''); }}
                          >
                            <Star className="mr-2 h-3.5 w-3.5" />
                            Feature
                          </Button>
                        ) : null}
                        <select
                          className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-900"
                          value={gig.status}
                          onChange={(event) => void updateGigStatusQuick(gig, event.target.value as GigListing['status'])}
                          disabled={saving}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="paused">Paused</option>
                          <option value="closed">Closed</option>
                        </select>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 rounded-full border-rose-200 bg-white px-3 text-xs text-rose-600 hover:bg-rose-50"
                          onClick={() => void deleteGigById(gig.id)}
                          disabled={saving}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No gigs yet. Create one in Studio and publish when ready.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bids">
            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-950">Incoming bids</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Gavel className="h-4 w-4" />
                  Realtime
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {incomingBids.length ? incomingBids.map((bid) => (
                  <div key={bid.id} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-[220px]">
                        <p className="text-sm font-semibold text-slate-950">{bid.gigTitle}</p>
                        <p className="mt-1 text-xs text-slate-500">{bid.bidderName} · {bid.bidderEmail} · {formatRelativeTime(bid.createdAt)}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{bid.note}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">₹{bid.amountInRupees.toLocaleString('en-IN')}</span>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{bid.status}</span>
                        <Button type="button" variant="outline" className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs" onClick={() => void updateBidStatus(bid.id, 'shortlisted')}>Shortlist</Button>
                        <Button type="button" variant="outline" className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs" onClick={() => void updateBidStatus(bid.id, 'accepted')}>Accept</Button>
                        <Button type="button" variant="outline" className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs" onClick={() => void updateBidStatus(bid.id, 'rejected')}>Reject</Button>
                        <Button asChild type="button" variant="outline" className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs">
                          <Link href={`/gigs/${bid.gigSlug}`}>
                            View gig
                            <ExternalLink className="ml-2 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No bids yet. Turn on Open bidding in Studio to start receiving offers.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="connections">
            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-950">Connection requests</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <BriefcaseBusiness className="h-4 w-4" />
                  Realtime
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {incomingConnections.length ? incomingConnections.map((request) => (
                  <div key={request.id} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-[220px]">
                        <p className="text-sm font-semibold text-slate-950">{request.gigTitle}</p>
                        <p className="mt-1 text-xs text-slate-500">{request.requesterName} · {request.requesterEmail} · {formatRelativeTime(request.createdAt)}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{request.note}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{request.status}</span>
                        <Button type="button" variant="outline" className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs" onClick={() => void updateConnectionStatus(request.id, 'reviewed')}>Reviewed</Button>
                        <Button type="button" variant="outline" className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs" onClick={() => void updateConnectionStatus(request.id, 'contacted')}>Contacted</Button>
                        <Button type="button" variant="outline" className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs" onClick={() => void updateConnectionStatus(request.id, 'closed')}>Close</Button>
                        <Button asChild type="button" variant="outline" className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs">
                          <Link href={`/gigs/${request.gigSlug}`}>
                            View gig
                            <ExternalLink className="ml-2 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No requests yet. When people hit Connect on a public gig, it lands here.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="discover">
            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">Discover</h3>
                  <p className="mt-1 text-sm text-slate-600">Search the live feed and open gigs directly.</p>
                </div>
                <div className="relative w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-11 w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-300"
                    placeholder="Search gigs"
                    value={discoverSearch}
                    onChange={(event) => setDiscoverSearch(event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {filteredDiscoverListings.length ? filteredDiscoverListings.map((gig) => (
                  <Link key={gig.id} href={`/gigs/${gig.slug}`} className="block rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 transition hover:bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-950">{gig.title}</p>
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{gig.budgetLabel}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{gig.category} · {formatRelativeTime(gig.updatedAt)}{isGigFeatured(gig) ? ' · Featured' : ''}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{gig.summary}</p>
                  </Link>
                )) : (
                  <p className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No gigs match that search yet.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={Boolean(featureTarget)} onOpenChange={(open) => { if (!open) setFeatureTarget(null); }}>
        <DialogContent className="max-w-xl rounded-[1.7rem] border-white/0 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.82))] p-0 shadow-[0_28px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
          <DialogHeader className="border-b border-white/55 px-6 py-5">
            <DialogTitle className="text-left text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">
              Feature this gig
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm leading-6 text-slate-600">
              Featuring boosts your listing to the top of the public gigs feed. Payment is required to activate featuring.
            </p>
            <div className="rounded-[1.4rem] border border-slate-200 bg-white/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Gig</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{featureTarget?.title}</p>
              {featureTarget?.featuredUntil && isGigFeatured(featureTarget) ? (
                <p className="mt-1 text-xs text-slate-500">
                  Currently featured until {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(featureTarget.featuredUntil))}
                </p>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-slate-200 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Duration (days)</p>
                <select
                  className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
                  value={featureDays}
                  onChange={(event) => setFeatureDays(Math.max(1, Math.min(90, Math.round(Number(event.target.value) || 7))))}
                >
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estimated price</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{formatCurrency(estimateFeaturePriceInPaise(featureDays))}</p>
                <p className="mt-1 text-xs text-slate-500">Final amount is confirmed at checkout.</p>
              </div>
            </div>
            {featureError ? <p className="text-sm text-slate-600">{featureError}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full border-white/0 bg-white/76 px-4 text-slate-900" onClick={() => setFeatureTarget(null)} disabled={featureBusy}>
                Cancel
              </Button>
              <Button type="button" className="rounded-full bg-slate-950 px-4 text-white hover:bg-slate-800" onClick={() => void startFeatureCheckout()} disabled={featureBusy}>
                {featureBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className="mr-2 h-4 w-4" />}
                Pay and feature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
