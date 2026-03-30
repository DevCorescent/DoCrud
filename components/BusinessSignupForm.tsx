'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ArrowRight, Building2, CheckCircle2, Layers3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getIndustryWorkspaceProfile, getWorkspacePresetLabel, industryOptions, workspacePresetOptions } from '@/lib/industry-presets';

const stepLabels = ['Company', 'Industry', 'Workspace'];

export default function BusinessSignupForm() {
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
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/saas/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to create business profile');
      }

      const loginResult = await signIn('credentials', {
        email: form.email.trim(),
        password: form.password,
        redirect: false,
        callbackUrl: '/workspace',
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
        ? new URL(loginResult.url, window.location.origin).pathname
        : '/workspace';
      router.replace(destination);
      router.refresh();
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Failed to create business profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-[2.25rem] border border-white/80 bg-white/82 shadow-[0_24px_90px_rgba(15,23,42,0.1)] backdrop-blur-2xl">
      <CardHeader className="space-y-5">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
          <Building2 className="h-4 w-4" />
          Guided SaaS Onboarding
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <CardTitle className="mt-1 text-3xl">Create a premium business workspace with industry-ready onboarding.</CardTitle>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              This setup flow prepares your workspace layout, dashboard focus, and editable starter templates before your team even logs in.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {stepLabels.map((label, index) => (
                <div key={label} className={`rounded-2xl border px-4 py-3 text-sm ${index === step ? 'border-slate-900 bg-slate-950 text-white' : index < step ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Step {index + 1}</p>
                  <p className="mt-1 font-semibold">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-800 p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
              <Sparkles className="h-4 w-4" />
              Your Workspace Preview
            </div>
            <p className="mt-3 text-lg font-semibold">{industryProfile.label} workspace</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{industryProfile.heroDescription}</p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Preset</p>
              <p className="mt-1 text-sm font-medium">{getWorkspacePresetLabel(form.workspacePreset)}</p>
            </div>
            <div className="mt-4 space-y-2">
              {industryProfile.dashboardFocus.map((item) => (
                <div key={item} className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-slate-100">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {step === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Admin Name</label>
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Business Email</label>
                <Input type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Organization Name</label>
                <Input value={form.organizationName} onChange={(event) => setForm((prev) => ({ ...prev, organizationName: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Organization Domain</label>
                <Input value={form.organizationDomain} onChange={(event) => setForm((prev) => ({ ...prev, organizationDomain: event.target.value }))} placeholder="example.com" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <Input type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Industry</label>
                  <select value={form.industry} onChange={(event) => setForm((prev) => ({ ...prev, industry: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    {industryOptions.map((option) => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Company Size</label>
                  <select value={form.companySize} onChange={(event) => setForm((prev) => ({ ...prev, companySize: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option value="1-25">1-25</option>
                    <option value="26-100">26-100</option>
                    <option value="101-500">101-500</option>
                    <option value="500+">500+</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Primary Use Case</label>
                  <textarea value={form.primaryUseCase} onChange={(event) => setForm((prev) => ({ ...prev, primaryUseCase: event.target.value }))} className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Example: onboarding offers, vendor paperwork, contract approvals, recurring client agreements" />
                </div>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-slate-50/90 p-5">
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
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {workspacePresetOptions.map((preset) => {
                    const active = form.workspacePreset === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, workspacePreset: preset.key }))}
                        className={`rounded-[24px] border p-5 text-left transition ${active ? 'border-slate-900 bg-slate-950 text-white shadow-[0_24px_50px_rgba(15,23,42,0.18)]' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'}`}
                      >
                        <p className="font-semibold">{preset.label}</p>
                        <p className={`mt-2 text-sm leading-6 ${active ? 'text-slate-200' : 'text-slate-500'}`}>{preset.description}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
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
              <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
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

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-500">
              Step {step + 1} of {stepLabels.length}
            </div>
            <div className="flex gap-2">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={previousStep}>
                  Back
                </Button>
              )}
              {step < stepLabels.length - 1 ? (
                <Button type="button" onClick={nextStep} disabled={!canMoveForward} className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting || !canMoveForward} className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
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
