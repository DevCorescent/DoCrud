'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import DocrudLogo from '@/components/DocrudLogo';
import { requiredPolicyIds, policyDefinitions } from '@/lib/policies';

const loginHighlights = [
  { label: 'One login', value: 'Docs, AI, forms, sharing' },
  { label: 'Protected', value: 'Policy-aware access' },
  { label: 'Built for', value: 'Teams and solo pros' },
];

const loginSignals = [
  'Business workspace access',
  'Individual profile access',
  'Internal team login support',
];

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('/workspace');
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    void fetch('/api/settings/auth')
      .then((response) => response.json().catch(() => null))
      .then((payload) => {
        if (!alive) return;
        setGoogleEnabled(Boolean(payload?.googleEnabled));
      })
      .catch(() => {
        if (!alive) return;
        setGoogleEnabled(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextPath = new URLSearchParams(window.location.search).get('next') || '/workspace';
    setCallbackUrl(nextPath);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!policyAccepted) {
      setError('You must accept the required policies before using docrud.');
      return;
    }
    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        email: identifier.trim(),
        password,
        policyAccepted: 'accepted',
        redirect: false,
        callbackUrl,
      });

      if (!result) {
        throw new Error('Unable to reach the authentication service. Please try again.');
      }

      if (result.error) {
        setError('Invalid credentials');
        return;
      }

      const destination = result.url
        ? new URL(result.url, window.location.origin).pathname
        : callbackUrl;

      router.replace(destination);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    if (!policyAccepted) {
      setError('Accept the required policies before continuing with Google.');
      return;
    }
    await signIn('google', { callbackUrl });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.24),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.18),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_42%,#f8fafc_100%)] px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-7xl gap-5 lg:grid-cols-[1.06fr_0.94fr] lg:items-stretch">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(232,243,255,0.78))] p-6 shadow-[0_28px_80px_rgba(59,130,246,0.10)] backdrop-blur xl:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.20),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_24%)]" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-700 shadow-sm sm:text-[11px]">
                <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                Welcome back
              </div>
              <h1 className="mt-5 max-w-xl text-[2.35rem] font-semibold leading-[0.94] tracking-[-0.06em] text-slate-950 sm:text-[3.5rem]">
                Clean access to your full docrud workflow.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                Sign in once and jump back into documents, AI tools, approvals, forms, secure sharing, and daily work.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {loginHighlights.map((item) => (
                <div key={item.label} className="rounded-[1.4rem] border border-white/80 bg-white/80 px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] backdrop-blur">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.6rem] border border-slate-200/80 bg-slate-950 px-5 py-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-sky-300" />
                  Trusted access
                </div>
                <div className="mt-4 space-y-3">
                  {loginSignals.map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                      <span className="text-sm text-slate-100">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-white/80 bg-white/82 px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <LockKeyhole className="h-4 w-4 text-slate-700" />
                  Quick access
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p>Use your business email, personal account, or workspace login ID.</p>
                  <p>Need a team login? Your workspace owner can create one from Team Workspace.</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                    Create workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/individual-signup" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    Personal profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[2rem] border border-white/80 bg-white/88 p-5 shadow-[0_28px_80px_rgba(15,23,42,0.10)] backdrop-blur sm:p-7 lg:p-8">
            <div className="mb-6">
              <DocrudLogo className="max-w-[13.75rem]" height={54} priority />
              <h2 className="mt-4 text-[1.9rem] font-semibold tracking-[-0.04em] text-slate-950">
                Log in
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Smooth, secure access to your workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email or login ID</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@company.com or workspace ID"
                  className="w-full rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  required
                />
              </div>

              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/90 px-4 py-3.5">
                <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                  <input
                    type="checkbox"
                    checked={policyAccepted}
                    onChange={(e) => setPolicyAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950"
                  />
                  <span>
                    I agree to the required docrud policies, including{' '}
                    {policyDefinitions.filter((policy) => requiredPolicyIds.includes(policy.id)).slice(0, 3).map((policy, index) => (
                      <span key={policy.id}>
                        {index > 0 ? ', ' : ''}
                        <Link href={policy.href} className="font-medium text-slate-950 underline underline-offset-4">
                          {policy.shortLabel}
                        </Link>
                      </span>
                    ))}
                    , before using the software.
                  </span>
                </label>
              </div>

              {error ? (
                <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[1.15rem] bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in...' : 'Enter workspace'}
              </button>

              {googleEnabled ? (
                <button
                  type="button"
                  onClick={() => void handleGoogleLogin()}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,#34a853_0deg,#4285f4_120deg,#fbbc05_220deg,#ea4335_320deg,#34a853_360deg)] text-[11px] font-black text-white">G</span>
                  Continue with Google
                </button>
              ) : null}
            </form>

            <div className="mt-6 space-y-2 text-sm text-slate-600">
              <p>
                New business?{' '}
                <Link href="/signup" className="font-medium text-slate-950 underline underline-offset-4">
                  Create a business workspace
                </Link>
              </p>
              <p>
                Individual user?{' '}
                <Link href="/individual-signup" className="font-medium text-slate-950 underline underline-offset-4">
                  Create a personal profile
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
