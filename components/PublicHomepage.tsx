/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Activity,
  ArrowRight,
  Award,
  Bookmark,
  BookOpen,
  Briefcase,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  FileSignature,
  FileText,
  FolderLock,
  FormInput,
  Heart,
  HelpCircle,
  LayoutGrid,
  LockKeyhole,
  LogOut,
  Layers,
  Megaphone,
  Medal,
  Menu,
  MessageCircle,
  Mic,
  Newspaper,
  Package,
  Paperclip,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  UserPlus,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import HomepageNav from '@/components/HomepageNav';
import { AssistantResultCardView } from '@/components/home-chat/AssistantResultCard';
import QuickFileEditorDialog from '@/components/QuickFileEditorDialog';
import PublishAnythingDialog from '@/components/PublishAnythingDialog';
import FileTransferCenter from '@/components/FileTransferCenter';
import PdfStudio from '@/components/PdfStudio';
import FormsCenter from '@/components/FormsCenter';
import ScratchpadCenter from '@/components/ScratchpadCenter';
import DocumentVisualizerModal from '@/components/DocumentVisualizerModal';
import ESignStudioModal from '@/components/ESignStudioModal';
import type { AssistantResultCard, DocumentQuickAction, UploadedDocument } from '@/types/doc-assistant';

interface PublicHomepageProps {
  softwareName: string;
  accentLabel: string;
  guestMode?: boolean;
}

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  sources?: Array<{ title: string; href: string; description?: string; badge?: string; category?: string }>;
  card?: AssistantResultCard;
  requestMeta?: { message: string; action?: DocumentQuickAction };
};

type ChatThreadSummary = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  messageCount: number;
  preview: string;
};

const sidebarNav = [
  { label: 'AI Chat', href: '/', Icon: Sparkles, group: 'Workspace' },
  { label: 'Documents', href: '/docword', Icon: FileText, group: 'Workspace' },
  { label: 'My Profile', href: '/profile', Icon: User, group: 'Workspace' },
  { label: 'PDF Editor', href: '/pdf-editor', Icon: Wand2, group: 'Tools' },
  { label: 'Forms', href: '/forms', Icon: FormInput, group: 'Tools' },
  { label: 'Visualizer', href: '/visualizer', Icon: LayoutGrid, group: 'Tools' },
  { label: 'Secure Sharing', href: '#', Icon: FolderLock, group: 'Security' },
  { label: 'E‑Sign', href: '/workspace?tab=generate', Icon: FileSignature, group: 'Security' },
  { label: 'People', href: '/people', Icon: Users, group: 'Discover' },
] as const;

const welcomeCards = [
  {
    title: 'The Draft Whisperer',
    description: 'Banish writer\'s block. Create iron-clad NDAs, offers, or invoices in seconds.',
    Icon: FileText,
    prompt: 'Draft a professional offer letter for a software engineer (3 years experience) with CTC, joining date, probation, and benefits.',
  },
  {
    title: 'The PDF Decoder',
    description: 'Stop scanning, start knowing. Get key insights and risks from long docs instantly.',
    Icon: Wand2,
    prompt: 'Summarize this contract and list key risks, missing clauses, and what I should negotiate.',
  },
  {
    title: 'The Form Architect',
    description: 'Build beautiful, shareable forms to collect data and approvals with ease.',
    Icon: FormInput,
    prompt: 'Create a client onboarding form with contact details, GST, billing address, project scope, and file upload checklist.',
  },
  {
    title: 'The Data Miner',
    description: 'Dig deep. Extract tables, dates, and line items from any image or file.',
    Icon: Search,
    prompt: 'Extract all line items, the total amount, and vendor details from this invoice image and format as a table.',
  },
  {
    title: 'The Sign-Off Hero',
    description: 'Close deals faster with integrated, secure digital signature workflows.',
    Icon: FileSignature,
    prompt: 'Set up this NDA for two signers (Me and the Client). Add signature fields at the bottom.',
  },
  {
    title: 'The Vault Keeper',
    description: 'Send sensitive files with military-grade encryption and auto-expiry.',
    Icon: FolderLock,
    prompt: 'Send this sensitive report with password protection and set it to expire in 24 hours.',
  },
] as const;

/* ─── Homepage hero feature cards ───────────────────────────── */
const HERO_FEATURE_CARDS = [
  {
    id: 'sign-off',
    title: 'The Sign-Off Hero',
    description: 'Close deals faster with integrated digital signatures.',
    Icon: FileSignature,
    iconBg: 'bg-violet-500/[0.12]',
    iconColor: 'text-violet-400',
    border: 'border-violet-500/[0.15]',
    glow: 'rgba(139,92,246,0.12)',
  },
  {
    id: 'vault',
    title: 'The Vault Keeper',
    description: 'Secure. Encrypted. Always protected.',
    Icon: LockKeyhole,
    iconBg: 'bg-emerald-500/[0.12]',
    iconColor: 'text-emerald-400',
    border: 'border-emerald-500/[0.15]',
    glow: 'rgba(16,185,129,0.12)',
  },
  {
    id: 'pdf',
    title: 'The PDF Decoder',
    description: 'AI-powered document insights in seconds.',
    Icon: FileText,
    iconBg: 'bg-blue-500/[0.12]',
    iconColor: 'text-blue-400',
    border: 'border-blue-500/[0.15]',
    glow: 'rgba(59,130,246,0.12)',
  },
  {
    id: 'draft',
    title: 'The Draft Whisperer',
    description: 'Banish writer\'s block. Create content, offers, and invoices in seconds.',
    Icon: PenLine,
    iconBg: 'bg-amber-500/[0.12]',
    iconColor: 'text-amber-400',
    border: 'border-amber-500/[0.15]',
    glow: 'rgba(245,158,11,0.12)',
  },
] as const;

/* ─── New professionals data ─────────────────────────────────── */
const NEW_PROFESSIONALS = [
  { id: 'np1', name: 'Ananya Verma', role: 'Product Designer', timeAgo: '2h ago', avatar: 'AV', avatarBg: 'from-pink-500 to-rose-600', online: true, skills: ['UI/UX', 'Figma', 'Design Systems'] },
  { id: 'np2', name: 'Rohit Sharma', role: 'Full Stack Developer', timeAgo: '4h ago', avatar: 'RS', avatarBg: 'from-blue-500 to-indigo-600', online: true, skills: ['Next.js', 'TypeScript', 'PostgreSQL'] },
  { id: 'np3', name: 'Meera Nair', role: 'Content Strategist', timeAgo: '6h ago', avatar: 'MN', avatarBg: 'from-purple-500 to-violet-600', online: false, skills: ['Content', 'SEO', 'Analytics'] },
  { id: 'np4', name: 'Karthik Iyer', role: 'UX Writer', timeAgo: '8h ago', avatar: 'KI', avatarBg: 'from-orange-500 to-amber-600', online: false, skills: ['UX Writing', 'Docs', 'Research'] },
  { id: 'np5', name: 'Sneha Patel', role: 'Motion Designer', timeAgo: '10h ago', avatar: 'SP', avatarBg: 'from-red-500 to-rose-600', online: false, skills: ['After Effects', 'Lottie', 'Animation'] },
  { id: 'np6', name: 'Dev Malhotra', role: 'AI Engineer', timeAgo: '12h ago', avatar: 'DM', avatarBg: 'from-teal-500 to-emerald-600', online: true, skills: ['Python', 'LLMs', 'MLOps'] },
] as const;

/* ─── Feed categories & feed data ───────────────────────────── */
const FEED_CATEGORIES = ['All', 'Design', 'Development', 'Writing', 'Marketing', 'Productivity', 'AI Tools', 'Career'] as const;

const FEEDS_DATA = [
  {
    id: 'fd1', category: 'Design', catCls: 'text-pink-400 bg-pink-500/[0.12] border-pink-500/[0.20]',
    title: 'Design Systems Best Practices',
    description: 'Create consistent and scalable design systems.',
    author: 'Riya Singh', authorAv: 'RS', authorBg: 'from-pink-500 to-rose-600',
    views: '2.3K', likes: '1.2K', comments: 24,
    ilk: 'design',
  },
  {
    id: 'fd2', category: 'Development', catCls: 'text-emerald-400 bg-emerald-500/[0.12] border-emerald-500/[0.20]',
    title: 'Building Scalable Web Apps',
    description: 'Modern architectures for modern problems.',
    author: 'Arjun Dev', authorAv: 'AD', authorBg: 'from-blue-500 to-indigo-600',
    views: '3.7K', likes: '1.6K', comments: 36,
    ilk: 'code',
  },
  {
    id: 'fd3', category: 'Writing', catCls: 'text-blue-400 bg-blue-500/[0.12] border-blue-500/[0.20]',
    title: 'UX Writing That Converts',
    description: 'Words that guide, engage and convert.',
    author: 'Diya Thomas', authorAv: 'DT', authorBg: 'from-sky-500 to-blue-600',
    views: '1.8K', likes: '1.1K', comments: 18,
    ilk: 'writing',
  },
  {
    id: 'fd4', category: 'AI Tools', catCls: 'text-amber-400 bg-amber-500/[0.12] border-amber-500/[0.20]',
    title: 'AI Tools Roundup',
    description: 'Top AI tools to boost your workflow.',
    author: 'Neel Mehta', authorAv: 'NM', authorBg: 'from-amber-500 to-orange-600',
    views: '2.9K', likes: '1.4K', comments: 27,
    ilk: 'ai',
  },
] as const;

/* ─── Trust logos ────────────────────────────────────────────── */
const TRUST_LOGOS = [
  { name: 'Google', svg: 'G', color: '#4285F4' },
  { name: 'Microsoft', svg: 'M', color: '#00A4EF' },
  { name: 'Amazon', svg: 'A', color: '#FF9900' },
  { name: 'Adobe', svg: 'Ae', color: '#FF0000' },
  { name: 'Notion', svg: 'N', color: '#ffffff' },
  { name: 'Spotify', svg: 'S', color: '#1DB954' },
] as const;

/* ─── publish showcase data (India-based) ───────────────────── */
const PUBLISH_SHOWCASE = [
  {
    id: 'news', label: 'News', icon: Newspaper, cta: 'Publish a story',
    tagCls: 'bg-red-500/10 text-red-400 border-red-500/20',
    main: {
      badge: 'Breaking', title: 'Reliance Jio Launches JioSpace Satellite Internet Across 1,200 Rural Districts',
      byline: 'Economic Times · 5 min read · Just now',
      body: 'JioSpace will deliver broadband connectivity to over 6 crore households in Tier-3 and rural areas by Q2 2025, powered by 28 low-orbit satellites launched in partnership with ISRO. Tariffs starting at ₹499/month.',
      stats: [{ v: '41.2k', l: 'reads' }, { v: '8.7k', l: 'shares' }, { v: '2,340', l: 'comments' }],
    },
    minis: [
      { badge: 'Markets', title: 'SEBI Approves India\'s First Domestic ETF for Listed AI Cos', byline: 'Mint · 3 min read' },
      { badge: 'M&A', title: 'Tata Group Acquires Singapore Fintech for ₹2,400 Crore', byline: 'Business Standard · 4 min read' },
    ],
  },
  {
    id: 'article', label: 'Article', icon: BookOpen, cta: 'Write & publish',
    tagCls: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    main: {
      badge: 'Editorial', title: 'How Bengaluru Startups Are Quietly Rewriting Global SaaS Playbooks',
      byline: 'Saurabh Mukherjea · Marcellus Investment · 14 min read',
      body: 'India\'s SaaS founders aren\'t copying Silicon Valley anymore — they\'re building products that global enterprises actually prefer. The numbers prove it: 18 Indian B2B SaaS companies crossed $100M ARR in 2024 alone.',
      stats: [{ v: '29.6k', l: 'reads' }, { v: '6.1k', l: 'saves' }, { v: '11.4k', l: 'shares' }],
    },
    minis: [
      { badge: 'Commerce', title: 'The Meesho Effect: Why Social Commerce Will Define India\'s Next Wave', byline: 'Aparna Jain · 9 min read' },
      { badge: 'Open Tech', title: 'ONDC and the Architecture of a Truly Open Internet Commerce Layer', byline: 'Rahul Chari · 7 min read' },
    ],
  },
  {
    id: 'document', label: 'Document', icon: FileText, cta: 'Upload a doc',
    tagCls: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    main: {
      badge: 'Official', title: 'DPDP Act 2023 — Enterprise Compliance Handbook, 2nd Edition',
      byline: '64 pages · 4.1 MB · PDF · Updated today',
      body: 'Comprehensive guide covering Data Principal rights, Data Fiduciary obligations, consent frameworks, breach notification timelines, and cross-border transfer rules under India\'s Digital Personal Data Protection Act 2023.',
      stats: [{ v: '64', l: 'pages' }, { v: '4.1 MB', l: 'size' }, { v: '318', l: 'downloads' }],
    },
    minis: [
      { badge: 'Tax', title: 'GST Annual Return Filing Guide FY 2024–25', byline: '38 pages · PDF · Shared yesterday' },
      { badge: 'Internal', title: 'MCA21 V3 Portal Migration — IT Reference', byline: '22 pages · DOCX · Draft' },
    ],
  },
  {
    id: 'portfolio', label: 'Portfolio', icon: Layers, cta: 'Showcase work',
    tagCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    main: {
      badge: 'Case Study', title: 'Reimagining IRCTC\'s Next Billion User Journey',
      byline: 'Client: Ministry of Railways, Govt. of India · UX Design · 2024',
      body: 'Complete UX overhaul of India\'s busiest consumer platform — 8.5 lakh daily bookings. Reduced drop-off by 52%, cut avg. booking time to 38 seconds, and boosted mobile conversion by 34 points. Delivered in 11 weeks.',
      chips: ['Figma', 'Design System', 'Hindi/Regional UI', 'A11y Research', 'Low-Bandwidth UX'],
    },
    minis: [
      { badge: 'Fintech', title: 'PhonePe Wealth: Mutual Fund Investment in Under 60 Seconds', byline: 'Client: PhonePe · Product Design · 2024' },
      { badge: 'Hyperlocal', title: 'Zepto 10-Minute Delivery UX — From Zero to 10M Orders', byline: 'Client: Zepto · Mobile UX · 2023' },
    ],
  },
  {
    id: 'announcement', label: 'Announce', icon: Megaphone, cta: 'Send announcement',
    tagCls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    main: {
      badge: 'HIGH PRIORITY', title: 'Docrud Now Available in Hindi, Tamil, Telugu & 9 More Indian Languages',
      byline: 'Product Team · Sent to 12,400 workspace members · 2 hrs ago',
      body: 'Full UI localisation across 12 Indian languages is now live — including right-to-left support for Urdu. Switch language from Settings › Workspace › Language. No content migration required.',
      stats: [{ v: '12.4k', l: 'reached' }, { v: '91%', l: 'opened' }, { v: '7 days', l: 'active' }],
    },
    minis: [
      { badge: 'Feature', title: 'GST Invoice Generation Now Supports UPI QR & GSTIN Validation', byline: 'Product Team · Sent 3 days ago' },
      { badge: 'Integration', title: 'Aadhaar eSign Integration Goes Live for Indian Enterprises', byline: 'Partnerships Team · Sent 1 week ago' },
    ],
  },
  {
    id: 'job', label: 'Job Post', icon: Briefcase, cta: 'Post a role',
    tagCls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    main: {
      badge: 'Hybrid · Full-time', title: 'Senior Product Designer',
      byline: 'Razorpay · Design Systems · Bengaluru',
      body: 'Own the design language across Razorpay\'s merchant dashboard and payment flows — used by 10M+ businesses across India. Define the component library, interaction patterns, and accessibility standards for web and mobile.',
      chips: ['₹35–55 LPA', 'ESOP', 'Design Systems', 'Figma expert', 'Health + Dental', 'Remote Fridays'],
    },
    minis: [
      { badge: 'Remote', title: 'Staff Backend Engineer (Go)', byline: 'CRED · Engineering · ₹45–70 LPA' },
      { badge: 'Hybrid', title: 'Head of Growth Marketing', byline: 'Meesho · Marketing · ₹40–60 LPA' },
    ],
  },
  {
    id: 'resume', label: 'Resume', icon: User, cta: 'Create profile',
    tagCls: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    main: {
      badge: '✦ Open to Work', title: 'Ananya Krishnan',
      byline: 'Senior Product Designer · 9 yrs exp · Bengaluru, KA',
      body: 'I\'ve spent a decade designing products that 100M+ Indians actually use — from CRED\'s credit interface to Swiggy\'s reorder experience. I believe great design solves for the person who never reads instructions.',
      chips: ['Figma', 'Design Systems', 'Bharat UX', 'User Research', 'Prototyping', 'Hindi UI'],
    },
    minis: [
      { badge: 'Available', title: 'Rohan Mehta · ML Engineer', byline: 'Hyderabad · 6 yrs · Python, PyTorch, LLMs' },
      { badge: 'Freelance', title: 'Siddharth Joshi · Full-Stack Developer', byline: 'Pune · 5 yrs · TypeScript, Go, Postgres' },
    ],
  },
  {
    id: 'product', label: 'Product', icon: Package, cta: 'List product',
    tagCls: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    main: {
      badge: 'Most Popular', title: 'DocOps Pro Suite',
      byline: '₹3,999 / workspace / month · Annual billing · GST inclusive',
      body: 'India\'s most complete document operations layer — unlimited templates, AI generation in 12 languages, Aadhaar eSign, GST invoicing, audit logs, and branded client portals. Zero per-seat pricing.',
      chips: ['Unlimited templates', 'AI (Hindi + English)', 'Aadhaar eSign', 'GST invoicing', 'DPDP compliant'],
    },
    minis: [
      { badge: 'Add-on', title: 'GST-Ready Invoice Automation Pack', byline: '₹999/mo · E-way bills, GSTR-1, UPI QR, IRN generation' },
      { badge: 'Enterprise', title: 'DPDP + IT Act Compliance Bundle', byline: 'Custom pricing · Consent mgmt, DLP, audit trails, eSign' },
    ],
  },
] as const;

/* ─── gigs data (India-based, MNC-grade) ────────────────────── */
const GIGS_DATA = [
  {
    id: 'g1',
    title: 'Senior React & TypeScript Developer',
    company: 'Razorpay',
    logo: 'RZ',
    logoBg: 'bg-blue-600',
    location: 'Bengaluru · Hybrid',
    budget: '₹80–120 LPA',
    type: 'Full-time',
    mode: 'apply',
    typeCls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    skills: ['React', 'TypeScript', 'Node.js', 'Postgres', 'Redis'] as readonly string[],
    description: 'Build the next generation of Razorpay\'s merchant-facing dashboard — used by 10M+ businesses. You\'ll own the payments UX across web and mobile, working with world-class engineers on high-scale systems.',
    requirements: [
      '5+ years of production React and TypeScript experience',
      'Hands-on with high-scale distributed systems (1M+ DAU)',
      'Strong CS fundamentals — data structures, system design, algorithms',
      'Familiarity with payments or fintech domains preferred',
      'Comfortable leading technical discussions and code reviews',
    ] as readonly string[],
    posted: '2 hrs ago',
    applicants: 48,
    openings: 3,
    deadline: '15 Jun 2026',
    experience: '5–10 yrs',
    companySize: '3,000+ employees',
    rating: 4.9,
    perks: ['ESOP', 'Remote Fridays', 'Health + Dental', 'Learning Budget ₹1L/yr'] as readonly string[],
    process: ['Application Review', 'Technical Screen', 'System Design', 'Bar Raiser', 'Offer'] as readonly string[],
  },
  {
    id: 'g2',
    title: 'Product Designer — Fintech',
    company: 'CRED',
    logo: 'CR',
    logoBg: 'bg-purple-600',
    location: 'Bengaluru · In-office',
    budget: '₹40–65 LPA',
    type: 'Full-time',
    mode: 'apply',
    typeCls: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    skills: ['Figma', 'Design Systems', 'Motion Design', 'User Research', 'A/B Testing'] as readonly string[],
    description: 'Design premium credit & rewards experiences for India\'s most curated consumer base — 12M+ creditworthy members. Drive end-to-end design for CRED\'s core credit card management and rewards loop.',
    requirements: [
      '4+ years of product design in consumer-facing apps',
      'Strong portfolio demonstrating end-to-end design process',
      'Experience with design systems and component libraries',
      'Passion for financial products and behavioural economics',
      'Motion design skills (Principle, After Effects) a plus',
    ] as readonly string[],
    posted: '5 hrs ago',
    applicants: 37,
    openings: 2,
    deadline: '20 Jun 2026',
    experience: '4–8 yrs',
    companySize: '1,500+ employees',
    rating: 4.8,
    perks: ['ESOP', 'MacBook Pro', 'Annual Trip', 'Flexible Hours'] as readonly string[],
    process: ['Portfolio Review', 'Design Exercise', 'Team Interview', 'Leadership Review', 'Offer'] as readonly string[],
  },
  {
    id: 'g3',
    title: 'ML Engineer — Recommendations',
    company: 'Meesho',
    logo: 'ME',
    logoBg: 'bg-pink-600',
    location: 'Bengaluru · Hybrid',
    budget: '₹45–75 LPA',
    type: 'Full-time',
    mode: 'apply',
    typeCls: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    skills: ['Python', 'PyTorch', 'Spark', 'Kafka', 'A/B Testing'] as readonly string[],
    description: 'Build personalised recommendation models powering Meesho\'s social commerce feed for 140M+ shoppers in Tier-2 and Tier-3 India. Real scale, real impact — from training to serving 1B+ predictions/day.',
    requirements: [
      '4+ years of applied ML/AI in production environments',
      'Experience with large-scale recommendation or ranking systems',
      'Proficiency in Python, PyTorch/TensorFlow, and distributed computing',
      'Strong understanding of A/B testing and experimentation frameworks',
      'Published research or open-source contributions preferred',
    ] as readonly string[],
    posted: '1 day ago',
    applicants: 62,
    openings: 4,
    deadline: '25 Jun 2026',
    experience: '4–9 yrs',
    companySize: '5,000+ employees',
    rating: 4.7,
    perks: ['ESOP', 'WFH Equipment', 'Sabbatical Leave', 'Patent Awards'] as readonly string[],
    process: ['ML Take-home', 'Technical Phone Screen', 'System Design', 'Culture Fit', 'Offer'] as readonly string[],
  },
  {
    id: 'g4',
    title: 'Backend Engineer — Payments Infrastructure',
    company: 'PhonePe',
    logo: 'PP',
    logoBg: 'bg-indigo-600',
    location: 'Bengaluru · Hybrid',
    budget: '₹50–90 LPA',
    type: 'Full-time',
    mode: 'apply',
    typeCls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    skills: ['Go', 'Java', 'Kafka', 'Kubernetes', 'gRPC'] as readonly string[],
    description: 'Scale the payments infrastructure processing ₹80,000 crore monthly TPV across UPI, wallet, and insurance. Design distributed systems for 99.99% uptime at 200M+ monthly active users.',
    requirements: [
      '5+ years of backend engineering in high-throughput systems',
      'Deep expertise in Go or Java for high-concurrency services',
      'Strong knowledge of distributed systems, consensus, and CAP theorem',
      'Experience with Kafka, Kubernetes, and cloud-native architectures',
      'Prior fintech/payments/banking domain experience strongly preferred',
    ] as readonly string[],
    posted: '1 day ago',
    applicants: 55,
    openings: 5,
    deadline: '30 Jun 2026',
    experience: '5–10 yrs',
    companySize: '4,000+ employees',
    rating: 4.9,
    perks: ['ESOP', 'Relocation Bonus', 'Health + OPD', 'Crèche Benefit'] as readonly string[],
    process: ['Coding Assessment', 'Technical Interview', 'System Design', 'Engineering Leadership', 'Offer'] as readonly string[],
  },
  {
    id: 'g5',
    title: 'Freelance UX Writer — App Copy',
    company: 'Zepto',
    logo: 'ZP',
    logoBg: 'bg-teal-600',
    location: 'Remote · India',
    budget: '₹2,500/hr',
    type: 'Freelance',
    mode: 'bid',
    typeCls: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    skills: ['UX Writing', 'Copy Strategy', 'Microcopy', 'Hindi', 'A/B Copy Tests'] as readonly string[],
    description: 'Write the copy that guides 10M+ customers through Zepto\'s 10-minute grocery experience — from onboarding nudges and cart abandonment flows to push notifications. Hindi + English bilingual preferred.',
    requirements: [
      '3+ years of UX writing for consumer mobile apps',
      'Fluency in Hindi and English — bilingual copy experience mandatory',
      'Strong portfolio of microcopy, onboarding flows, and error messages',
      'Experience with A/B copy testing and conversion optimisation',
      'Quick-commerce or e-commerce domain familiarity a bonus',
    ] as readonly string[],
    posted: '3 hrs ago',
    applicants: 19,
    openings: 1,
    deadline: '10 Jun 2026',
    experience: '3–6 yrs',
    companySize: '2,000+ employees',
    rating: 4.6,
    perks: ['Flexible Hours', 'Paid On Acceptance', 'Portfolio Rights', 'Repeat Opportunities'] as readonly string[],
    process: ['Portfolio Review', 'Copy Exercise', 'Video Call', 'Contract Signed', 'Start'] as readonly string[],
  },
  {
    id: 'g6',
    title: 'DevOps Engineer — Cloud & Security',
    company: 'CoinSwitch',
    logo: 'CS',
    logoBg: 'bg-slate-600',
    location: 'Bengaluru · Hybrid',
    budget: '₹35–55 LPA',
    type: 'Full-time',
    mode: 'apply',
    typeCls: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    skills: ['AWS', 'Terraform', 'Kubernetes', 'CI/CD', 'SOC 2'] as readonly string[],
    description: 'Own cloud security and infrastructure for India\'s largest crypto exchange — ₹75,000 crore AUM. Design zero-trust architecture, automated compliance pipelines, and 24/7 incident response playbooks.',
    requirements: [
      '4+ years of DevOps/SRE in cloud-native environments',
      'Expertise in AWS (or GCP/Azure), Terraform IaC, and Kubernetes',
      'Experience with security frameworks — SOC 2, ISO 27001, or DPDP',
      'Strong scripting in Python or Go for automation pipelines',
      'CISSP, AWS Security Specialty, or CKS certifications a plus',
    ] as readonly string[],
    posted: '2 days ago',
    applicants: 31,
    openings: 2,
    deadline: '5 Jul 2026',
    experience: '4–8 yrs',
    companySize: '800+ employees',
    rating: 4.8,
    perks: ['ESOP', 'Crypto Incentives', 'Annual Offsite', 'Learning Stipend'] as readonly string[],
    process: ['Resume Screen', 'Technical Assessment', 'Architecture Review', 'Culture Fit', 'Offer'] as readonly string[],
  },
];

/* ─── talents data (India-based) ────────────────────────────── */
const TALENTS_DATA = [
  {
    id: 't1',
    slug: 'ananya-krishnan',
    name: 'Ananya Krishnan',
    title: 'Senior Product Designer',
    avatar: 'AK',
    avatarBg: 'bg-emerald-600',
    location: 'Bengaluru, KA',
    experience: '9 yrs',
    rate: '₹18k/day',
    availability: 'Open to Work',
    availCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    skills: ['Figma', 'Design Systems', 'Bharat UX', 'User Research', 'Hindi UI'] as readonly string[],
    bio: 'I\'ve spent a decade designing products that 100M+ Indians actually use — from CRED\'s credit interface to Swiggy\'s reorder flow. I believe great design solves for the person who never reads instructions.',
    projects: 24,
    rating: 4.97,
    badges: ['Top Rated', 'Featured'],
    pastWork: ['CRED', 'Swiggy', 'Ministry of Railways'],
  },
  {
    id: 't2',
    slug: 'rohan-mehta',
    name: 'Rohan Mehta',
    title: 'ML Engineer & AI Researcher',
    avatar: 'RM',
    avatarBg: 'bg-blue-600',
    location: 'Hyderabad, TS',
    experience: '6 yrs',
    rate: '₹14k/day',
    availability: 'Available Now',
    availCls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    skills: ['Python', 'PyTorch', 'LLMs', 'RAG', 'MLOps'] as readonly string[],
    bio: 'Ex-Microsoft Research. I build LLM-powered products and fine-tuned models that ship to production — not just notebooks. Specialise in RAG pipelines, multi-modal models, and AI for Indic languages.',
    projects: 18,
    rating: 4.93,
    badges: ['Expert', 'AI Specialist'],
    pastWork: ['Microsoft Research', 'Sarvam AI', 'IIT Bombay Lab'],
  },
  {
    id: 't3',
    slug: 'siddharth-joshi',
    name: 'Siddharth Joshi',
    title: 'Full-Stack Developer',
    avatar: 'SJ',
    avatarBg: 'bg-violet-600',
    location: 'Pune, MH',
    experience: '5 yrs',
    rate: '₹8k/day',
    availability: 'Freelance',
    availCls: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    skills: ['TypeScript', 'Next.js', 'Go', 'Postgres', 'Docker'] as readonly string[],
    bio: 'Indie developer who\'s shipped three SaaS products from scratch. I own the full stack — from Go APIs and Postgres schemas to React UIs and CI/CD. Fast iterations, clean code, zero fluff.',
    projects: 31,
    rating: 4.91,
    badges: ['Rising Star', 'Verified'],
    pastWork: ['Zoho', 'ThoughtWorks', 'Indie SaaS'],
  },
  {
    id: 't4',
    slug: 'priya-nair',
    name: 'Priya Nair',
    title: 'Content Strategist & UX Writer',
    avatar: 'PN',
    avatarBg: 'bg-rose-600',
    location: 'Kochi, KL',
    experience: '7 yrs',
    rate: '₹6k/day',
    availability: 'Part-time',
    availCls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    skills: ['UX Writing', 'Content Strategy', 'SEO', 'Malayalam', 'Hindi'] as readonly string[],
    bio: 'I write the words that help people use products. From fintech onboarding copy to multilingual micro-interactions for 50M+ users. Former Paytm, now crafting clarity for B2B SaaS and consumer apps.',
    projects: 43,
    rating: 4.88,
    badges: ['Top Rated', 'Multilingual'],
    pastWork: ['Paytm', 'Freshworks', 'Nykaa'],
  },
  {
    id: 't5',
    slug: 'vikram-singh',
    name: 'Vikram Singh',
    title: 'DevOps & Cloud Architect',
    avatar: 'VS',
    avatarBg: 'bg-cyan-700',
    location: 'Delhi NCR',
    experience: '10 yrs',
    rate: '₹20k/day',
    availability: 'Contract',
    availCls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    skills: ['AWS', 'GCP', 'Terraform', 'Kubernetes', 'SOC 2'] as readonly string[],
    bio: 'Cloud architect who\'s designed infra for three unicorn-stage startups. I turn chaotic EC2 sprawl into zero-trust, auto-scaling, SOC-2-compliant cloud systems — then document it properly so it doesn\'t need me forever.',
    projects: 15,
    rating: 4.95,
    badges: ['Expert', 'Certified AWS SA'],
    pastWork: ['Ola', 'HDFC Digital', 'Pine Labs'],
  },
  {
    id: 't6',
    slug: 'meera-iyer',
    name: 'Meera Iyer',
    title: 'Brand Designer & Motion Artist',
    avatar: 'MI',
    avatarBg: 'bg-fuchsia-600',
    location: 'Chennai, TN',
    experience: '6 yrs',
    rate: '₹9k/day',
    availability: 'Open to Work',
    availCls: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
    skills: ['Figma', 'After Effects', 'Lottie', 'Brand Identity', 'Tamil UI'] as readonly string[],
    bio: 'I design brands that move — literally. From logo animations and app motion design to full visual identity systems. My work has shipped in apps with 20M+ downloads across India and SE Asia.',
    projects: 38,
    rating: 4.92,
    badges: ['Creative', 'Motion Expert'],
    pastWork: ['Dream11', 'Sharechat', 'Tata Digital'],
  },
] as const;

/* ─── india highlights (mock data) ─────────────────────────── */
const INDIA_HIGHLIGHTS = [
  {
    title: 'GST-ready invoices',
    description: 'Generate invoices with GSTIN validation, UPI QR, and clean export-ready PDFs.',
    badge: 'Compliance',
    meta: 'Mumbai · Retail',
    Icon: FileText,
  },
  {
    title: 'Offer letters in minutes',
    description: 'Create offer letters with CTC breakdowns, probation terms, and joining dates.',
    badge: 'HR',
    meta: 'Bengaluru · SaaS',
    Icon: Briefcase,
  },
  {
    title: 'DPDP-friendly sharing',
    description: 'Password-protect sensitive files, set expiry, and track access with audit trails.',
    badge: 'Security',
    meta: 'Delhi NCR · Legal',
    Icon: FolderLock,
  },
  {
    title: 'Aadhaar eSign workflows',
    description: 'Collect signatures securely with signer tracking and field placement.',
    badge: 'E‑Sign',
    meta: 'Hyderabad · Fintech',
    Icon: FileSignature,
  },
  {
    title: 'Client onboarding forms',
    description: 'Collect GST, billing address, scope, and file uploads in one shareable form.',
    badge: 'Forms',
    meta: 'Pune · Services',
    Icon: FormInput,
  },
  {
    title: 'Instant contract summaries',
    description: 'Extract key clauses, risks, dates, and missing terms from long agreements.',
    badge: 'AI',
    meta: 'Chennai · Enterprise',
    Icon: Wand2,
  },
  {
    title: 'Invoice data extraction',
    description: 'Pull line items, totals, and vendor details from scans and images.',
    badge: 'Automation',
    meta: 'Ahmedabad · Manufacturing',
    Icon: Search,
  },
  {
    title: 'Secure file portals',
    description: 'Share large files with access controls and branded client portals.',
    badge: 'Sharing',
    meta: 'Kolkata · Agency',
    Icon: Share2,
  },
] as const;

type PSMain = { badge: string; title: string; byline: string; body: string; stats?: { v: string; l: string }[]; chips?: readonly string[] };
type PSMini = { badge: string; title: string; byline: string };

type SliderDetails =
  | { kind: 'welcome'; title: string; description: string; prompt: string }
  | { kind: 'india'; title: string; description: string; badge: string; meta: string }
  | { kind: 'publish-main'; badge: string; title: string; byline: string; body: string; chips?: readonly string[]; stats?: { v: string; l: string }[] }
  | { kind: 'publish-mini'; badge: string; title: string; byline: string }
  | { kind: 'gig'; id: string; title: string; company: string; logo: string; logoBg: string; location: string; budget: string; type: string; mode: 'apply' | 'bid'; typeCls: string; skills: readonly string[]; description: string; requirements: readonly string[]; posted: string; applicants: number; openings: number; deadline: string; experience: string; companySize: string; rating: number; perks: readonly string[]; process: readonly string[] }
  | { kind: 'talent'; id: string; slug: string; name: string; title: string; location: string; experience: string; rate: string; availability: string; availCls: string; skills: readonly string[]; bio: string; projects: number; rating: number; badges: readonly string[]; pastWork: readonly string[] };

function DetailsDialog({
  open,
  onOpenChange,
  details,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  details: SliderDetails | null;
}) {
  /* ── Gig apply/bid form state ── */
  const [applyStage, setApplyStage] = useState<'idle' | 'form' | 'success'>('idle');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formExp, setFormExp] = useState('');
  const [formCover, setFormCover] = useState('');
  const [formLinks, setFormLinks] = useState('');
  const [bidAmt, setBidAmt] = useState('');
  const [bidTimeline, setBidTimeline] = useState('');
  const [bidPitch, setBidPitch] = useState('');
  const detailsKey = details?.kind === 'gig' ? details.id : (details?.kind ?? '');
  useEffect(() => {
    setApplyStage('idle');
    setFormName(''); setFormEmail(''); setFormExp(''); setFormCover(''); setFormLinks('');
    setBidAmt(''); setBidTimeline(''); setBidPitch('');
  }, [detailsKey]);

  const isGig = details?.kind === 'gig';
  const title = details?.kind === 'talent' ? details.name : (isGig && applyStage === 'form') ? (details.mode === 'bid' ? 'Place a Bid' : 'Apply Now') : details?.title || 'Details';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] w-[92vw] max-w-[740px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[88dvh] rounded-[28px] border border-white/10 bg-slate-950/90 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="text-xl font-semibold tracking-[-0.03em] text-white">{title}</Dialog.Title>
              {details?.kind === 'india' ? (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/55">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-semibold uppercase tracking-[0.18em] text-white/70">{details.badge}</span>
                  <span>{details.meta}</span>
                </div>
              ) : details?.kind === 'publish-main' ? (
                <div className="mt-1 text-xs text-white/50">{details.byline}</div>
              ) : details?.kind === 'publish-mini' ? (
                <div className="mt-1 text-xs text-white/50">{details.byline}</div>
              ) : details?.kind === 'welcome' ? (
                <div className="mt-1 text-xs text-white/50">Suggested prompt inside</div>
              ) : details?.kind === 'gig' && applyStage === 'idle' ? (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/55">
                  <span className={`rounded-full border px-2.5 py-1 font-semibold ${details.typeCls}`}>{details.type}</span>
                  <span>{details.company} · {details.location}</span>
                </div>
              ) : details?.kind === 'talent' ? (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/55">
                  <span className={`rounded-full border px-2.5 py-1 font-semibold ${details.availCls}`}>{details.availability}</span>
                  <span>{details.title} · {details.location}</span>
                </div>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {details?.kind === 'welcome' ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm leading-relaxed text-white/70">{details.description}</p>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">prompt</div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{details.prompt}</div>
              </div>
            </div>
          ) : details?.kind === 'india' ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm leading-relaxed text-white/70">{details.description}</p>
            </div>
          ) : details?.kind === 'publish-main' ? (
            <div className="mt-5 space-y-4">
              <p className="text-sm leading-relaxed text-white/70">{details.body}</p>
              {details.chips?.length ? (
                <div className="flex flex-wrap gap-2">
                  {details.chips.map((chip) => (
                    <span key={chip} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">{chip}</span>
                  ))}
                </div>
              ) : null}
              {details.stats?.length ? (
                <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  {details.stats.map((s) => (
                    <div key={s.l}>
                      <div className="text-lg font-semibold text-white">{s.v}</div>
                      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">{s.l}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : details?.kind === 'publish-mini' ? (
            <div className="mt-5 space-y-3">
              <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/70">{details.badge}</span>
              <p className="text-sm leading-relaxed text-white/70">{details.title}</p>
            </div>

          ) : details?.kind === 'gig' ? (
            <div className="mt-5 space-y-5">
              {/* ── Success state ── */}
              {applyStage === 'success' ? (
                <div className="flex flex-col items-center gap-5 py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                    <Check className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-white">
                      {details.mode === 'bid' ? 'Bid Submitted!' : 'Application Sent!'}
                    </div>
                    <div className="mt-1 text-xs font-mono text-white/40 tracking-widest">
                      REF: {`DOC-${details.id.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`}
                    </div>
                  </div>
                  <p className="max-w-sm text-sm leading-relaxed text-white/60">
                    {details.mode === 'bid'
                      ? `${details.company} will review your bid and respond within 2–3 business days.`
                      : `Your application for ${details.title} at ${details.company} has been received. Expect a response within 5–7 business days.`}
                  </p>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setApplyStage('idle')}
                      className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      Back to role
                    </button>
                  </div>
                </div>

              ) : applyStage === 'form' ? (
                /* ── Application / Bid form ── */
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${details.logoBg} text-sm font-bold text-white shadow-md`}>
                      {details.logo}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{details.title}</div>
                      <div className="text-xs text-white/45">{details.company} · {details.location} · {details.budget}</div>
                    </div>
                  </div>

                  {details.mode === 'apply' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Full Name *</label>
                          <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Rahul Sharma"
                            className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/20 focus:border-white/20 focus:outline-none transition" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Email *</label>
                          <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="you@company.com" type="email"
                            className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/20 focus:border-white/20 focus:outline-none transition" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Years of Relevant Experience *</label>
                        <select value={formExp} onChange={(e) => setFormExp(e.target.value)}
                          className="h-10 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white focus:border-white/20 focus:outline-none transition">
                          <option value="">Select range</option>
                          <option>1–2 years</option><option>3–4 years</option><option>5–7 years</option><option>8–12 years</option><option>12+ years</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">LinkedIn / Portfolio / GitHub</label>
                        <input value={formLinks} onChange={(e) => setFormLinks(e.target.value)} placeholder="https://linkedin.com/in/yourprofile"
                          className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/20 focus:border-white/20 focus:outline-none transition" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Cover Letter <span className="normal-case text-white/30">(optional)</span></label>
                        <textarea value={formCover} onChange={(e) => setFormCover(e.target.value)} rows={4}
                          placeholder={`Why are you a great fit for ${details.company}?`}
                          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white placeholder:text-white/20 focus:border-white/20 focus:outline-none transition" />
                      </div>
                    </div>
                  ) : (
                    /* Bid form */
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Client ask rate</div>
                        <div className="mt-1 text-xl font-bold text-white">{details.budget}</div>
                        <div className="mt-0.5 text-xs text-white/35">Submit your competitive rate below to stand out</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Your Bid Rate *</label>
                          <input value={bidAmt} onChange={(e) => setBidAmt(e.target.value)} placeholder="₹2,200/hr"
                            className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/20 focus:border-white/20 focus:outline-none transition" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Timeline *</label>
                          <select value={bidTimeline} onChange={(e) => setBidTimeline(e.target.value)}
                            className="h-10 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white focus:border-white/20 focus:outline-none transition">
                            <option value="">Select timeline</option>
                            <option>1–2 weeks</option><option>2–4 weeks</option><option>1–2 months</option><option>2–4 months</option><option>Ongoing engagement</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Your Pitch *</label>
                        <textarea value={bidPitch} onChange={(e) => setBidPitch(e.target.value)} rows={5}
                          placeholder="Describe your approach, relevant experience, and why you're the right fit for this project..."
                          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white placeholder:text-white/20 focus:border-white/20 focus:outline-none transition" />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setApplyStage('success')}
                      disabled={details.mode === 'apply' ? (!formName || !formEmail || !formExp) : (!bidAmt || !bidTimeline || !bidPitch)}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/70 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-xl transition hover:bg-black/90 hover:border-white/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {details.mode === 'bid' ? 'Submit Bid' : 'Submit Application'}
                      <Send className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setApplyStage('idle')}
                      className="h-11 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-medium text-white/60 transition hover:bg-white/10 hover:text-white">
                      Cancel
                    </button>
                  </div>
                </div>

              ) : (
                /* ── Main gig detail view ── */
                <>
                  {/* Company banner */}
                  <div className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${details.logoBg} text-base font-bold text-white shadow-lg ring-2 ring-white/10`}>
                      {details.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white">{details.company}</span>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map((i) => (
                            <span key={i} className={`text-[11px] ${i <= Math.round(details.rating) ? 'text-yellow-400' : 'text-white/15'}`}>★</span>
                          ))}
                          <span className="ml-1 text-[11px] text-white/45">{details.rating}</span>
                        </div>
                      </div>
                      <div className="mt-0.5 text-xs text-white/40">{details.companySize} · {details.location}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${details.typeCls}`}>{details.type}</span>
                      <span className="text-[10px] text-white/30">Posted {details.posted}</span>
                    </div>
                  </div>

                  {/* Urgency bar */}
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-white/55">{details.applicants} applicants · {details.openings} opening{details.openings > 1 ? 's' : ''}</span>
                      <span className="text-[11px] text-white/40">Deadline: <span className="font-semibold text-white/60">{details.deadline}</span></span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-white/50 to-white/30 transition-all duration-500"
                        style={{ width: `${Math.min(96, Math.round((details.applicants / (details.openings * 70)) * 100))}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-white/30">{details.experience} exp required</span>
                      <span className={`text-[10px] font-semibold ${details.applicants < 25 ? 'text-emerald-400' : details.applicants < 55 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {details.applicants < 25 ? '✦ Apply early — low competition' : details.applicants < 55 ? 'Filling fast' : 'High competition'}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { v: details.budget, l: 'Compensation' },
                      { v: String(details.applicants), l: 'Applicants' },
                      { v: `${details.rating}★`, l: 'Employer Rating' },
                    ].map((s) => (
                      <div key={s.l} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-center">
                        <div className="text-[15px] font-bold text-white leading-tight">{s.v}</div>
                        <div className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-white/35">{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* About the role */}
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">About the Role</div>
                    <p className="text-sm leading-relaxed text-white/65">{details.description}</p>
                  </div>

                  {/* Requirements */}
                  <div>
                    <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">Requirements</div>
                    <div className="space-y-2">
                      {details.requirements.map((r, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="mt-[4px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                            <div className="h-1.5 w-1.5 rounded-full bg-white/35" />
                          </div>
                          <span className="text-sm leading-relaxed text-white/60">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">Skills Required</div>
                    <div className="flex flex-wrap gap-1.5">
                      {details.skills.map((s) => (
                        <span key={s} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/65">{s}</span>
                      ))}
                    </div>
                  </div>

                  {/* Hiring process */}
                  <div>
                    <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">Hiring Process</div>
                    <div className="flex items-start gap-0 overflow-x-auto pb-1 no-scrollbar">
                      {details.process.map((stage, i) => (
                        <div key={stage} className="flex shrink-0 items-center">
                          <div className="flex flex-col items-center gap-1.5 px-1">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-[11px] font-bold text-white/60">
                              {i + 1}
                            </div>
                            <span className="w-[70px] text-center text-[9px] font-medium leading-tight text-white/35">{stage}</span>
                          </div>
                          {i < details.process.length - 1 && (
                            <div className="mb-4 h-px w-5 shrink-0 bg-white/[0.08]" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Perks */}
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">Perks & Benefits</div>
                    <div className="flex flex-wrap gap-1.5">
                      {details.perks.map((p) => (
                        <span key={p} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">{p}</span>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex flex-wrap gap-3 border-t border-white/[0.07] pt-5">
                    <button
                      type="button"
                      onClick={() => setApplyStage('form')}
                      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-black/70 px-5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-xl transition hover:bg-black/90 hover:border-white/20 active:scale-95"
                    >
                      {details.mode === 'bid' ? 'Place a Bid' : 'Apply Now'} <ArrowRight className="h-4 w-4" />
                    </button>
                    <button type="button" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
                      Save Role
                    </button>
                    <button type="button" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </button>
                  </div>
                </>
              )}
            </div>

          ) : details?.kind === 'talent' ? (
            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: details.experience, l: 'Experience' },
                  { v: details.rate, l: 'Day Rate' },
                  { v: `${details.rating}★`, l: 'Rating' },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 text-center">
                    <div className="text-base font-bold text-white">{s.v}</div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">{s.l}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-white/70">{details.bio}</p>
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {details.skills.map((s) => (
                    <span key={s} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">Past Work</div>
                <div className="flex flex-wrap gap-1.5">
                  {details.pastWork.map((p) => (
                    <span key={p} className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">{p}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {details.badges.map((b) => (
                  <span key={b} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">{b}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 border-t border-white/[0.07] pt-5">
                <Link href={`/talent/${details.slug}`}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-black/70 px-5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-xl transition hover:bg-black/90 hover:border-white/20 active:scale-95">
                  View Full Profile <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/talent"
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white">
                  Send Message
                </Link>
                <Link href="/talent"
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white">
                  Hire This Talent
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-5 text-sm text-white/60">No details available.</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PublishShowcase({
  onPublishClick,
  onViewDetails,
}: {
  onPublishClick: () => void;
  onViewDetails: (details: SliderDetails) => void;
}) {
  return (
    <section className="w-full pb-6">
      <div className="px-4 sm:px-8">
        {/* heading */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40 sm:text-[11px]">everything worth sharing</p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl">
              Publish anything.{' '}
              <span className="text-white/80">
                Make it matter.
              </span>
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-white/50">
              News, articles, docs, portfolios, announcements, jobs, resumes, products — all polished and ready in minutes.
            </p>
          </div>
          <button
            type="button"
            onClick={onPublishClick}
            className="hidden sm:inline-flex h-9 shrink-0 items-center gap-1.5 rounded-2xl border border-white/10 bg-black/70 px-4 text-xs font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-xl transition hover:bg-black/90 hover:border-white/20 active:scale-95"
          >
            Start publishing <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

        {/* slider */}
        <div className="mt-8">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const node = document.getElementById('publish-showcase-scroller');
                if (!node) return;
                node.scrollBy({ left: -Math.max(260, Math.round(node.clientWidth * 0.85)), behavior: 'smooth' });
              }}
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur-xl transition hover:bg-black/60 hover:text-white"
              aria-label="Scroll left"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => {
                const node = document.getElementById('publish-showcase-scroller');
                if (!node) return;
                node.scrollBy({ left: Math.max(260, Math.round(node.clientWidth * 0.85)), behavior: 'smooth' });
              }}
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur-xl transition hover:bg-black/60 hover:text-white"
              aria-label="Scroll right"
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </button>

            {/* Left smoke fade */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-16 sm:w-24 bg-gradient-to-r from-black via-black/60 to-transparent" />
            {/* Right smoke fade */}
            <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-16 sm:w-24 bg-gradient-to-l from-black via-black/60 to-transparent" />

            <div
              id="publish-showcase-scroller"
              data-auto-slider="true"
              data-auto-loop="end"
              data-auto-speed="0.32"
              className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-4 sm:px-8"
              style={{ scrollBehavior: 'auto' }}
            >
              {PUBLISH_SHOWCASE.map((cat) => {
                const CatIcon = cat.icon;
                const m = cat.main as PSMain;
                return (
                  <article
                    key={cat.id}
                    className="snap-start flex w-[min(300px,80vw)] sm:w-[330px] shrink-0 flex-col rounded-[24px] border border-white/[0.09] bg-white/[0.05] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-[3px] hover:border-white/[0.16] hover:bg-white/[0.08]"
                  >
                    {/* category label + icon */}
                    <div className="flex items-start justify-between gap-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${cat.tagCls}`}>
                        <CatIcon className="h-3 w-3" />
                        {cat.label}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${cat.tagCls}`}>
                        {m.badge}
                      </span>
                    </div>

                    {/* title */}
                    <h3 className="mt-4 text-[14.5px] font-bold leading-snug tracking-[-0.025em] text-white line-clamp-2">
                      {m.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-white/35 line-clamp-1">{m.byline}</p>

                    {/* body */}
                    <p className="mt-3 text-[12.5px] leading-[1.65] text-white/55 line-clamp-3">{m.body}</p>

                    {/* chips or stats */}
                    {m.chips ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {m.chips.slice(0, 3).map((chip) => (
                          <span key={chip} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-white/55">
                            {chip}
                          </span>
                        ))}
                        {m.chips.length > 3 && (
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-white/35">
                            +{m.chips.length - 3}
                          </span>
                        )}
                      </div>
                    ) : m.stats ? (
                      <div className="mt-3 flex gap-4 border-t border-white/[0.06] pt-3">
                        {m.stats.slice(0, 3).map((s) => (
                          <div key={s.l}>
                            <p className="text-sm font-bold text-white">{s.v}</p>
                            <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/30">{s.l}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* footer CTAs */}
                    <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-4 mt-4">
                      <button
                        type="button"
                        onClick={onPublishClick}
                        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-black/70 px-3 text-[12px] font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-xl transition hover:bg-black/90 hover:border-white/20 active:scale-95"
                      >
                        {cat.cta} <ArrowRight className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewDetails({
                          kind: 'publish-main',
                          badge: m.badge,
                          title: m.title,
                          byline: m.byline,
                          body: m.body,
                          chips: m.chips,
                          stats: m.stats,
                        })}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/50 transition hover:text-white"
                      >
                        View details <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Live Gig Opportunities (part of Publish section) ── */}
        <div className="mt-14 border-t border-white/[0.06] pt-10">
          <div className="flex items-end justify-between gap-4 px-4 sm:px-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40 sm:text-[11px]">live opportunities</p>
              <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">
                Gigs & Jobs
              </h3>
              <p className="mt-1 max-w-md text-sm leading-6 text-white/50">
                Top roles from India&apos;s fastest-growing companies — full-time, freelance, and contract.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <div className="relative">
              <button
                type="button"
                onClick={() => { const n = document.getElementById('gigs-scroller'); n?.scrollBy({ left: -Math.max(240, Math.round(n.clientWidth * 0.85)), behavior: 'smooth' }); }}
                className="hidden md:flex absolute left-2 top-[45%] -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur-xl transition hover:bg-black/60 hover:text-white"
                aria-label="Scroll left"
              ><ChevronDown className="h-4 w-4 rotate-90" /></button>
              <button
                type="button"
                onClick={() => { const n = document.getElementById('gigs-scroller'); n?.scrollBy({ left: Math.max(240, Math.round(n.clientWidth * 0.85)), behavior: 'smooth' }); }}
                className="hidden md:flex absolute right-2 top-[45%] -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur-xl transition hover:bg-black/60 hover:text-white"
                aria-label="Scroll right"
              ><ChevronDown className="h-4 w-4 -rotate-90" /></button>
              {/* Left smoke fade */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-16 sm:w-24 bg-gradient-to-r from-black via-black/60 to-transparent" />
              {/* Right smoke fade */}
              <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-16 sm:w-24 bg-gradient-to-l from-black via-black/60 to-transparent" />

              <div
                id="gigs-scroller"
                data-auto-slider="true"
                data-auto-loop="end"
                data-auto-speed="0.28"
                className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-4 sm:px-8"
                style={{ scrollBehavior: 'auto' }}
              >
                {GIGS_DATA.map((g) => (
                  <article
                    key={g.id}
                    className="snap-start flex w-[min(300px,80vw)] sm:w-[330px] shrink-0 flex-col rounded-[24px] border border-white/[0.09] bg-white/[0.05] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-[3px] hover:border-white/[0.16] hover:bg-white/[0.08]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${g.logoBg} text-sm font-bold text-white shadow-lg ring-1 ring-white/10`}>
                        {g.logo}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${g.typeCls}`}>{g.type}</span>
                        {g.mode === 'bid' && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold text-white/40 uppercase tracking-wide">Bidding open</span>
                        )}
                      </div>
                    </div>
                    <h3 className="mt-3.5 text-[14.5px] font-bold leading-snug tracking-[-0.025em] text-white line-clamp-2">{g.title}</h3>
                    <p className="mt-0.5 text-[11px] text-white/40">{g.company} · {g.location}</p>
                    <div className="mt-3 inline-flex w-fit rounded-xl border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-sm font-semibold text-white">{g.budget}</div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {g.skills.slice(0, 3).map((s) => (
                        <span key={s} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[10.5px] font-medium text-white/60">{s}</span>
                      ))}
                      {g.skills.length > 3 && <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[10.5px] font-medium text-white/35">+{g.skills.length - 3}</span>}
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-4 mt-4">
                      <div>
                        <span className="text-[10.5px] text-white/35">{g.posted} · {g.applicants} applied</span>
                        <div className="mt-0.5 text-[10px] text-white/25">{g.openings} opening{g.openings > 1 ? 's' : ''} · Deadline {g.deadline}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onViewDetails({
                          kind: 'gig', id: g.id, title: g.title, company: g.company, logo: g.logo, logoBg: g.logoBg,
                          location: g.location, budget: g.budget, type: g.type, mode: g.mode as 'apply' | 'bid', typeCls: g.typeCls,
                          skills: g.skills, description: g.description, requirements: g.requirements, posted: g.posted,
                          applicants: g.applicants, openings: g.openings, deadline: g.deadline, experience: g.experience,
                          companySize: g.companySize, rating: g.rating, perks: g.perks, process: g.process,
                        })}
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-white/55 transition hover:text-white"
                      >
                        {g.mode === 'bid' ? 'Place bid' : 'View & apply'} <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
    </section>
  );
}

function TalentsSection({ onViewDetails }: { onViewDetails: (d: SliderDetails) => void }) {
  return (
    <section className="reveal-on-scroll mt-16 w-full" data-reveal data-delay="80">
      <div className="px-4 sm:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40 sm:text-[11px]">verified professionals</p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl">
              Talent Network
            </h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-white/50">
              Senior designers, engineers, and writers from top Indian companies — ready to hire.
            </p>
          </div>
          <Link
            href="/talent"
            className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Browse all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

        <div className="mt-8">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const node = document.getElementById('talents-scroller');
                if (!node) return;
                node.scrollBy({ left: -Math.max(240, Math.round(node.clientWidth * 0.85)), behavior: 'smooth' });
              }}
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur-xl transition hover:bg-black/60 hover:text-white"
              aria-label="Scroll left"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => {
                const node = document.getElementById('talents-scroller');
                if (!node) return;
                node.scrollBy({ left: Math.max(240, Math.round(node.clientWidth * 0.85)), behavior: 'smooth' });
              }}
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur-xl transition hover:bg-black/60 hover:text-white"
              aria-label="Scroll right"
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </button>

            {/* Left smoke fade */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-16 sm:w-24 bg-gradient-to-r from-black via-black/60 to-transparent" />
            {/* Right smoke fade */}
            <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-16 sm:w-24 bg-gradient-to-l from-black via-black/60 to-transparent" />

            <div
              id="talents-scroller"
              data-auto-slider="true"
              data-auto-loop="end"
              data-auto-speed="0.28"
              className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-4 sm:px-8"
              style={{ scrollBehavior: 'auto' }}
            >
              {TALENTS_DATA.map((t) => (
                <article
                  key={t.id}
                  className="snap-start flex w-[min(300px,80vw)] sm:w-[330px] shrink-0 flex-col rounded-[24px] border border-white/[0.09] bg-white/[0.05] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-[3px] hover:border-white/[0.16] hover:bg-white/[0.08] hover:shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
                >
                  {/* Avatar + availability */}
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${t.avatarBg} text-base font-bold text-white shadow-lg`}>
                      {t.avatar}
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${t.availCls}`}>
                      {t.availability}
                    </span>
                  </div>

                  {/* Name + title */}
                  <div className="mt-3.5">
                    <h3 className="text-[15px] font-bold tracking-[-0.025em] text-white">{t.name}</h3>
                    <p className="mt-0.5 text-xs text-white/45">{t.title}</p>
                  </div>

                  {/* Stats row */}
                  <div className="mt-3 flex gap-4 text-xs">
                    <div>
                      <span className="font-semibold text-white">{t.experience}</span>
                      <span className="ml-1 text-white/40">exp</span>
                    </div>
                    <div>
                      <span className="font-semibold text-white">{t.projects}</span>
                      <span className="ml-1 text-white/40">projects</span>
                    </div>
                    <div>
                      <span className="font-semibold text-white">{t.rating}★</span>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.skills.slice(0, 3).map((s) => (
                      <span key={s} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[10.5px] font-medium text-white/60">
                        {s}
                      </span>
                    ))}
                    {t.skills.length > 3 && (
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[10.5px] font-medium text-white/40">
                        +{t.skills.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Rate + CTA */}
                  <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-4 mt-4">
                    <div>
                      <span className="text-sm font-bold text-white">{t.rate}</span>
                      <span className="ml-1 text-[11px] text-white/35">· {t.location}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onViewDetails({
                        kind: 'talent',
                        id: t.id,
                        slug: t.slug,
                        name: t.name,
                        title: t.title,
                        location: t.location,
                        experience: t.experience,
                        rate: t.rate,
                        availability: t.availability,
                        availCls: t.availCls,
                        skills: t.skills,
                        bio: t.bio,
                        projects: t.projects,
                        rating: t.rating,
                        badges: t.badges,
                        pastWork: t.pastWork,
                      })}
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-white/60 transition hover:text-white"
                    >
                      View details <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
    </section>
  );
}

function compactText(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 1500);
}

function formatBytes(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = sizeBytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 ? Math.round(value) : Math.round(value * 10) / 10} ${units[unitIndex]}`;
}

function guessExtension(name: string) {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

function formatRelative(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  const sameDay = new Date(now).toDateString() === date.toDateString();
  if (sameDay) return `Today, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildWelcomeMessages(): ChatMessage[] {
  return [];
}

/* ─────────────────────────────────────────────────────────────
   AnimatedSphere — dark 3-D globe for the hero banner
───────────────────────────────────────────────────────────── */
function AnimatedSphere() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="sg-base" cx="36%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#252830" />
          <stop offset="55%" stopColor="#111316" />
          <stop offset="100%" stopColor="#070809" />
        </radialGradient>
        <radialGradient id="sg-shine" cx="26%" cy="20%" r="46%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.20)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id="sg-teal" cx="70%" cy="75%" r="40%">
          <stop offset="0%" stopColor="rgba(52,211,153,0.14)" />
          <stop offset="100%" stopColor="rgba(52,211,153,0)" />
        </radialGradient>
        <clipPath id="sg-clip">
          <circle cx="100" cy="100" r="88" />
        </clipPath>
        <style>{`
          @keyframes sg-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes sg-spin-slow { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
          @keyframes sg-pulse { 0%,100% { opacity:0.55; } 50% { opacity:1; } }
          .sg-lat { animation: sg-spin 20s linear infinite; transform-origin: 100px 100px; }
          .sg-mer { animation: sg-spin-slow 28s linear infinite; transform-origin: 100px 100px; }
          .sg-glow { animation: sg-pulse 4s ease-in-out infinite; }
        `}</style>
      </defs>
      {/* Drop shadow */}
      <ellipse cx="100" cy="196" rx="68" ry="7" fill="rgba(0,0,0,0.4)" />
      {/* Base sphere */}
      <circle cx="100" cy="100" r="88" fill="url(#sg-base)" />
      {/* Teal accent glow on lower-right */}
      <circle cx="100" cy="100" r="88" fill="url(#sg-teal)" className="sg-glow" />
      {/* Latitude grid lines */}
      <g clipPath="url(#sg-clip)" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.85" className="sg-lat">
        {([-60, -44, -28, -12, 4, 20, 36, 52, 68] as const).map((lat) => {
          const ry = Math.sqrt(Math.max(0, 88 * 88 - lat * lat));
          return <ellipse key={`lat${lat}`} cx="100" cy={100 + lat} rx={ry} ry={ry * 0.30} />;
        })}
      </g>
      {/* Meridian grid lines */}
      <g clipPath="url(#sg-clip)" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.85" className="sg-mer">
        {([0, 36, 72, 108, 144] as const).map((angle) => (
          <ellipse
            key={`mer${angle}`}
            cx="100" cy="100"
            rx={Math.max(2, 88 * Math.abs(Math.cos((angle * Math.PI) / 180)))}
            ry="88"
            transform={`rotate(${angle} 100 100)`}
          />
        ))}
      </g>
      {/* Specular highlight */}
      <circle cx="100" cy="100" r="88" fill="url(#sg-shine)" />
      {/* Rim highlight */}
      <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
      {/* Teal accent dot */}
      <circle cx="142" cy="138" r="4" fill="rgba(52,211,153,0.6)" className="sg-glow" />
      <circle cx="142" cy="138" r="8" fill="rgba(52,211,153,0.12)" className="sg-glow" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   FeedIllustration — SVG art per feed category
───────────────────────────────────────────────────────────── */
function FeedIllustration({ kind }: { kind: string }) {
  if (kind === 'design') return (
    <svg viewBox="0 0 120 80" className="h-full w-full opacity-90" aria-hidden="true">
      <defs>
        <linearGradient id="fi-d1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <polygon points="60,8 95,30 95,60 60,72 25,60 25,30" fill="none" stroke="url(#fi-d1)" strokeWidth="1.5" />
      <polygon points="60,20 82,34 82,56 60,64 38,56 38,34" fill="rgba(236,72,153,0.08)" stroke="rgba(236,72,153,0.3)" strokeWidth="1" />
      <line x1="60" y1="8" x2="60" y2="72" stroke="rgba(139,92,246,0.25)" strokeWidth="0.8" />
      <line x1="25" y1="30" x2="95" y2="60" stroke="rgba(236,72,153,0.20)" strokeWidth="0.8" />
      <line x1="95" y1="30" x2="25" y2="60" stroke="rgba(236,72,153,0.20)" strokeWidth="0.8" />
      <circle cx="60" cy="40" r="5" fill="rgba(236,72,153,0.5)" />
    </svg>
  );
  if (kind === 'code') return (
    <svg viewBox="0 0 120 80" className="h-full w-full opacity-90" aria-hidden="true">
      <defs>
        <linearGradient id="fi-c1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <rect x="10" y="12" width="100" height="56" rx="6" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.2)" strokeWidth="1" />
      <circle cx="22" cy="24" r="3" fill="rgba(239,68,68,0.6)" />
      <circle cx="33" cy="24" r="3" fill="rgba(234,179,8,0.6)" />
      <circle cx="44" cy="24" r="3" fill="rgba(34,197,94,0.6)" />
      <line x1="18" y1="38" x2="50" y2="38" stroke="rgba(16,185,129,0.6)" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="47" x2="75" y2="47" stroke="rgba(59,130,246,0.5)" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="56" x2="62" y2="56" stroke="rgba(16,185,129,0.4)" strokeWidth="2" strokeLinecap="round" />
      <polygon points="90,30 106,40 90,50" fill="rgba(16,185,129,0.3)" />
    </svg>
  );
  if (kind === 'writing') return (
    <svg viewBox="0 0 120 80" className="h-full w-full opacity-90" aria-hidden="true">
      <defs>
        <linearGradient id="fi-w1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <rect x="18" y="10" width="64" height="60" rx="4" fill="rgba(59,130,246,0.06)" stroke="rgba(59,130,246,0.2)" strokeWidth="1" />
      <line x1="26" y1="24" x2="74" y2="24" stroke="rgba(59,130,246,0.45)" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="26" y1="34" x2="74" y2="34" stroke="rgba(59,130,246,0.35)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="44" x2="62" y2="44" stroke="rgba(59,130,246,0.30)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="54" x2="68" y2="54" stroke="rgba(59,130,246,0.25)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M82 50 L106 26 L112 32 L88 56 L80 58 Z" fill="rgba(139,92,246,0.35)" stroke="rgba(139,92,246,0.5)" strokeWidth="1" />
      <line x1="100" y1="32" x2="106" y2="38" stroke="rgba(139,92,246,0.6)" strokeWidth="1.2" />
    </svg>
  );
  /* ai */
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full opacity-90" aria-hidden="true">
      <defs>
        <linearGradient id="fi-a1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="36" r="20" fill="rgba(245,158,11,0.07)" stroke="rgba(245,158,11,0.25)" strokeWidth="1.2" />
      <circle cx="60" cy="36" r="12" fill="rgba(245,158,11,0.10)" stroke="rgba(245,158,11,0.35)" strokeWidth="1" />
      <circle cx="60" cy="36" r="5" fill="rgba(245,158,11,0.55)" />
      <line x1="60" y1="16" x2="60" y2="10" stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="60" y1="56" x2="60" y2="62" stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="36" x2="34" y2="36" stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="80" y1="36" x2="86" y2="36" stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="46" y1="22" x2="42" y2="18" stroke="rgba(245,158,11,0.3)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="74" y1="50" x2="78" y2="54" stroke="rgba(245,158,11,0.3)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="74" y1="22" x2="78" y2="18" stroke="rgba(245,158,11,0.3)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="46" y1="50" x2="42" y2="54" stroke="rgba(245,158,11,0.3)" strokeWidth="1.2" strokeLinecap="round" />
      <text x="60" y="72" textAnchor="middle" fontSize="8" fill="rgba(245,158,11,0.5)" fontWeight="700">AI</text>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   BuiltInIndia — premium single-line brand statement
───────────────────────────────────────────────────────────── */
function BuiltInIndia() {
  const ref = React.useRef<HTMLElement>(null);
  const [vis, setVis] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const tx = (delay: number): React.CSSProperties => ({
    opacity: vis ? 1 : 0,
    transform: vis ? 'none' : 'translateY(14px)',
    transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
  });

  return (
    <section ref={ref} className="relative w-full overflow-hidden mt-6">

      {/* hairline */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: '70vw', height: '40vw',
            background: 'radial-gradient(ellipse, rgba(255,153,51,0.04) 0%, rgba(19,136,8,0.025) 55%, transparent 75%)',
            filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 px-4 py-14 sm:py-18 md:py-24 text-center">

        {/* eyebrow */}
        <p className="mb-6 inline-flex items-center gap-3 text-[8.5px] font-bold uppercase tracking-[0.38em] text-white/18"
          style={tx(0)}>
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-white/[0.12]" />
          Docrud · Crafted in Bharat
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-white/[0.12]" />
        </p>

        {/* single-line headline */}
        <h2
          className="whitespace-nowrap font-black leading-none tracking-[-0.04em] text-white/80"
          style={{ ...tx(80), fontSize: 'min(4.4vw, 62px)' }}
        >
          Built In{' '}
          <span className="india-word">Bharat</span>
          {' '}for the World
        </h2>

        {/* tricolor bar */}
        <div className="mt-6 flex items-center justify-center gap-[2px]">
          {[
            { c: 'rgba(255,153,51,0.32)', d: 300 },
            { c: 'rgba(240,240,240,0.14)', d: 360 },
            { c: 'rgba(19,136,8,0.28)', d: 420 },
          ].map((s, i) => (
            <div key={i} style={{
              height: '2px', borderRadius: '99px', background: s.c,
              width: 'clamp(40px, 5vw, 72px)',
              transform: vis ? 'scaleX(1)' : 'scaleX(0)',
              transformOrigin: 'center',
              transition: `transform 0.8s cubic-bezier(0.22,1,0.36,1) ${s.d}ms`,
            }} />
          ))}
        </div>

        {/* tagline */}
        <p className="mx-auto mt-5 max-w-xs text-[12px] font-medium leading-relaxed text-white/16"
          style={tx(440)}>
          Professional infrastructure crafted with Indian ingenuity,
          trusted by teams across industries worldwide.
        </p>

      </div>

      {/* hairline */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   PremiumFooter — MNC-grade footer with policies, security
───────────────────────────────────────────────────────────── */
/* ─── Footer modal content ─────────────────────────────────── */
type ModalSection = { heading: string; body: string };
type ModalDef     = { title: string; lastUpdated: string; sections: ModalSection[] };

const FOOTER_MODAL_CONTENT: Record<string, ModalDef> = {
  terms: {
    title: 'Terms & Conditions',
    lastUpdated: 'January 2025',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: 'By accessing or using Docrud ("the Platform"), you agree to be bound by these Terms & Conditions. If you do not agree, please discontinue use immediately. These terms apply to all users including visitors, registered members, and business subscribers.',
      },
      {
        heading: '2. Description of Service',
        body: 'Docrud is a document generation, sharing, and collaboration platform operated by Corescent Technologies Private Limited. We provide tools to create, publish, sign, and manage documents. Features are subject to change without prior notice.',
      },
      {
        heading: '3. User Accounts & Responsibilities',
        body: 'You are responsible for maintaining the confidentiality of your credentials. You must not share your account, impersonate others, or use the platform for unlawful activities. You warrant that all information you provide is accurate and up to date.',
      },
      {
        heading: '4. Intellectual Property',
        body: 'All platform code, design, and proprietary features are the intellectual property of Corescent Technologies Pvt Ltd. Content you create remains yours; however, by publishing publicly you grant Docrud a non-exclusive, royalty-free licence to display and distribute that content on the platform.',
      },
      {
        heading: '5. Prohibited Conduct',
        body: 'Users may not upload malicious files, engage in scraping, attempt to reverse-engineer the platform, transmit unsolicited communications, or use the service to violate applicable law. Violations may result in immediate account termination.',
      },
      {
        heading: '6. Limitation of Liability',
        body: 'Docrud is provided "as is." Corescent Technologies Pvt Ltd shall not be liable for indirect, incidental, or consequential damages arising from your use of the platform, including data loss or business interruption, to the maximum extent permitted by law.',
      },
      {
        heading: '7. Governing Law',
        body: 'These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka. If any provision is found unenforceable, the remaining provisions continue in full force.',
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'January 2025',
    sections: [
      {
        heading: 'Overview',
        body: 'Corescent Technologies Private Limited ("we", "our") is committed to protecting your personal data. This policy explains what data we collect, how we use it, and your rights under applicable law including India\'s Digital Personal Data Protection Act 2023.',
      },
      {
        heading: 'Data We Collect',
        body: 'We collect information you provide directly (name, email, documents), data generated through your use of the platform (logs, activity, device info), and data from integrations you authorise. We do not sell personal data to third parties.',
      },
      {
        heading: 'How We Use Your Data',
        body: 'Your data is used to operate and improve the platform, authenticate users, process payments, send transactional notifications, and prevent fraud. We may use anonymised, aggregated data for analytics and product development.',
      },
      {
        heading: 'Data Sharing',
        body: 'We share data only with service providers necessary to run the platform (e.g. cloud hosting, email delivery) under strict data processing agreements. We do not share personally identifiable information with advertisers or data brokers.',
      },
      {
        heading: 'Data Retention',
        body: 'Active account data is retained for the duration of your subscription plus 90 days after account closure. Audit logs and legal-hold data may be retained longer as required by law. You may request deletion at any time.',
      },
      {
        heading: 'Your Rights',
        body: 'Under the DPDP Act 2023 and applicable law, you have the right to access, correct, and erase your personal data; withdraw consent; and file a grievance. Contact us at privacy@corescent.in to exercise your rights.',
      },
      {
        heading: 'Security',
        body: 'We use AES-256 encryption at rest, TLS 1.3 in transit, role-based access controls, and regular security audits to protect your data. All data is hosted in India on ISO-compliant infrastructure.',
      },
    ],
  },

  cookies: {
    title: 'Cookie Policy',
    lastUpdated: 'January 2025',
    sections: [
      {
        heading: 'What Are Cookies',
        body: 'Cookies are small text files stored on your device when you visit a website. They help us deliver a functional, secure, and personalised experience on Docrud.',
      },
      {
        heading: 'Cookies We Use',
        body: 'We use strictly necessary cookies for authentication and session management; functional cookies to remember preferences; and performance cookies (anonymised) to understand how pages are used. We do not use third-party advertising cookies.',
      },
      {
        heading: 'Session & Auth Cookies',
        body: 'Authentication tokens are stored in secure, HttpOnly cookies with SameSite=Strict to prevent CSRF attacks. These expire when you log out or after a defined inactivity period.',
      },
      {
        heading: 'Analytics',
        body: 'Anonymised page-view and interaction data may be collected to improve platform performance. No personally identifiable data is sent to analytics services. All analytics data is aggregated.',
      },
      {
        heading: 'Managing Cookies',
        body: 'You can control or delete cookies through your browser settings. Disabling necessary cookies will affect login and core functionality. Third-party cookie controls are available in your browser\'s privacy settings.',
      },
      {
        heading: 'Updates',
        body: 'This cookie policy may be updated to reflect changes in technology or regulation. Continued use of Docrud after updates constitutes acceptance. Last material update: January 2025.',
      },
    ],
  },

  refund: {
    title: 'Refund & Cancellation Policy',
    lastUpdated: 'January 2025',
    sections: [
      {
        heading: 'Subscription Cancellation',
        body: 'You may cancel your paid subscription at any time from your account settings. Cancellation takes effect at the end of the current billing cycle. You will retain access to paid features until the cycle ends.',
      },
      {
        heading: 'Refund Eligibility',
        body: 'Refunds are available within 7 days of initial purchase if the platform did not function as described and the issue could not be resolved by our support team. Refunds are not available for partial billing periods or after 7 days.',
      },
      {
        heading: 'How to Request a Refund',
        body: 'Contact us at billing@corescent.in with your account email and a description of the issue. We aim to process refund requests within 5–7 business days. Approved refunds are returned to the original payment method.',
      },
      {
        heading: 'Non-Refundable Items',
        body: 'One-time template purchases, custom integrations, and professional services are non-refundable once delivered. Add-on purchases consumed during a billing period are non-refundable.',
      },
      {
        heading: 'Promotional & Trial Plans',
        body: 'Free trial periods are not eligible for refunds. Promotional discounts are non-refundable if the full promotional period has elapsed. Annual plan refunds are prorated for unused full months where applicable by law.',
      },
      {
        heading: 'Disputes',
        body: 'If you believe a charge is incorrect, contact us before initiating a chargeback. Unresolved billing disputes may be escalated per the governing law clause in our Terms & Conditions.',
      },
    ],
  },

  'data-processing': {
    title: 'Data Processing Agreement',
    lastUpdated: 'January 2025',
    sections: [
      {
        heading: 'Scope',
        body: 'This Data Processing Agreement ("DPA") governs the processing of personal data by Corescent Technologies Private Limited ("Data Processor") on behalf of business users ("Data Fiduciary") as defined under the DPDP Act 2023.',
      },
      {
        heading: 'Legal Basis for Processing',
        body: 'We process data on the basis of (a) contractual necessity — to deliver the services you have subscribed to; (b) legitimate interest — for fraud prevention and platform security; (c) legal obligation — for compliance with Indian law; and (d) consent — for optional communications.',
      },
      {
        heading: 'Sub-Processors',
        body: 'We engage trusted sub-processors for cloud infrastructure, email delivery, and payment processing. All sub-processors are bound by data processing agreements with equivalent protections. A current list is available on request.',
      },
      {
        heading: 'Data Localisation',
        body: 'All personal data of Indian residents is stored and processed on servers located within India, in compliance with applicable data localisation requirements under the DPDP Act 2023.',
      },
      {
        heading: 'Security Measures',
        body: 'Technical measures include AES-256 encryption, TLS 1.3, network isolation, access controls with least-privilege principles, and continuous monitoring. Organisational measures include staff training, incident response procedures, and annual security reviews.',
      },
      {
        heading: 'Breach Notification',
        body: 'In the event of a personal data breach, we will notify affected data fiduciaries within 72 hours of discovery, as required by applicable law. Notifications will include nature of breach, data involved, and remediation steps.',
      },
    ],
  },

  dpdp: {
    title: 'DPDP Act 2023 Compliance',
    lastUpdated: 'January 2025',
    sections: [
      {
        heading: 'About the DPDP Act',
        body: 'The Digital Personal Data Protection Act 2023 is India\'s landmark data protection law governing the processing of digital personal data. Corescent Technologies Private Limited is a Data Fiduciary under this Act.',
      },
      {
        heading: 'Our Obligations as Data Fiduciary',
        body: 'We process personal data only for lawful purposes and with valid consent where required. We implement appropriate technical and organisational safeguards, appoint a Data Protection Officer, and maintain records of processing activities.',
      },
      {
        heading: 'Your Rights as Data Principal',
        body: 'Under the DPDP Act you have the right to: (1) access information about your data; (2) correction and erasure of inaccurate or outdated data; (3) grievance redressal within 48 hours; and (4) nominate a representative for your rights.',
      },
      {
        heading: 'Consent Framework',
        body: 'We obtain free, informed, specific, and unambiguous consent before processing personal data for non-essential purposes. You may withdraw consent at any time without affecting the lawfulness of prior processing. Consent withdrawal may limit certain features.',
      },
      {
        heading: 'Children\'s Data',
        body: 'Docrud does not knowingly process data of individuals under 18 years of age without verified parental consent. Age-gating is implemented at sign-up. If we identify under-age data without consent, it is deleted promptly.',
      },
      {
        heading: 'Grievance Redressal',
        body: 'Submit grievances to our Data Protection Officer at dpo@corescent.in or via the Contact page. We acknowledge within 48 hours and resolve within 30 days. Unresolved matters may be escalated to the Data Protection Board of India.',
      },
    ],
  },

  'acceptable-use': {
    title: 'Acceptable Use Policy',
    lastUpdated: 'January 2025',
    sections: [
      {
        heading: 'Purpose',
        body: 'This Acceptable Use Policy defines conduct standards for all Docrud users. Violations may result in content removal, suspension, or permanent account termination at our sole discretion.',
      },
      {
        heading: 'Prohibited Content',
        body: 'You must not upload, share, or distribute: content that infringes third-party intellectual property; defamatory, harassing, or hateful material; obscene or illegal content; malware, phishing material, or deceptive documents; content that violates applicable law.',
      },
      {
        heading: 'Prohibited Activities',
        body: 'Prohibited activities include: automated scraping without written permission; credential stuffing or brute-force attacks; reverse engineering the platform; creating fake accounts; spamming other users; circumventing access controls or subscription tiers.',
      },
      {
        heading: 'Document Integrity',
        body: 'Users must not misrepresent the authenticity of documents. Submitting forged signatures, altered contracts, or fraudulent documents constitutes a serious violation and will be reported to appropriate authorities.',
      },
      {
        heading: 'Compliance with Law',
        body: 'All use of Docrud must comply with applicable local, state, and national laws. Users are responsible for ensuring that the documents they create, share, or sign are lawful in their jurisdiction.',
      },
      {
        heading: 'Reporting Violations',
        body: 'If you encounter content or behaviour that violates this policy, please report it via the Contact page. We investigate all reports and take appropriate action, which may include content removal and law enforcement referral.',
      },
    ],
  },

  'doc-legality': {
    title: 'Document Legality & Standing',
    lastUpdated: 'January 2025',
    sections: [
      {
        heading: 'Legal Standing of Documents',
        body: 'Documents created and signed on Docrud can carry legal weight under the Information Technology Act 2000 and Indian Contract Act 1872, provided the parties have legal capacity to contract and proper consent is recorded.',
      },
      {
        heading: 'Electronic Signatures',
        body: 'Docrud\'s signature feature produces electronic signatures as defined under the IT Act. These are legally recognised for most commercial agreements. Certain documents (e.g. wills, negotiable instruments, property transfers) may require wet ink signatures under Indian law.',
      },
      {
        heading: 'Audit Trail & Tamper Evidence',
        body: 'Every signed document is accompanied by a cryptographic audit trail recording signer identity, timestamp, IP address, and document hash. This trail can be used as evidence of the signing event in dispute resolution.',
      },
      {
        heading: 'Disclaimer',
        body: 'Docrud provides document tools, not legal advice. The platform does not verify the legal validity of document content. Users are responsible for ensuring their documents comply with applicable law and should consult qualified legal professionals for high-stakes agreements.',
      },
      {
        heading: 'Jurisdiction',
        body: 'Users are responsible for determining whether e-signed documents are legally valid in their jurisdiction. Laws vary; some countries require specific digital signature certificates (DSC). Docrud does not issue DSCs as defined under Indian IT Act Schedule II.',
      },
    ],
  },

  'security-overview': {
    title: 'Security Overview',
    lastUpdated: 'January 2025',
    sections: [
      {
        heading: 'Security-First Architecture',
        body: 'Docrud is built with security as a foundational principle. Our infrastructure runs on isolated, SOC 2-aligned cloud environments with strict network segmentation, automated vulnerability scanning, and continuous threat monitoring.',
      },
      {
        heading: 'Access Control',
        body: 'All internal access to production systems follows least-privilege principles with mandatory MFA. Role-based access control (RBAC) limits data access to only what is necessary. All access events are logged and reviewed.',
      },
      {
        heading: 'Encryption',
        body: 'All data is encrypted at rest using AES-256 and in transit using TLS 1.3. Encryption keys are managed via a dedicated key management service with automatic rotation. Document payloads are encrypted before storage.',
      },
      {
        heading: 'Vulnerability Management',
        body: 'We run automated dependency scanning, static analysis, and penetration testing. Critical vulnerabilities are patched within 24 hours. We operate a responsible disclosure programme — see Report Vulnerability.',
      },
      {
        heading: 'Incident Response',
        body: 'We maintain a documented incident response plan with defined severity tiers, escalation paths, and communication protocols. Affected users are notified promptly in the event of a security incident impacting their data.',
      },
      {
        heading: 'Compliance',
        body: 'Our security programme aligns with ISO 27001 controls and India\'s DPDP Act 2023 requirements. We undergo periodic independent audits and maintain a security-first development lifecycle (SSDLC).',
      },
    ],
  },

  encryption: {
    title: 'Encryption Standards',
    lastUpdated: 'January 2025',
    sections: [
      {
        heading: 'Data at Rest',
        body: 'All documents, user data, and associated metadata stored on Docrud infrastructure are encrypted using AES-256-GCM. Encryption is applied at the storage layer, meaning data is protected even at the physical disk level.',
      },
      {
        heading: 'Data in Transit',
        body: 'All communications between clients and Docrud servers use TLS 1.3 with strong cipher suites. Older protocol versions (TLS 1.0, 1.1) and weak ciphers (RC4, 3DES) are explicitly disabled. HSTS is enforced with a minimum one-year max-age.',
      },
      {
        heading: 'Key Management',
        body: 'Encryption keys are managed by a dedicated key management service (KMS) with hardware security module (HSM) backing where applicable. Keys are rotated automatically on a 90-day cycle. Master keys are never stored alongside the data they protect.',
      },
      {
        heading: 'Document Payload Encryption',
        body: 'Sensitive document contents are additionally encrypted at the application layer before being written to storage. Each document has its own derived encryption key, ensuring a breach of one key does not expose all documents.',
      },
      {
        heading: 'Password Hashing',
        body: 'User passwords are never stored in plain text or reversibly encrypted. We use bcrypt with a work factor calibrated to balance security and performance. Password hashes are stored separately from user profile data.',
      },
      {
        heading: 'Signature Integrity',
        body: 'Signed documents are sealed with a SHA-256 cryptographic hash at signing time. Any subsequent modification to the document invalidates the hash, providing tamper evidence. The hash is stored independently of the document.',
      },
    ],
  },

  'doc-integrity': {
    title: 'Document Integrity',
    lastUpdated: 'January 2025',
    sections: [
      {
        heading: 'Hash-Based Verification',
        body: 'Every document on Docrud receives a SHA-256 content hash at creation and at each signing event. The hash is stored separately and can be recomputed at any time to verify the document has not been altered.',
      },
      {
        heading: 'Immutable Audit Trail',
        body: 'All significant document events — creation, sharing, viewing, commenting, signing, and revocation — are recorded in an append-only audit log. Entries include timestamp, actor identity, IP address, and action hash.',
      },
      {
        heading: 'Version History',
        body: 'For editable documents, Docrud maintains a complete version history. Each version is independently hashed and timestamped. Users can inspect the full edit history and restore previous versions where permissions allow.',
      },
      {
        heading: 'Revocation & Expiry',
        body: 'Shared document links can be revoked at any time. Revoked links return a 403 response and all associated access tokens are invalidated. Expiry dates can be set on shares to enforce time-limited access.',
      },
      {
        heading: 'Third-Party Verification',
        body: 'Document integrity certificates include the document hash, creation timestamp, and a platform signature. These certificates can be independently verified without Docrud being online, useful for long-term evidentiary purposes.',
      },
    ],
  },

  'generated-doc': {
    title: 'Generated Document Policy',
    lastUpdated: 'January 2025',
    sections: [
      {
        heading: 'AI-Assisted Generation',
        body: 'Docrud offers AI-assisted document generation features. Content generated by AI is provided as a starting point and may not be accurate, complete, or legally sufficient. Users must review all AI-generated content before use.',
      },
      {
        heading: 'No Legal Advice',
        body: 'Generated documents do not constitute legal advice. Templates and AI suggestions are for informational purposes only. For contracts, agreements, or any legally binding document, consult a qualified legal professional.',
      },
      {
        heading: 'User Responsibility',
        body: 'You are fully responsible for the accuracy, legality, and appropriateness of documents you generate and distribute. Corescent Technologies Pvt Ltd accepts no liability for errors, omissions, or harm resulting from generated content.',
      },
      {
        heading: 'Intellectual Property',
        body: 'AI-generated content does not carry an automatic copyright. The legal status of AI-generated works is evolving; users should not rely on AI-generated content as original copyrightable work without independent legal review.',
      },
      {
        heading: 'Data Used in Generation',
        body: 'Information you provide to generate documents is processed to produce the output and is subject to our Privacy Policy. We do not use your document content to train AI models without explicit consent.',
      },
    ],
  },

  trust: {
    title: 'Trust & Compliance',
    lastUpdated: 'January 2025',
    sections: [
      {
        heading: 'Our Compliance Framework',
        body: 'Docrud\'s compliance programme covers the Digital Personal Data Protection Act 2023, the Information Technology Act 2000, and ISO 27001 security controls. We undergo annual independent reviews to verify compliance.',
      },
      {
        heading: 'Data Localisation',
        body: 'All personal data of Indian users is stored and processed exclusively on infrastructure located within India. We do not transfer Indian personal data internationally without adequate safeguards as required by law.',
      },
      {
        heading: 'Vendor Due Diligence',
        body: 'All third-party vendors with access to personal data are vetted for security posture and legal compliance before onboarding. Vendor agreements include data processing addenda with appropriate obligations and audit rights.',
      },
      {
        heading: 'Employee Training',
        body: 'All staff receive mandatory data protection and security awareness training at onboarding and annually. Personnel with access to sensitive data undergo enhanced background verification.',
      },
      {
        heading: 'Transparency & Accountability',
        body: 'We publish this policy suite to be transparent about how we handle data and security. We appoint a Data Protection Officer and provide a grievance mechanism. Material changes to policies are communicated to users.',
      },
      {
        heading: 'Contact',
        body: 'For compliance enquiries, contact our DPO at dpo@corescent.in. For security matters, contact security@corescent.in. For general questions, use the Contact page.',
      },
    ],
  },

  about: {
    title: 'About Docrud',
    lastUpdated: 'May 2025',
    sections: [
      {
        heading: 'Our Story',
        body: 'Docrud was founded in India with a single mission: make professional document creation, sharing, and collaboration accessible to everyone — from solo freelancers to enterprise teams. We believe powerful document tools should not require expensive enterprise contracts.',
      },
      {
        heading: 'What We Build',
        body: 'Docrud is a full-stack document platform. We provide document generation with smart templates, secure file sharing with granular access controls, e-signatures with audit trails, a published content marketplace, and a gigs platform connecting professionals.',
      },
      {
        heading: 'Our Values',
        body: 'Privacy first — we never sell your data. Security by design — encryption is standard, not optional. Made in India — our team, infrastructure, and legal entity are proudly Indian. Accessible pricing — world-class tools at fair prices.',
      },
      {
        heading: 'The Company',
        body: 'Docrud is a product of Corescent Technologies Private Limited, a technology company incorporated in India. We are a small, focused team committed to building reliable, premium-grade software for the global market.',
      },
      {
        heading: 'Get in Touch',
        body: 'We love hearing from users. For partnerships, enterprise enquiries, or general feedback, reach us at hello@corescent.in or through the Contact page. We read every message.',
      },
    ],
  },

  careers: {
    title: 'Careers at Docrud',
    lastUpdated: 'May 2025',
    sections: [
      {
        heading: 'Join Our Team',
        body: 'We are a small, ambitious team building world-class document infrastructure from India. We value craftsmanship, thoughtful engineering, and a bias towards simplicity. If that resonates, we would love to hear from you.',
      },
      {
        heading: 'Open Roles',
        body: 'We hire across product engineering (Next.js, TypeScript, PostgreSQL), design (product & visual), and growth. We do not post every open role publicly — if you are exceptional, reach out regardless. We evaluate on skill and attitude, not pedigree.',
      },
      {
        heading: 'How We Work',
        body: 'We are remote-first within India with async-first communication. We move fast but thoughtfully. Engineers own features end-to-end. We prefer boring, reliable technology over trendy complexity.',
      },
      {
        heading: 'What We Offer',
        body: 'Competitive compensation, meaningful equity, flexible hours, and the rare opportunity to shape a product from near-zero. You will work on real problems with real users, not internal tooling for a faceless enterprise.',
      },
      {
        heading: 'How to Apply',
        body: 'Send a short note about yourself and what you would build here to careers@corescent.in. Attach work you are proud of — a GitHub profile, a live project, or a portfolio. We aim to respond within a week.',
      },
    ],
  },

  press: {
    title: 'Press & Media',
    lastUpdated: 'May 2025',
    sections: [
      {
        heading: 'Media Enquiries',
        body: 'For press coverage, interviews, partnership announcements, or media requests, please contact our communications team at press@corescent.in. We typically respond to media enquiries within 24 hours on business days.',
      },
      {
        heading: 'About the Company',
        body: 'Docrud is a document platform by Corescent Technologies Private Limited, an India-incorporated technology company. Docrud serves individual professionals, freelancers, and businesses seeking secure, modern document tooling.',
      },
      {
        heading: 'Brand Assets',
        body: 'Approved logos, product screenshots, and brand guidelines are available on request. Please do not modify Docrud or Corescent branding without written approval. Trademark usage must comply with our brand guidelines.',
      },
      {
        heading: 'Spokesperson',
        body: 'All official statements and quotes on behalf of Docrud or Corescent Technologies must be cleared through press@corescent.in. Unauthorised quotes or paraphrased statements should not be attributed to the company.',
      },
      {
        heading: 'Factual Information',
        body: 'Docrud is incorporated in India. Our platform serves users across categories including documents, file sharing, gigs, and published content. For specific metrics or data points for editorial use, please contact the press team.',
      },
    ],
  },
};

/* ─── Footer modal component ───────────────────────────────── */
function FooterModal({ modalKey, onClose }: { modalKey: string; onClose: () => void }) {
  const def = FOOTER_MODAL_CONTENT[modalKey];
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!def) return null;
  return (
    <div
      className="fixed inset-0 z-[999] flex items-end justify-center sm:items-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full sm:max-w-2xl max-h-[90dvh] sm:max-h-[82vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/[0.08] bg-[#0e0e10] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.06] px-6 py-5">
          <div>
            <p className="text-[15px] font-bold text-white/85 leading-snug">{def.title}</p>
            <p className="mt-0.5 text-[10.5px] text-white/25 font-medium">Last updated: {def.lastUpdated} · Corescent Technologies Pvt Ltd</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center justify-center h-7 w-7 rounded-full border border-white/[0.08] bg-white/[0.04] text-white/40 transition hover:bg-white/[0.08] hover:text-white/70 active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto overscroll-contain px-6 py-6 space-y-5 no-scrollbar">
          {def.sections.map((s, i) => (
            <div key={i}>
              <p className="mb-1.5 text-[11.5px] font-bold text-white/60 tracking-[0.01em]">{s.heading}</p>
              <p className="text-[12.5px] leading-relaxed text-white/38">{s.body}</p>
            </div>
          ))}
          <div className="pt-4 border-t border-white/[0.05]">
            <p className="text-[10.5px] text-white/18 leading-relaxed">
              For questions about this policy, contact us at{' '}
              <span className="text-white/35 font-medium">legal@corescent.in</span>
              {' '}or visit the Contact page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Footer data ──────────────────────────────────────────── */
type FooterLinkDef = { label: string; href?: string; modal?: string };

const FOOTER_COLS: { heading: string; links: FooterLinkDef[] }[] = [
  {
    heading: 'Platform',
    links: [
      { label: 'Published Content',  href: '/published' },
      { label: 'File Directory',     href: '/file-directory' },
      { label: 'Gigs Marketplace',   href: '/gigs' },
      { label: 'Knowledge Base',     href: '/knowledge' },
      { label: 'Workspace',          href: '/workspace' },
      { label: 'Pricing',            href: '/pricing' },
      { label: 'Schedule a Demo',    href: '/schedule-demo' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Docrud',  modal: 'about' },
      { label: 'Blog',          href: '/blog' },
      { label: 'Contact Us',    href: '/contact' },
      { label: 'Careers',       modal: 'careers' },
      { label: 'Press & Media', modal: 'press' },
      { label: 'Sign Up',       href: '/signup' },
      { label: 'Sign In',       href: '/login' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms & Conditions',    modal: 'terms' },
      { label: 'Privacy Policy',        modal: 'privacy' },
      { label: 'Cookie Policy',         modal: 'cookies' },
      { label: 'Refund & Cancellation', modal: 'refund' },
      { label: 'Data Processing',       modal: 'data-processing' },
      { label: 'DPDP Act Compliance',   modal: 'dpdp' },
      { label: 'Acceptable Use',        modal: 'acceptable-use' },
      { label: 'Document Legality',     modal: 'doc-legality' },
    ],
  },
  {
    heading: 'Security',
    links: [
      { label: 'Security Overview',    modal: 'security-overview' },
      { label: 'Encryption Standards', modal: 'encryption' },
      { label: 'Document Integrity',   modal: 'doc-integrity' },
      { label: 'Generated Doc Policy', modal: 'generated-doc' },
      { label: 'Trust & Compliance',   modal: 'trust' },
      { label: 'Report Vulnerability', href: '/contact' },
    ],
  },
];

const SECURITY_BADGES = [
  { icon: '🔒', label: '256-bit AES Encryption' },
  { icon: '🛡', label: 'DPDP Act 2023 Compliant' },
  { icon: '🔐', label: 'TLS 1.3 in Transit' },
  { icon: '🇮🇳', label: 'Data Hosted in India' },
  { icon: '✓',  label: 'End-to-End Doc Security' },
];

function PremiumFooter() {
  const yr = new Date().getFullYear();
  const [activeModal, setActiveModal] = React.useState<string | null>(null);

  return (
    <>
      {activeModal && (
        <FooterModal modalKey={activeModal} onClose={() => setActiveModal(null)} />
      )}
      <footer className="relative w-full border-t border-white/[0.05] bg-[#080809]">

        {/* top gradient cap */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

        {/* ── Brand strip ── */}
        <div className="border-b border-white/[0.04] px-6 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[18px] font-black tracking-[-0.03em] text-white/85">docrud</p>
              <p className="mt-0.5 text-[10.5px] font-medium text-white/25">
                A product by{' '}
                <span className="font-semibold text-white/40">Corescent Technologies Private Limited</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70 animate-pulse" />
                All systems operational
              </span>
            </div>
          </div>
        </div>

        {/* ── Link columns ── */}
        <div className="px-6 py-10 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FOOTER_COLS.map(col => (
              <div key={col.heading}>
                <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.22em] text-white/25">
                  {col.heading}
                </p>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link.label}>
                      {link.modal ? (
                        <button
                          type="button"
                          onClick={() => setActiveModal(link.modal!)}
                          className="text-left text-[12px] font-medium text-white/35 transition-colors duration-150 hover:text-white/70"
                        >
                          {link.label}
                        </button>
                      ) : (
                        <Link
                          href={link.href!}
                          className="text-[12px] font-medium text-white/35 transition-colors duration-150 hover:text-white/70"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Security badges ── */}
        <div className="border-t border-white/[0.04] px-6 py-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <p className="mb-3 text-[8.5px] font-bold uppercase tracking-[0.2em] text-white/15">
              Data Security &amp; Trust
            </p>
            <div className="flex flex-wrap gap-2">
              {SECURITY_BADGES.map(b => (
                <span
                  key={b.label}
                  className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1 text-[10.5px] font-medium text-white/30"
                >
                  <span className="text-[11px] leading-none">{b.icon}</span>
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Copyright bar ── */}
        <div className="border-t border-white/[0.04] px-6 py-5 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] font-medium text-white/22">
                © {yr} Corescent Technologies Private Limited. All rights reserved.
              </p>
              <p className="text-[10px] text-white/13">
                Docrud and the Docrud logo are trademarks of Corescent Technologies Pvt Ltd.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] text-white/15 font-medium">
                Made with ❤ in India
              </span>
              <div className="flex items-center gap-2">
                {[
                  { label: 'Privacy', modal: 'privacy' },
                  { label: 'Terms',   modal: 'terms' },
                ].map(l => (
                  <button
                    key={l.label}
                    type="button"
                    onClick={() => setActiveModal(l.modal)}
                    className="text-[10px] font-semibold text-white/20 transition hover:text-white/50"
                  >
                    {l.label}
                  </button>
                ))}
                <Link
                  href="/contact"
                  className="text-[10px] font-semibold text-white/20 transition hover:text-white/50"
                >
                  Contact
                </Link>
              </div>
            </div>

          </div>
        </div>

      </footer>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   LiveLeaderboards — multi-board real-time section
───────────────────────────────────────────────────────────── */
type LBEntry = {
  id: string; name: string; subtitle: string; initials: string;
  avatarBg: string; value: number; valueLabel: string; href: string;
};
type LBPayload = {
  upraisers: LBEntry[]; followers: LBEntry[];
  liked: LBEntry[]; commented: LBEntry[]; viewed: LBEntry[];
  updatedAt: string;
};

const LB_CONFIGS = [
  { key: 'upraisers' as const, label: 'Upraises',      Icon: Sparkles,      iconCls: 'text-amber-400/60',   barCls: 'bg-amber-400/[0.22]',   accentCls: 'border-amber-400/[0.12]' },
  { key: 'followers' as const, label: 'Followers',     Icon: Users,         iconCls: 'text-sky-400/60',     barCls: 'bg-sky-400/[0.22]',     accentCls: 'border-sky-400/[0.12]' },
  { key: 'liked'     as const, label: 'Most Liked',    Icon: ThumbsUp,      iconCls: 'text-rose-400/60',    barCls: 'bg-rose-400/[0.22]',    accentCls: 'border-rose-400/[0.12]' },
  { key: 'commented' as const, label: 'Most Discussed',Icon: MessageCircle, iconCls: 'text-violet-400/60',  barCls: 'bg-violet-400/[0.22]',  accentCls: 'border-violet-400/[0.12]' },
  { key: 'viewed'    as const, label: 'Most Viewed',   Icon: Eye,           iconCls: 'text-emerald-400/60', barCls: 'bg-emerald-400/[0.22]', accentCls: 'border-emerald-400/[0.12]' },
] as const;

const PODIUM_HT_PX = [80, 104, 64];  // visual order: 2nd, 1st, 3rd
const PODIUM_RANKS = [2, 1, 3];

function LiveLeaderboards() {
  const REFRESH_INTERVAL = 30;

  const [boards, setBoards]         = React.useState<LBPayload | null>(null);
  const [lastUpdated, setLastUpd]   = React.useState<Date | null>(null);
  const [ticking, setTicking]       = React.useState(false);
  const [countdown, setCountdown]   = React.useState(REFRESH_INTERVAL);
  const [activeTab, setActiveTab]   = React.useState(0);
  const [podiumOpen, setPodiumOpen] = React.useState<Record<string, boolean>>(
    () => Object.fromEntries(LB_CONFIGS.map(c => [c.key, false]))
  );
  const [animKey, setAnimKey] = React.useState(0);
  const prevRanksRef  = React.useRef<Record<string, Record<string, number>>>({});
  const [rankDeltas, setRankDeltas] = React.useState<Record<string, Record<string, number>>>({});
  const [flashKeys, setFlashKeys]   = React.useState<Set<string>>(new Set());
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const nextFetchRef = React.useRef<number>(Date.now() + REFRESH_INTERVAL * 1000);

  const fetchBoards = React.useCallback(async () => {
    setTicking(true);
    try {
      const res = await fetch('/api/public/leaderboards');
      if (!res.ok) return;
      const data = await res.json() as LBPayload;
      const newDeltas: Record<string, Record<string, number>> = {};
      const newFlash = new Set<string>();
      for (const cfg of LB_CONFIGS) {
        const entries: LBEntry[] = data[cfg.key] ?? [];
        const prev = prevRanksRef.current[cfg.key] ?? {};
        newDeltas[cfg.key] = {};
        entries.forEach((e, idx) => {
          const nr = idx + 1;
          if (prev[e.id] !== undefined && prev[e.id] !== nr) {
            newDeltas[cfg.key][e.id] = prev[e.id] - nr;
            newFlash.add(`${cfg.key}-${e.id}`);
          }
          prev[e.id] = nr;
        });
        prevRanksRef.current[cfg.key] = prev;
      }
      setRankDeltas(newDeltas);
      setBoards(data);
      setLastUpd(new Date());
      setAnimKey(k => k + 1);
      nextFetchRef.current = Date.now() + REFRESH_INTERVAL * 1000;
      setCountdown(REFRESH_INTERVAL);
      if (newFlash.size > 0) {
        setFlashKeys(newFlash);
        setTimeout(() => setFlashKeys(new Set()), 2500);
      }
    } catch { /* ignore */ }
    setTicking(false);
  }, []);

  React.useEffect(() => {
    fetchBoards();
    const fetchId = setInterval(fetchBoards, REFRESH_INTERVAL * 1000);
    const tickId  = setInterval(() => {
      const secs = Math.max(0, Math.round((nextFetchRef.current - Date.now()) / 1000));
      setCountdown(secs);
    }, 1000);
    return () => { clearInterval(fetchId); clearInterval(tickId); };
  }, [fetchBoards]);

  const hasAny = boards && LB_CONFIGS.some(c => (boards[c.key]?.length ?? 0) > 0);

  /* Skeleton */
  if (!boards) return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <div className="h-4 w-36 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="h-4 w-10 animate-pulse rounded-full bg-white/[0.04]" />
      </div>
      <div className="hidden xl:grid grid-cols-5 gap-3">
        {[1,2,3,4,5].map(i => <div key={i} className="h-[480px] animate-pulse rounded-[18px] bg-white/[0.04]" />)}
      </div>
      <div className="xl:hidden h-[480px] animate-pulse rounded-[18px] bg-white/[0.04]" />
    </section>
  );
  if (!hasAny) return null;

  const togglePodium = (key: string) =>
    setPodiumOpen(prev => ({ ...prev, [key]: !prev[key] }));

  const renderCard = (cfg: typeof LB_CONFIGS[number], isActive?: boolean) => {
    const entries  = boards?.[cfg.key] ?? [];
    const maxVal   = Math.max(...entries.map(e => e.value), 1);
    const top3     = entries.slice(0, 3);
    const listRows = entries.slice(0, 8);
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
    const podiumRanks = top3.length >= 3 ? PODIUM_RANKS : top3.map((_, i) => i + 1);
    const CFG_Icon = cfg.Icon;
    const isPodOpen = podiumOpen[cfg.key] ?? false;

    return (
      <div
        key={`${cfg.key}-${animKey}`}
        style={{ animation: animKey > 0 ? 'lb-card-refresh 0.45s cubic-bezier(0.22,1,0.36,1)' : undefined }}
        className={[
          'flex flex-col rounded-[18px] border bg-[#0b0c0f] overflow-hidden',
          cfg.accentCls,
        ].join(' ')}
      >
        {/* Card header */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
          <div className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-white/[0.05]`}>
            <CFG_Icon className={`h-3 w-3 ${cfg.iconCls}`} />
          </div>
          <span className="flex-1 whitespace-nowrap text-[11.5px] font-bold text-white/75 leading-none">{cfg.label}</span>
          <button
            type="button"
            onClick={() => togglePodium(cfg.key)}
            title={isPodOpen ? 'Collapse podium' : 'Show podium'}
            className={[
              'flex shrink-0 items-center gap-1 rounded-[6px] border px-1.5 py-0.5 text-[9px] font-semibold transition-all duration-200 active:scale-95',
              isPodOpen
                ? 'border-amber-400/[0.18] bg-amber-400/[0.07] text-amber-400/70 hover:bg-amber-400/[0.12]'
                : 'border-white/[0.07] bg-white/[0.03] text-white/25 hover:bg-white/[0.07] hover:text-white/55',
            ].join(' ')}
          >
            <Crown className="h-2.5 w-2.5" />
            <span className="tabular-nums">{isPodOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        {/* Rank list */}
        <div className="flex-1 divide-y divide-white/[0.03]">
          {listRows.map((e, idx) => {
            const rank    = idx + 1;
            const delta   = rankDeltas[cfg.key]?.[e.id] ?? 0;
            const isFlash = flashKeys.has(`${cfg.key}-${e.id}`);
            const barW    = maxVal > 0 ? Math.max(4, Math.round((e.value / maxVal) * 100)) : 4;

            return (
              <Link
                key={e.id}
                href={e.href}
                className={[
                  'group flex items-center gap-2.5 px-3.5 py-2.5 transition-all duration-200',
                  isFlash ? 'bg-white/[0.04]' : 'hover:bg-white/[0.025]',
                ].join(' ')}
              >
                {/* Rank badge */}
                <div className="w-5 shrink-0 text-center leading-none">
                  {rank === 1 ? (
                    <Trophy className="h-3.5 w-3.5 mx-auto text-amber-400/70" />
                  ) : rank === 2 ? (
                    <Award className="h-3 w-3 mx-auto text-white/40" />
                  ) : rank === 3 ? (
                    <Medal className="h-3 w-3 mx-auto text-white/25" />
                  ) : (
                    <span className="text-[10px] font-bold tabular-nums text-white/20">{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${e.avatarBg} text-[8px] font-bold text-white shadow-sm`}>
                  {e.initials}
                </div>

                {/* Name + bar */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-[11px] font-medium text-white/55 group-hover:text-white/85 transition-colors leading-tight">
                      {e.name}
                    </span>
                    <span className={`shrink-0 min-w-[22px] text-right text-[10.5px] font-bold tabular-nums transition-all duration-300 ${isFlash ? 'text-white/95 scale-110' : 'text-white/45'}`}>
                      {e.valueLabel}
                    </span>
                  </div>
                  <div className="mt-[3px] h-[2px] rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cfg.barCls} transition-all duration-1000`}
                      style={{ width: `${barW}%` }}
                    />
                  </div>
                </div>

                {/* Delta arrow */}
                <div className="w-4 shrink-0 flex items-center justify-center">
                  {delta > 0 ? (
                    <span className={`flex items-center gap-0.5 ${isFlash ? 'animate-bounce' : ''}`}>
                      <TrendingUp className="h-2.5 w-2.5 text-emerald-400/80" />
                      {delta > 1 && <span className="text-[8px] font-bold text-emerald-400/70">{delta}</span>}
                    </span>
                  ) : delta < 0 ? (
                    <span className={`flex items-center gap-0.5 ${isFlash ? 'animate-bounce' : ''}`}>
                      <TrendingDown className="h-2.5 w-2.5 text-red-400/65" />
                      {Math.abs(delta) > 1 && <span className="text-[8px] font-bold text-red-400/55">{Math.abs(delta)}</span>}
                    </span>
                  ) : rank <= 5 ? (
                    <span className="block h-px w-2.5 rounded-full bg-white/[0.07] mx-auto" />
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Podium — collapsible */}
        <div
          className="overflow-hidden transition-all duration-500"
          style={{ maxHeight: isPodOpen ? '260px' : '0px', opacity: isPodOpen ? 1 : 0 }}
        >
          {top3.length > 0 && (
            <div className="border-t border-white/[0.04] bg-white/[0.012] px-3 pt-3 pb-4">
              <div className="flex items-end justify-center gap-2">
                {podiumOrder.map((e, pIdx) => {
                  const rank    = podiumRanks[pIdx];
                  const ht      = PODIUM_HT_PX[pIdx];
                  const isFirst = rank === 1;
                  const podAlpha  = isFirst ? '0.16' : rank === 2 ? '0.09' : '0.06';
                  const ringAlpha = isFirst ? '0.28' : '0.13';
                  return (
                    <Link
                      key={e.id}
                      href={e.href}
                      className="flex flex-col items-center gap-1 group"
                      style={{ width: isFirst ? 74 : 60 }}
                    >
                      <div
                        className="relative flex items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
                        style={{ width: isFirst ? 36 : 28, height: isFirst ? 36 : 28 }}
                      >
                        <div
                          className={`absolute inset-0 rounded-full bg-gradient-to-br ${e.avatarBg}`}
                          style={{ boxShadow: `0 0 0 2px rgba(255,255,255,${ringAlpha})` }}
                        />
                        <span className="relative z-10 text-[9px] font-bold text-white">{e.initials}</span>
                        {isFirst && (
                          <Crown
                            className="absolute -top-3.5 left-1/2 -translate-x-1/2 h-3.5 w-3.5 text-amber-400/70"
                            style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.35))' }}
                          />
                        )}
                      </div>
                      <div className="text-center" style={{ maxWidth: isFirst ? 70 : 56 }}>
                        <div className="truncate text-[8.5px] font-semibold text-white/60 leading-tight">
                          {e.name.split(' ')[0]}
                        </div>
                        <div className={`text-[8px] font-bold tabular-nums ${isFirst ? 'text-white/75' : 'text-white/35'}`}>
                          {e.valueLabel}
                        </div>
                      </div>
                      <div
                        className="w-full rounded-t-[5px] flex items-start justify-center pt-1"
                        style={{ height: ht, background: `rgba(255,255,255,${podAlpha})` }}
                      >
                        <span className="mt-0.5 rounded-full border border-white/[0.10] bg-white/[0.07] px-1.5 py-0.5 text-[7.5px] font-bold text-white/50">
                          #{rank}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-white/[0.05] border border-white/[0.07]">
            <Trophy className="h-3.5 w-3.5 text-amber-400/60" />
          </div>
          <h2 className="text-[14px] font-bold tracking-tight text-white">Live Leaderboards</h2>
          {/* LIVE badge */}
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-0.5 text-[9px] font-semibold text-white/40">
            <span className={`h-1.5 w-1.5 rounded-full ${ticking ? 'bg-emerald-400 animate-ping' : 'bg-white/40 animate-pulse'}`} />
            LIVE
          </span>
          {lastUpdated && (
            <span className="hidden sm:inline text-[10px] text-white/18 tabular-nums">
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>

        {/* Right: countdown + refresh button */}
        <div className="flex items-center gap-2.5">
          {/* Countdown ring */}
          <div className="flex items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">
            {/* SVG ring */}
            <svg width="22" height="22" viewBox="0 0 22 22" className="shrink-0 -rotate-90">
              <circle cx="11" cy="11" r="8" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
              <circle
                cx="11" cy="11" r="8" fill="none"
                stroke={ticking ? 'rgba(52,211,153,0.7)' : 'rgba(255,255,255,0.28)'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 8}`}
                strokeDashoffset={`${2 * Math.PI * 8 * (1 - countdown / REFRESH_INTERVAL)}`}
                style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
              />
            </svg>
            <div className="flex flex-col items-center leading-none">
              <span className={`text-[13px] font-bold tabular-nums leading-none ${countdown <= 5 ? 'text-amber-400/80' : 'text-white/55'} transition-colors duration-300`}>
                {ticking ? (
                  <RefreshCw className="h-3 w-3 animate-spin text-emerald-400/70" />
                ) : (
                  countdown
                )}
              </span>
              <span className="mt-0.5 text-[8px] font-semibold text-white/20 tracking-wide">sec</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { nextFetchRef.current = Date.now(); fetchBoards(); }}
            disabled={ticking}
            className="flex items-center gap-1.5 rounded-[8px] border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/30 transition hover:bg-white/[0.07] hover:text-white/60 active:scale-95 disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${ticking ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Mobile: tab bar */}
      <div className="xl:hidden mb-3">
        <div ref={tabsRef} className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {LB_CONFIGS.map((cfg, i) => {
            const CFG_Icon = cfg.Icon;
            return (
              <button
                key={cfg.key}
                type="button"
                onClick={() => setActiveTab(i)}
                className={[
                  'flex shrink-0 items-center gap-1.5 rounded-[10px] border px-3.5 py-2 text-[11px] font-semibold transition-all duration-200',
                  activeTab === i
                    ? `bg-white/[0.08] border-white/[0.15] text-white/90`
                    : 'bg-white/[0.02] border-white/[0.05] text-white/35 hover:bg-white/[0.05] hover:text-white/60',
                ].join(' ')}
              >
                <CFG_Icon className={`h-3 w-3 ${activeTab === i ? cfg.iconCls : 'text-white/25'}`} />
                {cfg.label}
              </button>
            );
          })}
        </div>
        {/* Active tab card on mobile */}
        <div className="mt-3">
          {renderCard(LB_CONFIGS[activeTab], true)}
        </div>
      </div>

      {/* Desktop: full 5-col grid */}
      <div className="hidden xl:grid grid-cols-5 gap-3">
        {LB_CONFIGS.map(cfg => renderCard(cfg))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   NewHomepageContent — hero layout matching the reference image
───────────────────────────────────────────────────────────── */
type NHCLiveProfile = {
  id: string; name: string; accountType: string; createdAt: string; docrudGo: boolean;
  profile: { headline?: string; bio?: string; location?: string; avatarUrl?: string; skills?: string[]; openToWork?: boolean };
  stats: { followers: number; following: number; gigsCount: number };
  upraiseCount: number;
};
type NHCLiveGig = {
  id: string; slug: string; title: string; summary: string; category: string;
  skills: string[]; budgetLabel: string; timelineLabel: string; engagementType: string;
  locationPreference: string; ownerName: string; organizationName: string;
  connectCount: number; status: string; urgentUntil?: string; createdAt: string;
};
type NHCLiveMetrics = {
  publishes: { value: string; raw: number; label: string };
  people: { value: string; raw: number; label: string };
  upraises: { value: string; raw: number; label: string };
  gigs: { value: string; raw: number; label: string };
};
type NHCLiveFeed = {
  id: string; shareId: string; category: string; catCls: string; ilk: string;
  title: string; description: string; author: string; authorAv: string; authorBg: string;
  likes: string; likesRaw: number; comments: number; href: string;
};

function NewHomepageContent({
  softwareName,
  setDraft,
  inputRef,
  welcomeScrollRef,
  onPublishClick,
  liveProfiles = [],
  liveGigs = [],
  liveMetrics,
  liveFeeds = [],
}: {
  softwareName: string;
  headlines: string[];
  headlineIndex: number;
  setDraft: (d: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  welcomeScrollRef: React.RefObject<HTMLDivElement | null>;
  onPublishClick: () => void;
  liveProfiles?: NHCLiveProfile[];
  liveGigs?: NHCLiveGig[];
  liveMetrics?: NHCLiveMetrics | null;
  liveFeeds?: NHCLiveFeed[];
}) {
  const { data: nhcSession } = useSession();
  const [activeFeedTab, setActiveFeedTab] = React.useState<string>('All');
  const [heroDot, setHeroDot] = React.useState(0);
  const [followingSet, setFollowingSet] = React.useState<Set<string>>(new Set());
  const [pendingFollow, setPendingFollow] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const id = setInterval(() => setHeroDot((d) => (d + 1) % 4), 4000);
    return () => clearInterval(id);
  }, []);

  const heroSubtitles = [
    'Smart tools, real opportunities, limitless possibilities.',
    'Create stunning documents, PDFs & proposals in seconds.',
    'Discover top talent and exciting gigs on one platform.',
    'E-sign, share, and collaborate with complete security.',
  ];

  const handleFollow = React.useCallback(async (targetUserId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!nhcSession) { window.location.href = '/login'; return; }
    if (pendingFollow.has(targetUserId)) return;
    setPendingFollow((prev) => new Set(prev).add(targetUserId));
    const isNowFollowing = !followingSet.has(targetUserId);
    try {
      const res = await fetch('/api/profile/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action: isNowFollowing ? 'follow' : 'unfollow' }),
      });
      if (res.ok) {
        setFollowingSet((prev) => {
          const next = new Set(prev);
          if (isNowFollowing) next.add(targetUserId); else next.delete(targetUserId);
          return next;
        });
      }
    } catch { /* ignore */ }
    setPendingFollow((prev) => { const next = new Set(prev); next.delete(targetUserId); return next; });
  }, [nhcSession, followingSet, pendingFollow]);

  const feedSource = liveFeeds.length > 0 ? liveFeeds : FEEDS_DATA;
  const visibleFeeds = activeFeedTab === 'All'
    ? feedSource
    : feedSource.filter((f) => f.category === activeFeedTab);
  const displayFeeds = visibleFeeds.length > 0 ? visibleFeeds : feedSource;

  return (
    <div
      ref={welcomeScrollRef as React.RefObject<HTMLDivElement>}
      className="flex flex-1 flex-col overflow-y-auto overscroll-contain touch-pan-y scrollbar-minimal pb-[env(safe-area-inset-bottom,0px)] [padding-bottom:max(180px,calc(180px+env(safe-area-inset-bottom,0px)))] md:[padding-bottom:max(176px,calc(176px+env(safe-area-inset-bottom,0px)))]"
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6 xl:px-8 pt-3 sm:pt-4">

        {/* ── Row 1: Hero Banner + Feature Cards ──────────────────── */}
        <div className="flex gap-2 sm:gap-3 min-h-[180px] sm:min-h-[230px] lg:min-h-[260px]">

          {/* Hero card */}
          <div className="relative flex-[1.45] min-w-0 overflow-hidden rounded-[18px] sm:rounded-[22px] border border-white/[0.07] bg-[#0d0e11] shadow-[0_8px_40px_rgba(0,0,0,0.55)]">
            {/* Subtle grid overlay */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '32px 32px' }}
            />
            {/* 3D sphere — right side, overflows */}
            <div className="absolute right-[-8%] top-1/2 -translate-y-1/2 h-[170%] w-auto aspect-square pointer-events-none select-none opacity-90">
              <AnimatedSphere />
            </div>
            {/* Gradient overlay to blend sphere into background */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0d0e11] via-[#0d0e11]/75 to-transparent" />
            {/* Text content */}
            <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-6 lg:p-8">
              <div>
                <h1
                  className="font-bold leading-tight tracking-tight text-white"
                  style={{ fontSize: 'clamp(1.3rem,3.2vw,2.4rem)' }}
                >
                  <span>{softwareName.toLowerCase()}</span>{' '}
                  <span className="text-white/50">that</span>{' '}
                  <span className="text-emerald-400 drop-shadow-[0_0_18px_rgba(52,211,153,0.45)]">empowers</span>{' '}
                  <span>professionals</span>
                </h1>
                <div className="relative mt-2.5 overflow-hidden" style={{ height: 'clamp(1.1rem,2.2vw,1.4rem)', maxWidth: '26rem' }}>
                  {heroSubtitles.map((sub, idx) => {
                    const offset = idx - heroDot;
                    return (
                      <p
                        key={idx}
                        className="absolute inset-x-0 top-0 leading-relaxed text-white/50"
                        style={{
                          fontSize: 'clamp(0.7rem,1.4vw,0.875rem)',
                          transform: `translateY(${offset * 110}%)`,
                          opacity: offset === 0 ? 1 : 0,
                          transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease',
                          pointerEvents: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sub}
                      </p>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(`Show me what ${softwareName} can do for my workflow.`);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  className="mt-4 sm:mt-5 inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.14] bg-white/[0.09] px-3.5 py-2 text-[12.5px] font-semibold text-white/85 backdrop-blur-sm transition hover:bg-white/[0.15] hover:border-white/[0.22] hover:text-white active:scale-95"
                >
                  Explore now <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {/* Carousel dots */}
              <div className="flex items-center gap-1.5 mt-4">
                {[0, 1, 2, 3].map((i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Slide ${i + 1}`}
                    onClick={() => setHeroDot(i)}
                    className={[
                      'h-1.5 rounded-full transition-all duration-500 cursor-pointer',
                      heroDot === i ? 'w-5 bg-white' : 'w-1.5 bg-white/25 hover:bg-white/50',
                    ].join(' ')}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Feature cards — desktop: 4 in a row (2×2 on medium) */}
          <div className="hidden sm:grid gap-2 sm:gap-2.5" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gridTemplateRows: 'repeat(2,minmax(0,1fr))' }}>
            {HERO_FEATURE_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setDraft(`Tell me more about ${card.title}`);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className={`group flex flex-col items-start rounded-[16px] border ${card.border} bg-white/[0.04] p-3.5 backdrop-blur-xl transition hover:bg-white/[0.07] hover:-translate-y-0.5 text-left`}
                style={{ minWidth: 148, maxWidth: 200 }}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-[9px] ${card.iconBg}`}>
                  <card.Icon className={`h-4 w-4 ${card.iconColor}`} aria-hidden="true" />
                </div>
                <div className="mt-2.5 text-[12.5px] font-bold leading-snug text-white">{card.title}</div>
                <div className="mt-1 flex-1 text-[10.5px] leading-relaxed text-white/40 line-clamp-2">{card.description}</div>
                <div className="mt-2.5 flex items-center gap-1 text-[10.5px] font-semibold text-white/30 transition-colors group-hover:text-white/55">
                  View details <ArrowRight className="h-2.5 w-2.5" />
                </div>
              </button>
            ))}
          </div>
          {/* Feature cards — mobile: horizontal scroll */}
          <div className="sm:hidden flex gap-2 overflow-x-auto no-scrollbar shrink-0 w-[136px]">
            {HERO_FEATURE_CARDS.map((card) => (
              <div
                key={card.id}
                className={`shrink-0 flex flex-col rounded-[13px] border ${card.border} bg-white/[0.04] p-3 w-[130px]`}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-[8px] ${card.iconBg}`}>
                  <card.Icon className={`h-3.5 w-3.5 ${card.iconColor}`} aria-hidden="true" />
                </div>
                <div className="mt-2 text-[11.5px] font-bold leading-snug text-white">{card.title}</div>
                <div className="mt-0.5 text-[10px] leading-relaxed text-white/40 line-clamp-3">{card.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Row 2: New Professionals — infinite auto-smooth slider ── */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-white/50" />
              <h2 className="text-[13.5px] font-bold text-white">Top Professionals</h2>
            </div>
            <Link href="/people" className="flex items-center gap-1 text-[11.5px] font-semibold text-white/40 transition hover:text-white/70">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {/* Infinite duplicated slider — pauses on hover/touch */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 sm:w-16 bg-gradient-to-r from-[#0d0e11] via-[#0d0e11]/55 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 sm:w-16 bg-gradient-to-l from-[#0d0e11] via-[#0d0e11]/55 to-transparent" />
          <div
            id="pros-slider"
            data-auto-slider="true"
            data-auto-speed="0.6"
            data-auto-loop="sets"
            data-auto-sets="2"
            className="no-scrollbar flex gap-2.5 sm:gap-3 overflow-x-auto pb-0.5"
            style={{ scrollbarWidth: 'none' }}
          >
            {/* Render two copies for infinite loop illusion */}
            {[...Array(2)].flatMap((_, copyIdx) => {
              const profiles = liveProfiles.length > 0
                ? liveProfiles.slice(0, 12).map((p, i) => ({
                    id: `${copyIdx}-live-${p.id}-${i}`,
                    name: p.name,
                    role: p.profile.headline || (p.accountType === 'individual' ? 'Professional' : 'Business'),
                    avatar: p.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
                    avatarBg: ['from-pink-500 to-rose-600','from-blue-500 to-indigo-600','from-purple-500 to-violet-600','from-orange-500 to-amber-600','from-teal-500 to-emerald-600','from-cyan-500 to-blue-600','from-fuchsia-500 to-pink-600','from-red-500 to-rose-600'][i % 8],
                    location: p.profile.location || '',
                    skills: (p.profile.skills || []).slice(0, 3),
                    upraises: p.upraiseCount,
                    followers: p.stats.followers,
                    openToWork: p.profile.openToWork,
                    profileId: p.id,
                  }))
                : NEW_PROFESSIONALS.slice(0, 6).map((p, i) => ({
                    id: `${copyIdx}-static-${p.id}-${i}`,
                    name: p.name, role: p.role, avatar: p.avatar, avatarBg: p.avatarBg,
                    location: '', skills: [...p.skills], upraises: 0, followers: 0,
                    openToWork: false, profileId: '',
                  }));
              return profiles.map((pro) => {
                const profileHref = pro.profileId ? `/u/${pro.profileId}` : '/people';
                const isFollowed = followingSet.has(pro.profileId);
                const isPending = pendingFollow.has(pro.profileId);
                return (
                  <div
                    key={pro.id}
                    className="relative shrink-0 w-[min(200px,58vw)] sm:w-[210px] rounded-[14px] border border-white/[0.07] bg-white/[0.04] p-3.5 backdrop-blur-xl transition hover:bg-white/[0.08] hover:-translate-y-0.5 hover:border-white/[0.13] group"
                  >
                    {/* stretched navigation link — sits below button */}
                    <Link href={profileHref} className="absolute inset-0 z-0 rounded-[14px]" aria-label={pro.name} />
                    <div className="relative z-10 pointer-events-none">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative shrink-0">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${pro.avatarBg} text-[11px] font-bold text-white shadow-md`}>
                              {pro.avatar}
                            </div>
                            {pro.openToWork && (
                              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-[#0d0e11] bg-emerald-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[12px] font-bold text-white leading-tight">{pro.name}</div>
                            <div className="truncate text-[10.5px] text-white/40 leading-snug">{pro.role}</div>
                          </div>
                        </div>
                        {pro.upraises > 0 && (
                          <span className="shrink-0 flex items-center gap-0.5 text-[9.5px] text-amber-400/70 mt-0.5">
                            <Sparkles className="h-2.5 w-2.5" />{pro.upraises}
                          </span>
                        )}
                      </div>
                      {pro.location && (
                        <div className="mt-1.5 text-[9.5px] text-white/25 truncate">{pro.location}</div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {pro.skills.slice(0, 3).map((sk) => (
                          <span key={sk} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 text-[9.5px] font-medium text-white/45">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isPending || !pro.profileId}
                      onClick={(e) => pro.profileId ? handleFollow(pro.profileId, e) : undefined}
                      className={[
                        'relative z-10 mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[9px] border py-1.5 text-[11px] font-semibold transition active:scale-95',
                        isFollowed
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                          : 'border-white/[0.09] bg-white/[0.04] text-white/60 hover:bg-white/[0.10] hover:text-white/90',
                        isPending ? 'opacity-50 cursor-not-allowed' : '',
                      ].join(' ')}
                    >
                      {isFollowed ? (
                        <><Check className="h-3 w-3" /> Following</>
                      ) : (
                        <><UserPlus className="h-3 w-3" /> Follow</>
                      )}
                    </button>
                  </div>
                );
              });
            })}
          </div>
          </div>
        </section>

        {/* ── Row 3: Live Gigs — auto-smooth slider ──────────────── */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-white/50" />
              <h2 className="text-[13.5px] font-bold text-white">Live Gigs</h2>
            </div>
            <Link href="/gigs" className="flex items-center gap-1 text-[11.5px] font-semibold text-white/40 transition hover:text-white/70">
              Browse all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 sm:w-16 bg-gradient-to-r from-[#0d0e11] via-[#0d0e11]/55 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 sm:w-16 bg-gradient-to-l from-[#0d0e11] via-[#0d0e11]/55 to-transparent" />
          <div
            id="gigs-slider"
            data-auto-slider="true"
            data-auto-speed="0.5"
            data-auto-loop="sets"
            data-auto-sets="2"
            className="no-scrollbar flex gap-2.5 sm:gap-3 overflow-x-auto pb-0.5"
            style={{ scrollbarWidth: 'none' }}
          >
            {[...Array(2)].flatMap((_, copyIdx) => {
              const gigsSource = liveGigs.length > 0 ? liveGigs.slice(0, 10) : GIGS_DATA.slice(0, 6);
              return gigsSource.map((gig, i) => {
                const isLive = liveGigs.length > 0;
                const title = isLive ? (gig as NHCLiveGig).title : (gig as typeof GIGS_DATA[0]).title;
                const org = isLive ? (gig as NHCLiveGig).organizationName : (gig as typeof GIGS_DATA[0]).company;
                const budget = isLive ? (gig as NHCLiveGig).budgetLabel : (gig as typeof GIGS_DATA[0]).budget;
                const loc = isLive ? ((gig as NHCLiveGig).locationPreference === 'remote' ? 'Remote' : 'On-site') : (gig as typeof GIGS_DATA[0]).location;
                const skills = isLive ? (gig as NHCLiveGig).skills.slice(0, 3) : [...(gig as typeof GIGS_DATA[0]).skills].slice(0, 3);
                const logoLetters = org.slice(0, 2).toUpperCase();
                const logoBgs = ['bg-blue-600','bg-purple-600','bg-emerald-600','bg-rose-600','bg-amber-600','bg-indigo-600','bg-teal-600','bg-pink-600'];
                const gigHref = isLive ? `/gigs/${(gig as NHCLiveGig).slug}` : '/gigs';
                return (
                  <Link
                    key={`${copyIdx}-gig-${i}`}
                    href={gigHref}
                    className="shrink-0 w-[min(260px,74vw)] sm:w-[270px] rounded-[14px] border border-white/[0.07] bg-white/[0.04] p-3.5 backdrop-blur-xl transition hover:bg-white/[0.08] hover:-translate-y-0.5 hover:border-white/[0.13] flex flex-col gap-2.5 block"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] ${logoBgs[i % logoBgs.length]} text-[11px] font-bold text-white`}>
                        {logoLetters}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-bold text-white leading-snug">{title}</div>
                        <div className="truncate text-[10.5px] text-white/40">{org} · {loc}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {skills.map((sk) => (
                        <span key={sk} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 text-[9.5px] font-medium text-white/45">{sk}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-400">{budget}</span>
                      <span className="flex items-center gap-1 rounded-[8px] border border-white/[0.10] bg-white/[0.05] px-2.5 py-1 text-[10.5px] font-semibold text-white/65">
                        Apply <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </Link>
                );
              });
            })}
          </div>
          </div>
        </section>

        {/* ── Row 4: Feeds — auto-smooth slider ────────────────────── */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Newspaper className="h-3.5 w-3.5 text-white/50" />
              <h2 className="text-[13.5px] font-bold text-white">Feeds</h2>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/file-directory" className="hidden sm:flex items-center gap-1 text-[11.5px] font-semibold text-white/40 transition hover:text-white/70">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
              <div className="flex gap-1">
                <button type="button" onClick={() => { const el = document.getElementById('feeds-slider'); if (el) el.scrollBy({ left: -280, behavior: 'smooth' }); }} className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.03] text-white/40 transition hover:text-white/75">
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => { const el = document.getElementById('feeds-slider'); if (el) el.scrollBy({ left: 280, behavior: 'smooth' }); }} className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.03] text-white/40 transition hover:text-white/75">
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
          {/* Category tabs */}
          <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto">
            {FEED_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveFeedTab(cat)}
                className={[
                  'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition',
                  activeFeedTab === cat
                    ? 'border border-white/[0.18] bg-white/[0.11] text-white'
                    : 'border border-white/[0.06] bg-transparent text-white/40 hover:text-white/65 hover:border-white/[0.12]',
                ].join(' ')}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* Auto-smooth scrolling feed cards */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 sm:w-16 bg-gradient-to-r from-[#0d0e11] via-[#0d0e11]/55 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 sm:w-16 bg-gradient-to-l from-[#0d0e11] via-[#0d0e11]/55 to-transparent" />
          <div
            id="feeds-slider"
            data-auto-slider="true"
            data-auto-speed="0.45"
            data-auto-loop="sets"
            data-auto-sets="2"
            className="no-scrollbar flex gap-2.5 sm:gap-3 overflow-x-auto pb-0.5"
            style={{ scrollbarWidth: 'none' }}
          >
            {[...Array(2)].flatMap((_, copyIdx) =>
              displayFeeds.map((feed, i) => {
                const href = (feed as NHCLiveFeed).href ?? '/file-directory';
                return (
                  <Link
                    key={`${copyIdx}-feed-${feed.id}-${i}`}
                    href={href}
                    className="group shrink-0 flex w-[min(200px,58vw)] sm:w-[210px] flex-col overflow-hidden rounded-[14px] border border-white/[0.07] bg-white/[0.04] backdrop-blur-xl transition hover:bg-white/[0.08] hover:-translate-y-0.5 hover:border-white/[0.13]"
                  >
                    {/* Illustration */}
                    <div className="relative flex h-[88px] sm:h-[96px] items-center justify-center overflow-hidden bg-[#0f1013]">
                      <FeedIllustration kind={feed.ilk} />
                      <span className={`absolute top-2 left-2 rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${feed.catCls}`}>
                        {feed.category}
                      </span>
                    </div>
                    {/* Content */}
                    <div className="flex flex-1 flex-col p-3">
                      <div className="text-[12px] font-bold leading-snug text-white line-clamp-2">{feed.title}</div>
                      <div className="mt-1 flex-1 text-[10.5px] leading-relaxed text-white/40 line-clamp-2">{feed.description}</div>
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${feed.authorBg} text-[8px] font-bold text-white`}>
                          {feed.authorAv}
                        </div>
                        <span className="flex-1 truncate text-[10px] font-medium text-white/40">{feed.author}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2.5 border-t border-white/[0.05] pt-2">
                        <span className="flex items-center gap-0.5 text-[10.5px] text-white/30">
                          <Heart className="h-2.5 w-2.5" /> {feed.likes}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10.5px] text-white/30">
                          <MessageCircle className="h-2.5 w-2.5" /> {feed.comments}
                        </span>
                        <Bookmark className="ml-auto h-2.5 w-2.5 text-white/20" />
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
          </div>
        </section>

        {/* ── Row 5: Live Platform Metrics + CTA ──────────────────── */}
        <div className="grid grid-cols-1 min-[440px]:grid-cols-2 gap-2.5 sm:gap-3">
          {/* Real Metrics */}
          <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-4 sm:p-5 backdrop-blur-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30 mb-3.5">
              Platform activity
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
              {[
                { key: 'publishes', Icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { key: 'people', Icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { key: 'upraises', Icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { key: 'gigs', Icon: Briefcase, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              ].map(({ key, Icon, color, bg }) => {
                const m = liveMetrics?.[key as keyof typeof liveMetrics];
                return (
                  <div key={key} className="flex items-center gap-2.5">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] ${bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-white leading-none">
                        {m ? m.value : '—'}
                      </div>
                      <div className="mt-0.5 text-[9.5px] font-medium text-white/35 leading-none capitalize">
                        {m ? m.label : key}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* CTA */}
          <div className="flex flex-col justify-between rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-4 sm:p-5 backdrop-blur-xl">
            <div>
              <p className="text-[14px] font-bold text-white leading-snug">Build your professional presence</p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/40">
                Publish your work, showcase skills, and get discovered by top opportunities.
              </p>
            </div>
            <div className="mt-3.5 flex flex-col gap-2">
              <button
                type="button"
                onClick={onPublishClick}
                className="flex items-center justify-between rounded-[10px] border border-white/[0.12] bg-white px-4 py-2.5 text-[12.5px] font-bold text-[#0d0e11] transition hover:bg-white/90 active:scale-95 shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
              >
                Publish something <Send className="h-3.5 w-3.5" />
              </button>
              <Link
                href="/people"
                className="flex items-center justify-between rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[12px] font-semibold text-white/60 transition hover:bg-white/[0.08] hover:text-white/85 active:scale-95"
              >
                Explore professionals <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Row 6: Live Multi-Leaderboards ──────────────────────── */}
        <LiveLeaderboards />

        {/* ── Row 7: Built in India ──────────────────────────────── */}
        <BuiltInIndia />

        {/* ── Footer ───────────────────────────────────────────────── */}
        <PremiumFooter />

      </div>
    </div>
  );
}

export default function PublicHomepage({ softwareName, accentLabel, guestMode = false }: PublicHomepageProps) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalStep, setAccountModalStep] = useState<'main' | 'delete' | 'deactivate'>('main');
  const [accountModalPw, setAccountModalPw] = useState('');
  const [accountModalError, setAccountModalError] = useState('');
  const [accountModalLoading, setAccountModalLoading] = useState(false);
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => buildWelcomeMessages());
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [topSearch, setTopSearch] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);
  const [attachedDocument, setAttachedDocument] = useState<UploadedDocument | null>(null);
  const [uploadStage, setUploadStage] = useState<'idle' | 'reading' | 'analyzing' | 'ready' | 'error'>('idle');
  const [uploadStatusLabel, setUploadStatusLabel] = useState<string>('');
  const [assistantStatusLabel, setAssistantStatusLabel] = useState<string>('');
  const [typingId, setTypingId] = useState<string | null>(null);
  const [typedChars, setTypedChars] = useState(0);
  const [processingStage, setProcessingStage] = useState(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [quickEditorOpen, setQuickEditorOpen] = useState(false);
  const [composerHidden, setComposerHidden] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [mobileNavSearchOpen, setMobileNavSearchOpen] = useState(false);
  const [mobileNavSearchQuery, setMobileNavSearchQuery] = useState('');
  const mobileNavSearchRef = useRef<HTMLInputElement>(null);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const [chatHistoryQuery, setChatHistoryQuery] = useState('');
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [secureSharingOpen, setSecureSharingOpen] = useState(false);
  const [pdfStudioOpen, setPdfStudioOpen] = useState(false);
  const [formsStudioOpen, setFormsStudioOpen] = useState(false);
  const [showVisualizerModal, setShowVisualizerModal] = useState(false);
  const [eSignStudioOpen, setESignStudioOpen] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ kind: 'ask' | 'file' | 'resume'; label: string; href?: string; meta?: string }>>([]);

  /* ── Live homepage data ─────────────────────────────────────── */
  type LiveProfile = {
    id: string; name: string; accountType: string; createdAt: string; docrudGo: boolean;
    profile: { headline?: string; bio?: string; location?: string; avatarUrl?: string; skills?: string[]; openToWork?: boolean };
    stats: { followers: number; following: number; gigsCount: number };
    upraiseCount: number;
  };
  type LiveGig = {
    id: string; slug: string; title: string; summary: string; category: string;
    skills: string[]; budgetLabel: string; timelineLabel: string; engagementType: string;
    locationPreference: string; ownerName: string; organizationName: string;
    connectCount: number; status: string; urgentUntil?: string; createdAt: string;
  };
  type LiveMetrics = {
    publishes: { value: string; raw: number; label: string };
    people: { value: string; raw: number; label: string };
    upraises: { value: string; raw: number; label: string };
    gigs: { value: string; raw: number; label: string };
  };
  type LiveFeed = NHCLiveFeed;
  const [liveProfiles, setLiveProfiles] = useState<LiveProfile[]>([]);
  const [liveGigs, setLiveGigs] = useState<LiveGig[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [liveFeeds, setLiveFeeds] = useState<LiveFeed[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [pRes, gRes, mRes, fRes] = await Promise.all([
          fetch('/api/public/people'),
          fetch('/api/public/gigs'),
          fetch('/api/public/homepage-metrics'),
          fetch('/api/public/feeds'),
        ]);
        if (pRes.ok) {
          const d = await pRes.json() as { people?: LiveProfile[] };
          if (Array.isArray(d.people)) {
            const sorted = [...d.people].sort((a, b) => (b.upraiseCount - a.upraiseCount) || (b.stats.followers - a.stats.followers));
            setLiveProfiles(sorted);
          }
        }
        if (gRes.ok) {
          const d = await gRes.json() as { gigs?: LiveGig[] };
          if (Array.isArray(d.gigs)) setLiveGigs(d.gigs.filter((g) => g.status === 'published'));
        }
        if (mRes.ok) {
          const d = await mRes.json() as LiveMetrics;
          setLiveMetrics(d);
        }
        if (fRes.ok) {
          const d = await fRes.json() as { feeds?: LiveFeed[] };
          if (Array.isArray(d.feeds)) setLiveFeeds(d.feeds);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const headlines = [
    'reads documents',
    'drafts contracts',
    'summarizes PDFs',
    'secures files',
    'manages gigs',
    'empowers professionals',
  ];

  const processingStages = [
    'Searching knowledge base…',
    'Analyzing your query…',
    'Retrieving relevant content…',
    'Composing response…',
  ];

  const searchAbortRef = useRef<AbortController | null>(null);
  const topSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [showTopSuggestions, setShowTopSuggestions] = useState(false);
  const [showBottomSuggestions, setShowBottomSuggestions] = useState(false);

  const handleSearchChange = (val: string, source: 'top' | 'bottom') => {
    const query = val.trim();
    if (query.length <= 1) {
      if (source === 'top') setShowTopSuggestions(false);
      else setShowBottomSuggestions(false);
      setSearchSuggestions([]);
      return;
    }

    if (source === 'top') {
      setShowTopSuggestions(true);
      setShowBottomSuggestions(false);
    } else {
      setShowBottomSuggestions(true);
      setShowTopSuggestions(false);
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    void (async () => {
      try {
        const [dirRes, resumeRes] = await Promise.all([
          fetch(`/api/public/file-directory/search?query=${encodeURIComponent(query)}`, { signal: controller.signal }),
          fetch(`/api/resumes?q=${encodeURIComponent(query)}&limit=6`, { signal: controller.signal }),
        ]);
        const dirPayload = dirRes.ok ? await dirRes.json().catch(() => null) as any : null;
        const resumePayload = resumeRes.ok ? await resumeRes.json().catch(() => null) as any : null;
        const dirResults = Array.isArray(dirPayload?.results) ? dirPayload.results : [];
        const resumeResults = Array.isArray(resumePayload?.entries) ? resumePayload.entries : [];

        const merged: Array<{ kind: 'ask' | 'file' | 'resume'; label: string; href?: string; meta?: string }> = [];
        merged.push({ kind: 'ask', label: `Ask: ${query}` });

        for (const entry of dirResults.slice(0, 6)) {
          merged.push({
            kind: 'file',
            label: String(entry.title || entry.fileName || 'File'),
            href: String(entry.linkHref || ''),
            meta: `${String(entry.visibility || 'public')} · ${String(entry.fileName || '').slice(-28)}`,
          });
        }

        for (const entry of resumeResults.slice(0, 6)) {
          merged.push({
            kind: 'resume',
            label: String(entry.displayName || entry.slug || 'Resume'),
            href: entry.slug ? `/talent/${String(entry.slug)}` : '/talent',
            meta: entry.headline ? String(entry.headline) : 'Talent',
          });
        }

        setSearchSuggestions(merged.slice(0, 14));
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setSearchSuggestions([{ kind: 'ask', label: `Ask: ${query}` }]);
      }
    })();
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const welcomeScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const voiceRef = useRef<any>(null);
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null);

  const safeHref = useMemo(() => (href: string) => {
    if (!isAuthenticated && href.startsWith('/workspace')) return '/login';
    return href;
  }, [isAuthenticated]);

  const brandLower = (softwareName || 'docrud').toLowerCase();
  const hasAnyChat = messages.some((m) => m.role === 'user');
  const indiaCards = useMemo(() => {
    const base = [...INDIA_HIGHLIGHTS];
    const seed = new Date().toISOString().slice(0, 10); // stable per day
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    for (let i = base.length - 1; i > 0; i--) {
      h = Math.imul(h ^ (i + 1), 16777619);
      const j = Math.abs(h) % (i + 1);
      [base[i], base[j]] = [base[j], base[i]];
    }
    return base;
  }, []);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState<SliderDetails | null>(null);
  const openDetails = (next: SliderDetails) => {
    setDetails(next);
    setDetailsOpen(true);
  };

  const loadThreads = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/home-chat', { method: 'GET' });
      if (!res.ok) return;
      const data = await res.json() as { threads?: ChatThreadSummary[] };
      if (Array.isArray(data.threads)) setThreads(data.threads);
    } catch {
      // ignore
    }
  };

  const loadThread = async (threadId: string) => {
    if (!isAuthenticated) return;
    setError(null);
    try {
      const res = await fetch(`/api/home-chat/${threadId}`, { method: 'GET' });
      if (!res.ok) return;
      const data = await res.json() as { thread?: { id: string; messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt: string }> } };
      const thread = data.thread;
      if (!thread) return;
      setActiveThreadId(threadId);
      setMessages(thread.messages.length ? thread.messages.map((m) => ({ ...m, sources: undefined })) : []);
      setMobileSidebarOpen(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch {
      // ignore
    }
  };

  const createThread = async () => {
    if (!isAuthenticated) return null;
    setError(null);
    try {
      const res = await fetch('/api/home-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'New chat' }),
      });
      if (!res.ok) return null;
      const data = await res.json() as { thread?: { id: string } };
      const nextId = data.thread?.id || null;
      if (!nextId) return null;
      await loadThreads();
      setActiveThreadId(nextId);
      return nextId;
    } catch {
      return null;
    }
  };

  const sendMessage = async (params?: { message?: string; action?: DocumentQuickAction }) => {
    const rawMessage = typeof params?.message === 'string' ? params!.message : draft;
    const text = compactText(rawMessage);
    const action = params?.action;
    if ((!text && !action && !attachedDocument) || sending) return;
    setSending(true);
    setError(null);
    setDraft('');
    setAssistantStatusLabel('doCRUD is processing...');

    const displayContent = text || (action ? `/${action}` : 'Please analyze the attached document.');
    const userEntry: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: attachedDocument ? `[Document: ${attachedDocument.name}]\n\n${displayContent}` : displayContent,
      createdAt: new Date().toISOString(),
      requestMeta: { message: text || '', action },
    };
    setMessages((prev) => [...prev, userEntry]);

    try {
      let threadId = activeThreadId;
      if (isAuthenticated && !threadId) {
        threadId = await createThread();
      }

      const res = await fetch('/api/home-chat/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          threadId: threadId || undefined,
          message: text || '',
          action: action || undefined,
          document: attachedDocument || undefined,
        }),
      });

      const data = await res.json() as { card?: AssistantResultCard; content: string; error?: string; sources?: ChatMessage['sources'] };
      if (!res.ok) throw new Error(data.error || 'Failed to answer');

      const assistantId = crypto.randomUUID();
      const assistant: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: data.content,
        createdAt: new Date().toISOString(),
        sources: Array.isArray(data.sources) ? data.sources : undefined,
        card: data.card,
        requestMeta: { message: text || '', action },
      };
      setTypedChars(0);
      setTypingId(assistantId);
      setMessages((prev) => [...prev, assistant]);
      if (isAuthenticated) await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to answer');
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: 'Something went wrong. Try again in a moment.', createdAt: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
      setAssistantStatusLabel('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  useEffect(() => {
    void loadThreads();
  }, [isAuthenticated]);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (mobileNavSearchOpen && mobileNavSearchRef.current) {
      setTimeout(() => mobileNavSearchRef.current?.focus(), 120);
    }
  }, [mobileNavSearchOpen]);

  useEffect(() => {
    if (!workspaceMenuOpen) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (workspaceMenuRef.current && workspaceMenuRef.current.contains(target)) return;
      setWorkspaceMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [workspaceMenuOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typedChars]);

  // Typing animation effect
  useEffect(() => {
    if (!typingId) return;
    const msg = messages.find((m) => m.id === typingId);
    if (!msg) return;
    if (typedChars >= msg.content.length) {
      setTypingId(null);
      return;
    }
    const charsPerTick = msg.content.length > 800 ? 18 : msg.content.length > 300 ? 12 : 6;
    typingTimerRef.current = setTimeout(() => {
      setTypedChars((c) => Math.min(c + charsPerTick, msg.content.length));
    }, 16);
    return () => { if (typingTimerRef.current) clearTimeout(typingTimerRef.current); };
  }, [typingId, typedChars, messages]);

  // Processing stage cycling
  useEffect(() => {
    if (!sending) { setProcessingStage(0); return; }
    const id = setInterval(() => setProcessingStage((s) => (s + 1) % 4), 1600);
    return () => clearInterval(id);
  }, [sending]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    if (!chatHistoryOpen) return;
    if (!isAuthenticated) return;
    void loadThreads();
  }, [chatHistoryOpen, isAuthenticated]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    let lastTop = node.scrollTop;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const top = node.scrollTop;
        const delta = top - lastTop;
        lastTop = top;
        ticking = false;
        if (top < 60) {
          setComposerHidden(false);
          return;
        }
        if (delta > 10) {
          setComposerHidden(true);
        } else if (delta < -10) {
          setComposerHidden(false);
        }
      });
    };

    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll as any);
  }, []);

  useEffect(() => {
    if (hasAnyChat) return;
    const sliders = Array.from(document.querySelectorAll<HTMLElement>('[data-auto-slider="true"]'));
    if (!sliders.length) return;

    const controllers: Array<{
      node: HTMLElement;
      cleanup: () => void;
      rafId: number;
    }> = [];

    for (const node of sliders) {
      let isPaused = false;
      const onEnter = () => { isPaused = true; };
      const onLeave = () => { isPaused = false; };
      node.addEventListener('mouseenter', onEnter);
      node.addEventListener('mouseleave', onLeave);
      node.addEventListener('touchstart', onEnter, { passive: true });
      node.addEventListener('touchend', onLeave, { passive: true });

      let scrollAmount = node.scrollLeft;
      const speed = Number(node.getAttribute('data-auto-speed') || '0.55'); // px per frame
      const loopMode = node.getAttribute('data-auto-loop') || 'end';
      const loopSets = Number(node.getAttribute('data-auto-sets') || '1');

      let controller: {
        node: HTMLElement;
        cleanup: () => void;
        rafId: number;
      };

      const step = () => {
        if (!isPaused) {
          scrollAmount += speed;
          const max = Math.max(0, node.scrollWidth - node.clientWidth);

          if (loopMode === 'sets' && loopSets > 1) {
            const setWidth = node.scrollWidth / loopSets;
            if (scrollAmount >= setWidth) scrollAmount = 0;
          } else if (scrollAmount >= max) {
            scrollAmount = 0;
          }

          node.scrollLeft = scrollAmount;
        } else {
          scrollAmount = node.scrollLeft;
        }
        controller.rafId = requestAnimationFrame(step);
      };

      controller = {
        node,
        rafId: 0,
        cleanup: () => {
          node.removeEventListener('mouseenter', onEnter);
          node.removeEventListener('mouseleave', onLeave);
          node.removeEventListener('touchstart', onEnter as any);
          node.removeEventListener('touchend', onLeave as any);
        },
      };
      controllers.push(controller);
      controller.rafId = requestAnimationFrame(step);
    }

    return () => {
      for (const c of controllers) {
        cancelAnimationFrame(c.rafId);
        c.cleanup();
      }
    };
  }, [hasAnyChat]);

  const scrollSliderById = (id: string, dir: 1 | -1) => {
    const node = document.getElementById(id);
    if (!node) return;
    const amount = Math.max(240, Math.round(node.clientWidth * 0.85));
    node.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  useEffect(() => {
    let io: IntersectionObserver | null = null;
    // Small delay so layout is settled before observing
    const timer = setTimeout(() => {
      const root = welcomeScrollRef.current ?? null;
      const nodes = root
        ? Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
        : Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
      if (!nodes.length) return;
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              (e.target as HTMLElement).classList.add('is-visible');
              io?.unobserve(e.target);
            }
          }
        },
        { root, threshold: 0.04, rootMargin: '0px 0px 0px 0px' },
      );
      nodes.forEach((n) => io!.observe(n));
    }, 120);
    return () => {
      clearTimeout(timer);
      io?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (hasAnyChat) return;
    const interval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % headlines.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [hasAnyChat, headlines.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        topSearchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    if (voiceRef.current && voiceActive) {
      try {
        voiceRef.current.stop();
      } catch {
        // ignore
      }
      setVoiceActive(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results || [])
        .map((r: any) => r[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcript) {
        setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript).slice(0, 1500));
      }
    };
    recognition.onerror = () => {
      setVoiceActive(false);
    };
    recognition.onend = () => {
      setVoiceActive(false);
    };

    voiceRef.current = recognition;
    setVoiceActive(true);
    setError(null);
    recognition.start();
  };

  /* ── Collapsed icon-rail (desktop only) ── */
  const sidebarCollapsedRail = (
    <div className="flex h-full flex-col items-center py-4 gap-0.5">
      {/* Logo gem */}
      <div className="mb-3 flex h-9 w-9 items-center justify-center">
        <div className="h-[14px] w-[14px] rotate-45 rounded-[3px] bg-gradient-to-br from-white via-slate-200 to-slate-400 shadow-[0_0_16px_rgba(255,255,255,0.20)]" />
      </div>
      {/* Expand */}
      <button
        type="button"
        title="Expand menu"
        onClick={() => setSidebarCollapsed(false)}
        className="mb-1 flex h-9 w-9 items-center justify-center rounded-[12px] text-white/22 transition-all duration-150 hover:bg-white/[0.07] hover:text-white/65 active:scale-95"
        aria-label="Expand sidebar"
      >
        <LayoutGrid className="h-[15px] w-[15px]" />
      </button>
      <div className="my-1 h-px w-6 rounded-full bg-white/[0.06]" />
      {/* Nav icons */}
      {sidebarNav.map((item) => {
        const active = item.label === 'AI Chat';
        const isSecureSharing = item.label === 'Secure Sharing';
        const isPdfEditor = item.label === 'PDF Editor';
        const isVisualizer = item.label === 'Visualizer';
        const isForms = item.label === 'Forms';
        const isESign = item.label === 'E‑Sign';
        const resolvedHref = item.label === 'My Profile' && isAuthenticated
          ? `/u/${(session?.user as any)?.id ?? ''}` || item.href
          : item.href;
        const sharedCls = [
          'relative flex h-9 w-9 items-center justify-center rounded-[12px] transition-all duration-150',
          active
            ? 'bg-white/[0.10] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
            : 'text-white/28 hover:bg-white/[0.07] hover:text-white/70',
        ].join(' ');
        if (isSecureSharing) {
          return (
            <button
              key={item.label}
              type="button"
              title={item.label}
              onClick={() => setSecureSharingOpen(true)}
              className={sharedCls}
            >
              <item.Icon className="h-4 w-4" />
            </button>
          );
        }
        if (isPdfEditor) {
          return (
            <button
              key={item.label}
              type="button"
              title={item.label}
              onClick={() => setPdfStudioOpen(true)}
              className={sharedCls}
            >
              <item.Icon className="h-4 w-4" />
            </button>
          );
        }
        if (isForms) {
          return (
            <button
              key={item.label}
              type="button"
              title={item.label}
              onClick={() => setFormsStudioOpen(true)}
              className={sharedCls}
            >
              <item.Icon className="h-4 w-4" />
            </button>
          );
        }
        if (isVisualizer) {
          return (
            <button
              key={item.label}
              type="button"
              title={item.label}
              onClick={() => setShowVisualizerModal(true)}
              className={sharedCls}
            >
              <item.Icon className="h-4 w-4" />
            </button>
          );
        }
        if (isESign) {
          return (
            <button
              key={item.label}
              type="button"
              title={item.label}
              onClick={() => setESignStudioOpen(true)}
              className={sharedCls}
            >
              <item.Icon className="h-4 w-4" />
            </button>
          );
        }
        return (
          <Link
            key={item.label}
            href={safeHref(resolvedHref)}
            title={item.label}
            className={sharedCls}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-[16px] w-[2px] -translate-y-1/2 rounded-r-full bg-white/80 shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
            )}
            <item.Icon className="h-[15px] w-[15px]" />
          </Link>
        );
      })}
      {/* Bottom */}
      <div className="mt-auto flex flex-col items-center gap-1">
        <div className="mb-1 h-px w-6 rounded-full bg-white/[0.06]" />
        {/* User avatar */}
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-gradient-to-br from-white/[0.16] to-white/[0.05] text-[11px] font-bold text-white/70 ring-1 ring-white/[0.12] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
          {(session?.user?.name || 'G').charAt(0).toUpperCase()}
        </div>
        <Link
          href={isAuthenticated ? '/workspace' : '/login'}
          title="Settings"
          className="flex h-8 w-8 items-center justify-center rounded-[12px] text-white/18 transition hover:bg-white/[0.07] hover:text-white/55 active:scale-95"
        >
          <Settings className="h-[14px] w-[14px]" />
        </Link>
      </div>
    </div>
  );

  /* ── Expanded sidebar (desktop + mobile) ── */
  const sidebarExpanded = (onClose?: () => void) => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] border border-white/[0.10] bg-white/[0.07] shadow-[0_0_12px_rgba(255,255,255,0.06)]">
            <div className="h-[11px] w-[11px] rotate-45 rounded-[2px] bg-gradient-to-br from-white to-slate-300" />
          </div>
          <span className="text-[13.5px] font-semibold tracking-[-0.025em] text-white/90">{softwareName}</span>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-xl text-white/25 transition hover:bg-white/[0.07] hover:text-white/70"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(true)}
            className="flex h-7 w-7 items-center justify-center rounded-xl text-white/20 transition hover:bg-white/[0.07] hover:text-white/60"
            aria-label="Collapse"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* New chat */}
      <div className="shrink-0 px-3 pt-3 pb-1">
        <button
          type="button"
          onClick={() => { if (!isAuthenticated && !guestMode) { window.location.assign('/login'); return; } void createThread(); if (onClose) onClose(); }}
          className="group flex w-full items-center gap-2.5 rounded-[13px] border border-white/[0.08] bg-white/[0.04] px-3 py-[10px] text-[12.5px] font-semibold text-white/55 transition-all hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-white/90"
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/[0.10] bg-white/[0.06] transition group-hover:bg-white/[0.10]">
            <Plus className="h-3 w-3" />
          </div>
          New conversation
        </button>
      </div>

      {/* Nav body */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 pt-3 scrollbar-minimal">
        {guestMode ? (
          /* Guest mode: show only AI Chat */
          <div className="mb-5">
            <div className="flex items-center gap-1.5 px-2 mb-2">
              <span className="h-[5px] w-[5px] rounded-full bg-amber-400/50" />
              <p className="text-[9px] font-semibold tracking-[0.13em] text-amber-400/50">incognito</p>
            </div>
            <div className="space-y-px">
              <Link
                href="/"
                onClick={() => onClose?.()}
                className="group relative flex items-center gap-3 rounded-[11px] px-3 py-[9px] text-[13px] font-medium bg-white/[0.09] text-white ring-1 ring-inset ring-white/[0.08] transition-all"
              >
                <span className="absolute left-0 top-1/2 h-[18px] w-[2.5px] -translate-y-1/2 rounded-r-full bg-white/60" />
                <Sparkles className="h-[15px] w-[15px] shrink-0 text-white/75" />
                AI Chat
              </Link>
              {/* Locked items preview */}
              {[
                { label: 'Documents', Icon: FileText },
                { label: 'PDF Editor', Icon: Wand2 },
                { label: 'E‑Sign', Icon: FileSignature },
              ].map(({ label, Icon }) => (
                <div
                  key={label}
                  title="Sign in to access"
                  className="flex items-center gap-3 rounded-[11px] px-3 py-[9px] text-[13px] font-medium text-white/15 cursor-not-allowed select-none"
                >
                  <Icon className="h-[15px] w-[15px] shrink-0 text-white/10" />
                  <span>{label}</span>
                  <LockKeyhole className="ml-auto h-3 w-3 text-white/12" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          (['Workspace', 'Tools', 'Security'] as const).map((group) => {
            const items = sidebarNav.filter((i) => i.group === group);
            if (!items.length) return null;
            const gCfg = {
              Workspace: {
                wrapCls: 'bg-slate-400/[0.03] border-white/[0.08]',
                labelCls: 'text-slate-300/40',
                dotCls: 'bg-slate-300/40',
                activeCls: 'bg-white/[0.10] text-white ring-1 ring-inset ring-white/[0.10] shadow-[0_1px_0_rgba(255,255,255,0.05)]',
                inactiveCls: 'text-white/40 hover:bg-white/[0.055] hover:text-white/82',
                iconActiveCls: 'text-white/80',
                iconInactiveCls: 'text-white/28 group-hover:text-white/68',
              },
              Tools: {
                wrapCls: 'bg-violet-500/[0.06] border-violet-400/[0.13]',
                labelCls: 'text-violet-300/55',
                dotCls: 'bg-violet-400/60',
                activeCls: 'bg-violet-500/[0.16] text-white ring-1 ring-inset ring-violet-400/[0.20] shadow-[0_1px_0_rgba(167,139,250,0.08)]',
                inactiveCls: 'text-white/40 hover:bg-violet-500/[0.09] hover:text-white/82',
                iconActiveCls: 'text-violet-300/95',
                iconInactiveCls: 'text-violet-400/38 group-hover:text-violet-300/75',
              },
              Security: {
                wrapCls: 'bg-emerald-500/[0.06] border-emerald-400/[0.13]',
                labelCls: 'text-emerald-300/55',
                dotCls: 'bg-emerald-400/60',
                activeCls: 'bg-emerald-500/[0.16] text-white ring-1 ring-inset ring-emerald-400/[0.20] shadow-[0_1px_0_rgba(52,211,153,0.08)]',
                inactiveCls: 'text-white/40 hover:bg-emerald-500/[0.09] hover:text-white/82',
                iconActiveCls: 'text-emerald-300/95',
                iconInactiveCls: 'text-emerald-400/38 group-hover:text-emerald-300/75',
              },
            }[group];
            return (
              <div key={group} className={`mb-2 rounded-[13px] border ${gCfg.wrapCls} p-1.5 backdrop-blur-sm`}>
                <div className="flex items-center gap-1.5 px-2 py-[5px]">
                  <span className={`h-[5px] w-[5px] rounded-full ${gCfg.dotCls}`} />
                  <p className={`text-[9px] font-semibold tracking-[0.13em] ${gCfg.labelCls}`}>{group.toLowerCase()}</p>
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = item.label === 'AI Chat';
                    const isSecureSharing = item.label === 'Secure Sharing';
                    const isPdfEditor = item.label === 'PDF Editor';
                    const isVisualizer = item.label === 'Visualizer';
                    const isForms = item.label === 'Forms';
                    const isESign = item.label === 'E‑Sign';
                    const resolvedHref = item.label === 'My Profile' && isAuthenticated
                      ? `/u/${(session?.user as any)?.id ?? ''}` || item.href
                      : item.href;
                    const sharedCls = [
                      'group relative flex items-center gap-2.5 rounded-[10px] px-2.5 py-[8px] text-[12.5px] font-medium transition-all duration-150 w-full text-left',
                      active ? gCfg.activeCls : gCfg.inactiveCls,
                    ].join(' ');
                    const iconCls = `h-[14px] w-[14px] shrink-0 transition-colors duration-150 ${active ? gCfg.iconActiveCls : gCfg.iconInactiveCls}`;
                    if (isSecureSharing) {
                      return (
                        <button key={item.label} type="button" onClick={() => { setSecureSharingOpen(true); onClose?.(); }} className={sharedCls}>
                          <item.Icon className={iconCls} />
                          {item.label}
                        </button>
                      );
                    }
                    if (isPdfEditor) {
                      return (
                        <button key={item.label} type="button" onClick={() => { setPdfStudioOpen(true); onClose?.(); }} className={sharedCls}>
                          <item.Icon className={iconCls} />
                          {item.label}
                        </button>
                      );
                    }
                    if (isForms) {
                      return (
                        <button key={item.label} type="button" onClick={() => { setFormsStudioOpen(true); onClose?.(); }} className={sharedCls}>
                          <item.Icon className={iconCls} />
                          {item.label}
                        </button>
                      );
                    }
                    if (isVisualizer) {
                      return (
                        <button key={item.label} type="button" onClick={() => { setShowVisualizerModal(true); onClose?.(); }} className={sharedCls}>
                          <item.Icon className={iconCls} />
                          {item.label}
                        </button>
                      );
                    }
                    if (isESign) {
                      return (
                        <button key={item.label} type="button" onClick={() => { setESignStudioOpen(true); onClose?.(); }} className={sharedCls}>
                          <item.Icon className={iconCls} />
                          {item.label}
                        </button>
                      );
                    }
                    return (
                      <Link key={item.label} href={safeHref(resolvedHref)} onClick={() => onClose?.()} className={sharedCls}>
                        {active && (
                          <span className="absolute left-0 top-1/2 h-[15px] w-[2px] -translate-y-1/2 rounded-r-full bg-white/70 shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
                        )}
                        <item.Icon className={iconCls} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* Recent threads */}
        {isAuthenticated && threads.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between px-2">
              <div className="flex items-center gap-1.5">
                <span className="h-[5px] w-[5px] rounded-full bg-white/22" />
                <p className="text-[9px] font-semibold tracking-[0.13em] text-white/28">recent</p>
              </div>
              <button
                type="button"
                onClick={() => setChatHistoryOpen(true)}
                className="text-[10px] font-semibold text-white/22 transition hover:text-white/55"
              >
                See all
              </button>
            </div>
            <div className="space-y-px">
              {threads.slice(0, 6).map((t) => {
                const active = activeThreadId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { loadThread(t.id); onClose?.(); }}
                    className={[
                      'w-full rounded-[11px] px-3 py-2 text-left transition-all duration-150',
                      active
                        ? 'bg-white/[0.07] text-white ring-1 ring-inset ring-white/[0.07]'
                        : 'text-white/32 hover:bg-white/[0.04] hover:text-white/65',
                    ].join(' ')}
                  >
                    <p className="truncate text-[12px] font-medium leading-snug">{t.title}</p>
                    <p className="mt-0.5 text-[10px] text-white/20">{formatRelative(t.updatedAt)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* More */}
        <div className="border-t border-white/[0.05] pt-3 space-y-px">
          <div className="flex items-center gap-1.5 px-2 mb-2">
            <span className="h-[5px] w-[5px] rounded-full bg-white/20" />
            <p className="text-[9px] font-semibold tracking-[0.13em] text-white/25">more</p>
          </div>
          {[
            { href: '/support', Icon: Settings, label: 'Settings' },
            { href: '/support', Icon: HelpCircle, label: 'Help & Support' },
          ].map(({ href, Icon, label }) => (
            <Link
              key={label}
              href={href}
              className="group flex items-center gap-3 rounded-[11px] px-3 py-[9px] text-[13px] font-medium text-white/30 transition hover:bg-white/[0.05] hover:text-white/70"
            >
              <Icon className="h-[15px] w-[15px] shrink-0 text-white/22 transition group-hover:text-white/55" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* User row + sign-out — OUTSIDE scrollable area, always visible */}
      <div className="shrink-0 border-t border-white/[0.06] p-3 space-y-1">
        {guestMode ? (
          <Link
            href="/login"
            onClick={() => { if (typeof document !== 'undefined') document.cookie = 'guestMode=; path=/; max-age=0'; onClose?.(); }}
            className="flex items-center justify-center gap-2 rounded-[13px] bg-white px-3 py-2.5 text-[13px] font-bold text-[#0D0D0F] transition hover:bg-white/90"
          >
            Sign in to unlock everything
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <>
            <Link
              href={isAuthenticated ? `/u/${(session?.user as any)?.id ?? ''}` || '/profile' : '/login'}
              className="group flex items-center gap-3 rounded-[13px] px-3 py-2.5 transition-all hover:bg-white/[0.05]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/[0.18] to-white/[0.04] text-[12px] font-bold text-white/65 ring-1 ring-white/[0.12] shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                {(session?.user?.name || 'G').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-white/55 transition group-hover:text-white/80">{session?.user?.name || 'Guest'}</p>
                <p className="truncate text-[10.5px] text-white/22">{session?.user?.email || 'Sign in to save chats'}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/18 transition group-hover:text-white/50" />
            </Link>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setAccountModalOpen(true)}
                className="group flex w-full items-center gap-3 rounded-[11px] px-3 py-[9px] text-[13px] font-medium text-rose-400/60 transition hover:bg-rose-500/[0.08] hover:text-rose-400 active:scale-[0.98]"
              >
                <LogOut className="h-[15px] w-[15px] shrink-0 text-rose-400/40 transition group-hover:text-rose-400" />
                Sign out
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  /* sidebar — no extra wrapper, sidebarExpanded already owns the flex layout */
  const sidebar = sidebarCollapsed ? sidebarCollapsedRail : sidebarExpanded();

  const visibleMessages = messages;

  return (
    <>
    <main className="h-[100dvh] overflow-hidden bg-background text-foreground flex flex-col">
      <QuickFileEditorDialog
        open={quickEditorOpen}
        onOpenChange={setQuickEditorOpen}
        document={attachedDocument}
        isAuthenticated={isAuthenticated}
      />
      <PublishAnythingDialog
        open={showPublishModal}
        onOpenChange={setShowPublishModal}
        isAuthenticated={isAuthenticated}
      />

      {/* E-Sign Studio fullscreen modal */}
      {eSignStudioOpen && (
        <ESignStudioModal
          open={eSignStudioOpen}
          onClose={() => setESignStudioOpen(false)}
        />
      )}

      {/* Scratchpad fullscreen overlay */}
      {showScratchpad && (
        <div className="fixed inset-0 z-[999] flex flex-col bg-white">
          {/* Overlay header */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
                <PenLine className="h-4 w-4 text-violet-600" />
              </div>
              <span className="text-sm font-semibold text-slate-800">Scratchpad</span>
            </div>
            <button
              type="button"
              onClick={() => setShowScratchpad(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
              title="Close Scratchpad"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Canvas fills remaining height */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScratchpadCenter />
          </div>
        </div>
      )}
      <DetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} details={details} />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.docm,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.md,.html,.csv,.json,.xml,.rtf,.png,.jpg,.jpeg,.webp,.tif,.tiff"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            setError(null);
            setUploadStage('reading');
            setUploadStatusLabel('Reading document…');

            const form = new FormData();
            form.append('file', file);
            setUploadStage('analyzing');
            setUploadStatusLabel('Analyzing content…');

            const res = await fetch('/api/home-chat/ingest', { method: 'POST', body: form });
            const data = await res.json() as { document?: UploadedDocument; error?: string };
            if (!res.ok) throw new Error(data.error || 'Failed to process document');
            if (!data.document) throw new Error('No document returned');
            setAttachedDocument(data.document);
            setUploadStage('ready');
            setUploadStatusLabel('Document ready');
            setTimeout(() => inputRef.current?.focus(), 0);
          } catch (err) {
            setUploadStage('error');
            setUploadStatusLabel('Failed to process document');
            setError(err instanceof Error ? err.message : 'Failed to process document.');
          }
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
      />

      <HomepageNav
        softwareName={softwareName}
        accentLabel={accentLabel}
        onPublishClick={guestMode ? undefined : () => setShowPublishModal(true)}
        onScratchpadClick={() => setShowScratchpad(true)}
        onMobileMenuClick={() => setMobileSidebarOpen(true)}
        guestMode={guestMode}
      />

      {/* Guest mode banner */}
      {guestMode && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-500/[0.15] bg-amber-500/[0.05] px-4 py-2">
          <div className="flex items-center gap-2 text-[12px] text-white/55">
            <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-amber-400/70" />
            <span><span className="font-semibold text-amber-400/90">Incognito mode</span> — you can chat, read, like and share. Sign in to unlock everything.</span>
          </div>
          <Link
            href="/login"
            onClick={() => { if (typeof document !== 'undefined') document.cookie = 'guestMode=; path=/; max-age=0'; }}
            className="shrink-0 rounded-lg border border-white/[0.15] bg-white px-3 py-1 text-[11.5px] font-bold text-[#0D0D0F] transition hover:bg-white/90"
          >
            Sign in
          </Link>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside
          className={[
            'hidden lg:flex shrink-0 flex-col',
            'border-r border-white/[0.07] bg-[#07080a]/86 backdrop-blur-[80px]',
            'shadow-[1px_0_0_rgba(255,255,255,0.055),inset_0_1px_0_rgba(255,255,255,0.04),0_0_60px_rgba(0,0,0,0.6)]',
            'transition-[width] duration-300 ease-in-out',
            sidebarCollapsed ? 'w-[68px]' : 'w-[256px]',
          ].join(' ')}
        >
          {sidebar}
        </aside>

        <div
          className={[
            'fixed top-14 inset-x-0 bottom-0 z-40 lg:hidden',
            mobileSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none',
          ].join(' ')}
          aria-hidden={!mobileSidebarOpen}
        >
          <button
            type="button"
            aria-label="Close sidebar"
            className={[
              'absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-200',
              mobileSidebarOpen ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            onClick={() => setMobileSidebarOpen(false)}
          />

          <aside
            className={[
              'absolute inset-y-0 left-0 flex w-[82vw] max-w-[300px] flex-col',
              'border-r border-white/[0.08] bg-[#07080a]/90 backdrop-blur-[80px]',
              'shadow-[4px_0_80px_rgba(0,0,0,0.9),1px_0_0_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.04)]',
              'transform-gpu transition-transform duration-300 ease-out will-change-transform',
              mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
            ].join(' ')}
            role="dialog"
            aria-modal="true"
          >
            {sidebarExpanded(() => setMobileSidebarOpen(false))}
          </aside>
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden relative min-h-0">
          <div className="relative flex-1 overflow-hidden bg-gradient-to-b from-white via-white to-slate-50 dark:from-[#0D0D0F] dark:via-[#0D0D0F] dark:to-black min-h-0">
            <div className="pointer-events-none fixed inset-0 -z-10 opacity-0 dark:opacity-100" aria-hidden="true">
              <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_50%_20%,rgba(255,255,255,0.06),transparent_62%)] opacity-70" />
              <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_20%_10%,rgba(148,163,184,0.08),transparent_60%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(900px_700px_at_78%_22%,rgba(226,232,240,0.06),transparent_55%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(900px_700px_at_50%_90%,rgba(148,163,184,0.05),transparent_60%)]" />
              <div className="absolute inset-0 opacity-60 [background-image:repeating-linear-gradient(135deg,rgba(148,163,184,0.08)_0,rgba(148,163,184,0.08)_120px,rgba(0,0,0,0)_120px,rgba(0,0,0,0)_260px)]" />
              <div className="absolute inset-0 bg-[radial-gradient(1200px_900px_at_50%_50%,transparent_50%,rgba(0,0,0,0.70)_100%)]" />
              <div className="absolute inset-0 bg-futuristic-grid opacity-30 mix-blend-overlay" />
            </div>

            <div className="relative flex h-full w-full flex-col transition-all duration-300 min-h-0">
              {/* Subtle dark ambient background */}
              <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.03] blur-[140px] motion-safe:animate-[docrudBlob_13s_ease-in-out_infinite]" />
                <div className="absolute left-[18%] top-[55%] h-[380px] w-[380px] rounded-full bg-slate-400/[0.04] blur-[110px] motion-safe:animate-[docrudBlob_19s_ease-in-out_infinite_2.5s]" />
                <div className="absolute right-[12%] top-[22%] h-[320px] w-[320px] rounded-full bg-white/[0.025] blur-[100px] motion-safe:animate-[docrudBlob_23s_ease-in-out_infinite_1s]" />
                <div className="absolute bottom-[10%] right-[30%] h-[280px] w-[280px] rounded-full bg-slate-300/[0.03] blur-[90px] motion-safe:animate-[docrudBlob_17s_ease-in-out_infinite_4s]" />
              </div>

              {!hasAnyChat ? (
                <NewHomepageContent
                  softwareName={softwareName}
                  headlines={headlines}
                  headlineIndex={headlineIndex}
                  setDraft={setDraft}
                  inputRef={inputRef}
                  welcomeScrollRef={welcomeScrollRef}
                  onPublishClick={() => setShowPublishModal(true)}
                  liveProfiles={liveProfiles}
                  liveGigs={liveGigs}
                  liveMetrics={liveMetrics}
                  liveFeeds={liveFeeds}
                />
              ) : (
                <div
                  ref={scrollRef}
                  style={{ WebkitOverflowScrolling: 'touch' }}
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y scrollbar-minimal pb-32 pt-10 transition-all duration-300 flex flex-col"
                >
                  <div className="mx-auto w-full max-w-5xl px-4 sm:px-8 space-y-6">
                    {visibleMessages.map((m) => {
                      const isUser = m.role === 'user';
                      const isTypingThis = m.id === typingId;
                      const displayContent = isTypingThis ? m.content.slice(0, typedChars) : m.content;
                      const showCursor = isTypingThis && typedChars < m.content.length;

                      return (
                        <div key={m.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                          {isUser ? (
                            <div className="max-w-[88%] sm:max-w-[75%] rounded-[18px] border border-white/[0.08] bg-white/[0.06] px-4 py-3 text-[13.5px] leading-relaxed text-white/90 backdrop-blur-xl">
                              <div className="whitespace-pre-wrap">{m.content}</div>
                            </div>
                          ) : m.card ? (
                            <div className="w-full">
                              <AssistantResultCardView
                                card={m.card}
                                onRegenerate={
                                  m.requestMeta
                                    ? () => void sendMessage({ message: m.requestMeta!.message, action: m.requestMeta!.action })
                                    : undefined
                                }
                              />
                              {m.sources?.length ? (
                                <div className="mt-4">
                                  <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/25">Relevant results</p>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {m.sources.slice(0, 6).map((s) => (
                                      <Link key={s.href} href={safeHref(s.href)}
                                        className="group flex items-start gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-3.5 transition hover:border-white/[0.12] hover:bg-white/[0.06]"
                                      >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.05]">
                                          <FileText className="h-3.5 w-3.5 text-white/35 transition group-hover:text-white/60" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="truncate text-[12.5px] font-semibold text-white/75 transition group-hover:text-white">{s.title}</div>
                                          {s.description && <div className="mt-0.5 line-clamp-1 text-[11px] text-white/30">{s.description}</div>}
                                          {(s.badge || s.category) && (
                                            <span className="mt-1.5 inline-block rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-white/30">
                                              {s.badge || s.category}
                                            </span>
                                          )}
                                        </div>
                                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/15 transition group-hover:translate-x-0.5 group-hover:text-white/45" />
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="w-full max-w-[90%] sm:max-w-[82%]">
                              <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.04] px-5 py-4 text-[13.5px] leading-[1.75] text-white/80 backdrop-blur-xl">
                                <div className="whitespace-pre-wrap">
                                  {displayContent || (showCursor ? '' : '…')}
                                  {showCursor && (
                                    <span className="ml-[1px] inline-block h-[1em] w-[2px] translate-y-[1px] animate-[blink_0.8s_step-end_infinite] rounded-full bg-white/60 align-middle" />
                                  )}
                                </div>
                              </div>
                              {!isTypingThis && m.sources?.length ? (
                                <div className="mt-3">
                                  <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/25">Relevant results</p>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {m.sources.slice(0, 6).map((s) => (
                                      <Link key={s.href} href={safeHref(s.href)}
                                        className="group flex items-start gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-3.5 transition hover:border-white/[0.12] hover:bg-white/[0.06]"
                                      >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.05]">
                                          <FileText className="h-3.5 w-3.5 text-white/35 transition group-hover:text-white/60" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="truncate text-[12.5px] font-semibold text-white/75 transition group-hover:text-white">{s.title}</div>
                                          {s.description && <div className="mt-0.5 line-clamp-1 text-[11px] text-white/30">{s.description}</div>}
                                          {(s.badge || s.category) && (
                                            <span className="mt-1.5 inline-block rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-white/30">
                                              {s.badge || s.category}
                                            </span>
                                          )}
                                        </div>
                                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/15 transition group-hover:translate-x-0.5 group-hover:text-white/45" />
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {error ? (
                      <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[12.5px] text-rose-300/80">
                        {error}
                      </div>
                    ) : null}

                    {sending && (
                      <div className="flex justify-start mb-10">
                        <div className="w-full max-w-[82%] sm:max-w-[72%] overflow-hidden rounded-[20px] border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl">
                          {/* Stage indicator */}
                          <div className="flex items-center gap-3 border-b border-white/[0.05] px-5 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/40" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-white/70" />
                              </span>
                            </div>
                            <span className="text-[11.5px] font-semibold text-white/45 transition-all duration-500">
                              {processingStages[processingStage]}
                            </span>
                          </div>

                          {/* Shimmer skeleton body */}
                          <div className="space-y-3 px-5 py-4">
                            {/* Wide line */}
                            <div className="relative h-3 overflow-hidden rounded-full bg-white/[0.05]">
                              <div className="absolute inset-y-0 -left-full w-full animate-[shimmerSlide_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.10] to-transparent" />
                            </div>
                            {/* Medium line */}
                            <div className="relative h-3 w-[80%] overflow-hidden rounded-full bg-white/[0.05]">
                              <div className="absolute inset-y-0 -left-full w-full animate-[shimmerSlide_1.6s_ease-in-out_0.2s_infinite] bg-gradient-to-r from-transparent via-white/[0.10] to-transparent" />
                            </div>
                            {/* Short line */}
                            <div className="relative h-3 w-[55%] overflow-hidden rounded-full bg-white/[0.05]">
                              <div className="absolute inset-y-0 -left-full w-full animate-[shimmerSlide_1.6s_ease-in-out_0.4s_infinite] bg-gradient-to-r from-transparent via-white/[0.10] to-transparent" />
                            </div>

                            {/* Card skeletons */}
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                              {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="relative h-[62px] overflow-hidden rounded-[14px] border border-white/[0.05] bg-white/[0.03]">
                                  <div className="absolute inset-y-0 -left-full w-full animate-[shimmerSlide_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
                                    style={{ animationDelay: `${i * 0.12}s` }} />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className={[
                'hidden sm:block fixed inset-x-0 bottom-0 z-30 pt-12 pb-6 sm:pb-4 transition-all duration-300',
                composerHidden ? 'translate-y-[calc(100%-64px)]' : 'translate-y-0',
              ].join(' ')}
            >
              <div className="mx-auto max-w-5xl px-3 sm:px-6 md:px-8">
                <div className={`relative rounded-3xl border border-white/[0.10] bg-[#0D0D0F]/80 p-3 sm:p-4 shadow-[0_-1px_0_rgba(255,255,255,0.04),0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl ${composerHidden ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'}`}>
                  <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl" aria-hidden="true">
                    <div className="absolute -inset-4 bg-gradient-to-r from-slate-900/10 via-slate-500/5 to-slate-900/10 blur-2xl dark:from-white/10 dark:via-transparent dark:to-white/10" />
                  </div>
                  {attachedDocument ? (
                    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                      <Paperclip className="h-4 w-4" aria-hidden="true" />
                      <span className="flex-1 truncate font-semibold">{attachedDocument.name}</span>
                      <span className="rounded-full bg-slate-900/10 px-2.5 py-1 text-xs font-semibold dark:bg-white/10">
                        {(attachedDocument.mimeType || guessExtension(attachedDocument.name) || 'file').toUpperCase()}
                      </span>
                      <span className="rounded-full bg-slate-900/10 px-2.5 py-1 text-xs font-semibold dark:bg-white/10">
                        {formatBytes(attachedDocument.sizeBytes)}
                      </span>
                      <span className="rounded-full bg-slate-900/10 px-2.5 py-1 text-xs font-semibold dark:bg-white/10">
                        {uploadStage === 'ready' ? 'Ready' : uploadStage === 'error' ? 'Error' : uploadStage === 'analyzing' ? 'Analyzing' : 'Reading'}
                      </span>
                      <div className="w-full truncate text-xs text-slate-600 dark:text-slate-300">
                        Detected: {attachedDocument.meta?.documentTitle || 'Untitled'} • {attachedDocument.meta?.mainTopic || 'Topic unknown'} • {attachedDocument.meta?.language || 'Language unknown'} • {attachedDocument.meta?.intent || 'Intent unknown'}
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuickEditorOpen(true)}
                        className="rounded-full bg-slate-900/10 px-2.5 py-1 text-xs font-semibold transition hover:bg-slate-900/15 dark:bg-white/10 dark:hover:bg-white/15"
                        title="Quick edit & export"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedDocument(null);
                          setUploadStage('idle');
                          setUploadStatusLabel('');
                          setQuickEditorOpen(false);
                        }}
                        className="hover:text-slate-950 dark:hover:text-white"
                        aria-label="Remove document"
                        title="Remove document"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-1 sm:gap-2 rounded-[20px] border border-white/[0.09] bg-white/[0.05] p-1 pl-2 sm:pl-3 shadow-inner backdrop-blur-xl">
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.08] hover:text-white/80 active:scale-95"
                        title="Attach Document"
                      >
                        <Paperclip className="h-[15px] w-[15px]" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={toggleVoice}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition active:scale-95 ${voiceActive ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/[0.08] hover:text-white/80'}`}
                        title="Voice Message"
                      >
                        <Mic className="h-[15px] w-[15px]" aria-hidden="true" />
                      </button>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            type="button"
                            disabled={!attachedDocument || sending || uploadStage === 'reading' || uploadStage === 'analyzing'}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-30 active:scale-95"
                            title={attachedDocument ? 'Document actions' : 'Upload a document to enable actions'}
                          >
                            <Sparkles className="h-[15px] w-[15px] text-white/60" aria-hidden="true" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content sideOffset={10} className="z-50 min-w-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-950">
                            {([
                              { label: 'Summary', action: 'summary' },
                              { label: 'Elaborate', action: 'elaborate' },
                              { label: 'Proofread', action: 'proofread' },
                              { label: 'Analyse', action: 'analyse' },
                              { label: 'Score', action: 'score' },
                              { label: 'Enterprise Review', action: 'enterprise' },
                              { label: 'Legal', action: 'legal' },
                              { label: 'Rewrite', action: 'rewrite' },
                            ] as Array<{ label: string; action: DocumentQuickAction }>).map((item) => (
                              <DropdownMenu.Item
                                key={item.action}
                                onSelect={() => void sendMessage({ action: item.action, message: '' })}
                                className="flex cursor-pointer select-none items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition hover:bg-slate-50 data-[highlighted]:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/5 dark:data-[highlighted]:bg-white/5"
                              >
                                <span>{item.label}</span>
                                <span className="text-xs font-semibold text-slate-400">{item.action}</span>
                              </DropdownMenu.Item>
                            ))}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>

                    <div className="h-5 w-[1px] bg-white/[0.08] mx-0.5 hidden sm:block" />

                    <textarea
                      ref={inputRef}
                      value={draft}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft(val);
                        handleSearchChange(val, 'bottom');
                      }}
                      onFocus={() => {
                        if (draft.trim().length > 1) {
                          setShowBottomSuggestions(true);
                          handleSearchChange(draft, 'bottom');
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowBottomSuggestions(false), 250)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void sendMessage();
                          setShowBottomSuggestions(false);
                        }
                      }}
                      placeholder={attachedDocument ? 'Ask about your document...' : 'Ask me anything...'}
                      className="min-h-[38px] flex-1 resize-none bg-transparent py-2.5 text-[13.5px] sm:text-sm text-white placeholder:text-white/35 focus:outline-none"
                    />

                    <div className="flex shrink-0 items-center gap-1.5 pr-1">
                      <Link
                        href="/published"
                        className="group inline-flex h-8 items-center gap-1.5 rounded-[14px] border border-white/[0.12] bg-white/[0.06] px-3 text-[11.5px] font-semibold text-white/70 shadow-[0_2px_10px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:bg-white/[0.10] hover:text-white hover:border-white/20 active:scale-95"
                        title="View all published items"
                      >
                        <Layers className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="hidden sm:inline">Published</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => void sendMessage()}
                        disabled={sending || uploadStage === 'reading' || uploadStage === 'analyzing' || (!draft.trim() && !attachedDocument)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[14px] bg-white text-[#0D0D0F] shadow-[0_2px_10px_rgba(255,255,255,0.12)] transition hover:scale-[1.06] hover:shadow-[0_4px_16px_rgba(255,255,255,0.18)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 active:scale-95"
                        aria-label="Send"
                        title="Send"
                      >
                        <Send className="h-3.5 w-3.5 ml-0.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Minimalist Glass Suggestions (Lowercase & White) */}
                  {showBottomSuggestions && searchSuggestions.length > 0 && draft.trim().length > 1 && (
                    <div className="absolute bottom-full left-0 mb-4 w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-3xl dark:border-white/10 dark:bg-black/90 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="px-5 py-3 text-[10px] font-bold lowercase tracking-wider text-slate-400 dark:text-slate-500">
                        suggestions
                      </div>
                      <div className="max-h-[360px] overflow-y-auto px-2 pb-2 scrollbar-minimal">
                        <div className="grid grid-cols-1 gap-0.5">
                          {searchSuggestions.map((item) => (
                            <button
                              key={`${item.kind}-${item.href || item.label}`}
                              onClick={() => {
                                if (item.kind === 'ask') {
                                  void sendMessage({ message: draft });
                                } else if (item.href) {
                                  window.location.assign(safeHref(item.href));
                                }
                                setDraft('');
                                setShowBottomSuggestions(false);
                              }}
                              className="group flex items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-all hover:bg-slate-100 dark:hover:bg-white/5"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-slate-900 dark:bg-white/5 dark:text-slate-500 dark:group-hover:bg-white dark:group-hover:text-black">
                                {item.kind === 'file' ? <FileText className="h-4 w-4" /> :
                                  item.kind === 'resume' ? <User className="h-4 w-4" /> :
                                    <Search className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-medium lowercase text-slate-700 transition-colors group-hover:text-slate-950 dark:text-white/90 dark:group-hover:text-white">{item.label}</div>
                                {item.meta && <div className="mt-0.5 truncate text-[10px] lowercase text-slate-400 dark:text-slate-500">{item.meta}</div>}
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {assistantStatusLabel || uploadStatusLabel ? (
                    <div className="ml-auto flex items-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white dark:bg-white/10">
                      <span
                        className={[
                          'h-2 w-2 rounded-full animate-pulse',
                          assistantStatusLabel ? 'bg-slate-300 dark:bg-white' : uploadStage === 'ready' ? 'bg-emerald-400' : uploadStage === 'error' ? 'bg-rose-400' : 'bg-slate-400',
                        ].join(' ')}
                      />
                      {assistantStatusLabel || uploadStatusLabel}
                    </div>
                  ) : null}
                </div>
              </div>

             
            </div>
          </div>
        </div>
      </div>
    </main>

    {/* ── Account / Sign-out modal ── */}
    {accountModalOpen && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setAccountModalOpen(false); setAccountModalStep('main'); setAccountModalPw(''); setAccountModalError(''); }}>
        <div className="w-full max-w-sm overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#0D0D0F] shadow-[0_32px_80px_rgba(0,0,0,0.8)]" onClick={(e) => e.stopPropagation()}>

          {accountModalStep === 'main' && (
            <>
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.05] mb-4">
                  <User className="h-5 w-5 text-white/50" />
                </div>
                <p className="text-[15px] font-bold text-white">{session?.user?.name || 'Account'}</p>
                <p className="text-[12px] text-white/35 mt-0.5">{session?.user?.email}</p>
              </div>
              <div className="px-4 py-3 space-y-1">
                <button
                  type="button"
                  onClick={async () => {
                    setAccountModalLoading(true);
                    await signOut({ callbackUrl: '/onboarding' });
                  }}
                  disabled={accountModalLoading}
                  className="group flex w-full items-center gap-3 rounded-[13px] px-4 py-3 text-[13.5px] font-semibold text-white/70 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4 shrink-0 text-white/40 group-hover:text-white/70" />
                  {accountModalLoading ? 'Signing out…' : 'Sign out'}
                </button>
                <button
                  type="button"
                  onClick={() => setAccountModalStep('deactivate')}
                  className="group flex w-full items-center gap-3 rounded-[13px] px-4 py-3 text-[13.5px] font-semibold text-amber-400/60 transition hover:bg-amber-500/[0.08] hover:text-amber-400"
                >
                  <X className="h-4 w-4 shrink-0 text-amber-400/40 group-hover:text-amber-400" />
                  Deactivate account
                </button>
                <button
                  type="button"
                  onClick={() => setAccountModalStep('delete')}
                  className="group flex w-full items-center gap-3 rounded-[13px] px-4 py-3 text-[13.5px] font-semibold text-rose-400/60 transition hover:bg-rose-500/[0.08] hover:text-rose-400"
                >
                  <X className="h-4 w-4 shrink-0 text-rose-400/40 group-hover:text-rose-400" />
                  Delete account
                </button>
              </div>
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="w-full rounded-[13px] border border-white/[0.08] bg-white/[0.04] py-2.5 text-[13px] font-medium text-white/40 transition hover:bg-white/[0.07] hover:text-white/70"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {accountModalStep === 'deactivate' && (
            <>
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-amber-500/20 bg-amber-500/[0.08] mb-4">
                  <X className="h-5 w-5 text-amber-400" />
                </div>
                <p className="text-[15px] font-bold text-white">Deactivate account?</p>
                <p className="text-[12.5px] text-white/40 mt-1.5 leading-relaxed">Your profile will be hidden and you won&apos;t be able to log in until you reactivate by contacting support. Your data is preserved.</p>
              </div>
              <div className="px-4 py-4 space-y-2">
                <button
                  type="button"
                  disabled={accountModalLoading}
                  onClick={async () => {
                    setAccountModalLoading(true);
                    setAccountModalError('');
                    try {
                      const res = await fetch('/api/account/deactivate', { method: 'POST' });
                      if (res.ok) { await signOut({ callbackUrl: '/onboarding' }); }
                      else { const d = await res.json() as { error?: string }; setAccountModalError(d.error ?? 'Failed'); }
                    } finally { setAccountModalLoading(false); }
                  }}
                  className="w-full rounded-[13px] bg-amber-500 py-3 text-[13.5px] font-bold text-black transition hover:bg-amber-400 disabled:opacity-60"
                >
                  {accountModalLoading ? 'Deactivating…' : 'Yes, deactivate my account'}
                </button>
                <button type="button" onClick={() => setAccountModalStep('main')} className="w-full rounded-[13px] border border-white/[0.08] bg-white/[0.04] py-2.5 text-[13px] font-medium text-white/40 transition hover:text-white/70">
                  Go back
                </button>
                {accountModalError && <p className="text-xs text-rose-400 text-center">{accountModalError}</p>}
              </div>
            </>
          )}

          {accountModalStep === 'delete' && (
            <>
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-rose-500/20 bg-rose-500/[0.08] mb-4">
                  <X className="h-5 w-5 text-rose-400" />
                </div>
                <p className="text-[15px] font-bold text-white">Permanently delete account?</p>
                <p className="text-[12.5px] text-white/40 mt-1.5 leading-relaxed">This <span className="text-rose-400 font-semibold">cannot be undone</span>. All your data, documents, credits, and profile will be permanently erased. Enter your password to confirm.</p>
              </div>
              <div className="px-4 py-4 space-y-2">
                <input
                  type="password"
                  value={accountModalPw}
                  onChange={(e) => setAccountModalPw(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 w-full rounded-[13px] border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-rose-500/40"
                />
                <button
                  type="button"
                  disabled={accountModalLoading || !accountModalPw}
                  onClick={async () => {
                    setAccountModalLoading(true);
                    setAccountModalError('');
                    try {
                      const res = await fetch('/api/account/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmPassword: accountModalPw }) });
                      if (res.ok) { await signOut({ callbackUrl: '/onboarding' }); }
                      else { const d = await res.json() as { error?: string }; setAccountModalError(d.error ?? 'Failed'); }
                    } finally { setAccountModalLoading(false); }
                  }}
                  className="w-full rounded-[13px] bg-rose-600 py-3 text-[13.5px] font-bold text-white transition hover:bg-rose-500 disabled:opacity-60"
                >
                  {accountModalLoading ? 'Deleting…' : 'Delete my account forever'}
                </button>
                <button type="button" onClick={() => { setAccountModalStep('main'); setAccountModalPw(''); setAccountModalError(''); }} className="w-full rounded-[13px] border border-white/[0.08] bg-white/[0.04] py-2.5 text-[13px] font-medium text-white/40 transition hover:text-white/70">
                  Go back
                </button>
                {accountModalError && <p className="text-xs text-rose-400 text-center">{accountModalError}</p>}
              </div>
            </>
          )}

        </div>
      </div>
    )}

    {/* ── Chat history modal (moved out of sidebar to avoid overflow-hidden clipping) ── */}
    {chatHistoryOpen && (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
        <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0D0D0F] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-white">All chats</div>
              <div className="mt-1 text-xs text-slate-400">Search and open your full chat history.</div>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10"
              onClick={() => setChatHistoryOpen(false)}
              aria-label="Close history"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <input
              value={chatHistoryQuery}
              onChange={(e) => setChatHistoryQuery(e.target.value)}
              placeholder="Search chats by title…"
              className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:outline-none"
            />
            <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1 scrollbar-minimal">
              {(threads || [])
                .filter((t) => {
                  const q = chatHistoryQuery.trim().toLowerCase();
                  if (!q) return true;
                  return (t.title || '').toLowerCase().includes(q) || (t.preview || '').toLowerCase().includes(q);
                })
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setChatHistoryOpen(false); loadThread(t.id); }}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm transition hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white">{t.title}</div>
                        <div className="mt-1 line-clamp-1 text-xs text-slate-400">{t.preview}</div>
                      </div>
                      <div className="shrink-0 text-xs font-semibold text-slate-400">{formatRelative(t.updatedAt)}</div>
                    </div>
                  </button>
                ))}
              {isAuthenticated && threads.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
                  No chats yet. Start a new chat to see history here.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ── Secure Sharing overlay (portal, avoids overflow clipping) ── */}
    {/* ── PDF Studio portal ── */}
    {isMounted && createPortal(
      <>
        <div
          onClick={() => setPdfStudioOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            opacity: pdfStudioOpen ? 1 : 0,
            pointerEvents: pdfStudioOpen ? 'auto' : 'none',
            transition: 'opacity 0.25s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
        <div
          style={{
            position: 'fixed', inset: '5dvh 0 0',
            zIndex: 10001,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '0 12px',
            pointerEvents: pdfStudioOpen ? 'auto' : 'none',
          }}
        >
          <div
            style={{
              width: '100%', maxWidth: 1200,
              height: '95dvh',
              borderRadius: '20px 20px 0 0',
              overflow: 'hidden',
              boxShadow: '0 -24px 80px rgba(15,23,42,0.22), 0 0 0 1px rgba(15,23,42,0.08)',
              opacity: pdfStudioOpen ? 1 : 0,
              transform: pdfStudioOpen ? 'translateY(0)' : 'translateY(32px)',
              transition: 'opacity 0.28s cubic-bezier(0.32,0.72,0,1), transform 0.28s cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            {pdfStudioOpen && <PdfStudio onClose={() => setPdfStudioOpen(false)} darkMode={false} />}
          </div>
        </div>
      </>,
      document.body,
    )}

    {showVisualizerModal && (
      <DocumentVisualizerModal
        open={showVisualizerModal}
        onClose={() => setShowVisualizerModal(false)}
      />
    )}

    {/* ── Forms Studio portal ── */}
    {isMounted && createPortal(
      <>
        <div
          onClick={() => setFormsStudioOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(13,13,15,0.80)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            opacity: formsStudioOpen ? 1 : 0,
            pointerEvents: formsStudioOpen ? 'auto' : 'none',
            transition: 'opacity 0.25s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
        <div
          style={{
            position: 'fixed', inset: '5dvh 0 0',
            zIndex: 10001,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '0 max(0px, calc((100vw - 1100px) / 2))',
            pointerEvents: formsStudioOpen ? 'auto' : 'none',
          }}
        >
          <div
            style={{
              width: '100%', maxWidth: 1100,
              height: '95dvh',
              borderRadius: '20px 20px 0 0',
              overflow: 'hidden',
              background: '#0D0D0F',
              boxShadow: '0 -24px 80px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.06)',
              opacity: formsStudioOpen ? 1 : 0,
              transform: formsStudioOpen ? 'translateY(0)' : 'translateY(32px)',
              transition: 'opacity 0.28s cubic-bezier(0.32,0.72,0,1), transform 0.28s cubic-bezier(0.32,0.72,0,1)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.02em' }}>Forms Studio</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 20 }}>Beta</span>
              </div>
              <button
                type="button"
                onClick={() => setFormsStudioOpen(false)}
                style={{
                  width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.50)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'clamp(12px, 3vw, 24px)' }}>
              {formsStudioOpen && <FormsCenter />}
            </div>
          </div>
        </div>
      </>,
      document.body,
    )}

    {isMounted && createPortal(
      <>
        {/* Backdrop */}
        <div
          onClick={() => setSecureSharingOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            opacity: secureSharingOpen ? 1 : 0,
            pointerEvents: secureSharingOpen ? 'auto' : 'none',
            transition: 'opacity 0.28s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
        {/* Panel */}
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10001,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            pointerEvents: secureSharingOpen ? 'auto' : 'none',
          }}
        >
          <div
            style={{
              width: '100%', maxWidth: 900,
              maxHeight: '92dvh',
              borderRadius: '24px 24px 0 0',
              background: '#0D0D0F',
              border: '1px solid rgba(255,255,255,0.09)',
              borderBottom: 'none',
              boxShadow: '0 -32px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.03)',
              overflowY: 'auto',
              opacity: secureSharingOpen ? 1 : 0,
              transform: secureSharingOpen ? 'translateY(0)' : 'translateY(40px)',
              transition: 'opacity 0.30s cubic-bezier(0.32,0.72,0,1), transform 0.30s cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              position: 'sticky', top: 0, background: '#0D0D0F', zIndex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}>
                  <FolderLock style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.75)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Secure Sharing</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Send files with password protection, expiry links &amp; full tracking</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSecureSharingOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            {/* Content */}
            <div style={{ padding: '20px 16px 32px' }}>
              {secureSharingOpen && <FileTransferCenter />}
            </div>
          </div>
        </div>
      </>,
      document.body
    )}

    {/* ── Mobile bottom nav (portal, avoids overflow clipping) ── */}
    {isMounted && createPortal(
      <>
        {/* ── Backdrop ── */}
        <div
          onClick={() => { setMobileNavSearchOpen(false); setMobileNavSearchQuery(''); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9997,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            opacity: mobileNavSearchOpen ? 1 : 0,
            pointerEvents: mobileNavSearchOpen ? 'auto' : 'none',
            transition: 'opacity 0.24s cubic-bezier(0.4,0,0.2,1)',
          }}
        />

        {/* ── Search / Command panel ── */}
        <div
          style={{
            position: 'fixed', left: 10, right: 10, bottom: 160, zIndex: 9998,
            borderRadius: 24,
            background: '#0D0D0F',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.03)',
            overflow: 'hidden',
            opacity: mobileNavSearchOpen ? 1 : 0,
            transform: mobileNavSearchOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
            pointerEvents: mobileNavSearchOpen ? 'auto' : 'none',
            transition: 'opacity 0.26s cubic-bezier(0.4,0,0.2,1), transform 0.26s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Search input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.05)',
            }}>
              <Search style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.5)' }} />
            </div>
            <input
              ref={mobileNavSearchRef}
              value={mobileNavSearchQuery}
              onChange={(e) => setMobileNavSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setMobileNavSearchOpen(false); setMobileNavSearchQuery(''); }
                if (e.key === 'Enter' && mobileNavSearchQuery.trim()) {
                  void sendMessage({ message: mobileNavSearchQuery });
                  setMobileNavSearchOpen(false);
                  setMobileNavSearchQuery('');
                }
              }}
              placeholder="Ask me anything…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 15, color: '#fff', fontWeight: 500,
                caretColor: '#fff',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              onClick={() => { setMobileNavSearchOpen(false); setMobileNavSearchQuery(''); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 8, border: 'none',
                background: 'rgba(255,255,255,0.07)', cursor: 'pointer', flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
            >
              <X style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.5)' }} />
            </button>
          </div>

          {/* Hairline divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

          {/* Quick navigation */}
          <div style={{ padding: '8px 8px 10px' }}>
            <div style={{ padding: '8px 10px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
              Navigate
            </div>
            {([
              { label: 'Features', href: '#features', Icon: Sparkles },
              { label: 'Pricing', href: '/pricing', Icon: Package },
              { label: 'Sign Up Free', href: '/signup', Icon: User },
              { label: 'Published Documents', href: '/published', Icon: Layers },
            ] as Array<{ label: string; href: string; Icon: React.ElementType }>).map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => { setMobileNavSearchOpen(false); setMobileNavSearchQuery(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px',
                  borderRadius: 13, textDecoration: 'none', cursor: 'pointer',
                  transition: 'background 0.14s',
                  background: 'transparent',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
                onTouchStart={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)'; }}
                onTouchEnd={(e) => { const el = e.currentTarget as HTMLAnchorElement; setTimeout(() => { if (el) el.style.background = 'transparent'; }, 220); }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                }}>
                  <item.Icon style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.45)' }} />
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.75)', letterSpacing: '-0.01em' }}>{item.label}</span>
                <ArrowRight style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.18)', marginLeft: 'auto', flexShrink: 0 }} />
              </a>
            ))}
          </div>
        </div>

        {/* ── Mobile compact chat bar (xs only, above bottom nav) ── */}
        <div
          className="sm:hidden"
          style={{ position: 'fixed', left: 10, right: 10, bottom: 80, zIndex: 9998 }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            borderRadius: 22, padding: '6px 8px',
            background: 'rgba(13,13,15,0.92)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 16px 50px rgba(0,0,0,0.75), 0 2px 10px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
          }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', color: 'rgba(255,255,255,0.40)', flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <Paperclip style={{ width: 14, height: 14 }} />
            </button>
            <button
              type="button"
              onClick={toggleVoice}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', color: voiceActive ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.40)', flexShrink: 0, background: voiceActive ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <Mic style={{ width: 14, height: 14 }} />
            </button>
            <button
              type="button"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', color: 'rgba(255,255,255,0.40)', flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <Sparkles style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.55)' }} />
            </button>
            <textarea
              value={draft}
              onChange={(e) => { setDraft(e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
              placeholder="Ask me anything..."
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.90)', fontSize: 13, resize: 'none', minHeight: 32, padding: '6px 0', lineHeight: '1.45' }}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={sending || (!draft.trim() && !attachedDocument)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 12, flexShrink: 0,
                background: 'rgba(255,255,255,0.90)', color: '#0D0D0F', border: 'none', cursor: 'pointer',
                opacity: (sending || (!draft.trim() && !attachedDocument)) ? 0.35 : 1,
                transition: 'opacity 0.2s, transform 0.15s',
              }}
            >
              <Send style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>

        {/* ── Bottom nav bar ── */}
        <nav
          className="sm:hidden"
          aria-label="Mobile navigation"
          style={{ position: 'fixed', left: 10, right: 10, bottom: 12, zIndex: 9999 }}
        >
          {/* Pill */}
          <div style={{
            position: 'relative', display: 'flex', alignItems: 'center',
            borderRadius: 26, padding: '5px 6px',
            background: '#0D0D0F',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.80), 0 4px 16px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
          }}>
            {([
              { label: 'Home',     href: '/',          Icon: LayoutGrid, isSearch: false, isPublish: false },
              { label: 'People',   href: '/people',    Icon: Users,      isSearch: false, isPublish: false },
              { label: 'Search',   href: '#',          Icon: Search,     isSearch: true,  isPublish: false },
              { label: 'Feed',     href: '/published', Icon: Newspaper,  isSearch: false, isPublish: false },
              ...(isAuthenticated
                ? [{ label: 'Publish', href: '#', Icon: Plus,  isSearch: false, isPublish: true  }]
                : [{ label: 'Sign Up', href: '/signup', Icon: User, isSearch: false, isPublish: false }]
              ),
            ] as Array<{ label: string; href: string; Icon: React.ElementType; isSearch: boolean; isPublish: boolean }>).map((item) => (
              <a
                key={item.label}
                href={(item.isSearch || item.isPublish) ? undefined : item.href}
                onClick={
                  item.isSearch
                    ? (e) => { e.preventDefault(); setMobileNavSearchOpen(true); setMobileNavSearchQuery(''); }
                    : item.isPublish
                    ? (e) => { e.preventDefault(); setShowPublishModal(true); }
                    : undefined
                }
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '8px 2px', borderRadius: 14, textDecoration: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.35)',
                  border: '1px solid transparent',
                  minWidth: 44,
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 0.20s ease, color 0.20s ease, border-color 0.20s ease, box-shadow 0.20s ease',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'rgba(255,255,255,0.08)';
                  el.style.borderColor = 'rgba(255,255,255,0.10)';
                  el.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 8px rgba(0,0,0,0.25)';
                  el.style.color = 'rgba(255,255,255,0.92)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'transparent';
                  el.style.borderColor = 'transparent';
                  el.style.boxShadow = 'none';
                  el.style.color = 'rgba(255,255,255,0.35)';
                }}
                onTouchStart={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'rgba(255,255,255,0.08)';
                  el.style.borderColor = 'rgba(255,255,255,0.10)';
                  el.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 8px rgba(0,0,0,0.25)';
                  el.style.color = 'rgba(255,255,255,0.92)';
                }}
                onTouchEnd={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  setTimeout(() => {
                    if (!el) return;
                    el.style.background = 'transparent';
                    el.style.borderColor = 'transparent';
                    el.style.boxShadow = 'none';
                    el.style.color = 'rgba(255,255,255,0.35)';
                  }, 240);
                }}
              >
                <item.Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>{item.label}</span>
              </a>
            ))}
          </div>
        </nav>
      </>,
      document.body
    )}
    </>
  );
}
