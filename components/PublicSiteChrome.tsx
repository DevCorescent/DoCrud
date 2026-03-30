import Link from 'next/link';
import { ArrowRight, CalendarDays, CreditCard, House, LogIn, Mail } from 'lucide-react';
import { LandingSettings } from '@/types/document';
import { Button } from '@/components/ui/button';

interface PublicSiteChromeProps {
  softwareName: string;
  accentLabel: string;
  settings: LandingSettings;
  children: React.ReactNode;
}

const mobileNavItems = [
  { href: '/', label: 'Home', icon: House },
  { href: '/pricing', label: 'Pricing', icon: CreditCard },
  { href: '/schedule-demo', label: 'Demo', icon: CalendarDays },
  { href: '/contact', label: 'Contact', icon: Mail },
  { href: '/login', label: 'Login', icon: LogIn },
];

export default function PublicSiteChrome({ softwareName, accentLabel, settings, children }: PublicSiteChromeProps) {
  return (
    <main className="min-h-screen bg-[#f5f5f7] px-3 py-3 pb-28 text-slate-950 sm:px-5 sm:py-5 sm:pb-8 lg:px-8">
      <div className="mx-auto max-w-[92rem] space-y-6 lg:space-y-8">
        <header className="sticky top-3 z-30 rounded-[1.4rem] border border-black/5 bg-white/88 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-2xl sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-500 sm:text-[11px]">{accentLabel}</p>
                <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[1.8rem]">{softwareName}</h1>
              </Link>
              <div className="hidden rounded-full border border-black/5 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-600 sm:inline-flex">
                Enterprise-grade workflows
              </div>
            </div>

            <nav className="hidden flex-wrap items-center gap-2 text-sm text-slate-600 md:flex">
              <Link href="/" className="rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950">Home</Link>
              <Link href="/pricing" className="rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950">Pricing</Link>
              <Link href="/contact" className="rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950">Contact</Link>
              <Link href="/schedule-demo" className="rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950">Schedule Demo</Link>
              <Button asChild variant="outline" className="rounded-full border-slate-200 bg-white">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-slate-200 bg-white">
                <Link href="/signup">Start Free</Link>
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

        <footer className="rounded-[1.6rem] border border-black/5 bg-white px-5 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.05)] sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{accentLabel}</p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{softwareName}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Premium document operations software for teams that need stronger controls, cleaner execution, and a better client-facing experience.
              </p>
            </div>

            <div className="grid gap-2 text-sm text-slate-600 sm:text-right">
              <Link href="/pricing" className="hover:text-slate-950">Pricing</Link>
              <Link href="/contact" className="hover:text-slate-950">Contact</Link>
              <Link href="/schedule-demo" className="hover:text-slate-950">Schedule Demo</Link>
              <a href={`mailto:${settings.contactEmail}`} className="hover:text-slate-950">{settings.contactEmail}</a>
            </div>
          </div>
        </footer>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 md:hidden">
        <div className="grid grid-cols-5 rounded-[1.6rem] border border-black/5 bg-white/95 px-2 py-2 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
          {mobileNavItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 rounded-[1rem] px-2 py-2 text-[10px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
