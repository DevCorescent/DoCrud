'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import {
  ArrowRight, Award, Bot, Briefcase, CheckCircle2, Eye, EyeOff,
  FileSignature, FileText, FormInput, Globe,
  Layers, LockKeyhole, MapPin, Network, PenLine, Shield, Share2,
  Sparkles, Users, X, Zap,
} from 'lucide-react';

/* ─── Splash ─────────────────────────────────────────────────── */
const SLOT_WORDS = ['network', 'gigs', 'jobs', 'updates', 'documents'];
const SPLASH_FEATS = [
  'e-sign docs with OTP magic — zero paperwork. ✦',
  'AI writes your documents in under 60 seconds. ✦',
  'annotate, stamp & share PDFs — just like that. ✦',
  'smart forms that actually think for you. ✦',
  '3,400+ verified pros, one friendly platform. ✦',
  'post gigs, find talent, get things done. ✦',
  'DocSheets — spreadsheets, but make it fun. ✦',
  'SOC 2 & GDPR-ready. your data, always safe. ✦',
];

/* Professional profile cards for the two marquee rows */
const SPLASH_PROFILES_TOP = [
  { init:'AK', name:'Ananya Krishnan',  title:'Sr. Product Designer',     loc:'Bengaluru',  avail:'Open to Work', availColor:'#34d399', skills:['Figma','Design Systems','Bharat UX'],   rating:4.97, projects:24, avatarGrad:'135deg,#059669,#10b981' },
  { init:'RM', name:'Rohan Mehta',      title:'ML Engineer',               loc:'Hyderabad',  avail:'Available Now',availColor:'#60a5fa', skills:['Python','PyTorch','LLMs'],              rating:4.93, projects:18, avatarGrad:'135deg,#2563eb,#3b82f6' },
  { init:'SJ', name:'Siddharth Joshi',  title:'Full-Stack Developer',      loc:'Pune',       avail:'Freelance',    availColor:'#a78bfa', skills:['Next.js','Go','Postgres'],               rating:4.91, projects:31, avatarGrad:'135deg,#7c3aed,#8b5cf6' },
  { init:'PN', name:'Priya Nair',       title:'UX Writer',                 loc:'Kochi',      avail:'Part-time',    availColor:'#fb7185', skills:['UX Writing','SEO','Content'],            rating:4.88, projects:43, avatarGrad:'135deg,#e11d48,#f43f5e' },
  { init:'VS', name:'Vikram Singh',     title:'Cloud Architect',           loc:'Delhi NCR',  avail:'Contract',     availColor:'#22d3ee', skills:['AWS','Kubernetes','Terraform'],          rating:4.95, projects:15, avatarGrad:'135deg,#0e7490,#06b6d4' },
  { init:'MI', name:'Meera Iyer',       title:'Brand & Motion Designer',   loc:'Chennai',    avail:'Open to Work', availColor:'#e879f9', skills:['After Effects','Lottie','Figma'],         rating:4.92, projects:38, avatarGrad:'135deg,#a21caf,#d946ef' },
  { init:'AT', name:'Aryan Thakur',     title:'Data Scientist',            loc:'Mumbai',     avail:'Available Now',availColor:'#34d399', skills:['R','Pandas','Spark'],                    rating:4.86, projects:22, avatarGrad:'135deg,#0f766e,#14b8a6' },
  { init:'NK', name:'Nisha Kapoor',     title:'Legal Tech Consultant',     loc:'Noida',      avail:'Freelance',    availColor:'#a78bfa', skills:['Contract Law','DocDraft','LegalOps'],    rating:4.89, projects:11, avatarGrad:'135deg,#6d28d9,#7c3aed' },
] as const;

const SPLASH_PROFILES_BTM = [
  { init:'LM', name:'Liam Morrison',    title:'Product Manager',           loc:'London, UK', avail:'Open to Work', availColor:'#34d399', skills:['Roadmap','Agile','SaaS Growth'],         rating:4.94, projects:19, avatarGrad:'135deg,#1d4ed8,#3b82f6' },
  { init:'SC', name:'Sofia Chen',       title:'UX Researcher',             loc:'Singapore',  avail:'Contract',     availColor:'#22d3ee', skills:['User Testing','Figma','Miro'],           rating:4.90, projects:27, avatarGrad:'135deg,#0369a1,#0ea5e9' },
  { init:'JR', name:'James Russo',      title:'Backend Engineer',          loc:'New York',   avail:'Available Now',availColor:'#60a5fa', skills:['Rust','Kafka','Postgres'],               rating:4.87, projects:34, avatarGrad:'135deg,#1e3a8a,#2563eb' },
  { init:'AO', name:'Amara Osei',       title:'Growth Marketer',           loc:'Accra, GH',  avail:'Freelance',    availColor:'#fb923c', skills:['SEO','CRO','Paid Media'],                rating:4.85, projects:41, avatarGrad:'135deg,#c2410c,#f97316' },
  { init:'EP', name:'Elena Petrov',     title:'DevOps Engineer',           loc:'Berlin, DE', avail:'Part-time',    availColor:'#a78bfa', skills:['GCP','Docker','CI/CD'],                  rating:4.91, projects:16, avatarGrad:'135deg,#5b21b6,#7c3aed' },
  { init:'KY', name:'Kenji Yamamoto',   title:'iOS Engineer',              loc:'Tokyo, JP',  avail:'Open to Work', availColor:'#34d399', skills:['Swift','SwiftUI','Metal'],               rating:4.96, projects:28, avatarGrad:'135deg,#065f46,#10b981' },
  { init:'FN', name:'Fatima Al-Nouri',  title:'AI Researcher',             loc:'Dubai, UAE', avail:'Available Now',availColor:'#60a5fa', skills:['NLP','LLMs','Python'],                   rating:4.93, projects:13, avatarGrad:'135deg,#1e40af,#3b82f6' },
  { init:'ZA', name:'Zara Ahmed',       title:'Brand Strategist',          loc:'Karachi, PK',avail:'Freelance',    availColor:'#fb7185', skills:['Brand','Copy','Social'],                 rating:4.84, projects:36, avatarGrad:'135deg,#9f1239,#fb7185' },
] as const;

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
   SPLASH SCREEN
═══════════════════════════════════════════════════════════════ */

type SplashProfile = {
  init: string; name: string; title: string; loc: string;
  avail: string; availColor: string; skills: readonly string[];
  rating: number; projects: number; avatarGrad: string;
};
type FeedPost = {
  init: string; author: string; role: string; time: string;
  text: string; likes: number; comments: number; avatarGrad: string; tag: string; tagColor: string;
};
type EventItem = {
  title: string; day: string; month: string; location: string;
  attendees: number; category: string; color: string;
};
type GigItem = {
  title: string; budget: string; skills: readonly string[];
  poster: string; bids: number; level: string;
};
type DocItem = {
  name: string; type: string; pages: number; shared: string;
  icon: string; colorRgb: string;
};

const FEED_POSTS: FeedPost[] = [
  { init:'AK', author:'Ananya K.',      role:'Sr. Designer',       time:'2h',  text:'Just shipped a full design system at scale — 340+ tokens, Figma + code perfectly in sync. One of the best days of my career. 🔥', likes:284, comments:43, avatarGrad:'135deg,#059669,#10b981', tag:'Design',      tagColor:'#a78bfa' },
  { init:'RM', author:'Rohan M.',        role:'ML Engineer',         time:'4h',  text:'Fine-tuned a small LLM on domain-specific docs and hit 94% accuracy. Smaller models are underrated. The key was the dataset curation.', likes:512, comments:87, avatarGrad:'135deg,#2563eb,#3b82f6', tag:'AI / ML',     tagColor:'#60a5fa' },
  { init:'SJ', author:'Siddharth J.',   role:'Full-Stack Dev',      time:'1d',  text:'Migrated a 200k-user SaaS from REST to tRPC in a weekend. Type-safety end-to-end is genuinely life-changing. Zero runtime errors so far.', likes:391, comments:62, avatarGrad:'135deg,#7c3aed,#8b5cf6', tag:'Engineering', tagColor:'#818cf8' },
  { init:'VS', author:'Vikram S.',       role:'Cloud Architect',     time:'6h',  text:'Kubernetes costs went from ₹2.4L/mo to ₹80k after aggressive right-sizing + spot instance migration. Infrastructure is a product.', likes:743, comments:118, avatarGrad:'135deg,#0e7490,#06b6d4', tag:'Cloud',       tagColor:'#22d3ee' },
  { init:'MI', author:'Meera I.',        role:'Motion Designer',     time:'3h',  text:'Released 18 free Lottie animations for Indian festivals. Diwali, Holi, Pongal — all CC0. Go use them. Link in bio ✨', likes:1204, comments:231, avatarGrad:'135deg,#a21caf,#d946ef', tag:'Creative',    tagColor:'#e879f9' },
  { init:'PN', author:'Priya N.',        role:'UX Writer',           time:'5h',  text:'Rewrote 60 error messages across the app. Bounce rate on error screens dropped 38%. Words are literally UX.', likes:476, comments:74, avatarGrad:'135deg,#e11d48,#f43f5e', tag:'UX',          tagColor:'#fb7185' },
  { init:'AT', author:'Aryan T.',        role:'Data Scientist',      time:'2d',  text:'Built a churn prediction model that saved our startup ₹40L in ARR this quarter. Feature engineering > model selection, every time.', likes:638, comments:95, avatarGrad:'135deg,#0f766e,#14b8a6', tag:'Data',        tagColor:'#34d399' },
  { init:'NK', author:'Nisha K.',        role:'Legal Tech',          time:'1d',  text:'AI-drafted NDAs are finally legally enforceable in 3 more Indian states. This is a watershed moment for legal tech in Bharat.', likes:892, comments:147, avatarGrad:'135deg,#6d28d9,#7c3aed', tag:'Legal',       tagColor:'#c4b5fd' },
];

const EVENTS: EventItem[] = [
  { title:'Figma Config India 2025',          day:'14', month:'Jun', location:'Bengaluru',   attendees:1240, category:'Design',      color:'#a78bfa' },
  { title:'IndiaAI Summit',                   day:'22', month:'Jul', location:'New Delhi',   attendees:3800, category:'AI & ML',     color:'#60a5fa' },
  { title:'React India Conference',           day:'5',  month:'Sep', location:'Goa',         attendees:950,  category:'Engineering', color:'#818cf8' },
  { title:'Startup Mahakumbh',                day:'18', month:'Aug', location:'Lucknow',     attendees:12000,category:'Startup',     color:'#fb923c' },
  { title:'Product Management Summit',        day:'3',  month:'Oct', location:'Mumbai',      attendees:2100, category:'Product',     color:'#34d399' },
  { title:'Bharat FinTech Conclave',          day:'29', month:'Jun', location:'Hyderabad',   attendees:4500, category:'Finance',     color:'#fbbf24' },
  { title:'Women in Tech India',              day:'11', month:'Jul', location:'Pune',        attendees:1800, category:'Community',   color:'#e879f9' },
  { title:'Cloud & DevOps India',             day:'26', month:'Sep', location:'Chennai',     attendees:720,  category:'Cloud',       color:'#22d3ee' },
];

const GIGS: GigItem[] = [
  { title:'Build a Next.js SaaS Dashboard',       budget:'₹18k – ₹28k',  skills:['Next.js','TypeScript','Tailwind'],  poster:'Vikram S.',   bids:14, level:'Expert'      },
  { title:'Fine-tune LLM for Legal Docs',         budget:'₹35k – ₹55k',  skills:['Python','LLMs','NLP'],              poster:'Nisha K.',    bids:7,  level:'Expert'      },
  { title:'Brand Identity for D2C Startup',       budget:'₹22k – ₹38k',  skills:['Brand','Figma','Illustration'],     poster:'Meera I.',    bids:19, level:'Mid'         },
  { title:'Mobile App UI — Fintech',              budget:'₹14k – ₹20k',  skills:['Figma','iOS Design','UX'],          poster:'Ananya K.',   bids:11, level:'Mid'         },
  { title:'Kubernetes Infra Audit',               budget:'₹40k – ₹70k',  skills:['AWS','K8s','Terraform'],            poster:'Elena P.',    bids:5,  level:'Expert'      },
  { title:'Content Strategy — B2B SaaS',          budget:'₹8k – ₹14k',   skills:['Content','SEO','Hubspot'],          poster:'Priya N.',    bids:22, level:'Entry'       },
  { title:'ML Pipeline for E-commerce',           budget:'₹30k – ₹50k',  skills:['Python','Spark','MLflow'],          poster:'Rohan M.',    bids:9,  level:'Expert'      },
  { title:'React Native — Social App',            budget:'₹25k – ₹40k',  skills:['RN','Redux','Firebase'],            poster:'Kenji Y.',    bids:16, level:'Mid'         },
];

const DOCS: DocItem[] = [
  { name:'Q2 Financial Report',       type:'PDF',   pages:24,  shared:'Finance Team',    icon:'📊', colorRgb:'99,102,241'  },
  { name:'Product Roadmap 2025',      type:'DOCX',  pages:18,  shared:'Product & Eng',   icon:'🗺️', colorRgb:'59,130,246'  },
  { name:'NDA — Corescent x Acme',   type:'PDF',   pages:6,   shared:'Legal',           icon:'📝', colorRgb:'232,121,249' },
  { name:'Design System v3.0',        type:'Figma', pages:84,  shared:'Design Team',     icon:'🎨', colorRgb:'167,139,250' },
  { name:'Investor Deck — Series A',  type:'PPTX',  pages:32,  shared:'Founders',        icon:'💼', colorRgb:'251,191,36'  },
  { name:'Employee Handbook 2025',    type:'DOCX',  pages:56,  shared:'All Staff',       icon:'📋', colorRgb:'52,211,153'  },
  { name:'API Documentation v2',      type:'MD',    pages:140, shared:'Engineering',     icon:'⚡', colorRgb:'34,211,238'  },
  { name:'Brand Guidelines',          type:'PDF',   pages:48,  shared:'Marketing',       icon:'✨', colorRgb:'249,115,22'  },
];

/* ─── Card components ────────────────────────────────────────── */

const CARD_BASE: React.CSSProperties = {
  flexShrink: 0,
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.068)',
  background: 'rgba(11,11,17,0.82)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.042)',
  cursor: 'default',
  userSelect: 'none',
};

function ProfileCard({ p }: { p: SplashProfile }) {
  return (
    <div style={{ ...CARD_BASE, width: 210, padding: '13px 14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(${p.avatarGrad})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 800, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
          {p.init}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.88)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.36)', marginTop: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: '#fbbf24' }}>★</span>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.52)' }}>{p.rating}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>📍 {p.loc}</span>
        <span style={{ fontSize: 8, fontWeight: 600, color: p.availColor, padding: '1.5px 6px', borderRadius: 99, background: `${p.availColor}18`, border: `1px solid ${p.availColor}30` }}>{p.avail}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 9 }}>
        {p.skills.slice(0, 3).map(s => (
          <span key={s} style={{ fontSize: 8.5, fontWeight: 500, color: 'rgba(255,255,255,0.36)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '2px 6px' }}>{s}</span>
        ))}
      </div>
      <div style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.045)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.22)' }}>{p.projects} projects</span>
        <span style={{ fontSize: 8.5, fontWeight: 600, color: 'rgba(201,168,76,0.68)' }}>Connect →</span>
      </div>
    </div>
  );
}

function FeedCard({ post }: { post: FeedPost }) {
  return (
    <div style={{ ...CARD_BASE, width: 248, padding: '12px 14px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(${post.avatarGrad})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 800, color: '#fff' }}>
          {post.init}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{post.author}</div>
          <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.28)' }}>{post.role} · {post.time}</div>
        </div>
        <span style={{ fontSize: 7.5, fontWeight: 600, color: post.tagColor, padding: '1.5px 6px', borderRadius: 99, background: `${post.tagColor}16`, border: `1px solid ${post.tagColor}28`, whiteSpace: 'nowrap' }}>{post.tag}</span>
      </div>
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.48)', lineHeight: 1.58, marginBottom: 9, overflow: 'hidden', maxHeight: '3.16em' }}>{post.text}</p>
      <div style={{ display: 'flex', gap: 14 }}>
        <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', gap: 3 }}>♥ {post.likes.toLocaleString()}</span>
        <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', gap: 3 }}>💬 {post.comments}</span>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: EventItem }) {
  return (
    <div style={{ ...CARD_BASE, width: 208, padding: '12px 14px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
        <div style={{ width: 38, flexShrink: 0, borderRadius: 9, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.22)', textAlign: 'center' as const, padding: '5px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#E8CC7A', lineHeight: 1 }}>{event.day}</div>
          <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(232,204,122,0.6)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginTop: 1 }}>{event.month}</div>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35 }}>{event.title}</div>
          <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.28)', marginTop: 3 }}>📍 {event.location}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 8, fontWeight: 600, color: event.color, padding: '1.5px 7px', borderRadius: 99, background: `${event.color}14`, border: `1px solid ${event.color}28` }}>{event.category}</span>
        <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.22)' }}>👥 {event.attendees.toLocaleString()}</span>
      </div>
    </div>
  );
}

function GigCard({ gig }: { gig: GigItem }) {
  return (
    <div style={{ ...CARD_BASE, width: 222, padding: '12px 14px 11px' }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.86)', lineHeight: 1.35, marginBottom: 4 }}>{gig.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#34d399' }}>{gig.budget}</span>
          <span style={{ fontSize: 7.5, fontWeight: 600, color: 'rgba(255,255,255,0.32)', padding: '1.5px 6px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>{gig.level}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 9 }}>
        {gig.skills.map(s => (
          <span key={s} style={{ fontSize: 8.5, fontWeight: 500, color: 'rgba(255,255,255,0.36)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '2px 6px' }}>{s}</span>
        ))}
      </div>
      <div style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.045)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.26)' }}>by {gig.poster}</span>
        <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.22)' }}>{gig.bids} bids</span>
      </div>
    </div>
  );
}

function DocCard({ doc }: { doc: DocItem }) {
  return (
    <div style={{ ...CARD_BASE, width: 195, padding: '12px 14px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: `rgba(${doc.colorRgb},0.13)`, border: `1px solid rgba(${doc.colorRgb},0.24)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
          {doc.icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.86)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
          <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{doc.type} · {doc.pages}p</div>
        </div>
      </div>
      <div style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.045)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.24)' }}>{doc.shared}</span>
        <span style={{ fontSize: 8.5, fontWeight: 600, color: `rgba(${doc.colorRgb},0.75)` }}>Open →</span>
      </div>
    </div>
  );
}

/* ─── Marquee row wrapper ────────────────────────────────────── */
function SplashRow({ children, dir, dur }: { children: React.ReactNode; dir: 'L' | 'R'; dur: number }) {
  return (
    <div style={{ flexShrink: 0, overflow: 'hidden', width: '100%' }}>
      <div style={{
        display: 'flex', gap: 12,
        animation: `${dir === 'L' ? 'splashMarqueeL' : 'splashMarqueeR'} ${dur}s linear infinite`,
        willChange: 'transform',
      }}>
        {children}
      </div>
    </div>
  );
}

/* Doubled arrays for seamless loop -------------------------------- */
const PROFILES_TOP_2X  = [...SPLASH_PROFILES_TOP,  ...SPLASH_PROFILES_TOP]  as SplashProfile[];
const PROFILES_BTM_2X  = [...SPLASH_PROFILES_BTM,  ...SPLASH_PROFILES_BTM]  as SplashProfile[];
const FEED_POSTS_2X    = [...FEED_POSTS,            ...FEED_POSTS];
const EVENTS_2X        = [...EVENTS,                ...EVENTS];
const GIGS_2X          = [...GIGS,                  ...GIGS];
const DOCS_2X          = [...DOCS,                  ...DOCS];

/* ─── Main splash screen ─────────────────────────────────────── */
function SplashScreen({ visible, onSkip }: { visible: boolean; onSkip: () => void }) {
  const slotRef    = useRef<HTMLSpanElement>(null);
  const slotCurRef = useRef(0);
  const [slotWord, setSlotWord] = useState(SLOT_WORDS[0]);

  useEffect(() => {
    let cancelled = false;
    const cycle = () => {
      const el = slotRef.current;
      if (!el || cancelled) return;
      el.style.transition = 'transform 300ms cubic-bezier(0.4,0,1,1), opacity 260ms ease';
      el.style.transform  = 'translateY(-72%)';
      el.style.opacity    = '0';
      setTimeout(() => {
        if (cancelled) return;
        const el2 = slotRef.current;
        if (!el2) return;
        el2.style.transition = 'none';
        el2.style.transform  = 'translateY(72%)';
        el2.style.opacity    = '0';
        slotCurRef.current   = (slotCurRef.current + 1) % SLOT_WORDS.length;
        setSlotWord(SLOT_WORDS[slotCurRef.current]);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (cancelled) return;
          const el3 = slotRef.current;
          if (!el3) return;
          el3.style.transition = 'transform 420ms cubic-bezier(0.22,1,0.36,1), opacity 340ms ease';
          el3.style.transform  = 'translateY(0)';
          el3.style.opacity    = '1';
        }));
      }, 320);
    };
    const t = setInterval(cycle, 2800);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <div
      aria-hidden={!visible}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#060608', overflow: 'hidden',
        transition: 'opacity 900ms cubic-bezier(0.4,0,0.2,1)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* ── Card rows — fill entire screen ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-around',
          padding: '12px 0',
          opacity: 0,
          animation: 'obFadeIn 1.1s 0.15s both',
        }}
      >
        <SplashRow dir="L" dur={38}>
          {PROFILES_TOP_2X.map((p, i) => <ProfileCard key={i} p={p} />)}
        </SplashRow>
        <SplashRow dir="R" dur={52}>
          {FEED_POSTS_2X.map((p, i) => <FeedCard key={i} post={p} />)}
        </SplashRow>
        <SplashRow dir="L" dur={44}>
          {EVENTS_2X.map((e, i) => <EventCard key={i} event={e} />)}
        </SplashRow>
        <SplashRow dir="R" dur={36}>
          {GIGS_2X.map((g, i) => <GigCard key={i} gig={g} />)}
        </SplashRow>
        <SplashRow dir="L" dur={48}>
          {PROFILES_BTM_2X.map((p, i) => <ProfileCard key={i} p={p} />)}
        </SplashRow>
        <SplashRow dir="R" dur={58}>
          {DOCS_2X.map((d, i) => <DocCard key={i} doc={d} />)}
        </SplashRow>
      </div>

      {/* ── Frosted blur mask — softens cards behind the headline ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 5,
          backdropFilter: 'blur(44px)',
          WebkitBackdropFilter: 'blur(44px)',
          maskImage: 'radial-gradient(ellipse 72% 52% at 50% 50%, black 0%, black 18%, transparent 62%)',
          WebkitMaskImage: 'radial-gradient(ellipse 72% 52% at 50% 50%, black 0%, black 18%, transparent 62%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Dark centre vignette — contrast for text ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 65% 50% at 50% 50%, rgba(5,5,8,0.82) 0%, rgba(5,5,8,0.55) 38%, rgba(5,5,8,0.18) 62%, transparent 75%)',
        }}
      />

      {/* ── Edge vignette — cards fade naturally at screen edges ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none',
          background: [
            'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 42%, rgba(5,5,8,0.72) 78%, rgba(5,5,8,0.96) 100%)',
          ].join(','),
        }}
      />

      {/* ── Center content ── */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

          {/* Headline */}
          <div style={{ animation: 'obSlideUp 0.55s 0.45s both', opacity: 0, textAlign: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'center',
              flexWrap: 'nowrap', gap: '0.22em',
              fontSize: 'clamp(1.55rem, 4.8vw, 2.8rem)',
              fontWeight: 400, letterSpacing: '-0.035em', lineHeight: 1.15,
              whiteSpace: 'nowrap',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>your</span>
              <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', lineHeight: 1.2 }}>
                <span
                  ref={slotRef}
                  style={{
                    display: 'inline-block',
                    color: '#ffffff',
                    fontWeight: 600,
                  }}
                >
                  {slotWord}
                </span>
              </span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>— one platform.</span>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ animation: 'obFadeIn 0.5s 1.5s both', opacity: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onSkip}
              className="group flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-5 py-2.5 text-[13px] font-medium text-white/60 backdrop-blur-sm transition-all duration-200 hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-white/90 active:scale-[0.97]"
            >
              create profile
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-5 py-2.5 text-[13px] font-medium text-white/60 backdrop-blur-sm transition-all duration-200 hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-white/90 active:scale-[0.97]"
            >
              sign in
            </Link>
          </div>

        </div>
      </div>
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

/* ═══════════════════════════════════════════════════════════════
   SIGNUP LEFT PANEL — animated live profile-build preview
═══════════════════════════════════════════════════════════════ */
function SignupLeftPanel({ name, email }: { name: string; email: string }) {
  const displayName  = name.trim()  || 'Your Name';
  const displayEmail = email.trim() || 'you@example.com';
  const hasName  = name.trim().length > 0;
  const hasEmail = email.trim().length > 0;
  const completion = hasName && hasEmail ? 72 : hasName ? 44 : hasEmail ? 32 : 18;

  const DEMO_SKILLS = ['Product Design', 'Figma', 'UX Research', 'Prototyping'];
  const PEERS = [
    { init:'AK', grad:'135deg,#059669,#10b981' },
    { init:'RM', grad:'135deg,#2563eb,#3b82f6' },
    { init:'SJ', grad:'135deg,#7c3aed,#8b5cf6' },
    { init:'PN', grad:'135deg,#e11d48,#f43f5e' },
    { init:'VS', grad:'135deg,#0e7490,#06b6d4' },
  ];

  return (
    <div className="flex h-full w-full flex-col justify-between p-10 xl:p-14 select-none">

      {/* Logo */}
      <div style={{ animation: 'obFadeIn 0.5s both' }} className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-white/[0.12] bg-white/[0.06]">
          <svg viewBox="0 0 32 32" className="h-4.5 w-4.5" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M6 4h12l8 8v16H6V4z" /><path d="M18 4v8h8" /><path d="M10 16h12M10 20h8" />
          </svg>
        </div>
        <span className="text-[15px] font-black text-white">Docrud</span>
      </div>

      {/* Centre — animated profile card */}
      <div style={{ animation: 'obSlideUp 0.6s 0.1s both' }}>

        {/* Label */}
        <div className="mb-4 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-white/40" style={{ animation: 'obPulse 2s ease-in-out infinite' }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/28">building your profile</span>
        </div>

        {/* Profile card */}
        <div className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.025]"
          style={{ boxShadow: '0 8px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

          {/* Cover band */}
          <div className="relative h-20 overflow-hidden"
            style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.12) 0%,rgba(255,255,255,0.04) 50%,rgba(120,80,180,0.08) 100%)' }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom,transparent 40%,rgba(10,10,14,0.85) 100%)' }} />
            {/* Floating dots */}
            {[{l:'12%',t:'20%',d:'0s'},{l:'70%',t:'35%',d:'0.4s'},{l:'45%',t:'55%',d:'0.8s'},{l:'85%',t:'18%',d:'1.2s'}].map((p,i)=>(
              <div key={i} className="absolute h-1 w-1 rounded-full bg-white/25"
                style={{ left:p.l, top:p.t, animation:`obParticle ${3+i*0.5}s ease-in-out infinite ${p.d}` }} />
            ))}
          </div>

          <div className="px-5 pb-5 -mt-8">
            {/* Avatar + name row */}
            <div className="mb-4 flex items-end gap-3.5">
              <div className="relative shrink-0">
                {/* Pulse ring */}
                <div className="absolute inset-[-5px] rounded-full border border-white/[0.18]"
                  style={{ animation: 'splashPulse 3s ease-out infinite' }} />
                <div className="flex h-14 w-14 items-center justify-center rounded-[16px] border-2 border-[#0a0a0e] font-black text-xl text-white"
                  style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.22),rgba(180,140,50,0.10))' }}>
                  {hasName ? initials(name) : <span style={{ opacity: 0.22 }}>?</span>}
                </div>
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="truncate text-[15px] font-black text-white transition-all duration-400"
                  style={{ opacity: hasName ? 1 : 0.22 }}>
                  {displayName}
                </div>
                <div className="mt-0.5 truncate text-[10.5px] text-white/35 transition-all duration-400"
                  style={{ opacity: hasEmail ? 1 : 0.22 }}>
                  {hasEmail ? displayEmail.replace(/(.{4}).+(@.+)/, '$1…$2') : 'email not set'}
                </div>
              </div>
              {/* Verified badge */}
              <div className="mb-1 shrink-0 flex items-center gap-1 rounded-full border border-white/[0.10] bg-white/[0.05] px-2 py-0.5">
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#34d399' }} />
                <span className="text-[8.5px] font-bold text-white/45">Verified</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="mb-4 grid grid-cols-3 gap-2 text-center">
              {[['0','Docs'],['0','Connections'],['0','Gigs']].map(([v,l]) => (
                <div key={l} className="rounded-[10px] border border-white/[0.05] bg-white/[0.03] py-2">
                  <div className="text-[14px] font-black text-white/22">{v}</div>
                  <div className="text-[9px] text-white/18 mt-0.5">{l}</div>
                </div>
              ))}
            </div>

            {/* Skills */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {DEMO_SKILLS.map((s, i) => (
                <span key={s} style={{ animation: `obFadeIn 0.4s ${0.6 + i * 0.15}s both`, opacity: 0 }}
                  className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[9px] font-medium text-white/35">
                  {s}
                </span>
              ))}
            </div>

            {/* Completion bar */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] text-white/25 font-medium">Profile completion</span>
                <span className="text-[10px] font-black" style={{ color: 'rgba(201,168,76,0.75)' }}>{completion}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${completion}%`, background: 'linear-gradient(90deg,#C9A84C,#E8CC7A)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* People joining */}
        <div className="mt-4 flex items-center justify-between rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-4 py-3"
          style={{ animation: 'obFadeIn 0.6s 0.8s both', opacity: 0 }}>
          <div className="flex -space-x-2">
            {PEERS.map(p => (
              <div key={p.init} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0a0a0e] text-[9px] font-bold text-white"
                style={{ background: `linear-gradient(${p.grad})` }}>
                {p.init}
              </div>
            ))}
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-white/60">Join 3,400+ professionals</p>
            <p className="text-[9.5px] text-white/28">designers · engineers · founders</p>
          </div>
          <div className="shrink-0 rounded-full border border-white/[0.10] bg-white/[0.05] px-2.5 py-1 text-[8.5px] font-bold text-white/40">
            Live ✦
          </div>
        </div>
      </div>

      {/* Bottom trust strip */}
      <div style={{ animation: 'obFadeIn 0.6s 0.4s both', opacity: 0 }}
        className="flex items-center gap-4 rounded-[14px] border border-white/[0.05] bg-white/[0.015] px-4 py-3">
        {[['SOC 2','Certified'],['GDPR','Compliant'],['256-bit','Encrypted']].map(([v,l]) => (
          <div key={l} className="text-center flex-1">
            <p className="text-[11px] font-black text-white/45">{v}</p>
            <p className="text-[8.5px] text-white/20 mt-0.5">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   OTP LEFT PANEL
═══════════════════════════════════════════════════════════════ */
function OtpLeftPanel({ email }: { email: string }) {
  const displayEmail = email || 'your email';
  const STEPS = [
    { label: 'Account created',  done: true  },
    { label: 'Verify email',     done: false, active: true },
    { label: 'Set up profile',   done: false },
    { label: 'Add skills',       done: false },
    { label: 'You\'re live!',    done: false },
  ];
  return (
    <div className="flex h-full w-full flex-col justify-between p-10 xl:p-14 select-none">
      {/* Logo */}
      <div style={{ animation: 'obFadeIn 0.5s both' }} className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-white/[0.12] bg-white/[0.06]">
          <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M6 4h12l8 8v16H6V4z" /><path d="M18 4v8h8" /><path d="M10 16h12M10 20h8" />
          </svg>
        </div>
        <span className="text-[15px] font-black text-white">Docrud</span>
      </div>

      {/* Centre */}
      <div style={{ animation: 'obSlideUp 0.6s 0.1s both' }}>
        {/* Animated envelope */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute inset-[-12px] rounded-full border border-white/[0.06]"
              style={{ animation: 'splashPulse 3s ease-out infinite 0.5s' }} />
            <div className="absolute inset-[-6px] rounded-full border border-white/[0.09]"
              style={{ animation: 'splashPulse 3s ease-out infinite 0s' }} />
            <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/[0.10] bg-white/[0.05]"
              style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
              <svg className="h-9 w-9 text-white/55" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            {/* Floating dot badges */}
            {[{top:'-6px',right:'-6px',c:'#34d399'},{bottom:'-6px',left:'-6px',c:'#60a5fa'},{top:'50%',left:'-18px',c:'rgba(201,168,76,0.8)'}].map((b,i) => (
              <div key={i} className="absolute h-2.5 w-2.5 rounded-full border-2 border-[#0a0a0e]"
                style={{ ...b, background: b.c, animation: `obFadeIn 0.4s ${0.6 + i * 0.2}s both`, opacity: 0 } as React.CSSProperties} />
            ))}
          </div>
        </div>

        {/* Email info */}
        <div className="mb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/28 mb-1">Code sent to</p>
          <p className="text-[13px] font-bold text-white/70 truncate">{displayEmail}</p>
        </div>

        {/* Journey steps */}
        <div className="space-y-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3"
              style={{ animation: `obFadeIn 0.4s ${0.3 + i * 0.1}s both`, opacity: 0 }}>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: s.done ? 'rgba(52,211,153,0.15)' : s.active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                  border: s.done ? '1px solid rgba(52,211,153,0.35)' : s.active ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.06)',
                }}>
                {s.done
                  ? <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#34d399" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  : s.active
                  ? <div className="h-2 w-2 rounded-full bg-white/60" style={{ animation: 'obPulse 1.8s infinite' }} />
                  : <div className="h-1.5 w-1.5 rounded-full bg-white/15" />}
              </div>
              <span className="text-[12px] font-medium"
                style={{ color: s.done ? 'rgba(52,211,153,0.75)' : s.active ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.20)' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom — security note */}
      <div style={{ animation: 'obFadeIn 0.6s 0.5s both', opacity: 0 }}
        className="flex items-center gap-3 rounded-[14px] border border-white/[0.05] bg-white/[0.015] px-4 py-3">
        <Shield className="h-4 w-4 shrink-0 text-white/28" />
        <p className="text-[11px] leading-relaxed text-white/25">Code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GO LEFT PANEL — referral earn-free animated diagram
═══════════════════════════════════════════════════════════════ */
function GoLeftPanel() {
  return (
    <div className="flex h-full w-full flex-col justify-between p-10 xl:p-14 select-none">
      <style>{`
        @keyframes goFlowDot {
          0%   { transform: translateY(-6px); opacity: 0; }
          18%  { opacity: 1; }
          82%  { opacity: 1; }
          100% { transform: translateY(38px); opacity: 0; }
        }
        @keyframes goNodeIn {
          0%   { opacity: 0; transform: translateX(-14px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes goBadgeGlow {
          0%, 100% { box-shadow: 0 0 18px rgba(201,168,76,0.30), 0 4px 24px rgba(201,168,76,0.14); }
          50%      { box-shadow: 0 0 32px rgba(201,168,76,0.55), 0 4px 40px rgba(201,168,76,0.28); }
        }
        @keyframes goCheckDraw {
          0%   { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes goOrb {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%      { opacity: 0.60; transform: scale(1.12); }
        }
      `}</style>

      {/* Logo */}
      <div style={{ animation: 'obFadeIn 0.5s both' }} className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-white/[0.12] bg-white/[0.06]">
          <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M6 4h12l8 8v16H6V4z" /><path d="M18 4v8h8" /><path d="M10 16h12M10 20h8" />
          </svg>
        </div>
        <span className="text-[15px] font-black text-white">Docrud</span>
      </div>

      {/* Centre */}
      <div>
        {/* Eyebrow */}
        <div style={{ animation: 'obFadeIn 0.4s 0.1s both', opacity: 0, background: 'rgba(201,168,76,0.07)', borderColor: 'rgba(201,168,76,0.22)' }}
          className="mb-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#E8CC7A', animation: 'obPulse 2s infinite' }} />
          <span className="text-[9.5px] font-bold uppercase tracking-[0.24em]" style={{ color: 'rgba(232,204,122,0.75)' }}>Referral Program</span>
        </div>

        {/* Heading */}
        <div style={{ animation: 'obSlideUp 0.5s 0.15s both', opacity: 0 }}>
          <h3 className="text-[1.5rem] font-black tracking-[-0.04em] text-white leading-[1.15]">
            Earn Docrud Go<br />for <span style={{ color: '#E8CC7A' }}>FREE ✦</span>
          </h3>
          <p className="mt-1.5 text-[11.5px] text-white/38 leading-relaxed">
            Refer one friend who joins Docrud — your Go badge unlocks instantly. No payment ever.
          </p>
        </div>

        {/* ── Flow diagram ── */}
        <div className="mt-6">

          {/* Node 1 — You share */}
          <div style={{ animation: 'goNodeIn 0.5s 0.3s both', opacity: 0 }}
            className="flex items-center gap-3 rounded-[14px] border border-white/[0.08] bg-white/[0.035] px-3.5 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]"
              style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))', border: '1px solid rgba(255,255,255,0.13)' }}>
              <svg className="h-4.5 w-4.5 h-[18px] w-[18px] text-white/65" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-black text-white/85">You share your link</p>
              <p className="text-[10.5px] text-white/30 mt-0.5">One unique referral link, yours forever</p>
            </div>
            <div className="shrink-0 rounded-full border border-white/[0.09] bg-white/[0.04] px-2.5 py-1 text-[8.5px] font-bold text-white/38">
              Step 1
            </div>
          </div>

          {/* Connector 1 */}
          <div className="relative ml-[30px] h-9 flex items-center">
            <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,0.08),rgba(201,168,76,0.18),rgba(255,255,255,0.04))' }} />
            {[0, 0.6, 1.2].map((d, i) => (
              <div key={i} className="absolute left-[-3px] w-[7px] rounded-full"
                style={{ height: 14, background: 'linear-gradient(to bottom,transparent,rgba(201,168,76,0.85),transparent)', animation: `goFlowDot 1.8s ${d}s ease-in-out infinite` }} />
            ))}
            {/* Label */}
            <p className="absolute left-5 text-[9.5px] text-white/22 font-medium">link clicked</p>
          </div>

          {/* Node 2 — Friend joins */}
          <div style={{ animation: 'goNodeIn 0.5s 0.52s both', opacity: 0, background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.18)' }}
            className="flex items-center gap-3 rounded-[14px] border px-3.5 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]"
              style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.22),rgba(99,102,241,0.08))', border: '1px solid rgba(99,102,241,0.28)' }}>
              <svg className="h-[18px] w-[18px] text-indigo-400/75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-black text-white/85">Friend clicks &amp; joins</p>
              <p className="text-[10.5px] text-white/30 mt-0.5">They create their Docrud profile</p>
            </div>
            <div className="shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-1"
              style={{ background: 'rgba(99,102,241,0.10)', borderColor: 'rgba(99,102,241,0.22)' }}>
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" style={{ animation: 'obPulse 1.6s infinite' }} />
              <span className="text-[8px] font-bold text-indigo-400/80">Step 2</span>
            </div>
          </div>

          {/* Connector 2 */}
          <div className="relative ml-[30px] h-9 flex items-center">
            <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: 'linear-gradient(to bottom,rgba(99,102,241,0.15),rgba(201,168,76,0.25),rgba(201,168,76,0.08))' }} />
            {[0, 0.6, 1.2].map((d, i) => (
              <div key={i} className="absolute left-[-3px] w-[7px] rounded-full"
                style={{ height: 14, background: 'linear-gradient(to bottom,transparent,rgba(201,168,76,0.85),transparent)', animation: `goFlowDot 1.8s ${d + 0.3}s ease-in-out infinite` }} />
            ))}
            <p className="absolute left-5 text-[9.5px] text-white/22 font-medium">profile created</p>
          </div>

          {/* Node 3 — Badge unlocks */}
          <div style={{ animation: 'goNodeIn 0.5s 0.74s both, goBadgeGlow 2.8s 1.4s ease-in-out infinite', opacity: 0, background: 'rgba(201,168,76,0.07)', borderColor: 'rgba(201,168,76,0.28)' } as React.CSSProperties}
            className="flex items-center gap-3 rounded-[14px] border px-3.5 py-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#F0D878)', boxShadow: '0 4px 18px rgba(201,168,76,0.45)' }}>
              {/* Pulse ring */}
              <div className="absolute -inset-1 rounded-[13px]"
                style={{ border: '1.5px solid rgba(201,168,76,0.35)', animation: 'splashPulse 2.5s ease-out infinite' }} />
              <span className="text-[17px] font-black leading-none" style={{ color: '#1a1208' }}>✦</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-black leading-tight" style={{ color: '#F0D878' }}>Your Go badge unlocks</p>
              <p className="text-[10.5px] text-white/38 mt-0.5">Gold verified. Zero cost.</p>
            </div>
            {/* Animated checkmark */}
            <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full border"
              style={{ background: 'rgba(201,168,76,0.15)', borderColor: 'rgba(201,168,76,0.38)' }}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="#E8CC7A" strokeWidth="2.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"
                  strokeDasharray="24" style={{ animation: 'goCheckDraw 0.55s 1.5s ease both' }} />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div style={{ animation: 'obFadeIn 0.5s 0.9s both', opacity: 0 }}
          className="mt-4 grid grid-cols-3 divide-x divide-white/[0.05] rounded-[14px] border border-white/[0.05] bg-white/[0.02]">
          {[
            { val: '₹0', sub: 'Cost to you' },
            { val: '1',  sub: 'Friend needed' },
            { val: '⚡', sub: 'Instant unlock' },
          ].map(({ val, sub }) => (
            <div key={sub} className="flex flex-col items-center py-3">
              <span className="text-[17px] font-black leading-none"
                style={{ color: val === '⚡' ? '#E8CC7A' : 'rgba(255,255,255,0.80)' }}>{val}</span>
              <span className="mt-1 text-[9px] text-white/28 leading-tight text-center">{sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom trust */}
      <div style={{ animation: 'obFadeIn 0.6s 0.5s both', opacity: 0 }}
        className="flex items-center gap-4 rounded-[14px] border border-white/[0.05] bg-white/[0.015] px-4 py-3">
        {[['SOC 2','Certified'],['GDPR','Compliant'],['256-bit','Encrypted']].map(([v,l]) => (
          <div key={l} className="flex-1 text-center">
            <p className="text-[11px] font-black text-white/45">{v}</p>
            <p className="text-[8.5px] text-white/20 mt-0.5">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROFILE LEFT PANEL — live profile card preview
═══════════════════════════════════════════════════════════════ */
function ProfileLeftPanel({ name, headline, bio, location, avatarUrl, bannerUrl, openToWork, skills }: {
  name: string; headline: string; bio: string; location: string;
  avatarUrl: string; bannerUrl: string; openToWork: boolean; skills: string[];
}) {
  const displayName = name.trim() || 'Your Name';

  // Profile completion calc
  const fields = [
    !!name.trim(),
    !!headline.trim(),
    !!bio.trim(),
    !!avatarUrl.trim(),
    !!bannerUrl.trim(),
    !!location.trim(),
    skills.length > 0,
  ];
  const filled = fields.filter(Boolean).length;
  const completion = Math.round((filled / fields.length) * 100);
  const completionColor = completion >= 70 ? '#34d399' : completion >= 40 ? '#E8CC7A' : 'rgba(255,255,255,0.35)';

  const STEP_LABELS = ['Name','Headline','Bio','Avatar','Banner','Location','Skills'];

  return (
    <div className="flex h-full w-full flex-col justify-between p-10 xl:p-14 select-none">
      {/* Logo */}
      <div style={{ animation: 'obFadeIn 0.5s both' }} className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-white/[0.12] bg-white/[0.06]">
          <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M6 4h12l8 8v16H6V4z" /><path d="M18 4v8h8" /><path d="M10 16h12M10 20h8" />
          </svg>
        </div>
        <span className="text-[15px] font-black text-white">Docrud</span>
      </div>

      {/* Label */}
      <div style={{ animation: 'obSlideUp 0.55s 0.08s both' }}>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: completionColor, transition: 'background 0.5s', animation: 'obPulse 2s infinite' }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/28">live profile preview</span>
          <span className="ml-auto text-[10px] font-black" style={{ color: completionColor, transition: 'color 0.5s' }}>{completion}%</span>
        </div>

        {/* Profile card */}
        <div className="overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.02]"
          style={{ boxShadow: '0 8px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)' }}>

          {/* Banner */}
          <div className="relative h-24 overflow-hidden">
            {bannerUrl
              ? <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
              : <div className="h-full w-full" style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.15) 0%,rgba(99,102,241,0.10) 50%,rgba(236,72,153,0.08) 100%)' }} />
            }
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom,transparent 50%,rgba(8,8,12,0.8) 100%)' }} />
            {/* Floating particles when no banner */}
            {!bannerUrl && [
              {l:'8%',t:'25%',d:'0s'},{l:'60%',t:'15%',d:'0.5s'},{l:'80%',t:'60%',d:'1s'},{l:'35%',t:'70%',d:'0.3s'},
            ].map((p,i) => (
              <div key={i} className="absolute h-1 w-1 rounded-full bg-white/20"
                style={{ left:p.l, top:p.t, animation:`obParticle ${3+i*0.6}s ease-in-out infinite ${p.d}` }} />
            ))}
            {/* Open to work ribbon */}
            {openToWork && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5"
                style={{ animation: 'obFadeIn 0.3s both' }}>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[8.5px] font-bold text-emerald-400">Open to Work</span>
              </div>
            )}
          </div>

          <div className="px-4 pb-4 -mt-7">
            {/* Avatar */}
            <div className="relative mb-3 inline-block">
              <div className="absolute inset-[-3px] rounded-full border-2 border-[#08080c]" />
              <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-[#08080c] bg-white/[0.08]"
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center text-[13px] font-black text-white/70"
                      style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.25),rgba(180,140,50,0.10))' }}>
                      {initials(displayName)}
                    </div>
                }
              </div>
            </div>

            {/* Name + headline */}
            <div className="mb-2">
              <p className="text-[14px] font-black text-white leading-tight transition-all duration-300"
                style={{ opacity: name.trim() ? 1 : 0.25 }}>
                {displayName}
              </p>
              <p className="mt-0.5 text-[10.5px] text-white/40 leading-snug transition-all duration-300 line-clamp-1"
                style={{ opacity: headline.trim() ? 1 : 0.22 }}>
                {headline.trim() || 'Your headline will appear here'}
              </p>
              {location.trim() && (
                <div className="mt-1 flex items-center gap-1" style={{ animation: 'obFadeIn 0.3s both' }}>
                  <MapPin className="h-2.5 w-2.5 text-white/25" />
                  <span className="text-[9.5px] text-white/30">{location}</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {bio.trim() && (
              <p className="mb-2.5 text-[10px] leading-relaxed text-white/35 line-clamp-2 transition-all duration-300"
                style={{ animation: 'obFadeIn 0.3s both' }}>
                {bio}
              </p>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1" style={{ animation: 'obFadeIn 0.3s both' }}>
                {skills.slice(0, 4).map(s => (
                  <span key={s} className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2 py-0.5 text-[8.5px] text-white/35">
                    {s}
                  </span>
                ))}
                {skills.length > 4 && <span className="text-[8.5px] text-white/22">+{skills.length - 4}</span>}
              </div>
            )}

            {/* Segmented progress */}
            <div>
              <div className="mb-1.5 flex gap-0.5">
                {STEP_LABELS.map((l, i) => (
                  <div key={l} title={l} className="h-1 flex-1 rounded-full transition-all duration-500"
                    style={{ background: fields[i] ? completionColor : 'rgba(255,255,255,0.07)' }} />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-white/22">Profile strength</span>
                <span className="text-[9px] font-black transition-all duration-500" style={{ color: completionColor }}>{completion}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom trust */}
      <div style={{ animation: 'obFadeIn 0.6s 0.4s both', opacity: 0 }}
        className="flex items-center gap-4 rounded-[14px] border border-white/[0.05] bg-white/[0.015] px-4 py-3">
        {[['SOC 2','Certified'],['GDPR','Compliant'],['256-bit','Encrypted']].map(([v,l]) => (
          <div key={l} className="flex-1 text-center">
            <p className="text-[11px] font-black text-white/45">{v}</p>
            <p className="text-[8.5px] text-white/20 mt-0.5">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeftPanelSwitch({ screen, headline, bio, sName, sEmail, avatarUrl, bannerUrl, location, openToWork, skills }: {
  screen: number; headline: string; bio: string;
  sName?: string; sEmail?: string;
  avatarUrl?: string; bannerUrl?: string; location?: string;
  openToWork?: boolean; skills?: string[];
}) {
  if (screen === 0) return <HeroLeftPanel />;
  if (screen === 1) return <PublishLeftPanel />;
  if (screen === 2) return <ConnectLeftPanel />;
  if (screen === 3) return <GigsLeftPanel />;
  if (screen === SIGNUP_SCR) return <SignupLeftPanel name={sName ?? ''} email={sEmail ?? ''} />;
  if (screen === OTP_SCR)  return <OtpLeftPanel email={sEmail ?? ''} />;
  if (screen === PROFILE_SCR || screen === SKILLS_SCR || screen === PEOPLE_SCR) return (
    <ProfileLeftPanel
      name={sName ?? ''}
      headline={headline}
      bio={bio}
      location={location ?? ''}
      avatarUrl={avatarUrl ?? ''}
      bannerUrl={bannerUrl ?? ''}
      openToWork={openToWork ?? false}
      skills={skills ?? []}
    />
  );
  if (screen === DONE_SCR) return <GoLeftPanel />;
  return <AuthLeftPanel screen={screen} headline={headline} bio={bio} />;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */
function OnboardingPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const skipSplash = searchParams?.get('start') === 'signup';
  const [screen, setScreen] = useState(skipSplash ? SIGNUP_SCR : 0);
  const [showSplash, setShowSplash] = useState(!skipSplash);

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
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  /* Track pending uploads so handleComplete can await them before saving */
  const pendingAvatarUploadRef = useRef<Promise<string | null>>(Promise.resolve(null));
  const pendingBannerUploadRef = useRef<Promise<string | null>>(Promise.resolve(null));

  const [otpSent,   setOtpSent]   = useState(false);
  const [otpError,  setOtpError]  = useState('');
  const [otpOk,     setOtpOk]     = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [avatarUrl,       setAvatarUrl]       = useState('');
  const [bannerUrl,       setBannerUrl]       = useState('');
  /* Separate text-input state so typing / clearing the URL box never wipes an uploaded image */
  const [avatarUrlInput,  setAvatarUrlInput]  = useState('');
  const [bannerUrlInput,  setBannerUrlInput]  = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  async function uploadImage(file: File, type: 'avatar' | 'banner'): Promise<string | null> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    try {
      const res = await fetch('/api/profile/upload-image', { method: 'POST', body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Upload failed');
      return data.url;
    } catch {
      return null;
    }
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    /* Show a local preview immediately, then replace with permanent URL */
    const preview = URL.createObjectURL(file);
    setAvatarUrl(preview);
    setAvatarUrlInput('');
    setAvatarUploading(true);
    const uploadPromise = uploadImage(file, 'avatar');
    pendingAvatarUploadRef.current = uploadPromise;
    const permanent = await uploadPromise;
    setAvatarUploading(false);
    if (permanent) {
      setAvatarUrl(permanent);
      URL.revokeObjectURL(preview);
    }
  }

  async function handleBannerFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setBannerUrl(preview);
    setBannerUrlInput('');
    setBannerUploading(true);
    const uploadPromise = uploadImage(file, 'banner');
    pendingBannerUploadRef.current = uploadPromise;
    const permanent = await uploadPromise;
    setBannerUploading(false);
    if (permanent) {
      setBannerUrl(permanent);
      URL.revokeObjectURL(preview);
    }
  }

  function applyAvatarUrlInput(val: string) {
    const trimmed = val.trim();
    if (trimmed) { setAvatarUrl(trimmed); setAvatarUrlInput(trimmed); }
  }
  function applyBannerUrlInput(val: string) {
    const trimmed = val.trim();
    if (trimmed) { setBannerUrl(trimmed); setBannerUrlInput(trimmed); }
  }
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
  const [goStats,   setGoStats]   = useState<{ claimed: number; total: number; remaining: number; pct: number } | null>(null);

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

  /* Fetch Go spot count when landing on DONE_SCR */
  useEffect(() => {
    if (screen !== DONE_SCR) return;
    fetch('/api/docrud-go/stats')
      .then(r => r.json())
      .then((d: { claimed?: number; total?: number; remaining?: number; pct?: number }) => {
        if (typeof d.claimed === 'number') {
          setGoStats({ claimed: d.claimed, total: d.total ?? 5000, remaining: d.remaining ?? 0, pct: d.pct ?? 0 });
        }
      })
      .catch(() => {});
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
      /* Await any in-flight image uploads so we save permanent URLs, not blob: URLs */
      const [resolvedAvatar, resolvedBanner] = await Promise.all([
        pendingAvatarUploadRef.current,
        pendingBannerUploadRef.current,
      ]);
      const finalAvatarUrl = resolvedAvatar ?? (avatarUrl.startsWith('blob:') ? '' : avatarUrl);
      const finalBannerUrl = resolvedBanner ?? (bannerUrl.startsWith('blob:') ? '' : bannerUrl);
      await Promise.all([
        ...followed.map(id => fetch('/api/profile/follow', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ targetUserId:id, action:'follow' }) })),
        fetch('/api/onboarding/complete', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ profile:{ headline, bio, location, website, avatarUrl: finalAvatarUrl, bannerUrl: finalBannerUrl, openToWork, skills, interests, onboardingDone:true, profileSetupDone:true } }) }),
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
        <div className="flex flex-col gap-5">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2" style={{ animation: 'obFadeIn 0.35s both' }}>
            <div className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-white/[0.12] bg-white/[0.06]">
              <svg viewBox="0 0 32 32" className="h-3.5 w-3.5" fill="none" stroke="white" strokeWidth="1.8">
                <path d="M6 4h12l8 8v16H6V4z" /><path d="M18 4v8h8" /><path d="M10 16h12M10 20h8" />
              </svg>
            </div>
            <span className="text-[14px] font-black text-white">Docrud</span>
          </div>

          {/* Heading */}
          <div style={{ animation: 'obSlideUp 0.45s 0.05s both', opacity: 0 }}>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#34d399', animation: 'obPulse 2s infinite' }} />
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.26em] text-white/30">Free · No credit card</span>
            </div>
            <h2 className="text-[1.5rem] sm:text-[1.75rem] font-black tracking-[-0.04em] text-white leading-[1.1]">
              Create your profile.
            </h2>
            <p className="mt-1 text-[12px] text-white/35">Join 3,400+ professionals. Takes 30 seconds.</p>
          </div>

          {/* Form card */}
          <div style={{ animation: 'obSlideUp 0.45s 0.12s both', opacity: 0, boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 24px 64px rgba(0,0,0,0.45)' }}
            className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm">
            <div className="p-4 sm:p-5 space-y-3">

              {/* Full name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/28">Full name</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                    <Users className="h-3.5 w-3.5" />
                  </span>
                  <input value={sName} onChange={e => setSName(e.target.value)} placeholder="Arjun Mehta"
                    className={INP + ' pl-10'} autoFocus />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/28">Email address</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  </span>
                  <input value={sEmail} onChange={e => setSEmail(e.target.value)} placeholder="you@company.com" type="email"
                    className={INP + ' pl-10'} />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/28">Password</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                    <LockKeyhole className="h-3.5 w-3.5" />
                  </span>
                  <input value={sPass} onChange={e => setSPass(e.target.value)} placeholder="Min 8 characters"
                    type={showPass ? 'text' : 'password'} className={INP + ' pl-10 pr-10'}
                    onKeyDown={e => { if (e.key === 'Enter') void handleSignup(); }} />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/22 hover:text-white/55 transition-colors">
                    {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {/* Password strength */}
                {sPass.length > 0 && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="flex flex-1 gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{ background: sPass.length >= i * 2 + 2 ? (sPass.length >= 10 ? '#34d399' : '#fbbf24') : 'rgba(255,255,255,0.07)' }} />
                      ))}
                    </div>
                    <span className="text-[9.5px] text-white/28">
                      {sPass.length < 6 ? 'Weak' : sPass.length < 10 ? 'Fair' : 'Strong'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {sError && (
              <div className="mx-4 mb-4 flex items-start gap-2 rounded-[10px] border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2.5 text-[12px] text-rose-300/75">
                <span className="mt-0.5 shrink-0">✕</span>{sError}
              </div>
            )}

            {/* CTA */}
            <div className="border-t border-white/[0.04] px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
              <button onClick={() => void handleSignup()}
                disabled={sLoading || !sName.trim() || !sEmail.trim() || sPass.length < 8}
                className={`h-10 sm:h-11 w-full ${WHITE_BTN} disabled:opacity-35`} style={WHITE_BTN_SHADOW}>
                {sLoading
                  ? <div className="h-4 w-4 rounded-full border-2 border-[#050508]/25 border-t-[#050508] animate-spin" />
                  : <><span>Create profile</span><ArrowRight className="h-3.5 w-3.5" /></>}
              </button>
              <p className="mt-2.5 text-center text-[10px] text-white/18">
                By continuing you agree to our{' '}
                <span className="text-white/35 underline underline-offset-2 cursor-pointer">Terms</span>
                {' '}&amp;{' '}
                <span className="text-white/35 underline underline-offset-2 cursor-pointer">Privacy Policy</span>.
              </p>
            </div>
          </div>

          {/* Sign in link */}
          <p style={{ animation: 'obFadeIn 0.4s 0.4s both', opacity: 0 }}
            className="text-center text-[12px] text-white/28">
            Already have an account?{' '}
            <button onClick={skip} className="font-semibold text-white/55 hover:text-white transition-colors">
              Sign in →
            </button>
          </p>
        </div>
      );

      /* ── 5  OTP ── */
      case OTP_SCR: return (
        <div className="flex flex-col gap-5">
          {/* Heading */}
          <div style={{ animation: 'obSlideUp 0.45s 0.05s both', opacity: 0 }}>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400" style={{ animation: 'obPulse 2s infinite' }} />
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.26em] text-white/30">Step 2 of 5 — Verify</span>
            </div>
            <h2 className="text-[1.5rem] sm:text-[1.75rem] font-black tracking-[-0.04em] text-white leading-[1.1]">
              Check your email.
            </h2>
            <p className="mt-1 text-[12px] text-white/35">
              6-digit code sent to{' '}
              <span className="font-semibold text-white/60">{session?.user?.email ?? sEmail}</span>
            </p>
          </div>

          {/* OTP input card */}
          <div style={{ animation: 'obSlideUp 0.45s 0.12s both', opacity: 0, boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 24px 64px rgba(0,0,0,0.45)' }}
            className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm">
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.20em] text-white/28">Verification code</p>
                <span className="text-[10px] text-white/20">
                  {otpDigits.filter(Boolean).length}/6
                </span>
              </div>

              {/* 6 boxes in a strict grid so they never wrap */}
              <div className="grid grid-cols-6 gap-2">
                {otpDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    maxLength={1}
                    value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    style={{
                      background: d ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                      borderColor: d ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
                    }}
                    className="h-12 w-full min-w-0 rounded-[11px] border text-center text-[1.1rem] font-black text-white outline-none transition-all duration-150 focus:border-white/[0.35] focus:bg-white/[0.10] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.06)]"
                  />
                ))}
              </div>

              {/* Progress dots */}
              <div className="mt-3 flex justify-center gap-1">
                {otpDigits.map((d, i) => (
                  <div key={i} className="h-1 w-1 rounded-full transition-all duration-200"
                    style={{ background: d ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.12)' }} />
                ))}
              </div>

              {otpError && (
                <p className="mt-3 text-center text-[12px] text-rose-300/65"
                  style={{ animation: 'obScaleIn 0.2s ease both' }}>
                  {otpError}
                </p>
              )}
              {otpOk && (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-[11px] border border-emerald-500/20 bg-emerald-500/[0.06] py-2.5 text-[12.5px] font-semibold text-emerald-400"
                  style={{ animation: 'obScaleIn 0.3s ease both' }}>
                  <CheckCircle2 className="h-4 w-4" /> Email verified!
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.04] px-5 pb-5 pt-3.5">
              <button onClick={() => void verifyOtp()} disabled={otpDigits.join('').length < 6 || verifying || otpOk}
                className={`h-10 sm:h-11 w-full ${WHITE_BTN} disabled:opacity-35`} style={WHITE_BTN_SHADOW}>
                {verifying
                  ? <div className="h-4 w-4 rounded-full border-2 border-[#050508]/25 border-t-[#050508] animate-spin" />
                  : <><span>Verify &amp; continue</span><ArrowRight className="h-3.5 w-3.5" /></>}
              </button>
            </div>
          </div>

          {/* Resend + skip */}
          <div style={{ animation: 'obFadeIn 0.4s 0.4s both', opacity: 0 }}
            className="flex items-center justify-between text-[12px] text-white/28">
            <button onClick={() => void sendOtp()} className="font-medium hover:text-white/55 transition-colors">
              Resend code
            </button>
            <button onClick={next} className="font-medium hover:text-white/55 transition-colors">
              Skip for now →
            </button>
          </div>
        </div>
      );

      /* ── 6  PROFILE ── */
      case PROFILE_SCR: return (
        <div className="flex flex-col gap-3.5">

          {/* Heading */}
          <div style={{ animation: 'obSlideUp 0.45s 0.05s both', opacity: 0 }}>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#E8CC7A', animation: 'obPulse 2s infinite' }} />
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.26em] text-white/30">Step 3 of 5 — Profile</span>
            </div>
            <h2 className="text-[1.45rem] sm:text-[1.65rem] font-black tracking-[-0.04em] text-white leading-[1.1]">Make it yours.</h2>
            <p className="mt-1 text-[11.5px] text-white/35">Live preview updates as you type.</p>
          </div>

          {/* Banner + Avatar combo card */}
          <div style={{ animation: 'obSlideUp 0.45s 0.1s both', opacity: 0 }}
            className="overflow-hidden rounded-[18px] border border-white/[0.07] bg-white/[0.025]">

            {/* Clickable banner zone */}
            <button type="button" onClick={() => bannerFileRef.current?.click()}
              className="group relative flex h-[80px] w-full items-center justify-center overflow-hidden transition-all"
              style={{ background: bannerUrl ? undefined : 'linear-gradient(135deg,rgba(201,168,76,0.12) 0%,rgba(99,102,241,0.10) 100%)' }}>
              {bannerUrl && <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setBannerUrl('')} />}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              {bannerUploading
                ? <div className="relative z-10 flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-3 py-1.5">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                    <span className="text-[9.5px] text-white/80">Uploading…</span>
                  </div>
                : <div className="relative z-10 flex items-center gap-2 rounded-full border border-white/20 bg-black/55 px-3 py-1.5 backdrop-blur-sm opacity-60 group-hover:opacity-100 transition-opacity">
                    <svg className="h-3 w-3 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span className="text-[9.5px] font-semibold text-white/90">{bannerUrl ? 'Change banner' : 'Upload banner'}</span>
                  </div>
              }
            </button>

            {/* Avatar row */}
            <div className="flex items-end gap-3 px-4 pb-3.5 pt-0" style={{ marginTop: -20 }}>
              <button type="button" onClick={() => avatarFileRef.current?.click()}
                className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#0d0d10] bg-white/[0.07] flex items-center justify-center text-[14px] font-black text-white/55 transition-all hover:border-white/25">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setAvatarUrl('')} />
                  : <span>{initials(userName || 'U')}</span>}
                {avatarUploading
                  ? <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/70">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                    </div>
                  : <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="h-4 w-4 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                    </div>
                }
              </button>
              <div className="flex-1 min-w-0 pb-0.5">
                <p className="text-[12px] font-bold text-white/75 truncate">{userName || 'Your Name'}</p>
                <p className="text-[10.5px] text-white/30 truncate">{headline || 'Add a headline below'}</p>
              </div>
            </div>

            {/* URL fallback row — uses independent input state; applying only on blur or Enter */}
            <div className="border-t border-white/[0.05] grid grid-cols-2">
              <div className="px-3 py-2.5 border-r border-white/[0.05]">
                <label className="mb-1 block text-[8.5px] font-bold uppercase tracking-[0.18em] text-white/22">
                  Avatar URL {avatarUrl && !avatarUploading && <span className="text-emerald-400/70 normal-case tracking-normal font-semibold">✓ set</span>}
                </label>
                <input
                  value={avatarUrlInput}
                  onChange={e => setAvatarUrlInput(e.target.value)}
                  onBlur={e => applyAvatarUrlInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyAvatarUrlInput(avatarUrlInput); } }}
                  placeholder="or paste URL"
                  className="h-7 w-full rounded-[8px] border border-white/[0.07] bg-white/[0.03] px-2 text-[11px] text-white placeholder:text-white/18 focus:outline-none focus:border-white/[0.18] transition-all" />
              </div>
              <div className="px-3 py-2.5">
                <label className="mb-1 block text-[8.5px] font-bold uppercase tracking-[0.18em] text-white/22">
                  Banner URL {bannerUrl && !bannerUploading && <span className="text-emerald-400/70 normal-case tracking-normal font-semibold">✓ set</span>}
                </label>
                <input
                  value={bannerUrlInput}
                  onChange={e => setBannerUrlInput(e.target.value)}
                  onBlur={e => applyBannerUrlInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyBannerUrlInput(bannerUrlInput); } }}
                  placeholder="or paste URL"
                  className="h-7 w-full rounded-[8px] border border-white/[0.07] bg-white/[0.03] px-2 text-[11px] text-white placeholder:text-white/18 focus:outline-none focus:border-white/[0.18] transition-all" />
              </div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ animation: 'obSlideUp 0.45s 0.15s both', opacity: 0 }}
            className="rounded-[18px] border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
            <label className="mb-1.5 block text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/25">Headline</label>
            <input value={headline} onChange={e => setHeadline(e.target.value)}
              placeholder="e.g. Product Designer at Razorpay" className={INP} />
          </div>

          {/* Bio */}
          <div style={{ animation: 'obSlideUp 0.45s 0.18s both', opacity: 0 }}
            className="rounded-[18px] border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/25">Bio</label>
              <span className="text-[9.5px] text-white/20">{bio.length}/500</span>
            </div>
            <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 500))} rows={2}
              placeholder="A short bio about yourself…"
              className="w-full rounded-[12px] border border-white/[0.08] bg-white/[0.04] text-white px-3 py-2.5 text-[13px] placeholder:text-white/20 focus:outline-none focus:border-white/[0.22] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] resize-none transition-all duration-200" />
          </div>

          {/* Location + Website */}
          <div style={{ animation: 'obSlideUp 0.45s 0.21s both', opacity: 0 }}
            className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
              <label className="mb-1.5 block text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/25">Location</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/18" />
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Mumbai, IN" className={INP + ' pl-8 text-[12px]'} />
              </div>
            </div>
            <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
              <label className="mb-1.5 block text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/25">Website</label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/18" />
                <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="yoursite.com" className={INP + ' pl-8 text-[12px]'} />
              </div>
            </div>
          </div>

          {/* Open to work + CTA */}
          <div style={{ animation: 'obSlideUp 0.45s 0.24s both', opacity: 0 }} className="space-y-3">
            <button type="button" onClick={() => setOpenToWork(v => !v)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-[14px] border px-4 py-3 transition-all duration-200 ${openToWork ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-white/[0.07] bg-white/[0.025]'}`}>
              <div className={`h-5 w-10 shrink-0 rounded-full flex items-center px-0.5 transition-all duration-300 ${openToWork ? 'bg-emerald-500' : 'bg-white/[0.10]'}`}>
                <div className={`h-4 w-4 rounded-full shadow-lg transition-transform duration-300 ${openToWork ? 'translate-x-5 bg-white' : 'bg-white/38'}`} />
              </div>
              <div className="text-left">
                <p className={`text-[12px] font-semibold transition-colors ${openToWork ? 'text-emerald-400' : 'text-white/70'}`}>Open to work or opportunities</p>
                <p className="text-[10px] text-white/28">Visible to recruiters and collaborators</p>
              </div>
            </button>
            <button onClick={next} className={`h-10 sm:h-11 w-full ${WHITE_BTN}`} style={WHITE_BTN_SHADOW}>
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      );

      /* ── 7  SKILLS ── */
      case SKILLS_SCR: return (
        <div className="flex flex-col gap-3.5">

          {/* Heading */}
          <div style={{ animation: 'obSlideUp 0.45s 0.05s both', opacity: 0 }}>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#E8CC7A', animation: 'obPulse 2s infinite' }} />
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.26em] text-white/30">Step 4 of 5 — Skills</span>
            </div>
            <h2 className="text-[1.45rem] sm:text-[1.65rem] font-black tracking-[-0.04em] text-white leading-[1.1]">What are you good at?</h2>
            <p className="mt-1 text-[11.5px] text-white/35">Add skills — they power your search ranking and gig matches.</p>
          </div>

          {/* Skills card */}
          <div style={{ animation: 'obSlideUp 0.45s 0.10s both', opacity: 0 }}
            className="rounded-[18px] border border-white/[0.07] bg-white/[0.025] p-3.5 space-y-3">
            <div className="flex gap-2">
              <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                placeholder="e.g. React, Figma, Marketing…" className={INP.replace('w-full', 'flex-1')} />
              <button onClick={addSkill}
                className="h-10 sm:h-11 shrink-0 rounded-[12px] border border-white/[0.10] bg-white/[0.05] px-3.5 text-[12px] font-bold text-white/55 hover:bg-white/[0.09] hover:text-white/80 transition-all">
                Add
              </button>
            </div>

            {/* Added chips */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s, i) => (
                  <span key={s}
                    style={{ animation: `obScaleIn 0.25s ${i * 0.04}s both` }}
                    className="flex items-center gap-1.5 rounded-full border border-white/[0.15] bg-white/[0.07] px-3 py-1 text-[11.5px] font-semibold text-white/80">
                    {s}
                    <button onClick={() => setSkills(p => p.filter(x => x !== s))}
                      className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/[0.12] transition-all">
                      <X className="h-2.5 w-2.5 text-white/40 hover:text-white/70 transition-colors" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Skill counter */}
            {skills.length > 0 && (
              <p className="text-[9.5px] text-white/25">
                <span className="font-black text-white/50">{skills.length}</span> / 20 skills added
              </p>
            )}

            {/* Suggestions */}
            <div>
              <p className="mb-2 text-[8.5px] font-black uppercase tracking-[0.22em] text-white/22">Popular</p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SKILLS.filter(s => !skills.includes(s)).slice(0, 14).map(s => (
                  <button key={s}
                    onClick={() => { if (skills.length < 20) setSkills(p => [...p, s]); }}
                    className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[11px] font-medium text-white/30 hover:text-white/70 hover:border-white/[0.16] hover:bg-white/[0.06] transition-all">
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interests card */}
          <div style={{ animation: 'obSlideUp 0.45s 0.18s both', opacity: 0 }}
            className="rounded-[18px] border border-white/[0.07] bg-white/[0.025] p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-[9.5px] font-black uppercase tracking-[0.22em] text-white/30">Areas of interest</p>
              {interests.length > 0 && (
                <span className="rounded-full border border-white/[0.10] bg-white/[0.05] px-2 py-0.5 text-[9.5px] font-black text-white/50">
                  {interests.length} selected
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {INTEREST_CATEGORIES.map(cat => (
                <button key={cat}
                  onClick={() => setInterests(p => p.includes(cat) ? p.filter(x => x !== cat) : [...p, cat])}
                  className={`rounded-[10px] border px-3 py-1 text-[11.5px] font-semibold transition-all duration-150 ${
                    interests.includes(cat)
                      ? 'border-white/70 bg-white text-[#050508] shadow-[0_2px_12px_rgba(255,255,255,0.08)]'
                      : 'border-white/[0.07] bg-white/[0.025] text-white/38 hover:text-white/70 hover:border-white/[0.14] hover:bg-white/[0.05]'
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ animation: 'obSlideUp 0.45s 0.24s both', opacity: 0 }}>
            <button onClick={next} className={`h-10 sm:h-11 w-full ${WHITE_BTN}`} style={WHITE_BTN_SHADOW}
              disabled={skills.length === 0 && interests.length === 0}>
              {skills.length > 0 || interests.length > 0 ? 'Continue' : 'Skip for now'} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
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
          <div className="flex flex-col gap-4">

            {/* ── Welcome header ── */}
            <div style={{ animation: 'obSlideUp 0.45s both' }} className="text-center">
              {/* Animated check ring */}
              <div className="relative mx-auto mb-3 h-16 w-16">
                <div className="absolute -inset-3 rounded-full"
                  style={{ background: 'radial-gradient(circle,rgba(52,211,153,0.18) 0%,transparent 65%)', animation: 'obGlow 3s ease-in-out infinite' }} />
                <div className="absolute inset-0 flex items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/[0.07]">
                  <svg className="absolute inset-0 h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(52,211,153,0.12)" strokeWidth="1.5" />
                    <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(52,211,153,0.6)" strokeWidth="2" strokeLinecap="round"
                      strokeDasharray="182" strokeDashoffset="0"
                      style={{ animation: 'obCheckDraw 1.2s 0.2s cubic-bezier(.4,0,.2,1) both' }} />
                  </svg>
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" style={{ animation: 'obScaleIn 0.4s 1.0s both', opacity: 0 }} />
                </div>
              </div>
              <h2 className="text-[1.4rem] sm:text-[1.6rem] font-black tracking-[-0.04em] text-white leading-tight">
                {userName ? `You're in, ${userName.split(' ')[0]}!` : "You're all set!"}
              </h2>
              <p className="mt-1 text-[11.5px] text-white/38">Your profile is live. Time to stand out.</p>
            </div>

            {/* ── Docrud Go Premium Card ── */}
            <div style={{ animation: 'obSlideUp 0.45s 0.12s both', opacity: 0, background: 'linear-gradient(135deg,#C9A84C 0%,#F0D878 35%,#C9A84C 65%,#A07830 100%)' }}
              className="relative overflow-hidden rounded-[20px] p-[1.5px]">
              <div className="relative overflow-hidden rounded-[19px]" style={{ background: '#0e0b05' }}>

                {/* Ambient top glow */}
                <div className="pointer-events-none absolute inset-0"
                  style={{ background: 'radial-gradient(ellipse 100% 60% at 50% -5%,rgba(232,204,122,0.13) 0%,transparent 55%)' }} />

                {/* Shimmer line */}
                <div className="pointer-events-none absolute left-0 right-0 top-0 h-px"
                  style={{ background: 'linear-gradient(90deg,transparent 0%,rgba(240,216,120,0.6) 50%,transparent 100%)' }} />

                <div className="relative px-5 pt-5 pb-5">

                  {/* ── Top: offer label + scarcity ── */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: '#E8CC7A', animation: 'obPulse 2s infinite' }} />
                        <span className="text-[9px] font-black uppercase tracking-[0.32em]" style={{ color: '#C9A84C' }}>First Login Offer</span>
                      </div>
                      <h3 className="text-[1.35rem] font-black tracking-[-0.04em] text-white leading-tight">
                        Docrud Go <span style={{ color: '#E8CC7A' }}>✦</span>
                      </h3>
                      <p className="text-[10.5px] text-white/40 leading-snug">Unlock your verified professional identity.</p>
                    </div>

                    {/* Price block */}
                    <div className="shrink-0 text-right pt-0.5">
                      <div className="flex items-baseline justify-end gap-1 mb-0.5">
                        <span className="text-[10px] text-white/25 line-through">₹499</span>
                        <span className="text-[26px] font-black leading-none tracking-[-0.03em]" style={{ color: '#F0D878' }}>₹99</span>
                      </div>
                      <span className="text-[9px] text-white/28">one-time · no renewal</span>
                    </div>
                  </div>

                  {/* ── Scarcity bar — live data ── */}
                  <div className="mb-4 rounded-[10px] px-3 py-2.5"
                    style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.16)' }}>
                    {goStats === null ? (
                      /* Loading skeleton */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="h-2.5 w-20 rounded-full animate-pulse bg-white/[0.08]" />
                          <div className="h-2.5 w-14 rounded-full animate-pulse bg-white/[0.08]" />
                        </div>
                        <div className="h-1.5 w-full rounded-full animate-pulse bg-white/[0.06]" />
                        <div className="h-2 w-36 rounded-full animate-pulse bg-white/[0.05]" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9.5px] font-bold text-white/45">Spots claimed</span>
                          <span className="text-[9.5px] font-black" style={{ color: '#E8CC7A' }}>
                            {goStats.claimed.toLocaleString()} / {goStats.total.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${goStats.pct}%`, background: 'linear-gradient(90deg,#C9A84C,#F0D878)' }} />
                        </div>
                        <p className="mt-1.5 text-[9px] text-white/30">
                          Limited to first <span className="font-black text-white/50">{goStats.total.toLocaleString()} users</span> only
                          {goStats.remaining > 0
                            ? <> — <span style={{ color: '#E8CC7A' }}>{goStats.remaining.toLocaleString()} spots left.</span></>
                            : <span style={{ color: '#fb7185' }}> — offer closed.</span>
                          }
                        </p>
                      </>
                    )}
                  </div>

                  {/* ── Divider ── */}
                  <div className="mb-4 h-px" style={{ background: 'linear-gradient(90deg,rgba(201,168,76,0.18),rgba(201,168,76,0.04) 80%,transparent)' }} />

                  {/* ── 3 benefit pillars ── */}
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    {[
                      { icon: '🔍', title: 'More Visibility',  desc: '3× profile views & priority search' },
                      { icon: '⚡', title: 'Advanced Access',  desc: 'Premium gigs, AI tools & features'  },
                      { icon: '✦', title: 'Trusted Badge',    desc: 'Gold badge builds instant credibility' },
                    ].map(({ icon, title, desc }) => (
                      <div key={title} className="flex flex-col items-center gap-1.5 rounded-[11px] px-2 py-3"
                        style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.13)' }}>
                        <span className="text-[16px] leading-none">{icon}</span>
                        <p className="text-[9px] font-black text-white/78 leading-tight text-center">{title}</p>
                        <p className="text-[8px] text-white/32 leading-snug text-center">{desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* ── Social proof ── */}
                  <div className="mb-4 flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.055)' }}>
                    <div className="flex shrink-0 -space-x-1.5">
                      {[['K','#C9A84C'],['R','#7c3aed'],['A','#0ea5e9'],['S','#10b981']].map(([init, bg]) => (
                        <div key={init} className="flex h-5 w-5 items-center justify-center rounded-full border border-[#0e0b05] text-[7px] font-black text-white"
                          style={{ background: bg }}>
                          {init}
                        </div>
                      ))}
                    </div>
                    <p className="text-[9.5px] text-white/35 leading-tight">
                      <span className="font-bold text-white/58">2,800+ professionals</span> upgraded this month
                    </p>
                  </div>

                  {/* ── Error ── */}
                  {goError && (
                    <div className="mb-3 rounded-[9px] border border-rose-500/20 bg-rose-500/[0.07] px-3 py-2 text-[11px] text-rose-300/80">
                      {goError}
                    </div>
                  )}

                  {/* ── CTA ── */}
                  <button
                    onClick={() => void handleGoPayment()}
                    disabled={goPhase === 'paying'}
                    className="w-full flex items-center justify-center gap-2 rounded-[12px] h-11 font-black text-[13px] tracking-[-0.01em] transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#C9A84C 0%,#F0D878 48%,#C9A84C 100%)', color: '#1a1208', boxShadow: '0 4px 28px rgba(201,168,76,0.48), inset 0 1px 0 rgba(255,255,255,0.28)' }}>
                    {goPhase === 'paying'
                      ? <><div className="h-4 w-4 rounded-full border-2 border-[#1a1208]/30 border-t-[#1a1208] animate-spin" /> Processing…</>
                      : <>✦ Unlock Docrud Go — ₹99</>
                    }
                  </button>

                  {/* ── Sub-note ── */}
                  <p className="mt-2.5 text-center text-[9px] text-white/22">
                    Secure payment via Razorpay · Instant activation · No auto-renewal
                  </p>
                </div>
              </div>
            </div>

            {/* ── OR divider ── */}
            <div className="relative flex items-center gap-3" style={{ animation: 'obFadeIn 0.5s 0.22s both', opacity: 0 }}>
              <div className="flex-1 h-px bg-white/[0.07]" />
              <span className="text-[9.5px] font-black uppercase tracking-[0.28em] text-white/18">or</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            {/* ── Refer-a-friend earn-free CTA ── */}
            <button
              type="button"
              style={{ animation: 'obSlideUp 0.45s 0.26s both', opacity: 0, borderColor: 'rgba(201,168,76,0.16)', background: 'rgba(201,168,76,0.03)' }}
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
              className="group w-full flex items-center gap-3.5 rounded-[14px] border px-4 py-3.5 text-left transition-all hover:border-amber-500/25 hover:bg-amber-500/[0.04] active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] transition-transform group-hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#F0D878)', boxShadow: '0 4px 16px rgba(201,168,76,0.35)' }}>
                <svg className="h-5 w-5 text-[#1a1208]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-black text-white/82">Earn Docrud Go — FREE</p>
                <p className="text-[10.5px] text-white/32 leading-snug mt-0.5">Refer one friend who joins → your Go badge unlocks, no payment needed.</p>
              </div>
              <svg className="h-4 w-4 shrink-0 text-white/18 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </button>

            {/* Skip */}
            <button
              onClick={() => setGoPhase('skipped')}
              style={{ animation: 'obFadeIn 0.5s 0.35s both', opacity: 0 }}
              className="text-center text-[10.5px] text-white/18 hover:text-white/42 transition-colors">
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
      <SplashScreen visible={showSplash} onSkip={() => { setShowSplash(false); setScreen(SIGNUP_SCR); }} />
      <BgOrbs />

      {/* LEFT PANEL — desktop only */}
      <div className="relative hidden lg:flex lg:w-[52%] xl:w-[56%] shrink-0 flex-col overflow-hidden">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/[0.07] to-transparent" />
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 30% 50%,rgba(255,255,255,0.015) 0%,transparent 60%)' }} />
        <ScreenIn key={`left-${screen}`}>
          <LeftPanelSwitch screen={screen} headline={headline} bio={bio} sName={sName} sEmail={sEmail} avatarUrl={avatarUrl} bannerUrl={bannerUrl} location={location} openToWork={openToWork} skills={skills} />
        </ScreenIn>
      </div>

      {/* RIGHT PANEL — full screen on mobile, side panel on desktop */}
      <div className="relative flex h-[100dvh] w-full flex-col lg:w-[48%] xl:w-[44%]">

        {/* Always-mounted hidden file inputs — never unmount so refs stay valid */}
        <input ref={bannerFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleBannerFile} />
        <input ref={avatarFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarFile} />

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

        {/* Scrollable content area */}
        <div className="relative flex flex-col flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="pointer-events-none absolute inset-0 bg-[#050508]/15" />
          <div className="relative z-10 mx-auto w-full max-w-[380px] px-5 sm:px-7 py-6 my-auto">
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

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingPageContent />
    </Suspense>
  );
}
