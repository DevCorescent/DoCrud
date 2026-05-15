'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import {
  ArrowRight, Award, Bot, Briefcase, CheckCircle2, Eye, EyeOff,
  FileSignature, FileText, FormInput, Globe,
  Layers, MapPin, Network, PenLine, Shield, Share2,
  Sparkles, Users, X, Zap,
} from 'lucide-react';

/* ─── Constants ──────────────────────────────────────────────── */
const POPULAR_SKILLS = [
  'React','Node.js','Python','Figma','Product Design','TypeScript',
  'Go','Machine Learning','Data Science','Marketing','Content Writing',
  'SEO','Sales','Finance','Legal','Operations','UX Research',
  'Brand Design','Video Editing','Copywriting',
];
const INTEREST_CATEGORIES = [
  'Technology','Design','Business','Finance','Legal','Marketing',
  'Writing','Data & AI','Engineering','Product',
  'Healthcare','Education','Startup','Freelance',
];

const TOUR_END    = 3;
const SIGNUP_SCR  = 4;
const OTP_SCR     = 5;
const PROFILE_SCR = 6;
const SKILLS_SCR  = 7;
const PEOPLE_SCR  = 8;
const DONE_SCR    = 9;
const TOTAL_SCR   = 10;

/* Kept for non-heading uses (progress bar, step dots, strength meter) */
const GOLD_GRAD = 'linear-gradient(90deg,#C9A84C,#E8CC7A,#C9A84C)';

/* Shared input class — compact on mobile */
const INP = [
  'h-10 sm:h-11 w-full rounded-[12px] border border-white/[0.08]',
  'bg-white/[0.04] text-white px-3 text-[13px] sm:text-sm',
  'placeholder:text-white/20 focus:outline-none focus:border-white/[0.22]',
  'focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)]',
  'transition-all duration-200',
].join(' ');

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
}

/* ─── Particles ─────────────────────────────────────────────── */
const PARTICLES = [
  { x: 8,  y:12, s:2,   d:'0s',   t:'obParticle 4.2s ease-in-out infinite',  warm:false },
  { x:22,  y:68, s:1.5, d:'0.7s', t:'obParticle2 5.1s ease-in-out infinite', warm:true  },
  { x:45,  y:22, s:1.5, d:'1.2s', t:'obParticle 3.8s ease-in-out infinite',  warm:false },
  { x:63,  y:78, s:2,   d:'0.3s', t:'obParticle2 6.2s ease-in-out infinite', warm:false },
  { x:78,  y:35, s:1.5, d:'1.8s', t:'obParticle 4.6s ease-in-out infinite',  warm:false },
  { x:88,  y:82, s:2,   d:'0.9s', t:'obParticle2 5.5s ease-in-out infinite', warm:false },
  { x:35,  y:90, s:1.5, d:'2.1s', t:'obParticle 3.5s ease-in-out infinite',  warm:true  },
  { x:55,  y:48, s:2,   d:'0.5s', t:'obParticle2 4.9s ease-in-out infinite', warm:false },
  { x:92,  y:18, s:1.5, d:'1.5s', t:'obParticle 5.8s ease-in-out infinite',  warm:false },
  { x:18,  y:42, s:2,   d:'2.4s', t:'obParticle2 4.1s ease-in-out infinite', warm:false },
  { x:72,  y:60, s:1.5, d:'0.2s', t:'obParticle 6.0s ease-in-out infinite',  warm:false },
  { x:48,  y: 8, s:2,   d:'1.0s', t:'obParticle2 3.9s ease-in-out infinite', warm:false },
  { x:12,  y:85, s:1.5, d:'1.7s', t:'obParticle 5.3s ease-in-out infinite',  warm:false },
  { x:82,  y:50, s:2,   d:'0.6s', t:'obParticle2 4.4s ease-in-out infinite', warm:false },
  { x:30,  y:30, s:1.5, d:'2.8s', t:'obParticle 4.7s ease-in-out infinite',  warm:false },
  { x:67,  y:95, s:2,   d:'1.3s', t:'obParticle2 5.0s ease-in-out infinite', warm:false },
  { x:95,  y:70, s:1.5, d:'0.4s', t:'obParticle 3.6s ease-in-out infinite',  warm:false },
  { x: 5,  y:55, s:2,   d:'2.0s', t:'obParticle2 6.4s ease-in-out infinite', warm:false },
];

/* ─── Premium highlighter component ─────────────────────────── */
function Highlight({ children, delay = '0.48s' }: { children: React.ReactNode; delay?: string }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span
        aria-hidden
        className="absolute inset-x-[-4px] bottom-[-2px] top-[16%] rounded-[5px]"
        style={{
          background: 'linear-gradient(105deg,rgba(251,146,60,0.30) 0%,rgba(245,158,11,0.24) 45%,rgba(253,186,116,0.20) 100%)',
          transformOrigin: 'left center',
          animation: `obHighlight 0.90s ${delay} cubic-bezier(0.16,1,0.3,1) both`,
        }}
      />
      <span className="relative text-white">{children}</span>
    </span>
  );
}

/* ─── Screen transition ──────────────────────────────────────── */
function ScreenIn({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(r);
  }, []);
  return (
    <div style={{
      transition: 'opacity 420ms ease, transform 420ms cubic-bezier(.22,1,.36,1)',
      opacity: on ? 1 : 0,
      transform: on ? 'none' : 'translateY(20px)',
    }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BACKGROUND
═══════════════════════════════════════════════════════════════ */
function BgOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>

      {/* Orange-gold moving orbs */}
      <div className="absolute -left-40 -top-40 h-[800px] w-[800px] rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(251,146,60,0.20) 0%,rgba(245,158,11,0.12) 38%,rgba(234,88,12,0.05) 62%,transparent 76%)', filter: 'blur(95px)', animation: 'obGoldDrift1 30s ease-in-out infinite' }} />
      <div className="absolute -right-32 top-[12%] h-[660px] w-[660px] rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(245,158,11,0.17) 0%,rgba(251,146,60,0.09) 42%,rgba(253,186,116,0.04) 66%,transparent 78%)', filter: 'blur(85px)', animation: 'obGoldDrift2 38s ease-in-out infinite 5s' }} />
      <div className="absolute bottom-[-8%] left-[28%] h-[580px] w-[580px] rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(234,88,12,0.15) 0%,rgba(245,158,11,0.10) 40%,rgba(251,146,60,0.04) 64%,transparent 76%)', filter: 'blur(80px)', animation: 'obGoldDrift3 34s ease-in-out infinite 10s' }} />
      <div className="absolute right-[18%] bottom-[22%] h-[340px] w-[340px] rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(253,186,116,0.11) 0%,rgba(245,158,11,0.06) 52%,transparent 72%)', filter: 'blur(60px)', animation: 'obGoldDrift1 22s ease-in-out infinite 8s' }} />

      {/* Particles — warm amber + white */}
      {PARTICLES.map((p, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.s, height: p.s,
            animationDelay: p.d, animation: p.t,
            background: p.warm ? 'rgba(251,146,60,0.65)' : 'rgba(255,255,255,0.45)',
          }} />
      ))}

      {/* Glass grain */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '180px 180px' }} />

      {/* Micro-grid */}
      <div className="absolute inset-0 opacity-[0.016]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '64px 64px' }} />

      {/* Warm top glow */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 110% 60% at 50% -5%,rgba(245,158,11,0.06) 0%,transparent 55%)' }} />

      {/* Edge darken */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center,transparent 38%,rgba(5,5,8,0.82) 100%)' }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEFT PANELS  (desktop only — hidden on mobile)
═══════════════════════════════════════════════════════════════ */
function HeroLeftPanel() {
  const coreFeatures = [
    { Icon: FileSignature, label: 'E-Sign Studio',    sub: 'OTP-verified contracts',       delay: '0.10s' },
    { Icon: Bot,           label: 'Document AI',      sub: 'Generate docs in seconds',     delay: '0.18s' },
    { Icon: PenLine,       label: 'DocWord Studio',   sub: 'AI-powered editor',            delay: '0.26s' },
    { Icon: FormInput,     label: 'Form Builder',     sub: 'Smart forms & workflows',      delay: '0.34s' },
    { Icon: FileText,      label: 'PDF Studio',       sub: 'Annotate, watermark & share',  delay: '0.42s' },
    { Icon: Shield,        label: 'Compliance Vault', sub: 'SOC 2 & GDPR-ready',           delay: '0.50s' },
    { Icon: Users,         label: 'People Network',   sub: '3,400+ professionals',         delay: '0.58s' },
    { Icon: Zap,           label: 'Gig Board',        sub: 'Find & post opportunities',    delay: '0.66s' },
    { Icon: Layers,        label: 'DocSheet',         sub: 'Collaborative spreadsheets',   delay: '0.74s' },
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 xl:p-12 select-none">
      <div className="w-full max-w-md mb-6" style={{ animation: 'obSlideUp 0.5s both' }}>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.12]" />
          <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/22">Everything you need</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.12]" />
        </div>
        <h2 className="text-[2.2rem] font-black leading-[1.08] tracking-[-0.05em] text-white">
          One platform.<br />
          <Highlight delay="0.55s">Every tool.</Highlight>
        </h2>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-white/35">
          From AI-powered document creation to professional networking — everything a modern professional needs.
        </p>
      </div>
      <div className="w-full max-w-md grid grid-cols-3 gap-2.5">
        {coreFeatures.map(({ Icon, label, sub, delay }) => (
          <div key={label}
            className="group relative flex flex-col gap-2.5 overflow-hidden rounded-[16px] border border-white/[0.07] bg-white/[0.025] p-3.5 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.05]"
            style={{ animation: `obSlideUp 0.45s ${delay} ease both` }}>
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.06] transition-all group-hover:border-white/[0.16] group-hover:bg-white/[0.10]">
              <Icon className="h-4 w-4 text-white/55 transition-all group-hover:text-white/80" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-white/72 leading-tight">{label}</div>
              <div className="mt-0.5 text-[9.5px] text-white/28 leading-tight">{sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex w-full max-w-md items-center justify-between gap-4" style={{ animation: 'obSlideUp 0.5s 0.8s both' }}>
        {[['12k+','Published'],['3.4k','Creators'],['98%','Satisfy']].map(([v, l]) => (
          <div key={l} className="text-center">
            <div className="text-[24px] font-black text-white">{v}</div>
            <div className="text-[10px] font-medium text-white/28">{l}</div>
          </div>
        ))}
        <div className="flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <div className="relative h-1.5 w-1.5">
              <div className="absolute inset-0 rounded-full bg-white/50 animate-ping" />
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#D4AF37' }} />
            </div>
            <span className="text-[10px] font-bold text-white/45">Live</span>
          </div>
          <div className="text-[9.5px] text-white/28 leading-tight">Platform active<br />right now</div>
        </div>
      </div>
      <div className="mt-4 w-full max-w-md flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-2.5" style={{ animation: 'obFadeIn 0.5s 1.1s both' }}>
        <Shield className="h-3.5 w-3.5 shrink-0 text-white/25" />
        <span className="text-[10.5px] text-white/28">End-to-end encrypted · SOC 2 Type II · GDPR ready · 99.9% uptime SLA</span>
      </div>
    </div>
  );
}

function PublishLeftPanel() {
  const publishTypes = [
    { type: 'Article',   title: 'How Bengaluru Startups Rewrote Global SaaS Playbooks', badge: 'Trending',  reads: '29.6k', icon: FileText     },
    { type: 'Document',  title: 'DPDP Act 2023 — Enterprise Compliance Handbook',       badge: 'Featured',  reads: '318',   icon: FileSignature },
    { type: 'Portfolio', title: 'Reimagining IRCTC for the Next Billion Users',          badge: null,        reads: '14.2k', icon: Layers        },
    { type: 'Gig',       title: 'Brand System Refresh for a SaaS Launch · ₹35k–₹60k',  badge: 'New',       reads: '6 bids', icon: Zap          },
  ];
  return (
    <div className="flex flex-col justify-center h-full w-full max-w-lg mx-auto p-10 xl:p-14 select-none">
      <div className="mb-6" style={{ animation: 'obSlideUp 0.5s both' }}>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
          <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#D4AF37' }} />
          Live Feed
        </div>
        <h3 className="mt-3 text-[2rem] font-black text-white leading-[1.1] tracking-tight">
          Your content reaches<br />
          <Highlight delay="0.55s">thousands daily.</Highlight>
        </h3>
      </div>
      <div className="mb-4 flex items-center gap-3 rounded-[15px] border border-white/[0.06] bg-white/[0.03] px-4 py-3" style={{ animation: 'obSlideUp 0.5s 0.05s both' }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.05]">
          <svg className="h-4 w-4 text-white/40" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2l5 5H9v5H7V7H3z"/></svg>
        </div>
        <span className="flex-1 text-sm text-white/22">What are you sharing today?</span>
        <div className="flex h-7 items-center rounded-[9px] bg-white px-3 text-[11px] font-black text-[#050508]" style={{ boxShadow: '0 0 16px rgba(255,255,255,0.12)', animation: 'obPulse 3.5s ease-in-out infinite' }}>Publish</div>
      </div>
      <div className="space-y-2.5">
        {publishTypes.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={c.title}
              className="relative flex items-start gap-3 overflow-hidden rounded-[16px] border border-white/[0.05] bg-white/[0.025] px-4 py-3.5"
              style={{ animation: `obSlideUp 0.45s ${0.10 + i * 0.08}s both` }}>
              <div className="absolute inset-y-0 left-0 w-[2px] rounded-l-full bg-gradient-to-b from-white/30 via-white/10 to-transparent" />
              <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-[9px] border border-white/[0.07] bg-white/[0.04]">
                <Icon className="h-3 w-3 text-white/40" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-md border border-white/[0.08] bg-white/[0.06] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white/40">{c.type}</span>
                  {c.badge && <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white/55">{c.badge}</span>}
                </div>
                <p className="text-[12px] font-semibold text-white/70 line-clamp-1 leading-snug">{c.title}</p>
                <div className="mt-0.5 text-[10px] text-white/28">{c.reads} {c.type === 'Gig' ? '' : 'reads'}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5" style={{ animation: 'obSlideUp 0.5s 0.6s both' }}>
        <div className="mb-2 flex items-center justify-between text-[10px]">
          <span className="text-white/25 font-medium">Today&apos;s reach</span>
          <span className="font-black text-white">47,200 impressions</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full origin-left"
            style={{ width: '78%', background: 'linear-gradient(90deg,rgba(255,255,255,0.25),rgba(212,175,55,0.60),rgba(255,255,255,0.35))', animation: 'obBarGrow 1.2s 0.8s cubic-bezier(.22,1,.36,1) both' }} />
        </div>
      </div>
    </div>
  );
}

function ConnectLeftPanel() {
  const nodes = [
    { name:'Ananya', role:'Product Designer',  init:'A',  x:50, y:10, size:54 },
    { name:'Rohan',  role:'Full-stack Dev',    init:'R',  x:82, y:36, size:50 },
    { name:'Priya',  role:'Brand Strategist',  init:'P',  x:74, y:74, size:46 },
    { name:'Vikram', role:'Startup Founder',   init:'V',  x:26, y:76, size:46 },
    { name:'Meera',  role:'Data Scientist',    init:'M',  x:8,  y:42, size:48 },
    { name:'Arnav',  role:'UX Researcher',     init:'Ar', x:20, y:14, size:44 },
  ];
  return (
    <div className="flex flex-col justify-center h-full w-full p-10 xl:p-14 select-none">
      <div className="mb-5" style={{ animation: 'obSlideUp 0.5s both' }}>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
          <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#D4AF37' }} />
          Professional Network
        </div>
        <h3 className="mt-3 text-[2rem] font-black text-white leading-[1.1] tracking-tight">
          Connect with 3,400+<br />
          <Highlight delay="0.55s">professionals.</Highlight>
        </h3>
      </div>
      <div className="relative mx-auto" style={{ width: 320, height: 280 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 280" fill="none">
          <defs>
            {nodes.map((n, i) => (
              <linearGradient key={i} id={`cg${i}`} x1={160} y1={140} x2={n.x * 3.2} y2={n.y * 2.8} gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="white" stopOpacity="0.35" />
                <stop offset="100%" stopColor="white" stopOpacity="0.04" />
              </linearGradient>
            ))}
          </defs>
          {nodes.map((n, i) => (
            <line key={n.name} x1={160} y1={140} x2={n.x * 3.2} y2={n.y * 2.8}
              stroke={`url(#cg${i})`} strokeWidth="1.2" strokeDasharray="300"
              style={{ animation: `obDrawLine 0.9s ${0.08 + i * 0.12}s both` }} />
          ))}
          <line x1={160} y1={28}  x2={262} y2={101} stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" strokeDasharray="200" style={{ animation: 'obDrawLine 1s 0.8s both' }} />
          <line x1={237} y1={207} x2={83}  y2={213} stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" strokeDasharray="200" style={{ animation: 'obDrawLine 1s 0.9s both' }} />
        </svg>
        <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
          <div className="flex flex-col items-center">
            <div className="flex h-[68px] w-[68px] items-center justify-center rounded-[20px] border-2 border-white/[0.20] bg-white/[0.08] font-black text-white text-sm"
              style={{ boxShadow: '0 0 0 6px rgba(255,255,255,0.03),0 0 40px rgba(255,255,255,0.08)', animation: 'obNodePulse 3s ease-in-out infinite' }}>
              You
            </div>
            <div className="mt-1 text-[9px] text-white/28 font-medium">Your hub</div>
          </div>
        </div>
        {nodes.map((n, i) => (
          <div key={n.name} className="absolute flex flex-col items-center"
            style={{ left: `${n.x}%`, top: `${n.y}%`, transform: 'translate(-50%,-50%)', animation: `obScaleIn 0.4s ${0.12 + i * 0.10}s both` }}>
            <div className="flex items-center justify-center rounded-[14px] border border-white/[0.10] bg-white/[0.05] font-bold text-white/55"
              style={{ width: n.size, height: n.size, fontSize: n.size * 0.28 }}>
              {n.init}
            </div>
            <div className="mt-0.5 text-center">
              <div className="text-[8px] font-semibold text-white/35">{n.name}</div>
              <div className="text-[7.5px] text-white/20 max-w-[60px] truncate">{n.role}</div>
            </div>
          </div>
        ))}
        <div className="absolute right-0 top-4 rounded-full bg-white px-3 py-1 text-[9px] font-black text-[#050508]"
          style={{ boxShadow: '0 0 16px rgba(255,255,255,0.20)', animation: 'obBidPop 0.5s 1.1s both' }}>
          ✓ Following
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2.5" style={{ animation: 'obSlideUp 0.5s 1.0s both' }}>
        {[['2.4k','Followers'],['340','Following'],['89%','Reach rate']].map(([v, l]) => (
          <div key={l} className="rounded-[14px] border border-white/[0.06] bg-white/[0.03] p-3 text-center">
            <div className="text-[18px] font-black text-white">{v}</div>
            <div className="text-[9px] text-white/25 font-medium mt-0.5">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GigsLeftPanel() {
  const gigs = [
    { cat:'Design',      title:'Brand identity redesign for Series A startup', budget:'₹40k–₹80k', bids:8,  skills:['Figma','Branding'], float:'obCardFloat1', d:'0.10s' },
    { cat:'Engineering', title:'Full-stack SaaS MVP — Next.js + Supabase',      budget:'₹1.2L–₹2L', bids:12, skills:['React','Node.js'],  float:'obCardFloat2', d:'0.22s' },
    { cat:'Marketing',   title:'GTM strategy and SEO content for fintech',     budget:'₹25k–₹45k', bids:5,  skills:['SEO','Content'],    float:'obCardFloat3', d:'0.34s' },
  ];
  return (
    <div className="flex flex-col justify-center h-full w-full max-w-lg mx-auto p-10 xl:p-14 select-none">
      <div className="mb-5 flex items-start justify-between" style={{ animation: 'obSlideUp 0.5s both' }}>
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#D4AF37' }} />
            Gig Board
          </div>
          <h3 className="mt-3 text-[2rem] font-black text-white leading-[1.1] tracking-tight">
            25 new gigs<br />
            <Highlight delay="0.55s">posted today.</Highlight>
          </h3>
        </div>
        <div className="flex flex-col items-end rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-3.5">
          <span className="text-[22px] font-black text-white">₹4.2L</span>
          <span className="text-[9px] text-white/28 font-medium mt-0.5">avg budget</span>
        </div>
      </div>
      <div className="space-y-3">
        {gigs.map((g, idx) => (
          <div key={g.title}
            className="relative overflow-hidden rounded-[18px] border border-white/[0.06] bg-white/[0.025] p-4"
            style={{ animation: `obSlideUp 0.5s ${g.d} both, ${g.float} ${5.5 + idx * 0.9}s ${idx * 0.5}s ease-in-out infinite` }}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-white/20 via-white/06 to-transparent" />
            <div className="mb-2.5 flex items-center justify-between">
              <span className="rounded-[8px] border border-white/[0.08] bg-white/[0.06] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white/40">{g.cat}</span>
              <span className="text-[13px] font-black text-white/60">{g.budget}</span>
            </div>
            <p className="mb-3 text-[13px] font-semibold leading-snug text-white/72 line-clamp-1">{g.title}</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {g.skills.map(s => (
                  <span key={s} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[9px] font-medium text-white/32">{s}</span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1">
                  {Array.from({ length: Math.min(g.bids, 4) }).map((_, i) => (
                    <div key={i} className="flex h-5 w-5 items-center justify-center rounded-full border border-[#050508] bg-white/[0.12] font-bold text-[7px] text-white/55">{String.fromCharCode(65 + i)}</div>
                  ))}
                </div>
                <span className="text-[10px] text-white/25 font-medium">{g.bids} bids</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 overflow-hidden rounded-[14px] border border-white/[0.07] bg-white/[0.025] px-4 py-3"
        style={{ animation: 'obNotifSlide 5s 1.2s ease-in-out infinite' }}>
        <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.05] font-bold text-white/50">K</div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-white/72">Kavya S. placed a bid</p>
          <p className="text-[10px] text-white/28">Brand identity redesign · ₹62k</p>
        </div>
        <span className="shrink-0 rounded-full border border-white/[0.10] bg-white/[0.06] px-2 py-0.5 text-[9px] font-black text-white/50">new</span>
      </div>
    </div>
  );
}

function AuthLeftPanel({ screen, headline, bio }: { screen: number; headline: string; bio: string }) {
  const testimonials = [
    { text:'Docrud helped me land three freelance clients in my first week. The gig system is brilliant.', name:'Rohan Mehta',     role:'Full-stack Developer' },
    { text:'I published my portfolio and got 2,400 views in 48 hours. No other platform comes close.',    name:'Ananya Krishnan', role:'Product Designer'     },
    { text:'We hired our entire design team through Docrud gigs. Fast, professional, and stress-free.',   name:'Siddharth Joshi', role:'Founder, SaaSify'      },
  ];
  const t = testimonials[screen % testimonials.length];
  const strength = headline ? (bio ? 65 : 40) : 20;
  return (
    <div className="flex flex-col justify-between h-full w-full p-12 xl:p-16 select-none">
      <div className="flex items-center gap-3" style={{ animation: 'obFadeIn 0.5s both' }}>
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/[0.12] bg-white/[0.06]"
          style={{ boxShadow: '0 0 20px rgba(255,255,255,0.06),inset 0 1px 0 rgba(255,255,255,0.10)' }}>
          <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M6 4h12l8 8v16H6V4z" /><path d="M18 4v8h8" /><path d="M10 16h12M10 20h8" />
          </svg>
        </div>
        <span className="text-base font-black text-white">Docrud</span>
      </div>
      <div style={{ animation: 'obSlideUp 0.6s 0.1s both' }}>
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/18">Your profile — building…</div>
        <div className="overflow-hidden rounded-[22px] border border-white/[0.07] bg-white/[0.025]">
          <div className="h-16 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.06) 0%,rgba(212,175,55,0.05) 60%,rgba(255,255,255,0.02) 100%)' }}>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0D0D0F]/40" />
          </div>
          <div className="px-5 pb-5 -mt-7">
            <div className="mb-3 flex items-end gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0D0D0F] bg-white/[0.08] font-black text-xl text-white/60">
                {initials(headline || 'D')}
              </div>
              <div className="mb-1 min-w-0 flex-1">
                <div className={`text-[15px] font-bold text-white transition-all duration-500 ${headline ? 'opacity-100' : 'opacity-20'}`}>{headline || 'Your name here'}</div>
                <div className={`mt-0.5 text-[11px] text-white/38 transition-all duration-500 ${bio ? 'opacity-100' : 'opacity-20'}`}>{bio ? bio.slice(0, 52) + (bio.length > 52 ? '…' : '') : 'Your headline here'}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              {[['0','Published'],['0','Followers'],['0','Following']].map(([v, l]) => (
                <div key={l} className="rounded-[10px] bg-white/[0.03] py-2">
                  <div className="text-[15px] font-black text-white/22">{v}</div>
                  <div className="text-[9px] text-white/16 mt-0.5">{l}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[10px]">
                <span className="text-white/22 font-medium">Profile strength</span>
                <span className="font-black text-white/45">{strength}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${strength}%`, background: GOLD_GRAD }} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm" style={{ animation: 'obSlideUp 0.6s 0.25s both' }}>
        <div className="mb-2 flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} className="h-3 w-3" fill="#C9A84C" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          ))}
        </div>
        <p className="mt-2 text-[12.5px] italic leading-relaxed text-white/45">&ldquo;{t.text}&rdquo;</p>
        <div className="mt-3 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.07] font-bold text-[9px] text-white/55">{t.name[0]}</div>
          <div>
            <p className="text-[11px] font-bold text-white/55">{t.name}</p>
            <p className="text-[10px] text-white/28">{t.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeftPanelSwitch({ screen, headline, bio }: { screen: number; headline: string; bio: string }) {
  if (screen === 0) return <HeroLeftPanel />;
  if (screen === 1) return <PublishLeftPanel />;
  if (screen === 2) return <ConnectLeftPanel />;
  if (screen === 3) return <GigsLeftPanel />;
  return <AuthLeftPanel screen={screen} headline={headline} bio={bio} />;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */
export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [screen, setScreen] = useState(0);

  const [sName,    setSName]    = useState('');
  const [sEmail,   setSEmail]   = useState('');
  const [sPass,    setSPass]    = useState('');
  const [showPass, setShowPass] = useState(false);
  const [sLoading, setSLoading] = useState(false);
  const [sError,   setSError]   = useState('');

  const [otpDigits, setOtpDigits] = useState(['','','','','','']);
  const oRef0 = useRef<HTMLInputElement>(null);
  const oRef1 = useRef<HTMLInputElement>(null);
  const oRef2 = useRef<HTMLInputElement>(null);
  const oRef3 = useRef<HTMLInputElement>(null);
  const oRef4 = useRef<HTMLInputElement>(null);
  const oRef5 = useRef<HTMLInputElement>(null);
  const otpRefs = [oRef0, oRef1, oRef2, oRef3, oRef4, oRef5];
  const [otpSent,   setOtpSent]   = useState(false);
  const [otpError,  setOtpError]  = useState('');
  const [otpOk,     setOtpOk]     = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [avatarUrl,  setAvatarUrl]  = useState('');
  const [headline,   setHeadline]   = useState('');
  const [bio,        setBio]        = useState('');
  const [location,   setLocation]   = useState('');
  const [website,    setWebsite]    = useState('');
  const [openToWork, setOpenToWork] = useState(false);

  const [skills,     setSkills]     = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [interests,  setInterests]  = useState<string[]>([]);

  const [suggestions, setSuggestions] = useState<Array<{ id:string; name:string; profile:{ headline?:string; avatarUrl?:string } }>>([]);
  const [followed,    setFollowed]    = useState<string[]>([]);
  const [completing,  setCompleting]  = useState(false);

  /* Docrud Go offer state */
  type GoPhase = 'offer' | 'paying' | 'success' | 'skipped' | 'refer';
  const [goPhase,   setGoPhase]   = useState<GoPhase>('offer');
  const [goError,   setGoError]   = useState('');

  /* Referral state */
  const [refLink,        setRefLink]        = useState('');
  const [refCode,        setRefCode]        = useState('');
  const [refLinkLoading, setRefLinkLoading] = useState(false);
  const [refCopied,      setRefCopied]      = useState(false);
  const [refInviteEmail, setRefInviteEmail] = useState('');
  const [refSending,     setRefSending]     = useState(false);
  const [refSentMsg,     setRefSentMsg]     = useState('');
  const [refSendErr,     setRefSendErr]     = useState('');

  const hasSignedUpInSession = useRef(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'authenticated') {
      if (hasSignedUpInSession.current) return;
      router.replace('/');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (screen !== PEOPLE_SCR) return;
    fetch('/api/onboarding/suggest-people')
      .then(r => r.json())
      .then((d: { people?: typeof suggestions }) => { if (Array.isArray(d.people)) setSuggestions(d.people); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => {
    if (screen !== OTP_SCR || otpSent) return;
    void sendOtp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  /* Load Razorpay checkout script once */
  useEffect(() => {
    const existing = document.getElementById('rzp-script');
    if (existing) return;
    const script = document.createElement('script');
    script.id  = 'rzp-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const next = useCallback(() => setScreen(s => Math.min(s + 1, TOTAL_SCR - 1)), []);
  const skip  = () => router.push('/login');

  async function sendOtp() {
    setOtpError('');
    try {
      await fetch('/api/onboarding/send-otp', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ email: session?.user?.email ?? sEmail }) });
      setOtpSent(true);
    } catch { /* silent */ }
  }

  async function verifyOtp() {
    setVerifying(true); setOtpError('');
    try {
      const res = await fetch('/api/onboarding/verify-otp', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ otp: otpDigits.join('') }) });
      const d = await res.json() as { verified?: boolean; error?: string };
      if (d.verified) { setOtpOk(true); setTimeout(next, 900); }
      else setOtpError(d.error ?? 'Invalid code. Please try again.');
    } catch { setOtpError('Something went wrong.'); }
    finally { setVerifying(false); }
  }

  function handleOtpChange(i: number, val: string) {
    const digit = val.replace(/\D/, '').slice(-1);
    const next_ = [...otpDigits]; next_[i] = digit; setOtpDigits(next_);
    if (digit && i < 5) otpRefs[i + 1].current?.focus();
  }
  function handleOtpKey(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) otpRefs[i - 1].current?.focus();
  }

  async function handleSignup() {
    setSLoading(true); setSError('');
    try {
      const res = await fetch('/api/individual/signup', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ name:sName.trim(), email:sEmail.trim(), password:sPass, policyAccepted:true }) });
      const d = await res.json() as { error?: string };
      if (!res.ok) { setSError(d.error ?? 'Signup failed.'); return; }
      const si = await signIn('credentials', { email:sEmail.trim(), password:sPass, policyAccepted:'accepted', redirect:false });
      if (si?.error) { setSError('Account created. Please log in.'); router.push('/login'); return; }
      hasSignedUpInSession.current = true;
      next();
    } catch { setSError('Something went wrong. Please try again.'); }
    finally { setSLoading(false); }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      await Promise.all([
        ...followed.map(id => fetch('/api/profile/follow', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ targetUserId:id, action:'follow' }) })),
        fetch('/api/onboarding/complete', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ profile:{ headline, bio, location, website, avatarUrl, openToWork, skills, interests, onboardingDone:true, profileSetupDone:true } }) }),
      ]);
      setScreen(DONE_SCR);
    } catch { setScreen(DONE_SCR); }
    finally { setCompleting(false); }
  }

  function addSkill() {
    const t = skillInput.trim();
    if (t && !skills.includes(t) && skills.length < 20) setSkills(p => [...p, t]);
    setSkillInput('');
  }

  if (status === 'loading') return (
    <div className="flex min-h-screen items-center justify-center bg-[#050508]">
      <div className="relative h-8 w-8">
        <div className="absolute inset-0 rounded-full border-2 border-white/[0.08] border-t-white/40 animate-spin" />
      </div>
    </div>
  );

  const isTour        = screen <= TOUR_END;
  const postAuthStep  = Math.max(0, screen - SIGNUP_SCR);
  const postAuthTotal = DONE_SCR - SIGNUP_SCR;
  const progressPct   = isTour ? 0 : Math.round((postAuthStep / postAuthTotal) * 100);
  const userName      = session?.user?.name ?? sName;

  /* Shared button styles */
  const WHITE_BTN = 'flex items-center justify-center gap-2 rounded-[12px] bg-white text-[13px] sm:text-[14px] font-black text-[#050508] hover:bg-white/92 active:scale-[0.98] transition-all';
  const WHITE_BTN_SHADOW: React.CSSProperties = { boxShadow: '0 4px 24px rgba(255,255,255,0.12)' };

  /* ─────────────────────────────────────────────────────────────
     TOUR SCREENS  — ultra-compact mobile, no preview cards
  ───────────────────────────────────────────────────────────── */
  function renderForm() {
    switch (screen) {

      /* ── 0  HERO ── */
      case 0: return (
        <div className="flex flex-col gap-4">
          {/* Logo — mobile only */}
          <div className="flex lg:hidden items-center gap-2.5" style={{ animation: 'obFadeIn 0.35s both' }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.14] bg-white/[0.07]">
              <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" stroke="white" strokeWidth="1.8">
                <path d="M6 4h12l8 8v16H6V4z" /><path d="M18 4v8h8" /><path d="M10 16h12M10 20h8" />
              </svg>
            </div>
            <span className="text-[15px] font-black tracking-[-0.03em] text-white">Docrud</span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">Platform</span>
          </div>

          {/* Headline */}
          <div style={{ animation: 'obSlideUp 0.5s 0.05s both' }}>
            <h1 className="text-[1.95rem] sm:text-[2.4rem] font-black tracking-[-0.04em] leading-[1.1] text-white">
              Your professional<br />
              <Highlight>network awaits.</Highlight>
            </h1>
            <p className="mt-2 text-[12px] sm:text-[13.5px] leading-[1.6] text-white/40">
              E-sign, AI docs, PDF tools, smart forms, and a thriving professional community — all in one platform.
            </p>
          </div>

          {/* Feature icon strip — compact */}
          <div className="flex items-center gap-2 lg:hidden" style={{ animation: 'obSlideUp 0.5s 0.12s both' }}>
            {[
              { Icon: FileSignature, label: 'E-Sign'   },
              { Icon: Bot,           label: 'Doc AI'   },
              { Icon: Users,         label: 'Network'  },
              { Icon: Zap,           label: 'Gigs'     },
              { Icon: FileText,      label: 'PDF'      },
              { Icon: FormInput,     label: 'Forms'    },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex flex-1 flex-col items-center gap-1 rounded-[10px] border border-white/[0.06] bg-white/[0.03] py-2">
                <Icon className="h-3.5 w-3.5 text-white/35" />
                <span className="text-[8.5px] font-semibold text-white/35">{label}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-2" style={{ animation: 'obSlideUp 0.5s 0.2s both' }}>
            <button onClick={next} className={`h-10 sm:h-11 w-full ${WHITE_BTN}`} style={WHITE_BTN_SHADOW}>
              Explore the platform <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button onClick={skip} className="w-full py-2 text-[12px] font-medium text-white/30 hover:text-white/55 transition-colors">
              Already have an account? Sign in →
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center gap-1.5" style={{ animation: 'obFadeIn 0.5s 0.3s both' }}>
            {['SOC 2','GDPR','E2E Encrypted','99.9% SLA'].map(b => (
              <span key={b} className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[9px] font-medium text-white/25">{b}</span>
            ))}
          </div>
        </div>
      );

      /* ── 1  PUBLISH ── */
      case 1: return (
        <div className="flex flex-col gap-4">
          <div style={{ animation: 'obSlideUp 0.45s both' }}>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-white/[0.08] bg-white/[0.05]">
                <FileText className="h-3.5 w-3.5 text-white/40" />
              </div>
              <span className="text-[9.5px] font-black uppercase tracking-[0.24em] text-white/28">Publish anything</span>
            </div>
            <h2 className="text-[1.7rem] sm:text-[2rem] font-black tracking-[-0.04em] leading-[1.1] text-white">
              Share your work<br /><Highlight>with the world.</Highlight>
            </h2>
            <p className="mt-2 text-[12px] sm:text-[13px] leading-[1.6] text-white/38">
              Articles, documents, portfolios, gigs, and announcements — published to a professional audience of thousands.
            </p>
          </div>

          {/* Publish type 2×2 */}
          <div className="grid grid-cols-2 gap-2" style={{ animation: 'obSlideUp 0.45s 0.08s both' }}>
            {[
              { Icon: FileText,     label: 'Articles & Blogs',  sub: 'Long-form writing'      },
              { Icon: FileSignature,label: 'Documents',          sub: 'Contracts & reports'    },
              { Icon: Layers,       label: 'Portfolios',         sub: 'Showcase your best work' },
              { Icon: Zap,          label: 'Gigs & Projects',   sub: 'Post opportunities'      },
            ].map(({ Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border border-white/[0.07] bg-white/[0.04]">
                  <Icon className="h-3.5 w-3.5 text-white/38" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white/62 leading-tight">{label}</div>
                  <div className="text-[9.5px] text-white/28">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-5" style={{ animation: 'obFadeIn 0.45s 0.16s both' }}>
            {[['12k+','published'],['3.4k','creators'],['47k','daily reach']].map(([v, l]) => (
              <div key={l}>
                <div className="text-[18px] font-black text-white">{v}</div>
                <div className="text-[9.5px] text-white/28">{l}</div>
              </div>
            ))}
          </div>

          <button onClick={next} className={`h-10 sm:h-11 w-full ${WHITE_BTN}`} style={WHITE_BTN_SHADOW}>
            Next <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      );

      /* ── 2  CONNECT ── */
      case 2: return (
        <div className="flex flex-col gap-4">
          <div style={{ animation: 'obSlideUp 0.45s both' }}>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-white/[0.08] bg-white/[0.05]">
                <Users className="h-3.5 w-3.5 text-white/40" />
              </div>
              <span className="text-[9.5px] font-black uppercase tracking-[0.24em] text-white/28">Professional Network</span>
            </div>
            <h2 className="text-[1.7rem] sm:text-[2rem] font-black tracking-[-0.04em] leading-[1.1] text-white">
              Build your<br /><Highlight>professional network.</Highlight>
            </h2>
            <p className="mt-2 text-[12px] sm:text-[13px] leading-[1.6] text-white/38">
              Follow creators and builders. Get discovered. Your profile is your passport to new opportunities.
            </p>
          </div>

          {/* Network feature list — compact rows */}
          <div className="space-y-1.5" style={{ animation: 'obSlideUp 0.45s 0.08s both' }}>
            {[
              { Icon: Users,    label: 'Follow & get followed',    sub: '3,400+ professionals on platform' },
              { Icon: Award,    label: 'Verified profile badges',  sub: 'Stand out with credentials'       },
              { Icon: Briefcase,label: 'Talent directory',         sub: 'Be found by recruiters & clients' },
              { Icon: Share2,   label: 'Public portfolio',         sub: 'Showcase work to the world'       },
            ].map(({ Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3 rounded-[11px] border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border border-white/[0.07] bg-white/[0.04]">
                  <Icon className="h-3.5 w-3.5 text-white/38" />
                </div>
                <div>
                  <div className="text-[11.5px] font-semibold text-white/62 leading-tight">{label}</div>
                  <div className="text-[10px] text-white/28">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={next} className={`h-10 sm:h-11 w-full ${WHITE_BTN}`} style={WHITE_BTN_SHADOW}>
            Next <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      );

      /* ── 3  GIGS ── */
      case 3: return (
        <div className="flex flex-col gap-4">
          <div style={{ animation: 'obSlideUp 0.45s both' }}>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-white/[0.08] bg-white/[0.05]">
                <Briefcase className="h-3.5 w-3.5 text-white/40" />
              </div>
              <span className="text-[9.5px] font-black uppercase tracking-[0.24em] text-white/28">Opportunities</span>
            </div>
            <h2 className="text-[1.7rem] sm:text-[2rem] font-black tracking-[-0.04em] leading-[1.1] text-white">
              Find work.<br /><Highlight>Find talent.</Highlight>
            </h2>
            <p className="mt-2 text-[12px] sm:text-[13px] leading-[1.6] text-white/38">
              Post gig listings, receive bids, and hire the best. Or apply and get hired by top companies and startups.
            </p>
          </div>

          {/* Gig capability 2×2 */}
          <div className="grid grid-cols-2 gap-2" style={{ animation: 'obSlideUp 0.45s 0.08s both' }}>
            {[
              { label: 'Post gigs & projects',  sub: 'Receive competitive bids'   },
              { label: 'Browse opportunities',  sub: 'Filter by category & budget' },
              { label: 'Verified bidders',       sub: 'See profiles & portfolios'  },
              { label: 'All work categories',    sub: 'Design, Tech, Marketing+'   },
            ].map(({ label, sub }) => (
              <div key={label} className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <div className="text-[11.5px] font-bold text-white/62 leading-tight">{label}</div>
                <div className="mt-0.5 text-[9.5px] text-white/28">{sub}</div>
              </div>
            ))}
          </div>

          {/* Budget highlight */}
          <div className="flex items-center gap-4 rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-4 py-3" style={{ animation: 'obFadeIn 0.4s 0.16s both' }}>
            <div>
              <div className="text-[20px] font-black text-white">₹4.2L</div>
              <div className="text-[9.5px] text-white/28">avg project budget</div>
            </div>
            <div className="h-8 w-px bg-white/[0.07]" />
            <div>
              <div className="text-[20px] font-black text-white">25</div>
              <div className="text-[9.5px] text-white/28">new gigs today</div>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-white/50 animate-pulse" />
              <span className="text-[9.5px] text-white/35 font-medium">Live</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={next} className={`h-10 sm:h-11 w-full ${WHITE_BTN}`} style={WHITE_BTN_SHADOW}>
              Create your account <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button onClick={skip} className="w-full py-1.5 text-[12px] font-medium text-white/28 hover:text-white/50 transition-colors">
              Already have an account? Sign in →
            </button>
          </div>
        </div>
      );

      /* ── 4  SIGNUP ── */
      case SIGNUP_SCR: return (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-[1.5rem] sm:text-[1.75rem] font-black tracking-tight text-white">Create your account</h2>
            <p className="mt-1.5 text-[12px] sm:text-[13px] text-white/38">Free to join. Takes 30 seconds.</p>
          </div>
          <div className="space-y-2.5">
            <input value={sName}  onChange={e => setSName(e.target.value)}  placeholder="Full name"              className={INP} autoFocus />
            <input value={sEmail} onChange={e => setSEmail(e.target.value)} placeholder="Email address" type="email" className={INP} />
            <div className="relative">
              <input value={sPass} onChange={e => setSPass(e.target.value)} placeholder="Password (min 8 chars)" type={showPass ? 'text' : 'password'} className={INP + ' pr-10'}
                onKeyDown={e => { if (e.key === 'Enter') void handleSignup(); }} />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/22 hover:text-white/55 transition-colors">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {sError && <div className="rounded-[10px] border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2 text-[12px] text-rose-300/75">{sError}</div>}
          <div className="flex flex-col gap-2">
            <button onClick={() => void handleSignup()} disabled={sLoading || !sName.trim() || !sEmail.trim() || sPass.length < 8}
              className={`h-10 sm:h-11 w-full ${WHITE_BTN} disabled:opacity-40`} style={WHITE_BTN_SHADOW}>
              {sLoading
                ? <div className="h-4 w-4 rounded-full border-2 border-[#050508]/25 border-t-[#050508] animate-spin" />
                : <><span>Create account</span><ArrowRight className="h-3.5 w-3.5" /></>}
            </button>
            <p className="text-center text-[10.5px] text-white/18">By continuing you agree to our Terms & Privacy Policy.</p>
            <button onClick={skip} className="w-full py-1 text-center text-[12px] font-medium text-white/28 hover:text-white/50 transition-colors">
              Already have an account? Sign in →
            </button>
          </div>
        </div>
      );

      /* ── 5  OTP ── */
      case OTP_SCR: return (
        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-[14px] border border-white/[0.10] bg-white/[0.06]">
              <svg className="h-6 w-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-[1.5rem] sm:text-[1.75rem] font-black tracking-tight text-white">Check your email</h2>
            <p className="mt-1.5 text-[12px] sm:text-sm text-white/38">
              We sent a 6-digit code to <span className="font-bold text-white/60">{session?.user?.email ?? sEmail}</span>
            </p>
          </div>
          <div className="flex justify-center gap-1.5 sm:gap-2">
            {otpDigits.map((d, i) => (
              <input key={i} ref={otpRefs[i]} maxLength={1} value={d}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKey(i, e)}
                className="h-12 w-11 sm:h-14 sm:w-12 rounded-[12px] border border-white/[0.09] bg-white/[0.05] text-center text-lg sm:text-xl font-black text-white focus:outline-none focus:border-white/[0.25] focus:bg-white/[0.08] transition-all duration-200" />
            ))}
          </div>
          {otpError && <p className="text-center text-[12px] text-rose-300/65">{otpError}</p>}
          {otpOk && (
            <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-white/70">
              <CheckCircle2 className="h-4 w-4" /> Email verified!
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button onClick={() => void verifyOtp()} disabled={otpDigits.join('').length < 6 || verifying || otpOk}
              className={`h-10 sm:h-11 w-full ${WHITE_BTN} disabled:opacity-40`} style={WHITE_BTN_SHADOW}>
              {verifying ? <div className="h-4 w-4 rounded-full border-2 border-[#050508]/25 border-t-[#050508] animate-spin" /> : 'Verify email'}
            </button>
            <div className="flex items-center justify-between text-[12px] text-white/28">
              <button onClick={() => void sendOtp()} className="hover:text-white/50 transition-colors font-medium">Resend code</button>
              <button onClick={next}  className="hover:text-white/50 transition-colors font-medium">Skip →</button>
            </div>
          </div>
        </div>
      );

      /* ── 6  PROFILE ── */
      case PROFILE_SCR: return (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-[1.5rem] sm:text-[1.75rem] font-black tracking-tight text-white">Set up your profile</h2>
            <p className="mt-1.5 text-[12px] sm:text-[13px] text-white/38">Help people find and know you better.</p>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 rounded-[14px] border border-white/[0.10] bg-white/[0.07] flex items-center justify-center text-lg font-black text-white/55 overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(userName || 'U')}
              </div>
              <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="Avatar image URL (optional)" className={INP} />
            </div>
            <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Headline — e.g. Product Designer at Razorpay" className={INP} />
            <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 500))} rows={2} placeholder="A short bio about yourself…"
              className="w-full rounded-[12px] border border-white/[0.08] bg-white/[0.04] text-white px-3 py-2.5 text-[13px] placeholder:text-white/20 focus:outline-none focus:border-white/[0.22] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] resize-none transition-all duration-200" />
            <div className="grid grid-cols-2 gap-2.5">
              <div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/18" /><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className={INP + ' pl-9'} /></div>
              <div className="relative"><Globe   className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/18" /><input value={website}  onChange={e => setWebsite(e.target.value)}  placeholder="Website"  className={INP + ' pl-9'} /></div>
            </div>
            <label className="flex cursor-pointer items-center gap-3">
              <div onClick={() => setOpenToWork(v => !v)} className={`h-5 w-10 rounded-full transition-all duration-300 flex items-center px-0.5 ${openToWork ? 'bg-white' : 'bg-white/[0.10]'}`}>
                <div className={`h-4 w-4 rounded-full shadow-lg transition-transform duration-300 ${openToWork ? 'translate-x-5 bg-[#050508]' : 'bg-white/38'}`} />
              </div>
              <span className="text-[12px] text-white/42 font-medium">Open to work or opportunities</span>
            </label>
          </div>
          <button onClick={next} className={`h-10 sm:h-11 w-full ${WHITE_BTN}`} style={WHITE_BTN_SHADOW}>
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      );

      /* ── 7  SKILLS ── */
      case SKILLS_SCR: return (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-[1.5rem] sm:text-[1.75rem] font-black tracking-tight text-white">Skills & Interests</h2>
            <p className="mt-1.5 text-[12px] sm:text-[13px] text-white/38">Helps us show you relevant content, gigs, and people.</p>
          </div>
          <div>
            <p className="mb-2 text-[9.5px] font-black uppercase tracking-[0.22em] text-white/22">Your Skills</p>
            <div className="mb-2.5 flex gap-2">
              <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                placeholder="Type a skill, press Enter" className={INP.replace('w-full', 'flex-1')} />
              <button onClick={addSkill} className="h-10 sm:h-11 rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-3.5 text-[12px] font-semibold text-white/48 hover:bg-white/[0.08] hover:text-white/70 transition-all whitespace-nowrap">Add</button>
            </div>
            {skills.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {skills.map(s => (
                  <span key={s} className="flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.07] px-3 py-1 text-[12px] font-medium text-white/75">
                    {s}<button onClick={() => setSkills(p => p.filter(x => x !== s))}><X className="h-3 w-3 text-white/35 hover:text-white/65 transition-colors" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SKILLS.filter(s => !skills.includes(s)).slice(0, 12).map(s => (
                <button key={s} onClick={() => { if (skills.length < 20) setSkills(p => [...p, s]); }}
                  className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-0.5 text-[11px] font-medium text-white/32 hover:text-white/65 hover:border-white/[0.14] hover:bg-white/[0.06] transition-all">
                  + {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[9.5px] font-black uppercase tracking-[0.22em] text-white/22">Interests</p>
            <div className="flex flex-wrap gap-1.5">
              {INTEREST_CATEGORIES.slice(0, 12).map(cat => (
                <button key={cat}
                  onClick={() => setInterests(p => p.includes(cat) ? p.filter(x => x !== cat) : [...p, cat])}
                  className={`rounded-[10px] px-3 py-1 text-[12px] font-semibold transition-all ${interests.includes(cat) ? 'bg-white text-[#050508] border border-white/80' : 'border border-white/[0.07] bg-white/[0.025] text-white/40 hover:text-white/70 hover:border-white/[0.12]'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <button onClick={next} className={`h-10 sm:h-11 w-full ${WHITE_BTN}`} style={WHITE_BTN_SHADOW}>
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      );

      /* ── 8  PEOPLE ── */
      case PEOPLE_SCR: return (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-[1.5rem] sm:text-[1.75rem] font-black tracking-tight text-white">Connect with people</h2>
            <p className="mt-1.5 text-[12px] sm:text-[13px] text-white/38">Follow professionals in your field to stay updated.</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 max-h-[38vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {suggestions.length === 0
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-[14px] bg-white/[0.04]" />)
              : suggestions.map((p, i) => (
                <div key={p.id}
                  className="flex flex-col gap-2 rounded-[16px] border border-white/[0.06] bg-white/[0.025] p-3.5 transition-colors hover:border-white/[0.10]"
                  style={{ animation: `obSlideUp 0.4s ${i * 0.06}s both` }}>
                  <div className="h-11 w-11 rounded-[12px] border border-white/[0.09] bg-white/[0.06] flex items-center justify-center text-base font-black text-white/55 overflow-hidden">
                    {p.profile.avatarUrl ? <img src={p.profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(p.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-bold text-white/88">{p.name}</p>
                    {p.profile.headline && <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-white/30">{p.profile.headline}</p>}
                  </div>
                  <button
                    onClick={() => setFollowed(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                    className={`mt-auto h-7 w-full rounded-[9px] text-[11px] font-black transition-all ${followed.includes(p.id) ? 'bg-white/[0.09] border border-white/[0.14] text-white/60' : 'bg-white text-[#050508] hover:bg-white/92 shadow-[0_2px_12px_rgba(255,255,255,0.10)]'}`}>
                    {followed.includes(p.id) ? '✓ Following' : 'Follow'}
                  </button>
                </div>
              ))}
          </div>
          <button onClick={() => void handleComplete()} disabled={completing}
            className={`h-10 sm:h-11 w-full ${WHITE_BTN} disabled:opacity-55`} style={WHITE_BTN_SHADOW}>
            {completing
              ? <div className="h-4 w-4 rounded-full border-2 border-[#050508]/25 border-t-[#050508] animate-spin" />
              : followed.length > 0
                ? `Continue with ${followed.length} connection${followed.length > 1 ? 's' : ''}`
                : 'Skip for now'}
          </button>
        </div>
      );

      /* ── 9  DONE + DOCRUD GO OFFER ── */
      case DONE_SCR: {

        /* ── Success state after purchase ── */
        if (goPhase === 'success') return (
          <div className="flex flex-col items-center text-center gap-4" style={{ animation: 'obScaleIn 0.6s both' }}>
            {/* Gold badge ring */}
            <div className="relative mx-auto h-24 w-24" style={{ animation: 'obScaleIn 0.7s 0.1s both' }}>
              <div className="absolute -inset-4 rounded-full"
                style={{ background: 'radial-gradient(circle,rgba(232,204,122,0.25) 0%,transparent 65%)', animation: 'obGlow 3s ease-in-out infinite' }} />
              <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg,#C9A84C22,#E8CC7A18)', border: '1.5px solid rgba(232,204,122,0.35)' }} />
              <svg className="absolute inset-0 h-24 w-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(201,168,76,0.15)" strokeWidth="1.5" />
                <circle cx="48" cy="48" r="44" fill="none" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray="276" strokeDashoffset="0"
                  style={{ stroke: 'url(#goGrad)', animation: 'obCheckDraw 1.4s 0.3s cubic-bezier(.4,0,.2,1) both' }} />
                <defs>
                  <linearGradient id="goGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#C9A84C" /><stop offset="50%" stopColor="#F0D878" /><stop offset="100%" stopColor="#C9A84C" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'obScaleIn 0.45s 1.2s both', opacity: 0 }}>
                <span className="text-[28px]" style={{ filter: 'drop-shadow(0 0 12px rgba(232,204,122,0.6))' }}>✦</span>
              </div>
            </div>

            <div style={{ animation: 'obSlideUp 0.5s 0.5s both' }}>
              <div className="mb-1 text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#C9A84C' }}>Welcome to</div>
              <h2 className="text-[1.7rem] sm:text-[1.95rem] font-black tracking-[-0.04em] text-white leading-[1.1]">
                Docrud Go <span style={{ color: '#E8CC7A' }}>✦</span>
              </h2>
              <p className="mt-1.5 max-w-[260px] mx-auto text-[12px] sm:text-[12.5px] text-white/40 leading-relaxed">
                Your gold verified badge is live. Check your email for a full welcome guide.
              </p>
            </div>

            <div className="w-full max-w-[280px] flex flex-col gap-2" style={{ animation: 'obSlideUp 0.5s 0.7s both' }}>
              <Link href="/"
                className="flex h-10 sm:h-11 w-full items-center justify-center gap-2 rounded-[12px] font-black text-[13px] sm:text-[14px] transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#1a1208', boxShadow: '0 4px 24px rgba(201,168,76,0.40)' }}>
                Explore Docrud ✦
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/u/${(session?.user as { id?: string })?.id ?? ''}`}
                  className="flex h-9 items-center justify-center rounded-[11px] border border-white/[0.08] bg-white/[0.03] text-[12px] font-bold text-white/45 hover:bg-white/[0.07] transition-all">
                  My profile
                </Link>
                <Link href="/people"
                  className="flex h-9 items-center justify-center rounded-[11px] border border-white/[0.08] bg-white/[0.03] text-[12px] font-bold text-white/45 hover:bg-white/[0.07] transition-all">
                  Find people
                </Link>
              </div>
            </div>
          </div>
        );

        /* ── Skipped / normal done state ── */
        if (goPhase === 'skipped') return (
          <div className="flex flex-col items-center text-center gap-4" style={{ animation: 'obSlideUp 0.5s both' }}>
            <div className="relative mx-auto h-20 w-20" style={{ animation: 'obScaleIn 0.6s 0.1s both' }}>
              <div className="absolute inset-0 rounded-full border border-white/[0.10] bg-white/[0.03]" />
              <svg className="absolute inset-0 h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
                <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2"
                  strokeDasharray="226" strokeLinecap="round"
                  style={{ animation: 'obCheckDraw 1.2s 0.3s cubic-bezier(.4,0,.2,1) both' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'obScaleIn 0.4s 1.1s both', opacity: 0 }}>
                <CheckCircle2 className="h-9 w-9 text-white/80" />
              </div>
            </div>
            <div>
              <h2 className="text-[1.55rem] sm:text-[1.75rem] font-black tracking-tight text-white">
                {userName ? `You're in, ${userName.split(' ')[0]}!` : "You're all set!"}
              </h2>
              <p className="mt-1.5 max-w-[240px] mx-auto text-[12px] text-white/38 leading-relaxed">
                Your profile is live. Start publishing, signing, and connecting.
              </p>
            </div>
            <div className="w-full max-w-[260px] flex flex-col gap-2">
              <Link href="/" className={`h-10 sm:h-11 w-full ${WHITE_BTN}`} style={WHITE_BTN_SHADOW}>
                Explore Docrud <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/u/${(session?.user as { id?: string })?.id ?? ''}`}
                  className="flex h-9 items-center justify-center rounded-[11px] border border-white/[0.08] bg-white/[0.03] text-[12px] font-bold text-white/45 hover:bg-white/[0.07] transition-all">
                  My profile
                </Link>
                <Link href="/people"
                  className="flex h-9 items-center justify-center rounded-[11px] border border-white/[0.08] bg-white/[0.03] text-[12px] font-bold text-white/45 hover:bg-white/[0.07] transition-all">
                  Find people
                </Link>
              </div>
              {/* Soft upsell nudge */}
              <button onClick={() => setGoPhase('offer')} className="mt-1 text-[10.5px] text-white/20 hover:text-white/45 transition-colors underline underline-offset-2">
                See Docrud Go offer
              </button>
            </div>
          </div>
        );

        /* ── Default: offer state ── */
        const handleGoPayment = async () => {
          setGoError('');
          setGoPhase('paying');
          try {
            const res = await fetch('/api/docrud-go/create-order', { method: 'POST' });
            const data = await res.json() as { orderId?: string; amount?: number; currency?: string; keyId?: string; userName?: string; userEmail?: string; error?: string };
            if (!res.ok || !data.orderId) {
              setGoError(data.error ?? 'Could not initiate payment. Please try again.');
              setGoPhase('offer');
              return;
            }

            const win = window as typeof window & { Razorpay?: new (opts: Record<string, unknown>) => { open(): void } };
            if (!win.Razorpay) {
              setGoError('Payment gateway failed to load. Please refresh and retry.');
              setGoPhase('offer');
              return;
            }

            const rz = new win.Razorpay({
              key: data.keyId,
              amount: data.amount,
              currency: data.currency || 'INR',
              name: 'Docrud',
              description: 'Docrud Go — Verified Badge',
              order_id: data.orderId,
              prefill: { name: data.userName || '', email: data.userEmail || '' },
              theme: { color: '#C9A84C' },
              modal: { backdropclose: false },
              handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
                try {
                  const vRes = await fetch('/api/docrud-go/verify', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(response),
                  });
                  const vData = await vRes.json() as { success?: boolean; error?: string };
                  if (vData.success) {
                    setGoPhase('success');
                  } else {
                    setGoError(vData.error ?? 'Verification failed. Contact support.');
                    setGoPhase('offer');
                  }
                } catch {
                  setGoError('Verification failed. Contact support.');
                  setGoPhase('offer');
                }
              },
              'modal.ondismiss': () => {
                if (goPhase === 'paying') setGoPhase('offer');
              },
            });
            rz.open();
          } catch {
            setGoError('Something went wrong. Please try again.');
            setGoPhase('offer');
          }
        };

        /* ── Refer phase: share referral link ── */
        if (goPhase === 'refer') return (
          <div className="flex flex-col gap-4" style={{ animation: 'obSlideUp 0.35s both' }}>
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#F0D878)', boxShadow: '0 6px 28px rgba(201,168,76,0.40)' }}>
                <svg className="h-7 w-7 text-[#1a1208]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h3 className="text-[1.3rem] font-black tracking-[-0.03em] text-white">Refer &amp; Earn Free</h3>
              <p className="mt-1 text-[11px] text-white/38 max-w-[220px] mx-auto leading-relaxed">
                Share your link. When a friend signs up, your <span style={{ color: '#E8CC7A' }}>Docrud Go ✦</span> activates — zero payment.
              </p>
            </div>

            {/* How it works — 3 steps */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { n: '1', label: 'Share your link' },
                { n: '2', label: 'Friend signs up' },
                { n: '3', label: 'You get Go free' },
              ].map(({ n, label }, i) => (
                <div key={n} className="flex flex-col items-center gap-1.5 rounded-[12px] py-3 px-2"
                  style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)', animation: `obSlideUp 0.3s ${i * 0.06}s ease both` }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black"
                    style={{ background: 'linear-gradient(135deg,#C9A84C,#F0D878)', color: '#1a1208' }}>{n}</span>
                  <span className="text-[9.5px] font-semibold text-white/50 text-center leading-tight">{label}</span>
                </div>
              ))}
            </div>

            {/* Referral link */}
            <div className="rounded-[14px] p-[1.5px]"
              style={{ background: 'linear-gradient(135deg,#C9A84C55,#F0D87844,#C9A84C55)' }}>
              <div className="rounded-[13px] bg-[#100d06] px-3 py-3">
                <p className="mb-1.5 text-[9.5px] font-black uppercase tracking-[0.2em]" style={{ color: '#C9A84C' }}>Your Referral Link</p>
                {refLinkLoading ? (
                  <div className="h-9 animate-pulse rounded-xl bg-white/[0.06]" />
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1 truncate rounded-xl border border-white/[0.09] bg-white/[0.04] px-2.5 py-2 font-mono text-[10px] text-white/65">
                      {refLink || '—'}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!refLink) return;
                        navigator.clipboard.writeText(refLink).then(() => {
                          setRefCopied(true);
                          setTimeout(() => setRefCopied(false), 2200);
                        });
                      }}
                      disabled={!refLink}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.06] transition hover:bg-white/[0.12] disabled:opacity-30"
                      title="Copy link"
                    >
                      {refCopied
                        ? <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        : <svg className="h-4 w-4 text-white/55" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                      }
                    </button>
                  </div>
                )}
                {refCode && (
                  <p className="mt-1 text-[9.5px] text-white/25">Code: <span className="font-mono font-bold text-white/45">{refCode}</span></p>
                )}
                {refCopied && (
                  <p className="mt-1 text-[10px] font-semibold text-emerald-400" style={{ animation: 'obScaleIn 0.2s both' }}>✓ Copied to clipboard!</p>
                )}
              </div>
            </div>

            {/* Email invite */}
            <div>
              <p className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/28">Send a direct invite</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={refInviteEmail}
                  onChange={(e) => setRefInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!refSending && refInviteEmail.trim()) {
                        setRefSendErr('');
                        setRefSentMsg('');
                        setRefSending(true);
                        fetch('/api/referrals/invite', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: refInviteEmail.trim() }),
                        })
                          .then(r => r.json())
                          .then((d: { success?: boolean; error?: string }) => {
                            if (d.success) { setRefSentMsg(`Invite sent to ${refInviteEmail.trim()} ✓`); setRefInviteEmail(''); }
                            else throw new Error(d.error || 'Failed');
                          })
                          .catch((err: unknown) => setRefSendErr(err instanceof Error ? err.message : 'Failed to send.'))
                          .finally(() => setRefSending(false));
                      }
                    }
                  }}
                  placeholder="colleague@company.com"
                  className="h-10 flex-1 rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 text-[12px] text-white placeholder:text-white/22 outline-none transition focus:border-amber-500/25 focus:ring-2 focus:ring-amber-500/[0.08]"
                />
                <button
                  type="button"
                  disabled={refSending || !refInviteEmail.trim()}
                  onClick={() => {
                    setRefSendErr('');
                    setRefSentMsg('');
                    setRefSending(true);
                    fetch('/api/referrals/invite', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: refInviteEmail.trim() }),
                    })
                      .then(r => r.json())
                      .then((d: { success?: boolean; error?: string }) => {
                        if (d.success) { setRefSentMsg(`Sent ✓`); setRefInviteEmail(''); }
                        else throw new Error(d.error || 'Failed');
                      })
                      .catch((err: unknown) => setRefSendErr(err instanceof Error ? err.message : 'Failed.'))
                      .finally(() => setRefSending(false));
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/[0.10] transition hover:bg-amber-500/[0.18] disabled:opacity-40"
                >
                  {refSending
                    ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" />
                    : <svg className="h-4 w-4 text-amber-300" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                  }
                </button>
              </div>
              {refSentMsg && <p className="mt-1.5 text-[10.5px] text-emerald-400" style={{ animation: 'obScaleIn 0.2s both' }}>{refSentMsg}</p>}
              {refSendErr && <p className="mt-1.5 text-[10.5px] text-rose-400">{refSendErr}</p>}
            </div>

            <p className="text-center text-[9.5px] text-white/20 leading-4">
              Referrals can be sent to multiple people. Docrud Go activates <strong className="text-white/30">once per referrer</strong> — the moment a referred profile is created.
            </p>

            {/* Back + skip */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setGoPhase('offer')}
                className="flex items-center gap-1 text-[11px] text-white/25 hover:text-white/50 transition"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Back to offer
              </button>
              <button
                type="button"
                onClick={() => setGoPhase('skipped')}
                className="text-[11px] text-white/20 hover:text-white/45 transition"
              >
                Skip →
              </button>
            </div>
          </div>
        );

        return (
          <div className="flex flex-col gap-3">
            {/* Welcome header — compact */}
            <div className="flex items-center gap-3" style={{ animation: 'obSlideUp 0.45s both' }}>
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04]">
                <svg className="absolute inset-0 h-11 w-11 -rotate-90" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <circle cx="22" cy="22" r="20" fill="none" strokeWidth="1.5" strokeLinecap="round"
                    strokeDasharray="125" strokeDashoffset="0"
                    style={{ stroke: 'url(#doneGrad2)', animation: 'obCheckDraw 1.2s 0.3s cubic-bezier(.4,0,.2,1) both' }} />
                  <defs>
                    <linearGradient id="doneGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#C9A84C" /><stop offset="100%" stopColor="#E8CC7A" />
                    </linearGradient>
                  </defs>
                </svg>
                <CheckCircle2 className="h-5 w-5 text-white/70" style={{ animation: 'obScaleIn 0.4s 1.0s both', opacity: 0 }} />
              </div>
              <div>
                <h2 className="text-[1.35rem] sm:text-[1.55rem] font-black tracking-[-0.03em] text-white leading-tight">
                  {userName ? `You're in, ${userName.split(' ')[0]}!` : "You're all set!"}
                </h2>
                <p className="text-[11px] text-white/35">Your profile is live on Docrud.</p>
              </div>
            </div>

            {/* ── Docrud Go Premium Card ── */}
            <div className="relative overflow-hidden rounded-[18px] p-[1.5px]"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#F0D878 40%,#C9A84C 70%,#A07830)', animation: 'obCardGlow 4s ease-in-out infinite' }}>
              {/* Inner card */}
              <div className="relative overflow-hidden rounded-[17px] bg-[#100d06] px-4 py-4 sm:px-5 sm:py-4">

                {/* Ambient glow inside card */}
                <div className="pointer-events-none absolute inset-0"
                  style={{ background: 'radial-gradient(ellipse 90% 70% at 50% -10%,rgba(232,204,122,0.10) 0%,transparent 60%)' }} />

                {/* Header row */}
                <div className="relative mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: '#C9A84C' }}>First Login Offer</span>
                      <span className="rounded-full px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-[0.1em]"
                        style={{ background: 'rgba(201,168,76,0.15)', color: '#E8CC7A', border: '1px solid rgba(201,168,76,0.25)' }}>
                        Limited
                      </span>
                    </div>
                    <div className="text-[1.35rem] sm:text-[1.5rem] font-black tracking-[-0.04em] text-white leading-tight">
                      Docrud Go <span style={{ color: '#E8CC7A' }}>✦</span>
                    </div>
                    <div className="text-[11px] text-white/35 mt-0.5">Verified badge + all features unlocked</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[22px] sm:text-[26px] font-black text-white leading-none" style={{ color: '#F0D878' }}>₹99</div>
                    <div className="text-[9px] text-white/30">one-time</div>
                  </div>
                </div>

                {/* Badge benefits — 2-col compact */}
                <div className="relative mb-3 grid grid-cols-2 gap-1.5">
                  {[
                    ['✦', 'Gold verified badge'],
                    ['3×', 'More profile views'],
                    ['↑', 'Priority in search'],
                    ['★', 'Premium gig access'],
                    ['⚡', 'Faster connection growth'],
                    ['🔒', 'Higher client trust'],
                  ].map(([icon, label]) => (
                    <div key={label} className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5"
                      style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.12)' }}>
                      <span className="text-[11px] shrink-0" style={{ color: '#C9A84C' }}>{icon}</span>
                      <span className="text-[10.5px] font-semibold text-white/65 leading-tight truncate">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Feature limits — compact single-line */}
                <div className="relative mb-3 rounded-[10px] border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/22 mb-1.5">What's included</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {[
                      ['E-Sign', '25 docs/mo'],
                      ['Doc AI', '50 gen/mo'],
                      ['PDF Studio', '30 PDFs/mo'],
                      ['DocWord', '30 docs/mo'],
                      ['Forms', '10 active'],
                      ['Vault', '2 GB'],
                      ['Network', 'Unlimited'],
                      ['Gigs', '5 posts/mo'],
                    ].map(([feat, limit]) => (
                      <div key={feat} className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-white/40">{feat}</span>
                        <span className="text-[10px] font-semibold text-white/55">{limit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {goError && (
                  <div className="relative mb-2 rounded-[9px] border border-rose-500/20 bg-rose-500/[0.07] px-3 py-2 text-[11px] text-rose-300/80">
                    {goError}
                  </div>
                )}

                {/* CTA button */}
                <button
                  onClick={() => void handleGoPayment()}
                  disabled={goPhase === 'paying'}
                  className="relative w-full flex items-center justify-center gap-2 rounded-[12px] h-10 sm:h-11 font-black text-[13px] sm:text-[14px] transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A,#C9A84C)', color: '#1a1208', boxShadow: '0 4px 22px rgba(201,168,76,0.45)' }}>
                  {goPhase === 'paying'
                    ? <><div className="h-4 w-4 rounded-full border-2 border-[#1a1208]/30 border-t-[#1a1208] animate-spin" /> Processing…</>
                    : <>✦ Get Docrud Go — ₹99</>
                  }
                </button>
              </div>
            </div>

            {/* ── OR divider ── */}
            <div className="relative flex items-center gap-2">
              <div className="flex-1 h-px bg-white/[0.08]" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] px-2 text-white/20">OR</span>
              <div className="flex-1 h-px bg-white/[0.08]" />
            </div>

            {/* ── Refer-a-friend earn-free CTA ── */}
            <button
              type="button"
              onClick={() => {
                setGoPhase('refer');
                if (!refLink) {
                  setRefLinkLoading(true);
                  fetch('/api/referrals/stats')
                    .then(r => r.json())
                    .then((d: { link?: string; code?: string }) => {
                      setRefLink(d.link || '');
                      setRefCode(d.code || '');
                    })
                    .catch(() => {})
                    .finally(() => setRefLinkLoading(false));
                }
              }}
              className="w-full flex items-center gap-3 rounded-[14px] border px-4 py-3 text-left transition-all hover:bg-white/[0.04] active:scale-[0.98]"
              style={{ borderColor: 'rgba(201,168,76,0.20)', background: 'rgba(201,168,76,0.04)' }}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#F0D878)', boxShadow: '0 0 14px rgba(201,168,76,0.35)' }}>
                <svg className="h-4 w-4 text-[#1a1208]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7l7-7 7 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-black text-white/85">Earn Docrud Go FREE</p>
                <p className="text-[10.5px] text-white/35 leading-tight">Refer a friend → they activate → your Go badge unlocks for free</p>
              </div>
              <svg className="h-4 w-4 text-white/20 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </button>

            {/* Skip link */}
            <button
              onClick={() => setGoPhase('skipped')}
              className="text-center text-[11px] text-white/20 hover:text-white/45 transition-colors">
              Continue without upgrading →
            </button>
          </div>
        );
      }

      default: return null;
    }
  }

  /* ════════════ MAIN RENDER ════════════ */
  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden bg-[#050508] text-white">
      <BgOrbs />

      {/* LEFT PANEL — desktop only */}
      <div className="relative hidden lg:flex lg:w-[52%] xl:w-[56%] shrink-0 flex-col overflow-hidden">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/[0.07] to-transparent" />
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 30% 50%,rgba(255,255,255,0.015) 0%,transparent 60%)' }} />
        <ScreenIn key={`left-${screen}`}>
          <LeftPanelSwitch screen={screen} headline={headline} bio={bio} />
        </ScreenIn>
      </div>

      {/* RIGHT PANEL — full screen on mobile, side panel on desktop */}
      <div className="relative flex h-[100dvh] w-full flex-col lg:w-[48%] xl:w-[44%]">

        {/* Top bar — fixed height */}
        <div className="relative z-10 flex h-12 shrink-0 items-center justify-between px-5 sm:px-6">
          <span className="text-[10.5px] font-semibold text-white/20">
            {isTour ? `${screen + 1} of ${TOUR_END + 1}` : screen < DONE_SCR ? `Step ${postAuthStep} of ${postAuthTotal}` : ''}
          </span>
          {screen < DONE_SCR && (
            <button onClick={skip}
              className="rounded-[9px] border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[10.5px] font-semibold text-white/28 hover:text-white/50 hover:bg-white/[0.06] transition-all">
              Skip to login
            </button>
          )}
          {/* Gold progress bar — below top bar */}
          {!isTour && screen < DONE_SCR && (
            <div className="absolute bottom-0 inset-x-0 h-[2px] bg-white/[0.04]">
              <div className="h-full rounded-r-full transition-all duration-700 ease-out" style={{ width: `${progressPct}%`, background: GOLD_GRAD }} />
            </div>
          )}
        </div>

        {/* Scrollable content area — flex-1, centered */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[#050508]/15" />
          <div className="relative z-10 w-full max-w-[360px] px-5 sm:px-7">
            <ScreenIn key={screen}>
              {renderForm()}
            </ScreenIn>
          </div>
        </div>

        {/* Bottom — step dots or padding */}
        <div className="relative z-10 flex h-12 shrink-0 items-center justify-center">
          {isTour && (
            <div className="flex gap-2">
              {Array.from({ length: TOUR_END + 1 }).map((_, i) => (
                <button key={i} onClick={() => setScreen(i)}
                  className="rounded-full transition-all duration-300"
                  style={i === screen
                    ? { width: 24, height: 6, background: GOLD_GRAD, boxShadow: '0 0 8px rgba(212,175,55,0.40)' }
                    : { width: 6,  height: 6, background: 'rgba(255,255,255,0.18)' }
                  } />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
