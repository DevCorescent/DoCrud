'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { BrainCircuit, CreditCard, ShieldCheck, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const individualPlanCards = [
  {
    title: 'docrud Workspace Trial',
    note: 'Best way to start',
    description: 'Create your login-based workspace, use admin-enabled non-AI features immediately, and get a few AI tries before upgrading.',
  },
  {
    title: 'docrud Workspace Pro',
    note: 'Best for regular usage',
    description: 'Upgrade smoothly to ₹299/month for full feature access and recurring AI credits across the workspace.',
  },
  {
    title: 'Build Your Own Workspace',
    note: 'Best for tailored usage',
    description: 'Choose the exact features, AI allowance, and capacity you need and pay a recurring monthly amount accordingly.',
  },
];

type IndividualSignupFormProps = {
  initialPlanId?: string;
  initialConfig?: string;
};

export default function IndividualSignupForm({ initialPlanId, initialConfig }: IndividualSignupFormProps) {
  const router = useRouter();
  const requestedPlanId = initialPlanId === 'workspace-pro' ? 'workspace-pro' : 'workspace-trial';
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    profession: '',
      primaryUseCase: '',
      selectedPlanId: requestedPlanId,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!policyAccepted) {
      setError('You must accept the required policies before creating a profile.');
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/individual/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, policyAccepted: true }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to create individual profile');
      }

      const loginResult = await signIn('credentials', {
        email: form.email.trim(),
        password: form.password,
        policyAccepted: 'accepted',
        redirect: false,
        callbackUrl: form.selectedPlanId ? `/checkout?plan=${form.selectedPlanId}${initialConfig ? `&config=${initialConfig}` : ''}` : '/welcome',
      });

      if (!loginResult || loginResult.error) {
        setSuccess('Individual profile created successfully. Please log in to continue.');
        router.push('/login');
        return;
      }

      setSuccess(payload?.message || 'Individual profile created successfully.');
      router.replace(form.selectedPlanId ? `/checkout?plan=${form.selectedPlanId}${initialConfig ? `&config=${initialConfig}` : ''}` : '/welcome');
      router.refresh();
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Failed to create individual profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-[2.25rem] border border-white/80 bg-white/88 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
      <CardHeader className="space-y-5">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
          <UserRound className="h-4 w-4" />
          Individual Access
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <CardTitle className="mt-1 text-3xl">Create your personal docrud profile.</CardTitle>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              This path now starts the same clean docrud workspace journey: trial first, then a smooth upgrade to Pro or a tailored monthly workspace when needed.
            </p>
          </div>
          <div className="rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_48%,#2563eb_100%)] p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
              <BrainCircuit className="h-4 w-4" />
              Personal AI workflow
            </div>
            <p className="mt-3 text-lg font-semibold">Use DoXpert, generate documents, and keep private history.</p>
            <div className="mt-4 space-y-2">
              <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm">30-day workspace trial</div>
              <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm">Non-AI features open immediately</div>
              <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm">A few AI tries before upgrade</div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <Input type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Profession</label>
              <Input value={form.profession} onChange={(event) => setForm((prev) => ({ ...prev, profession: event.target.value }))} placeholder="Freelancer, consultant, student, lawyer" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <Input type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Primary Use Case</label>
              <textarea value={form.primaryUseCase} onChange={(event) => setForm((prev) => ({ ...prev, primaryUseCase: event.target.value }))} className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Example: review agreements before signing, generate proposals, analyze notices with DoXpert" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {individualPlanCards.map((plan) => (
              <article key={plan.title} className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <CreditCard className="h-4 w-4" />
                  {plan.note}
                </div>
                <p className="mt-3 text-lg font-semibold text-slate-950">{plan.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{plan.description}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, selectedPlanId: 'workspace-trial' }))}
              className={`rounded-[24px] border p-5 text-left transition ${form.selectedPlanId === 'workspace-trial' ? 'border-slate-900 bg-slate-950 text-white shadow-[0_24px_50px_rgba(15,23,42,0.18)]' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'}`}
            >
              <p className="font-semibold">docrud Workspace Trial</p>
              <p className={`mt-2 text-sm leading-6 ${form.selectedPlanId === 'workspace-trial' ? 'text-slate-200' : 'text-slate-500'}`}>Start free for 30 days with admin-enabled non-AI features and a few AI tries.</p>
            </button>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, selectedPlanId: 'workspace-pro' }))}
              className={`rounded-[24px] border p-5 text-left transition ${form.selectedPlanId === 'workspace-pro' ? 'border-slate-900 bg-slate-950 text-white shadow-[0_24px_50px_rgba(15,23,42,0.18)]' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'}`}
            >
              <p className="font-semibold">docrud Workspace Pro</p>
              <p className={`mt-2 text-sm leading-6 ${form.selectedPlanId === 'workspace-pro' ? 'text-slate-200' : 'text-slate-500'}`}>Upgrade to full feature access with recurring AI credits at ₹299/month.</p>
            </button>
          </div>

          <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              <ShieldCheck className="h-4 w-4" />
              Business plans stay stronger
            </div>
            <p className="mt-3 text-sm leading-6 text-amber-900">
              Every new user now starts from the same docrud Workspace journey so the upgrade path stays simple: trial first, Pro next, and a tailored recurring build when your operating needs expand.
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
              <input type="checkbox" checked={policyAccepted} onChange={(event) => setPolicyAccepted(event.target.checked)} className="mt-1" />
              <span>
                I agree to docrud’s <Link href="/terms-and-conditions" className="font-medium text-slate-950 underline underline-offset-4">Terms & Conditions</Link>, <Link href="/privacy-policy" className="font-medium text-slate-950 underline underline-offset-4">Privacy Policy</Link>, <Link href="/refund-and-cancellation-policy" className="font-medium text-slate-950 underline underline-offset-4">Refund & Cancellation Policy</Link>, and all linked product policies before using the software.
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Need a team workspace instead? <Link href="/signup" className="font-medium text-slate-950 underline underline-offset-4">Create a business account</Link>
            </p>
            <Button type="submit" disabled={isSubmitting || !policyAccepted} className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">
              {isSubmitting ? 'Creating profile...' : 'Create Individual Profile'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
