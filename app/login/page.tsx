'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
        callbackUrl: '/',
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
        : '/';

      router.replace(destination);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/corescent-logo.png"
            alt="Corescent"
            width={212}
            height={82}
            className="h-auto w-[168px] sm:w-[212px]"
          />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Login to Document Generator</h1>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
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
          <p className="text-sm text-gray-600">Demo Accounts:</p>
          <p className="text-sm">Admin: admin@company.com / admin123</p>
          <p className="text-sm">HR: hr@company.com / hr123</p>
          <p className="text-sm">Legal: legal@company.com / legal123</p>
        </div>
      </div>
    </div>
  );
}
