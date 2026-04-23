'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  Clock3,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileArchive,
  FileSpreadsheet,
  FileText,
  FolderLock,
  Globe2,
  ImageDown,
  LockKeyhole,
  PencilRuler,
  QrCode,
  ScanSearch,
  Sparkles,
  Type,
  Video,
} from 'lucide-react';
import { BlogPost, GigListing, LandingSettings, PlatformConfig, PlatformFeatureControlKey, SaasPlan } from '@/types/document';
import { Button } from '@/components/ui/button';
import PublicSiteChrome from '@/components/PublicSiteChrome';

interface PublicHomepageProps {
  settings: LandingSettings;
  softwareName: string;
  accentLabel: string;
  saasPlans: SaasPlan[];
  homeMetrics?: Array<{ id: string; value: string; label: string }>;
  fileDirectoryStats?: {
    totalFiles: number;
    publicFiles: number;
    privateFiles: number;
    totalSizeInBytes: number;
    totalSizeLabel: string;
    totalOpens: number;
    totalDownloads: number;
    categoryCount: number;
  };
}

type RecentPublishItem = {
  id: string;
  shareId: string;
  title: string;
  fileName: string;
  notes?: string;
  mimeType: string;
  category?: string;
  tags: string[];
  visibility: 'public' | 'private';
  source: 'public' | 'yours';
  sizeLabel: string;
  openCount: number;
  downloadCount: number;
  updatedAt: string;
  createdAt: string;
  publishedBy?: string;
  href: string;
};

type RecentPublishFilter = 'all' | 'public' | 'private';

type HomepageFeatureItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  featureKey?: PlatformFeatureControlKey;
};

type HomepageFeatureGroup = {
  title: string;
  description: string;
  tone: 'sky' | 'violet' | 'emerald' | 'amber';
  items: HomepageFeatureItem[];
};

type HomepageGigsPayload = {
  gigs?: GigListing[];
  discoverListings?: GigListing[];
  generatedAt?: string;
};

const featureGroups: HomepageFeatureGroup[] = [
  {
    title: 'Create',
    description: 'Docs, forms, PDFs. Clean outputs, fast.',
    tone: 'sky',
    items: [
      { title: 'DocWord', description: 'Draft, rewrite, and polish documents in one editor that feels built for real work.', href: '/docword', icon: FileText, featureKey: 'generate_documents' },
      { title: 'Forms', description: 'Create forms people can actually fill fast, then keep submissions clean and usable.', href: '/forms', icon: FileSpreadsheet },
      { title: 'Form Builder', description: 'Start faster with a cleaner builder when you already know the flow you need.', href: '/forms/builder', icon: Sparkles },
      { title: 'PDF Editor', description: 'Fix, split, merge, and export PDFs without bouncing between clunky tools.', href: '/pdf-editor', icon: PencilRuler },
      { title: 'Daily Tools', description: 'Handle the little file jobs quickly so they stop interrupting the bigger work.', href: '/daily-tools', icon: Sparkles },
      { title: 'File Transfers', description: 'Package and send working files quickly when the job is to move, not overthink.', href: '/file-transfers', icon: FileArchive, featureKey: 'file_manager' },
    ],
  },
  {
    title: 'AI',
    description: 'Review, rewrite, and ship faster.',
    tone: 'violet',
    items: [
      { title: 'DoXpert AI', description: 'Review documents with clearer suggestions so stronger versions happen faster.', href: '/doxpert', icon: BrainCircuit, featureKey: 'doxpert' },
      { title: 'Resume ATS', description: 'Show what is working, what is missing, and what to improve before applying.', href: '/resume-ats', icon: ScanSearch },
      { title: 'Visualizer', description: 'Turn dense information into visuals people can understand at a glance.', href: '/visualizer', icon: Sparkles, featureKey: 'visualizer' },
    ],
  },
  {
    title: 'Secure',
    description: 'Locks, rooms, delivery, approvals.',
    tone: 'emerald',
    items: [
      { title: 'File Directory', description: 'Publish what should stay public and protect what should not, without confusion.', href: '/file-directory', icon: FolderLock, featureKey: 'file_manager' },
      { title: 'File Transfers', description: 'Share working files with cleaner controls when you need delivery to feel more professional.', href: '/file-transfers', icon: FileArchive, featureKey: 'file_manager' },
      { title: 'Board Room', description: 'Keep approvals, next steps, and execution visible when decisions matter.', href: '/workspace?tab=deal-room', icon: BriefcaseBusiness, featureKey: 'deal_room' },
      { title: 'Virtual ID', description: 'Share a cleaner professional identity with pages and QR flows that feel trusted.', href: '/workspace?tab=virtual-id', icon: QrCode, featureKey: 'virtual_id' },
      { title: 'Docrudians', description: 'Open a more connected community surface when work also needs people, visibility, and context.', href: '/docrudians', icon: Globe2 },
    ],
  },
];

const sliderCards = [
  {
    id: 'workspace',
    eyebrow: 'Docrud Workspace',
    vibe: 'All-in-one mode',
    title: 'Docs, AI, sharing.',
    description: 'One place. Real work moves.',
    primaryCta: { label: 'Start Trial', href: '/signup' },
    secondaryCta: { label: 'Open Directory', href: '/file-directory' },
    image: '/homepage/hero-workspace-meet.png',
    align: 'left',
  },
  {
    id: 'docword',
    eyebrow: 'DocWord',
    vibe: 'Writer brain on',
    title: 'Draft, rewrite, export.',
    description: 'Draft to export, clean.',
    primaryCta: { label: 'Open DocWord', href: '/docword' },
    secondaryCta: { label: 'Daily Tools', href: '/daily-tools' },
    image: '/homepage/hero-docword-ai.png',
    align: 'right',
  },
  {
    id: 'docword-pro',
    eyebrow: 'DocWord Pro',
    vibe: 'Editor flow',
    title: 'Write, review, polish.',
    description: 'From draft to send.',
    primaryCta: { label: 'Open Editor', href: '/docword' },
    secondaryCta: { label: 'Build Forms', href: '/forms/builder' },
    image: '/homepage/hero-docword-ai.png',
    align: 'left',
  },
  {
    id: 'forms',
    eyebrow: 'Forms',
    vibe: 'Collect cleanly',
    title: 'Build forms, collect faster.',
    description: 'Cleaner intake, faster.',
    primaryCta: { label: 'Open Forms', href: '/forms' },
    secondaryCta: { label: 'Form Builder', href: '/forms/builder' },
    image: '/homepage/hero-docword-ai.png',
    align: 'right',
  },
  {
    id: 'secure',
    eyebrow: 'Secure Flow',
    vibe: 'Zero-chaos sharing',
    title: 'Share, secure, move.',
    description: 'Protect access. Keep moving.',
    primaryCta: { label: 'Open Directory', href: '/file-directory' },
    secondaryCta: { label: 'Transfers', href: '/file-transfers' },
    image: '/file-directory-home-banner.png',
    align: 'left',
  },
  {
    id: 'review',
    eyebrow: 'DoXpert AI',
    vibe: 'Review mode',
    title: 'Review with AI.',
    description: 'Faster, clearer reviews.',
    primaryCta: { label: 'DoXpert', href: '/doxpert' },
    secondaryCta: { label: 'Visualizer', href: '/visualizer' },
    image: '/doxpert-home-banner.png',
    align: 'right',
  },
  {
    id: 'resume',
    eyebrow: 'Resume ATS',
    vibe: 'Fit check',
    title: 'Score, fix, apply.',
    description: 'Fix gaps before you apply.',
    primaryCta: { label: 'Resume ATS', href: '/resume-ats' },
    secondaryCta: { label: 'DoXpert', href: '/doxpert' },
    image: '/doxpert-home-banner.png',
    align: 'left',
  },
  {
    id: 'community',
    eyebrow: 'Docrudians',
    vibe: 'Community pulse',
    title: 'People, context, momentum.',
    description: 'Rooms and context.',
    primaryCta: { label: 'Open Docrudians', href: '/docrudians' },
    secondaryCta: { label: 'Board Room', href: '/workspace?tab=deal-room' },
    image: '/homepage/hero-workspace-meet.png',
    align: 'right',
  },
] as const;

const headlineWords = ['draft', 'review', 'share', 'sign', 'meet', 'secure'] as const;
const whyWords = ['faster', 'cleaner', 'smarter', 'safer', 'simpler'] as const;
const dailyToolStrip = [
  { label: 'Compress', icon: FileArchive },
  { label: 'Convert', icon: Sparkles },
  { label: 'Merge PDF', icon: FileText },
  { label: 'Image Tools', icon: ImageDown },
  { label: 'Text Utils', icon: Type },
  { label: 'Scan', icon: ScanSearch },
  { label: 'Split PDF', icon: FileText },
  { label: 'Watermark', icon: PencilRuler },
  { label: 'QR Tools', icon: QrCode },
  { label: 'Spreadsheet', icon: FileSpreadsheet },
  { label: 'Secure Share', icon: FolderLock },
  { label: 'Export', icon: ArrowRight },
] as const;

function getToneClasses(tone: HomepageFeatureGroup['tone']) {
  if (tone === 'sky') {
    return {
      badge: 'bg-sky-100/90 text-sky-800',
      panelGlow: 'before:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.34),transparent_36%)] after:bg-[radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.22),transparent_34%)]',
      icon: 'bg-[linear-gradient(135deg,rgba(56,189,248,0.24),rgba(37,99,235,0.16))] text-slate-900',
    };
  }
  if (tone === 'violet') {
    return {
      badge: 'bg-violet-100/90 text-violet-800',
      panelGlow: 'before:bg-[radial-gradient(circle_at_top_left,rgba(196,181,253,0.38),transparent_36%)] after:bg-[radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.22),transparent_34%)]',
      icon: 'bg-[linear-gradient(135deg,rgba(196,181,253,0.26),rgba(139,92,246,0.16))] text-slate-900',
    };
  }
  if (tone === 'emerald') {
    return {
      badge: 'bg-emerald-100/90 text-emerald-800',
      panelGlow: 'before:bg-[radial-gradient(circle_at_top_left,rgba(74,222,128,0.3),transparent_36%)] after:bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.2),transparent_34%)]',
      icon: 'bg-[linear-gradient(135deg,rgba(74,222,128,0.22),rgba(16,185,129,0.16))] text-slate-900',
    };
  }
  return {
    badge: 'bg-amber-100/90 text-amber-800',
    panelGlow: 'before:bg-[radial-gradient(circle_at_top_left,rgba(253,230,138,0.34),transparent_36%)] after:bg-[radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.2),transparent_34%)]',
    icon: 'bg-[linear-gradient(135deg,rgba(253,230,138,0.26),rgba(245,158,11,0.16))] text-slate-900',
  };
}

export default function PublicHomepage({
  settings,
  softwareName,
  accentLabel,
  saasPlans,
}: PublicHomepageProps) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && Boolean(session?.user);
  const darkMode = false;
  const toolsScrollerRef = useRef<HTMLDivElement | null>(null);
  const toolsAutoScrollPausedRef = useRef(false);
  const toolsResumeTimerRef = useRef<number | null>(null);
  const recentPublishesScrollerRef = useRef<HTMLDivElement | null>(null);
  const recentPublishesPausedRef = useRef(false);
  const recentPublishesResumeTimerRef = useRef<number | null>(null);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [activeSlide, setActiveSlide] = useState(1);
  const [activeHeadlineWord, setActiveHeadlineWord] = useState(0);
  const [activeWhyWord, setActiveWhyWord] = useState(0);
  const [carouselTransitionEnabled, setCarouselTransitionEnabled] = useState(true);
  const [recentPublishes, setRecentPublishes] = useState<RecentPublishItem[]>([]);
  const [recentPublishesLoading, setRecentPublishesLoading] = useState(true);
  const [recentPublishFilter, setRecentPublishFilter] = useState<RecentPublishFilter>('all');
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogLoading, setBlogLoading] = useState(true);
  const [timeTick, setTimeTick] = useState(() => Date.now());
  const blogScrollerRef = useRef<HTMLDivElement | null>(null);
  const blogPausedRef = useRef(false);
  const blogResumeTimerRef = useRef<number | null>(null);

  const [homepageGigs, setHomepageGigs] = useState<GigListing[]>([]);
  const [homepageGigsLoading, setHomepageGigsLoading] = useState(true);
  const [homepageGigsUpdatedAt, setHomepageGigsUpdatedAt] = useState<string | null>(null);
  const homepageGigsEventSourceRef = useRef<EventSource | null>(null);
  const homepageGigsPollingRef = useRef<number | null>(null);
  const featuredGigsScrollerRef = useRef<HTMLDivElement | null>(null);
  const featuredGigsPausedRef = useRef(false);
  const featuredGigsResumeTimerRef = useRef<number | null>(null);
  const recentGigsScrollerRef = useRef<HTMLDivElement | null>(null);
  const recentGigsPausedRef = useRef(false);
  const recentGigsResumeTimerRef = useRef<number | null>(null);

  const isPlatformFeatureEnabled = useMemo(
    () => (feature: PlatformFeatureControlKey) => platformConfig?.featureControls?.[feature] !== false,
    [platformConfig],
  );

  const filteredFeatureGroups = useMemo(() => (
    featureGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.featureKey || isPlatformFeatureEnabled(item.featureKey)),
      }))
      .filter((group) => group.items.length > 0)
  ), [isPlatformFeatureEnabled]);

  const featuredPlans = useMemo(
    () => saasPlans.filter((plan) => (plan.targetAudience || 'business') === 'business').slice(0, 3),
    [saasPlans],
  );

  const slides = useMemo(() => sliderCards.map((slide) => ({
    ...slide,
    primaryHref: slide.primaryCta.href.startsWith('/workspace') && !isAuthenticated ? '/login' : slide.primaryCta.href,
    secondaryHref: slide.secondaryCta.href.startsWith('/workspace') && !isAuthenticated ? '/login' : slide.secondaryCta.href,
  })), [isAuthenticated]);
  const carouselSlides = useMemo(
    () => (slides.length > 1 ? [slides[slides.length - 1], ...slides, slides[0]] : slides),
    [slides],
  );
  const activeSlideIndex = useMemo(
    () => ((activeSlide - 1 + slides.length) % slides.length + slides.length) % slides.length,
    [activeSlide, slides.length],
  );
  const orderedSlides = useMemo(
    () => slides.map((_, index) => slides[(activeSlideIndex + index) % slides.length]),
    [activeSlideIndex, slides],
  );

  useEffect(() => {
    let active = true;
    void fetch('/api/platform', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!active || !payload) return;
        setPlatformConfig(payload);
      })
      .catch(() => {
        if (!active) return;
        setPlatformConfig(null);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadRecentPublishes = async (preserveLoading = false) => {
      if (!preserveLoading && active) {
        setRecentPublishesLoading(true);
      }

      try {
        const response = await fetch('/api/recent-publishes', { cache: 'no-store' });
        const payload = response.ok ? await response.json() : null;
        if (!active || !payload) return;
        setRecentPublishes(Array.isArray(payload.items) ? payload.items : []);
      } catch {
        if (!active) return;
        setRecentPublishes([]);
      } finally {
        if (active) {
          setRecentPublishesLoading(false);
        }
      }
    };

    void loadRecentPublishes();

    const interval = window.setInterval(() => {
      void loadRecentPublishes(true);
    }, 25000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;

    const loadBlogPosts = async (preserveLoading = false) => {
      if (!preserveLoading && active) {
        setBlogLoading(true);
      }

      try {
        const response = await fetch('/api/blog/posts', { cache: 'no-store' });
        const payload = response.ok ? await response.json() : null;
        if (!active || !payload) return;
        setBlogPosts(Array.isArray(payload.posts) ? payload.posts.slice(0, 8) : []);
      } catch {
        if (!active) return;
        setBlogPosts([]);
      } finally {
        if (active) {
          setBlogLoading(false);
        }
      }
    };

    void loadBlogPosts();
    const interval = window.setInterval(() => {
      void loadBlogPosts(true);
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = window.setInterval(() => {
      setActiveSlide((current) => current + 1);
    }, 6800);
    return () => window.clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    if (activeSlide === 0) {
      const timeout = window.setTimeout(() => {
        setCarouselTransitionEnabled(false);
        setActiveSlide(slides.length);
      }, 520);
      return () => window.clearTimeout(timeout);
    }
    if (activeSlide === slides.length + 1) {
      const timeout = window.setTimeout(() => {
        setCarouselTransitionEnabled(false);
        setActiveSlide(1);
      }, 520);
      return () => window.clearTimeout(timeout);
    }
  }, [activeSlide, slides.length]);

  useEffect(() => {
    if (!carouselTransitionEnabled) {
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setCarouselTransitionEnabled(true);
        });
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [carouselTransitionEnabled]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveHeadlineWord((current) => (current + 1) % headlineWords.length);
    }, 1800);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const scroller = recentPublishesScrollerRef.current;
    if (!scroller || recentPublishes.length <= 1) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;

    const pauseAutoScroll = () => {
      recentPublishesPausedRef.current = true;
      if (recentPublishesResumeTimerRef.current) window.clearTimeout(recentPublishesResumeTimerRef.current);
      recentPublishesResumeTimerRef.current = window.setTimeout(() => {
        recentPublishesPausedRef.current = false;
      }, 2200);
    };

    let frame = 0;
    let running = false;
    const step = () => {
      if (!recentPublishesPausedRef.current) {
        const half = scroller.scrollWidth / 2;
        scroller.scrollLeft += 0.4;
        if (scroller.scrollLeft >= half) {
          scroller.scrollLeft -= half;
        }
      }
      frame = window.requestAnimationFrame(step);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      if (document.visibilityState !== 'visible') return;
      running = true;
      frame = window.requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) start();
        else stop();
      },
      { threshold: 0.12 },
    );
    observer.observe(scroller);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    scroller.addEventListener('wheel', pauseAutoScroll, { passive: true });
    scroller.addEventListener('touchstart', pauseAutoScroll, { passive: true });
    scroller.addEventListener('touchmove', pauseAutoScroll, { passive: true });
    scroller.addEventListener('pointerdown', pauseAutoScroll, { passive: true });
    scroller.addEventListener('pointermove', pauseAutoScroll, { passive: true });
    scroller.addEventListener('mousedown', pauseAutoScroll);

    handleVisibility();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      scroller.removeEventListener('wheel', pauseAutoScroll);
      scroller.removeEventListener('touchstart', pauseAutoScroll);
      scroller.removeEventListener('touchmove', pauseAutoScroll);
      scroller.removeEventListener('pointerdown', pauseAutoScroll);
      scroller.removeEventListener('pointermove', pauseAutoScroll);
      scroller.removeEventListener('mousedown', pauseAutoScroll);
      if (recentPublishesResumeTimerRef.current) window.clearTimeout(recentPublishesResumeTimerRef.current);
    };
  }, [recentPublishes]);

  useEffect(() => {
    const scroller = blogScrollerRef.current;
    if (!scroller || blogPosts.length <= 1) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;

    const pauseAutoScroll = () => {
      blogPausedRef.current = true;
      if (blogResumeTimerRef.current) window.clearTimeout(blogResumeTimerRef.current);
      blogResumeTimerRef.current = window.setTimeout(() => {
        blogPausedRef.current = false;
      }, 2200);
    };

    let frame = 0;
    let running = false;
    const step = () => {
      if (!blogPausedRef.current && window.innerWidth < 768) {
        const half = scroller.scrollWidth / 2;
        scroller.scrollLeft += 0.38;
        if (scroller.scrollLeft >= half) {
          scroller.scrollLeft -= half;
        }
      }
      frame = window.requestAnimationFrame(step);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      if (document.visibilityState !== 'visible') return;
      if (window.innerWidth >= 768) return;
      running = true;
      frame = window.requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) start();
        else stop();
      },
      { threshold: 0.12 },
    );
    observer.observe(scroller);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleResize = () => {
      if (window.innerWidth < 768) start();
      else stop();
    };
    window.addEventListener('resize', handleResize, { passive: true });

    scroller.addEventListener('wheel', pauseAutoScroll, { passive: true });
    scroller.addEventListener('touchstart', pauseAutoScroll, { passive: true });
    scroller.addEventListener('touchmove', pauseAutoScroll, { passive: true });
    scroller.addEventListener('pointerdown', pauseAutoScroll, { passive: true });
    scroller.addEventListener('pointermove', pauseAutoScroll, { passive: true });
    scroller.addEventListener('mousedown', pauseAutoScroll);

    handleResize();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
      scroller.removeEventListener('wheel', pauseAutoScroll);
      scroller.removeEventListener('touchstart', pauseAutoScroll);
      scroller.removeEventListener('touchmove', pauseAutoScroll);
      scroller.removeEventListener('pointerdown', pauseAutoScroll);
      scroller.removeEventListener('pointermove', pauseAutoScroll);
      scroller.removeEventListener('mousedown', pauseAutoScroll);
      if (blogResumeTimerRef.current) window.clearTimeout(blogResumeTimerRef.current);
    };
  }, [blogPosts]);

  const isGigFeatured = (gig: GigListing) => {
    if (!gig.featuredUntil) return false;
    const until = new Date(gig.featuredUntil);
    return Number.isFinite(until.getTime()) && until.getTime() > Date.now();
  };

  const getGigTone = (category: string) => {
    const normalized = (category || '').trim().toLowerCase();
    if (normalized.includes('design')) {
      return {
        pill: 'bg-fuchsia-100/85 text-fuchsia-800',
        glow: 'bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.18),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.14),transparent_26%)]',
        icon: 'bg-[linear-gradient(135deg,rgba(236,72,153,0.18),rgba(168,85,247,0.16))] text-fuchsia-900',
      };
    }
    if (normalized.includes('automation')) {
      return {
        pill: 'bg-emerald-100/85 text-emerald-800',
        glow: 'bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.14),transparent_26%)]',
        icon: 'bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(45,212,191,0.16))] text-emerald-900',
      };
    }
    if (normalized.includes('content') || normalized.includes('writing')) {
      return {
        pill: 'bg-amber-100/85 text-amber-800',
        glow: 'bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.14),transparent_26%)]',
        icon: 'bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(249,115,22,0.16))] text-amber-900',
      };
    }
    if (normalized.includes('engineering') || normalized.includes('dev')) {
      return {
        pill: 'bg-sky-100/85 text-sky-800',
        glow: 'bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.14),transparent_26%)]',
        icon: 'bg-[linear-gradient(135deg,rgba(56,189,248,0.18),rgba(99,102,241,0.16))] text-sky-900',
      };
    }
    return {
      pill: 'bg-violet-100/85 text-violet-800',
      glow: 'bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_26%)]',
      icon: 'bg-[linear-gradient(135deg,rgba(139,92,246,0.18),rgba(56,189,248,0.16))] text-violet-900',
    };
  };

  useEffect(() => {
    let active = true;

    const closeStream = () => {
      if (homepageGigsEventSourceRef.current) {
        homepageGigsEventSourceRef.current.close();
        homepageGigsEventSourceRef.current = null;
      }
    };

    const stopPolling = () => {
      if (homepageGigsPollingRef.current) {
        window.clearInterval(homepageGigsPollingRef.current);
        homepageGigsPollingRef.current = null;
      }
    };

    const applyPayload = (payload: HomepageGigsPayload | null) => {
      if (!active || !payload) return;
      const list = Array.isArray(payload.discoverListings)
        ? payload.discoverListings
        : Array.isArray(payload.gigs)
          ? payload.gigs
          : [];
      setHomepageGigs(list);
      setHomepageGigsUpdatedAt(payload.generatedAt || (list[0]?.updatedAt ?? null));
      setHomepageGigsLoading(false);
    };

    const startPolling = () => {
      stopPolling();
      const load = async () => {
        try {
          const endpoint = isAuthenticated ? '/api/gigs' : '/api/public/gigs';
          const response = await fetch(endpoint, { cache: 'no-store' });
          const payload = response.ok ? await response.json() : null;
          applyPayload(payload);
        } catch {
          if (!active) return;
          setHomepageGigs([]);
          setHomepageGigsLoading(false);
        }
      };
      void load();
      homepageGigsPollingRef.current = window.setInterval(() => void load(), 20000);
    };

    const startStream = () => {
      try {
        const endpoint = isAuthenticated ? '/api/gigs/stream' : '/api/public/gigs/stream';
        const es = new EventSource(endpoint);
        homepageGigsEventSourceRef.current = es;

        es.addEventListener('gigs', (event) => {
          const messageEvent = event as MessageEvent<string>;
          try {
            applyPayload(JSON.parse(messageEvent.data) as HomepageGigsPayload);
          } catch {
            // ignore
          }
        });

        es.addEventListener('error', () => {
          closeStream();
          startPolling();
        });
      } catch {
        startPolling();
      }
    };

    setHomepageGigsLoading(true);
    closeStream();
    stopPolling();
    startStream();

    return () => {
      active = false;
      closeStream();
      stopPolling();
    };
  }, [isAuthenticated]);

  const featuredHomepageGigs = useMemo(() => (
    homepageGigs
      .filter((gig) => gig.status === 'published' && isGigFeatured(gig))
      .sort((a, b) => +new Date(b.featuredUntil || b.updatedAt) - +new Date(a.featuredUntil || a.updatedAt))
      .slice(0, 10)
  ), [homepageGigs]);

  const recentHomepageGigs = useMemo(() => (
    homepageGigs
      .filter((gig) => gig.status === 'published' && !isGigFeatured(gig))
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
      .slice(0, 12)
  ), [homepageGigs]);

  const featuredHomepageGigCards = useMemo(
    () => (featuredHomepageGigs.length >= 1 ? [...featuredHomepageGigs, ...featuredHomepageGigs] : featuredHomepageGigs),
    [featuredHomepageGigs],
  );

  const recentHomepageGigCards = useMemo(
    () => (recentHomepageGigs.length >= 1 ? [...recentHomepageGigs, ...recentHomepageGigs] : recentHomepageGigs),
    [recentHomepageGigs],
  );

  const homepageGigsUpdatedLabel = useMemo(() => {
    if (!homepageGigsUpdatedAt) return 'Live feed';
    const date = new Date(homepageGigsUpdatedAt);
    if (Number.isNaN(date.getTime())) return 'Live feed';
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
  }, [homepageGigsUpdatedAt]);

  useEffect(() => {
    const scroller = featuredGigsScrollerRef.current;
    if (!scroller || featuredHomepageGigCards.length <= 1) return;
    if (typeof window !== 'undefined') {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    }

    const pauseAutoScroll = () => {
      featuredGigsPausedRef.current = true;
      if (featuredGigsResumeTimerRef.current) window.clearTimeout(featuredGigsResumeTimerRef.current);
      featuredGigsResumeTimerRef.current = window.setTimeout(() => {
        featuredGigsPausedRef.current = false;
      }, 1800);
    };

    let frame = 0;
    let running = false;
    const step = () => {
      if (!featuredGigsPausedRef.current) {
        const half = scroller.scrollWidth / 2;
        scroller.scrollLeft += 0.36;
        if (scroller.scrollLeft >= half) {
          scroller.scrollLeft -= half;
        }
      }
      frame = window.requestAnimationFrame(step);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      if (document.visibilityState !== 'visible') return;
      if (window.innerWidth >= 1024) return;
      running = true;
      frame = window.requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) start();
        else stop();
      },
      { threshold: 0.12 },
    );
    observer.observe(scroller);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleResize = () => {
      if (window.innerWidth < 1024) start();
      else stop();
    };
    window.addEventListener('resize', handleResize, { passive: true });

    scroller.addEventListener('wheel', pauseAutoScroll, { passive: true });
    scroller.addEventListener('touchstart', pauseAutoScroll, { passive: true });
    scroller.addEventListener('touchmove', pauseAutoScroll, { passive: true });
    scroller.addEventListener('pointerdown', pauseAutoScroll, { passive: true });
    scroller.addEventListener('pointermove', pauseAutoScroll, { passive: true });
    scroller.addEventListener('mousedown', pauseAutoScroll);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
      scroller.removeEventListener('wheel', pauseAutoScroll);
      scroller.removeEventListener('touchstart', pauseAutoScroll);
      scroller.removeEventListener('touchmove', pauseAutoScroll);
      scroller.removeEventListener('pointerdown', pauseAutoScroll);
      scroller.removeEventListener('pointermove', pauseAutoScroll);
      scroller.removeEventListener('mousedown', pauseAutoScroll);
      if (featuredGigsResumeTimerRef.current) window.clearTimeout(featuredGigsResumeTimerRef.current);
    };
  }, [featuredHomepageGigCards.length]);

  useEffect(() => {
    const scroller = recentGigsScrollerRef.current;
    if (!scroller || recentHomepageGigCards.length <= 1) return;
    if (typeof window !== 'undefined') {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    }

    const pauseAutoScroll = () => {
      recentGigsPausedRef.current = true;
      if (recentGigsResumeTimerRef.current) window.clearTimeout(recentGigsResumeTimerRef.current);
      recentGigsResumeTimerRef.current = window.setTimeout(() => {
        recentGigsPausedRef.current = false;
      }, 1800);
    };

    let frame = 0;
    let running = false;
    const step = () => {
      if (!recentGigsPausedRef.current) {
        const half = scroller.scrollWidth / 2;
        scroller.scrollLeft += 0.3;
        if (scroller.scrollLeft >= half) {
          scroller.scrollLeft -= half;
        }
      }
      frame = window.requestAnimationFrame(step);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      if (document.visibilityState !== 'visible') return;
      if (window.innerWidth >= 1024) return;
      running = true;
      frame = window.requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) start();
        else stop();
      },
      { threshold: 0.12 },
    );
    observer.observe(scroller);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleResize = () => {
      if (window.innerWidth < 1024) start();
      else stop();
    };
    window.addEventListener('resize', handleResize, { passive: true });

    scroller.addEventListener('wheel', pauseAutoScroll, { passive: true });
    scroller.addEventListener('touchstart', pauseAutoScroll, { passive: true });
    scroller.addEventListener('touchmove', pauseAutoScroll, { passive: true });
    scroller.addEventListener('pointerdown', pauseAutoScroll, { passive: true });
    scroller.addEventListener('pointermove', pauseAutoScroll, { passive: true });
    scroller.addEventListener('mousedown', pauseAutoScroll);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
      scroller.removeEventListener('wheel', pauseAutoScroll);
      scroller.removeEventListener('touchstart', pauseAutoScroll);
      scroller.removeEventListener('touchmove', pauseAutoScroll);
      scroller.removeEventListener('pointerdown', pauseAutoScroll);
      scroller.removeEventListener('pointermove', pauseAutoScroll);
      scroller.removeEventListener('mousedown', pauseAutoScroll);
      if (recentGigsResumeTimerRef.current) window.clearTimeout(recentGigsResumeTimerRef.current);
    };
  }, [recentHomepageGigCards.length]);

  const filteredRecentPublishes = useMemo(
    () => recentPublishes.filter((item) => recentPublishFilter === 'all' || item.visibility === recentPublishFilter),
    [recentPublishes, recentPublishFilter],
  );

  const recentPublishCards = useMemo(
    () => (filteredRecentPublishes.length > 1 ? [...filteredRecentPublishes, ...filteredRecentPublishes] : filteredRecentPublishes),
    [filteredRecentPublishes],
  );
  const blogCards = useMemo(
    () => (blogPosts.length > 1 ? [...blogPosts, ...blogPosts] : blogPosts),
    [blogPosts],
  );

  const recentPublishesUpdatedLabel = useMemo(() => {
    const latest = filteredRecentPublishes[0]?.updatedAt || recentPublishes[0]?.updatedAt;
    if (!latest) return 'Live feed';
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(latest));
  }, [filteredRecentPublishes, recentPublishes]);

  const formatDeviceRelativeTime = (timestamp: string) => {
    const value = new Date(timestamp).getTime();
    if (!Number.isFinite(value)) return '';

    const diff = value - timeTick;
    const absDiff = Math.abs(diff);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (absDiff < minute) return 'Just now';

    if (absDiff < hour) {
      return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(Math.round(diff / minute), 'minute');
    }

    if (absDiff < day) {
      return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(Math.round(diff / hour), 'hour');
    }

    if (absDiff < day * 6) {
      return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(Math.round(diff / day), 'day');
    }

    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveWhyWord((current) => (current + 1) % whyWords.length);
    }, 2000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeTick(Date.now());
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const scroller = toolsScrollerRef.current;
    if (!scroller) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;

    const pauseAutoScroll = () => {
      toolsAutoScrollPausedRef.current = true;
      if (toolsResumeTimerRef.current) window.clearTimeout(toolsResumeTimerRef.current);
      toolsResumeTimerRef.current = window.setTimeout(() => {
        toolsAutoScrollPausedRef.current = false;
      }, 1800);
    };

    let frame = 0;
    let running = false;
    const step = () => {
      if (!toolsAutoScrollPausedRef.current) {
        const half = scroller.scrollWidth / 2;
        scroller.scrollLeft += 0.45;
        if (scroller.scrollLeft >= half) {
          scroller.scrollLeft -= half;
        }
      }
      frame = window.requestAnimationFrame(step);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      if (document.visibilityState !== 'visible') return;
      // Keep tools strip lightweight on desktop: run only on smaller screens.
      if (window.innerWidth >= 1024) return;
      running = true;
      frame = window.requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) start();
        else stop();
      },
      { threshold: 0.12 },
    );
    observer.observe(scroller);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleResize = () => {
      if (window.innerWidth < 1024) start();
      else stop();
    };
    window.addEventListener('resize', handleResize, { passive: true });

    scroller.addEventListener('wheel', pauseAutoScroll, { passive: true });
    scroller.addEventListener('touchstart', pauseAutoScroll, { passive: true });
    scroller.addEventListener('touchmove', pauseAutoScroll, { passive: true });
    scroller.addEventListener('pointerdown', pauseAutoScroll, { passive: true });
    scroller.addEventListener('pointermove', pauseAutoScroll, { passive: true });
    scroller.addEventListener('mousedown', pauseAutoScroll);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
      scroller.removeEventListener('wheel', pauseAutoScroll);
      scroller.removeEventListener('touchstart', pauseAutoScroll);
      scroller.removeEventListener('touchmove', pauseAutoScroll);
      scroller.removeEventListener('pointerdown', pauseAutoScroll);
      scroller.removeEventListener('pointermove', pauseAutoScroll);
      scroller.removeEventListener('mousedown', pauseAutoScroll);
      if (toolsResumeTimerRef.current) window.clearTimeout(toolsResumeTimerRef.current);
    };
  }, []);

  return (
    <PublicSiteChrome softwareName={softwareName} accentLabel={accentLabel} settings={settings}>
      <section className={`relative overflow-visible rounded-[1.05rem] px-1.5 py-1.5 shadow-[0_10px_30px_rgba(56,189,248,0.08)] sm:cloud-panel sm:overflow-hidden sm:rounded-[1.2rem] sm:px-5 sm:py-4 ${darkMode ? 'bg-[linear-gradient(135deg,rgba(10,10,12,0.66),rgba(11,16,24,0.9),rgba(8,8,10,0.72))]' : 'bg-[linear-gradient(135deg,rgba(255,255,255,0.34),rgba(236,244,255,0.72),rgba(255,255,255,0.3))]'}`}>
        <div className={`pointer-events-none absolute inset-0 rounded-[1.05rem] sm:rounded-[1.2rem] ${darkMode ? 'bg-[radial-gradient(circle_at_left,rgba(56,189,248,0.1),transparent_18%),radial-gradient(circle_at_right,rgba(139,92,246,0.1),transparent_18%)]' : 'bg-[radial-gradient(circle_at_left,rgba(56,189,248,0.16),transparent_18%),radial-gradient(circle_at_right,rgba(139,92,246,0.14),transparent_18%)]'}`} />
        <div className="hidden flex-col gap-3 sm:flex sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-sky-300' : 'text-sky-700'}`}>Daily tools</p>
            <h2 className={`mt-1 text-[1rem] font-semibold tracking-[-0.04em] sm:text-[1.08rem] ${darkMode ? 'text-white' : 'text-slate-950'}`}>
              Useful tools, minus the chaos.
            </h2>
          </div>
        </div>
        <div className="relative -mx-1 overflow-hidden sm:mx-0 sm:mt-4">
          <div className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-6 sm:w-10 ${darkMode ? 'bg-[linear-gradient(90deg,rgba(7,7,8,0.96),rgba(7,7,8,0))]' : 'bg-[linear-gradient(90deg,rgba(232,243,255,0.92),rgba(232,243,255,0))] sm:bg-[linear-gradient(90deg,rgba(236,244,255,0.92),rgba(236,244,255,0))]'}`} />
          <div className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-6 sm:w-10 ${darkMode ? 'bg-[linear-gradient(270deg,rgba(7,7,8,0.96),rgba(7,7,8,0))]' : 'bg-[linear-gradient(270deg,rgba(232,243,255,0.92),rgba(232,243,255,0))] sm:bg-[linear-gradient(270deg,rgba(236,244,255,0.92),rgba(236,244,255,0))]'}`} />
          <div
            ref={toolsScrollerRef}
            className="no-scrollbar relative z-10 flex items-center gap-2.5 overflow-x-auto px-1 pb-1 will-change-scroll sm:px-0"
          >
            {[...dailyToolStrip, ...dailyToolStrip].map((tool, index) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={`${tool.label}-${index}`}
                  href="/daily-tools"
                  className={`inline-flex shrink-0 items-center gap-2 rounded-[0.82rem] px-3.5 py-2.5 text-[13px] font-semibold tracking-[-0.02em] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 sm:rounded-[0.9rem] sm:px-4 ${
                    darkMode
                      ? 'border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] text-slate-100 shadow-[0_12px_28px_rgba(0,0,0,0.22)] hover:bg-white/[0.08] hover:text-white'
                      : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(245,248,255,0.88))] text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.72)] hover:bg-white/90 hover:text-slate-950'
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-[0.7rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ${darkMode ? 'bg-[linear-gradient(135deg,rgba(56,189,248,0.18),rgba(139,92,246,0.18))] text-white' : 'bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(139,92,246,0.16))] text-slate-900'}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  {tool.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className={`cloud-panel overflow-hidden rounded-[1.9rem] p-2 sm:rounded-[2.5rem] sm:p-3 lg:p-4 ${darkMode ? 'shadow-[0_24px_80px_rgba(0,0,0,0.34)]' : ''}`}
      >
        <div className="relative overflow-hidden rounded-[1.65rem] p-4 sm:p-6 lg:p-7">
          <div className={`pointer-events-none absolute inset-0 ${darkMode ? 'bg-[radial-gradient(circle_at_14%_18%,rgba(255,255,255,0.06),transparent_22%),radial-gradient(circle_at_78%_18%,rgba(14,165,233,0.18),transparent_20%),radial-gradient(circle_at_74%_76%,rgba(139,92,246,0.16),transparent_24%),linear-gradient(180deg,rgba(8,8,10,0.7),rgba(11,18,28,0.92))]' : 'bg-[radial-gradient(circle_at_14%_18%,rgba(255,255,255,0.86),transparent_22%),radial-gradient(circle_at_78%_18%,rgba(14,165,233,0.46),transparent_20%),radial-gradient(circle_at_74%_76%,rgba(139,92,246,0.4),transparent_24%),radial-gradient(circle_at_32%_86%,rgba(34,197,94,0.22),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.66),rgba(234,244,255,0.92))]'}`} />
          <div className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full bg-sky-300/35 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-violet-300/30 blur-3xl" />
          <div className="pointer-events-none absolute right-[26%] top-[16%] h-32 w-32 rounded-full bg-cyan-200/25 blur-3xl" />
          <div className="relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <h1 className={`max-w-3xl text-[1.22rem] font-semibold tracking-[-0.06em] sm:text-[1.5rem] lg:text-[1.8rem] ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                Teams can{' '}
                <span className="relative inline-flex min-w-[5.8rem] justify-center">
                  {headlineWords.map((word, index) => (
                    <span
                      key={word}
                      className={`absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 rounded-full bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(37,99,235,0.92),rgba(139,92,246,0.9))] px-3 py-1 text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition-all duration-500 ${
                        activeHeadlineWord === index
                          ? 'translate-y-[-50%] scale-100 opacity-100'
                          : 'translate-y-[-35%] scale-95 opacity-0'
                      }`}
                    >
                      {word}
                    </span>
                  ))}
                  <span className="invisible rounded-full px-3 py-1">secure</span>
                </span>{' '}
                with {softwareName}.
              </h1>
            </div>
            <div className="hidden items-center gap-2 self-start sm:flex">
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => setActiveSlide((current) => current - 1)}
                className={`cloud-pill inline-flex h-10 w-10 items-center justify-center rounded-full transition duration-300 hover:-translate-y-0.5 ${darkMode ? 'text-slate-200 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => setActiveSlide((current) => current + 1)}
                className={`cloud-pill inline-flex h-10 w-10 items-center justify-center rounded-full transition duration-300 hover:-translate-y-0.5 ${darkMode ? 'text-slate-200 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-6">
            <div className="overflow-hidden rounded-[1.8rem] lg:hidden">
              <div
                className={`flex ${carouselTransitionEnabled ? 'transition-transform duration-500 ease-out' : ''}`}
                style={{ transform: `translate3d(-${activeSlide * 100}%, 0, 0)` }}
              >
              {carouselSlides.map((slide, index) => (
                <article
                  key={`${slide.id}-${index}`}
                  className="group relative min-h-[22rem] w-full shrink-0 overflow-hidden rounded-[1.75rem] transition-all duration-500 ease-out"
                >
                  <div className="absolute inset-0">
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      fill
                      priority={index <= 1}
                      className="object-cover object-center transition duration-700 group-hover:scale-[1.012]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(15,23,42,0.08)_30%,rgba(15,23,42,0.58))]" />
                    <div className="absolute inset-0 rounded-[1.75rem] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_22%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.18),transparent_24%)] backdrop-blur-[1px]" />
                    <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent)]" />
                  </div>

                  <div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/30 bg-white/22 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/92 backdrop-blur-xl">
                          {slide.eyebrow}
                        </span>
                        <span className="rounded-full border border-white/20 bg-black/20 px-2.5 py-1 text-[10px] font-medium tracking-[-0.01em] text-white/80 backdrop-blur-xl">
                          {slide.vibe}
                        </span>
                      </div>
                      <Link
                        href={slide.primaryHref}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/18 text-white backdrop-blur-xl transition duration-300 hover:scale-105 hover:bg-black/30"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>

                    <div className="min-w-[15rem] max-w-[16.2rem] rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.26),rgba(15,23,42,0.14))] px-3.5 py-3 backdrop-blur-xl sm:min-w-[16rem] sm:max-w-[16.8rem]">
                      <h2 className="whitespace-nowrap text-[0.82rem] font-semibold leading-5 tracking-[-0.05em] text-white sm:text-[0.92rem] sm:leading-6">
                        {slide.title}
                      </h2>
                      <p className="mt-1.5 hidden text-[10px] leading-4 text-white/86 sm:block sm:text-[11px] sm:leading-5">
                        {slide.description}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button asChild className="h-9 w-full rounded-full bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(37,99,235,0.92))] px-3 py-2 text-[10px] font-semibold tracking-[-0.01em] text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)] sm:h-10 sm:text-[11px]">
                          <Link href={slide.primaryHref}>
                            {slide.primaryCta.label}
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className={`h-9 w-full rounded-full px-3 py-2 text-[10px] font-semibold tracking-[-0.01em] backdrop-blur-xl transition duration-300 sm:h-10 sm:text-[11px] ${darkMode ? 'border border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.11] hover:text-white' : 'border-transparent bg-white/12 text-white hover:bg-white/18 hover:text-white'}`}>
                          <Link href={slide.secondaryHref}>{slide.secondaryCta.label}</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              </div>
            </div>
            <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4">
              {orderedSlides.slice(0, 3).map((slide, index) => (
                <article
                  key={`${slide.id}-desktop-${index}`}
                  className={`group relative min-h-[26rem] overflow-hidden rounded-[1.75rem] transition-all duration-500 ease-out ${
                    index === 0
                      ? 'scale-[1.01] shadow-[0_24px_70px_rgba(96,165,250,0.12)]'
                      : 'opacity-95 shadow-[0_14px_40px_rgba(15,23,42,0.06)]'
                  } hover:-translate-y-0.5 hover:shadow-[0_22px_56px_rgba(15,23,42,0.09)]`}
                >
                  <div className="absolute inset-0">
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      fill
                      priority={index === 0}
                      className="object-cover object-center transition duration-700 group-hover:scale-[1.012]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(15,23,42,0.08)_30%,rgba(15,23,42,0.58))]" />
                    <div className="absolute inset-0 rounded-[1.75rem] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_22%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.18),transparent_24%)] backdrop-blur-[1px]" />
                    <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent)]" />
                  </div>

                  <div className="relative flex h-full flex-col justify-between p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/30 bg-white/22 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/92 backdrop-blur-xl">
                          {slide.eyebrow}
                        </span>
                        <span className="rounded-full border border-white/20 bg-black/20 px-2.5 py-1 text-[10px] font-medium tracking-[-0.01em] text-white/80 backdrop-blur-xl">
                          {slide.vibe}
                        </span>
                      </div>
                      <Link
                        href={slide.primaryHref}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/18 text-white backdrop-blur-xl transition duration-300 hover:scale-105 hover:bg-black/30"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>

                    <div className="min-w-[16rem] max-w-[17.2rem] rounded-[1.45rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.24),rgba(15,23,42,0.12))] px-3.5 py-3.5 backdrop-blur-xl">
                      <h2 className="whitespace-nowrap text-[0.94rem] font-semibold leading-6 tracking-[-0.05em] text-white">
                        {slide.title}
                      </h2>
                      <p className="mt-1.5 hidden text-[11px] leading-5 text-white/86 sm:block">
                        {slide.description}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button asChild className="h-10 w-full rounded-full bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(37,99,235,0.92))] px-3.5 py-2 text-[11px] font-semibold tracking-[-0.01em] text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)]">
                          <Link href={slide.primaryHref}>
                            {slide.primaryCta.label}
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className={`h-10 w-full rounded-full px-3.5 py-2 text-[11px] font-semibold tracking-[-0.01em] backdrop-blur-xl transition duration-300 ${darkMode ? 'border border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.11] hover:text-white' : 'border-transparent bg-white/12 text-white hover:bg-white/18 hover:text-white'}`}>
                          <Link href={slide.secondaryHref}>{slide.secondaryCta.label}</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-start gap-2 pt-4">
            <div className="flex gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Open ${slide.eyebrow}`}
                  onClick={() => setActiveSlide(index + 1)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    activeSlideIndex === index ? 'w-9 bg-[linear-gradient(90deg,#0f172a,#2563eb)] shadow-[0_8px_20px_rgba(37,99,235,0.28)]' : darkMode ? 'w-2.5 bg-white/20 hover:bg-white/35' : 'w-2.5 bg-slate-300/80 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          </div>
          </div>
        </div>
      </section>

      <section className="cloud-panel relative overflow-hidden rounded-[1.85rem] p-4 sm:p-5 lg:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(56,189,248,0.2),transparent_18%),radial-gradient(circle_at_88%_18%,rgba(139,92,246,0.2),transparent_16%),radial-gradient(circle_at_70%_82%,rgba(16,185,129,0.16),transparent_18%)]" />
        <div className="pointer-events-none absolute -left-6 top-10 h-28 w-28 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-violet-200/35 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-white/18 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.46),rgba(255,255,255,0.24))] px-4 py-3 shadow-[0_10px_28px_rgba(148,163,184,0.05),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl sm:px-5 sm:py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="cloud-pill inline-flex rounded-full bg-sky-100/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                Recent publishes
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/55 px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] text-slate-600 backdrop-blur-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {recentPublishesUpdatedLabel}
              </span>
            </div>
            <h2 className="mt-3 text-[1rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[1.12rem]">
              {isAuthenticated ? 'Your publishes, plus what is live.' : 'Recent public publishes on docrud.'}
            </h2>
            <p className="mt-2 hidden text-[12px] leading-5 text-slate-600 sm:block sm:text-[13px]">
              {isAuthenticated ? 'Your latest posts mixed with public drops, updated live.' : 'Latest public drops, updated live.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'public', 'private'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setRecentPublishFilter(filter)}
                className={`inline-flex h-10 items-center rounded-full px-4 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur-xl transition duration-300 ${
                  recentPublishFilter === filter
                    ? filter === 'private'
                      ? 'bg-[linear-gradient(135deg,rgba(245,158,11,0.96),rgba(251,191,36,0.9))] text-white shadow-[0_14px_28px_rgba(245,158,11,0.22)]'
                      : filter === 'public'
                        ? 'bg-[linear-gradient(135deg,rgba(16,185,129,0.96),rgba(34,197,94,0.9))] text-white shadow-[0_14px_28px_rgba(16,185,129,0.22)]'
                        : 'bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(37,99,235,0.92))] text-white shadow-[0_14px_30px_rgba(37,99,235,0.2)]'
                    : 'bg-white/48 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] hover:bg-white/68 hover:text-slate-950'
                }`}
              >
                {filter}
              </button>
            ))}
            <Button asChild variant="outline" className="cloud-pill h-10 rounded-full border-0 px-5 text-[12px] text-slate-800 hover:bg-white/95">
              <Link href={isAuthenticated ? '/workspace?tab=file-transfers' : '/file-directory'}>{isAuthenticated ? 'Open publishes' : 'Open directory'}</Link>
            </Button>
          </div>
        </div>

        <div className="relative mt-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-[linear-gradient(90deg,rgba(236,244,255,0.94),rgba(236,244,255,0))]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-[linear-gradient(270deg,rgba(236,244,255,0.94),rgba(236,244,255,0))]" />
          <div
            ref={recentPublishesScrollerRef}
            className="no-scrollbar relative z-10 flex items-stretch gap-3 overflow-x-auto pb-2"
          >
	            {(recentPublishesLoading
	              ? Array.from({ length: 4 }).map((_, index) => ({ id: `skeleton-${index}`, kind: 'skeleton' as const }))
	              : recentPublishCards
	            ).map((item, index) => {
	              if (!('source' in item)) {
	                return (
	                  <div
	                    key={item.id}
                    className="min-h-[14.5rem] w-[17.5rem] shrink-0 rounded-[1.55rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.34))] p-4 shadow-[0_10px_28px_rgba(148,163,184,0.06),0_0_0_1px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.74)] backdrop-blur-2xl sm:w-[19rem] lg:w-[20rem]"
                  >
                    <div className="h-5 w-24 rounded-full bg-slate-200/80" />
                    <div className="mt-4 h-7 w-3/4 rounded-2xl bg-slate-200/75" />
                    <div className="mt-3 h-4 w-full rounded-full bg-slate-100/90" />
                    <div className="mt-2 h-4 w-4/5 rounded-full bg-slate-100/80" />
                    <div className="mt-6 grid grid-cols-2 gap-2">
                      <div className="h-14 rounded-[1rem] bg-slate-100/85" />
                      <div className="h-14 rounded-[1rem] bg-slate-100/85" />
                    </div>
                  </div>
                );
              }

	              const isOwn = item.source === 'yours';
	              const isPrivate = item.visibility === 'private';
	              const href = item.href.startsWith('/workspace') && !isAuthenticated ? '/login' : item.href;

              return (
                <Link
                  key={`${item.id}-${index}`}
                  href={href}
                  className="group relative flex min-h-[14.5rem] w-[17.5rem] shrink-0 flex-col justify-between overflow-hidden rounded-[1.55rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.34))] p-4 shadow-[0_10px_28px_rgba(148,163,184,0.06),0_0_0_1px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.74)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.64),rgba(255,255,255,0.4))] hover:shadow-[0_14px_34px_rgba(148,163,184,0.08),0_0_0_1px_rgba(255,255,255,0.14),inset_0_1px_0_rgba(255,255,255,0.78)] sm:w-[19rem] lg:w-[20rem]"
                >
                  <div className={`pointer-events-none absolute inset-0 opacity-90 ${
                    isOwn
                      ? 'bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.14),transparent_24%)]'
                      : 'bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_24%)]'
                  }`} />
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-20 rounded-b-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0))]" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          isOwn ? 'bg-sky-100/90 text-sky-700' : 'bg-violet-100/90 text-violet-700'
                        }`}>
                          {isOwn ? 'Yours' : 'Public'}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] ${
                          isPrivate ? 'bg-amber-100/90 text-amber-700' : 'bg-emerald-100/90 text-emerald-700'
                        }`}>
                          {isPrivate ? <LockKeyhole className="h-3 w-3" /> : <Globe2 className="h-3 w-3" />}
                          {isPrivate ? 'Private' : 'Live'}
                        </span>
                      </div>
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/58 text-slate-700 shadow-[0_8px_18px_rgba(148,163,184,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl transition duration-300 group-hover:scale-105 group-hover:bg-white/72 group-hover:text-slate-950">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>

                    <h3 className="mt-4 line-clamp-2 text-[1rem] font-semibold tracking-[-0.03em] text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-slate-600">
                      {item.notes?.trim() || `${item.fileName} is now available through the docrud publish flow.`}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.category ? (
                        <span className="rounded-full bg-white/65 px-2.5 py-1 text-[10px] font-medium text-slate-600 backdrop-blur-lg">
                          {item.category}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-white/65 px-2.5 py-1 text-[10px] font-medium text-slate-600 backdrop-blur-lg">
                        {item.sizeLabel}
                      </span>
                      {item.tags.slice(0, 1).map((tag) => (
                        <span key={tag} className="rounded-full bg-white/65 px-2.5 py-1 text-[10px] font-medium text-slate-600 backdrop-blur-lg">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="relative z-10 mt-5 grid grid-cols-2 gap-2">
                      <div className="rounded-[1rem] bg-white/54 px-3 py-3 shadow-[0_8px_20px_rgba(148,163,184,0.04),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          <Eye className="h-3.5 w-3.5" />
                          Opens
                      </div>
                      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">{item.openCount}</p>
                    </div>
                      <div className="rounded-[1rem] bg-white/54 px-3 py-3 shadow-[0_8px_20px_rgba(148,163,184,0.04),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          <Download className="h-3.5 w-3.5" />
                          Downloads
                      </div>
                      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">{item.downloadCount}</p>
                    </div>
                  </div>

                  <div className="relative z-10 mt-4 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="line-clamp-1 max-w-[60%]">{item.publishedBy || 'docrud user'}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDeviceRelativeTime(item.updatedAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          {!recentPublishesLoading && filteredRecentPublishes.length === 0 ? (
            <div className="relative z-10 mt-2 rounded-[1.5rem] bg-white/42 px-4 py-8 text-center shadow-[0_10px_26px_rgba(148,163,184,0.05),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.76)] backdrop-blur-2xl">
              <p className="text-sm font-semibold tracking-[-0.02em] text-slate-900">No {recentPublishFilter} publishes yet.</p>
              <p className="mt-2 text-sm text-slate-600">
                Try another filter or publish a new file to see it show up here live.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 sm:gap-6">
        {filteredFeatureGroups.map((group) => {
          const tone = getToneClasses(group.tone);
          return (
            <div key={group.title} className="grid gap-5 sm:gap-6">
              <article
                className={`cloud-panel relative overflow-hidden rounded-[1.8rem] p-4 sm:p-6 ${tone.panelGlow} before:absolute before:inset-0 before:opacity-80 before:content-[''] after:absolute after:inset-0 after:opacity-70 after:content-[''] ${darkMode ? 'shadow-[0_24px_72px_rgba(0,0,0,0.32)]' : ''}`}
              >
                <div className="pointer-events-none absolute -left-8 top-6 h-24 w-24 rounded-full bg-white/20 blur-3xl" />
                <div
                  className={`pointer-events-none absolute bottom-2 right-4 h-28 w-28 rounded-full blur-3xl ${
                    group.tone === 'sky'
                      ? 'bg-sky-300/20'
                      : group.tone === 'violet'
                        ? 'bg-violet-300/20'
                        : group.tone === 'emerald'
                          ? 'bg-emerald-300/18'
                          : 'bg-amber-300/18'
                  }`}
                />
                <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-2xl">
                    <h2 className={`mt-3 text-[1.12rem] font-semibold tracking-[-0.03em] sm:text-[1.28rem] ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                      {group.title}, without the usual tool sprawl
                    </h2>
                    <p className={`mt-2 hidden text-[13px] leading-6 sm:block ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {group.description}
                    </p>
                  </div>
                  <Button
                    asChild
                    className={`h-10 rounded-full px-5 text-[12px] font-semibold text-white shadow-[0_16px_34px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 ${
                      group.tone === 'sky'
                        ? 'bg-[linear-gradient(135deg,#0f172a,#2563eb,#38bdf8)]'
                        : group.tone === 'violet'
                          ? 'bg-[linear-gradient(135deg,#0f172a,#7c3aed,#38bdf8)]'
                          : group.tone === 'emerald'
                            ? 'bg-[linear-gradient(135deg,#0f172a,#10b981,#34d399)]'
                            : 'bg-[linear-gradient(135deg,#0f172a,#f59e0b,#fb7185)]'
                    }`}
                  >
                    <Link href="/pricing">Explore access</Link>
                  </Button>
                </div>

                <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const href = item.href.startsWith('/workspace') && !isAuthenticated ? '/login' : item.href;
                    return (
                      <Link
                        key={item.title}
                        href={href}
                        className="cloud-card-soft group min-w-0 rounded-[1.45rem] p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(15,23,42,0.09)]"
                      >
                        <div className={`flex h-11 w-11 items-center justify-center rounded-[1rem] ${tone.icon}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className={`mt-4 text-sm font-semibold tracking-[-0.02em] ${darkMode ? 'text-white' : 'text-slate-950'}`}>{item.title}</h3>
                        <p className={`mt-2 hidden text-[12px] leading-5 sm:block ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{item.description}</p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[-0.01em] backdrop-blur-md ${darkMode ? 'bg-white/[0.06] text-slate-300' : 'bg-white/60 text-slate-500'}`}>
                            Launch
                          </div>
                          <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition ${darkMode ? 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]' : 'bg-white/60 text-slate-700 hover:bg-white/80'}`}>
                            Open
                            <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </article>

              {group.title === 'AI' ? (
                <section className={`cloud-panel relative overflow-hidden rounded-[1.85rem] p-4 sm:p-5 lg:p-6 ${darkMode ? 'shadow-[0_24px_72px_rgba(0,0,0,0.32)]' : ''}`}>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(139,92,246,0.18),transparent_20%),radial-gradient(circle_at_84%_18%,rgba(56,189,248,0.16),transparent_20%),radial-gradient(circle_at_68%_86%,rgba(16,185,129,0.14),transparent_24%)]" />
                  <div className="pointer-events-none absolute -left-10 top-8 h-28 w-28 rounded-full bg-violet-200/35 blur-3xl" />
                  <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-sky-200/35 blur-3xl" />

                  <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${darkMode ? 'bg-white/[0.06] text-violet-200' : 'bg-violet-100/90 text-violet-700'}`}>
                          <BriefcaseBusiness className="h-3.5 w-3.5" />
                          Gigs live
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] backdrop-blur-xl ${darkMode ? 'bg-white/[0.06] text-slate-300' : 'bg-white/55 text-slate-600'}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {homepageGigsUpdatedLabel}
                        </span>
                      </div>
                      <h3 className={`mt-3 text-[1.06rem] font-semibold tracking-[-0.04em] sm:text-[1.16rem] ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                        Featured gigs and fresh work, updated in realtime.
                      </h3>
                      <p className={`mt-2 hidden text-sm leading-6 sm:block ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        Browse what teams are posting, or publish your own brief when you are ready.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild className="h-10 rounded-full bg-slate-950 px-5 text-[12px] font-semibold text-white hover:bg-slate-800">
                        <Link href="/gigs">Browse gigs</Link>
                      </Button>
                      <Button asChild variant="outline" className={`cloud-pill h-10 rounded-full border-0 px-5 text-[12px] ${darkMode ? 'text-white hover:bg-white/[0.08]' : 'text-slate-800 hover:bg-white/95'}`}>
                        <Link href={isAuthenticated ? '/workspace?tab=gigs' : '/login'}>{isAuthenticated ? 'Post a gig' : 'Login to post'}</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="relative z-10 mt-6 grid gap-5 lg:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Featured</p>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${darkMode ? 'bg-white/[0.06] text-slate-300' : 'bg-white/60 text-slate-600'}`}>{featuredHomepageGigs.length}</span>
                      </div>
                      <div className="relative -mx-4 overflow-hidden sm:mx-0">
                        <div className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-6 ${darkMode ? 'bg-[linear-gradient(90deg,rgba(10,10,12,0.92),transparent)]' : 'bg-[linear-gradient(90deg,rgba(236,244,255,0.9),transparent)]'}`} />
                        <div className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-6 ${darkMode ? 'bg-[linear-gradient(270deg,rgba(10,10,12,0.92),transparent)]' : 'bg-[linear-gradient(270deg,rgba(236,244,255,0.9),transparent)]'}`} />
                        <div
                          ref={featuredGigsScrollerRef}
                          className="no-scrollbar relative z-10 flex snap-x snap-proximity items-stretch gap-3 overflow-x-scroll px-4 pb-1 will-change-scroll [scrollbar-width:none] touch-pan-x overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch] sm:px-0"
                        >
                          {(homepageGigsLoading ? Array.from({ length: 3 }).map((_, index) => ({ id: `skeleton-featured-${index}` })) : featuredHomepageGigCards).map((item, index) => {
                            if ('id' in item && String(item.id).startsWith('skeleton-featured-')) {
                              return (
                                <div
                                  key={String(item.id)}
                                  className={`min-h-[12rem] w-[84vw] max-w-[22rem] shrink-0 snap-start rounded-[1.55rem] p-4 ${darkMode ? 'border border-white/[0.06] bg-white/[0.04]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.6),rgba(255,255,255,0.34))] shadow-[0_12px_30px_rgba(148,163,184,0.06),inset_0_1px_0_rgba(255,255,255,0.72)]'} backdrop-blur-2xl sm:w-[19rem] sm:max-w-none`}
                                >
                                  <div className="h-5 w-24 rounded-full bg-slate-200/70" />
                                  <div className="mt-4 h-6 w-3/4 rounded-2xl bg-slate-200/70" />
                                  <div className="mt-3 h-4 w-full rounded-full bg-slate-100/80" />
                                  <div className="mt-2 h-4 w-4/5 rounded-full bg-slate-100/75" />
                                  <div className="mt-5 grid grid-cols-2 gap-2">
                                    <div className="h-9 rounded-full bg-slate-100/80" />
                                    <div className="h-9 rounded-full bg-slate-100/75" />
                                  </div>
                                </div>
                              );
                            }

                            const gig = item as GigListing;
                            const tone = getGigTone(gig.category);
                            return (
                              <div
                                key={`${gig.id}-featured-${index}`}
                                className={`group relative min-h-[12rem] w-[84vw] max-w-[22rem] shrink-0 snap-start overflow-hidden rounded-[1.55rem] p-4 backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 ${
                                  darkMode
                                    ? 'border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] hover:bg-white/[0.08]'
                                    : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.62),rgba(255,255,255,0.36))] shadow-[0_14px_34px_rgba(148,163,184,0.08),inset_0_1px_0_rgba(255,255,255,0.76)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,255,255,0.4))]'
                                } sm:w-[19rem] sm:max-w-none`}
                              >
                                <div className={`pointer-events-none absolute inset-0 opacity-95 ${tone.glow}`} />
                                <div className="relative z-10 flex items-start justify-between gap-3">
                                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${tone.pill}`}>{gig.category}</span>
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] ${darkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-white/60 text-slate-600'}`}>
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Featured
                                  </span>
                                </div>
                                <h4 className={`relative z-10 mt-3 line-clamp-2 text-[0.95rem] font-semibold tracking-[-0.02em] ${darkMode ? 'text-white' : 'text-slate-950'}`}>{gig.title}</h4>
                                <p className={`relative z-10 mt-1 line-clamp-1 text-[12px] font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{gig.organizationName || gig.ownerName}</p>
                                <p className={`relative z-10 mt-2 line-clamp-2 text-[12px] leading-5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{gig.summary}</p>
                                <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-2">
                                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${darkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-white/60 text-slate-700'}`}>{gig.budgetLabel}</span>
                                  <div className="flex items-center gap-2">
                                    <Button asChild className="h-9 rounded-full bg-slate-950 px-4 text-[11px] font-semibold text-white hover:bg-slate-800">
                                      <Link href={`/gigs/${gig.slug}`}>View</Link>
                                    </Button>
                                    <Button asChild variant="outline" className={`h-9 rounded-full px-4 text-[11px] font-semibold ${darkMode ? 'border border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]' : 'border-white/0 bg-white/65 text-slate-800 hover:bg-white/85'}`}>
                                      <Link href="/gigs">All gigs</Link>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Recently added</p>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${darkMode ? 'bg-white/[0.06] text-slate-300' : 'bg-white/60 text-slate-600'}`}>{recentHomepageGigs.length}</span>
                      </div>
                      <div className="relative -mx-4 overflow-hidden sm:mx-0">
                        <div className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-6 ${darkMode ? 'bg-[linear-gradient(90deg,rgba(10,10,12,0.92),transparent)]' : 'bg-[linear-gradient(90deg,rgba(236,244,255,0.9),transparent)]'}`} />
                        <div className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-6 ${darkMode ? 'bg-[linear-gradient(270deg,rgba(10,10,12,0.92),transparent)]' : 'bg-[linear-gradient(270deg,rgba(236,244,255,0.9),transparent)]'}`} />
                        <div
                          ref={recentGigsScrollerRef}
                          className="no-scrollbar relative z-10 flex snap-x snap-proximity items-stretch gap-3 overflow-x-scroll px-4 pb-1 will-change-scroll [scrollbar-width:none] touch-pan-x overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch] sm:px-0"
                        >
                          {(homepageGigsLoading ? Array.from({ length: 3 }).map((_, index) => ({ id: `skeleton-recent-${index}` })) : recentHomepageGigCards).map((item, index) => {
                            if ('id' in item && String(item.id).startsWith('skeleton-recent-')) {
                              return (
                                <div
                                  key={String(item.id)}
                                  className={`min-h-[12rem] w-[84vw] max-w-[22rem] shrink-0 snap-start rounded-[1.55rem] p-4 ${darkMode ? 'border border-white/[0.06] bg-white/[0.04]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.6),rgba(255,255,255,0.34))] shadow-[0_12px_30px_rgba(148,163,184,0.06),inset_0_1px_0_rgba(255,255,255,0.72)]'} backdrop-blur-2xl sm:w-[19rem] sm:max-w-none`}
                                >
                                  <div className="h-5 w-24 rounded-full bg-slate-200/70" />
                                  <div className="mt-4 h-6 w-3/4 rounded-2xl bg-slate-200/70" />
                                  <div className="mt-3 h-4 w-full rounded-full bg-slate-100/80" />
                                  <div className="mt-2 h-4 w-4/5 rounded-full bg-slate-100/75" />
                                  <div className="mt-5 grid grid-cols-2 gap-2">
                                    <div className="h-9 rounded-full bg-slate-100/80" />
                                    <div className="h-9 rounded-full bg-slate-100/75" />
                                  </div>
                                </div>
                              );
                            }

                            const gig = item as GigListing;
                            const tone = getGigTone(gig.category);
                            return (
                              <div
                                key={`${gig.id}-recent-${index}`}
                                className={`group relative min-h-[12rem] w-[84vw] max-w-[22rem] shrink-0 snap-start overflow-hidden rounded-[1.55rem] p-4 backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 ${
                                  darkMode
                                    ? 'border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] hover:bg-white/[0.08]'
                                    : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.62),rgba(255,255,255,0.36))] shadow-[0_14px_34px_rgba(148,163,184,0.08),inset_0_1px_0_rgba(255,255,255,0.76)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,255,255,0.4))]'
                                } sm:w-[19rem] sm:max-w-none`}
                              >
                                <div className={`pointer-events-none absolute inset-0 opacity-95 ${tone.glow}`} />
                                <div className="relative z-10 flex items-start justify-between gap-3">
                                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${tone.pill}`}>{gig.category}</span>
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] ${darkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-white/60 text-slate-600'}`}>
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    {formatDeviceRelativeTime(gig.updatedAt)}
                                  </span>
                                </div>
                                <h4 className={`relative z-10 mt-3 line-clamp-2 text-[0.95rem] font-semibold tracking-[-0.02em] ${darkMode ? 'text-white' : 'text-slate-950'}`}>{gig.title}</h4>
                                <p className={`relative z-10 mt-1 line-clamp-1 text-[12px] font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{gig.organizationName || gig.ownerName}</p>
                                <p className={`relative z-10 mt-2 line-clamp-2 text-[12px] leading-5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{gig.summary}</p>
                                <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-2">
                                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${darkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-white/60 text-slate-700'}`}>{gig.budgetLabel}</span>
                                  <div className="flex items-center gap-2">
                                    <Button asChild className="h-9 rounded-full bg-slate-950 px-4 text-[11px] font-semibold text-white hover:bg-slate-800">
                                      <Link href={`/gigs/${gig.slug}`}>View</Link>
                                    </Button>
                                    <Button asChild variant="outline" className={`h-9 rounded-full px-4 text-[11px] font-semibold ${darkMode ? 'border border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]' : 'border-white/0 bg-white/65 text-slate-800 hover:bg-white/85'}`}>
                                      <Link href="/gigs">All gigs</Link>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!homepageGigsLoading && featuredHomepageGigs.length === 0 && recentHomepageGigs.length === 0 ? (
                    <div className={`relative z-10 mt-5 rounded-[1.6rem] px-4 py-8 text-center backdrop-blur-2xl ${
                      darkMode ? 'border border-white/[0.08] bg-white/[0.04] text-slate-200' : 'bg-white/42 text-slate-700 shadow-[0_10px_26px_rgba(148,163,184,0.05),inset_0_1px_0_rgba(255,255,255,0.74)]'
                    }`}>
                      <p className={`text-sm font-semibold tracking-[-0.02em] ${darkMode ? 'text-white' : 'text-slate-900'}`}>No gigs yet.</p>
                      <p className={`mt-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Publish a gig and it will start showing here live.</p>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {group.title === 'Create' ? (
                <section className="cloud-panel relative overflow-hidden rounded-[1.8rem] p-4 sm:p-5 lg:p-6">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(59,130,246,0.18),transparent_20%),radial-gradient(circle_at_84%_18%,rgba(139,92,246,0.16),transparent_18%),radial-gradient(circle_at_74%_82%,rgba(56,189,248,0.14),transparent_18%)]" />
                  <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">From the blog</p>
                      <h2 className="mt-2 text-[1.12rem] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[1.28rem]">
                        Real writing around docs, AI, workflows, and product ops.
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Clean reads for people building, reviewing, shipping, and improving how work moves.
                      </p>
                    </div>
                    <Button asChild variant="outline" className="cloud-pill h-10 rounded-full border-0 px-5 text-[12px] text-slate-800 hover:bg-white/95">
                      <Link href="/blog">Open blog</Link>
                    </Button>
                  </div>

                  {blogLoading ? (
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div
                          key={`blog-skeleton-${index}`}
                          className="overflow-hidden rounded-[1.45rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.58))] p-4 shadow-[0_18px_46px_rgba(15,23,42,0.05)] backdrop-blur-2xl"
                        >
                          <div className="h-40 rounded-[1.2rem] bg-slate-200/70" />
                          <div className="mt-4 h-3 w-20 rounded-full bg-slate-200/70" />
                          <div className="mt-3 h-5 w-4/5 rounded-full bg-slate-200/70" />
                          <div className="mt-2 h-4 w-full rounded-full bg-slate-200/60" />
                          <div className="mt-2 h-4 w-3/4 rounded-full bg-slate-200/60" />
                        </div>
                      ))}
                    </div>
                  ) : blogPosts.length ? (
                    <>
                      <div
                        ref={blogScrollerRef}
                        className="no-scrollbar relative z-10 -mx-4 mt-5 flex items-stretch gap-3 overflow-x-auto px-4 pb-2 md:hidden"
                      >
                        {blogCards.map((post, index) => (
                          <Link
                            key={`${post.id}-home-blog-${index}`}
                            href={`/blog/${post.slug}`}
                            className="group w-[84vw] shrink-0 overflow-hidden rounded-[1.45rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.58))] shadow-[0_18px_46px_rgba(15,23,42,0.05)] backdrop-blur-2xl transition duration-300"
                          >
                            <div
                              className="h-44 bg-cover bg-center"
                              style={{
                                backgroundImage: `linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.42)),url('${post.coverImageUrl || '/homepage/hero-workspace-meet.png'}')`,
                              }}
                            />
                            <div className="p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-sky-100/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                                  {post.category}
                                </span>
                                <span className="rounded-full bg-white/86 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  {post.readTimeMinutes} min read
                                </span>
                              </div>
                              <h3 className="mt-3 text-[1rem] font-semibold tracking-[-0.03em] text-slate-950">
                                {post.title}
                              </h3>
                              <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-slate-600">
                                {post.excerpt}
                              </p>
                              <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
                                Read post
                                <ArrowRight className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>

                      <div className="relative z-10 mt-5 hidden gap-3 md:grid md:grid-cols-3">
                        {blogPosts.slice(0, 3).map((post) => (
                          <Link
                            key={post.id}
                            href={`/blog/${post.slug}`}
                            className="group overflow-hidden rounded-[1.45rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.58))] shadow-[0_18px_46px_rgba(15,23,42,0.05)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(15,23,42,0.08)]"
                          >
                            <div
                              className="h-44 bg-cover bg-center"
                              style={{
                                backgroundImage: `linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.42)),url('${post.coverImageUrl || '/homepage/hero-workspace-meet.png'}')`,
                              }}
                            />
                            <div className="p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-sky-100/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                                  {post.category}
                                </span>
                                <span className="rounded-full bg-white/86 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  {post.readTimeMinutes} min read
                                </span>
                              </div>
                              <h3 className="mt-3 text-[1rem] font-semibold tracking-[-0.03em] text-slate-950">
                                {post.title}
                              </h3>
                              <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-slate-600">
                                {post.excerpt}
                              </p>
                              <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
                                Read post
                                <ArrowRight className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : null}
                </section>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className={`cloud-panel relative overflow-hidden rounded-[1.9rem] px-4 py-8 text-center sm:px-6 sm:py-10 lg:px-8 lg:py-12 ${darkMode ? 'shadow-[0_24px_72px_rgba(0,0,0,0.34)]' : ''}`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_82%_22%,rgba(139,92,246,0.18),transparent_22%),radial-gradient(circle_at_52%_82%,rgba(16,185,129,0.14),transparent_22%)]" />
        <div className="pointer-events-none absolute -left-6 top-8 h-28 w-28 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-10 h-32 w-32 rounded-full bg-violet-300/25 blur-3xl" />
        <div className="relative z-10">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Why docrud</p>
          <h2 className={`mx-auto mt-3 max-w-5xl text-[1.45rem] font-semibold tracking-[-0.07em] sm:text-[1.9rem] lg:text-[2.65rem] ${darkMode ? 'text-white' : 'text-slate-950'}`}>
            Because work should feel{' '}
            <span className="relative inline-flex min-w-[7rem] justify-center align-middle sm:min-w-[8.5rem]">
              {whyWords.map((word, index) => (
                <span
                  key={word}
                  className={`absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 rounded-full bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(37,99,235,0.92),rgba(139,92,246,0.9))] px-4 py-1.5 text-white shadow-[0_14px_34px_rgba(37,99,235,0.22)] transition-all duration-500 ${
                    activeWhyWord === index
                      ? 'translate-y-[-50%] scale-100 opacity-100'
                      : 'translate-y-[-35%] scale-95 opacity-0'
                  }`}
                >
                  {word}
                </span>
              ))}
              <span className="invisible rounded-full px-4 py-1.5">smarter</span>
            </span>
            , not scattered or harder than it needs to be.
          </h2>
          <p className={`mx-auto mt-5 max-w-3xl text-sm leading-7 sm:text-[15px] ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            docrud brings documents, AI, meetings, secure sharing, and execution into one sharper workflow so teams can move faster, look more professional, and stay in control as work scales.
          </p>
        </div>
      </section>
    </PublicSiteChrome>
  );
}
