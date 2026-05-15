'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  PostDetailContent,
  PollDetailContent,
  SurveyDetailContent,
  ChartDetailContent,
  ThreadDetailContent,
  VideoDetailContent,
  MilestoneDetailContent,
  TutorialDetailContent,
} from './PublishedCategoryPages';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Flag,
  Heart,
  Layers,
  Link2,
  Mail,
  Megaphone,
  MessageCircle,
  Newspaper,
  Package,
  Phone,
  Send,
  Share2,
  ShoppingBag,
  Terminal,
  ThumbsUp,
  Trash2,
  Twitter,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';

/* ─── types ─────────────────────────────────────────────────────── */
type PublishedItem = {
  id: string;
  shareId?: string;
  category: string;
  badge: string;
  title: string;
  byline: string;
  body: string;
  chips?: string[];
  stats?: { v: string; l: string }[];
  postedAt: string;
  featured?: boolean;
  isReal?: boolean;
  /* enriched fields for real items */
  dataUrl?: string;
  mimeType?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  likesCount?: number;
  likedByViewer?: boolean;
  canDelete?: boolean;
  uploadedByUserId?: string;
};

const TABS_MAP: Record<string, React.ElementType> = {
  news: Newspaper, article: BookOpen, document: FileText, portfolio: Layers,
  announcement: Megaphone, job: Briefcase, resume: User, product: Package,
  event: CalendarDays, hackathon: Terminal,
};

const TAG_CLS: Record<string, string> = {
  news:         'bg-red-500/10 text-red-400 border-red-500/20',
  article:      'bg-violet-500/10 text-violet-400 border-violet-500/20',
  document:     'bg-slate-500/10 text-slate-300 border-slate-500/20',
  portfolio:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  announcement: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  job:          'bg-blue-500/10 text-blue-400 border-blue-500/20',
  resume:       'bg-sky-500/10 text-sky-400 border-sky-500/20',
  product:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
  event:        'bg-pink-500/10 text-pink-400 border-pink-500/20',
  hackathon:    'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

/* ─── seed data ─────────────────────────────────────────────────── */
const SEED_LIKES: Record<string, number> = {
  n1:41, n2:18, n3:22, n4:34, n5:51, n6:89,
  a1:29, a2:17, a3:23, a4:31, a5:44, a6:38,
  d1:12, d2:8,  d3:5,  d4:19,
  p1:34, p2:21, p3:18, p4:26,
  an1:67, an2:38, an3:44,
  j1:28, j2:19, j3:24,
  r1:53, r2:31, r3:22,
  pr1:41, pr2:24, pr3:18,
  ev1:78, ev2:43, ev3:61, ev4:29, ev5:38, ev6:55,
  h1:92, h2:67, h3:45, h4:58, h5:39, h6:32,
};

type RawComment = {
  id: string; author: string; initials: string; color: string;
  text: string; timestamp: string; likes: number; parentId?: string;
};
type Comment = RawComment & { likedByMe: boolean; replies: Comment[] };

const MOCK_COMMENTS: Record<string, RawComment[]> = {
  n1: [
    { id:'c1', author:'Priya Sharma', initials:'PS', color:'bg-emerald-600', text:"This is a game-changer for rural India. Tier-3 connectivity has been a pain point for years. JioSpace could be the UPI moment for broadband.", timestamp:'2026-05-12T07:10:00Z', likes:24 },
    { id:'c2', author:'Rahul Nair', initials:'RN', color:'bg-blue-600', text:'ISRO partnership is the real headline here. Gives it massive legitimacy and fast-tracks spectrum approval.', timestamp:'2026-05-12T08:45:00Z', likes:18 },
    { id:'c3', author:'Ananya K.', initials:'AK', color:'bg-violet-600', text:"28 satellites for 1,200 districts — the maths feel aggressive. Let's see if they hit the Q2 deadline.", timestamp:'2026-05-12T09:30:00Z', likes:11 },
  ],
  a1: [
    { id:'c4', author:'Vikram Singh', initials:'VS', color:'bg-orange-600', text:'The India SaaS story is real. We closed a $2M ARR deal with a Fortune 500 last quarter — zero Silicon Valley comparison needed.', timestamp:'2026-05-12T06:30:00Z', likes:31 },
    { id:'c5', author:'Meera Iyer', initials:'MI', color:'bg-pink-600', text:"Mukherjea's framing is spot-on. Indian SaaS wins because we're solving for edge cases global incumbents ignore.", timestamp:'2026-05-12T07:55:00Z', likes:19 },
  ],
  ev1: [
    { id:'c6', author:'Siddharth J.', initials:'SJ', color:'bg-teal-600', text:'Went last year. Absolute fire. The workshops on RSC were worth the ticket price alone. Already booked for 2026.', timestamp:'2026-05-12T09:00:00Z', likes:42 },
    { id:'c7', author:'Kavya R.', initials:'KR', color:'bg-rose-600', text:"Can we get student discount info? ₹2,499 is a lot for undergrads. Last year there was a scholarship track.", timestamp:'2026-05-12T10:15:00Z', likes:28 },
    { id:'c8', author:'Arun Dev', initials:'AD', color:'bg-indigo-600', text:'Speaker lineup is insane this year. Hoping Guillermo Rauch makes it again.', timestamp:'2026-05-12T11:00:00Z', likes:15 },
  ],
  h1: [
    { id:'c9', author:'Rohan M.', initials:'RM', color:'bg-green-600', text:'Won HackIndia 2024 with our ABHA integration project. The mentorship network they provide post-win is exceptional. Apply!', timestamp:'2026-05-12T10:00:00Z', likes:67 },
    { id:'c10', author:'Divya T.', initials:'DT', color:'bg-amber-600', text:"The GenAI track last year had some of the most creative solutions I've seen. What are the expected themes for 2026?", timestamp:'2026-05-12T11:30:00Z', likes:34 },
  ],
};

/* ─── mock catalogue ────────────────────────────────────────────── */
const ALL_MOCK: PublishedItem[] = [
  { id:'n1', category:'news', badge:'Breaking', featured:true, title:'Reliance Jio Launches JioSpace Satellite Internet Across 1,200 Rural Districts', byline:'Economic Times · 5 min read · Just now', body:'JioSpace will deliver broadband connectivity to over 6 crore households in Tier-3 and rural areas by Q2 2025, powered by 28 low-orbit satellites in partnership with ISRO.\n\nThe rollout will begin with the 400 most underserved districts in Bihar, Uttar Pradesh, Madhya Pradesh, Rajasthan, and Odisha. Each satellite base station will cover a 120 km radius, providing speeds of up to 100 Mbps download and 20 Mbps upload.\n\nJio has partnered with local gram panchayats to install community Wi-Fi hotspots at schools, health centres, and panchayat offices as the first access points.\n\n"This is the last-mile solution India has waited 20 years for," said Mukesh Ambani at the launch event in New Delhi. "Every Indian child will have the same access to knowledge as a child in Mumbai or Bengaluru."\n\nThe service is expected to be priced at ₹399/month for unlimited access, with a government subsidy for BPL households bringing it down to ₹99/month.', stats:[{v:'41.2k',l:'reads'},{v:'8.7k',l:'shares'},{v:'2,340',l:'comments'}], postedAt:'2026-05-12T06:00:00Z' },
  { id:'n2', category:'news', badge:'Markets', title:"SEBI Approves India's First Domestic ETF for Listed AI Companies", byline:'Mint · 3 min read · 2 hrs ago', body:"The Securities & Exchange Board of India has greenlit a first-of-its-kind domestic ETF tracking 28 publicly listed AI and deeptech firms.\n\nThe ETF, to be managed by Nippon India Mutual Fund, will track a custom index comprising companies with at least 30% of revenue attributable to AI-driven products or services. The index will be rebalanced quarterly.", stats:[{v:'18.4k',l:'reads'},{v:'3.1k',l:'shares'}], postedAt:'2026-05-12T04:00:00Z' },
  { id:'n3', category:'news', badge:'M&A', title:'Tata Group Acquires Singapore Fintech for ₹2,400 Crore', byline:'Business Standard · 4 min read · 5 hrs ago', body:"Tata Capital has completed the acquisition of Singapore-headquartered PaySprint, expanding its Southeast Asia footprint in embedded finance.\n\nThe deal, valued at approximately $290 million, gives Tata Capital access to PaySprint's payment infrastructure serving 1,400 merchants across Singapore, Malaysia, and Indonesia.", stats:[{v:'22.1k',l:'reads'},{v:'5.6k',l:'shares'}], postedAt:'2026-05-12T01:00:00Z' },
  { id:'n4', category:'news', badge:'Policy', title:'RBI Issues New Framework for Real-Time Cross-Border UPI Payments', byline:'LiveMint · 6 min read · 1 day ago', body:'The Reserve Bank of India has released comprehensive guidelines for interoperable UPI-based cross-border transfers covering 14 countries including UAE, UK, USA, Singapore, France, and Australia.\n\nKey provisions include: real-time settlement for amounts up to ₹2 lakh per transaction, 24/7 availability, and fees capped at 0.5% of the transaction value.', stats:[{v:'34.7k',l:'reads'},{v:'9.2k',l:'shares'}], postedAt:'2026-05-11T10:00:00Z' },
  { id:'a1', category:'article', badge:'Editorial', featured:true, title:'How Bengaluru Startups Are Quietly Rewriting Global SaaS Playbooks', byline:'Saurabh Mukherjea · Marcellus Investment · 14 min read', body:"India's SaaS founders aren't copying Silicon Valley anymore — they're building products that global enterprises actually prefer. 18 Indian B2B SaaS companies crossed $100M ARR in 2024 alone.\n\nThe shift happened quietly. Somewhere around 2021, Indian SaaS founders stopped trying to reverse-engineer what worked in the Valley and started building from first principles — for problems they actually understood.\n\nFreshworks won because it understood what support teams actually needed at 2 AM. Chargebee won because it understood the billing complexity of multi-currency, multi-entity SaaS businesses that Valley tools ignored. Postman won because it understood what API developers actually needed day-to-day.\n\nNone of these wins came from cheaper labour. They came from sharper product intuition built by founders who'd lived the problem.\n\nThe numbers bear this out: Indian SaaS companies now have an average NRR of 118% vs the Valley benchmark of 112%. Our CAC payback periods are 14 months vs 20 months for US-founded peers at the same ACV.\n\nThe next wave is being built right now in Bengaluru, Hyderabad, and Pune — and it will be even harder to ignore.", stats:[{v:'29.6k',l:'reads'},{v:'6.1k',l:'saves'},{v:'11.4k',l:'shares'}], postedAt:'2026-05-12T05:00:00Z' },
  { id:'d1', category:'document', badge:'Official', featured:true, title:'DPDP Act 2023 — Enterprise Compliance Handbook, 2nd Edition', byline:'64 pages · 4.1 MB · PDF · Updated today', body:'Comprehensive guide covering Data Principal rights, Data Fiduciary obligations, consent frameworks, breach notification timelines, and cross-border transfer rules under the Digital Personal Data Protection Act 2023.\n\nThis edition includes updates for the 2024 amendment rules and the Digital Personal Data Protection Rules 2025 (draft).', stats:[{v:'64',l:'pages'},{v:'4.1 MB',l:'size'},{v:'318',l:'downloads'}], postedAt:'2026-05-12T07:00:00Z' },
  { id:'d2', category:'document', badge:'Tax', title:'GST Annual Return Filing Guide FY 2024–25', byline:'38 pages · PDF · Updated yesterday', body:'Step-by-step GSTR-9 and GSTR-9C filing guide with screenshots, reconciliation templates, and common error fixes for CA firms and in-house finance teams.', stats:[{v:'38',l:'pages'},{v:'1.8 MB',l:'size'},{v:'541',l:'downloads'}], postedAt:'2026-05-11T06:00:00Z' },
  { id:'p1', category:'portfolio', badge:'Case Study', featured:true, title:"Reimagining IRCTC's Next Billion User Journey", byline:'Client: Ministry of Railways · UX Design · 2024', body:"Complete UX overhaul of India's busiest consumer platform — 8.5 lakh daily bookings. Reduced drop-off 52%, cut avg. booking time to 38 seconds.\n\nThe project began with 3 months of field research across 12 cities, interviewing 400+ regular rail travellers. Key insight: 67% of failed bookings happened at the seat selection step due to confusing map orientation.\n\nWe rebuilt the seat map from scratch using a top-down perspective with clear coach labels, and introduced a Quick Book mode that auto-selects the best available seat based on user preferences.", chips:['Figma','Design System','Hindi/Regional UI','A11y Research'], postedAt:'2026-05-12T04:00:00Z' },
  { id:'an1', category:'announcement', badge:'HIGH PRIORITY', featured:true, title:'Docrud Now Available in Hindi, Tamil, Telugu & 9 More Indian Languages', byline:'Product Team · Sent to 12,400 workspace members · 2 hrs ago', body:'Full UI localisation across 12 Indian languages is now live — including right-to-left support for Urdu. Switch from Settings › Workspace › Language.\n\nSupported languages: Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Odia, Assamese, Urdu.\n\nAll AI generation features including document drafting, contract review, and form builder now work natively in these languages — no translation layer required.', stats:[{v:'12.4k',l:'reached'},{v:'91%',l:'opened'},{v:'7 days',l:'active'}], postedAt:'2026-05-12T04:00:00Z' },
  { id:'j1', category:'job', badge:'Hybrid · Full-time', featured:true, title:'Senior Product Designer — Design Systems', byline:'Razorpay · Design · Bengaluru', body:"Own the design language across Razorpay's merchant dashboard and payment flows — used by 10M+ businesses across India.\n\nYou'll lead the design systems team, maintain the Razorpay Design System (RDS), and work closely with engineering leads to ship production-ready components.", chips:['₹35–55 LPA','ESOP','Design Systems','Figma','Remote Fridays'], postedAt:'2026-05-12T06:00:00Z' },
  { id:'r1', category:'resume', badge:'✦ Open to Work', featured:true, title:'Ananya Krishnan', byline:'Senior Product Designer · 9 yrs · Bengaluru, KA', body:"Decade of designing products for 100M+ Indians — CRED credit interface, Swiggy reorder flow. Believes great design solves for the person who never reads instructions.\n\nPrevious roles: Lead Designer at CRED (2021–2024), Senior Designer at Swiggy (2019–2021), UX Designer at Flipkart (2016–2019).", chips:['Figma','Design Systems','Bharat UX','User Research','Hindi UI'], postedAt:'2026-05-12T05:00:00Z' },
  { id:'pr1', category:'product', badge:'Most Popular', featured:true, title:'DocOps Pro Suite', byline:'₹3,999 / workspace / month · Annual billing · GST inclusive', body:"India's most complete document operations layer — unlimited templates, AI generation in 12 languages, Aadhaar eSign, GST invoicing, audit logs, and branded client portals.\n\nIncludes: AI document generation in Hindi, Tamil, Telugu + 9 more; Aadhaar eSign (IT Act 2000 Schedule II compliant); GSTIN validation + UPI QR invoice generation; DPDP-compliant audit trails.", chips:['Unlimited templates','AI (Hindi + English)','Aadhaar eSign','GST invoicing','DPDP compliant'], postedAt:'2026-05-12T07:00:00Z' },
  { id:'ev1', category:'event', badge:'Conference', featured:true, title:'React India 2026 — The Largest React Conference in Asia', byline:'React India · NSCI Dome, Mumbai · Sep 19–21, 2026', body:"3-day immersive React conference with 80+ speakers, 3,000 attendees, workshops on Next.js, RSC, and React Native. Featuring talks from Meta, Vercel, and top Indian product teams.\n\nDay 1 — Fundamentals & Architecture: React Server Components deep-dive, state management in 2026, accessibility at scale.\nDay 2 — Advanced Patterns: Performance, animations, React Native new architecture, AI in the browser.\nDay 3 — Workshops: Full-day hands-on workshops with limited seats (25 per session).\n\nEarly bird tickets at ₹2,499 available until June 30.", chips:['React','Next.js','TypeScript','₹2,499 early bird','In-person'], postedAt:'2026-05-12T08:00:00Z' },
  { id:'ev2', category:'event', badge:'Meetup', title:'Bengaluru AI/ML Monthly — May Edition', byline:'GDG Bengaluru · IKEA Experience Centre · May 25, 2026', body:'Monthly gathering of AI/ML engineers and researchers in Bengaluru. This month: LLM fine-tuning on Indic datasets, live demos, and networking dinner.', chips:['AI/ML','LLMs','Free entry','Bengaluru'], postedAt:'2026-05-11T09:00:00Z' },
  { id:'ev3', category:'event', badge:'Summit', title:'India SaaS Summit 2026 — Building Global from Bharat', byline:'SaaSBOOMi · ITC Grand Chola, Chennai · Jul 11–12, 2026', body:"India's premier SaaS gathering — 1,200 founders, 150 investors, 60 workshops.", chips:['SaaS','Founders','₹8,999','Chennai','Networking'], postedAt:'2026-05-10T07:00:00Z' },
  { id:'h1', category:'hackathon', badge:'₹50L Prize', featured:true, title:'HackIndia 2026 — Build AI for the Next Billion', byline:'HackIndia Foundation · Pan-India · Online + Finals in Delhi · Jun 14–16, 2026', body:"India's largest student hackathon — 50,000 registrations, ₹50 lakh prize pool, tracks in AI/ML, FinTech, HealthTech, and GovTech. Winning teams get 6-month startup accelerator access.\n\nTracks:\n• AI & Machine Learning — Build intelligent products for Bharat\n• FinTech — Payments, lending, insurance, and wealth\n• HealthTech — Rural diagnostics, ABHA, teleconsult\n• GovTech — Citizen services, compliance, and public data\n\nRegistration open until May 31, 2026.", chips:['AI/ML','₹50L Prize','Students','48 hrs','Devfolio'], postedAt:'2026-05-12T09:00:00Z' },
  { id:'h2', category:'hackathon', badge:'₹10L Prize', title:'Smart India Hackathon 2026', byline:'Ministry of Education · IITs & NITs · Aug 22–23, 2026', body:'Official GoI hackathon with 1,000+ problem statements from 50+ central ministries.', chips:['GovTech','₹1L/team','Students','IIT/NIT'], postedAt:'2026-05-11T08:00:00Z' },
  { id:'h3', category:'hackathon', badge:'$10k Prize', title:'Devfolio Build for Bharat — Web3 Edition', byline:'Devfolio + Polygon · Online · Jun 28 – Jul 6, 2026', body:'10-day async hackathon focused on DeFi, NFT utility, and blockchain for public services.', chips:['Web3','DeFi','$10k','Polygon'], postedAt:'2026-05-10T10:00:00Z' },
  /* Post */
  { id:'po1', category:'post', badge:'Photo', featured:true, title:'Shipped our new dashboard — 6 months of work in one release 🚀', byline:'Kushagra Sharma · Docrud · Just now', body:'Every pixel debated, every API endpoint stress-tested. This is what building in public looks like. The new workspace is live for all users.\n\nSix months of late nights, design debates, and hundreds of user sessions distilled into one release. Thank you to everyone who gave feedback during beta.\n\nThe new workspace is faster, cleaner, and built to scale. Go explore it.', stats:[{v:'2.4k',l:'likes'},{v:'312',l:'comments'},{v:'89',l:'shares'}], chips:['product','launch','buildinpublic'], postedAt:'2026-05-12T08:30:00Z' },
  { id:'po2', category:'post', badge:'Team', title:"Team offsite in Coorg — sometimes you need to step away from the IDE 🌿", byline:'Priya Ramesh · Designer · 2h ago', body:"3 days, 12 engineers, zero laptops (almost). Came back with more ideas than we left with.\n\nThe best product decisions happen away from Slack. Highly recommend forcing your team offline once a quarter.", stats:[{v:'1.8k',l:'likes'},{v:'204',l:'comments'}], chips:['team','offsite','culture'], postedAt:'2026-05-12T06:00:00Z' },
  { id:'po3', category:'post', badge:'Milestone', title:'1 million documents generated on Docrud 🎉', byline:'Docrud Team · 1d ago', body:"We didn't plan a party. We just checked the counter, screamed a little, and got back to building. Thank you.\n\n1,000,000 documents. From invoices to contracts to resumes to certificates — all created by real people solving real problems.\n\nHere's to the next million.", stats:[{v:'14.2k',l:'likes'},{v:'1.3k',l:'comments'},{v:'5.2k',l:'shares'}], chips:['milestone','docrud','product'], postedAt:'2026-05-11T10:00:00Z' },
  /* Poll */
  { id:'pl1', category:'poll', badge:'Active', featured:true, title:'What is your primary programming language in 2026?', byline:'Developer Community · 4,230 votes · Ends in 3 days', body:'TypeScript has been climbing — but Go is making serious moves in backend. Cast your vote and see where the community stands.', chips:['TypeScript · 38%','Python · 27%','Go · 21%','Rust · 14%'], stats:[{v:'4.2k',l:'votes'},{v:'3',l:'days left'},{v:'38%',l:'TypeScript leading'}], postedAt:'2026-05-12T07:00:00Z' },
  { id:'pl2', category:'poll', badge:'Closed', title:'Should Indian startups prioritise profitability over growth in 2026?', byline:'Startup Community · 11,840 votes · Closed', body:'The funding winter changed the narrative. What does the community think?', chips:['Yes, profit first · 61%','No, grow fast · 39%'], stats:[{v:'11.8k',l:'votes'},{v:'Closed',l:'status'}], postedAt:'2026-05-09T09:00:00Z' },
  { id:'pl3', category:'poll', badge:'Active', title:'Best city for a software engineer to live and work in India?', byline:'Tech Community · 7,650 votes · Ends tomorrow', body:'Cost of living, opportunities, quality of life — which city wins for tech folks?', chips:['Bengaluru · 44%','Pune · 22%','Hyderabad · 19%','Remote · 15%'], stats:[{v:'7.6k',l:'votes'},{v:'1',l:'day left'}], postedAt:'2026-05-11T06:00:00Z' },
  /* Survey */
  { id:'sv1', category:'survey', badge:'Open', featured:true, title:'India Developer Experience Survey 2026', byline:'JetBrains × Docrud · 5 min · 2,140 responses', body:'Annual survey on tools, workflows, salaries, and team dynamics across the Indian developer ecosystem. Results published in June.\n\nAll responses are anonymous. No email required. Takes under 5 minutes.', chips:['5 min','Anonymous','Tools','Salary','Work culture'], stats:[{v:'2.1k',l:'responses'},{v:'5',l:'questions'},{v:'Open',l:'status'}], postedAt:'2026-05-12T06:00:00Z' },
  { id:'sv2', category:'survey', badge:'Open', title:'Startup Founder Mental Health Check-In — Q2 2026', byline:'iSPIRT Foundation · 3 min · 890 responses', body:'Quarterly pulse check for startup founders. Anonymous. Results go back to the community with no attribution.\n\nIf you are a founder, co-founder, or solo operator — this is for you.', chips:['3 min','Anonymous','Founders','Mental health'], stats:[{v:'890',l:'responses'},{v:'8',l:'questions'}], postedAt:'2026-05-10T08:00:00Z' },
  /* Chart */
  { id:'ch1', category:'chart', badge:'Market Data', featured:true, title:'India SaaS ARR Growth by Vertical — 2023 to 2026', byline:'SaaSBOOMi Research · Published today', body:'FinTech SaaS grew 3.4× while HR-tech and EdTech saw consolidation. B2B infrastructure quietly became the biggest segment.\n\nData sourced from 340 Indian SaaS companies with $1M+ ARR. Figures represent median growth rates within each vertical.', chips:['FinTech +240%','HR-tech +45%','LegalTech +180%','EdTech +12%'], stats:[{v:'6',l:'verticals'},{v:'3yr',l:'data range'},{v:'340%',l:'top growth'}], postedAt:'2026-05-12T05:00:00Z' },
  { id:'ch2', category:'chart', badge:'Hiring Trends', title:'Tech Hiring Recovery Index — Jan to May 2026', byline:'LinkedIn India · Published 2 days ago', body:'After 18 months of contraction, tech hiring has rebounded 68% YoY. AI/ML and cloud roles leading recovery.\n\nData from 12,000+ tech job postings across India. Indexed to Jan 2024 = 100.', chips:['AI/ML +210%','Cloud +95%','Frontend +55%','QA +12%'], stats:[{v:'+68%',l:'YoY recovery'},{v:'5',l:'months tracked'}], postedAt:'2026-05-10T07:00:00Z' },
  /* Thread */
  { id:'th1', category:'thread', badge:'🧵 Thread', featured:true, title:"Why I stopped using Redux in 2026 — and what I use instead (7-part thread)", byline:'Arjun Nair · Frontend Architect · 15 min read', body:"1/ Redux was the answer to a problem we no longer have. In 2026, with React Server Components, Zustand, and TanStack Query, you almost never need it.\n\n2/ Let me show you the 4 patterns I use instead — each solving a specific data problem cleanly.\n\n3/ Pattern 1: TanStack Query for all server state. Cache, refetch, optimistic updates — all handled. No more loading/error booleans in Redux.\n\n4/ Pattern 2: Zustand for shared UI state. One line of code, zero boilerplate. Works with React DevTools out of the box.\n\n5/ Pattern 3: React Context for truly global, low-frequency state (theme, auth, locale). People underuse this.\n\n6/ Pattern 4: URL state for things users should be able to bookmark. Filter state in search params, not in a store.\n\n7/ The result: 60% less code, faster onboarding for new engineers, and zero 'action → reducer → selector' debugging hell.", stats:[{v:'18.4k',l:'reads'},{v:'3.2k',l:'likes'},{v:'7',l:'parts'}], chips:['React','Redux','Zustand','Architecture','Thread'], postedAt:'2026-05-12T08:00:00Z' },
  { id:'th2', category:'thread', badge:'🧵 Thread', title:'How I went from ₹4 LPA to ₹42 LPA in 4 years — without a CS degree (12-part thread)', byline:'Vikram Soni · Self-taught Engineer · 22 min read', body:"1/ In 2022, I was making ₹4 LPA doing manual QA at a Pune startup. Today I'm a senior engineer at a Series-B.\n\n2/ This is the exact roadmap I followed — no fluff, no courses to sell.\n\n3/ Year 1: I learned JavaScript seriously. Not tutorials — I built things. A budget tracker, a weather app, a clone of every product I used daily.\n\n4/ Year 2: I got my first dev job at ₹8 LPA. I was underpaid and I knew it. I used it as a learning platform, not a career destination.\n\n5/ Year 3: I specialised in React and Node. I started writing publicly — tweets, blog posts, LinkedIn. The compound effect of building in public is real.", stats:[{v:'94.2k',l:'reads'},{v:'22.1k',l:'likes'},{v:'12',l:'parts'}], chips:['Career','SelfTaught','Salary','Thread'], postedAt:'2026-05-11T07:00:00Z' },
  { id:'th3', category:'thread', badge:'🧵 Thread', title:"India's most underrated cities for remote tech workers — a ranked breakdown", byline:'Meera Iyer · Tech Writer · 10 min read', body:"1/ Everyone talks about Bengaluru, Pune, and Hyderabad. But there are 6 cities that offer better quality of life, lower cost, and a growing community.\n\n2/ #6 Indore — Clean, cheap, growing IT scene. Tier-2 salaries with Tier-1 quality of life. ₹25k/month covers a great life here.\n\n3/ #5 Jaipur — 3-hour drive from Delhi, beautiful old city, WeWork and co-working spaces now present. Strong design and agency community.\n\n4/ #4 Kochi — The hidden gem. Startup Village has been around since 2012. Sea breeze, low traffic, excellent food.", stats:[{v:'41.3k',l:'reads'},{v:'9.8k',l:'likes'},{v:'8',l:'parts'}], chips:['Remote Work','Cities','India','Thread'], postedAt:'2026-05-10T09:00:00Z' },
  /* Video */
  { id:'vi1', category:'video', badge:'Tutorial', featured:true, title:'Build a Full-Stack SaaS with Next.js 15, Supabase & Stripe in 4 Hours', byline:'Hrishikesh Kale · YouTube · 4h 12m · 340k views', body:'Complete walkthrough: auth, database, payments, email, deployment. All free-tier. No paid courses.\n\nChapters: 0:00 Project setup · 18:30 Supabase auth · 52:00 Database schema · 1:20:00 Stripe integration · 2:10:00 Email with Resend · 3:00:00 Deployment to Vercel', chips:['Next.js 15','Supabase','Stripe','Full-stack','Free'], stats:[{v:'340k',l:'views'},{v:'28k',l:'likes'},{v:'4h 12m',l:'duration'}], postedAt:'2026-05-12T06:00:00Z' },
  { id:'vi2', category:'video', badge:'Talk', title:'Scaling to 10M users on ₹0 infrastructure cost — IndiaFOSS 2026 Keynote', byline:'Tanmay Bakshi · IndiaFOSS · YouTube · 52m · 180k views', body:'How we used Cloudflare Workers, Turso, and edge caching to serve 10M users without a single EC2 instance.\n\nFull talk from IndiaFOSS 2026 in Bengaluru. Covers architecture decisions, trade-offs, and lessons learned.', chips:['CloudFlare','Edge','FOSS','Architecture'], stats:[{v:'180k',l:'views'},{v:'12k',l:'likes'},{v:'52 min',l:'duration'}], postedAt:'2026-05-11T08:00:00Z' },
  { id:'vi3', category:'video', badge:'Demo', title:'Docrud AI Document Generator — Full Product Demo', byline:'Docrud Team · Product Demo · 18m · 42k views', body:'Full walkthrough of the AI-powered document generator, template editor, eSign, and workspace sharing.\n\nSee how teams use Docrud to generate, sign, and share documents in minutes instead of hours.', chips:['Docrud','Product Demo','AI','Documents'], stats:[{v:'42k',l:'views'},{v:'3.4k',l:'likes'},{v:'18 min',l:'duration'}], postedAt:'2026-05-10T10:00:00Z' },
  /* Milestone */
  { id:'mi1', category:'milestone', badge:'🏆 Achievement', featured:true, title:"We just crossed ₹1 Crore ARR — bootstrapped, profitable, and building from Jaipur 🎉", byline:'Tanmay Sharma · Founder, FinSight · Just now', body:"18 months ago I quit my Deloitte job and started FinSight in a co-working space in Jaipur. Today we crossed ₹1 Crore ARR.\n\nNo VC money. No fancy office. Just 4 engineers and a real problem.\n\nWe serve 340 SMBs who couldn't afford enterprise accounting software. We charge ₹2,999/month. We have 0% churn in the last 6 months.\n\nBuilding from Tier-2 India is a superpower. Lower burn, better engineers, and customers who actually need what you're building.", stats:[{v:'₹1Cr',l:'ARR hit'},{v:'18',l:'months'},{v:'4',l:'team size'}], chips:['Bootstrapped','SaaS','Jaipur','Profitable'], postedAt:'2026-05-12T09:00:00Z' },
  { id:'mi2', category:'milestone', badge:'Career', title:"Promoted to Principal Engineer at 27 — here's what actually helped", byline:'Divya Menon · Principal Engineer, Swiggy · 1d ago', body:"5 years ago I joined Swiggy as a junior. Yesterday I got promoted to Principal Engineer — the youngest in the company's history.\n\nWhat actually helped: writing design docs obsessively, mentoring 3 engineers every quarter, and saying yes to the unsexy infrastructure work nobody wanted.", stats:[{v:'5',l:'years at Swiggy'},{v:'27',l:'years old'},{v:'4',l:'promotions'}], chips:['Career','Engineering','Swiggy','Milestone'], postedAt:'2026-05-11T08:00:00Z' },
  { id:'mi3', category:'milestone', badge:'Community', title:"GDG India hits 500,000 active members across 48 cities", byline:'GDG India · Community Milestone · 3d ago', body:"From a small meetup in Bengaluru in 2009, Google Developer Groups India now spans 48 cities and 500k members.\n\nEvery workshop, hackathon, and DevFest brought us here. Thank you to 2,000+ volunteer organizers who gave their weekends to grow this community.", stats:[{v:'500k',l:'members'},{v:'48',l:'cities'},{v:'17',l:'years active'}], chips:['GDG','Community','Google','India'], postedAt:'2026-05-09T07:00:00Z' },
  /* Tutorial */
  { id:'tu1', category:'tutorial', badge:'Beginner', featured:true, title:'Build Your First REST API with Go and Gin — Complete Guide for Beginners', byline:'Nikhil Sharma · 12 min read · 8 steps · 34k reads', body:"Go is fast, simple, and perfect for APIs. This guide walks you from zero to a fully working REST API with auth, database, and deployment.\n\nStep 1: Install Go and set up your project. Run `go mod init your-api` to create a module.\n\nStep 2: Install Gin — the fastest HTTP router in Go. `go get github.com/gin-gonic/gin`\n\nStep 3: Create your first route handler. A handler in Gin is just a function that takes a `*gin.Context`.\n\nStep 4: Connect to PostgreSQL using `database/sql` and the `pgx` driver.\n\nStep 5: Add middleware for logging and CORS. Gin makes this trivial with `router.Use()`.\n\nStep 6: Implement JWT authentication. Store the secret in an environment variable, never in code.\n\nStep 7: Write integration tests using `net/http/httptest`. Test every endpoint before deploying.\n\nStep 8: Deploy to Fly.io in 3 commands. `fly launch`, `fly secrets set`, `fly deploy`.", chips:['Go','REST API','Gin','PostgreSQL','8 steps'], stats:[{v:'34k',l:'reads'},{v:'2.8k',l:'bookmarks'},{v:'8',l:'steps'}], postedAt:'2026-05-12T07:00:00Z' },
  { id:'tu2', category:'tutorial', badge:'Intermediate', title:'Mastering Tailwind CSS v4 — The Complete Migration and New Features Guide', byline:'Anjali Singh · 18 min read · 12 steps · 51k reads', body:"Tailwind v4 introduces a brand new engine, cascade layers, and CSS-first config. This guide covers everything you need to upgrade.\n\nStep 1: Understand what changed — v4 uses a new Rust-based engine (Oxide) that's 10× faster.\n\nStep 2: Install v4 with `npm install tailwindcss@next @tailwindcss/vite`.\n\nStep 3: Replace your `tailwind.config.js` with a CSS-first configuration in your main stylesheet.\n\nStep 4: Migrate custom utilities to the new `@utility` API.\n\nStep 5: Update arbitrary values — the syntax for some edge cases has changed.", chips:['Tailwind CSS','v4','CSS','Migration','12 steps'], stats:[{v:'51k',l:'reads'},{v:'7.2k',l:'bookmarks'},{v:'12',l:'steps'}], postedAt:'2026-05-11T09:00:00Z' },
  { id:'tu3', category:'tutorial', badge:'Advanced', title:'Implementing DPDP-Compliant Consent Management in a SaaS App — From Scratch', byline:'Rahul Gupta · Legal Engineer · 24 min read · 6 steps · 18k reads', body:"Walk through building a DPDP Act-compliant consent management module: consent capture, withdrawal, audit logs, and breach notification hooks.\n\nStep 1: Understand what DPDP requires — explicit, informed, specific consent for each purpose of data processing.\n\nStep 2: Design your consent data model. Store purpose, timestamp, IP, user agent, and version of the privacy notice shown.\n\nStep 3: Build the consent capture UI — a modal that blocks use until consent is given for required purposes.\n\nStep 4: Implement consent withdrawal — a user-accessible settings page that triggers data deletion workflows.\n\nStep 5: Build the audit log — every consent event must be immutably recorded for regulatory inspection.\n\nStep 6: Wire breach notification hooks — if a breach occurs, your system must be able to identify all affected data principals within 72 hours.", chips:['DPDP','Privacy','Compliance','Node.js','6 steps'], stats:[{v:'18k',l:'reads'},{v:'4.1k',l:'bookmarks'},{v:'6',l:'steps'}], postedAt:'2026-05-10T08:00:00Z' },
  { id:'tu4', category:'tutorial', badge:'Intermediate', title:'Deploy Next.js 15 to Fly.io with Zero Downtime — Detailed Walkthrough', byline:'Siddharth Joshi · DevOps Guide · 15 min read · 9 steps', body:"Fly.io is the best alternative to Vercel for self-hosted Next.js. This guide covers Docker, health checks, secrets, and blue-green deployments.\n\nStep 1: Install the Fly CLI — `brew install flyctl` on Mac.\n\nStep 2: Create a `Dockerfile` optimised for Next.js — multi-stage build, standalone output mode.\n\nStep 3: Run `fly launch` — it detects Next.js and scaffolds the config automatically.\n\nStep 4: Set environment secrets with `fly secrets set DATABASE_URL=...`.\n\nStep 5: Configure health checks in `fly.toml` so Fly knows when your app is ready.\n\nStep 6: Enable auto-scaling with `min_machines_running = 1` to avoid cold starts.\n\nStep 7: Set up a Postgres database with `fly postgres create`.\n\nStep 8: Configure zero-downtime deploys using rolling updates in `fly.toml`.\n\nStep 9: Set up GitHub Actions for CI/CD — deploy on every push to main.", chips:['Next.js','Fly.io','Docker','DevOps','9 steps'], stats:[{v:'27k',l:'reads'},{v:'5.6k',l:'bookmarks'},{v:'9',l:'steps'}], postedAt:'2026-05-09T10:00:00Z' },
];

/* ─── structured body parser ────────────────────────────────────── */
const META_RE = /^([A-Za-z][A-Za-z\s\/()]{1,28}):\s+(.+)$/;

function parseBody(raw: string): { meta: { key: string; value: string }[]; prose: string[] } {
  const meta: { key: string; value: string }[] = [];
  const prose: string[] = [];
  const blocks = raw.split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    const allMeta = lines.length > 0 && lines.every(l => META_RE.test(l.trim()));
    if (allMeta) {
      for (const l of lines) {
        const m = l.trim().match(META_RE);
        if (m) meta.push({ key: m[1].trim(), value: m[2].trim() });
      }
    } else {
      const cleaned = lines.filter(l => !META_RE.test(l.trim())).join('\n');
      if (cleaned.trim()) prose.push(cleaned.trim());
    }
  }
  return { meta, prose };
}

function getBodySnippet(raw: string): string {
  const { prose } = parseBody(raw);
  return prose.join(' ').slice(0, 220).trim();
}

function isUrl(s: string) {
  try { return /^https?:\/\//.test(s); } catch { return false; }
}

function MetaValueNode({ value }: { value: string }) {
  if (isUrl(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer"
        className="break-all text-sky-400 underline underline-offset-2 hover:text-sky-300 transition-colors">
        {value}
      </a>
    );
  }
  return <span className="text-white/80">{value}</span>;
}

function BodyRenderer({ body, category }: { body: string; category: string }) {
  const { meta, prose } = parseBody(body);
  const CAT_ACCENT: Record<string, string> = {
    news: 'text-red-400', article: 'text-violet-400', document: 'text-slate-300',
    portfolio: 'text-emerald-400', announcement: 'text-amber-400', job: 'text-blue-400',
    resume: 'text-sky-400', product: 'text-purple-400', event: 'text-pink-400',
    hackathon: 'text-orange-400', gig: 'text-white/60',
  };
  const accent = CAT_ACCENT[category] ?? 'text-amber-400';

  return (
    <div className="space-y-6">
      {/* metadata block */}
      {meta.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
          <div className="grid divide-y divide-white/[0.06]">
            {meta.map(({ key, value }) => (
              <div key={key} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 sm:px-5">
                <span className={`shrink-0 w-32 text-[11px] font-bold uppercase tracking-[0.09em] ${accent}`}>
                  {key}
                </span>
                <span className="text-[14px] leading-snug">
                  <MetaValueNode value={value} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* prose paragraphs */}
      {prose.map((para, i) => (
        <p key={i} className="text-[15px] leading-[1.85] text-white/72 whitespace-pre-line">{para}</p>
      ))}
    </div>
  );
}

/* ─── Category CTA sub-components ──────────────────────────────── */
function EventRegisterCTA({ itemId, itemTitle, itemCategory, body }: { itemId: string; itemTitle: string; itemCategory: string; body: string }) {
  const regUrl = body?.match(/^Registration URL:\s*(.+)$/im)?.[1]?.trim() || '';
  const [attending, setAttending] = useState(0);
  const [hasRegistered, setHasRegistered] = useState(false);

  useEffect(() => {
    try { setAttending(Number(localStorage.getItem(`attending_${itemId}`) || '0')); } catch {}
    try {
      const r = JSON.parse(localStorage.getItem('pub_registrations') || '[]') as Array<{itemId: string}>;
      setHasRegistered(r.some(x => x.itemId === itemId));
    } catch {}
  }, [itemId]);
  const handleRegister = () => {
    try {
      const raw = localStorage.getItem('pub_registrations') || '[]';
      const regs = JSON.parse(raw) as Array<{itemId: string; title: string; category: string; registeredAt: number}>;
      if (!regs.find(r => r.itemId === itemId)) {
        regs.unshift({ itemId, title: itemTitle, category: itemCategory, registeredAt: Date.now() });
        localStorage.setItem('pub_registrations', JSON.stringify(regs.slice(0, 200)));
      }
      if (!hasRegistered) {
        const newCount = attending + 1;
        localStorage.setItem(`attending_${itemId}`, String(newCount));
        setAttending(newCount);
        setHasRegistered(true);
      }
    } catch {}
    if (regUrl) window.open(regUrl, '_blank', 'noopener,noreferrer');
  };
  return (
    <div className="mt-8 rounded-2xl border border-pink-500/20 bg-pink-500/[0.05] p-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-pink-400/60 mb-1">Register for this event</p>
          <div className="flex items-center gap-1.5 text-[12px] text-white/40">
            <Users className="h-3.5 w-3.5" />
            <span className="tabular-nums font-semibold text-white/60">{attending}</span> attending
          </div>
        </div>
        <button
          type="button"
          onClick={handleRegister}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-bold transition active:scale-[0.98] ${hasRegistered ? 'border border-pink-500/30 bg-pink-500/10 text-pink-400' : 'bg-pink-500 text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400'}`}
        >
          {hasRegistered ? '✓ Registered' : regUrl ? (<>Register <ExternalLink className="h-4 w-4" /></>) : 'Register Now'}
        </button>
      </div>
    </div>
  );
}

function HackathonRegisterCTA({ itemId, itemTitle, itemCategory, body }: { itemId: string; itemTitle: string; itemCategory: string; body: string }) {
  const regUrl = body?.match(/^Registration URL:\s*(.+)$/im)?.[1]?.trim() || '';
  const [attending, setAttending] = useState(0);
  const [hasRegistered, setHasRegistered] = useState(false);

  useEffect(() => {
    try { setAttending(Number(localStorage.getItem(`attending_${itemId}`) || '0')); } catch {}
    try {
      const r = JSON.parse(localStorage.getItem('pub_registrations') || '[]') as Array<{itemId: string}>;
      setHasRegistered(r.some(x => x.itemId === itemId));
    } catch {}
  }, [itemId]);
  const handleRegister = () => {
    try {
      const raw = localStorage.getItem('pub_registrations') || '[]';
      const regs = JSON.parse(raw) as Array<{itemId: string; title: string; category: string; registeredAt: number}>;
      if (!regs.find(r => r.itemId === itemId)) {
        regs.unshift({ itemId, title: itemTitle, category: itemCategory, registeredAt: Date.now() });
        localStorage.setItem('pub_registrations', JSON.stringify(regs.slice(0, 200)));
      }
      if (!hasRegistered) {
        const newCount = attending + 1;
        localStorage.setItem(`attending_${itemId}`, String(newCount));
        setAttending(newCount);
        setHasRegistered(true);
      }
    } catch {}
    if (regUrl) window.open(regUrl, '_blank', 'noopener,noreferrer');
  };
  return (
    <div className="mt-8 rounded-2xl border border-orange-500/20 bg-orange-500/[0.05] p-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-400/60 mb-1">Register for this hackathon</p>
          <div className="flex items-center gap-1.5 text-[12px] text-white/40">
            <Users className="h-3.5 w-3.5" />
            <span className="tabular-nums font-semibold text-white/60">{attending}</span> registered
          </div>
        </div>
        <button
          type="button"
          onClick={handleRegister}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-bold transition active:scale-[0.98] ${hasRegistered ? 'border border-orange-500/30 bg-orange-500/10 text-orange-400' : 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-400'}`}
        >
          {hasRegistered ? '✓ Registered' : regUrl ? (<>Register <ExternalLink className="h-4 w-4" /></>) : 'Register Now'}
        </button>
      </div>
    </div>
  );
}

/* ─── helpers ───────────────────────────────────────────────────── */
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)       return 'Just now';
  if (diff < 3_600_000)    return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)   return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7*86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
function randomColor() {
  const c = ['bg-emerald-600','bg-blue-600','bg-violet-600','bg-orange-600','bg-pink-600','bg-teal-600','bg-rose-600','bg-indigo-600','bg-amber-600','bg-cyan-600'];
  return c[Math.floor(Math.random() * c.length)];
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function getShareUrl(item: PublishedItem) {
  if (typeof window === 'undefined') return '';
  return item.shareId
    ? `${window.location.origin}/transfer/${item.shareId}`
    : `${window.location.origin}/published/${item.id}`;
}

/* ─── comment helpers ───────────────────────────────────────────── */
const AVATAR_COLORS = ['bg-emerald-600','bg-blue-600','bg-violet-600','bg-orange-600','bg-pink-600','bg-teal-600','bg-rose-600','bg-indigo-600','bg-amber-600','bg-cyan-600'];
function stableColor(seed: string): string {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
type ApiComment = { id: string; author: string; text: string; createdAt: string; parentId?: string | null; likesCount?: number; likedByViewer?: boolean };

function apiCommentToComment(c: ApiComment): Comment {
  return { id:c.id, author:c.author, initials:initials(c.author), color:stableColor(c.author), text:c.text, timestamp:c.createdAt, likes:c.likesCount ?? 0, likedByMe:c.likedByViewer ?? false, replies:[] };
}

function buildCommentTree(flat: ApiComment[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];
  for (const c of flat) map.set(c.id, apiCommentToComment(c));
  for (const c of flat) {
    const node = map.get(c.id)!;
    if (c.parentId) {
      const parent = map.get(c.parentId);
      if (parent) { parent.replies.push(node); continue; }
    }
    roots.push(node);
  }
  return roots;
}

/* ─── localStorage fallbacks (mock items only) ──────────────────── */
function getLikes(id: string): number {
  try { const s = localStorage.getItem(`pub_likes_${id}`); return s !== null ? parseInt(s, 10) : (SEED_LIKES[id] ?? 10); } catch { return SEED_LIKES[id] ?? 10; }
}
function setLikes(id: string, n: number) { try { localStorage.setItem(`pub_likes_${id}`, String(n)); } catch {} }
function getDidLike(id: string): boolean { try { return localStorage.getItem(`pub_liked_${id}`) === '1'; } catch { return false; } }
function setDidLike(id: string, v: boolean) { try { localStorage.setItem(`pub_liked_${id}`, v ? '1' : '0'); } catch {} }
function getLocalComments(id: string): Comment[] {
  try {
    const stored = localStorage.getItem(`pub_comments_${id}`);
    const raw: RawComment[] = stored ? JSON.parse(stored) : (MOCK_COMMENTS[id] ?? []);
    const top = raw.filter(c => !c.parentId);
    const byParent: Record<string, RawComment[]> = {};
    for (const c of raw) { if (c.parentId) (byParent[c.parentId] ??= []).push(c); }
    return top.map(c => ({ ...c, likedByMe: false, replies: (byParent[c.id] ?? []).map(r => ({ ...r, likedByMe: false, replies: [] })) }));
  } catch { return []; }
}
function saveLocalComments(id: string, comments: Comment[]) {
  try {
    const flat: RawComment[] = [];
    for (const c of comments) {
      flat.push({ id:c.id, author:c.author, initials:c.initials, color:c.color, text:c.text, timestamp:c.timestamp, likes:c.likes });
      for (const r of c.replies) flat.push({ id:r.id, author:r.author, initials:r.initials, color:r.color, text:r.text, timestamp:r.timestamp, likes:r.likes, parentId:c.id });
    }
    localStorage.setItem(`pub_comments_${id}`, JSON.stringify(flat));
  } catch {}
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function PublishedItemPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const displayName = session?.user?.name || 'Anonymous';
  const [item,          setItem]          = useState<PublishedItem | null>(null);
  const [related,       setRelated]       = useState<PublishedItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [likeCount,     setLikeCount]     = useState(0);
  const [liked,         setLiked]         = useState(false);
  const [isRealItem,    setIsRealItem]    = useState(false);
  const [comments,      setComments]      = useState<Comment[]>([]);
  const [commentText,   setCommentText]   = useState('');
  const [replyTo,       setReplyTo]       = useState<string | null>(null);
  const [replyText,     setReplyText]     = useState('');
  const [showSharePanel,setShowSharePanel]= useState(false);
  const [copied,        setCopied]        = useState(false);
  const [embedCopied,   setEmbedCopied]   = useState(false);
  const [reportOpen,    setReportOpen]    = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError,   setDeleteError]   = useState('');
  const commentRef  = useRef<HTMLTextAreaElement>(null);
  const sharePanelRef = useRef<HTMLDivElement>(null);
  const likeInFlight  = useRef(false);

  /* ── load item ── */
  useEffect(() => {
    async function load() {
      setLoading(true);
      // 1. Try the single-item API (real persisted items with full data)
      try {
        const res = await fetch(`/api/public/published/${id}`);
        if (res.ok) {
          const real = await res.json() as PublishedItem & {
            comments?: { id: string; author: string; text: string; createdAt: string }[];
          };
          setItem(real);
          setIsRealItem(true);
          setLikeCount(real.likesCount ?? 0);
          setLiked(real.likedByViewer ?? false);
          setComments(buildCommentTree(real.comments ?? []));
          // related from list API
          try {
            const lr = await fetch('/api/public/published');
            if (lr.ok) {
              const ld = await lr.json() as { items: PublishedItem[] };
              setRelated(ld.items.filter(i => i.id !== real.id && i.category === real.category).slice(0, 4));
            }
          } catch {}
          setLoading(false);
          return;
        }
      } catch {}
      // 2. Fall back to mock data
      const found = ALL_MOCK.find(m => m.id === id) ?? ALL_MOCK[0];
      setItem(found);
      setIsRealItem(false);
      setLikeCount(getLikes(found.id));
      setLiked(getDidLike(found.id));
      setComments(getLocalComments(found.id));
      setRelated(ALL_MOCK.filter(m => m.id !== found.id && m.category === found.category).slice(0, 4));
      setLoading(false);
    }
    void load();
  }, [id]);

  /* ── poll real items every 5 s for live counts ── */
  useEffect(() => {
    if (!isRealItem) return;
    const refresh = async () => {
      try {
        const [lRes, cRes] = await Promise.all([
          fetch(`/api/public/published/${id}`),
          fetch(`/api/public/published/${id}/comments`),
        ]);
        if (lRes.ok) {
          const d = await lRes.json() as { likesCount?: number; likedByViewer?: boolean };
          setLikeCount(n => d.likesCount ?? n);
          if (d.likedByViewer !== undefined) setLiked(d.likedByViewer);
        }
        if (cRes.ok) {
          const cd = await cRes.json() as { comments: ApiComment[] };
          setComments(buildCommentTree(cd.comments));
        }
      } catch {}
    };
    const interval = setInterval(() => void refresh(), 5_000);
    return () => clearInterval(interval);
  }, [id, isRealItem]);

  /* ── close share panel on outside click ── */
  useEffect(() => {
    if (!showSharePanel) return;
    const h = (e: MouseEvent) => { if (sharePanelRef.current && !sharePanelRef.current.contains(e.target as Node)) setShowSharePanel(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showSharePanel]);

  /* ── like (optimistic, real API for real items) ── */
  const toggleLike = async () => {
    if (!item || likeInFlight.current) return;
    const next = !liked;
    const nc = next ? likeCount + 1 : likeCount - 1;
    setLiked(next); setLikeCount(nc);
    if (isRealItem) {
      likeInFlight.current = true;
      try {
        const res = await fetch(`/api/published/${item.id}/like`, { method: 'POST' });
        if (res.ok) {
          const d = await res.json() as { liked: boolean; likesCount: number };
          setLiked(d.liked); setLikeCount(d.likesCount);
        }
      } catch {} finally { likeInFlight.current = false; }
    } else {
      setDidLike(item.id, next); setLikes(item.id, nc);
    }
  };

  const copyLink = async () => {
    if (!item) return;
    try { await navigator.clipboard.writeText(getShareUrl(item)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  const copyEmbed = async () => {
    if (!item) return;
    const embed = `<iframe src="${getShareUrl(item)}" width="100%" height="500" frameborder="0" title="${item.title}"></iframe>`;
    try { await navigator.clipboard.writeText(embed); setEmbedCopied(true); setTimeout(() => setEmbedCopied(false), 2000); } catch {}
  };
  const nativeShare = async () => {
    if (!item || !navigator.share) return;
    try { await navigator.share({ title: item.title, text: item.body.slice(0, 120), url: getShareUrl(item) }); } catch {}
  };

  /* ── delete own post ── */
  const deleteItem = async () => {
    if (!item) return;
    setDeleteLoading(true); setDeleteError('');
    try {
      const res = await fetch(`/api/public/published/${item.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json().catch(() => null) as any; throw new Error(d?.error || 'Delete failed.'); }
      router.push('/published');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed.');
      setDeleteLoading(false);
    }
  };

  /* ── comment (real API for real items, localStorage for mocks) ── */
  const submitComment = async () => {
    if (!item || !commentText.trim()) return;
    const optimistic: Comment = { id:`c_${Date.now()}`, author:displayName, initials:initials(displayName), color:stableColor(displayName), text:commentText.trim(), timestamp:new Date().toISOString(), likes:0, likedByMe:false, replies:[] };
    setComments(prev => [optimistic, ...prev]);
    setCommentText('');
    if (isRealItem) {
      try {
        const res = await fetch(`/api/public/published/${item.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: optimistic.text }),
        });
        if (res.ok) {
          const d = await res.json() as { comments: ApiComment[] };
          setComments(buildCommentTree(d.comments));
        }
      } catch {}
    } else {
      setComments(prev => { saveLocalComments(item.id, prev); return prev; });
    }
  };

  const submitReply = async (parentId: string, text?: string) => {
    const replyContent = (text ?? replyText).trim();
    if (!item || !replyContent) return;
    const r: Comment = { id:`r_${Date.now()}`, author:displayName, initials:initials(displayName), color:randomColor(), text:replyContent, timestamp:new Date().toISOString(), likes:0, likedByMe:false, replies:[] };
    setComments(prev => prev.map(c => c.id === parentId ? { ...c, replies:[...c.replies, r] } : c));
    setReplyText(''); setReplyTo(null);
    if (isRealItem) {
      try {
        const res = await fetch(`/api/public/published/${item.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: replyContent, parentId }),
        });
        if (res.ok) {
          const d = await res.json() as { comments: ApiComment[] };
          setComments(buildCommentTree(d.comments));
        }
      } catch {}
    } else {
      setComments(prev => { saveLocalComments(item.id, prev); return prev; });
    }
  };
  const likeComment = async (commentId: string, isReply?: string) => {
    // Optimistic update
    setComments(prev => prev.map(c => {
      if (isReply && c.id === isReply) return { ...c, replies: c.replies.map(r => r.id === commentId ? { ...r, likes: r.likedByMe ? r.likes-1 : r.likes+1, likedByMe: !r.likedByMe } : r) };
      if (c.id === commentId) return { ...c, likes: c.likedByMe ? c.likes-1 : c.likes+1, likedByMe: !c.likedByMe };
      return c;
    }));
    if (isRealItem && item) {
      try {
        await fetch(`/api/public/published/${item.id}/comments/${commentId}/like`, { method: 'POST' });
        // Refresh comments from server to get accurate counts
        const cRes = await fetch(`/api/public/published/${item.id}/comments`);
        if (cRes.ok) {
          const cd = await cRes.json() as { comments: ApiComment[] };
          setComments(buildCommentTree(cd.comments));
        }
      } catch {}
    } else if (item) {
      setComments(prev => { saveLocalComments(item.id, prev); return prev; });
    }
  };

  /* loading skeleton */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-white">
        <div className="h-14 border-b border-white/[0.06]" />
        <div className="px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20 py-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <div className="h-5 w-32 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="h-12 w-3/4 animate-pulse rounded-xl bg-white/[0.07]" />
              <div className="h-4 w-1/2 animate-pulse rounded-lg bg-white/[0.04]" />
              <div className="space-y-3 pt-4">{[1,2,3,4,5].map(i => <div key={i} className="h-4 animate-pulse rounded bg-white/[0.04]" style={{ width:`${95 - i * 5}%` }} />)}</div>
            </div>
            <div className="hidden lg:block space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/[0.04]" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0C] text-white">
        <div className="text-center">
          <p className="text-base font-semibold">Item not found</p>
          <Link href="/published" className="mt-3 inline-block text-sm text-white/40 hover:text-white underline">← Back to Published</Link>
        </div>
      </div>
    );
  }

  const tagCls    = TAG_CLS[item.category] ?? 'bg-white/10 text-white/70 border-white/10';
  const CatIcon   = TABS_MAP[item.category] ?? FileText;
  const shareUrl  = getShareUrl(item);
  const totalComments = comments.reduce((s, c) => s + 1 + c.replies.length, 0);

  const enrichedItem = {
    ...item,
    dataUrl: item.dataUrl,
    mimeType: item.mimeType,
    videoUrl: item.videoUrl,
  };

  const sharedCatProps = {
    item: enrichedItem, likeCount, liked, toggleLike,
    comments, commentText, displayName,
    setCommentText, submitComment, submitReply,
    likeComment: (id: string) => void likeComment(id),
    totalComments, commentRef,
  };

  const NEW_CATS = new Set(['post', 'poll', 'survey', 'chart', 'thread', 'video', 'milestone', 'tutorial']);

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white">

      {/* ── Delete confirm modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => { setDeleteConfirm(false); setDeleteError(''); }} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.10] bg-[#111114] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.8)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="text-[15px] font-bold text-white">Delete this post?</h3>
            <p className="mt-1.5 text-[13px] text-white/45">This action cannot be undone. The post will be removed from the public directory immediately.</p>
            {deleteError && (
              <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-[13px] text-red-400">{deleteError}</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => { setDeleteConfirm(false); setDeleteError(''); }}
                className="h-9 flex-1 rounded-xl border border-white/[0.08] bg-transparent text-[13px] font-medium text-white/55 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteItem()}
                disabled={deleteLoading}
                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 text-[13px] font-bold text-red-400 transition hover:bg-red-500/20 hover:text-red-300 disabled:opacity-40"
              >
                {deleteLoading ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400/30 border-t-red-400" /> Deleting…</> : <><Trash2 className="h-3.5 w-3.5" /> Delete post</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute left-1/2 top-0 h-[450px] w-[700px] -translate-x-1/2 rounded-full bg-orange-400/[0.05] blur-[160px]" />
        <div className="absolute right-0 top-1/2 h-[300px] w-[350px] rounded-full bg-amber-500/[0.04] blur-[120px]" />
      </div>

      {/* ── sticky header ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0A0A0C]/95 backdrop-blur-2xl">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">

          {/* back */}
          <Link href="/published" className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/55 transition hover:bg-white/[0.09] hover:text-white" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* breadcrumb */}
          <nav className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-[11.5px]">
            <Link href="/published" className="shrink-0 text-white/35 transition hover:text-white/70">Published</Link>
            <ChevronRight className="h-3 w-3 shrink-0 text-white/20" />
            <span className="shrink-0 capitalize text-white/35">{item.category}</span>
            <ChevronRight className="h-3 w-3 shrink-0 text-white/20" />
            <span className="truncate font-medium text-white/55">{item.title}</span>
          </nav>

          {/* header actions */}
          <div className="flex shrink-0 items-center gap-2">
            {item.canDelete && isRealItem && (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3 text-xs font-semibold text-red-400 transition hover:bg-red-500/[0.14] hover:text-red-300"
                title="Delete this post"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
            <button
              type="button"
              onClick={toggleLike}
              className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
                liked ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' : 'border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.09] hover:text-white'
              }`}
            >
              <ThumbsUp className={`h-3.5 w-3.5 transition-transform ${liked ? 'scale-110' : ''}`} />
              <span className="tabular-nums">{likeCount}</span>
            </button>

            <div className="relative" ref={sharePanelRef}>
              <button
                type="button"
                onClick={() => setShowSharePanel(s => !s)}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-semibold text-white/50 transition hover:bg-white/[0.09] hover:text-white"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>

              {showSharePanel && (
                <div className="absolute right-0 top-10 z-50 w-68 rounded-2xl border border-white/[0.10] bg-[#111114] shadow-[0_24px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
                  <div className="border-b border-white/[0.07] px-4 py-3">
                    <p className="text-xs font-semibold text-white/70">Share this item</p>
                    <p className="mt-0.5 truncate text-[10px] text-white/30">{shareUrl}</p>
                  </div>
                  <div className="space-y-0.5 p-2">
                    <ShareBtn icon={copied ? Check : Copy} label={copied ? 'Copied!' : 'Copy link'} accent={copied} onClick={copyLink} />
                    <ShareBtn icon={Twitter} label="Share on X / Twitter" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(item.title)}&url=${encodeURIComponent(shareUrl)}`, '_blank')} />
                    <ShareBtn icon={ExternalLink} label="Share on LinkedIn" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')} />
                    <ShareBtn icon={MessageCircle} label="Share on WhatsApp" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${item.title} — ${shareUrl}`)}`, '_blank')} />
                    <ShareBtn icon={Mail} label="Share via Email" onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(item.title)}&body=${encodeURIComponent(`${item.title}\n\n${shareUrl}`)}`; }} />
                    <div className="my-1 border-t border-white/[0.06]" />
                    <ShareBtn icon={embedCopied ? Check : Code2} label={embedCopied ? 'Embed copied!' : 'Copy embed code'} accent={embedCopied} onClick={copyEmbed} />
                    {'share' in navigator && <ShareBtn icon={Share2} label="More options…" onClick={nativeShare} />}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── new category dedicated pages ── */}
      {NEW_CATS.has(item.category) && (
        <div className="max-w-5xl mx-auto w-full">
          {/* hero thumbnail for new-category pages (excluding post which has its own images) */}
          {item.thumbnailUrl && item.category !== 'post' && (
            <div className="relative mb-0 h-52 w-full overflow-hidden sm:h-64 lg:h-72">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/20 to-transparent" />
            </div>
          )}
          <div className="px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20 py-8 lg:py-12">
            {item.category === 'post'      && <PostDetailContent      {...sharedCatProps} />}
            {item.category === 'poll'      && <PollDetailContent      {...sharedCatProps} />}
            {item.category === 'survey'    && <SurveyDetailContent    {...sharedCatProps} />}
            {item.category === 'chart'     && <ChartDetailContent     {...sharedCatProps} />}
            {item.category === 'thread'    && <ThreadDetailContent    {...sharedCatProps} />}
            {item.category === 'video'     && <VideoDetailContent     {...sharedCatProps} />}
            {item.category === 'milestone' && <MilestoneDetailContent {...sharedCatProps} />}
            {item.category === 'tutorial'  && <TutorialDetailContent  {...sharedCatProps} />}
          </div>
        </div>
      )}

      {/* ── page body (classic categories only) ── */}
      {!NEW_CATS.has(item.category) && <div className="py-8 lg:py-12">

        {/* ── Hero thumbnail (full-bleed, outside the padded grid) ── */}
        {item.thumbnailUrl && (
          <div className="relative mb-8 h-56 w-full overflow-hidden sm:h-72 lg:h-80 xl:h-96">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="h-full w-full object-cover"
            />
            {/* gradient overlay — fades to the page background */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/30 to-transparent" />
            {/* category chip floated over the image */}
            <div className="absolute bottom-5 left-4 sm:left-8 lg:left-14 xl:left-20 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide backdrop-blur-sm ${tagCls}`}>
                <CatIcon className="h-3.5 w-3.5" />
                {item.category === 'job' ? 'Job Post' : item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </span>
              {item.badge && (
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur-sm ${tagCls}`}>
                  {item.badge}
                </span>
              )}
              {item.featured && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-400 backdrop-blur-sm">
                  ✦ Featured
                </span>
              )}
            </div>
          </div>
        )}

        <div className="px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">

          {/* ════ LEFT COLUMN ════ */}
          <article className="min-w-0">

            {/* category + badge chips — only when no thumbnail (already shown over image) */}
            {!item.thumbnailUrl && (
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${tagCls}`}>
                <CatIcon className="h-3.5 w-3.5" />
                {item.category === 'job' ? 'Job Post' : item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </span>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${tagCls}`}>
                {item.badge}
              </span>
              {item.featured && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-400">
                  ✦ Featured
                </span>
              )}
              {item.isReal && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              )}
            </div>
            )}

            {/* title */}
            <h1 className="mt-5 text-[1.75rem] font-bold leading-[1.2] tracking-[-0.03em] text-white sm:text-[2rem] lg:text-[2.25rem]">
              {item.title}
            </h1>

            {/* byline row */}
            <div className="mt-4 flex flex-col gap-3 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/45">{item.byline}</p>
              {/* inline engagement row */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={toggleLike}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition ${
                    liked ? 'bg-rose-500/10 text-rose-400' : 'text-white/40 hover:bg-white/[0.06] hover:text-white/80'
                  }`}
                >
                  <ThumbsUp className={`h-4 w-4 ${liked ? 'fill-rose-400/20' : ''} transition-transform ${liked ? 'scale-110' : ''}`} />
                  <span className="tabular-nums">{likeCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => commentRef.current?.focus()}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="tabular-nums">{totalComments}</span>
                </button>
                <button
                  type="button"
                  onClick={copyLink}
                  title="Copy link"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/25 transition hover:bg-white/[0.06] hover:text-white/55"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Link2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  title="Report"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/25 transition hover:bg-white/[0.06] hover:text-white/55"
                >
                  <Flag className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* mobile: stats (hidden on lg+, shown in sidebar there) */}
            {item.stats && item.stats.length > 0 && (
              <div className="mt-6 grid grid-cols-3 gap-3 lg:hidden">
                {item.stats.map(s => (
                  <div key={s.l} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-center">
                    <p className="text-xl font-bold text-white tabular-nums">{s.v}</p>
                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30">{s.l}</p>
                  </div>
                ))}
              </div>
            )}

            {/* body */}
            <div className="mt-7">
              <BodyRenderer body={item.body} category={item.category} />
            </div>

            {/* ── Category CTAs ── */}
            {item.category === 'document' && (() => {
              const isPdf = item.mimeType?.includes('pdf') || item.mimeType === 'application/pdf';
              const isText = item.mimeType?.includes('text') || item.mimeType === 'text/plain';
              return (
                <div className="mt-8 space-y-4">
                  {/* Inline document viewer */}
                  {item.dataUrl && (isPdf || isText) && (
                    <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-white/[0.02]">
                        <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Document Preview</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => window.open(item.dataUrl, '_blank')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/[0.09] hover:text-white"
                          >
                            <ExternalLink className="h-3 w-3" /> Open in new tab
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = item.dataUrl!;
                              a.download = item.title || 'document';
                              a.click();
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-slate-950 transition hover:bg-white/90"
                          >
                            <Download className="h-3 w-3" /> Download
                          </button>
                        </div>
                      </div>
                      {isPdf ? (
                        <iframe
                          src={item.dataUrl}
                          title={item.title}
                          className="w-full"
                          style={{ height: '600px', border: 'none' }}
                        />
                      ) : (
                        <pre className="p-5 text-[13px] leading-relaxed text-white/70 font-mono whitespace-pre-wrap overflow-x-auto max-h-[400px] overflow-y-auto">
                          {(() => {
                            try {
                              const base64 = item.dataUrl!.split(',')[1];
                              return atob(base64);
                            } catch { return item.body || 'Preview not available'; }
                          })()}
                        </pre>
                      )}
                    </div>
                  )}
                  {/* Download button when no inline preview */}
                  {item.dataUrl && !isPdf && !isText && (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/30">Document Actions</p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = item.dataUrl!;
                            a.download = item.title || 'document';
                            a.click();
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-bold text-slate-950 transition hover:bg-white/90 active:scale-[0.98]"
                        >
                          <Download className="h-4 w-4" /> Download
                        </button>
                        <button
                          type="button"
                          onClick={() => window.open(item.dataUrl, '_blank')}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 text-[13px] font-semibold text-white/70 transition hover:bg-white/[0.09] hover:text-white"
                        >
                          <Eye className="h-4 w-4" /> Preview
                        </button>
                      </div>
                    </div>
                  )}
                  {!item.dataUrl && (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                      <p className="text-sm text-white/30 italic">No file attached to this document.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {item.category === 'job' && (() => {
              const applyUrl = item.body?.match(/^Apply URL:\s*(.+)$/im)?.[1]?.trim() || '';
              return applyUrl ? (
                <div className="mt-8 rounded-2xl border border-blue-500/20 bg-blue-500/[0.05] p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-blue-400/60">Apply for this role</p>
                  <a
                    href={applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-[14px] font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 active:scale-[0.98]"
                  >
                    Apply Now <ExternalLink className="h-4 w-4" />
                  </a>
                  <p className="mt-2 text-[11px] text-white/30">You will be redirected to the employer's application page</p>
                </div>
              ) : null;
            })()}

            {item.category === 'product' && (() => {
              const shopUrl = item.body?.match(/^Shop URL:\s*(.+)$/im)?.[1]?.trim() || '';
              const whatsapp = item.body?.match(/^WhatsApp:\s*(.+)$/im)?.[1]?.trim() || '';
              if (!shopUrl && !whatsapp) return null;
              return (
                <div className="mt-8 rounded-2xl border border-purple-500/20 bg-purple-500/[0.05] p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-purple-400/60">Get this product</p>
                  <div className="flex flex-wrap gap-3">
                    {shopUrl && (
                      <a
                        href={shopUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-6 py-3 text-[14px] font-bold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-400 active:scale-[0.98]"
                      >
                        <ShoppingBag className="h-4 w-4" /> Shop Now
                      </a>
                    )}
                    {whatsapp && (
                      <a
                        href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-3 text-[14px] font-bold text-green-400 transition hover:bg-green-500/20 active:scale-[0.98]"
                      >
                        <Phone className="h-4 w-4" /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}

            {item.category === 'event' && (
              <EventRegisterCTA itemId={item.id} itemTitle={item.title} itemCategory={item.category} body={item.body} />
            )}

            {item.category === 'hackathon' && (
              <HackathonRegisterCTA itemId={item.id} itemTitle={item.title} itemCategory={item.category} body={item.body} />
            )}

            {item.category === 'gig' && (() => {
              const applyUrl = item.body?.match(/^Apply URL:\s*(.+)$/im)?.[1]?.trim() || '';
              return applyUrl ? (
                <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.05] p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-yellow-400/60">Apply for this gig</p>
                  <a
                    href={applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-6 py-3 text-[14px] font-bold text-slate-950 shadow-lg shadow-yellow-500/20 transition hover:bg-yellow-400 active:scale-[0.98]"
                  >
                    <Zap className="h-4 w-4" /> Apply Now <ExternalLink className="h-4 w-4" />
                  </a>
                  <p className="mt-2 text-[11px] text-white/30">You will be redirected to the external application page</p>
                </div>
              ) : null;
            })()}

            {/* mobile: chips (hidden on lg+, shown in sidebar there) */}
            {item.chips && item.chips.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-2 lg:hidden">
                {item.chips.map(c => (
                  <span key={c} className="rounded-full border border-white/[0.10] bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/60">{c}</span>
                ))}
              </div>
            )}

            {/* ── comments ── */}
            <div className="mt-12 border-t border-white/[0.06] pt-10" id="comments">
              <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
                <MessageCircle className="h-4 w-4 text-white/35" />
                {totalComments} Comment{totalComments !== 1 ? 's' : ''}
              </h2>

              {/* comment input */}
              <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${stableColor(displayName)}`}>
                    {initials(displayName)}
                  </div>
                  <span className="text-[13px] font-semibold text-white/70">{displayName}</span>
                </div>
                <textarea
                  ref={commentRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submitComment(); }}
                  placeholder="Add a comment… (⌘↵ to post)"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] text-white placeholder:text-white/20 outline-none transition focus:border-white/[0.18] focus:bg-white/[0.06]"
                />
                <div className="mt-2.5 flex items-center justify-between">
                  <p className="text-[10px] text-white/20">All comments are public</p>
                  <button
                    type="button"
                    onClick={() => void submitComment()}
                    disabled={!commentText.trim()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-white px-4 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-white/90 disabled:opacity-25 active:scale-95"
                  >
                    <Send className="h-3 w-3" /> Post
                  </button>
                </div>
              </div>

              {/* comment list */}
              <div className="mt-6 space-y-5">
                {comments.length === 0 ? (
                  <div className="py-10 text-center">
                    <MessageCircle className="mx-auto h-8 w-8 text-white/[0.08]" />
                    <p className="mt-3 text-sm text-white/25">No comments yet. Be the first.</p>
                  </div>
                ) : (
                  comments.map(c => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      onLike={() => void likeComment(c.id)}
                      onReply={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(''); }}
                      replyOpen={replyTo === c.id}
                      replyText={replyText}
                      onReplyTextChange={setReplyText}
                      onSubmitReply={() => void submitReply(c.id)}
                      onLikeReply={rid => void likeComment(rid, c.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </article>

          {/* ════ RIGHT SIDEBAR ════ */}
          <aside className="hidden lg:block">
            <div className="sticky top-[57px] space-y-4">

              {/* stats card */}
              {item.stats && item.stats.length > 0 && (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Stats</p>
                  <div className="grid grid-cols-3 gap-2">
                    {item.stats.map(s => (
                      <div key={s.l} className="rounded-xl bg-white/[0.04] p-3 text-center">
                        <p className="text-[15px] font-bold text-white tabular-nums leading-none">{s.v}</p>
                        <p className="mt-1.5 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-white/30">{s.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* chips/tags card */}
              {item.chips && item.chips.length > 0 && (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.chips.map(c => (
                      <span key={c} className="rounded-lg border border-white/[0.09] bg-white/[0.04] px-2.5 py-1 text-[11.5px] font-medium text-white/55">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* share card */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Share</p>
                <div className="space-y-1.5">
                  <SideShareBtn icon={copied ? Check : Link2} label={copied ? 'Copied!' : 'Copy link'} onClick={copyLink} accent={copied} />
                  <SideShareBtn icon={Twitter}      label="X / Twitter"  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(item.title)}&url=${encodeURIComponent(shareUrl)}`, '_blank')} />
                  <SideShareBtn icon={ExternalLink} label="LinkedIn"      onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')} />
                  <SideShareBtn icon={MessageCircle}label="WhatsApp"     onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${item.title} — ${shareUrl}`)}`, '_blank')} />
                  <SideShareBtn icon={Mail}         label="Email"        onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(item.title)}&body=${encodeURIComponent(`${item.title}\n\n${shareUrl}`)}`; }} />
                  <SideShareBtn icon={embedCopied ? Check : Code2} label={embedCopied ? 'Embed copied!' : 'Embed'} onClick={copyEmbed} accent={embedCopied} />
                </div>
              </div>

              {/* engagement card */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Engagement</p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={toggleLike}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      liked ? 'bg-rose-500/10 text-rose-400' : 'border border-white/[0.07] bg-white/[0.03] text-white/50 hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2"><ThumbsUp className="h-4 w-4" />{liked ? 'Liked' : 'Like this'}</span>
                    <span className="tabular-nums text-xs">{likeCount}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => commentRef.current?.focus()}
                    className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-sm font-semibold text-white/50 transition hover:bg-white/[0.07] hover:text-white"
                  >
                    <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" />Comment</span>
                    <span className="tabular-nums text-xs">{totalComments}</span>
                  </button>
                </div>
              </div>

              {/* related items */}
              {related.length > 0 && (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Related</p>
                  <div className="space-y-2">
                    {related.map(r => {
                      const rcls = TAG_CLS[r.category] ?? 'bg-white/10 text-white/70 border-white/10';
                      return (
                        <Link
                          key={r.id}
                          href={`/published/${r.id}`}
                          className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/[0.12] hover:bg-white/[0.05]"
                        >
                          <span className={`mt-0.5 shrink-0 inline-flex items-center rounded-lg border px-1.5 py-0.5 text-[8.5px] font-bold tracking-wide ${rcls}`}>
                            {r.badge.length > 10 ? r.badge.slice(0, 10) + '…' : r.badge}
                          </span>
                          <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-white/65 group-hover:text-white/90 transition-colors">
                            {r.title}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                  <Link href="/published" className="mt-3 flex items-center gap-1 text-[11px] font-medium text-white/30 transition hover:text-white/60">
                    Browse all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
        </div>{/* /px-4 wrapper */}
      </div>}

      {/* ── report modal ── */}
      {reportOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setReportOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111114] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Report this item</h3>
              <button onClick={() => setReportOpen(false)} className="text-white/30 transition hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-1.5">
              {['Misinformation / inaccurate content','Spam or duplicate','Inappropriate or offensive','Copyright violation','Other'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="flex w-full items-center rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm text-white/55 transition hover:bg-white/[0.08] hover:text-white"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── sub-components ────────────────────────────────────────────── */
function ShareBtn({ icon: Icon, label, onClick, accent }: { icon: React.ElementType; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
        accent ? 'bg-emerald-500/10 text-emerald-400' : 'text-white/55 hover:bg-white/[0.06] hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

function SideShareBtn({ icon: Icon, label, onClick, accent }: { icon: React.ElementType; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium transition ${
        accent
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
          : 'border-white/[0.07] bg-white/[0.03] text-white/50 hover:bg-white/[0.07] hover:text-white'
      }`}
    >
      <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{label}</span>
      <ArrowRight className="h-3 w-3 opacity-30" />
    </button>
  );
}

function CommentItem({
  comment: c, onLike, onReply, replyOpen, replyText,
  onReplyTextChange, onSubmitReply, onLikeReply,
}: {
  comment: Comment; onLike: () => void; onReply: () => void;
  replyOpen: boolean; replyText: string;
  onReplyTextChange: (v: string) => void;
  onSubmitReply: () => void; onLikeReply: (id: string) => void;
}) {
  return (
    <div className="flex gap-3">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${c.color}`}>
        {c.initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white/80">{c.author}</span>
          <span className="text-[10px] text-white/25">{timeAgo(c.timestamp)}</span>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{c.text}</p>
        <div className="mt-2 flex items-center gap-3">
          <button type="button" onClick={onLike} className={`inline-flex items-center gap-1 text-[11px] font-semibold transition ${c.likedByMe ? 'text-rose-400' : 'text-white/25 hover:text-white/65'}`}>
            <Heart className={`h-3 w-3 ${c.likedByMe ? 'fill-rose-400' : ''}`} />
            {c.likes > 0 && <span className="tabular-nums">{c.likes}</span>}
          </button>
          <button type="button" onClick={onReply} className="text-[11px] font-semibold text-white/25 transition hover:text-white/65">Reply</button>
        </div>

        {replyOpen && (
          <div className="mt-3">
            <div className="flex gap-2">
              <textarea
                value={replyText}
                onChange={e => onReplyTextChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmitReply(); }}
                placeholder="Write a reply…"
                rows={2}
                className="flex-1 resize-none rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-white/[0.18]"
              />
              <button
                type="button"
                onClick={onSubmitReply}
                disabled={!replyText.trim()}
                className="self-end inline-flex h-8 items-center rounded-xl bg-white px-3 text-xs font-bold text-slate-950 transition disabled:opacity-25"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {c.replies.length > 0 && (
          <div className="mt-4 space-y-3 border-l border-white/[0.06] pl-4">
            {c.replies.map(r => (
              <div key={r.id} className="flex gap-3">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${r.color}`}>{r.initials}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-white/75">{r.author}</span>
                    <span className="text-[10px] text-white/25">{timeAgo(r.timestamp)}</span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/55">{r.text}</p>
                  <button
                    type="button"
                    onClick={() => onLikeReply(r.id)}
                    className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold transition ${r.likedByMe ? 'text-rose-400' : 'text-white/20 hover:text-white/55'}`}
                  >
                    <Heart className={`h-2.5 w-2.5 ${r.likedByMe ? 'fill-rose-400' : ''}`} />
                    {r.likes > 0 && <span className="tabular-nums">{r.likes}</span>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
