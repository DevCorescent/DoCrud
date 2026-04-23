'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, Globe2, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getIndustryWorkspaceProfile, getWorkspacePresetLabel, industryOptions, workspacePresetOptions } from '@/lib/industry-presets';

const stepLabels = ['Company', 'Industry', 'Workspace'];

type BusinessSignupFormProps = {
  initialPlanId?: string;
  initialConfig?: string;
};

export default function BusinessSignupForm({ initialPlanId, initialConfig }: BusinessSignupFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
    organizationDomain: '',
    industry: 'technology',
    companySize: '1-25',
    primaryUseCase: '',
    workspacePreset: 'executive_control',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const selectedPlanId = initialPlanId;

  const industryProfile = useMemo(() => getIndustryWorkspaceProfile(form.industry), [form.industry]);

  const nextStep = () => setStep((prev) => Math.min(prev + 1, stepLabels.length - 1));
  const previousStep = () => setStep((prev) => Math.max(prev - 1, 0));

  const canMoveForward = useMemo(() => {
    if (step === 0) {
      return Boolean(form.name.trim() && form.email.trim() && form.password.trim() && form.organizationName.trim());
    }
    if (step === 1) {
      return Boolean(form.industry && form.companySize && form.primaryUseCase.trim());
    }
    return Boolean(form.workspacePreset);
  }, [form, step]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!policyAccepted) {
      setError('You must accept the required policies before creating a workspace.');
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/saas/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, policyAccepted: true }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to create business profile');
      }

      const loginResult = await signIn('credentials', {
        email: form.email.trim(),
        password: form.password,
        policyAccepted: 'accepted',
        redirect: false,
        callbackUrl: selectedPlanId ? `/checkout?plan=${selectedPlanId}${initialConfig ? `&config=${initialConfig}` : ''}` : '/welcome',
      });

      if (!loginResult || loginResult.error) {
        setSuccess('Workspace created successfully. Please log in to continue.');
        setTimeout(() => {
          router.push('/login');
        }, 1200);
        return;
      }

      setSuccess(payload?.message || 'Business workspace created successfully.');
      const destination = loginResult.url
        ? `${new URL(loginResult.url, window.location.origin).pathname}${new URL(loginResult.url, window.location.origin).search}`
        : (selectedPlanId ? `/checkout?plan=${selectedPlanId}${initialConfig ? `&config=${initialConfig}` : ''}` : '/welcome');
      router.replace(destination);
      router.refresh();
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Failed to create business profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="min-w-0 overflow-hidden rounded-[2.35rem] border border-white/80 bg-white/84 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
      <CardHeader className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.86))] px-6 py-6 sm:px-8">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
          <Building2 className="h-4 w-4" />
          Guided SaaS Onboarding
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <CardTitle className="mt-1 text-2xl tracking-tight sm:text-3xl">Set up your workspace with a cleaner, production-ready onboarding flow.</CardTitle>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Each step only asks for what is needed right now. We shape the workspace structure, dashboard focus, and operating preset before your team enters the product.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {stepLabels.map((label, index) => (
                <div key={label} className={`rounded-[1.35rem] border px-4 py-3 ${index === step ? 'border-slate-900 bg-slate-950 text-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]' : index < step ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-500'}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">Step {index + 1}</p>
                  <p className="mt-1 text-sm font-semibold">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-0 rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(241,245,249,0.92))] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <Sparkles className="h-4 w-4" />
              Your Workspace Preview
            </div>
            <p className="mt-3 text-lg font-semibold text-slate-950">{industryProfile.label} workspace</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{industryProfile.heroDescription}</p>
            <div className="mt-4 rounded-2xl border border-white/80 bg-white/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preset</p>
              <p className="mt-1 text-sm font-medium text-slate-950">{getWorkspacePresetLabel(form.workspacePreset)}</p>
            </div>
            <div className="mt-4 space-y-2">
              {industryProfile.dashboardFocus.map((item) => (
                <div key={item} className="rounded-2xl border border-white/80 bg-white/90 px-3 py-2 text-sm text-slate-700">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-w-0 px-5 py-6 sm:px-8 sm:py-8">
        <form className="space-y-8" onSubmit={handleSubmit}>
          {step === 0 && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Admin Name</label>
                  <Input className="h-12 rounded-2xl border-slate-200 bg-slate-50/70" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Kushagra Sharma" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Business Email</label>
                  <Input className="h-12 rounded-2xl border-slate-200 bg-slate-50/70" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="admin@company.com" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Organization Name</label>
                  <Input className="h-12 rounded-2xl border-slate-200 bg-slate-50/70" value={form.organizationName} onChange={(event) => setForm((prev) => ({ ...prev, organizationName: event.target.value }))} placeholder="Acme Technologies Pvt. Ltd." />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Organization Domain</label>
                  <Input className="h-12 rounded-2xl border-slate-200 bg-slate-50/70" value={form.organizationDomain} onChange={(event) => setForm((prev) => ({ ...prev, organizationDomain: event.target.value }))} placeholder="example.com" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                  <Input className="h-12 rounded-2xl border-slate-200 bg-slate-50/70" type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} placeholder="Create a secure password" />
                </div>
              </div>
              <div className="min-w-0 rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.92))] p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <ShieldCheck className="h-4 w-4" />
                  Company setup guide
                </div>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <p>Use the primary admin email that should own billing, branding, and initial workspace setup.</p>
                  <p>Your organization domain helps the workspace feel more business-ready from day one.</p>
                  <p>This step only sets account ownership. Team members can be added later inside the workspace.</p>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Industry</label>
                  <select value={form.industry} onChange={(event) => setForm((prev) => ({ ...prev, industry: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm">
                    {industryOptions.map((option) => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Company Size</label>
                  <select value={form.companySize} onChange={(event) => setForm((prev) => ({ ...prev, companySize: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm">
                    <option value="1-25">1-25</option>
                    <option value="26-100">26-100</option>
                    <option value="101-500">101-500</option>
                    <option value="500+">500+</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Primary Use Case</label>
                  <textarea value={form.primaryUseCase} onChange={(event) => setForm((prev) => ({ ...prev, primaryUseCase: event.target.value }))} className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm" placeholder="Example: onboarding offers, vendor paperwork, contract approvals, recurring client agreements" />
                </div>
              </div>
              <div className="min-w-0 rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.92))] p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <Layers3 className="h-4 w-4" />
                  Recommended Focus
                </div>
                <p className="mt-3 text-lg font-semibold text-slate-950">{industryProfile.heroTitle}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{industryProfile.summary}</p>
                <div className="mt-4 space-y-2">
                  {industryProfile.recommendedModules.map((item) => (
                    <div key={item} className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">{item}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {workspacePresetOptions.map((preset) => {
                    const active = form.workspacePreset === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, workspacePreset: preset.key }))}
                        className={`rounded-[1.55rem] border p-5 text-left transition ${active ? 'border-slate-900 bg-slate-950 text-white shadow-[0_24px_50px_rgba(15,23,42,0.16)]' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'}`}
                      >
                        <p className="font-semibold">{preset.label}</p>
                        <p className={`mt-2 text-sm leading-6 ${active ? 'text-slate-200' : 'text-slate-500'}`}>{preset.description}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    What you get instantly
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm">Industry-aligned dashboard focus</div>
                    <div className="rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm">Editable starter templates for future reuse</div>
                    <div className="rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm">Workspace guidance with step-wise tutorials</div>
                    <div className="rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm">Plan-aware SaaS provisioning and reporting</div>
                  </div>
                </div>
              </div>
              <div className="min-w-0 rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.92))] p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Starter rollout</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{industryProfile.label} starter pack</p>
                <div className="mt-4 space-y-3">
                  {industryProfile.onboardingSteps.map((item, index) => (
                    <div key={item} className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                      <span className="mr-2 font-semibold text-slate-900">{index + 1}.</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
              <input type="checkbox" checked={policyAccepted} onChange={(event) => setPolicyAccepted(event.target.checked)} className="mt-1" />
              <span>
                I agree to docrud’s <Link href="/terms-and-conditions" className="font-medium text-slate-950 underline underline-offset-4">Terms & Conditions</Link>, <Link href="/privacy-policy" className="font-medium text-slate-950 underline underline-offset-4">Privacy Policy</Link>, <Link href="/refund-and-cancellation-policy" className="font-medium text-slate-950 underline underline-offset-4">Refund & Cancellation Policy</Link>, and all linked product policies before using the software.
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}

          <div className="flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium">Step {step + 1} of {stepLabels.length}</span>
              <span className="inline-flex items-center gap-2">
                <Globe2 className="h-4 w-4" />
                Built for a clean business onboarding flow
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={previousStep} className="w-full rounded-full sm:w-auto">
                  Back
                </Button>
              )}
              {step < stepLabels.length - 1 ? (
                <Button type="button" onClick={nextStep} disabled={!canMoveForward} className="w-full rounded-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting || !canMoveForward || !policyAccepted} className="w-full rounded-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto">
                  {isSubmitting ? 'Creating Workspace...' : 'Create Business Workspace'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
