import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LandingSettings } from '@/types/document';
import { Button } from '@/components/ui/button';

interface PublicSiteChromeProps {
  softwareName: string;
  accentLabel: string;
  settings: LandingSettings;
  children: React.ReactNode;
}

export default function PublicSiteChrome({ softwareName, accentLabel, settings, children }: PublicSiteChromeProps) {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2rem] border border-white/70 bg-white/65 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">{accentLabel}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{softwareName}</h1>
            </div>
            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <Link href="/" className="rounded-full px-3 py-2 transition hover:bg-white/70 hover:text-slate-950">Home</Link>
              <Link href="/pricing" className="rounded-full px-3 py-2 transition hover:bg-white/70 hover:text-slate-950">Pricing</Link>
              <Link href="/contact" className="rounded-full px-3 py-2 transition hover:bg-white/70 hover:text-slate-950">Contact</Link>
              <Link href="/schedule-demo" className="rounded-full px-3 py-2 transition hover:bg-white/70 hover:text-slate-950">Schedule Demo</Link>
              <Link href="/signup" className="rounded-full px-3 py-2 transition hover:bg-white/70 hover:text-slate-950">Start Free</Link>
              <Button asChild variant="outline" className="rounded-full border-white/70 bg-white/60">
                <Link href="/login">Client and Team Login</Link>
              </Button>
              <Button asChild className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
                <a href={settings.primaryCtaHref || '/schedule-demo'}>
                  {settings.primaryCtaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </nav>
          </div>
        </header>

        {children}

        <footer className="rounded-[2rem] border border-white/70 bg-white/60 px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">{softwareName}</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Premium document operations for enterprise teams that need cleaner execution, stronger governance, and a client-ready experience.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <Link href="/pricing" className="hover:text-slate-950">Pricing</Link>
              <Link href="/contact" className="hover:text-slate-950">Contact</Link>
              <Link href="/schedule-demo" className="hover:text-slate-950">Schedule Demo</Link>
              <a href={`mailto:${settings.contactEmail}`} className="hover:text-slate-950">{settings.contactEmail}</a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
