'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock3, Gavel, Loader2, MapPin, Sparkles } from 'lucide-react';
import type { GigListing, LandingSettings } from '@/types/document';
import PublicSiteChrome from '@/components/PublicSiteChrome';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface PublicGigDetailPageProps {
  settings: LandingSettings;
  softwareName: string;
  accentLabel: string;
  gig: GigListing;
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  const diffHours = Math.max(0, Math.round((Date.now() - date.getTime()) / 3600000));
  if (diffHours < 1) return 'Updated just now';
  if (diffHours < 24) return `Updated ${diffHours}h ago`;
  return `Updated ${Math.round(diffHours / 24)}d ago`;
}

export default function PublicGigDetailPage({
  settings,
  softwareName,
  accentLabel,
  gig,
}: PublicGigDetailPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAuthenticated = status === 'authenticated' && Boolean(session?.user);
  const [connectOpen, setConnectOpen] = useState(false);
  const [note, setNote] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [bidOpen, setBidOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidTimeline, setBidTimeline] = useState('');
  const [bidNote, setBidNote] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [bidFeedback, setBidFeedback] = useState('');

  const submitConnect = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!note.trim()) {
      setFeedback('Add a short intro before sending your request.');
      return;
    }
    try {
      setLoading(true);
      setFeedback('');
      const response = await fetch('/api/gigs/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gigId: gig.id,
          note: note.trim(),
          portfolioUrl: portfolioUrl.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to connect right now.');
      }
      setFeedback('Connection request sent directly to the gig owner.');
      setConnectOpen(false);
      setNote('');
      setPortfolioUrl('');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to connect right now.');
    } finally {
      setLoading(false);
    }
  };

  const submitBid = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    const amount = Math.round(Number(bidAmount));
    if (!Number.isFinite(amount) || amount <= 0) {
      setBidFeedback('Enter a valid bid amount.');
      return;
    }
    if (!bidNote.trim()) {
      setBidFeedback('Add a short note for the gig owner.');
      return;
    }
    try {
      setBidLoading(true);
      setBidFeedback('');
      const response = await fetch('/api/gigs/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gigId: gig.id,
          amountInRupees: amount,
          timelineLabel: bidTimeline.trim() || undefined,
          note: bidNote.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to submit bid right now.');
      }
      setBidFeedback('Bid submitted. The gig owner will see it inside their workspace.');
      setBidOpen(false);
      setBidAmount('');
      setBidTimeline('');
      setBidNote('');
    } catch (error) {
      setBidFeedback(error instanceof Error ? error.message : 'Unable to submit bid right now.');
    } finally {
      setBidLoading(false);
    }
  };

  return (
    <PublicSiteChrome softwareName={softwareName} accentLabel={accentLabel} settings={settings}>
      <section className="cloud-panel rounded-[2rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <Link href="/gigs" className="inline-flex items-center rounded-full bg-white/76 px-4 py-2 text-sm font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl hover:bg-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to gigs
        </Link>

        <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_0.38fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">{gig.category}</span>
              <span className="rounded-full bg-white/76 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{gig.visibility}</span>
              <span className="rounded-full bg-white/76 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{gig.engagementType.replace('_', ' ')}</span>
            </div>
            <div>
              <h1 className="text-[1.9rem] font-semibold tracking-[-0.06em] text-slate-950 sm:text-[2.4rem]">{gig.title}</h1>
              <p className="mt-3 max-w-3xl text-[15px] leading-8 text-slate-600">{gig.summary}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.3rem] bg-white/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Budget</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{gig.budgetLabel}</p>
              </div>
              <div className="rounded-[1.3rem] bg-white/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Timeline</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{gig.timelineLabel || 'Flexible'}</p>
              </div>
              <div className="rounded-[1.3rem] bg-white/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Responses</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{gig.connectCount}</p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.64))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Interests</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {gig.interests.map((interest) => (
                    <span key={interest} className="rounded-full bg-white/82 px-3 py-1.5 text-sm font-medium text-slate-700">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.64))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Skills wanted</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {gig.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-white/82 px-3 py-1.5 text-sm font-medium text-slate-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.68))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Expected deliverables</h2>
              <div className="mt-4 grid gap-3">
                {gig.deliverables.map((item, index) => (
                  <div key={`${gig.id}-${index}`} className="rounded-[1.15rem] bg-white/78 px-4 py-3 text-sm leading-6 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            {(gig.bidMode || 'fixed') === 'bidding' ? (
              <div className="rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(30,41,59,0.92))] p-5 text-white shadow-[0_26px_70px_rgba(15,23,42,0.26)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Bidding open</p>
                <p className="mt-3 text-sm leading-7 text-slate-100">
                  Submit a clean bid with your expected timeline. Login is required to keep spam out.
                </p>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  {gig.bidRules?.minBidInRupees ? <p>Min bid: <span className="font-semibold text-slate-100">₹{gig.bidRules.minBidInRupees}</span></p> : null}
                  {gig.bidRules?.bidDeadlineAt ? (() => {
                    const date = new Date(gig.bidRules!.bidDeadlineAt!);
                    if (Number.isNaN(date.getTime())) return null;
                    return (
                      <p>
                        Deadline:{' '}
                        <span className="font-semibold text-slate-100">
                          {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date)}
                        </span>
                      </p>
                    );
                  })() : null}
                </div>
                <Button
                  type="button"
                  className="mt-5 w-full rounded-full bg-white text-slate-950 hover:bg-slate-100"
                  onClick={() => {
                    if (!isAuthenticated) {
                      router.push('/login');
                      return;
                    }
                    setBidOpen(true);
                    setBidFeedback('');
                  }}
                >
                  <Gavel className="mr-2 h-4 w-4" />
                  Place bid
                </Button>
              </div>
            ) : null}

            <div className="rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(30,41,59,0.92))] p-5 text-white shadow-[0_26px_70px_rgba(15,23,42,0.26)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Connect directly</p>
              <p className="mt-3 text-sm leading-7 text-slate-100">
                Login is required before we open direct outreach. That keeps the flow cleaner for both the gig owner and the person applying.
              </p>
              <Button
                type="button"
                className="mt-5 w-full rounded-full bg-white text-slate-950 hover:bg-slate-100"
                onClick={() => {
                  if (!isAuthenticated) {
                    router.push('/login');
                    return;
                  }
                  setConnectOpen(true);
                }}
              >
                Start connection
              </Button>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <p className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" /> {formatRelativeTime(gig.updatedAt)}</p>
                <p className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> {gig.locationPreference} delivery</p>
              </div>
            </div>

            <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.66))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Posted by</p>
              <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">{gig.organizationName || gig.ownerName}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Contact preference: <span className="font-semibold capitalize text-slate-800">{gig.contactPreference}</span>
              </p>
              <Button asChild variant="outline" className="mt-5 w-full rounded-full border-white/0 bg-white/80 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <Link href="/workspace?tab=gigs">Open gigs studio</Link>
              </Button>
            </div>
          </aside>
        </div>
      </section>

      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="max-w-xl rounded-[1.7rem] border-white/0 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.78))] p-0 shadow-[0_28px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
          <DialogHeader className="border-b border-white/55 px-6 py-5">
            <DialogTitle className="text-left text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">
              Connect for {gig.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-[130px] w-full rounded-[1.2rem] border border-slate-200 bg-white/90 px-4 py-3 text-sm leading-6 text-slate-900 outline-none"
              placeholder="Share a strong intro, the angle you would take, and your expected start window."
            />
            <Input
              value={portfolioUrl}
              onChange={(event) => setPortfolioUrl(event.target.value)}
              placeholder="Portfolio or proof-of-work link (optional)"
              className="rounded-[1.1rem] border-slate-200 bg-white/88"
            />
            {feedback ? <p className="text-sm text-slate-600">{feedback}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full border-white/0 bg-white/76 px-4 text-slate-900" onClick={() => setConnectOpen(false)}>
                Cancel
              </Button>
              <Button type="button" className="rounded-full bg-slate-950 px-4 text-white hover:bg-slate-800" onClick={submitConnect} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Send request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bidOpen} onOpenChange={setBidOpen}>
        <DialogContent className="max-w-xl rounded-[1.7rem] border-white/0 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.78))] p-0 shadow-[0_28px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
          <DialogHeader className="border-b border-white/55 px-6 py-5">
            <DialogTitle className="text-left text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">
              Place bid for {gig.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={bidAmount}
                onChange={(event) => setBidAmount(event.target.value)}
                placeholder="Bid amount (INR)"
                className="rounded-[1.1rem] border-slate-200 bg-white/88"
                inputMode="numeric"
              />
              <Input
                value={bidTimeline}
                onChange={(event) => setBidTimeline(event.target.value)}
                placeholder="Timeline label (optional)"
                className="rounded-[1.1rem] border-slate-200 bg-white/88"
              />
            </div>
            <textarea
              value={bidNote}
              onChange={(event) => setBidNote(event.target.value)}
              className="min-h-[130px] w-full rounded-[1.2rem] border border-slate-200 bg-white/90 px-4 py-3 text-sm leading-6 text-slate-900 outline-none"
              placeholder="How would you approach this work, and what makes you a strong fit?"
            />
            {bidFeedback ? <p className="text-sm text-slate-600">{bidFeedback}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full border-white/0 bg-white/76 px-4 text-slate-900" onClick={() => setBidOpen(false)}>
                Cancel
              </Button>
              <Button type="button" className="rounded-full bg-slate-950 px-4 text-white hover:bg-slate-800" onClick={submitBid} disabled={bidLoading}>
                {bidLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gavel className="mr-2 h-4 w-4" />}
                Submit bid
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PublicSiteChrome>
  );
}
