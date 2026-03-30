'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl: '/workspace',
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
        : '/workspace';

      router.replace(destination);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="clay-hero hidden rounded-[2.5rem] p-10 text-white lg:block">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.32em] text-white/80">
            Secure workspace access
          </p>
          <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-tight">Enterprise document workflows with governed access and client-ready delivery.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/80">
            Sign in to manage document operations, approvals, file governance, audit history, and client collaboration from one unified platform.
          </p>
        </div>

        <div className="w-full rounded-[2.5rem] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="inline-flex items-center rounded-2xl bg-slate-950 px-5 py-3 text-2xl font-black lowercase tracking-[0.14em] text-white shadow-[0_18px_42px_rgba(15,23,42,0.18)]">
              docrud
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Login to docrud</h1>
          </div>
          <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              required
            />
          </div>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-black py-2 text-white transition-colors hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing In...' : 'Login'}
          </button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">Use your assigned organization credentials to continue.</p>
            <p className="text-xs text-gray-500">Need access? Contact your platform administrator for a role-based account.</p>
            <p className="mt-3 text-sm text-slate-600">
              New business? <Link href="/signup" className="font-medium text-slate-950 underline underline-offset-4">Create a free SaaS profile</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
